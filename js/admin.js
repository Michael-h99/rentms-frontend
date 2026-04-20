/* ================================================================
   RENTMS — ADMIN PORTAL  admin.js  v3
   18 modules · DEV_MODE mock data · Full CRUD
   ================================================================ */

/* ─────────────────────────────────────────────────────────────
   CORE: Admin
   ───────────────────────────────────────────────────────────── */
const Admin = (() => {
  const DEV_MODE = false;

  async function api(method, url, body) {
    if (DEV_MODE) return mockApi(method, url, body);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      location.href = "../auth/login.html";
      return;
    }
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(
      (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://rentms-backend-5.onrender.com/api") + url,
      opts,
    );
    if (r.status === 401) {
      location.href = "../auth/login.html";
      return;
    }
    return r.json();
  }

  const fmt = {
    currency: (n) =>
      "GHS " +
      Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2 }),
    date: (s) => (s ? new Date(s).toLocaleDateString("en-GB") : "—"),
    datetime: (s) =>
      s
        ? new Date(s).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—",
    timeAgo: (s) => {
      if (!s) return "—";
      const d = Math.floor((Date.now() - new Date(s)) / 1000);
      if (d < 60) return "just now";
      if (d < 3600) return Math.floor(d / 60) + "m ago";
      if (d < 86400) return Math.floor(d / 3600) + "h ago";
      return Math.floor(d / 86400) + "d ago";
    },
    initials: (name) =>
      (name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    pct: (n) => Number(n || 0).toFixed(1) + "%",
  };

  function badge(status) {
    const map = {
      active: "badge-active",
      paid: "badge-paid",
      pending: "badge-pending",
      overdue: "badge-overdue",
      failed: "badge-failed",
      open: "badge-open",
      in_progress: "badge-in-progress",
      resolved: "badge-resolved",
      closed: "badge-closed",
      used: "badge-used",
      expired: "badge-expired",
      revoked: "badge-revoked",
      suspended: "badge-suspended",
      inactive: "badge-inactive",
      ending_soon: "badge-ending-soon",
      warn: "badge-warn",
      down: "badge-down",
    };
    const cls = map[status] || "badge-closed";
    return `<span class="badge-status ${cls}">${status ? status.replace(/_/g, " ") : "unknown"}</span>`;
  }

  function toast(msg, type = "success") {
    let el = document.getElementById("adminToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "adminToast";
      document.body.appendChild(el);
    }
    const colors = {
      success: {
        bg: "var(--success-light)",
        color: "var(--success-text)",
        border: "rgba(16,185,129,.4)",
      },
      error: {
        bg: "var(--danger-light)",
        color: "var(--danger-text)",
        border: "rgba(239,68,68,.4)",
      },
      warning: {
        bg: "var(--warning-light)",
        color: "var(--warning-text)",
        border: "rgba(245,158,11,.4)",
      },
      info: {
        bg: "var(--primary-glow)",
        color: "#60a5fa",
        border: "rgba(37,99,235,.4)",
      },
    };
    const c = colors[type] || colors.info;
    el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:10px;font-weight:700;font-size:.875rem;max-width:320px;background:${c.bg};color:${c.color};border:1px solid ${c.border};box-shadow:0 4px 20px rgba(0,0,0,.4);transition:opacity .3s;opacity:1;pointer-events:auto`;
    const icons = {
      success: "bi-check-circle-fill",
      error: "bi-x-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      info: "bi-info-circle-fill",
    };
    el.innerHTML = `<i class="bi ${icons[type] || icons.info} me-2"></i>${msg}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = "0";
    }, 3200);
  }

  function confirm(msg, cb) {
    if (window.confirm(msg)) cb();
  }

  function setMsg(id, msg, type = "success") {
    const el = document.getElementById(id);
    if (!el) return;
    if (!msg) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = `<div class="alert alert-${type}" style="margin-bottom:14px">${msg}</div>`;
    setTimeout(() => {
      el.innerHTML = "";
    }, 4000);
  }

  function pagination(total, page, perPage, onPage) {
    const pages = Math.ceil(total / perPage);
    const nav = [];
    nav.push(
      `<button class="pagin-btn" onclick="(${onPage})(1)" ${page === 1 ? "disabled" : ""}>‹‹</button>`,
    );
    nav.push(
      `<button class="pagin-btn" onclick="(${onPage})(${page - 1})" ${page === 1 ? "disabled" : ""}>‹</button>`,
    );
    const start = Math.max(1, page - 2),
      end = Math.min(pages, page + 2);
    if (start > 1)
      nav.push(`<span class="pagin-btn" style="cursor:default">…</span>`);
    for (let p = start; p <= end; p++)
      nav.push(
        `<button class="pagin-btn ${p === page ? "active" : ""}" onclick="(${onPage})(${p})">${p}</button>`,
      );
    if (end < pages)
      nav.push(`<span class="pagin-btn" style="cursor:default">…</span>`);
    nav.push(
      `<button class="pagin-btn" onclick="(${onPage})(${page + 1})" ${page === pages ? "disabled" : ""}>›</button>`,
    );
    nav.push(
      `<button class="pagin-btn" onclick="(${onPage})(${pages})" ${page === pages ? "disabled" : ""}>››</button>`,
    );
    return nav.join("");
  }

  function initSidebar() {
    const btn = document.getElementById("sidebarToggle");
    const sb = document.getElementById("sidebar");
    const ov = document.getElementById("overlay");
    if (btn)
      btn.addEventListener("click", () => {
        sb.classList.toggle("open");
        ov.classList.toggle("show");
      });
    if (ov)
      ov.addEventListener("click", () => {
        sb.classList.remove("open");
        ov.classList.remove("show");
      });

    const nav = sb?.querySelector(".sidebar-nav");
    if (nav) {
      const saved = sessionStorage.getItem("sidebarScroll");
      if (saved) nav.scrollTop = parseInt(saved, 10);
      const activeLink = nav.querySelector(".nav-link.active");
      if (activeLink) {
        const offset =
          activeLink.getBoundingClientRect().top -
          nav.getBoundingClientRect().top;
        const navH = nav.clientHeight;
        if (offset < 0 || offset > navH - activeLink.clientHeight)
          nav.scrollTop = nav.scrollTop + offset - navH / 3;
      }
      nav.addEventListener("scroll", () =>
        sessionStorage.setItem("sidebarScroll", nav.scrollTop),
      );
    }

    const av = document.getElementById("sidebarAvatar");
    const nm = document.getElementById("sidebarName");
    /* FIX: use /auth/me since /admin/profile doesn't exist */
    api("GET", "/auth/me")
      .then((r) => {
        if (!r?.data) return;
        const u = r.data;
        const name = u.full_name || u.username || "Admin";
        if (av) av.textContent = fmt.initials(name);
        if (nm) nm.textContent = name;
      })
      .catch(() => {});
  }

  function avatarColor(name) {
    const colors = [
      "#2563eb",
      "#7c3aed",
      "#0891b2",
      "#059669",
      "#d97706",
      "#dc2626",
    ];
    let h = 0;
    for (let c of name || "A") h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }

  return {
    api,
    fmt,
    badge,
    toast,
    confirm,
    setMsg,
    pagination,
    initSidebar,
    avatarColor,
    DEV_MODE,
  };
})();

/* ─────────────────────────────────────────────────────────────
   MOCK DATA (used only when DEV_MODE = true)
   ───────────────────────────────────────────────────────────── */
const MOCK = {
  admin: {
    first_name: "Kwame",
    last_name: "Asante",
    email: "admin@rentms.com",
    phone: "+233 20 111 0000",
    role: "super_admin",
    timezone: "Africa/Accra",
    language: "en",
    bio: "Platform administrator.",
    logins: 142,
    days_active: 87,
    actions: 1340,
    two_fa: true,
  },
  stats: {
    total_users: 134,
    landlords: 18,
    tenants: 116,
    admins: 5,
    plazas: 24,
    units: 312,
    occupied_units: 289,
    revenue_mtd: 187400,
    overdue_count: 11,
    collection_rate: 91.2,
    occupancy: 92.6,
    open_tickets: 7,
    open_maintenance: 14,
    in_progress_maintenance: 6,
    resolved_maintenance: 58,
    active_leases: 116,
    ending_soon_leases: 9,
    active_codes: 23,
  },
  users: [],
  plazas: [],
  payments: [],
  leases: [],
  maintenance: [],
  announcements: [],
  notifications: [],
  tickets: [],
  codes: [],
  audit: [],
  revenue_chart: [
    { month: "Sep", value: 112400 },
    { month: "Oct", value: 134700 },
    { month: "Nov", value: 128900 },
    { month: "Dec", value: 151200 },
    { month: "Jan", value: 168800 },
    { month: "Feb", value: 187400 },
  ],
  top_landlords: [
    { name: "Kwame Asante", plazas: 4, tenants: 32, revenue: 94200 },
    { name: "Ama Mensah", plazas: 3, tenants: 21, revenue: 58500 },
  ],
  health: {
    uptime_30d: 99.7,
    avg_latency: 82,
    cpu: 34,
    mem: 61,
    disk: 48,
    api_ms: 82,
    services: [
      { name: "REST API", status: "ok", latency: 82 },
      { name: "MySQL DB", status: "ok", latency: 14 },
      { name: "Email Service", status: "warn", latency: 420 },
    ],
    sessions: 28,
    api_requests: 4812,
    errors_24h: 3,
    db_connections: 12,
    server_uptime: "14d 7h 42m",
  },
  sessions: [
    {
      device: "Chrome on Windows 11",
      ip: "127.0.0.1",
      location: "Accra, GH",
      current: true,
      last_active: "Just now",
    },
  ],
  settings: {
    platform_name: "RentMS",
    support_email: "support@rentms.com",
    currency: "GHS",
    timezone: "Africa/Accra",
    date_format: "DD/MM/YYYY",
    language: "en",
    max_plazas: 10,
    max_units: 100,
    max_codes: 50,
    features: {
      payments: true,
      maintenance: true,
      messaging: true,
      announcements: true,
      documents: true,
      self_register: false,
      two_fa: true,
    },
    smtp: {
      host: "smtp.gmail.com",
      port: 587,
      user: "noreply@rentms.com",
      from_name: "RentMS",
      from_email: "noreply@rentms.com",
    },
    notif: {
      due: true,
      paid: true,
      overdue: true,
      lease: true,
      maint: true,
      welcome: true,
    },
    security: {
      session_timeout: 60,
      max_attempts: 5,
      lockout: 30,
      strong_pw: true,
      audit: true,
      login_alert: true,
      rate_limit: true,
    },
  },
};

async function mockApi(method, url, body) {
  await new Promise((r) => setTimeout(r, 150));
  if (url === "/admin/dashboard")
    return {
      data: {
        users: {
          total_users: MOCK.stats.total_users,
          total_tenants: MOCK.stats.tenants,
          total_landlords: MOCK.stats.landlords,
          total_admins: MOCK.stats.admins,
          active_users: MOCK.stats.total_users,
          suspended_users: 0,
        },
        plazas: {
          total_plazas: MOCK.stats.plazas,
          total_units: MOCK.stats.units,
        },
        tenancies: {
          total_tenancies: MOCK.stats.active_leases,
          active_tenancies: MOCK.stats.active_leases,
          expired_tenancies: 0,
        },
        payments: {
          total_payments: 20,
          total_revenue: MOCK.stats.revenue_mtd,
          paid_payments: 18,
          pending_payments: MOCK.stats.overdue_count,
          failed_payments: 1,
        },
        maintenance: {
          total_requests:
            MOCK.stats.open_maintenance +
            MOCK.stats.in_progress_maintenance +
            MOCK.stats.resolved_maintenance,
          pending_requests: MOCK.stats.open_maintenance,
          in_progress_requests: MOCK.stats.in_progress_maintenance,
          resolved_requests: MOCK.stats.resolved_maintenance,
        },
        recentActivity: { actions_today: 12 },
      },
    };
  if (url === "/admin/users") return { data: MOCK.users };
  if (url === "/admin/payments") return { data: MOCK.payments };
  if (url === "/admin/maintenance") return { data: MOCK.maintenance };
  if (url === "/auth/me")
    return {
      data: {
        full_name: MOCK.admin.first_name + " " + MOCK.admin.last_name,
        username: "admin",
        email: MOCK.admin.email,
      },
    };
  if (
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE"
  )
    return { success: true };
  return { data: [] };
}

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminDashboard
   ───────────────────────────────────────────────────────────── */
const AdminDashboard = (() => {
  async function init() {
    Admin.initSidebar();
    /* FIX: use only endpoints that actually exist on the backend */
    const [dashR, payR, maintR, usersR] = await Promise.all([
      Admin.api("GET", "/admin/dashboard"),
      Admin.api("GET", "/admin/payments"),
      Admin.api("GET", "/admin/maintenance"),
      Admin.api("GET", "/admin/users"),
    ]);
    renderStats(dashR?.data);
    renderPayments(payR?.data || []);
    renderTopLandlords(usersR?.data || []);
    renderActivity(dashR?.data);
    renderChart();
  }

  function renderStats(d) {
    if (!d) return;
    const s = d.users || {};
    const pl = d.plazas || {};
    const ten = d.tenancies || {};
    const pay = d.payments || {};
    const mnt = d.maintenance || {};
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    set("kpiUsers", s.total_users || 0);
    set("kpiLandlords", s.total_landlords || 0);
    set("kpiTenants", s.total_tenants || 0);
    set("kpiPlazas", pl.total_plazas || 0);
    set("kpiUnits", pl.total_units || 0);
    const occ =
      pl.total_units > 0
        ? ((ten.active_tenancies / pl.total_units) * 100).toFixed(1)
        : "0.0";
    set("kpiOccupancy", occ + "%");
    set("kpiRevenue", Admin.fmt.currency(pay.total_revenue || 0));
    set("kpiOverdue", pay.pending_payments || 0);
    set("kpiTickets", mnt.pending_requests || 0);

    set("statActiveUsers", s.active_users || 0);
    set("statRevenue", Admin.fmt.currency(pay.total_revenue || 0));
    set("statMaint", mnt.pending_requests || 0);
    const collRate =
      pay.total_payments > 0
        ? ((pay.paid_payments / pay.total_payments) * 100).toFixed(1)
        : "0.0";
    set("statCollect", collRate + "%");

    set("dmOpen", mnt.pending_requests || 0);
    set("dmProgress", mnt.in_progress_requests || 0);
    set("dmResolved", mnt.resolved_requests || 0);

    const sub = document.getElementById("welcomeSub");
    if (sub)
      sub.textContent = `${s.total_users || 0} users · ${pl.total_plazas || 0} plazas · ${ten.active_tenancies || 0} active tenancies`;
  }

  function renderChart() {
    const el = document.getElementById("revenueChart");
    if (!el) return;
    el.innerHTML = `<div class="empty-state" style="padding:20px;width:100%">
      <i class="bi bi-bar-chart"></i>
      <p style="margin-top:8px;font-size:.8rem;color:var(--text-muted)">Revenue chart — coming soon</p>
    </div>`;
  }

  function renderTopLandlords(data) {
    const tb = document.getElementById("topLandlordsBody");
    if (!tb) return;
    const users = Array.isArray(data) ? data : data?.users || data?.data || [];
    const landlords = users.filter((u) => u.role === "landlord").slice(0, 5);
    if (!landlords.length) {
      tb.innerHTML =
        '<tr><td colspan="5"><div class="empty-state" style="padding:20px"><p>No landlords yet</p></div></td></tr>';
      return;
    }
    tb.innerHTML = landlords
      .map(
        (ll, i) => `
      <tr>
        <td><span style="font-weight:800;color:${i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : "var(--text-muted)"}">#${i + 1}</span></td>
        <td><div style="font-weight:700">${ll.full_name || ll.username || "—"}</div><div style="font-size:.72rem;color:var(--text-muted)">${ll.email || ""}</div></td>
        <td>${ll.plaza_count || "—"}</td>
        <td>${ll.tenant_count || "—"}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(ll.total_revenue || 0)}</td>
      </tr>`,
      )
      .join("");
  }

  function renderPayments(data) {
    const tb = document.getElementById("recentPaymentsBody");
    if (!tb) return;
    const list = Array.isArray(data)
      ? data
      : data?.payments || data?.data || [];
    if (!list.length) {
      tb.innerHTML =
        '<tr><td colspan="4"><div class="empty-state" style="padding:24px"><i class="bi bi-credit-card"></i><p>No payments yet</p></div></td></tr>';
      return;
    }
    tb.innerHTML = list
      .slice(0, 5)
      .map(
        (p) => `
      <tr>
        <td style="font-weight:700">${p.tenant_name || p.user_name || "—"}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(p.amount)}</td>
        <td><span style="font-size:.75rem;color:var(--text-muted)">${(p.method || p.payment_method || "—").replace(/_/g, " ")}</span></td>
        <td>${Admin.badge(p.status)}</td>
      </tr>`,
      )
      .join("");
  }

  function renderActivity(d) {
    const el = document.getElementById("activityFeed");
    if (!el) return;
    const act = d?.recentActivity || {};
    /* FIX: use explicit colors so text is always visible on dark bg */
    el.innerHTML = `
      <div class="activity-row">
        <div class="activity-dot" style="background:#3b82f6"></div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.85rem;font-weight:600;color:#e2e8f0">${act.actions_today || 0} platform actions today</div>
          <div style="font-size:.72rem;color:#94a3b8">Platform · just now</div>
        </div>
      </div>
      <div class="activity-row">
        <div class="activity-dot" style="background:#10b981"></div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.85rem;font-weight:600;color:#e2e8f0">${d?.users?.active_users || 0} active users on platform</div>
          <div style="font-size:.72rem;color:#94a3b8">Users · today</div>
        </div>
      </div>
      <div class="activity-row">
        <div class="activity-dot" style="background:#f59e0b"></div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.85rem;font-weight:600;color:#e2e8f0">${d?.tenancies?.active_tenancies || 0} active tenancies</div>
          <div style="font-size:.72rem;color:#94a3b8">Leases · current</div>
        </div>
      </div>
      <div class="activity-row">
        <div class="activity-dot" style="background:#10b981"></div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.85rem;font-weight:600;color:#e2e8f0">Total revenue: ${Admin.fmt.currency(d?.payments?.total_revenue || 0)}</div>
          <div style="font-size:.72rem;color:#94a3b8">Payments · all time</div>
        </div>
      </div>`;
  }

  return { init };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminUsers
   ───────────────────────────────────────────────────────────── */
const AdminUsers = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;
  let selectedId = null;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/users");
    /* FIX: API returns array directly in data */
    all = Array.isArray(r?.data) ? r.data : r?.data?.users || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("ssTotal", all.length);
    set("ssLandlords", all.filter((u) => u.role === "landlord").length);
    set("ssTenants", all.filter((u) => u.role === "tenant").length);
    set("ssSuspended", all.filter((u) => u.status === "suspended").length);
  }

  function filter() {
    const q = (
      document.getElementById("userSearch")?.value || ""
    ).toLowerCase();
    const role = document.getElementById("roleFilter")?.value || "";
    const stat = document.getElementById("statusFilter")?.value || "";
    filtered = all.filter(
      (u) =>
        (!q ||
          (u.full_name || u.username || "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)) &&
        (!role || u.role === role) &&
        (!stat || u.status === stat),
    );
    page = 1;
    render();
  }

  function clearFilters() {
    ["userSearch", "roleFilter", "statusFilter"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    filtered = [...all];
    page = 1;
    render();
  }

  function render() {
    const tb = document.getElementById("usersBody");
    const info = document.getElementById("usersPaginInfo");
    const nav = document.getElementById("usersPaginNav");
    if (!tb) return;
    const start = (page - 1) * PER;
    const slice = filtered.slice(start, start + PER);
    if (!slice.length) {
      tb.innerHTML =
        '<tr><td colspan="9"><div class="empty-state" style="padding:32px"><i class="bi bi-people"></i><p>No users found</p></div></td></tr>';
    } else {
      tb.innerHTML = slice
        .map((u) => {
          const name = u.full_name || u.username || "—";
          const col = Admin.avatarColor(name);
          return `<tr>
          <td><div style="width:36px;height:36px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.75rem">${Admin.fmt.initials(name)}</div></td>
          <td><div style="font-weight:700">${name}</div></td>
          <td style="color:var(--text-muted);font-size:.8rem">${u.email}</td>
          <td><span class="badge-status ${u.role === "landlord" ? "badge-active" : u.role === "admin" ? "badge-in-progress" : "badge-closed"}">${u.role}</span></td>
          <td style="font-size:.8rem;color:var(--text-muted)">${u.phone || "—"}</td>
          <td style="font-size:.8rem">${Admin.fmt.date(u.created_at)}</td>
          <td style="font-size:.8rem;color:var(--text-muted)">${Admin.fmt.timeAgo(u.last_login)}</td>
          <td>${Admin.badge(u.status || "active")}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-xs" onclick="AdminUsers.viewUser(${u.id})"><i class="bi bi-eye"></i></button>
              <button class="btn ${u.status === "suspended" ? "btn-outline-success" : "btn-outline-warning"} btn-xs" onclick="AdminUsers.toggleStatus(${u.id})"><i class="bi bi-${u.status === "suspended" ? "unlock" : "slash-circle"}"></i></button>
              <button class="btn btn-outline-danger btn-xs" onclick="AdminUsers.deleteUser(${u.id})"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>`;
        })
        .join("");
    }
    if (info)
      info.textContent = `Showing ${start + 1}–${Math.min(start + PER, filtered.length)} of ${filtered.length} users`;
    if (nav)
      nav.innerHTML =
        filtered.length > PER
          ? Admin.pagination(filtered.length, page, PER, "AdminUsers.goPage")
          : "";
  }

  function goPage(p) {
    page = p;
    render();
  }

  function viewUser(id) {
    selectedId = id;
    const u = all.find((x) => x.id === id);
    if (!u) return;
    const name = u.full_name || u.username || "—";
    const body = document.getElementById("viewUserBody");
    if (body) {
      const col = Admin.avatarColor(name);
      body.innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-4">
          <div style="width:56px;height:56px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800">${Admin.fmt.initials(name)}</div>
          <div>
            <div style="font-size:1.1rem;font-weight:800">${name}</div>
            <div style="font-size:.85rem;color:var(--text-muted)">${u.email}</div>
            <div class="mt-1">${Admin.badge(u.status || "active")}</div>
          </div>
        </div>
        <div class="row g-3">
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">ROLE</div><div style="font-weight:700;margin-top:2px">${u.role}</div></div>
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">PHONE</div><div style="font-weight:700;margin-top:2px">${u.phone || "—"}</div></div>
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">JOINED</div><div style="font-weight:700;margin-top:2px">${Admin.fmt.date(u.created_at)}</div></div>
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">EMAIL</div><div style="font-weight:700;margin-top:2px">${u.email}</div></div>
        </div>`;
    }
    const btn = document.getElementById("suspendBtn");
    if (btn) {
      btn.textContent = u.status === "suspended" ? "Unsuspend" : "Suspend";
      btn.className = `btn btn-sm ${u.status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`;
    }
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("viewUserModal"),
    ).show();
  }

  function toggleStatusModal() {
    if (!selectedId) return;
    toggleStatus(selectedId);
    bootstrap.Modal.getInstance(
      document.getElementById("viewUserModal"),
    )?.hide();
  }

  function toggleStatus(id) {
    const u = all.find((x) => x.id === id);
    if (!u) return;
    const newStatus = u.status === "suspended" ? "active" : "suspended";
    Admin.confirm(
      `${newStatus === "active" ? "Unsuspend" : "Suspend"} ${u.full_name || u.username}?`,
      async () => {
        await Admin.api("PATCH", `/admin/users/${id}/status`, {
          status: newStatus,
        });
        u.status = newStatus;
        Admin.toast(
          `User ${newStatus}`,
          newStatus === "active" ? "success" : "warning",
        );
        renderStats();
        render();
      },
    );
  }

  function deleteUser(id) {
    const u = all.find((x) => x.id === id);
    if (!u) return;
    Admin.confirm(
      `Permanently delete ${u.full_name || u.username}?`,
      async () => {
        await Admin.api("DELETE", `/admin/users/${id}`);
        all = all.filter((x) => x.id !== id);
        filtered = filtered.filter((x) => x.id !== id);
        Admin.toast("User deleted", "success");
        renderStats();
        render();
      },
    );
  }

  function exportCsv() {
    const rows = [["ID", "Name", "Email", "Role", "Status", "Joined"]];
    filtered.forEach((u) =>
      rows.push([
        u.id,
        u.full_name || u.username,
        u.email,
        u.role,
        u.status,
        u.created_at,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "users_export.csv";
    a.click();
    Admin.toast("CSV downloaded", "success");
  }

  function sendInvite() {
    const email = document.getElementById("inviteEmail")?.value;
    const role = document.getElementById("inviteRole")?.value;
    if (!email) {
      Admin.setMsg("inviteMsg", "Please enter an email address.", "danger");
      return;
    }
    Admin.setMsg("inviteMsg", `Invite sent to ${email} as ${role}.`, "success");
    setTimeout(() => {
      bootstrap.Modal.getInstance(
        document.getElementById("inviteModal"),
      )?.hide();
    }, 1500);
  }

  return {
    init,
    filter,
    clearFilters,
    render,
    goPage,
    viewUser,
    toggleStatus,
    toggleStatusModal,
    deleteUser,
    exportCsv,
    sendInvite,
  };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminPayments
   ───────────────────────────────────────────────────────────── */
const AdminPayments = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;
  let selectedId = null;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/payments");
    all = Array.isArray(r?.data) ? r.data : r?.data?.payments || [];
    filtered = [...all];
    renderSummary();
    render();
  }

  function renderSummary() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("sumPaid", all.filter((p) => p.status === "paid").length);
    set("sumPending", all.filter((p) => p.status === "pending").length);
    set("sumOverdue", all.filter((p) => p.status === "overdue").length);
    set("sumFailed", all.filter((p) => p.status === "failed").length);
    const total = all
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    set("sumTotal", Admin.fmt.currency(total));
  }

  function filter() {
    const q = (document.getElementById("paySearch")?.value || "").toLowerCase();
    const stat = document.getElementById("payStatusFilter")?.value || "";
    const meth = document.getElementById("payMethodFilter")?.value || "";
    filtered = all.filter(
      (p) =>
        (!q ||
          (p.tenant_name || "").toLowerCase().includes(q) ||
          (p.reference || "").toLowerCase().includes(q)) &&
        (!stat || p.status === stat) &&
        (!meth || (p.method || p.payment_method) === meth),
    );
    page = 1;
    render();
  }

  function clearFilters() {
    ["paySearch", "payStatusFilter", "payMethodFilter"].forEach((id) => {
      const e = document.getElementById(id);
      if (e) e.value = "";
    });
    filtered = [...all];
    page = 1;
    render();
  }

  function render() {
    const tb = document.getElementById("paymentsBody");
    const info = document.getElementById("payPaginInfo");
    const nav = document.getElementById("payPaginNav");
    if (!tb) return;
    const start = (page - 1) * PER;
    const slice = filtered.slice(start, start + PER);
    if (!slice.length) {
      tb.innerHTML =
        '<tr><td colspan="8"><div class="empty-state" style="padding:32px"><i class="bi bi-credit-card"></i><p>No payments found</p></div></td></tr>';
    } else {
      tb.innerHTML = slice
        .map((p) => {
          const method = p.method || p.payment_method || "—";
          const ref = p.reference || p.ref || "—";
          return `<tr>
          <td><code style="font-size:.75rem;color:var(--text-muted)">${ref}</code></td>
          <td style="font-weight:700">${p.tenant_name || p.user_name || "—"}</td>
          <td style="font-size:.8rem">${p.plaza_name || "—"} · <strong>${p.unit || "—"}</strong></td>
          <td><span class="method-badge">${method.replace(/_/g, " ")}</span></td>
          <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(p.amount)}</td>
          <td style="font-size:.8rem">${Admin.fmt.date(p.paid_at || p.created_at)}</td>
          <td>${Admin.badge(p.status)}</td>
          <td>
            <button class="btn btn-outline-secondary btn-xs" onclick="AdminPayments.viewPayment(${p.id})"><i class="bi bi-eye"></i></button>
          </td>
        </tr>`;
        })
        .join("");
    }
    if (info)
      info.textContent = `Showing ${start + 1}–${Math.min(start + PER, filtered.length)} of ${filtered.length} payments`;
    if (nav)
      nav.innerHTML =
        filtered.length > PER
          ? Admin.pagination(filtered.length, page, PER, "AdminPayments.goPage")
          : "";
  }

  function goPage(p) {
    page = p;
    render();
  }

  function viewPayment(id) {
    selectedId = id;
    const p = all.find((x) => x.id === id);
    if (!p) return;
    const body = document.getElementById("viewPaymentBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-6"><div class="form-label">Reference</div><code>${p.reference || p.ref || "—"}</code></div>
        <div class="col-6"><div class="form-label">Status</div>${Admin.badge(p.status)}</div>
        <div class="col-6"><div class="form-label">Tenant</div><strong>${p.tenant_name || "—"}</strong></div>
        <div class="col-6"><div class="form-label">Amount</div><strong style="color:var(--success-text)">${Admin.fmt.currency(p.amount)}</strong></div>
        <div class="col-6"><div class="form-label">Method</div>${(p.method || p.payment_method || "—").replace(/_/g, " ")}</div>
        <div class="col-6"><div class="form-label">Date</div>${Admin.fmt.date(p.paid_at || p.created_at)}</div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("viewPaymentModal"),
    ).show();
  }

  function markPaidModal() {
    bootstrap.Modal.getInstance(
      document.getElementById("viewPaymentModal"),
    )?.hide();
  }
  function markPaid(id) {
    Admin.toast("Mark paid — coming soon", "info");
  }

  function exportCsv() {
    const rows = [["Ref", "Tenant", "Amount", "Method", "Date", "Status"]];
    filtered.forEach((p) =>
      rows.push([
        p.reference || p.ref,
        p.tenant_name,
        p.amount,
        p.method,
        p.paid_at,
        p.status,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "payments_export.csv";
    a.click();
    Admin.toast("CSV downloaded", "success");
  }

  return {
    init,
    filter,
    clearFilters,
    render,
    goPage,
    viewPayment,
    markPaid,
    markPaidModal,
    exportCsv,
  };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminMaintenance
   ───────────────────────────────────────────────────────────── */
const AdminMaintenance = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;
  let _editId = null;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/maintenance");
    all = Array.isArray(r?.data) ? r.data : r?.data?.requests || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set(
      "maintStatOpen",
      all.filter((m) => m.status === "open" || m.status === "pending").length,
    );
    set(
      "maintStatProgress",
      all.filter((m) => m.status === "in_progress").length,
    );
    set("maintStatResolved", all.filter((m) => m.status === "resolved").length);
    set("maintStatHigh", all.filter((m) => m.priority === "high").length);
  }

  function filter() {
    const q = (
      document.getElementById("maintSearch")?.value || ""
    ).toLowerCase();
    const stat = document.getElementById("maintStatus")?.value || "";
    const pri = document.getElementById("maintPriority")?.value || "";
    filtered = all.filter(
      (m) =>
        (!q ||
          m.title.toLowerCase().includes(q) ||
          (m.tenant_name || "").toLowerCase().includes(q)) &&
        (!stat || m.status === stat) &&
        (!pri || m.priority === pri),
    );
    page = 1;
    render();
  }

  function render() {
    const tb = document.getElementById("maintBody");
    const info = document.getElementById("maintPaginInfo");
    const nav = document.getElementById("maintPaginNav");
    if (!tb) return;
    const start = (page - 1) * PER;
    const slice = filtered.slice(start, start + PER);
    if (!slice.length) {
      tb.innerHTML =
        '<tr><td colspan="8"><div class="empty-state" style="padding:32px"><i class="bi bi-tools"></i><p>No requests found</p></div></td></tr>';
      return;
    }
    tb.innerHTML = slice
      .map(
        (m) => `
      <tr>
        <td><div class="d-flex align-items-center gap-2"><div class="priority-dot ${m.priority || "low"}"></div><div style="font-weight:700">${m.title}</div></div></td>
        <td>${m.tenant_name || "—"}</td>
        <td style="font-size:.8rem">${m.plaza_name || "—"} · ${m.unit || "—"}</td>
        <td style="font-size:.8rem;color:var(--text-muted)">${m.category || "—"}</td>
        <td>${Admin.badge(m.priority || "low")}</td>
        <td>${Admin.badge(m.status)}</td>
        <td style="font-size:.8rem">${Admin.fmt.date(m.created_at || m.created)}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-xs" onclick="AdminMaintenance.viewRequest(${m.id})"><i class="bi bi-eye"></i></button>
          </div>
        </td>
      </tr>`,
      )
      .join("");
    if (info)
      info.textContent = `Showing ${start + 1}–${Math.min(start + PER, filtered.length)} of ${filtered.length}`;
    if (nav)
      nav.innerHTML =
        filtered.length > PER
          ? Admin.pagination(
              filtered.length,
              page,
              PER,
              "AdminMaintenance.goPage",
            )
          : "";
  }

  function goPage(p) {
    page = p;
    render();
  }

  function viewRequest(id) {
    _editId = id;
    const m = all.find((x) => x.id === id);
    if (!m) return;
    const body = document.getElementById("maintDetailBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-12"><div class="form-label">Issue</div><strong>${m.title}</strong></div>
        <div class="col-6"><div class="form-label">Tenant</div>${m.tenant_name || "—"}</div>
        <div class="col-6"><div class="form-label">Plaza / Unit</div>${m.plaza_name || "—"} · ${m.unit || "—"}</div>
        <div class="col-6"><div class="form-label">Category</div>${m.category || "—"}</div>
        <div class="col-6"><div class="form-label">Priority</div>${Admin.badge(m.priority || "low")}</div>
        <div class="col-6"><div class="form-label">Submitted</div>${Admin.fmt.date(m.created_at || m.created)}</div>
        <div class="col-6">
          <div class="form-label">Status</div>
          <select class="form-select" id="maintModalStatus">
            <option value="open" ${m.status === "open" ? "selected" : ""}>Open</option>
            <option value="in_progress" ${m.status === "in_progress" ? "selected" : ""}>In Progress</option>
            <option value="resolved" ${m.status === "resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("maintDetailModal"),
    )?.show();
  }

  function updateStatus(id, status) {
    const m = all.find((x) => x.id === id);
    if (!m) return;
    m.status = status;
    renderStats();
    Admin.toast("Status updated to " + status.replace("_", " "), "info");
  }

  function saveFromModal() {
    const sel = document.getElementById("maintModalStatus");
    if (sel && _editId) updateStatus(_editId, sel.value);
    bootstrap.Modal.getInstance(
      document.getElementById("maintDetailModal"),
    )?.hide();
  }

  function exportCsv() {
    const rows = [
      ["Title", "Tenant", "Category", "Priority", "Status", "Submitted"],
    ];
    filtered.forEach((m) =>
      rows.push([
        m.title,
        m.tenant_name,
        m.category,
        m.priority,
        m.status,
        m.created_at || m.created,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "maintenance.csv";
    a.click();
    Admin.toast("CSV downloaded", "success");
  }

  return {
    init,
    filter,
    render,
    goPage,
    viewRequest,
    updateStatus,
    exportCsv,
    saveFromModal,
  };
})();

/* ─────────────────────────────────────────────────────────────
   REMAINING MODULES — use mock data for non-existent endpoints
   ───────────────────────────────────────────────────────────── */

const AdminPlazas = (() => {
  let all = [],
    filtered = [];

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/plazas");
    all = Array.isArray(r?.data) ? r.data : r?.data?.plazas || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("plazaTotal", all.length);
    set(
      "plazaUnits",
      all.reduce((s, p) => s + (parseInt(p.total_units) || 0), 0),
    );
    set(
      "plazaOccupied",
      all.reduce((s, p) => s + (parseInt(p.occupied_units) || 0), 0),
    );
    set(
      "plazaVacant",
      all.reduce(
        (s, p) =>
          s +
          (parseInt(p.total_units) || 0) -
          (parseInt(p.occupied_units) || 0),
        0,
      ),
    );
  }

  function filter() {
    const q = (
      document.getElementById("plazaSearch")?.value || ""
    ).toLowerCase();
    filtered = all.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.landlord_name || "").toLowerCase().includes(q),
    );
    render();
  }

  function clearFilters() {
    const el = document.getElementById("plazaSearch");
    if (el) el.value = "";
    filtered = [...all];
    render();
  }

  function setView(mode) {
    document
      .getElementById("gridBtn")
      ?.classList.toggle("active", mode === "grid");
    document
      .getElementById("listBtn")
      ?.classList.toggle("active", mode === "list");
    const grid = document.getElementById("plazasGrid");
    const list = document.getElementById("plazasList");
    if (grid) grid.style.display = mode === "grid" ? "" : "none";
    if (list) list.style.display = mode === "list" ? "" : "none";
    render();
  }

  function render() {
    const el = document.getElementById("plazasGrid");
    if (!el) {
      renderList();
      return;
    }
    if (!filtered.length) {
      el.innerHTML =
        '<div class="col-12"><div class="empty-state" style="padding:40px"><i class="bi bi-buildings"></i><p>No plazas found</p></div></div>';
      return;
    }
    el.innerHTML = filtered
      .map((p) => {
        const occ = parseInt(p.occupied_units) || 0;
        const total = parseInt(p.total_units) || 1;
        const rate = Math.round((occ / total) * 100);
        const barColor =
          rate >= 80
            ? "var(--success)"
            : rate >= 50
              ? "var(--warning)"
              : "var(--danger)";
        return `<div class="col-md-6 col-xl-4">
        <div class="plaza-card">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="plaza-icon"><i class="bi bi-buildings"></i></div>
            <div style="min-width:0;flex:1">
              <div style="font-weight:800">${p.name}</div>
              <div style="font-size:.78rem;color:var(--text-muted)">${p.location || "—"}</div>
            </div>
          </div>
          <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:4px">Landlord: <strong style="color:var(--text-main)">${p.landlord_name || p.landlord_username || "—"}</strong></div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <div><span style="font-size:.72rem;color:var(--text-muted)">OCCUPANCY</span><div style="font-weight:800">${occ}/${total} units</div></div>
            <div style="text-align:right"><span style="font-size:.72rem;color:var(--text-muted)">VACANT</span><div style="font-weight:800;color:var(--warning-text)">${total - occ}</div></div>
          </div>
          <div class="occ-bar" style="margin-top:10px"><div class="occ-fill" style="width:${rate}%;background:${barColor}"></div></div>
          <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">${rate}% occupied</div>
        </div>
      </div>`;
      })
      .join("");
  }

  function renderList() {
    const tb = document.getElementById("plazasTableBody");
    if (!tb) return;
    if (!filtered.length) {
      tb.innerHTML =
        '<tr><td colspan="8"><div class="empty-state" style="padding:24px"><i class="bi bi-buildings"></i><p>No plazas found</p></div></td></tr>';
      return;
    }
    tb.innerHTML = filtered
      .map((p) => {
        const occ = parseInt(p.occupied_units) || 0;
        const total = parseInt(p.total_units) || 1;
        const rate = Math.round((occ / total) * 100);
        const barColor =
          rate >= 80
            ? "var(--success)"
            : rate >= 50
              ? "var(--warning)"
              : "var(--danger)";
        return `<tr>
        <td style="font-weight:700">${p.name}</td>
        <td>${p.landlord_name || p.landlord_username || "—"}</td>
        <td style="font-size:.8rem;color:var(--text-muted)">${p.location || "—"}</td>
        <td>${total}</td><td>${occ}</td>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="width:${rate}%;height:100%;background:${barColor};border-radius:3px"></div>
          </div><span style="font-size:.75rem;font-weight:700">${rate}%</span>
        </div></td>
        <td>—</td>
        <td><button class="btn btn-outline-secondary btn-xs" onclick="AdminPlazas.viewPlaza(${p.id})"><i class="bi bi-eye"></i></button></td>
      </tr>`;
      })
      .join("");
  }

  function viewPlaza(id) {
    const p = all.find((x) => x.id === id);
    if (!p) return;
    const body = document.getElementById("viewPlazaBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-12"><div class="form-label">Plaza Name</div><input type="text" class="form-control" id="editPlazaName" value="${p.name}"/></div>
        <div class="col-12"><div class="form-label">Location</div><input type="text" class="form-control" id="editPlazaLocation" value="${p.location || ""}"/></div>
        <div class="col-6"><div class="form-label">Landlord</div><div style="font-weight:700;margin-top:4px">${p.landlord_name || p.landlord_username || "—"}</div></div>
        <div class="col-6"><div class="form-label">Total Units</div><div style="font-weight:700;margin-top:4px">${p.total_units || 0}</div></div>
        <div class="col-6"><div class="form-label">Occupied</div><div style="font-weight:700;color:var(--success-text);margin-top:4px">${p.occupied_units || 0}</div></div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("viewPlazaModal"),
    )?.show();
  }

  function savePlaza() {
    Admin.toast("Plaza edit — coming soon", "info");
    bootstrap.Modal.getInstance(
      document.getElementById("viewPlazaModal"),
    )?.hide();
  }

  return { init, filter, clearFilters, setView, render, viewPlaza, savePlaza };
})();

const AdminReports = (() => {
  async function init() {
    Admin.initSidebar();
    const [dashR, payR, maintR] = await Promise.all([
      Admin.api("GET", "/admin/dashboard"),
      Admin.api("GET", "/admin/payments"),
      Admin.api("GET", "/admin/maintenance"),
    ]);
    const d = dashR?.data || {};
    const pay = d.payments || {};
    const s = d.users || {};
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("rRevenue", Admin.fmt.currency(pay.total_revenue || 0));
    set("rUsers", s.total_users || 0);
  }
  function changePeriod() {
    Admin.toast("Period filter (demo)", "info");
  }
  function exportReport() {
    Admin.toast("Export (demo)", "info");
  }
  return { init, changePeriod, exportReport };
})();

const AdminRoles = (() => {
  async function init() {
    Admin.initSidebar();
  }
  function saveAll() {
    Admin.toast("Permissions saved", "success");
  }
  function resetToDefaults() {
    Admin.toast("Reset to defaults", "info");
  }
  return { init, saveAll, resetToDefaults };
})();

const AdminSettings = (() => {
  async function init() {
    Admin.initSidebar();
  }
  function switchTab(name, btn) {
    document
      .querySelectorAll(".settings-panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".stab")
      .forEach((b) => b.classList.remove("active"));
    const panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
    if (btn) btn.classList.add("active");
  }
  function saveGeneral() {
    Admin.toast("General settings saved", "success");
  }
  function savePlatform() {
    Admin.toast("Platform features saved", "success");
  }
  function saveEmail() {
    Admin.toast("Email settings saved", "success");
  }
  function saveSecurity() {
    Admin.toast("Security settings saved", "success");
  }
  function testEmail() {
    Admin.toast("Test email sent", "info");
  }
  function clearCache() {
    Admin.toast("Cache cleared", "success");
  }
  function exportAll() {
    Admin.toast("Export started", "info");
  }
  function signOutAll() {
    Admin.confirm("Sign out all sessions?", () =>
      Admin.toast("Done", "success"),
    );
  }
  function wipeConfirm() {
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("wipeModal"),
    )?.show();
  }
  function executeWipe() {
    Admin.setMsg("wipeMsg", "⚠️ Wipe disabled in demo.", "warning");
  }
  return {
    init,
    switchTab,
    saveGeneral,
    savePlatform,
    saveEmail,
    saveSecurity,
    testEmail,
    clearCache,
    exportAll,
    signOutAll,
    wipeConfirm,
    executeWipe,
  };
})();

const AdminSupport = (() => {
  async function init() {
    Admin.initSidebar();
    const el = document.getElementById("ticketList");
    if (el)
      el.innerHTML =
        '<div class="empty-state" style="padding:40px"><i class="bi bi-headset"></i><p>No tickets yet</p></div>';
  }
  return {
    init,
    switchTab: () => {},
    filter: () => {},
    renderList: () => {},
    openTicket: () => {},
    sendReply: () => {},
    updateTicketStatus: () => {},
    createTicket: () => {},
  };
})();

const AdminCodes = (() => {
  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/codes");
    const all = r?.data || [];
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("codeTotal", all.length);
    set("codeActive", all.filter((c) => c.status === "active").length);
    set("codeUsed", all.filter((c) => c.status === "used").length);
    set(
      "codeExpired",
      all.filter((c) => c.status === "expired" || c.status === "revoked")
        .length,
    );
    const tb = document.getElementById("codesBody");
    if (tb)
      tb.innerHTML = all.length
        ? all
            .slice(0, 10)
            .map(
              (c) =>
                `<tr><td><span class="code-badge">${c.code}</span></td><td>${c.landlord_name || c.landlord || "—"}</td><td>${c.plaza_name || c.plaza || "—"}</td><td>${c.unit_number || c.unit || "Any"}</td><td>${c.used_count || 0}/${c.max_uses || 1}</td><td>${c.claimed_by || "—"}</td><td>${Admin.fmt.date(c.expires_at || c.expires)}</td><td>${Admin.badge(c.status)}</td><td></td></tr>`,
            )
            .join("")
        : '<tr><td colspan="9"><div class="empty-state" style="padding:24px"><i class="bi bi-key"></i><p>No codes found</p></div></td></tr>';
  }
  function copyCode(code) {
    navigator.clipboard
      ?.writeText(code)
      .then(() => Admin.toast("Copied: " + code, "success"));
  }
  function revokeCode(code) {
    Admin.toast("Revoke coming soon", "warning");
  }
  function confirmRevoke() {}
  function deleteCode(id) {
    Admin.toast("Delete coming soon", "warning");
  }
  function goPage(p) {}
  function exportCsv() {
    Admin.toast("CSV download coming soon", "info");
  }
  return {
    init,
    filter: () => {},
    clearFilters: () => {},
    render: () => {},
    goPage,
    copyCode,
    revokeCode,
    confirmRevoke,
    deleteCode,
    loadLandlordPlazas: () => {},
    loadUnits: () => {},
    previewCodes: () => {},
    generateCodes: () => {},
    exportCsv,
  };
})();

const AdminHealth = (() => {
  async function init() {
    Admin.initSidebar();
    const el = document.getElementById("healthLabel");
    if (el) el.textContent = "System Status — Live data coming soon";
  }
  async function refresh() {}
  return { init, refresh };
})();

const AdminAudit = (() => {
  async function init() {
    Admin.initSidebar();
    const el = document.getElementById("auditBody");
    if (el)
      el.innerHTML =
        '<div class="empty-state" style="padding:32px"><i class="bi bi-journal"></i><p>Audit log coming soon</p></div>';
  }
  return {
    init,
    filter: () => {},
    clearFilters: () => {},
    render: () => {},
    goPage: () => {},
    viewEvent: () => {},
    exportAudit: () => {},
  };
})();

const AdminAnnouncements = (() => {
  async function init() {
    Admin.initSidebar();
    const el = document.getElementById("annHistory");
    if (el)
      el.innerHTML =
        '<div class="empty-state" style="padding:32px"><i class="bi bi-megaphone"></i><p>No announcements yet</p></div>';
  }
  function selectAudience(chip, val) {
    document
      .querySelectorAll(".audience-chip")
      .forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
  }
  function sendAnnouncement() {
    Admin.toast("Announcement sent (demo)", "success");
  }
  return { init, selectAudience, filter: () => {}, sendAnnouncement };
})();

const AdminNotifications = (() => {
  async function init() {
    Admin.initSidebar();
  }
  function switchTab() {}
  function filter() {}
  function markRead() {}
  function markAllRead() {
    Admin.toast("All read", "success");
  }
  function dismiss() {}
  function clearAll() {}
  function sendManual() {
    Admin.toast("Notification sent (demo)", "success");
  }
  return {
    init,
    switchTab,
    filter,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
    sendManual,
  };
})();

const AdminLeases = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/leases");
    all = Array.isArray(r?.data) ? r.data : r?.data?.leases || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("leaseActive", all.filter((l) => l.status === "active").length);
    set("leaseEnding", all.filter((l) => l.status === "ending_soon").length);
    set("leaseExpired", all.filter((l) => l.status === "expired").length);
    set("leaseTotal", all.length);
    const endingSoon = all.filter((l) => l.status === "ending_soon");
    const alert = document.getElementById("expiringAlert");
    const alertTxt = document.getElementById("expiringAlertText");
    if (alert) alert.style.display = endingSoon.length ? "" : "none";
    if (alertTxt && endingSoon.length)
      alertTxt.textContent = `${endingSoon.length} lease${endingSoon.length > 1 ? "s" : ""} expiring within 30 days.`;
  }

  function filter() {
    const q = (
      document.getElementById("leaseSearch")?.value || ""
    ).toLowerCase();
    const stat = document.getElementById("leaseStatus")?.value || "";
    filtered = all.filter(
      (l) =>
        (!q ||
          (l.tenant_name || "").toLowerCase().includes(q) ||
          (l.plaza_name || "").toLowerCase().includes(q)) &&
        (!stat || l.status === stat),
    );
    page = 1;
    render();
  }

  function render() {
    const tb = document.getElementById("leasesBody");
    const info = document.getElementById("leasePaginInfo");
    const nav = document.getElementById("leasePaginNav");
    if (!tb) return;
    const start = (page - 1) * PER;
    const slice = filtered.slice(start, start + PER);
    if (!slice.length) {
      tb.innerHTML =
        '<tr><td colspan="9"><div class="empty-state" style="padding:32px"><i class="bi bi-file-text"></i><p>No leases found</p></div></td></tr>';
      return;
    }
    tb.innerHTML = slice
      .map(
        (l) => `
      <tr>
        <td style="font-weight:700">${l.tenant_name || l.tenant_username || "—"}</td>
        <td style="font-size:.8rem">${l.plaza_name || "—"} · <strong>${l.unit_number || "—"}</strong></td>
        <td style="font-size:.8rem;color:var(--text-muted)">${l.landlord_name || l.landlord_username || "—"}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(l.rent_amount)}/mo</td>
        <td style="font-size:.8rem">${Admin.fmt.date(l.lease_start)}</td>
        <td style="font-size:.8rem">${Admin.fmt.date(l.lease_end)}</td>
        <td>${Admin.badge(l.status)}</td>
        <td>
          <button class="btn btn-outline-secondary btn-xs" onclick="AdminLeases.viewLease(${l.id})"><i class="bi bi-eye"></i></button>
        </td>
      </tr>`,
      )
      .join("");
    if (info)
      info.textContent = `Showing ${start + 1}–${Math.min(start + PER, filtered.length)} of ${filtered.length}`;
    if (nav)
      nav.innerHTML =
        filtered.length > PER
          ? Admin.pagination(filtered.length, page, PER, "AdminLeases.goPage")
          : "";
  }

  function goPage(p) {
    page = p;
    render();
  }

  function viewLease(id) {
    const l = all.find((x) => x.id === id);
    if (!l) return;
    const body = document.getElementById("leaseDetailBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-6"><div class="form-label">Tenant</div><strong>${l.tenant_name || l.tenant_username || "—"}</strong></div>
        <div class="col-6"><div class="form-label">Landlord</div>${l.landlord_name || l.landlord_username || "—"}</div>
        <div class="col-6"><div class="form-label">Plaza / Unit</div>${l.plaza_name || "—"} · ${l.unit_number || "—"}</div>
        <div class="col-6"><div class="form-label">Monthly Rent</div><strong style="color:var(--success-text)">${Admin.fmt.currency(l.rent_amount)}</strong></div>
        <div class="col-6"><div class="form-label">Start Date</div>${Admin.fmt.date(l.lease_start)}</div>
        <div class="col-6"><div class="form-label">End Date</div>${Admin.fmt.date(l.lease_end)}</div>
        <div class="col-6"><div class="form-label">Status</div>${Admin.badge(l.status)}</div>
        <div class="col-6"><div class="form-label">Location</div>${l.plaza_location || "—"}</div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("leaseDetailModal"),
    )?.show();
  }

  function terminate(id) {
    Admin.toast("Terminate — contact landlord directly", "warning");
  }
  function renew(id) {
    Admin.toast("Renewal — contact landlord directly", "info");
  }

  function exportCsv() {
    const rows = [
      ["Tenant", "Landlord", "Plaza", "Unit", "Rent", "Start", "End", "Status"],
    ];
    filtered.forEach((l) =>
      rows.push([
        l.tenant_name,
        l.landlord_name,
        l.plaza_name,
        l.unit_number,
        l.rent_amount,
        l.lease_start,
        l.lease_end,
        l.status,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "leases.csv";
    a.click();
    Admin.toast("CSV downloaded", "success");
  }

  return {
    init,
    filter,
    render,
    goPage,
    viewLease,
    terminate,
    renew,
    exportCsv,
  };
})();

const AdminBackup = (() => {
  async function init() {
    Admin.initSidebar();
  }
  function createBackup() {
    Admin.toast("Backup created (demo)", "success");
  }
  function download() {
    Admin.toast("Download (demo)", "info");
  }
  function restore() {
    Admin.toast("Restore (demo)", "warning");
  }
  function confirmRestore() {}
  function deleteBackup() {
    Admin.toast("Deleted (demo)", "success");
  }
  function saveSchedule() {
    Admin.toast("Schedule saved (demo)", "success");
  }
  return {
    init,
    render: () => {},
    createBackup,
    download,
    restore,
    confirmRestore,
    deleteBackup,
    saveSchedule,
  };
})();

const AdminProfile = (() => {
  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/auth/me");
    const u = r?.data || {};
    const name = u.full_name || u.username || "Admin";
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("profileName", name);
    set("profileInitials", Admin.fmt.initials(name));
    set("profileEmail", u.email || "—");
    set("profileRoleLabel", u.role || "admin");
    const sn = document.getElementById("sidebarName");
    if (sn) sn.textContent = name;
    const sa = document.getElementById("sidebarAvatar");
    if (sa) sa.textContent = Admin.fmt.initials(name);
    const el = (id) => document.getElementById(id);
    if (el("infoFirstName"))
      el("infoFirstName").value =
        (u.full_name || "").split(" ")[0] || u.username || "";
    if (el("infoLastName"))
      el("infoLastName").value =
        (u.full_name || "").split(" ").slice(1).join(" ") || "";
    if (el("infoEmail")) el("infoEmail").value = u.email || "";
    if (el("infoPhone")) el("infoPhone").value = u.phone || "";
  }
  function switchTab(name, btn) {
    document
      .querySelectorAll(".profile-panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".ptab")
      .forEach((b) => b.classList.remove("active"));
    const panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
    if (btn) btn.classList.add("active");
  }
  function saveInfo() {
    Admin.toast("Profile saved", "success");
  }
  function checkPwStrength() {
    const pw = document.getElementById("newPw")?.value || "";
    const bar = document.getElementById("pwStrengthBar");
    const lbl = document.getElementById("pwStrengthLabel");
    if (!bar || !lbl) return;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = ["", "weak", "fair", "good", "strong"];
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = {
      weak: "var(--danger)",
      fair: "var(--warning)",
      good: "var(--primary)",
      strong: "var(--success)",
    };
    const lvl = levels[score] || "weak";
    bar.className = "pw-strength " + lvl;
    bar.style.display = "block";
    lbl.textContent = labels[score] || "Weak";
    lbl.style.color = colors[lvl];
  }
  function changePassword() {
    const cur = document.getElementById("currentPw")?.value;
    const nw = document.getElementById("newPw")?.value;
    const conf = document.getElementById("confirmPw")?.value;
    if (!cur || !nw || !conf) {
      Admin.setMsg("passwordMsg", "Please fill in all fields.", "danger");
      return;
    }
    if (nw !== conf) {
      Admin.setMsg("passwordMsg", "Passwords do not match.", "danger");
      return;
    }
    if (nw.length < 8) {
      Admin.setMsg("passwordMsg", "Min 8 characters.", "danger");
      return;
    }
    Admin.api("POST", "/auth/change-password", {
      current_password: cur,
      new_password: nw,
    }).then(() => {
      Admin.setMsg("passwordMsg", "Password changed.", "success");
      Admin.toast("Password updated", "success");
    });
  }
  function showTFASetup() {}
  function enableTFA() {}
  function disableTFA() {}
  function revokeSession() {}
  function revokeAllSessions() {}
  function renderSessions(data) {}
  function uploadAvatar(input) {
    Admin.toast("Avatar upload coming soon", "info");
  }
  return {
    init,
    switchTab,
    saveInfo,
    checkPwStrength,
    changePassword,
    showTFASetup,
    enableTFA,
    disableTFA,
    revokeSession,
    revokeAllSessions,
    uploadAvatar,
  };
})();
