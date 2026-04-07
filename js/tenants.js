/**
 * RENTMS TENANT PORTAL — CORE JS
 * Modules: TenantDashboard, TenantPayments, TenantPaymentHistory,
 *          TenantLease, TenantMaintenance, TenantMessages,
 *          TenantAnnouncements, TenantNotifications, TenantProfile
 */

/* ============================================================
   AUTO LOGOUT — signs out after 60 minutes of inactivity
   ============================================================ */
(function initAutoLogout() {
  const TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
  let _timer;
  function resetTimer() {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      alert("Your session has expired. Please log in again.");
      localStorage.removeItem("tenant_token");
      localStorage.removeItem("tenant_user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "../auth/login.html?session=expired";
    }, TIMEOUT_MS);
  }
  /* Run on all pages that load tenants.js */
  [
    "mousemove",
    "mousedown",
    "keypress",
    "touchstart",
    "scroll",
    "click",
  ].forEach((evt) =>
    document.addEventListener(evt, resetTimer, { passive: true }),
  );
  resetTimer();
})();

/* ── Shared helpers ── */
const _T = (() => {
  /*
   * FIX: api.js now stores tenant session under 'tenant_token' / 'tenant_user'
   * but tenant.js was reading from 'token' / 'user'.
   * We try both keys so it works whether api.js is loaded or not.
   */
  const user = () => {
    try {
      return (
        JSON.parse(localStorage.getItem("tenant_user") || "null") ||
        JSON.parse(localStorage.getItem("user") || "null") ||
        {}
      );
    } catch {
      return {};
    }
  };

  const token = () =>
    localStorage.getItem("tenant_token") || localStorage.getItem("token") || "";

  const ghs = (n) =>
    "GHS " +
    parseFloat(n || 0).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const ago = (d) => {
    if (!d) return "—";
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000),
      h = Math.floor(m / 60),
      dy = Math.floor(h / 24);
    return m < 1
      ? "just now"
      : m < 60
        ? m + "m ago"
        : h < 24
          ? h + "h ago"
          : dy < 7
            ? dy + "d ago"
            : fmt(d);
  };

  const badge = (status) => {
    const map = {
      paid: "success",
      pending: "warning",
      overdue: "danger",
      failed: "danger",
      open: "warning",
      in_progress: "primary",
      resolved: "success",
      closed: "secondary",
      active: "success",
      expired: "danger",
      ending_soon: "warning",
      high: "danger",
      medium: "warning",
      low: "success",
    };
    const cls = map[status] || "secondary";
    const label = (status || "unknown").replace(/_/g, " ");
    return `<span class="badge-status" style="background:var(--${cls}-light,rgba(100,116,139,0.15));color:var(--${cls}-text,#94a3b8)">${label}</span>`;
  };

  const BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5000/api"
      : "https://rentms-backend-5.onrender.com/api";

  async function api(method, url, body) {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token(),
      },
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const r = await fetch(BASE + url, opts);
      if (r.status === 401) {
        localStorage.clear();
        location.href = "../auth/login.html";
        return null;
      }
      return await r.json();
    } catch {
      return null;
    }
  }

  async function initSidebar() {
    let u = user();

    if (!u.username && token()) {
      try {
        const res = await fetch(BASE + "/auth/me", {
          headers: { Authorization: "Bearer " + token() },
        });
        const json = await res.json();
        if (json.data?.username) {
          u = json.data;
          try {
            localStorage.setItem("tenant_user", JSON.stringify(u));
            localStorage.setItem("user", JSON.stringify(u));
          } catch (e) {}
        }
      } catch (e) {}
    }

    const nameEl = document.getElementById("sidebarName");
    const avatarEl = document.getElementById("sidebarAvatar");
    const name = u.username || u.full_name || u.name || "";

    if (nameEl) nameEl.textContent = name || "Tenant";

    /* FIX: restore saved avatar on every page */
    if (avatarEl) {
      const savedAvatar = localStorage.getItem("TENANT_AVATAR") || u.avatar_url;
      if (savedAvatar) {
        avatarEl.style.backgroundImage = `url(${savedAvatar})`;
        avatarEl.style.backgroundSize = "cover";
        avatarEl.style.backgroundPosition = "center";
        avatarEl.style.borderRadius = "50%";
        avatarEl.textContent = "";
      } else {
        avatarEl.textContent = name ? name.charAt(0).toUpperCase() : "T";
      }
    }
  }

  return { user, token, ghs, fmt, ago, badge, api, initSidebar, BASE };
})();

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
const TenantDashboard = {
  async init() {
    await _T.initSidebar();
    const u = _T.user();
    const el = (id) => document.getElementById(id);
    const displayName = u.full_name || u.username || u.name || "Tenant";
    if (el("welcomeName")) el("welcomeName").textContent = displayName;
    if (el("welcomeAvatar"))
      el("welcomeAvatar").textContent = displayName.charAt(0).toUpperCase();
    const data = await _T.api("GET", "/tenant/dashboard");
    if (!data) return;
    /* FIX: API returns data.data not data directly */
    const d = data.data || data;
    const lease = d.lease || {};
    const paySum = d.payment_summary || {};

    /* FIX: use correct field names from actual API response */
    if (el("statAmountDue"))
      el("statAmountDue").textContent = _T.ghs(lease.rent_amount || 0);
    if (el("statDueDate"))
      el("statDueDate").textContent = d.is_overdue ? "Overdue" : "1st of month";
    if (el("statLastPaid"))
      el("statLastPaid").textContent = _T.fmt(paySum.last_payment_date) || "—";
    if (el("statOpenRequests"))
      el("statOpenRequests").textContent = d.open_maintenance || 0;
    if (el("welcomeSub"))
      el("welcomeSub").textContent =
        `Unit ${lease.unit_number || "—"} · ${lease.plaza_name || "—"}`;

    if (lease.id) {
      if (el("leasePlaza"))
        el("leasePlaza").textContent = lease.plaza_name || "—";
      if (el("leaseUnit"))
        el("leaseUnit").textContent = lease.unit_number || "—";
      if (el("leaseRent"))
        el("leaseRent").textContent = _T.ghs(lease.rent_amount);
      if (el("leaseEnd")) el("leaseEnd").textContent = _T.fmt(lease.lease_end);
      if (el("leaseStatus"))
        el("leaseStatus").innerHTML = _T.badge(
          d.is_overdue ? "overdue" : lease.status || "active",
        );
      if (lease.lease_start && lease.lease_end) {
        const total = new Date(lease.lease_end) - new Date(lease.lease_start);
        const done = Date.now() - new Date(lease.lease_start);
        const pct = Math.min(100, Math.round((done / total) * 100));
        const days = Math.max(
          0,
          Math.ceil((new Date(lease.lease_end) - Date.now()) / 86400000),
        );
        if (el("leaseDaysLeft"))
          el("leaseDaysLeft").textContent = days + " days left";
        if (el("leaseBar")) el("leaseBar").style.width = pct + "%";
      }
    }
    const payEl = el("recentPayments");
    if (payEl && payments?.length) {
      payEl.innerHTML = `<div class="table-responsive"><table class="table" style="margin:0"><tbody>
        ${payments
          .slice(0, 5)
          .map(
            (p) => `<tr>
          <td style="font-size:0.8rem;font-weight:700">${p.reference || "—"}</td>
          <td style="font-size:0.78rem;color:var(--text-muted)">${_T.fmt(p.paid_at)}</td>
          <td style="font-size:0.78rem">${_T.ghs(p.amount)}</td>
          <td>${_T.badge(p.status)}</td>
        </tr>`,
          )
          .join("")}
      </tbody></table></div>`;
    }
    const mEl = el("maintList");
    if (mEl && maintenance?.length) {
      mEl.innerHTML =
        `<div class="p-3 d-flex flex-column gap-2">` +
        maintenance
          .slice(0, 4)
          .map(
            (m) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--${m.priority === "high" ? "danger" : m.priority === "medium" ? "warning" : "success"});flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.title}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">${_T.ago(m.created_at)}</div>
            </div>
            ${_T.badge(m.status)}
          </div>`,
          )
          .join("") +
        `</div>`;
    }
    const aEl = el("annList");
    if (aEl && announcements?.length) {
      aEl.innerHTML =
        `<div class="p-3 d-flex flex-column gap-2">` +
        announcements
          .slice(0, 3)
          .map(
            (a) => `
          <div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:0.82rem;font-weight:700">${a.title}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${_T.ago(a.created_at)}</div>
          </div>`,
          )
          .join("") +
        `</div>`;
    }
  },
};

/* ══════════════════════════════════════════
   PAYMENTS
══════════════════════════════════════════ */
const TenantPayments = {
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/tenant/dashboard");
    const lease = data?.lease;
    const el = (id) => document.getElementById(id);
    if (el("balAmountDue"))
      el("balAmountDue").textContent = _T.ghs(lease?.amount_due);
    if (el("balDueDate"))
      el("balDueDate").textContent = _T.fmt(lease?.next_due_date);
    if (el("balRent")) el("balRent").textContent = _T.ghs(lease?.rent);
    if (el("payAmount")) el("payAmount").value = lease?.amount_due || "";
    const statusEl = el("paymentStatus");
    if (statusEl && lease?.status) statusEl.innerHTML = _T.badge(lease.status);
  },
};

/* ══════════════════════════════════════════
   PAYMENT HISTORY
══════════════════════════════════════════ */
const TenantPaymentHistory = {
  all: [],
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/tenant/payments");
    this.all = data?.payments || [];
    this.render(this.all);
    this.renderStats(this.all);
  },
  renderStats(list) {
    const paid = list.filter((p) => p.status === "paid");
    const pend = list.filter((p) => p.status === "pending");
    const total = paid.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const el = (id) => document.getElementById(id);
    if (el("statTotalPaid")) el("statTotalPaid").textContent = _T.ghs(total);
    if (el("statPayCount")) el("statPayCount").textContent = list.length;
    if (el("statPending")) el("statPending").textContent = pend.length;
  },
  render(list) {
    const tbody = document.getElementById("historyRows");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-receipt"></i><h6>No payments</h6></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(
        (p) => `<tr>
      <td style="font-family:monospace;font-size:0.8rem">${p.reference || "—"}</td>
      <td style="font-size:0.78rem">${_T.fmt(p.paid_at)}</td>
      <td style="font-size:0.78rem">${p.type || "Rent"}</td>
      <td style="font-size:0.78rem">${p.method || "—"}</td>
      <td style="font-weight:800">${_T.ghs(p.amount)}</td>
      <td>${_T.badge(p.status)}</td>
      <td><button class="btn btn-sm btn-outline-primary" onclick="TenantPaymentHistory.viewReceipt(${p.id})"><i class="bi bi-receipt"></i></button></td>
    </tr>`,
      )
      .join("");
  },
  filter() {
    const month = document.getElementById("filterMonth")?.value;
    const status = document.getElementById("filterStatus")?.value;
    let list = [...this.all];
    if (month) list = list.filter((p) => p.paid_at?.startsWith(month));
    if (status) list = list.filter((p) => p.status === status);
    this.render(list);
  },
  async viewReceipt(id) {
    const data = await _T.api("GET", `/payments/${id}/receipt`);
    const body = document.getElementById("receiptBody");
    if (!body) return;
    const p = data?.payment || {};
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:1.5rem;font-weight:800;color:var(--primary)">RentMS</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Payment Receipt</div>
      </div>
      <div class="d-flex flex-column gap-2" style="font-size:0.875rem">
        <div class="d-flex justify-content-between"><span style="color:var(--text-muted)">Reference</span><span style="font-weight:700;font-family:monospace">${p.reference || "—"}</span></div>
        <div class="d-flex justify-content-between"><span style="color:var(--text-muted)">Date</span><span style="font-weight:700">${_T.fmt(p.paid_at)}</span></div>
        <div class="d-flex justify-content-between"><span style="color:var(--text-muted)">Amount</span><span style="font-weight:800;color:var(--primary)">${_T.ghs(p.amount)}</span></div>
        <div class="d-flex justify-content-between"><span style="color:var(--text-muted)">Method</span><span style="font-weight:700">${p.method || "—"}</span></div>
        <div class="d-flex justify-content-between"><span style="color:var(--text-muted)">Status</span>${_T.badge(p.status)}</div>
      </div>`;
    new bootstrap.Modal(document.getElementById("receiptModal")).show();
  },
};

window.filterHistory = () => TenantPaymentHistory.filter();
window.printReceipt = () => window.print();

/* ══════════════════════════════════════════
   LEASE
══════════════════════════════════════════ */
const TenantLease = {
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/tenant/lease");
    /* FIX: API returns data.data not data.lease */
    const l = data?.data || data?.lease;
    if (!l) return;
    const el = (id) => document.getElementById(id);
    const set = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val || "—";
    };
    set("lPlaza", l.plaza_name || l.plaza || "—");
    set("lUnit", l.unit_number || l.unit || "—");
    set("lFloor", l.floor || "N/A");
    set("lType", l.unit_type || "N/A");
    set("lAddress", l.plaza_location || l.address || "—");
    set("lStart", _T.fmt(l.lease_start || l.start_date));
    set("lEnd", _T.fmt(l.lease_end || l.end_date));
    set("lRent", _T.ghs(l.rent_amount || l.rent));
    set("lDeposit", _T.ghs(l.security_deposit || l.deposit));
    set("lLeaseType", l.lease_type || "Monthly");
    /* FIX: use landlord_username or email prefix as name fallback */
    const landlordName =
      l.landlord_name ||
      l.landlord_username ||
      (l.landlord_email ? l.landlord_email.split("@")[0] : "—");
    set("lLandlordName", landlordName);
    set("lLandlordPhone", l.landlord_phone || "—");
    set("lLandlordEmail", l.landlord_email || "—");
    set("sideAmtDue", _T.ghs(l.rent_amount || l.amount_due));
    const startDate = l.lease_start || l.start_date;
    const endDate = l.lease_end || l.end_date;
    if (el("lDuration") && startDate && endDate) {
      const months = Math.round(
        (new Date(endDate) - new Date(startDate)) / (30 * 86400000),
      );
      el("lDuration").textContent =
        months > 0 ? months + " months" : "< 1 month";
    }
    if (startDate && endDate) {
      const total = new Date(endDate) - new Date(startDate);
      const done = Date.now() - new Date(startDate);
      const pct = Math.min(100, Math.round((done / total) * 100));
      const days = Math.max(
        0,
        Math.ceil((new Date(endDate) - Date.now()) / 86400000),
      );
      if (el("daysLeft")) el("daysLeft").textContent = days;
      if (el("daysLeftSub"))
        el("daysLeftSub").textContent =
          days > 0 ? "of your lease remaining" : "Lease expired";
      if (el("leaseProgressBar"))
        el("leaseProgressBar").style.width = pct + "%";
      /* Next payment due — 1st of next month */
      const now = new Date();
      const due = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      set("sideDueDate", "Due " + _T.fmt(due));
    }
    const status = l.status || "active";
    if (el("leaseStatusBadge"))
      el("leaseStatusBadge").innerHTML = _T.badge(status);
    if (status === "expired") {
      const banner = el("leaseBanner");
      if (banner) {
        banner.style.background = "linear-gradient(135deg,#1c0a0a,#7f1d1d)";
        banner.style.borderColor = "rgba(239,68,68,0.3)";
      }
      if (el("leaseStatusText"))
        el("leaseStatusText").textContent = "Lease Expired";
      if (el("leaseStatusSub"))
        el("leaseStatusSub").textContent = "Please contact your landlord";
    }
  },
};

/* ══════════════════════════════════════════
   MAINTENANCE
══════════════════════════════════════════ */
const TenantMaintenance = {
  all: [],
  async init() {
    await _T.initSidebar();
    const el = (id) => document.getElementById(id);
    const data = await _T.api("GET", "/tenant/dashboard");
    const phone = data?.lease?.landlord_phone || "—";
    if (el("emergLandlord")) el("emergLandlord").textContent = phone;
    if (el("emergLandlordLink")) el("emergLandlordLink").href = `tel:${phone}`;
    await this.load();
  },
  async load() {
    const data = await _T.api("GET", "/tenant/maintenance");
    this.all = data?.requests || [];
    this.render(this.all);
    this.stats(this.all);
  },
  stats(list) {
    const el = (id) => document.getElementById(id);
    if (el("statOpen"))
      el("statOpen").textContent = list.filter(
        (r) => r.status === "open",
      ).length;
    if (el("statInProgress"))
      el("statInProgress").textContent = list.filter(
        (r) => r.status === "in_progress",
      ).length;
    if (el("statResolved"))
      el("statResolved").textContent = list.filter(
        (r) => r.status === "resolved",
      ).length;
    if (el("statHigh"))
      el("statHigh").textContent = list.filter(
        (r) => r.priority === "high",
      ).length;
  },
  filter() {
    const status = document.getElementById("filterMaint")?.value;
    this.render(
      status ? this.all.filter((r) => r.status === status) : this.all,
    );
  },
  render(list) {
    const el = document.getElementById("maintList");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi bi-tools"></i><h6>No requests</h6><p>Use "New Request" to report an issue</p></div>`;
      return;
    }
    el.innerHTML =
      `<div class="p-3">` +
      list
        .map(
          (r) => `
        <div class="maint-card">
          <div class="d-flex align-items-start gap-3">
            <div class="priority-dot ${r.priority || "low"}" style="margin-top:6px"></div>
            <div style="flex:1;min-width:0">
              <div class="title">${r.title}</div>
              <div class="meta">${r.category || ""} · ${_T.ago(r.created_at)}</div>
              ${r.description ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;line-height:1.5">${r.description}</div>` : ""}
            </div>
            <div>${_T.badge(r.status)}</div>
          </div>
          ${r.landlord_note ? `<div style="margin-top:10px;padding:10px;background:var(--bg-body);border-radius:8px;font-size:0.78rem;border:1px solid var(--border)"><span style="font-weight:700;color:var(--primary)">Landlord: </span>${r.landlord_note}</div>` : ""}
        </div>`,
        )
        .join("") +
      `</div>`;
  },
  async submit() {
    const title = document.getElementById("mTitle")?.value.trim();
    const desc = document.getElementById("mDesc")?.value.trim();
    if (!title || !desc) {
      alert("Please fill in title and description.");
      return;
    }
    const result = await _T.api("POST", "/tenant/maintenance", {
      title,
      description: desc,
      category: document.getElementById("mCategory")?.value,
      priority: document.getElementById("mPriority")?.value,
    });
    if (result) {
      try {
        bootstrap.Modal.getInstance(
          document.getElementById("newRequestModal"),
        )?.hide();
      } catch (e) {}
      document.getElementById("mTitle").value = "";
      document.getElementById("mDesc").value = "";
      await this.load();
    }
  },
};

/* ══════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════ */
const TenantMessages = {
  groupId: null,
  pendingFiles: [],
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/tenant/groups");
    const groups = data?.groups || [];
    if (groups.length) {
      this.groupId = groups[0].id;
      await this.loadMessages();
    }
  },
  async loadMessages() {
    if (!this.groupId) return;
    const data = await _T.api("GET", `/tenant/groups/${this.groupId}/messages`);
    const msgs = data?.messages || [];
    const el = document.getElementById("chatMessages");
    const me = _T.user().id;
    if (!el) return;
    el.innerHTML = msgs.length
      ? msgs
          .map((m) => {
            const mine = m.sender_id === me;
            return `<div class="msg ${mine ? "mine" : "theirs"}">
            ${!mine ? `<div style="width:28px;height:28px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#fff;flex-shrink:0">${(m.sender_name || "L").charAt(0).toUpperCase()}</div>` : ""}
            <div>
              <div class="msg-bubble">${m.message || ""}</div>
              <div class="msg-time">${_T.ago(m.created_at)}</div>
            </div>
          </div>`;
          })
          .join("")
      : `<div style="text-align:center;color:var(--text-muted);font-size:0.8rem;padding:24px">Start the conversation below</div>`;
    el.scrollTop = el.scrollHeight;
  },
  async send() {
    const input = document.getElementById("msgInput");
    const msg = input?.value.trim();
    if (!msg || !this.groupId) return;
    await _T.api("POST", `/tenant/groups/${this.groupId}/messages`, {
      message: msg,
    });
    input.value = "";
    input.style.height = "auto";
    this.pendingFiles = [];
    const ap = document.getElementById("attachPreview");
    if (ap) ap.innerHTML = "";
    await this.loadMessages();
  },
  attachFiles(input) {
    this.pendingFiles = [...input.files];
    const preview = document.getElementById("attachPreview");
    if (!preview) return;
    preview.innerHTML = [...input.files]
      .map((f) =>
        f.type.startsWith("image/")
          ? `<img src="${URL.createObjectURL(f)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border)"/>`
          : `<div style="padding:6px 10px;background:var(--bg-body);border:1px solid var(--border);border-radius:8px;font-size:0.72rem;font-weight:700">${f.name}</div>`,
      )
      .join("");
  },
};

/* ══════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════ */
const TenantAnnouncements = {
  all: [],
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/tenant/announcements");
    this.all = data?.announcements || [];
    this.render(this.all);
  },
  filter(type, linkEl) {
    document
      .querySelectorAll("#annTabs .nav-link")
      .forEach((l) => l.classList.remove("active"));
    if (linkEl) linkEl.classList.add("active");
    this.render(
      type === "all" ? this.all : this.all.filter((a) => a.tag === type),
    );
  },
  render(list) {
    const el = document.getElementById("annList");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi bi-megaphone"></i><h6>No announcements</h6></div>`;
      return;
    }
    el.innerHTML = list
      .map(
        (a) => `
      <div class="ann-card ${a.read ? "" : "unread"}" onclick="TenantAnnouncements.open(${a.id})">
        <div class="d-flex align-items-start justify-content-between gap-3">
          <div style="flex:1;min-width:0">
            <div class="d-flex gap-2 align-items-center mb-2">
              <span class="ann-tag ${a.tag || "general"}">${a.tag || "General"}</span>
              <span style="font-size:0.72rem;color:var(--text-muted)">${_T.ago(a.created_at)}</span>
              ${!a.read ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--primary);display:inline-block;margin-left:auto"></span>` : ""}
            </div>
            <div style="font-weight:800;font-size:0.9rem;margin-bottom:4px">${a.title}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${a.body || ""}</div>
          </div>
          <i class="bi bi-chevron-right" style="color:var(--text-muted);flex-shrink:0;margin-top:4px"></i>
        </div>
      </div>`,
      )
      .join("");
  },
  open(id) {
    const a = this.all.find((x) => x.id === id);
    if (!a) return;
    a.read = true;
    this.render(this.all);
    const el = (id) => document.getElementById(id);
    if (el("annModalTitle")) el("annModalTitle").textContent = a.title;
    if (el("annModalBody")) el("annModalBody").textContent = a.body;
    if (el("annModalDate"))
      el("annModalDate").textContent = _T.fmt(a.created_at);
    if (el("annModalTag"))
      el("annModalTag").innerHTML =
        `<span class="ann-tag ${a.tag || "general"}">${a.tag || "General"}</span>`;
    new bootstrap.Modal(document.getElementById("annModal")).show();
  },
  markAllRead() {
    this.all.forEach((a) => (a.read = true));
    this.render(this.all);
    _T.api("POST", "/notifications/read-all", {});
  },
};

/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */
const TenantNotifications = {
  all: [],
  iconMap: {
    payment: "bi-credit-card-fill",
    maintenance: "bi-tools",
    announcement: "bi-megaphone-fill",
    lease: "bi-file-text-fill",
    message: "bi-chat-dots-fill",
  },
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/notifications");
    this.all = data?.notifications || [];
    this.render(this.all);
    this._updateStats(this.all);
  },
  _updateStats(list) {
    const el = (id) => document.getElementById(id);
    const unread = list.filter((n) => !n.read && !n.read_at);
    if (el("statTotal")) el("statTotal").textContent = list.length;
    if (el("statUnread")) el("statUnread").textContent = unread.length;
    if (el("statPayment"))
      el("statPayment").textContent = list.filter(
        (n) => n.type === "payment",
      ).length;
    if (el("statMaint"))
      el("statMaint").textContent = list.filter(
        (n) => n.type === "maintenance",
      ).length;
    const lbl = el("unreadLabel");
    if (lbl) lbl.textContent = unread.length ? `${unread.length} unread` : "";
  },
  filter(type, linkEl) {
    document
      .querySelectorAll("#notifTabs .nav-link")
      .forEach((l) => l.classList.remove("active"));
    if (linkEl) linkEl.classList.add("active");
    this.render(
      type === "all" ? this.all : this.all.filter((n) => n.type === type),
    );
  },
  render(list) {
    const el = document.getElementById("notifList");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><i class="bi bi-bell"></i><h6>No notifications</h6></div>`;
      return;
    }
    el.innerHTML = list
      .map(
        (n) => `
      <div class="notif-item ${n.read || n.read_at ? "" : "unread"}" onclick="TenantNotifications.markRead(${n.id})">
        <div class="notif-icon ${n.type || "payment"}"><i class="bi ${this.iconMap[n.type] || "bi-bell"}"></i></div>
        <div style="flex:1;min-width:0">
          <div class="notif-title">${n.title || "Notification"}</div>
          <div class="notif-body">${n.body || ""}</div>
          <div class="notif-time">${_T.ago(n.created_at)}</div>
        </div>
        ${!n.read && !n.read_at ? `<div class="unread-dot"></div>` : ""}
      </div>`,
      )
      .join("");
  },
  async markRead(id) {
    const n = this.all.find((x) => x.id === id);
    if (n && !n.read && !n.read_at) {
      n.read = true;
      await _T.api("PATCH", `/notifications/${id}/read`, {});
      this.render(this.all);
      this._updateStats(this.all);
    }
  },
  async markAllRead() {
    this.all.forEach((n) => (n.read = true));
    this.render(this.all);
    this._updateStats(this.all);
    await _T.api("POST", "/notifications/read-all", {});
  },
};

/* ══════════════════════════════════════════
   PROFILE
══════════════════════════════════════════ */
const TenantProfile = {
  async init() {
    await _T.initSidebar();
    const data = await _T.api("GET", "/tenant/profile");
    const p = data?.profile || {};
    const u = _T.user();
    const el = (id) => document.getElementById(id);
    const set = (id, val) => {
      const e = el(id);
      if (e) e.textContent = val || "—";
    };
    const name = p.name || u.full_name || u.username || "";
    set("profileName", name);
    set("profileEmail", p.email || u.email);
    set("profileUnit", p.unit || "—");
    set("profilePlaza", p.plaza || "—");
    set("profileJoined", _T.fmt(u.created_at || p.joined_at));
    const av = el("profileAvatar");
    if (av) av.textContent = (name || "T").charAt(0).toUpperCase();
    if (el("pName")) el("pName").value = name;
    if (el("pUsername")) el("pUsername").value = u.username || "";
    if (el("pEmail")) el("pEmail").value = p.email || "";
    if (el("pPhone")) el("pPhone").value = p.phone || "";
    if (el("pDob")) el("pDob").value = p.dob || "";
    if (el("pOccupation")) el("pOccupation").value = p.occupation || "";
    if (el("pEcName")) el("pEcName").value = p.ec_name || "";
    if (el("pEcPhone")) el("pEcPhone").value = p.ec_phone || "";
  },
  async savePersonal() {
    const val = (id) => document.getElementById(id)?.value.trim();
    await _T.api("PUT", "/tenant/profile", {
      name: val("pName"),
      email: val("pEmail"),
      phone: val("pPhone"),
      dob: val("pDob"),
      occupation: val("pOccupation"),
      ec_name: val("pEcName"),
      ec_phone: val("pEcPhone"),
    });
    const alertEl = document.getElementById("saveAlert");
    if (alertEl) {
      alertEl.style.display = "";
      setTimeout(() => (alertEl.style.display = "none"), 3000);
    }
  },
  async changePassword() {
    const curr = document.getElementById("pwCurrent")?.value;
    const nw = document.getElementById("pwNew")?.value;
    const conf = document.getElementById("pwConfirm")?.value;
    if (!curr || !nw || !conf) {
      alert("Please fill in all password fields.");
      return;
    }
    if (nw !== conf) {
      alert("New passwords do not match.");
      return;
    }
    if (nw.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    const result = await _T.api("POST", "/auth/change-password", {
      current_password: curr,
      new_password: nw,
    });
    if (result?.ok !== false) alert("Password updated successfully.");
    else alert(result?.message || "Failed to update password.");
  },
  async saveNotifPrefs() {
    const chk = (id) => document.getElementById(id)?.checked;
    await _T.api("PUT", "/tenant/profile", {
      notif_prefs: {
        payment: chk("nPayment"),
        maintenance: chk("nMaint"),
        announcement: chk("nAnn"),
        message: chk("nMsg"),
        lease: chk("nLease"),
      },
    });
    alert("Preferences saved.");
  },
  async deleteAccount() {
    const pw = document.getElementById("deletePassword")?.value;
    if (!pw) {
      alert("Enter your password to confirm.");
      return;
    }
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
    await _T.api(
      "DELETE",
      `/tenant/account?password=${encodeURIComponent(pw)}`,
    );
    localStorage.clear();
    location.href = "../auth/login.html";
  },
  previewAvatar(input) {
    const av = document.getElementById("profileAvatar");
    if (!av || !input.files[0]) return;
    av.style.backgroundImage = `url(${URL.createObjectURL(input.files[0])})`;
    av.style.backgroundSize = "cover";
    av.textContent = "";
  },
};
