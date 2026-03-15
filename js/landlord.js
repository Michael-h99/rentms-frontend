/**
 * ============================================================
 *  RENTMS — LANDLORD PORTAL  |  landlord.js  (v3)
 *  Unified JS for all 13 landlord pages.
 *  All function names match HTML onclick/oninput/onchange exactly.
 * ============================================================
 */

/* ============================================================
   DEV MODE
   true  → no login, all API calls return mock data
   false → live mode, real API + auth enforced
   ============================================================ */
const DEV_MODE = false;

/* ============================================================
   MOCK DATA
   ============================================================ */
const MOCK = {
  user: { id: 1, username: "", email: "", phone: "" },
  stats: {
    total_plazas: 0,
    active_tenants: 0,
    revenue_this_month: 0,
    pending_maintenance: 0,
    pending_amount: 0,
    collection_rate: 0,
    avg_occupancy: 0,
    revenue_collected: 0,
  },
  plazas: [],
  tenants: [],
  payments: [],
  maintenance: [],
  announcements: [],
  notifications: [],
  groups: [],
  messages: [],
  revenue: [],
  settings: {
    business_name: "",
    business_email: "",
    phone: "",
    timezone: "Africa/Accra",
    currency: "GHS",
    date_format: "DD/MM/YYYY",
    notifications: {
      payment_received: true,
      maintenance: true,
      lease_expiring: true,
      overdue_payment: true,
      new_tenant: false,
      monthly_summary: true,
    },
  },
  profile: { username: "", email: "", phone: "", address: "" },
  invite_codes: [],
  units: {},
};

/* Route mock API calls → MOCK data */
function mockResponse(url) {
  const u = url.split("?")[0];
  if (u.includes("/stats")) return { data: MOCK.stats };
  if (u.includes("/plazas") && !u.includes("/invite"))
    return { data: MOCK.plazas };
  if (u.includes("/tenants")) return { data: MOCK.tenants };
  if (u.includes("/payments/all")) return { data: MOCK.payments };
  if (u.match(/\/payments\/\d+\/receipt/))
    return {
      data: { ...MOCK.payments[0], unit_number: "1A", reference: "MM-DEV-001" },
    };
  if (u.includes("/payments")) return { data: MOCK.payments };
  if (u.includes("/maintenance")) return { data: MOCK.maintenance };
  if (u.includes("/announcements")) return { data: MOCK.announcements };
  if (u.includes("/notifications")) return { data: MOCK.notifications };
  if (u.match(/\/groups\/\d+\/messages/)) return { data: MOCK.messages };
  if (u.includes("/groups")) return { data: MOCK.groups };
  if (u.includes("/reports/revenue")) return { data: MOCK.revenue };
  if (u.includes("/reports/tenants"))
    return {
      data: MOCK.tenants.map((t) => ({
        ...t,
        tenant_name: t.username,
        paid_amount: t.payment_status === "overdue" ? 0 : t.rent_amount,
        payment_status: t.payment_status,
      })),
    };
  if (u.includes("/invite-codes")) return { data: MOCK.invite_codes };
  if (u.includes("/settings")) return { data: MOCK.settings };
  if (u.includes("/profile")) return { data: MOCK.profile };
  return { data: [], message: "ok" };
}

/* ============================================================
   CORE — API, auth, sidebar, utils
   ============================================================ */
const RentMs = (() => {
  const BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000/api" : "https://rentms-backend-5.onrender.com/api";
  const token = () => localStorage.getItem("token");

  /* Always returns user — uses MOCK in dev mode */
  const user = () => {
    if (DEV_MODE) return MOCK.user;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  /* Auth guard — skipped in DEV_MODE */
  function guardAuth() {
    if (DEV_MODE) return;
    if (!token()) location.href = "../index.html";
  }

  /* HTTP helper */
  async function _req(method, url, body) {
    if (DEV_MODE) {
      if (method !== "GET") console.log(`[DEV] ${method} ${url}`, body || "");
      return method === "GET"
        ? mockResponse(url)
        : { message: "ok (dev mode)", data: body || {} };
    }
    const opts = { method, headers: { Authorization: "Bearer " + token() } };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    try {
      const res = await fetch(BASE + url, opts);
      if (res.status === 401) {
        localStorage.clear();
        location.href = "../index.html";
        return {};
      }
      return await res.json();
    } catch (e) {
      console.error("[RentMs]", method, url, e);
      return { error: true, message: "Network error" };
    }
  }

  const get = (url) => _req("GET", url);
  const post = (url, b) => _req("POST", url, b);
  const put = (url, b) => _req("PUT", url, b);
  const patch = (url, b) => _req("PATCH", url, b);
  const del = (url) => _req("DELETE", url);

  /* Date helpers */
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";
  const fmtMonth = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : "—";
  const timeAgo = (d) => {
    if (!d) return "—";
    const diff = Date.now() - new Date(d).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    const day = Math.floor(hr / 24);
    return day < 7 ? day + "d ago" : fmt(d);
  };

  /* Number helpers */
  const ghs = (n) =>
    "GHS " +
    parseFloat(n || 0).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  /* Sidebar init — sets name + avatar from user() */
  function initSidebar() {
    const u = user();
    const nameEl = document.getElementById("sidebarName");
    const avatarEl = document.getElementById("sidebarAvatar");
    if (nameEl && u.username) nameEl.textContent = u.username;
    if (avatarEl && u.username)
      avatarEl.textContent = u.username.charAt(0).toUpperCase();
  }

  /* Inline feedback */
  function showMsg(elId, text, type = "success") {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="${type === "success" ? "alert-success-sm" : "alert-danger-sm"} mb-2">${text}</div>`;
    setTimeout(() => {
      if (el) el.innerHTML = "";
    }, 4000);
  }

  /* Status badge */
  function statusBadge(status) {
    const map = {
      active: "badge-active",
      completed: "badge-active",
      paid: "badge-active",
      resolved: "badge-resolved",
      pending: "badge-pending",
      cancelled: "badge-pending",
      in_progress: "badge-progress",
      progress: "badge-progress",
      overdue: "badge-overdue",
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
    };
    const s = (status || "").toLowerCase().replace(" ", "_");
    const cls = map[s] || "badge-pending";
    return `<span class="badge-status ${cls}">${(status || "unknown").replace("_", " ")}</span>`;
  }

  /* Invite code generator */
  function genCode(len = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  }

  /* DOM helpers */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "—";
  }
  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  }
  function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  }
  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  function modal(id, action = "show") {
    const el = document.getElementById(id);
    if (!el) return;
    const m = bootstrap.Modal.getOrCreateInstance(el);
    action === "hide" ? m.hide() : m.show();
  }

  return {
    guardAuth,
    get,
    post,
    put,
    patch,
    del,
    fmt,
    fmtMonth,
    timeAgo,
    ghs,
    pct,
    initSidebar,
    showMsg,
    statusBadge,
    genCode,
    setText,
    setValue,
    show,
    hide,
    modal,
  };
})();

/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */
const LandlordDashboard = (() => {
  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await Promise.all([
      loadStats(),
      loadMaintenance(),
      loadPayments(),
      loadOccupancy(),
    ]);
  }

  async function loadStats() {
    const data = await RentMs.get("/landlords/stats");
    const s = data.data || {};
    RentMs.setText("statPlazas", s.total_plazas ?? 0);
    RentMs.setText("statTenants", s.active_tenants ?? 0);
    RentMs.setText("statRevenue", RentMs.ghs(s.revenue_this_month ?? 0));
    RentMs.setText("statMaint", s.pending_maintenance ?? 0);
  }

  async function loadMaintenance() {
    const data = await RentMs.get(
      "/landlords/maintenance?status=pending&limit=5",
    );
    const list = data.data || [];
    const badge = document.getElementById("maintBadge");
    const el = document.getElementById("maintList");
    if (badge) {
      badge.textContent = list.length;
      badge.style.display = list.length ? "inline" : "none";
    }
    if (!el) return;
    if (!list.length) {
      el.innerHTML = emptyState("bi-tools", "No pending maintenance");
      return;
    }
    el.innerHTML = list
      .map(
        (r) => `
      <div class="d-flex align-items-center gap-3 p-3 border-bottom" style="border-color:var(--border)!important">
        <div style="width:36px;height:36px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
             background:${r.priority === "high" ? "var(--danger-light)" : "var(--warning-light)"};
             color:${r.priority === "high" ? "var(--danger)" : "var(--warning)"}">
          <i class="bi bi-tools"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.875rem;color:var(--text-main)">${r.title}</div>
          <div style="font-size:.75rem;color:var(--text-muted)">${r.tenant_name || ""} · ${r.plaza_name || ""}</div>
        </div>
        ${RentMs.statusBadge(r.priority)}
      </div>`,
      )
      .join("");
  }

  async function loadPayments() {
    const data = await RentMs.get("/payments/all?limit=5");
    const list = data.data || [];
    const el = document.getElementById("recentPayments");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = emptyState("bi-credit-card", "No recent payments");
      return;
    }
    el.innerHTML = `
      <div class="table-responsive">
        <table class="table mb-0">
          <thead><tr><th>Tenant</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${list
            .map(
              (p) => `<tr>
            <td><a href="tenant-details.html?id=${p.tenant_id}" style="font-weight:700;color:var(--text-main);text-decoration:none">${p.tenant_name}</a></td>
            <td style="font-weight:700">${RentMs.ghs(p.amount)}</td>
            <td style="color:var(--text-muted)">${RentMs.fmt(p.payment_date)}</td>
            <td>${RentMs.statusBadge(p.status)}</td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>
      </div>`;
  }

  async function loadOccupancy() {
    const data = await RentMs.get("/landlords/plazas");
    const plazas = data.data || [];
    const el = document.getElementById("occupancyList");
    if (!el) return;
    if (!plazas.length) {
      el.innerHTML = emptyState("bi-buildings", "No plazas added yet");
      return;
    }
    el.innerHTML = `<div class="p-3">${plazas
      .map((p) => {
        const pc = RentMs.pct(p.occupied_units || 0, p.total_units || 0);
        return `<div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span style="font-size:.85rem;font-weight:700;color:var(--text-main)">${p.name}</span>
          <span style="font-size:.78rem;color:var(--text-muted)">${p.occupied_units || 0}/${p.total_units} · ${pc}%</span>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${pc}%"></div></div>
      </div>`;
      })
      .join("")}</div>`;
  }

  function emptyState(icon, msg) {
    return `<div class="empty-state" style="padding:30px 0"><i class="bi ${icon}"></i><p>${msg}</p></div>`;
  }

  return { init };
})();

/* ============================================================
   PAGE: PLAZAS
   ============================================================ */
const LandlordPlazas = (() => {
  let all = [],
    editingId = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await load();
  }

  async function load() {
    const data = await RentMs.get("/landlords/plazas");
    all = data.data || [];
    render(all);
  }

  function render(list) {
    const grid = document.getElementById("plazaGrid");
    const empty = document.getElementById("emptyState");
    const count = document.getElementById("plazaCount");
    if (count) count.textContent = list.length;
    if (!list.length) {
      if (grid) grid.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    const gradients = [
      "linear-gradient(135deg,#0f172a,#1e293b)",
      "linear-gradient(135deg,#0c1445,#1e3a8a)",
      "linear-gradient(135deg,#064e3b,#047857)",
      "linear-gradient(135deg,#7c2d12,#c2410c)",
    ];
    grid.innerHTML = list
      .map((p, i) => {
        const pc = RentMs.pct(p.occupied_units || 0, p.total_units || 0);
        const tag = pc === 100 ? "full" : pc === 0 ? "empty" : "partial";
        return `
        <div class="col-md-6 col-lg-4 plaza-item" data-status="${tag}" data-name="${p.name.toLowerCase()}">
          <div class="plaza-card" onclick="location.href='plaza-details.html?id=${p.id}'">
            <div class="plaza-header" style="background:${gradients[i % gradients.length]}">
              <i class="bi bi-buildings-fill"></i>
              <span class="badge-status ${pc === 100 ? "badge-active" : pc === 0 ? "badge-overdue" : "badge-pending"}"
                    style="position:absolute;top:10px;right:10px">
                ${pc === 100 ? "Full" : pc === 0 ? "Empty" : "Partial"}
              </span>
            </div>
            <div class="p-3">
              <div style="font-weight:800;color:var(--text-main);margin-bottom:2px">${p.name}</div>
              <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px">
                <i class="bi bi-geo-alt me-1"></i>${p.location || "—"}
              </div>
              <div class="d-flex justify-content-between" style="font-size:.8rem;margin-bottom:4px">
                <span style="color:var(--text-muted)">Total units</span><span style="font-weight:700">${p.total_units}</span>
              </div>
              <div class="d-flex justify-content-between" style="font-size:.8rem;margin-bottom:10px">
                <span style="color:var(--text-muted)">Occupied</span><span style="font-weight:700">${p.occupied_units || 0}</span>
              </div>
              <div class="progress mb-3"><div class="progress-bar" style="width:${pc}%"></div></div>
              <div class="d-flex gap-2">
                <a href="plaza-details.html?id=${p.id}" class="btn btn-outline-primary btn-sm flex-fill"
                   onclick="event.stopPropagation()">Details</a>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();LandlordPlazas.edit(${p.id})">
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }

  window.filterPlazas = function () {
    const q = (
      document.getElementById("searchInput")?.value || ""
    ).toLowerCase();
    const st = document.getElementById("filterStatus")?.value || "";
    let count = 0;
    document.querySelectorAll(".plaza-item").forEach((item) => {
      const matchQ =
        !q ||
        item.dataset.name.includes(q) ||
        item.textContent.toLowerCase().includes(q);
      const matchS = !st || item.dataset.status === st;
      item.style.display = matchQ && matchS ? "" : "none";
      if (matchQ && matchS) count++;
    });
    RentMs.setText("plazaCount", count);
  };

  function edit(id) {
    editingId = id;
    const p = all.find((x) => x.id === id);
    if (!p) return;
    RentMs.setValue("plazaName", p.name);
    RentMs.setValue("plazaLocation", p.location);
    RentMs.setValue("plazaUnits", p.total_units);
    const t = document.getElementById("plazaModalTitle");
    if (t) t.textContent = "Edit Plaza";
    RentMs.modal("plazaModal");
  }

  function openAdd() {
    editingId = null;
    ["plazaName", "plazaLocation", "plazaUnits"].forEach((id) =>
      RentMs.setValue(id, ""),
    );
    const t = document.getElementById("plazaModalTitle");
    if (t) t.textContent = "Add New Plaza";
    const e = document.getElementById("plazaError");
    if (e) e.style.display = "none";
    RentMs.modal("plazaModal");
  }

  window.savePlaza = async function () {
    const name = document.getElementById("plazaName")?.value.trim();
    const location = document.getElementById("plazaLocation")?.value.trim();
    const units = document.getElementById("plazaUnits")?.value;
    const errEl = document.getElementById("plazaError");
    if (!name || !units) {
      if (errEl) {
        errEl.textContent = "Name and units are required.";
        errEl.style.display = "block";
      }
      return;
    }
    const body = { name, location, total_units: parseInt(units) };
    const res = editingId
      ? await RentMs.put("/landlords/plazas/" + editingId, body)
      : await RentMs.post("/landlords/plazas", body);
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("plazaModal", "hide");
      if (errEl) errEl.style.display = "none";
      load();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed to save.";
        errEl.style.display = "block";
      }
    }
  };

  return { init, edit, openAdd };
})();

/* ============================================================
   PAGE: PLAZA DETAILS
   ============================================================ */
const LandlordPlazaDetails = (() => {
  const plazaId = new URLSearchParams(location.search).get("id");
  let plaza = {};

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    if (!plazaId) return;
    await loadPlaza();
    await Promise.all([loadTenants(), loadPayments(), loadMaintenance()]);
  }

  async function loadPlaza() {
    const data = await RentMs.get("/landlords/plazas");
    plaza = (data.data || []).find((p) => String(p.id) === plazaId) || {};
    RentMs.setText("pageTitle", plaza.name || "Plaza Details");
    RentMs.setText("heroName", plaza.name || "—");
    const locEl = document.getElementById("heroLocation");
    if (locEl)
      locEl.innerHTML = `<i class="bi bi-geo-alt me-1"></i>${plaza.location || "—"} · ${plaza.total_units || 0} Units`;
    const occ = plaza.occupied_units || 0,
      tot = plaza.total_units || 0;
    RentMs.setText("heroOccupied", occ);
    RentMs.setText("heroVacant", Math.max(tot - occ, 0));
    RentMs.setText("heroRate", RentMs.pct(occ, tot) + "%");
    RentMs.setValue("editName", plaza.name || "");
    RentMs.setValue("editLocation", plaza.location || "");
    RentMs.setValue("editUnits", plaza.total_units || "");
  }

  async function loadTenants() {
    const data = await RentMs.get("/landlords/tenants?plaza_id=" + plazaId);
    const list = data.data || [];
    const rows = document.getElementById("tenantRows");
    const empty = document.getElementById("emptyTenants");
    if (!rows) return;
    if (!list.length) {
      rows.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    rows.innerHTML = list
      .map(
        (t) => `<tr>
      <td><div style="font-weight:700;color:var(--text-main)">${t.username}</div><div style="font-size:.75rem;color:var(--text-muted)">${t.email}</div></td>
      <td>${t.unit_number || "—"}</td>
      <td style="font-weight:700">${RentMs.ghs(t.rent_amount)}</td>
      <td>${t.lease_end ? RentMs.fmtMonth(t.lease_end) : "—"}</td>
      <td>${RentMs.statusBadge(t.status || "active")}</td>
      <td><a href="tenant-details.html?id=${t.id}" class="btn btn-sm btn-outline-primary">View</a></td>
    </tr>`,
      )
      .join("");
  }

  async function loadPayments() {
    const data = await RentMs.get(
      "/payments/all?plaza_id=" + plazaId + "&limit=10",
    );
    const list = data.data || [];
    const rows = document.getElementById("paymentRows");
    if (!rows) return;
    rows.innerHTML = list.length
      ? list
          .map(
            (p) => `<tr>
          <td style="font-weight:700">${p.tenant_name}</td>
          <td style="font-weight:700">${RentMs.ghs(p.amount)}</td>
          <td>${RentMs.fmt(p.payment_date)}</td>
          <td>${p.payment_method || "—"}</td>
          <td>${RentMs.statusBadge(p.status)}</td>
        </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="text-center py-4" style="color:var(--text-muted)">No payments yet</td></tr>';
  }

  async function loadMaintenance() {
    const data = await RentMs.get(
      "/landlords/maintenance?plaza_id=" + plazaId + "&limit=10",
    );
    const list = data.data || [];
    const rows = document.getElementById("maintRows");
    if (!rows) return;
    rows.innerHTML = list.length
      ? list
          .map(
            (r) => `<tr>
          <td style="font-weight:700">${r.title}</td>
          <td>${r.tenant_name || "—"}</td>
          <td>${RentMs.statusBadge(r.priority)}</td>
          <td>${RentMs.statusBadge(r.status)}</td>
          <td>${RentMs.fmt(r.created_at)}</td>
        </tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="text-center py-4" style="color:var(--text-muted)">No requests</td></tr>';
  }

  window.inviteTenant = async function () {
    const email = document.getElementById("inviteEmail")?.value.trim();
    const unit = document.getElementById("inviteUnit")?.value.trim();
    const rent = document.getElementById("inviteRent")?.value;
    const start = document.getElementById("inviteStart")?.value;
    const end = document.getElementById("inviteEnd")?.value;
    const errEl = document.getElementById("inviteError");
    if (!email || !unit || !rent) {
      if (errEl) {
        errEl.textContent = "Email, unit and rent are required.";
        errEl.style.display = "block";
      }
      return;
    }
    const res = await RentMs.post("/landlords/plazas/" + plazaId + "/invite", {
      email,
      unit_number: unit,
      rent_amount: parseFloat(rent),
      lease_start: start,
      lease_end: end,
    });
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("inviteModal", "hide");
      loadTenants();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  window.updatePlaza = async function () {
    const name = document.getElementById("editName")?.value.trim();
    const location = document.getElementById("editLocation")?.value.trim();
    const units = document.getElementById("editUnits")?.value;
    const errEl = document.getElementById("editError");
    const res = await RentMs.put("/landlords/plazas/" + plazaId, {
      name,
      location,
      total_units: parseInt(units),
    });
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("editModal", "hide");
      loadPlaza();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  return { init };
})();

/* ============================================================
   PAGE: TENANTS
   ============================================================ */
const LandlordTenants = (() => {
  let all = [],
    removeId = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await loadAll();
    const btn = document.getElementById("confirmRemoveBtn");
    if (btn) btn.addEventListener("click", doRemove);
  }

  async function loadAll() {
    const [pd, td] = await Promise.all([
      RentMs.get("/landlords/plazas"),
      RentMs.get("/landlords/tenants"),
    ]);
    const plazas = pd.data || [];
    ["filterPlaza", "invitePlaza"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML =
        id === "filterPlaza"
          ? '<option value="">All Plazas</option>'
          : '<option value="">— Select Plaza —</option>';
      plazas.forEach(
        (p) => (el.innerHTML += `<option value="${p.id}">${p.name}</option>`),
      );
    });
    all = td.data || [];
    render(all);
  }

  function render(list) {
    const tbody = document.getElementById("tenantRows");
    const empty = document.getElementById("emptyTenants");
    if (!tbody) return;
    const in30 = Date.now() + 30 * 86400000;
    RentMs.setText("statTotal", list.length);
    RentMs.setText(
      "statActive",
      list.filter((t) => (t.status || "active") === "active").length,
    );
    RentMs.setText(
      "statOverdue",
      list.filter((t) => t.payment_status === "overdue").length,
    );
    RentMs.setText(
      "statExpiring",
      list.filter((t) => t.lease_end && new Date(t.lease_end).getTime() < in30)
        .length,
    );
    if (!list.length) {
      tbody.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    tbody.innerHTML = list
      .map(
        (t) => `<tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="avatar avatar-sm" style="background:var(--primary)">${t.username.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight:700;color:var(--text-main)">${t.username}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${t.email}</div>
          </div>
        </div>
      </td>
      <td>${t.plaza_name || "—"}</td>
      <td>${t.unit_number || "—"}</td>
      <td style="font-weight:700">${RentMs.ghs(t.rent_amount)}</td>
      <td style="color:var(--text-muted)">${t.lease_end ? RentMs.fmtMonth(t.lease_end) : "—"}</td>
      <td>${RentMs.statusBadge(t.payment_status === "overdue" ? "overdue" : t.status || "active")}</td>
      <td>
        <a href="tenant-details.html?id=${t.id}" class="btn btn-sm btn-outline-primary me-1">View</a>
        <button class="btn btn-sm btn-outline-danger" onclick="LandlordTenants.askRemove(${t.tenancy_id})"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`,
      )
      .join("");
  }

  window.filterRows = function () {
    const q = (
      document.getElementById("searchInput")?.value || ""
    ).toLowerCase();
    const pl = document.getElementById("filterPlaza")?.value || "";
    const st = document.getElementById("filterStatus")?.value || "";
    render(
      all.filter(
        (t) =>
          (!q || (t.username + t.email).toLowerCase().includes(q)) &&
          (!pl || String(t.plaza_id) === pl) &&
          (!st || (t.status || "active").toLowerCase() === st),
      ),
    );
  };

  window.inviteTenant = async function () {
    const plazaId = document.getElementById("invitePlaza")?.value;
    const email = document.getElementById("inviteEmail")?.value.trim();
    const unit = document.getElementById("inviteUnit")?.value.trim();
    const rent = document.getElementById("inviteRent")?.value;
    const start = document.getElementById("inviteStart")?.value;
    const end = document.getElementById("inviteEnd")?.value;
    const errEl = document.getElementById("inviteError");
    if (!plazaId || !email) {
      if (errEl) {
        errEl.textContent = "Plaza and email are required.";
        errEl.style.display = "block";
      }
      return;
    }
    const res = await RentMs.post("/landlords/plazas/" + plazaId + "/invite", {
      email,
      unit_number: unit,
      rent_amount: parseFloat(rent),
      lease_start: start,
      lease_end: end,
    });
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("inviteModal", "hide");
      loadAll();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  function askRemove(tenancyId) {
    removeId = tenancyId;
    RentMs.modal("removeModal");
  }
  async function doRemove() {
    if (!removeId) return;
    await RentMs.del("/landlords/tenancies/" + removeId + "/tenant");
    RentMs.modal("removeModal", "hide");
    removeId = null;
    loadAll();
  }
  window.removeTenant = doRemove;

  return { init, askRemove };
})();

/* ============================================================
   PAGE: TENANT DETAILS
   ============================================================ */
const LandlordTenantDetails = (() => {
  const tenantId = new URLSearchParams(location.search).get("id");
  let tenancyId = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    if (!tenantId) return;
    await loadTenant();
    await Promise.all([loadPayments(), loadMaintenance()]);
  }

  async function loadTenant() {
    const td = await RentMs.get("/landlords/tenants");
    const t = (td.data || []).find((x) => String(x.id) === tenantId);
    if (!t) return;
    tenancyId = t.tenancy_id;
    RentMs.setText("pageTitle", t.username);
    RentMs.setText("tenantName", t.username);
    RentMs.setText("tenantEmail", t.email);
    RentMs.setText("tenantPhone", t.phone || "—");
    const avEl = document.getElementById("avatarEl");
    if (avEl) avEl.textContent = t.username.charAt(0).toUpperCase();
    RentMs.setText("infoPlaza", t.plaza_name || "—");
    RentMs.setText("infoUnit", t.unit_number || "—");
    RentMs.setText("infoRent", RentMs.ghs(t.rent_amount));
    RentMs.setText("leaseStart", RentMs.fmt(t.lease_start));
    RentMs.setText("leaseEnd", RentMs.fmt(t.lease_end));
    RentMs.setText("leaseStatus", t.status || "active");
    RentMs.setValue("newRent", t.rent_amount || "");
    if (t.lease_end) {
      const days = Math.max(
        0,
        Math.ceil((new Date(t.lease_end).getTime() - Date.now()) / 86400000),
      );
      RentMs.setText("leaseDays", days);
    }
  }

  async function loadPayments() {
    const data = await RentMs.get(
      "/payments?tenant_id=" + tenantId + "&limit=20",
    );
    const list = data.data || [];
    const rows = document.getElementById("payRows");
    const empty = document.getElementById("emptyPay");
    if (!rows) return;
    if (!list.length) {
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    rows.innerHTML = list
      .map(
        (p) => `<tr>
      <td>${RentMs.fmtMonth(p.payment_date || p.created_at)}</td>
      <td style="font-weight:700">${RentMs.ghs(p.amount)}</td>
      <td>${p.payment_method || "—"}</td>
      <td>${RentMs.fmt(p.payment_date)}</td>
      <td>${RentMs.statusBadge(p.status)}</td>
    </tr>`,
      )
      .join("");
  }

  async function loadMaintenance() {
    const data = await RentMs.get(
      "/landlords/maintenance?tenant_id=" + tenantId + "&limit=10",
    );
    const list = data.data || [];
    const rows = document.getElementById("maintRows");
    if (!rows) return;
    rows.innerHTML = list.length
      ? list
          .map(
            (r) => `<tr>
          <td style="font-weight:700">${r.title}</td>
          <td>${RentMs.statusBadge(r.priority)}</td>
          <td>${RentMs.statusBadge(r.status)}</td>
          <td>${RentMs.fmt(r.created_at)}</td>
        </tr>`,
          )
          .join("")
      : '<tr><td colspan="4" class="text-center py-3" style="color:var(--text-muted)">No requests</td></tr>';
  }

  window.sendReminder = async function () {
    if (!tenancyId) return;
    const res = await RentMs.post("/email/payment-reminder", {
      tenancy_id: tenancyId,
    });
    RentMs.modal("reminderModal", "hide");
    RentMs.showMsg(
      "reminderMsg",
      res.message ? "Reminder sent!" : "Failed.",
      res.error ? "error" : "success",
    );
  };

  window.renewLease = async function () {
    const newEnd = document.getElementById("newLeaseEnd")?.value;
    const newRent = document.getElementById("newRent")?.value;
    const errEl = document.getElementById("renewError");
    if (!newEnd) {
      if (errEl) {
        errEl.textContent = "New lease end date required.";
        errEl.style.display = "block";
      }
      return;
    }
    const body = { lease_end: newEnd };
    if (newRent) body.rent_amount = parseFloat(newRent);
    const res = await RentMs.put("/landlords/tenancies/" + tenancyId, body);
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("renewModal", "hide");
      loadTenant();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  window.removeTenant = async function () {
    if (!tenancyId) return;
    await RentMs.del("/landlords/tenancies/" + tenancyId + "/tenant");
    location.href = "tenants.html";
  };

  return { init };
})();

/* ============================================================
   PAGE: PAYMENTS
   ============================================================ */
const LandlordPayments = (() => {
  let all = [],
    activePayId = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await loadAll();
  }

  async function loadAll() {
    const [pd, data] = await Promise.all([
      RentMs.get("/landlords/plazas"),
      RentMs.get("/payments/all?limit=100"),
    ]);
    ["payPlaza", "bulkPlaza"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '<option value="">All Plazas</option>';
      (pd.data || []).forEach(
        (p) => (el.innerHTML += `<option value="${p.id}">${p.name}</option>`),
      );
    });
    all = data.data || [];
    renderStats(all);
    renderPayments(all);
    renderReceipts(
      all.filter((p) => p.status === "completed" || p.status === "paid"),
    );
  }

  function renderStats(list) {
    const col = list
      .filter((p) => p.status === "completed" || p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const pen = list
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const ovr = list
      .filter((p) => p.status === "overdue")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    RentMs.setText("statCollected", RentMs.ghs(col));
    RentMs.setText("statPending", RentMs.ghs(pen));
    RentMs.setText("statOverdue", RentMs.ghs(ovr));
    RentMs.setText(
      "statPaid",
      list.filter((p) => p.status === "completed" || p.status === "paid")
        .length,
    );
  }

  function renderPayments(list) {
    const tbody = document.getElementById("payRows");
    const empty = document.getElementById("emptyPayments");
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    tbody.innerHTML = list
      .map(
        (p) => `<tr>
      <td style="font-weight:700">${p.tenant_name}</td>
      <td>${p.plaza_name || "—"}</td>
      <td style="font-weight:700">${RentMs.ghs(p.amount)}</td>
      <td>${p.payment_method || "—"}</td>
      <td style="color:var(--text-muted)">${RentMs.fmt(p.payment_date)}</td>
      <td>${RentMs.statusBadge(p.status)}</td>
      <td>
        ${
          p.status === "completed" || p.status === "paid"
            ? `<button class="btn btn-sm btn-secondary" onclick="LandlordPayments.viewReceipt(${p.id})"><i class="bi bi-receipt me-1"></i>Receipt</button>`
            : `<button class="btn btn-sm btn-outline-warning" onclick="LandlordPayments.remind(${p.tenancy_id})"><i class="bi bi-envelope me-1"></i>Remind</button>`
        }
      </td>
    </tr>`,
      )
      .join("");
  }

  function renderReceipts(list) {
    const el = document.getElementById("receiptRows");
    const empty = document.getElementById("emptyReceipts");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    el.innerHTML = list
      .map(
        (p) => `<tr>
      <td style="font-weight:700">${p.tenant_name}</td>
      <td>${p.plaza_name || "—"}</td>
      <td style="font-weight:700">${RentMs.ghs(p.amount)}</td>
      <td>${RentMs.fmt(p.payment_date)}</td>
      <td><button class="btn btn-sm btn-outline-primary" onclick="LandlordPayments.viewReceipt(${p.id})"><i class="bi bi-eye me-1"></i>View</button></td>
    </tr>`,
      )
      .join("");
  }

  window.filterPayments = function () {
    const q = (document.getElementById("paySearch")?.value || "").toLowerCase();
    const pl = document.getElementById("payPlaza")?.value || "";
    const st = document.getElementById("payStatus")?.value || "";
    const mo = document.getElementById("payMonth")?.value || "";
    renderPayments(
      all.filter(
        (p) =>
          (!q || p.tenant_name.toLowerCase().includes(q)) &&
          (!pl || String(p.plaza_id) === pl) &&
          (!st || p.status === st) &&
          (!mo || (p.payment_date || "").startsWith(mo)),
      ),
    );
  };

  async function viewReceipt(id) {
    activePayId = id;
    const data = await RentMs.get("/payments/" + id + "/receipt");
    const r = data.data || {};
    const el = document.getElementById("receiptContent");
    if (!el) return;
    el.innerHTML = `
      <div class="receipt-row"><span>Tenant</span><span style="font-weight:700">${r.tenant_name || "—"}</span></div>
      <div class="receipt-row"><span>Plaza</span><span>${r.plaza_name || "—"}</span></div>
      <div class="receipt-row"><span>Unit</span><span>${r.unit_number || "—"}</span></div>
      <div class="receipt-row"><span>Amount</span><span style="font-weight:800;color:var(--primary)">${RentMs.ghs(r.amount)}</span></div>
      <div class="receipt-row"><span>Method</span><span>${r.payment_method || "—"}</span></div>
      <div class="receipt-row"><span>Date</span><span>${RentMs.fmt(r.payment_date)}</span></div>
      <div class="receipt-row"><span>Reference</span><span style="font-family:monospace;font-size:.85rem">${r.reference || "—"}</span></div>
      <div class="receipt-row"><span>Status</span><span>${RentMs.statusBadge(r.status)}</span></div>`;
    RentMs.modal("receiptModal");
  }

  async function remind(tenancyId) {
    const res = await RentMs.post("/email/payment-reminder", {
      tenancy_id: tenancyId,
    });
    alert(res.message || "Reminder sent!");
  }

  window.sendBulkReminder = async function () {
    const plazaId = document.getElementById("bulkPlaza")?.value;
    const res = await RentMs.post(
      "/email/bulk-reminder",
      plazaId ? { plaza_id: plazaId } : {},
    );
    RentMs.modal("bulkModal", "hide");
    const el = document.getElementById("bulkResult");
    if (el) {
      el.textContent = res.message || "Reminders sent!";
      el.style.display = "block";
    }
  };

  return { init, viewReceipt, remind };
})();

/* ============================================================
   PAGE: MAINTENANCE
   ============================================================ */
const LandlordMaintenance = (() => {
  let all = [],
    activeId = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await loadAll();
  }

  async function loadAll() {
    const [pd, data] = await Promise.all([
      RentMs.get("/landlords/plazas"),
      RentMs.get("/landlords/maintenance"),
    ]);
    const pSel = document.getElementById("filterPlaza");
    if (pSel) {
      pSel.innerHTML = '<option value="">All Plazas</option>';
      (pd.data || []).forEach(
        (p) => (pSel.innerHTML += `<option value="${p.id}">${p.name}</option>`),
      );
    }
    all = data.data || [];
    renderStats(all);
    renderCards(all);
  }

  function renderStats(list) {
    RentMs.setText(
      "sPending",
      list.filter((r) => r.status === "pending").length,
    );
    RentMs.setText(
      "sProgress",
      list.filter((r) => r.status === "in_progress").length,
    );
    RentMs.setText(
      "sResolved",
      list.filter((r) => r.status === "resolved").length,
    );
    RentMs.setText("sHigh", list.filter((r) => r.priority === "high").length);
  }

  function renderCards(list) {
    const grid = document.getElementById("reqGrid");
    const empty = document.getElementById("emptyState");
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    grid.innerHTML = list
      .map(
        (r) => `
      <div class="col-md-6 col-lg-4">
        <div class="request-card ${r.priority}">
          <div class="d-flex align-items-start justify-content-between mb-2 gap-2">
            <div style="min-width:0;flex:1">
              <div style="font-weight:800;color:var(--text-main);font-size:.875rem">${r.title}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">${r.tenant_name || "—"} · ${r.unit_number || ""} · ${r.plaza_name || "—"}</div>
            </div>
            ${RentMs.statusBadge(r.priority)}
          </div>
          <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px;
              display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${r.description || "No description provided."}
          </p>
          <div class="d-flex align-items-center justify-content-between mb-3">
            ${RentMs.statusBadge(r.status)}
            <span style="font-size:.72rem;color:var(--text-muted)">${RentMs.fmt(r.created_at)}</span>
          </div>
          <div class="d-flex gap-2">
            <select class="form-select form-select-sm" onchange="LandlordMaintenance.quickUpdate(${r.id},this.value)">
              <option value="pending"     ${r.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="in_progress" ${r.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="resolved"    ${r.status === "resolved" ? "selected" : ""}>Resolved</option>
              <option value="cancelled"   ${r.status === "cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
            <button class="btn btn-sm btn-primary" onclick="LandlordMaintenance.openReq(${r.id})" style="white-space:nowrap">Details</button>
          </div>
        </div>
      </div>`,
      )
      .join("");
  }

  window.filterCards = function () {
    const q = (
      document.getElementById("searchInput")?.value || ""
    ).toLowerCase();
    const st = document.getElementById("filterStatus")?.value || "";
    const pr = document.getElementById("filterPriority")?.value || "";
    const pl = document.getElementById("filterPlaza")?.value || "";
    const f = all.filter(
      (r) =>
        (!q ||
          (r.title + (r.tenant_name || "") + (r.plaza_name || ""))
            .toLowerCase()
            .includes(q)) &&
        (!st || r.status === st) &&
        (!pr || r.priority === pr) &&
        (!pl || String(r.plaza_id) === pl),
    );
    renderStats(f);
    renderCards(f);
  };

  async function quickUpdate(id, status) {
    await RentMs.put("/landlords/maintenance/" + id, { status });
    const r = all.find((x) => x.id === id);
    if (r) r.status = status;
    renderStats(all);
  }

  function openReq(id) {
    const r = all.find((x) => x.id === id);
    if (!r) return;
    activeId = id;
    RentMs.setText("reqModalTitle", "Request #" + r.id);
    RentMs.setText("reqTitle", r.title);
    RentMs.setText("reqDesc", r.description || "No description.");
    RentMs.setText("reqTenant", r.tenant_name || "—");
    RentMs.setText(
      "reqUnit",
      (r.plaza_name || "—") + " · Unit " + (r.unit_number || "—"),
    );
    RentMs.setText("reqDate", RentMs.fmt(r.created_at));
    const badge = document.getElementById("reqBadges");
    if (badge)
      badge.innerHTML =
        RentMs.statusBadge(r.priority) + " " + RentMs.statusBadge(r.status);
    RentMs.setValue("reqStatusSel", r.status);
    RentMs.setValue("reqNote", "");
    const e = document.getElementById("reqError");
    if (e) e.style.display = "none";
    RentMs.modal("reqModal");
  }

  window.updateRequest = async function () {
    if (!activeId) return;
    const status = document.getElementById("reqStatusSel")?.value;
    const note = document.getElementById("reqNote")?.value.trim();
    const errEl = document.getElementById("reqError");
    const res = await RentMs.put("/landlords/maintenance/" + activeId, {
      status,
      note,
    });
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("reqModal", "hide");
      loadAll();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  return { init, quickUpdate, openReq };
})();

/* ============================================================
   PAGE: MESSAGES
   ============================================================ */
const LandlordMessages = (() => {
  let groups = [],
    activeGroup = null,
    pollTimer = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    const codeEl = document.getElementById("groupCode");
    if (codeEl) codeEl.value = RentMs.genCode();
    await loadPlazas();
    await loadGroups();
  }

  async function loadPlazas() {
    const pd = await RentMs.get("/landlords/plazas");
    const sel = document.getElementById("groupPlaza");
    if (!sel) return;
    sel.innerHTML = '<option value="">All Plazas</option>';
    (pd.data || []).forEach(
      (p) => (sel.innerHTML += `<option value="${p.id}">${p.name}</option>`),
    );
  }

  async function loadGroups() {
    const data = await RentMs.get("/landlords/groups");
    groups = data.data || [];
    renderGroups(groups);
  }

  function renderGroups(list) {
    const el = document.getElementById("groupList");
    const cnt = document.getElementById("groupCount");
    if (cnt)
      cnt.textContent = list.length + " group" + (list.length !== 1 ? "s" : "");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state" style="padding:40px 16px"><i class="bi bi-chat-square-dots"></i><p>No groups yet.<br/>Create your first group.</p></div>`;
      return;
    }
    el.innerHTML = list
      .map(
        (g) => `
      <div class="group-item${activeGroup && activeGroup.id === g.id ? " active" : ""}" onclick="LandlordMessages.openGroup(${g.id})">
        <div class="group-icon">${g.name.charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:var(--text-main);font-size:.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</div>
          <div style="font-size:.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.last_message || "No messages yet"}</div>
        </div>
        ${g.unread_count ? `<span style="background:var(--primary);color:#fff;font-size:.65rem;font-weight:800;padding:2px 7px;border-radius:20px">${g.unread_count}</span>` : ""}
      </div>`,
      )
      .join("");
  }

  window.filterGroups = function () {
    const q = (
      document.getElementById("groupSearch")?.value || ""
    ).toLowerCase();
    renderGroups(groups.filter((g) => g.name.toLowerCase().includes(q)));
  };

  async function openGroup(id) {
    clearInterval(pollTimer);
    activeGroup = groups.find((g) => g.id === id) || null;
    if (!activeGroup) return;
    renderGroups(groups);
    const noChat = document.getElementById("noChatSelected");
    const chat = document.getElementById("chatActive");
    if (noChat) noChat.style.display = "none";
    if (chat) {
      chat.style.display = "flex";
      chat.style.flexDirection = "column";
    }
    RentMs.setText("chatIcon", activeGroup.name.charAt(0).toUpperCase());
    RentMs.setText("chatGroupName", activeGroup.name);
    RentMs.setText(
      "chatMemberCount",
      (activeGroup.member_count || 0) + " members",
    );
    RentMs.setText("displayCode", activeGroup.invite_code || "—");
    await loadMessages(id);
    pollTimer = setInterval(() => loadMessages(id), 5000);
  }

  async function loadMessages(groupId) {
    const data = await RentMs.get("/landlords/groups/" + groupId + "/messages");
    const list = data.data || [];
    const box = document.getElementById("chatMessages");
    if (!box) return;
    /* DEV_MODE fix: use MOCK.user.id instead of localStorage */
    const meId = DEV_MODE
      ? MOCK.user.id
      : JSON.parse(localStorage.getItem("user") || "{}").id;
    if (!list.length) {
      box.innerHTML = `<div class="empty-state" style="padding:40px 0;flex:1"><i class="bi bi-chat-dots"></i><p>No messages yet. Say hello!</p></div>`;
      return;
    }
    box.innerHTML = list
      .map((m) => {
        const mine = String(m.sender_id) === String(meId);
        return `<div class="d-flex ${mine ? "justify-content-end" : "justify-content-start"} mb-3 msg ${mine ? "mine" : "theirs"}">
        <div>
          ${!mine ? `<div style="font-size:.72rem;font-weight:700;color:var(--text-muted);margin-bottom:3px">${m.sender_name || "Member"}</div>` : ""}
          <div class="msg-bubble">${m.message}</div>
          <div style="font-size:.65rem;color:var(--text-muted);margin-top:3px;text-align:${mine ? "right" : "left"}">${RentMs.timeAgo(m.created_at)}</div>
        </div>
      </div>`;
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  }

  window.sendMsg = async function () {
    if (!activeGroup) return;
    const input = document.getElementById("msgInput");
    const msg = input?.value.trim();
    if (!msg) return;
    input.value = "";
    await RentMs.post("/landlords/groups/" + activeGroup.id + "/messages", {
      message: msg,
    });
    await loadMessages(activeGroup.id);
    const g = groups.find((x) => x.id === activeGroup.id);
    if (g) g.last_message = msg;
    renderGroups(groups);
  };

  window.createGroup = async function () {
    const name = document.getElementById("groupName")?.value.trim();
    const plaza = document.getElementById("groupPlaza")?.value;
    const code = document.getElementById("groupCode")?.value.trim();
    const errEl = document.getElementById("groupError");
    if (!name) {
      if (errEl) {
        errEl.textContent = "Group name is required.";
        errEl.style.display = "block";
      }
      return;
    }
    const res = await RentMs.post("/landlords/groups", {
      name,
      plaza_id: plaza || null,
      invite_code: code,
    });
    if (res.data || (res.message && !res.error)) {
      RentMs.modal("createGroupModal", "hide");
      if (errEl) errEl.style.display = "none";
      await loadGroups();
      if (res.data?.id) openGroup(res.data.id);
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  window.genCode = function () {
    const el = document.getElementById("groupCode");
    if (el) el.value = RentMs.genCode();
  };
  window.copyCode = function () {
    const code = document.getElementById("displayCode")?.textContent;
    if (!code || code === "—") return;
    navigator.clipboard.writeText(code).then(() => {
      const el = document.getElementById("copyAlert");
      if (el) {
        el.style.display = "block";
        setTimeout(() => (el.style.display = "none"), 2000);
      }
    });
  };
  window.regenCode = async function () {
    if (!activeGroup) return;
    const newCode = RentMs.genCode();
    const res = await RentMs.put("/landlords/groups/" + activeGroup.id, {
      invite_code: newCode,
    });
    if (res.data || (res.message && !res.error)) {
      activeGroup.invite_code = newCode;
      RentMs.setText("displayCode", newCode);
    }
  };

  return { init, openGroup };
})();

/* ============================================================
   PAGE: ANNOUNCEMENTS
   ============================================================ */
const LandlordAnnouncements = (() => {
  let all = [],
    deleteId = null;

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await loadPlazas();
    await load();
    const btn = document.getElementById("confirmDeleteBtn");
    if (btn) btn.addEventListener("click", doDelete);
  }

  async function loadPlazas() {
    const pd = await RentMs.get("/landlords/plazas");
    const sel = document.getElementById("annTarget");
    if (!sel) return;
    sel.innerHTML = '<option value="all">All Tenants</option>';
    (pd.data || []).forEach(
      (p) =>
        (sel.innerHTML += `<option value="plaza_${p.id}">${p.name} Only</option>`),
    );
  }

  async function load() {
    const f = document.getElementById("annFilter")?.value || "";
    const data = await RentMs.get(
      "/landlords/announcements" + (f === "pinned" ? "?pinned=true" : ""),
    );
    all = data.data || [];
    render(all);
  }
  window.loadAnnouncements = load;

  function render(list) {
    const el = document.getElementById("annList");
    const empty = document.getElementById("emptyAnn");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    el.innerHTML = list
      .map(
        (a) => `
      <div class="ann-card ${a.is_pinned ? "pinned" : ""}">
        <div class="d-flex align-items-start justify-content-between mb-2 gap-2">
          <div class="d-flex align-items-center gap-2 flex-wrap">
            ${a.is_pinned ? '<i class="bi bi-pin-fill" style="color:var(--primary)"></i>' : ""}
            <span style="font-weight:800;color:var(--text-main)">${a.title}</span>
          </div>
          <div class="d-flex align-items-center gap-2 flex-shrink-0">
            <span class="badge-pill">${a.target_label || "All Tenants"}</span>
            <button class="btn btn-sm btn-outline-danger" style="font-size:.7rem;padding:2px 8px"
                    onclick="LandlordAnnouncements.askDelete(${a.id})"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <p style="font-size:.875rem;color:var(--text-muted);margin-bottom:10px;line-height:1.6">${a.message}</p>
        <div class="d-flex gap-3 flex-wrap">
          <span style="font-size:.75rem;color:var(--text-muted)"><i class="bi bi-calendar me-1"></i>${RentMs.fmt(a.created_at)}</span>
          ${a.sent_count ? `<span style="font-size:.75rem;color:var(--success)"><i class="bi bi-check-circle me-1"></i>Sent to ${a.sent_count}</span>` : ""}
          ${a.email_sent ? `<span style="font-size:.75rem;color:var(--primary)"><i class="bi bi-envelope me-1"></i>Email sent</span>` : ""}
        </div>
      </div>`,
      )
      .join("");
  }

  window.sendAnnouncement = async function () {
    const title = document.getElementById("annTitle")?.value.trim();
    const message = document.getElementById("annMessage")?.value.trim();
    const target = document.getElementById("annTarget")?.value || "all";
    const pinned = document.getElementById("annPin")?.checked || false;
    const email = document.getElementById("annEmail")?.checked || false;
    const errEl = document.getElementById("annError");
    const sucEl = document.getElementById("annSuccess");
    if (errEl) errEl.style.display = "none";
    if (sucEl) sucEl.style.display = "none";
    if (!title || !message) {
      if (errEl) {
        errEl.textContent = "Title and message are required.";
        errEl.style.display = "block";
      }
      return;
    }
    const body = {
      title,
      message,
      target_type: target.startsWith("plaza_") ? "plaza" : "all",
      send_email: email,
      is_pinned: pinned,
    };
    if (target.startsWith("plaza_"))
      body.plaza_id = target.replace("plaza_", "");
    const res = await RentMs.post("/landlords/announcements", body);
    if (res.data || (res.message && !res.error)) {
      RentMs.setValue("annTitle", "");
      RentMs.setValue("annMessage", "");
      if (sucEl) {
        sucEl.textContent = "Announcement sent successfully!";
        sucEl.style.display = "block";
      }
      load();
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed to send.";
        errEl.style.display = "block";
      }
    }
  };

  function askDelete(id) {
    deleteId = id;
    RentMs.modal("deleteModal");
  }
  async function doDelete() {
    if (!deleteId) return;
    await RentMs.del("/landlords/announcements/" + deleteId);
    RentMs.modal("deleteModal", "hide");
    deleteId = null;
    load();
  }

  return { init, askDelete };
})();

/* ============================================================
   PAGE: NOTIFICATIONS
   ============================================================ */
const LandlordNotifications = (() => {
  let all = [],
    activeFilter = "all";

  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await load();
  }

  async function load() {
    const data = await RentMs.get("/notifications?limit=50");
    all = data.data || [];
    const unread = all.filter((n) => !n.is_read).length;
    RentMs.setText("unreadLabel", unread ? unread + " unread" : "All read");
    render(all);
  }

  function render(list) {
    const container = document.getElementById("notifContainer");
    const empty = document.getElementById("emptyState");
    if (!container) return;
    if (!list.length) {
      container.innerHTML = "";
      if (empty) empty.style.display = "flex";
      return;
    }
    if (empty) empty.style.display = "none";
    const unread = list.filter((n) => !n.is_read);
    const read = list.filter((n) => n.is_read);
    let html = "";
    if (unread.length) {
      html += label("Unread · " + unread.length);
      html += unread.map(row).join("");
    }
    if (read.length) {
      html += label("Earlier");
      html += read.map(row).join("");
    }
    container.innerHTML = html;
  }

  const label = (txt) => `<div class="section-label">${txt}</div>`;

  function row(n) {
    const icons = {
      payment: "bi-cash-coin",
      maintenance: "bi-tools",
      lease: "bi-file-text",
      general: "bi-bell",
    };
    const colors = {
      payment: "green",
      maintenance: "red",
      lease: "yellow",
      general: "blue",
    };
    const type = n.type || "general";
    return `
      <div class="notif-item ${n.is_read ? "" : "unread"}" data-type="${type}" onclick="LandlordNotifications.markRead(${n.id})">
        <div class="notif-icon ${colors[type] || "blue"}"><i class="bi ${icons[type] || "bi-bell"}"></i></div>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text-main);font-size:.875rem">${n.title}</div>
          <div style="font-size:.8rem;color:var(--text-muted);line-height:1.4">${n.message}</div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px"><i class="bi bi-clock me-1"></i>${RentMs.timeAgo(n.created_at)}</div>
        </div>
        ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:6px"></div>' : ""}
      </div>`;
  }

  window.filter = function (type, btn) {
    activeFilter = type;
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    render(
      type === "all" ? all : all.filter((n) => (n.type || "general") === type),
    );
  };

  async function markRead(id) {
    const n = all.find((x) => x.id === id);
    if (!n || n.is_read) return;
    await RentMs.patch("/notifications/" + id + "/read", {});
    n.is_read = true;
    RentMs.setText(
      "unreadLabel",
      all.filter((x) => !x.is_read).length
        ? all.filter((x) => !x.is_read).length + " unread"
        : "All read",
    );
    render(
      activeFilter === "all"
        ? all
        : all.filter((x) => (x.type || "general") === activeFilter),
    );
  }

  window.markAllRead = async function () {
    await RentMs.post("/notifications/read-all", {});
    all.forEach((n) => (n.is_read = true));
    RentMs.setText("unreadLabel", "All read");
    render(
      activeFilter === "all"
        ? all
        : all.filter((x) => (x.type || "general") === activeFilter),
    );
  };

  return { init, markRead };
})();

/* ============================================================
   PAGE: REPORTS
   ============================================================ */
const LandlordReports = (() => {
  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    seedMonths();
    await load();
  }

  function seedMonths() {
    const sel = document.getElementById("reportMonth");
    if (!sel) return;
    const now = new Date();
    sel.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().slice(0, 7);
      const lbl = d.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      });
      sel.innerHTML += `<option value="${val}"${i === 0 ? " selected" : ""}>${lbl}</option>`;
    }
  }

  async function load() {
    const month = document.getElementById("reportMonth")?.value || "";
    const qs = month ? "?month=" + month : "";
    const [stats, revData, plazaData, tenantData] = await Promise.all([
      RentMs.get("/landlords/stats" + qs),
      RentMs.get("/landlords/reports/revenue?months=6"),
      RentMs.get("/landlords/plazas"),
      RentMs.get("/landlords/reports/tenants" + qs),
    ]);
    const s = stats.data || {};
    RentMs.setText(
      "rRevenue",
      RentMs.ghs(s.revenue_collected || s.revenue_this_month || 0),
    );
    RentMs.setText("rPending", RentMs.ghs(s.pending_amount || 0));
    RentMs.setText("rRate", (s.collection_rate || 0) + "%");
    RentMs.setText("rOccupancy", (s.avg_occupancy || 0) + "%");

    const revList = revData.data || [];
    const chart = document.getElementById("revenueChart");
    if (chart) {
      if (revList.length) {
        const max = Math.max(
          ...revList.map((r) => parseFloat(r.amount) || 0),
          1,
        );
        chart.innerHTML = `<div style="display:flex;align-items:flex-end;justify-content:space-around;gap:8px;height:100%;width:100%">
          ${revList
            .map((r) => {
              const h = Math.max(
                Math.round((parseFloat(r.amount) / max) * 120),
                4,
              );
              return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
              <div style="font-size:.65rem;color:var(--text-muted);font-weight:700">${RentMs.ghs(r.amount).replace("GHS ", "")}</div>
              <div style="width:100%;max-width:36px;height:${h}px;border-radius:6px 6px 0 0;background:var(--primary);min-height:4px"></div>
              <div style="font-size:.65rem;color:var(--text-muted)">${r.month_short || r.month}</div>
            </div>`;
            })
            .join("")}
        </div>`;
      } else {
        chart.innerHTML = `<div class="empty-state" style="width:100%;padding:30px 0"><i class="bi bi-bar-chart"></i><p>No revenue data yet</p></div>`;
      }
    }

    const plazas = plazaData.data || [];
    const occEl = document.getElementById("occupancyBars");
    if (occEl) {
      occEl.innerHTML = plazas.length
        ? plazas
            .map((p) => {
              const pc = RentMs.pct(p.occupied_units || 0, p.total_units || 0);
              return `<div class="mb-3">
          <div class="d-flex justify-content-between mb-1">
            <span style="font-size:.85rem;font-weight:700">${p.name}</span>
            <span style="font-size:.78rem;color:var(--text-muted)">${p.occupied_units || 0}/${p.total_units} · ${pc}%</span>
          </div>
          <div class="progress"><div class="progress-bar" style="width:${pc}%"></div></div>
        </div>`;
            })
            .join("")
        : `<div class="empty-state" style="padding:20px 0"><i class="bi bi-buildings"></i><p>No plazas yet</p></div>`;
    }

    const plazaTable = document.getElementById("plazaReportRows");
    if (plazaTable) {
      plazaTable.innerHTML = plazas.length
        ? plazas
            .map((p) => {
              const pc = RentMs.pct(p.occupied_units || 0, p.total_units || 0);
              return `<tr>
          <td style="font-weight:700">${p.name}</td><td>${p.location || "—"}</td>
          <td>${p.total_units}</td><td>${p.occupied_units || 0}</td><td>${pc}%</td>
          <td style="font-weight:700">${RentMs.ghs(p.monthly_revenue || 0)}</td>
          <td><a href="plaza-details.html?id=${p.id}" class="btn btn-sm btn-outline-primary">View</a></td>
        </tr>`;
            })
            .join("")
        : `<tr><td colspan="7" class="text-center py-4" style="color:var(--text-muted)">No plazas yet</td></tr>`;
    }

    const tData = tenantData.data || [];
    const tenantTable = document.getElementById("tenantTable");
    if (tenantTable) {
      tenantTable.innerHTML = tData.length
        ? tData
            .map(
              (t) => `<tr>
        <td style="font-weight:700">${t.tenant_name}</td>
        <td>${t.plaza_name || "—"}</td><td>${t.unit_number || "—"}</td>
        <td style="font-weight:700">${RentMs.ghs(t.rent_amount)}</td>
        <td style="font-weight:700;color:${parseFloat(t.paid_amount || 0) >= parseFloat(t.rent_amount || 0) ? "var(--success)" : "var(--danger)"}">
          ${RentMs.ghs(t.paid_amount || 0)}</td>
        <td>${RentMs.statusBadge(t.payment_status || "pending")}</td>
      </tr>`,
            )
            .join("")
        : `<tr><td colspan="6" class="text-center py-4" style="color:var(--text-muted)">No data for this period</td></tr>`;
    }

    const overdueRows = document.getElementById("overdueRows");
    const emptyOverdue = document.getElementById("emptyOverdue");
    if (overdueRows) {
      const overdue = tData.filter((t) => t.payment_status === "overdue");
      if (!overdue.length) {
        overdueRows.innerHTML = "";
        if (emptyOverdue) emptyOverdue.style.display = "flex";
      } else {
        if (emptyOverdue) emptyOverdue.style.display = "none";
        overdueRows.innerHTML = overdue
          .map(
            (t) => `<tr>
          <td style="font-weight:700">${t.tenant_name}</td>
          <td>${t.plaza_name || "—"}</td><td>${t.unit_number || "—"}</td>
          <td style="font-weight:700;color:var(--danger)">${RentMs.ghs(t.rent_amount)}</td>
          <td><button class="btn btn-sm btn-outline-danger" onclick="LandlordReports.remind(${t.tenancy_id})">
            <i class="bi bi-envelope me-1"></i>Remind</button></td>
        </tr>`,
          )
          .join("");
      }
    }
  }

  window.loadReports = load;

  async function remind(tenancyId) {
    const res = await RentMs.post("/email/payment-reminder", {
      tenancy_id: tenancyId,
    });
    alert(res.message || "Reminder sent!");
  }

  return { init, remind };
})();

/* ============================================================
   PAGE: PROFILE
   ============================================================ */
const LandlordProfile = (() => {
  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await load();
  }

  async function load() {
    const data = await RentMs.get("/auth/me");
    const p = data.data || data.user || {};
    const name = p.username || p.name || "";
    RentMs.setText("profileNameDisplay", name || "—");
    RentMs.setText("profileEmailDisplay", p.email || "—");
    const avEl = document.getElementById("avatarEl");
    if (avEl) avEl.textContent = name ? name.charAt(0).toUpperCase() : "?";
    RentMs.setValue("profileName", name);
    RentMs.setValue("profileEmail", p.email || "");
    RentMs.setValue("profilePhone", p.phone || "");
    RentMs.setValue("profileAddress", p.address || "");
  }

  window.saveProfile = async function () {
    const name = document.getElementById("profileName")?.value.trim();
    const email = document.getElementById("profileEmail")?.value.trim();
    const phone = document.getElementById("profilePhone")?.value.trim();
    const address = document.getElementById("profileAddress")?.value.trim();
    if (!name || !email) {
      RentMs.showMsg("profileMsg", "Name and email are required.", "error");
      return;
    }
    const res = await RentMs.patch("/auth/me", {
      username: name,
      email,
      phone,
      address,
    });
    if (res.data || (res.message && !res.error)) {
      if (!DEV_MODE) {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.username = name;
        u.email = email;
        localStorage.setItem("user", JSON.stringify(u));
      }
      RentMs.setText("profileNameDisplay", name);
      RentMs.setText("profileEmailDisplay", email);
      RentMs.setText("sidebarName", name);
      RentMs.setText("sidebarAvatar", name.charAt(0).toUpperCase());
      RentMs.showMsg("profileMsg", "Profile updated successfully!");
    } else {
      RentMs.showMsg("profileMsg", res.message || "Failed to save.", "error");
    }
  };

  window.changePassword = async function () {
    const current = document.getElementById("currentPw")?.value;
    const newPw = document.getElementById("newPw")?.value;
    const confirm = document.getElementById("confirmPw")?.value;
    if (!current || !newPw) {
      RentMs.showMsg("pwMsg", "All fields are required.", "error");
      return;
    }
    if (newPw !== confirm) {
      RentMs.showMsg("pwMsg", "Passwords do not match.", "error");
      return;
    }
    if (newPw.length < 6) {
      RentMs.showMsg("pwMsg", "Minimum 6 characters.", "error");
      return;
    }
    const res = await RentMs.post("/auth/change-password", {
      current_password: current,
      new_password: newPw,
    });
    if (res.message && !res.error) {
      ["currentPw", "newPw", "confirmPw"].forEach((id) =>
        RentMs.setValue(id, ""),
      );
      RentMs.showMsg("pwMsg", "Password changed successfully!");
    } else {
      RentMs.showMsg("pwMsg", res.message || "Failed.", "error");
    }
  };

  window.uploadAvatar = function (input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const avEl = document.getElementById("avatarEl");
      if (avEl) {
        avEl.style.backgroundImage = `url(${e.target.result})`;
        avEl.style.backgroundSize = "cover";
        avEl.style.backgroundPosition = "center";
        avEl.textContent = "";
      }
    };
    reader.readAsDataURL(file);
  };

  return { init };
})();

/* ============================================================
   PAGE: SETTINGS
   ============================================================ */
const LandlordSettings = (() => {
  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();
    await load();
  }

  async function load() {
    const data = await RentMs.get("/landlords/settings");
    const s = data.data || {};
    RentMs.setValue("bizName", s.business_name || "");
    RentMs.setValue("bizEmail", s.business_email || "");
    RentMs.setValue("bizPhone", s.phone || "");
    RentMs.setValue("bizTimezone", s.timezone || "Africa/Accra");
    RentMs.setValue("bizCurrency", s.currency || "GHS");
    RentMs.setValue("bizDateFormat", s.date_format || "DD/MM/YYYY");
    const n = s.notifications || {};
    chk(
      "emailPayment",
      n.payment_received !== undefined ? n.payment_received : true,
    );
    chk("emailMaint", n.maintenance !== undefined ? n.maintenance : true);
    chk("emailLease", n.lease_expiring !== undefined ? n.lease_expiring : true);
    chk(
      "emailOverdue",
      n.overdue_payment !== undefined ? n.overdue_payment : true,
    );
    chk("emailNewTenant", n.new_tenant !== undefined ? n.new_tenant : false);
    chk(
      "emailSummary",
      n.monthly_summary !== undefined ? n.monthly_summary : true,
    );
  }

  function chk(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  window.saveGeneral = async function () {
    const res = await RentMs.put("/landlords/settings", {
      business_name: document.getElementById("bizName")?.value.trim(),
      business_email: document.getElementById("bizEmail")?.value.trim(),
      phone: document.getElementById("bizPhone")?.value.trim(),
      timezone: document.getElementById("bizTimezone")?.value,
      currency: document.getElementById("bizCurrency")?.value,
      date_format: document.getElementById("bizDateFormat")?.value,
    });
    RentMs.showMsg(
      "generalMsg",
      res.message && !res.error ? "Settings saved!" : res.message || "Failed.",
      res.error ? "error" : "success",
    );
  };

  window.saveNotifSettings = async function () {
    const res = await RentMs.put("/landlords/settings", {
      notifications: {
        payment_received: document.getElementById("emailPayment")?.checked,
        maintenance: document.getElementById("emailMaint")?.checked,
        lease_expiring: document.getElementById("emailLease")?.checked,
        overdue_payment: document.getElementById("emailOverdue")?.checked,
        new_tenant: document.getElementById("emailNewTenant")?.checked,
        monthly_summary: document.getElementById("emailSummary")?.checked,
      },
    });
    RentMs.showMsg(
      "notifMsg",
      res.message && !res.error
        ? "Preferences saved!"
        : res.message || "Failed.",
      res.error ? "error" : "success",
    );
  };

  window.signOutAll = async function () {
    const res = await RentMs.post("/auth/logout-all", {});
    RentMs.showMsg(
      "secMsg",
      res.message || "Signed out of all sessions.",
      res.error ? "error" : "success",
    );
  };

  window.deleteAccount = async function () {
    const confirm = document.getElementById("deleteConfirmInput")?.value;
    const pw = document.getElementById("deleteConfirmPw")?.value;
    const errEl = document.getElementById("deleteErr");
    if (confirm !== "DELETE") {
      if (errEl) {
        errEl.textContent = "Type DELETE to confirm.";
        errEl.style.display = "block";
      }
      return;
    }
    if (!pw) {
      if (errEl) {
        errEl.textContent = "Password is required.";
        errEl.style.display = "block";
      }
      return;
    }
    const res = await RentMs.del(
      "/landlords/account?password=" + encodeURIComponent(pw),
    );
    if (res.message && !res.error) {
      localStorage.clear();
      location.href = "../index.html";
    } else {
      if (errEl) {
        errEl.textContent = res.message || "Failed.";
        errEl.style.display = "block";
      }
    }
  };

  return { init };
})();

/* ============================================================
   PAGE: INVITE CODES
   ============================================================ */
const InviteCodes = (() => {
  let all = [],
    filtered = [],
    activeFilter = "all",
    detailId = null;

  /* ── helpers ──────────────────────────────────────────────── */
  function genCode() {
    // Format: XX-XXXX  (plaza prefix + random alphanum)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand = (n) =>
      Array.from(
        { length: n },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");
    const plazaEl = document.getElementById("genPlaza");
    const prefix =
      plazaEl?.selectedOptions[0]?.text
        ?.split(" ")[0]
        ?.substring(0, 2)
        .toUpperCase() || "RM";
    return `${prefix}-${rand(4)}`;
  }

  function pillClass(status) {
    return (
      {
        active: "pill-active",
        used: "pill-used",
        expired: "pill-expired",
        revoked: "pill-revoked",
      }[status] || "pill-revoked"
    );
  }

  function pillLabel(status) {
    return (
      {
        active: "Active",
        used: "Claimed",
        expired: "Expired",
        revoked: "Revoked",
      }[status] || status
    );
  }

  function usageBar(used, max) {
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    return `<span style="font-size:.78rem;color:var(--text-muted)">${used}/${max}</span>
            <span class="usage-bar-wrap"><span class="usage-bar-fill" style="width:${pct}%"></span></span>`;
  }

  function fmt(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function copyToClipboard(text) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        RentMs.showMsg("genMsg", "Code copied to clipboard!", "success");
      })
      .catch(() => {
        prompt("Copy this code:", text);
      });
  }

  /* ── populate plaza dropdowns ─────────────────────────────── */
  function populatePlazaDropdowns() {
    const plazas = MOCK.plazas;
    ["plazaFilter", "genPlaza"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const hasAll = id === "plazaFilter";
      el.innerHTML =
        (hasAll
          ? '<option value="">All Plazas</option>'
          : '<option value="">— Select plaza —</option>') +
        plazas
          .map((p) => `<option value="${p.id}">${p.name}</option>`)
          .join("");
    });
  }

  /* ── when plaza selected in generate modal ───────────────── */
  window.InviteCodes_onPlazaChange = function () {
    InviteCodes.onPlazaChange();
  };

  /* ── render all codes ─────────────────────────────────────── */
  function render() {
    const plazaVal = document.getElementById("plazaFilter")?.value || "";
    filtered = all.filter((c) => {
      const matchFilter = activeFilter === "all" || c.status === activeFilter;
      const matchPlaza = !plazaVal || String(c.plaza_id) === plazaVal;
      return matchFilter && matchPlaza;
    });

    const el = document.getElementById("codeList");
    if (!el) return;

    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state" style="padding:60px 20px">
        <i class="bi bi-key"></i>
        <h6>No codes found</h6>
        <p>${activeFilter === "all" ? "Generate your first invite code using the button above." : "No " + activeFilter + " codes."}</p>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="d-flex flex-column gap-3">
      ${filtered
        .map(
          (c) => `
        <div class="code-card" onclick="InviteCodes.viewDetail(${c.id})" style="cursor:pointer">
          <div class="code-badge">${c.code}</div>
          <div class="code-meta">
            <div class="code-meta-title">${c.plaza_name} · Unit ${c.unit} &nbsp;<span class="status-pill ${pillClass(c.status)}">${pillLabel(c.status)}</span></div>
            <div class="code-meta-sub d-flex flex-wrap gap-3 mt-1">
              <span><i class="bi bi-cash-coin me-1"></i>GHS ${c.rent.toLocaleString()}/mo</span>
              <span><i class="bi bi-person-check me-1"></i>${usageBar(c.used, c.max_uses)} ${c.claimed_by ? "· " + c.claimed_by : ""}</span>
              <span><i class="bi bi-calendar-x me-1"></i>Expires ${fmt(c.expires)}</span>
            </div>
          </div>
          <div class="code-actions">
            <button class="btn btn-outline-secondary btn-sm" title="Copy code" onclick="event.stopPropagation();InviteCodes.copy('${c.code}')">
              <i class="bi bi-clipboard"></i>
            </button>
            ${
              c.status === "active"
                ? `<button class="btn btn-outline-danger btn-sm" title="Revoke" onclick="event.stopPropagation();InviteCodes.revoke(${c.id})">
              <i class="bi bi-slash-circle"></i>
            </button>`
                : ""
            }
          </div>
        </div>`,
        )
        .join("")}
    </div>`;
  }

  /* ── stats strip ─────────────────────────────────────────── */
  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("statTotal", all.length);
    set("statActive", all.filter((c) => c.status === "active").length);
    set("statUsed", all.filter((c) => c.status === "used").length);
    set(
      "statExpired",
      all.filter((c) => c.status === "expired" || c.status === "revoked")
        .length,
    );
  }

  /* ── filter tabs ─────────────────────────────────────────── */
  function setFilter(val, btn) {
    activeFilter = val;
    document
      .querySelectorAll(".filter-tab")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    render();
  }

  /* ── plaza change in modal → populate units ──────────────── */
  function onPlazaChange() {
    const plazaId = document.getElementById("genPlaza")?.value;
    const unitEl = document.getElementById("genUnit");
    if (!unitEl) return;
    if (!plazaId) {
      unitEl.innerHTML = '<option value="">— Select plaza first —</option>';
      return;
    }
    const units = MOCK.units[parseInt(plazaId)] || [];
    // Filter out units that already have active codes
    const takenUnits = all
      .filter((c) => String(c.plaza_id) === plazaId && c.status === "active")
      .map((c) => c.unit);
    unitEl.innerHTML =
      '<option value="">— Select unit —</option>' +
      units
        .map(
          (
            u,
          ) => `<option value="${u}" ${takenUnits.includes(u) ? 'disabled style="color:var(--text-muted)"' : ""}>
        Unit ${u}${takenUnits.includes(u) ? " (code active)" : ""}
      </option>`,
        )
        .join("");
  }

  /* ── preview code ─────────────────────────────────────────── */
  function previewCode() {
    const plaza =
      document.getElementById("genPlaza")?.selectedOptions[0]?.text || "";
    const unit = document.getElementById("genUnit")?.value;
    const rent = document.getElementById("genRent")?.value;
    const prev = document.getElementById("genPreview");
    const prevCode = document.getElementById("genPreviewCode");
    const prevSub = document.getElementById("genPreviewSub");
    if (!unit || !rent) {
      RentMs.showMsg(
        "genMsg",
        "Please select a plaza, unit, and enter rent first.",
        "error",
      );
      return;
    }
    const code = genCode();
    if (prevCode) prevCode.textContent = code;
    if (prevSub)
      prevSub.textContent = `${plaza} · Unit ${unit} · GHS ${Number(rent).toLocaleString()}/mo`;
    if (prev) prev.style.display = "";
    // Store generated code for use in generate()
    document.getElementById("genPlaza")._previewCode = code;
    RentMs.showMsg("genMsg", "", "");
  }

  /* ── generate code ───────────────────────────────────────── */
  async function generate() {
    const plazaEl = document.getElementById("genPlaza");
    const plazaId = parseInt(plazaEl?.value);
    const plazaName = plazaEl?.selectedOptions[0]?.text || "";
    const unit = document.getElementById("genUnit")?.value;
    const rent = parseFloat(document.getElementById("genRent")?.value);
    const maxUses = parseInt(document.getElementById("genMaxUses")?.value) || 1;
    const leaseStart = document.getElementById("genLeaseStart")?.value;
    const leaseEnd = document.getElementById("genLeaseEnd")?.value;
    const expires = document.getElementById("genExpiry")?.value;

    if (!plazaId) {
      RentMs.showMsg("genMsg", "Please select a plaza.", "error");
      return;
    }
    if (!unit) {
      RentMs.showMsg("genMsg", "Please select a unit.", "error");
      return;
    }
    if (!rent) {
      RentMs.showMsg("genMsg", "Please enter the monthly rent.", "error");
      return;
    }

    // Use preview code if already generated, else generate fresh
    const code = plazaEl._previewCode || genCode();
    plazaEl._previewCode = null;

    // Update preview
    const prevCode = document.getElementById("genPreviewCode");
    const prev = document.getElementById("genPreview");
    if (prevCode) prevCode.textContent = code;
    if (prev) prev.style.display = "";

    // Add to mock list
    const newCode = {
      id: all.length + 1,
      code,
      plaza_id: plazaId,
      plaza_name: plazaName,
      unit,
      rent,
      max_uses: maxUses,
      used: 0,
      claimed_by: null,
      lease_start: leaseStart || null,
      lease_end: leaseEnd || null,
      expires: expires || null,
      status: "active",
      created: new Date().toISOString(),
    };

    if (DEV_MODE) {
      all.unshift(newCode);
      MOCK.invite_codes.unshift(newCode);
    } else {
      const res = await RentMs.post("/landlords/invite-codes", {
        plaza_id: plazaId,
        unit_number: unit,
        rent_amount: rent,
        max_uses: maxUses,
        lease_start: leaseStart,
        lease_end: leaseEnd,
        expires_at: expires,
      });
      if (res.error) {
        RentMs.showMsg("genMsg", res.message || "Failed.", "error");
        return;
      }
    }

    renderStats();
    render();
    copyToClipboard(code);

    RentMs.showMsg(
      "genMsg",
      `✅ Code <strong>${code}</strong> generated and copied to clipboard!`,
      "success",
    );
    // Auto-close after 2s
    setTimeout(() => {
      bootstrap.Modal.getInstance(
        document.getElementById("generateModal"),
      )?.hide();
    }, 1800);
  }

  /* ── copy a code ────────────────────────────────────────── */
  function copy(code) {
    copyToClipboard(code);
    // Flash toast using a tiny temp element since RentMs.showMsg needs an el id
    const toast = document.createElement("div");
    toast.textContent = `✅ ${code} copied!`;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1e3a5f",
      color: "#60a5fa",
      padding: "10px 20px",
      borderRadius: "10px",
      fontWeight: "700",
      fontSize: ".85rem",
      zIndex: "9999",
      pointerEvents: "none",
      boxShadow: "0 4px 20px rgba(0,0,0,.4)",
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  /* ── revoke ─────────────────────────────────────────────── */
  function revoke(id) {
    if (
      !confirm(
        "Revoke this invite code? The tenant will no longer be able to use it to register.",
      )
    )
      return;
    const c = all.find((x) => x.id === id);
    if (!c) return;
    c.status = "revoked";
    renderStats();
    render();
    if (detailId === id) {
      bootstrap.Modal.getInstance(
        document.getElementById("detailModal"),
      )?.hide();
    }
  }

  /* ── view detail ────────────────────────────────────────── */
  function viewDetail(id) {
    const c = all.find((x) => x.id === id);
    if (!c) return;
    detailId = id;

    document.getElementById("detailTitle").textContent = `Code: ${c.code}`;

    const body = document.getElementById("detailBody");
    if (body)
      body.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-family:'Courier New',monospace;font-size:2rem;font-weight:900;letter-spacing:.25em;color:var(--primary);background:var(--primary-glow);padding:14px 24px;border-radius:12px;display:inline-block">${c.code}</div>
        <div style="margin-top:8px"><span class="status-pill ${pillClass(c.status)}">${pillLabel(c.status)}</span></div>
      </div>
      <div class="row g-3" style="font-size:.875rem">
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Plaza</div><strong>${c.plaza_name}</strong></div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Unit</div><strong>${c.unit}</strong></div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Monthly Rent</div><strong style="color:var(--primary)">GHS ${c.rent.toLocaleString()}</strong></div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Uses</div>${usageBar(c.used, c.max_uses)}</div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Lease Start</div>${fmt(c.lease_start)}</div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Lease End</div>${fmt(c.lease_end)}</div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Expires</div>${fmt(c.expires)}</div>
        <div class="col-6"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Claimed By</div>${c.claimed_by || "—"}</div>
        <div class="col-12"><div style="color:var(--text-muted);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Created</div>${fmt(c.created)}</div>
      </div>
      ${
        c.status === "active"
          ? `
        <div style="background:var(--primary-glow);border:1px solid rgba(37,99,235,.25);border-radius:10px;padding:14px;margin-top:16px;font-size:.82rem;color:var(--text-muted)">
          <strong style="color:var(--primary)"><i class="bi bi-share me-1"></i>Share this code:</strong><br>
          "Join my property on RentMS! Use invite code <strong style="font-family:monospace;font-size:.95rem;color:var(--primary)">${c.code}</strong> when you register at rentms.com/register — it will link you directly to your unit at ${c.plaza_name}."
        </div>`
          : ""
      }
    `;

    const revokeBtn = document.getElementById("detailRevokeBtn");
    const copyBtn = document.getElementById("detailCopyBtn");
    if (revokeBtn)
      revokeBtn.style.display = c.status === "active" ? "" : "none";
    if (copyBtn) copyBtn.onclick = () => copy(c.code);

    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("detailModal"),
    ).show();
  }

  function revokeFromModal() {
    if (detailId) revoke(detailId);
  }

  /* ── export CSV ──────────────────────────────────────────── */
  function exportCsv() {
    const rows = [
      [
        "Code",
        "Plaza",
        "Unit",
        "Rent (GHS)",
        "Status",
        "Uses",
        "Max Uses",
        "Claimed By",
        "Expires",
        "Created",
      ],
    ];
    filtered.forEach((c) =>
      rows.push([
        c.code,
        c.plaza_name,
        c.unit,
        c.rent,
        c.status,
        c.used,
        c.max_uses,
        c.claimed_by || "",
        c.expires || "",
        c.created,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "invite_codes.csv";
    a.click();
  }

  /* ── init ────────────────────────────────────────────────── */
  async function init() {
    RentMs.guardAuth();
    RentMs.initSidebar();

    if (DEV_MODE) {
      document.getElementById("devBanner").style.display = "";
      const u = RentMs.user();
      const av = document.getElementById("sidebarAvatar");
      const nm = document.getElementById("sidebarName");
      if (av) av.textContent = (u.username || "?")[0].toUpperCase();
      if (nm) nm.textContent = u.username || "Landlord";
    }

    // Load codes
    const res = await RentMs.get("/landlords/invite-codes");
    all = res.data || [];
    filtered = [...all];

    populatePlazaDropdowns();
    renderStats();
    render();

    // Set default expiry in generate modal (30 days from now)
    const expEl = document.getElementById("genExpiry");
    if (expEl) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      expEl.value = d.toISOString().split("T")[0];
    }
  }

  return {
    init,
    render,
    setFilter,
    onPlazaChange,
    previewCode,
    generate,
    copy,
    revoke,
    viewDetail,
    revokeFromModal,
    exportCsv,
  };
})();
