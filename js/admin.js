/* ================================================================
   RENTMS — ADMIN PORTAL  admin.js  v3
   18 modules · DEV_MODE mock data · Full CRUD
   ================================================================ */

/* ─────────────────────────────────────────────────────────────
   CORE: Admin
   ───────────────────────────────────────────────────────────── */
const Admin = (() => {
  const DEV_MODE = true; // ← set false for live API at /api

  /* ── API client ── */
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
    const r = await fetch("/api" + url, opts);
    if (r.status === 401) {
      location.href = "../auth/login.html";
      return;
    }
    return r.json();
  }

  /* ── Format helpers ── */
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

  /* ── Badge ── */
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
    const label = status ? status.replace(/_/g, " ") : "unknown";
    return `<span class="badge-status ${cls}">${label}</span>`;
  }

  /* ── Toast ── */
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

  /* ── Confirm ── */
  function confirm(msg, cb) {
    if (window.confirm(msg)) cb();
  }

  /* ── setMsg ── */
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

  /* ── Pagination helper ── */
  function pagination(total, page, perPage, onPage) {
    const pages = Math.ceil(total / perPage);
    const nav = [];
    nav.push(
      `<button class="pagin-btn" onclick="(${onPage})(1)" ${page === 1 ? "disabled" : ""}>‹‹</button>`,
    );
    nav.push(
      `<button class="pagin-btn" onclick="(${onPage})(${page - 1})" ${page === 1 ? "disabled" : ""}>‹</button>`,
    );
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);
    if (start > 1)
      nav.push(`<span class="pagin-btn" style="cursor:default">…</span>`);
    for (let p = start; p <= end; p++) {
      nav.push(
        `<button class="pagin-btn ${p === page ? "active" : ""}" onclick="(${onPage})(${p})">${p}</button>`,
      );
    }
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

  /* ── Sidebar init ── */
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

    // ── Scroll persistence: restore position, scroll active link into view ──
    const nav = sb?.querySelector(".sidebar-nav");
    if (nav) {
      const saved = sessionStorage.getItem("sidebarScroll");
      if (saved) nav.scrollTop = parseInt(saved, 10);

      const activeLink = nav.querySelector(".nav-link.active");
      if (activeLink) {
        const navTop = nav.getBoundingClientRect().top;
        const linkTop = activeLink.getBoundingClientRect().top;
        const offset = linkTop - navTop;
        const navHeight = nav.clientHeight;
        if (offset < 0 || offset > navHeight - activeLink.clientHeight) {
          nav.scrollTop = nav.scrollTop + offset - navHeight / 3;
        }
      }

      nav.addEventListener("scroll", () => {
        sessionStorage.setItem("sidebarScroll", nav.scrollTop);
      });
    }

    // Populate avatar + name
    const av = document.getElementById("sidebarAvatar");
    const nm = document.getElementById("sidebarName");
    if (DEV_MODE) {
      if (av)
        av.textContent = fmt.initials(
          MOCK.admin.first_name + " " + MOCK.admin.last_name,
        );
      if (nm)
        nm.textContent = MOCK.admin.first_name + " " + MOCK.admin.last_name;
      let banner = document.getElementById("devModeBanner");
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "devModeBanner";
        banner.textContent = "⚡ DEV MODE — Mock Data Active";
        Object.assign(banner.style, {
          position: "fixed",
          bottom: "12px",
          right: "12px",
          zIndex: "9999",
          background: "#f59e0b",
          color: "#000",
          fontWeight: "800",
          fontSize: ".72rem",
          padding: "5px 12px",
          borderRadius: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,.3)",
          letterSpacing: ".04em",
        });
        document.body.appendChild(banner);
      }
    } else {
      api("GET", "/admin/profile")
        .then((r) => {
          if (!r?.data) return;
          const name =
            (r.data.first_name || "") + " " + (r.data.last_name || "");
          if (av) av.textContent = fmt.initials(name.trim() || "A");
          if (nm) nm.textContent = name.trim() || "Admin";
        })
        .catch(() => {});
    }
  }

  /* ── Avatar colour seed ── */
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
   MOCK DATA
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
    bio: "Platform administrator for RentMS. Manages all landlords, tenants, and system operations.",
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
  users: [
    {
      id: 1,
      username: "kwame_asante",
      full_name: "Kwame Asante",
      email: "kwame@mensahprop.com",
      phone: "+233 20 111 2233",
      role: "landlord",
      status: "active",
      created_at: "2024-09-01",
      plazas: 4,
      tenants: 32,
    },
    {
      id: 2,
      username: "ama_mensah",
      full_name: "Ama Mensah",
      email: "ama@gmail.com",
      phone: "+233 24 222 3344",
      role: "landlord",
      status: "active",
      created_at: "2024-09-14",
      plazas: 3,
      tenants: 21,
    },
    {
      id: 3,
      username: "kofi_boateng",
      full_name: "Kofi Boateng",
      email: "kofi@estates.gh",
      phone: "+233 27 333 4455",
      role: "landlord",
      status: "active",
      created_at: "2024-10-03",
      plazas: 2,
      tenants: 14,
    },
    {
      id: 4,
      username: "abena_owusu",
      full_name: "Abena Owusu",
      email: "abena@rent.gh",
      phone: "+233 20 444 5566",
      role: "landlord",
      status: "active",
      created_at: "2024-10-22",
      plazas: 2,
      tenants: 18,
    },
    {
      id: 5,
      username: "yaw_darko",
      full_name: "Yaw Darko",
      email: "yaw@darko.com",
      phone: "+233 50 555 6677",
      role: "landlord",
      status: "suspended",
      created_at: "2024-11-05",
      plazas: 1,
      tenants: 0,
    },
    {
      id: 6,
      username: "akosua_frimpong",
      full_name: "Akosua Frimpong",
      email: "akosua@tenant.com",
      phone: "+233 24 666 7788",
      role: "tenant",
      status: "active",
      created_at: "2024-11-18",
      unit: "2A",
      plaza: "Accra Heights",
    },
    {
      id: 7,
      username: "kojo_amponsah",
      full_name: "Kojo Amponsah",
      email: "kojo@gmail.com",
      phone: "+233 27 777 8899",
      role: "tenant",
      status: "active",
      created_at: "2024-12-01",
      unit: "1C",
      plaza: "Tema Court",
    },
    {
      id: 8,
      username: "efua_antwi",
      full_name: "Efua Antwi",
      email: "efua@antwi.gh",
      phone: "+233 20 888 9900",
      role: "tenant",
      status: "active",
      created_at: "2024-12-10",
      unit: "3B",
      plaza: "East Legon Flats",
    },
    {
      id: 9,
      username: "kwesi_mensah",
      full_name: "Kwesi Mensah",
      email: "kwesi@mensah.gh",
      phone: "+233 50 100 2200",
      role: "tenant",
      status: "active",
      created_at: "2025-01-04",
      unit: "4D",
      plaza: "Accra Heights",
    },
    {
      id: 10,
      username: "adwoa_asare",
      full_name: "Adwoa Asare",
      email: "adwoa@gmail.com",
      phone: "+233 24 200 3300",
      role: "tenant",
      status: "active",
      created_at: "2025-01-15",
      unit: "2C",
      plaza: "Kumasi Plaza",
    },
  ],
  plazas: [
    {
      id: 1,
      name: "Accra Heights",
      landlord: "Kwame Asante",
      landlord_name: "Kwame Asante",
      location: "East Legon, Accra",
      total_units: 40,
      occupied: 38,
      status: "active",
      revenue: 48200,
    },
    {
      id: 2,
      name: "Tema Court",
      landlord: "Ama Mensah",
      landlord_name: "Ama Mensah",
      location: "Community 2, Tema",
      total_units: 28,
      occupied: 25,
      status: "active",
      revenue: 31500,
    },
    {
      id: 3,
      name: "East Legon Flats",
      landlord: "Kwame Asante",
      landlord_name: "Kwame Asante",
      location: "East Legon, Accra",
      total_units: 20,
      occupied: 19,
      status: "active",
      revenue: 26800,
    },
    {
      id: 4,
      name: "Kumasi Plaza",
      landlord: "Kofi Boateng",
      landlord_name: "Kofi Boateng",
      location: "Adum, Kumasi",
      total_units: 32,
      occupied: 28,
      status: "active",
      revenue: 22400,
    },
    {
      id: 5,
      name: "Airport Residential",
      landlord: "Abena Owusu",
      landlord_name: "Abena Owusu",
      location: "Airport Hills, Accra",
      total_units: 24,
      occupied: 22,
      status: "active",
      revenue: 33600,
    },
    {
      id: 6,
      name: "Cantonment Gardens",
      landlord: "Ama Mensah",
      landlord_name: "Ama Mensah",
      location: "Cantonments, Accra",
      total_units: 18,
      occupied: 15,
      status: "active",
      revenue: 27000,
    },
    {
      id: 7,
      name: "Labadi Towers",
      landlord: "Kwame Asante",
      landlord_name: "Kwame Asante",
      location: "Labadi, Accra",
      total_units: 30,
      occupied: 27,
      status: "active",
      revenue: 19200,
    },
  ],
  payments: [
    {
      id: 1,
      tenant_name: "Akosua Frimpong",
      plaza: "Accra Heights",
      unit: "2A",
      amount: 1800,
      method: "momo",
      status: "paid",
      payment_date: "2025-02-01",
      reference: "RMS-2025-0201",
    },
    {
      id: 2,
      tenant_name: "Kojo Amponsah",
      plaza: "Tema Court",
      unit: "1C",
      amount: 1200,
      method: "bank_transfer",
      status: "paid",
      payment_date: "2025-02-02",
      reference: "RMS-2025-0202",
    },
    {
      id: 3,
      tenant_name: "Efua Antwi",
      plaza: "East Legon Flats",
      unit: "3B",
      amount: 1500,
      method: "card",
      status: "paid",
      payment_date: "2025-02-03",
      reference: "RMS-2025-0203",
    },
    {
      id: 4,
      tenant_name: "Kwesi Mensah",
      plaza: "Accra Heights",
      unit: "4D",
      amount: 1800,
      method: "momo",
      status: "pending",
      payment_date: "2025-02-04",
      reference: "RMS-2025-0204",
    },
    {
      id: 5,
      tenant_name: "Adwoa Asare",
      plaza: "Kumasi Plaza",
      unit: "2C",
      amount: 900,
      method: "momo",
      status: "paid",
      payment_date: "2025-02-05",
      reference: "RMS-2025-0205",
    },
    {
      id: 6,
      tenant_name: "Yaw Tetteh",
      plaza: "Airport Res.",
      unit: "1A",
      amount: 2200,
      method: "bank_transfer",
      status: "paid",
      payment_date: "2025-02-06",
      reference: "RMS-2025-0206",
    },
    {
      id: 7,
      tenant_name: "Abena Kyei",
      plaza: "Cantonment Gdns",
      unit: "2D",
      amount: 1600,
      method: "card",
      status: "failed",
      payment_date: "2025-02-07",
      reference: "RMS-2025-0207",
    },
    {
      id: 8,
      tenant_name: "Fiifi Dadzie",
      plaza: "Labadi Towers",
      unit: "3A",
      amount: 1100,
      method: "momo",
      status: "paid",
      payment_date: "2025-02-08",
      reference: "RMS-2025-0208",
    },
    {
      id: 9,
      tenant_name: "Maame Serwaa",
      plaza: "Tema Court",
      unit: "4B",
      amount: 1200,
      method: "bank_transfer",
      status: "pending",
      payment_date: "2025-02-09",
      reference: "RMS-2025-0209",
    },
    {
      id: 10,
      tenant_name: "Nana Acheampong",
      plaza: "Accra Heights",
      unit: "1D",
      amount: 1800,
      method: "momo",
      status: "paid",
      payment_date: "2025-02-10",
      reference: "RMS-2025-0210",
    },
  ],
  leases: [
    {
      id: 1,
      tenant: "Akosua Frimpong",
      landlord: "Kwame Asante",
      plaza: "Accra Heights",
      unit: "2A",
      rent: 1800,
      start: "2024-03-01",
      end: "2025-03-01",
      status: "ending_soon",
    },
    {
      id: 2,
      tenant: "Kojo Amponsah",
      landlord: "Ama Mensah",
      plaza: "Tema Court",
      unit: "1C",
      rent: 1200,
      start: "2024-06-01",
      end: "2025-06-01",
      status: "active",
    },
    {
      id: 3,
      tenant: "Efua Antwi",
      landlord: "Kwame Asante",
      plaza: "East Legon Flats",
      unit: "3B",
      rent: 1500,
      start: "2024-07-01",
      end: "2025-07-01",
      status: "active",
    },
    {
      id: 4,
      tenant: "Kwesi Mensah",
      landlord: "Kwame Asante",
      plaza: "Accra Heights",
      unit: "4D",
      rent: 1800,
      start: "2024-09-01",
      end: "2025-09-01",
      status: "active",
    },
    {
      id: 5,
      tenant: "Adwoa Asare",
      landlord: "Kofi Boateng",
      plaza: "Kumasi Plaza",
      unit: "2C",
      rent: 900,
      start: "2024-11-01",
      end: "2025-11-01",
      status: "active",
    },
    {
      id: 6,
      tenant: "Yaw Tetteh",
      landlord: "Abena Owusu",
      plaza: "Airport Res.",
      unit: "1A",
      rent: 2200,
      start: "2024-02-01",
      end: "2025-02-28",
      status: "ending_soon",
    },
    {
      id: 7,
      tenant: "Abena Kyei",
      landlord: "Ama Mensah",
      plaza: "Cantonment Gdns",
      unit: "2D",
      rent: 1600,
      start: "2023-12-01",
      end: "2024-12-01",
      status: "expired",
    },
    {
      id: 8,
      tenant: "Fiifi Dadzie",
      landlord: "Kwame Asante",
      plaza: "Labadi Towers",
      unit: "3A",
      rent: 1100,
      start: "2024-10-01",
      end: "2025-10-01",
      status: "active",
    },
    {
      id: 9,
      tenant: "Maame Serwaa",
      landlord: "Ama Mensah",
      plaza: "Tema Court",
      unit: "4B",
      rent: 1200,
      start: "2024-08-01",
      end: "2025-08-01",
      status: "active",
    },
    {
      id: 10,
      tenant: "Nana Acheampong",
      landlord: "Kwame Asante",
      plaza: "Accra Heights",
      unit: "1D",
      rent: 1800,
      start: "2025-01-01",
      end: "2026-01-01",
      status: "active",
    },
  ],
  maintenance: [
    {
      id: 1,
      tenant: "Akosua Frimpong",
      plaza: "Accra Heights",
      unit: "2A",
      title: "Leaking pipe under kitchen sink",
      category: "plumbing",
      priority: "high",
      status: "in_progress",
      date: "2025-02-10",
    },
    {
      id: 2,
      tenant: "Kojo Amponsah",
      plaza: "Tema Court",
      unit: "1C",
      title: "Ceiling fan not working",
      category: "electrical",
      priority: "medium",
      status: "open",
      date: "2025-02-12",
    },
    {
      id: 3,
      tenant: "Efua Antwi",
      plaza: "East Legon Flats",
      unit: "3B",
      title: "Broken window latch",
      category: "structural",
      priority: "low",
      status: "open",
      date: "2025-02-13",
    },
    {
      id: 4,
      tenant: "Kwesi Mensah",
      plaza: "Accra Heights",
      unit: "4D",
      title: "Power outage in master bedroom",
      category: "electrical",
      priority: "high",
      status: "in_progress",
      date: "2025-02-14",
    },
    {
      id: 5,
      tenant: "Adwoa Asare",
      plaza: "Kumasi Plaza",
      unit: "2C",
      title: "Front door lock jammed",
      category: "structural",
      priority: "high",
      status: "open",
      date: "2025-02-15",
    },
    {
      id: 6,
      tenant: "Yaw Tetteh",
      plaza: "Airport Res.",
      unit: "1A",
      title: "AC unit making loud noise",
      category: "hvac",
      priority: "medium",
      status: "resolved",
      date: "2025-02-08",
    },
    {
      id: 7,
      tenant: "Fiifi Dadzie",
      plaza: "Labadi Towers",
      unit: "3A",
      title: "Water pressure very low",
      category: "plumbing",
      priority: "medium",
      status: "open",
      date: "2025-02-16",
    },
    {
      id: 8,
      tenant: "Maame Serwaa",
      plaza: "Tema Court",
      unit: "4B",
      title: "Bathroom tiles cracked",
      category: "structural",
      priority: "low",
      status: "resolved",
      date: "2025-02-07",
    },
  ],
  announcements: [
    {
      id: 1,
      title: "February Rent Reminder",
      audience: "all",
      message: "Rent is due by the 5th of February.",
      date: "2025-02-01",
      status: "sent",
    },
    {
      id: 2,
      title: "Scheduled Water Outage",
      audience: "tenants",
      message: "Water off on Feb 18 from 9am–3pm for maintenance.",
      date: "2025-02-10",
      status: "sent",
    },
    {
      id: 3,
      title: "New Parking Rules",
      audience: "tenants",
      message: "Use designated parking bays only.",
      date: "2025-02-12",
      status: "sent",
    },
    {
      id: 4,
      title: "Platform Maintenance Tonight",
      audience: "landlords",
      message: "Portal down 30 minutes at 2am on Feb 20.",
      date: "2025-02-15",
      status: "draft",
    },
  ],
  notifications: [
    {
      id: 1,
      user: "Akosua Frimpong",
      type: "payment_due",
      message: "Your rent of GHS 1,800 is due on 1 March 2025.",
      is_read: false,
      time: "2025-02-14T08:00:00",
    },
    {
      id: 2,
      user: "Kojo Amponsah",
      type: "maintenance",
      message: "Your maintenance request (Ceiling fan) is now in progress.",
      is_read: true,
      time: "2025-02-13T10:30:00",
    },
    {
      id: 3,
      user: "Kwame Asante",
      type: "payment_received",
      message: "Payment of GHS 1,800 received from Akosua Frimpong.",
      is_read: false,
      time: "2025-02-12T14:00:00",
    },
    {
      id: 4,
      user: "Efua Antwi",
      type: "lease_expiry",
      message: "Your lease expires in 45 days (1 Apr 2025).",
      is_read: false,
      time: "2025-02-11T09:00:00",
    },
    {
      id: 5,
      user: "Ama Mensah",
      type: "new_tenant",
      message: "New tenant Kojo Amponsah has joined Tema Court.",
      is_read: true,
      time: "2025-02-10T11:00:00",
    },
    {
      id: 6,
      user: "Adwoa Asare",
      type: "overdue",
      message: "Your rent payment for January is now overdue.",
      is_read: false,
      time: "2025-02-09T08:00:00",
    },
  ],
  tickets: [
    {
      id: 1,
      user: "Akosua Frimpong",
      subject: "Cannot access my payment history",
      category: "billing",
      priority: "high",
      status: "open",
      created: "2025-02-14T09:00:00",
      messages: [
        {
          from: "Akosua Frimpong",
          text: "I can't see my payment history for January. The page just spins.",
          time: "2025-02-14T09:00:00",
          isAdmin: false,
        },
        {
          from: "Admin",
          text: "Thanks for reaching out! We're looking into this for you.",
          time: "2025-02-14T09:45:00",
          isAdmin: true,
        },
      ],
    },
    {
      id: 2,
      user: "Kojo Amponsah",
      subject: "How do I change my email address?",
      category: "account",
      priority: "low",
      status: "open",
      created: "2025-02-13T14:20:00",
      messages: [
        {
          from: "Kojo Amponsah",
          text: "I need to update my email. Where do I do this?",
          time: "2025-02-13T14:20:00",
          isAdmin: false,
        },
      ],
    },
    {
      id: 3,
      user: "Kwame Asante",
      subject: "Invite code not working for new tenant",
      category: "invite_codes",
      priority: "medium",
      status: "in_progress",
      created: "2025-02-12T11:00:00",
      messages: [
        {
          from: "Kwame Asante",
          text: "Generated code AH-X9T2 but tenant says it shows as expired.",
          time: "2025-02-12T11:00:00",
          isAdmin: false,
        },
        {
          from: "Admin",
          text: "We found the issue — the code expiry was set in the past. A new code has been generated for you.",
          time: "2025-02-12T11:30:00",
          isAdmin: true,
        },
      ],
    },
    {
      id: 4,
      user: "Efua Antwi",
      subject: "Receipt not sent after payment",
      category: "payments",
      priority: "medium",
      status: "open",
      created: "2025-02-11T16:40:00",
      messages: [
        {
          from: "Efua Antwi",
          text: "I made a payment on 10 Feb but never received the PDF receipt.",
          time: "2025-02-11T16:40:00",
          isAdmin: false,
        },
      ],
    },
    {
      id: 5,
      user: "Ama Mensah",
      subject: "Plaza occupancy showing wrong number",
      category: "general",
      priority: "low",
      status: "closed",
      created: "2025-02-08T10:00:00",
      messages: [
        {
          from: "Ama Mensah",
          text: "Tema Court shows 24/28 but I have 25 active tenants.",
          time: "2025-02-08T10:00:00",
          isAdmin: false,
        },
        {
          from: "Admin",
          text: "Fixed! A deleted lease record was still being counted. Recalculated now.",
          time: "2025-02-08T11:00:00",
          isAdmin: true,
        },
      ],
    },
  ],
  codes: [
    {
      id: 1,
      code: "AH-K7R2",
      landlord: "Kwame Asante",
      plaza: "Accra Heights",
      unit: "2B",
      rent: 1800,
      max_uses: 1,
      used_count: 1,
      status: "used",
      claimed_by: "Akosua Frimpong",
      expires_at: "2025-01-31",
      created_at: "2025-01-01",
    },
    {
      id: 2,
      code: "AH-B3X9",
      landlord: "Kwame Asante",
      plaza: "Accra Heights",
      unit: "3C",
      rent: 1800,
      max_uses: 1,
      used_count: 0,
      status: "active",
      claimed_by: null,
      expires_at: "2025-03-15",
      created_at: "2025-02-13",
    },
    {
      id: 3,
      code: "TC-M4N1",
      landlord: "Ama Mensah",
      plaza: "Tema Court",
      unit: "2D",
      rent: 1200,
      max_uses: 1,
      used_count: 0,
      status: "active",
      claimed_by: null,
      expires_at: "2025-03-10",
      created_at: "2025-02-10",
    },
    {
      id: 4,
      code: "EL-P5Q7",
      landlord: "Kwame Asante",
      plaza: "East Legon Flats",
      unit: "1A",
      rent: 1500,
      max_uses: 1,
      used_count: 1,
      status: "used",
      claimed_by: "Efua Antwi",
      expires_at: "2025-01-20",
      created_at: "2024-12-20",
    },
    {
      id: 5,
      code: "KP-R8S2",
      landlord: "Kofi Boateng",
      plaza: "Kumasi Plaza",
      unit: "3A",
      rent: 900,
      max_uses: 1,
      used_count: 0,
      status: "expired",
      claimed_by: null,
      expires_at: "2025-01-05",
      created_at: "2024-12-05",
    },
    {
      id: 6,
      code: "AR-T6U4",
      landlord: "Abena Owusu",
      plaza: "Airport Res.",
      unit: "4B",
      rent: 2200,
      max_uses: 1,
      used_count: 0,
      status: "active",
      claimed_by: null,
      expires_at: "2025-03-20",
      created_at: "2025-02-18",
    },
    {
      id: 7,
      code: "CG-V9W1",
      landlord: "Ama Mensah",
      plaza: "Cantonment Gdns",
      unit: "1C",
      rent: 1600,
      max_uses: 1,
      used_count: 0,
      status: "revoked",
      claimed_by: null,
      expires_at: "2025-02-28",
      created_at: "2025-01-28",
    },
  ],
  audit: [
    {
      id: 1,
      actor: "Kwame Asante",
      role: "landlord",
      action: "create",
      description: "Generated invite code AH-B3X9 for Unit 3C",
      ip: "41.210.22.14",
      time: "2025-02-13T10:44:00",
    },
    {
      id: 2,
      actor: "Admin",
      role: "admin",
      action: "update",
      description: "Updated system settings — late_fee_percentage to 5%",
      ip: "127.0.0.1",
      time: "2025-02-13T09:30:00",
    },
    {
      id: 3,
      actor: "Akosua Frimpong",
      role: "tenant",
      action: "login",
      description: "Tenant login from Chrome on Windows",
      ip: "197.255.10.44",
      time: "2025-02-13T08:12:00",
    },
    {
      id: 4,
      actor: "Ama Mensah",
      role: "landlord",
      action: "create",
      description: "Generated invite code TC-M4N1 for Tema Court Unit 2D",
      ip: "41.210.14.88",
      time: "2025-02-12T16:00:00",
    },
    {
      id: 5,
      actor: "Admin",
      role: "admin",
      action: "delete",
      description: "Deleted suspended user account: yaw_darko (ID 5)",
      ip: "127.0.0.1",
      time: "2025-02-12T14:45:00",
    },
    {
      id: 6,
      actor: "Efua Antwi",
      role: "tenant",
      action: "create",
      description: "Submitted maintenance request: Broken window latch",
      ip: "154.120.88.22",
      time: "2025-02-12T11:20:00",
    },
    {
      id: 7,
      actor: "Kojo Amponsah",
      role: "tenant",
      action: "login",
      description: "Tenant login from Safari on iPhone",
      ip: "41.66.108.9",
      time: "2025-02-12T09:05:00",
    },
    {
      id: 8,
      actor: "Kwame Asante",
      role: "landlord",
      action: "update",
      description: "Updated rent amount for Unit 2A to GHS 1,800",
      ip: "197.255.44.12",
      time: "2025-02-11T15:30:00",
    },
    {
      id: 9,
      actor: "Admin",
      role: "admin",
      action: "security",
      description: "Failed login attempt — 3 tries for admin@rentms.com",
      ip: "91.108.4.20",
      time: "2025-02-11T02:14:00",
    },
    {
      id: 10,
      actor: "Adwoa Asare",
      role: "tenant",
      action: "create",
      description: "Submitted maintenance request: Front door lock jammed",
      ip: "154.120.14.77",
      time: "2025-02-11T10:00:00",
    },
    {
      id: 11,
      actor: "Abena Owusu",
      role: "landlord",
      action: "create",
      description: "Generated invite code AR-T6U4 for Airport Res. Unit 4B",
      ip: "41.210.30.5",
      time: "2025-02-10T14:00:00",
    },
    {
      id: 12,
      actor: "Admin",
      role: "admin",
      action: "update",
      description: "Set user yaw_darko status to suspended",
      ip: "127.0.0.1",
      time: "2025-02-10T10:20:00",
    },
  ],
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
    { name: "Abena Owusu", plazas: 2, tenants: 18, revenue: 33600 },
    { name: "Kofi Boateng", plazas: 2, tenants: 14, revenue: 22400 },
    { name: "Yaw Darko", plazas: 1, tenants: 0, revenue: 0 },
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
      { name: "PostgreSQL DB", status: "ok", latency: 14 },
      { name: "Redis Cache", status: "ok", latency: 3 },
      { name: "Email Service", status: "warn", latency: 420 },
      { name: "File Storage", status: "ok", latency: 95 },
      { name: "Payment Gateway", status: "ok", latency: 210 },
      { name: "Background Jobs", status: "ok", latency: 0 },
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
    {
      device: "Safari on iPhone 15",
      ip: "41.210.22.14",
      location: "Accra, GH",
      current: false,
      last_active: "2h ago",
    },
    {
      device: "Chrome on MacBook",
      ip: "197.255.14.88",
      location: "Kumasi, GH",
      current: false,
      last_active: "1d ago",
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

/* ─────────────────────────────────────────────────────────────
   MOCK ROUTER
   ───────────────────────────────────────────────────────────── */
async function mockApi(method, url, body) {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 80));
  if (url === "/admin/stats") return { data: MOCK.stats };
  if (url === "/admin/users") return { data: MOCK.users };
  if (url === "/admin/plazas") return { data: MOCK.plazas };
  if (url === "/admin/payments") return { data: MOCK.payments };
  if (url === "/admin/leases") return { data: MOCK.leases };
  if (url === "/admin/maintenance") return { data: MOCK.maintenance };
  if (url === "/admin/announcements") return { data: MOCK.announcements };
  if (url === "/admin/notifications") return { data: MOCK.notifications };
  if (url === "/admin/tickets") return { data: MOCK.tickets };
  if (url === "/admin/codes") return { data: MOCK.codes };
  if (url === "/admin/audit") return { data: MOCK.audit };
  if (url === "/admin/revenue_chart") return { data: MOCK.revenue_chart };
  if (url === "/admin/top_landlords") return { data: MOCK.top_landlords };
  if (url === "/admin/health") return { data: MOCK.health };
  if (url === "/admin/profile") return { data: MOCK.admin };
  if (url === "/admin/sessions") return { data: MOCK.sessions };
  if (url === "/admin/settings") return { data: MOCK.settings };
  if (method === "POST" || method === "PUT" || method === "DELETE")
    return { success: true };
  return { data: [] };
}

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminDashboard
   ───────────────────────────────────────────────────────────── */
const AdminDashboard = (() => {
  async function init() {
    Admin.initSidebar();
    const [statsR, chartR, llR, tickR, payR, auditR, maintR] =
      await Promise.all([
        Admin.api("GET", "/admin/stats"),
        Admin.api("GET", "/admin/revenue_chart"),
        Admin.api("GET", "/admin/top_landlords"),
        Admin.api("GET", "/admin/tickets"),
        Admin.api("GET", "/admin/payments"),
        Admin.api("GET", "/admin/audit"),
        Admin.api("GET", "/admin/maintenance"),
      ]);
    renderStats(statsR.data);
    renderChart(chartR.data);
    renderTopLandlords(llR.data);
    renderTickets(tickR.data);
    renderPayments(payR.data);
    renderActivity(auditR.data);
  }

  function renderStats(s) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("kpiUsers", s.total_users);
    set("kpiLandlords", s.landlords);
    set("kpiTenants", s.tenants);
    set("kpiPlazas", s.plazas);
    set("kpiUnits", s.units);
    set("kpiOccupancy", Admin.fmt.pct(s.occupancy));
    set("kpiRevenue", Admin.fmt.currency(s.revenue_mtd));
    set("kpiOverdue", s.overdue_count);
    set("kpiTickets", s.open_tickets);
    set("statActiveUsers", s.total_users - (s.suspended || 0));
    set("statRevenue", Admin.fmt.currency(s.revenue_mtd));
    set("statMaint", s.open_maintenance);
    set("statCollect", Admin.fmt.pct(s.collection_rate));
    set("dmOpen", s.open_maintenance);
    set("dmProgress", s.in_progress_maintenance);
    set("dmResolved", s.resolved_maintenance);
    const sub = document.getElementById("welcomeSub");
    if (sub)
      sub.textContent = `${s.total_users} users · ${s.plazas} plazas · ${Admin.fmt.pct(s.occupancy)} occupancy`;
  }

  function renderChart(data) {
    const el = document.getElementById("revenueChart");
    if (!el) return;
    const max = Math.max(...data.map((d) => d.value));
    el.innerHTML = data
      .map((d) => {
        const h = Math.max(6, Math.round((d.value / max) * 140));
        return `<div class="bar-col">
        <div class="bar-val">${Admin.fmt.currency(d.value).replace("GHS ", "")}</div>
        <div class="bar-wrap"><div class="bar-fill" style="height:${h}px"></div></div>
        <div class="bar-label">${d.month}</div>
      </div>`;
      })
      .join("");
  }

  function renderTopLandlords(data) {
    const tb = document.getElementById("topLandlordsBody");
    if (!tb) return;
    tb.innerHTML = data
      .map(
        (ll, i) => `
      <tr>
        <td><span style="font-weight:800;color:${i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : "var(--text-muted)"}">#${i + 1}</span></td>
        <td><div style="font-weight:700">${ll.name}</div></td>
        <td>${ll.plazas}</td>
        <td>${ll.tenants}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(ll.revenue)}</td>
      </tr>`,
      )
      .join("");
  }

  function renderTickets(data) {
    const el = document.getElementById("dashTickets");
    if (!el) return;
    const open = data
      .filter((t) => t.status === "open" || t.status === "in_progress")
      .slice(0, 4);
    if (!open.length) {
      el.innerHTML =
        '<div class="empty-state" style="padding:20px"><i class="bi bi-check-circle"></i><p>No open tickets</p></div>';
      return;
    }
    el.innerHTML = open
      .map(
        (t) => `
      <div class="ticket-row">
        <div class="t-avatar">${Admin.fmt.initials(t.user)}</div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.subject}</div>
          <div style="font-size:.72rem;color:var(--text-muted)">${t.user} · ${t.category}</div>
        </div>
        ${Admin.badge(t.priority)}
      </div>`,
      )
      .join("");
  }

  function renderPayments(data) {
    const tb = document.getElementById("recentPaymentsBody");
    if (!tb) return;
    tb.innerHTML = data
      .slice(0, 5)
      .map(
        (p) => `
      <tr>
        <td style="font-weight:700">${p.tenant_name}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(p.amount)}</td>
        <td><span style="font-size:.75rem;color:var(--text-muted)">${(p.method || "").replace(/_/g, " ")}</span></td>
        <td>${Admin.badge(p.status)}</td>
      </tr>`,
      )
      .join("");
  }

  function renderActivity(data) {
    const el = document.getElementById("activityFeed");
    if (!el) return;
    const colors = {
      login: "var(--primary)",
      create: "var(--success)",
      update: "var(--warning)",
      delete: "var(--danger)",
      security: "var(--danger)",
    };
    el.innerHTML = data
      .slice(0, 6)
      .map(
        (a) => `
      <div class="activity-row">
        <div class="activity-dot" style="background:${colors[a.action] || "var(--primary)"}"></div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.description}</div>
          <div style="font-size:.72rem;color:var(--text-muted)">${a.actor} · ${Admin.fmt.timeAgo(a.time)}</div>
        </div>
      </div>`,
      )
      .join("");
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
    all = r.data || [];
    filtered = [...all];
    renderStats();
    render();
    loadLandlordDropdown();
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
          u.name.toLowerCase().includes(q) ||
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
          const col = Admin.avatarColor(u.name);
          return `<tr class="user-row">
          <td><div style="width:36px;height:36px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.75rem">${Admin.fmt.initials(u.name)}</div></td>
          <td><div style="font-weight:700">${u.name}</div></td>
          <td style="color:var(--text-muted);font-size:.8rem">${u.email}</td>
          <td>${Admin.badge(u.role === "landlord" ? "active" : u.role === "admin" ? "in_progress" : "closed").replace(u.role === "landlord" ? "active" : u.role === "admin" ? "in_progress" : "closed", u.role)}<span class="badge-status ${u.role === "landlord" ? "badge-active" : u.role === "admin" ? "badge-in-progress" : "badge-closed"}">${u.role}</span></td>
          <td style="font-size:.8rem;color:var(--text-muted)">${u.phone || "—"}</td>
          <td style="font-size:.8rem">${Admin.fmt.date(u.joined)}</td>
          <td style="font-size:.8rem;color:var(--text-muted)">${Admin.fmt.timeAgo(u.last_login)}</td>
          <td>${Admin.badge(u.status)}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-xs" onclick="AdminUsers.viewUser(${u.id})"><i class="bi bi-eye"></i></button>
              <button class="btn ${u.status === "suspended" ? "btn-outline-success" : "btn-outline-warning"} btn-xs" onclick="AdminUsers.toggleStatus(${u.id})" title="${u.status === "suspended" ? "Unsuspend" : "Suspend"}"><i class="bi bi-${u.status === "suspended" ? "unlock" : "slash-circle"}"></i></button>
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
    const body = document.getElementById("viewUserBody");
    if (body) {
      const col = Admin.avatarColor(u.name);
      body.innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-4">
          <div style="width:56px;height:56px;border-radius:50%;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800">${Admin.fmt.initials(u.name)}</div>
          <div>
            <div style="font-size:1.1rem;font-weight:800">${u.name}</div>
            <div style="font-size:.85rem;color:var(--text-muted)">${u.email}</div>
            <div class="mt-1">${Admin.badge(u.status)}</div>
          </div>
        </div>
        <div class="row g-3">
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">ROLE</div><div style="font-weight:700;margin-top:2px">${u.role}</div></div>
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">PHONE</div><div style="font-weight:700;margin-top:2px">${u.phone || "—"}</div></div>
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">JOINED</div><div style="font-weight:700;margin-top:2px">${Admin.fmt.date(u.joined)}</div></div>
          <div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">LAST LOGIN</div><div style="font-weight:700;margin-top:2px">${Admin.fmt.timeAgo(u.last_login)}</div></div>
          ${
            u.role === "landlord"
              ? `<div class="col-6"><div style="font-size:.75rem;color:var(--text-muted);font-weight:700">PLAZAS</div><div style="font-weight:700;margin-top:2px">${u.plazas}</div></div>
          <div class="col-6"><div style="font-size:.75px;color:var(--text-muted);font-weight:700">TENANTS</div><div style="font-weight:700;margin-top:2px">${u.tenants}</div></div>`
              : ""
          }
        </div>`;
    }
    const btn = document.getElementById("suspendBtn");
    if (btn) {
      btn.textContent = u.status === "suspended" ? "Unsuspend" : "Suspend";
      btn.className = `btn btn-sm ${u.status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`;
    }
    const m = bootstrap.Modal.getOrCreateInstance(
      document.getElementById("viewUserModal"),
    );
    m.show();
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
    Admin.confirm(
      `${u.status === "suspended" ? "Unsuspend" : "Suspend"} ${u.name}?`,
      () => {
        u.status = u.status === "suspended" ? "active" : "suspended";
        Admin.toast(
          `${u.name} ${u.status === "active" ? "unsuspended" : "suspended"}`,
          u.status === "active" ? "success" : "warning",
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
      `Permanently delete ${u.name}? This cannot be undone.`,
      () => {
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
      rows.push([u.id, u.name, u.email, u.role, u.status, u.joined]),
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

  function loadLandlordDropdown() {}

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
    all = r.data || [];
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
      .reduce((s, p) => s + p.amount, 0);
    set("sumTotal", Admin.fmt.currency(total));
  }

  function filter() {
    const q = (document.getElementById("paySearch")?.value || "").toLowerCase();
    const stat = document.getElementById("payStatusFilter")?.value || "";
    const meth = document.getElementById("payMethodFilter")?.value || "";
    filtered = all.filter(
      (p) =>
        (!q ||
          p.tenant_name.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q) ||
          (p.plaza_name || "").toLowerCase().includes(q)) &&
        (!stat || p.status === stat) &&
        (!meth || p.method === meth),
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
      const methodIcon = {
        momo: "bi-phone",
        bank: "bi-bank2",
        vodafone_cash: "bi-phone-fill",
        airteltigo: "bi-phone-vibrate",
        cash: "bi-cash",
      };
      tb.innerHTML = slice
        .map(
          (p) => `
        <tr>
          <td><code style="font-size:.75rem;color:var(--text-muted)">${p.ref}</code></td>
          <td style="font-weight:700">${p.tenant_name}</td>
          <td style="font-size:.8rem">${p.plaza_name} <span style="color:var(--text-muted)">·</span> <span style="font-weight:700">${p.unit}</span></td>
          <td><span class="method-badge"><i class="bi ${methodIcon[p.method] || "bi-credit-card"} me-1"></i>${(p.method || "").replace(/_/g, " ")}</span></td>
          <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(p.amount)}</td>
          <td style="font-size:.8rem">${Admin.fmt.date(p.date)}</td>
          <td>${Admin.badge(p.status)}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-xs" onclick="AdminPayments.viewPayment(${p.id})"><i class="bi bi-eye"></i></button>
              ${p.status !== "paid" ? `<button class="btn btn-outline-success btn-xs" onclick="AdminPayments.markPaid(${p.id})" title="Mark paid"><i class="bi bi-check2"></i></button>` : ""}
            </div>
          </td>
        </tr>`,
        )
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
        <div class="col-6"><div class="form-label">Reference</div><code style="font-size:.85rem">${p.ref}</code></div>
        <div class="col-6"><div class="form-label">Status</div>${Admin.badge(p.status)}</div>
        <div class="col-6"><div class="form-label">Tenant</div><strong>${p.tenant_name}</strong></div>
        <div class="col-6"><div class="form-label">Amount</div><strong style="color:var(--success-text)">${Admin.fmt.currency(p.amount)}</strong></div>
        <div class="col-6"><div class="form-label">Plaza / Unit</div>${p.plaza_name} · ${p.unit}</div>
        <div class="col-6"><div class="form-label">Method</div>${(p.method || "").replace(/_/g, " ")}</div>
        <div class="col-6"><div class="form-label">Date</div>${Admin.fmt.date(p.date)}</div>
      </div>`;
    const btn = document.getElementById("markPaidBtn");
    if (btn) btn.style.display = p.status === "paid" ? "none" : "";
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("viewPaymentModal"),
    ).show();
  }

  function markPaidModal() {
    if (selectedId) markPaid(selectedId);
    bootstrap.Modal.getInstance(
      document.getElementById("viewPaymentModal"),
    )?.hide();
  }

  function markPaid(id) {
    const p = all.find((x) => x.id === id);
    if (!p) return;
    Admin.confirm(`Mark ${p.ref} as paid?`, () => {
      p.status = "paid";
      Admin.toast("Payment marked as paid", "success");
      renderSummary();
      render();
    });
  }

  function exportCsv() {
    const rows = [
      ["Ref", "Tenant", "Plaza", "Unit", "Method", "Amount", "Date", "Status"],
    ];
    filtered.forEach((p) =>
      rows.push([
        p.ref,
        p.tenant_name,
        p.plaza_name,
        p.unit,
        p.method,
        p.amount,
        p.date,
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
   MODULE: AdminPlazas
   ───────────────────────────────────────────────────────────── */
const AdminPlazas = (() => {
  let all = [],
    filtered = [];
  let viewMode = "grid";
  let selectedId = null;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/plazas");
    all = r.data || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    const totalUnits = all.reduce((s, p) => s + p.total_units, 0);
    const occupied = all.reduce((s, p) => s + p.occupied_units, 0);
    set("plazaTotal", all.length);
    set("plazaUnits", totalUnits);
    set("plazaOccupied", occupied);
    set("plazaVacant", totalUnits - occupied);
  }

  function filter() {
    const q = (
      document.getElementById("plazaSearch")?.value || ""
    ).toLowerCase();
    const occ = document.getElementById("occupancyFilter")?.value || "";
    filtered = all.filter((p) => {
      const rate = p.occupied_units / p.total_units;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.landlord_name || "").toLowerCase().includes(q);
      const matchO =
        !occ ||
        (occ === "full" && rate === 1) ||
        (occ === "high" && rate >= 0.7 && rate < 1) ||
        (occ === "low" && rate < 0.7 && rate > 0) ||
        (occ === "empty" && rate === 0);
      return matchQ && matchO;
    });
    render();
  }

  function clearFilters() {
    ["plazaSearch", "occupancyFilter"].forEach((id) => {
      const e = document.getElementById(id);
      if (e) e.value = "";
    });
    filtered = [...all];
    render();
  }

  function setView(mode) {
    viewMode = mode;
    document
      .getElementById("gridBtn")
      ?.classList.toggle("active", mode === "grid");
    document
      .getElementById("listBtn")
      ?.classList.toggle("active", mode === "list");
    document.getElementById("plazasGrid").style.display =
      mode === "grid" ? "" : "none";
    document.getElementById("plazasList").style.display =
      mode === "list" ? "" : "none";
    render();
  }

  function render() {
    if (viewMode === "grid") renderGrid();
    else renderList();
  }

  function renderGrid() {
    const el = document.getElementById("plazasGrid");
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML =
        '<div class="col-12"><div class="empty-state" style="padding:40px"><i class="bi bi-buildings"></i><p>No plazas found</p></div></div>';
      return;
    }
    el.innerHTML = filtered
      .map((p) => {
        const rate = p.total_units
          ? (p.occupied_units / p.total_units) * 100
          : 0;
        const barColor =
          rate >= 80
            ? "var(--success)"
            : rate >= 50
              ? "var(--warning)"
              : "var(--danger)";
        return `<div class="col-md-6 col-xl-4">
        <div class="plaza-card" onclick="AdminPlazas.viewPlaza(${p.id})">
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="plaza-icon"><i class="bi bi-buildings"></i></div>
            <div style="min-width:0;flex:1">
              <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
              <div style="font-size:.78rem;color:var(--text-muted)">${p.location}</div>
            </div>
          </div>
          <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:4px">Landlord: <strong style="color:var(--text-main)">${p.landlord_name}</strong></div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <div><span style="font-size:.72rem;color:var(--text-muted)">OCCUPANCY</span><div style="font-weight:800">${p.occupied_units}/${p.total_units} units</div></div>
            <div style="text-align:right"><span style="font-size:.72rem;color:var(--text-muted)">REVENUE</span><div style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(p.revenue)}</div></div>
          </div>
          <div class="occ-bar" style="margin-top:10px"><div class="occ-fill" style="width:${rate}%;background:${barColor}"></div></div>
          <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">${rate.toFixed(0)}% occupied</div>
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
        const rate = p.total_units
          ? (p.occupied_units / p.total_units) * 100
          : 0;
        const barColor =
          rate >= 80
            ? "var(--success)"
            : rate >= 50
              ? "var(--warning)"
              : "var(--danger)";
        return `<tr>
        <td style="font-weight:700">${p.name}</td>
        <td>${p.landlord_name}</td>
        <td style="font-size:.8rem;color:var(--text-muted)">${p.location}</td>
        <td>${p.total_units}</td>
        <td>${p.occupied_units}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="width:${rate}%;height:100%;background:${barColor};border-radius:3px"></div>
            </div>
            <span style="font-size:.75rem;font-weight:700">${rate.toFixed(0)}%</span>
          </div>
        </td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(p.revenue)}</td>
        <td><button class="btn btn-outline-secondary btn-xs" onclick="AdminPlazas.viewPlaza(${p.id})"><i class="bi bi-eye"></i></button></td>
      </tr>`;
      })
      .join("");
  }

  function viewPlaza(id) {
    selectedId = id;
    const p = all.find((x) => x.id === id);
    if (!p) return;
    const body = document.getElementById("viewPlazaBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <div class="form-label">Plaza Name</div>
          <input type="text" class="form-control" id="editPlazaName" value="${p.name}"/>
        </div>
        <div class="col-12">
          <div class="form-label">Location</div>
          <input type="text" class="form-control" id="editPlazaLocation" value="${p.location}"/>
        </div>
        <div class="col-6"><div class="form-label">Landlord</div><div style="font-weight:700;margin-top:4px">${p.landlord_name}</div></div>
        <div class="col-6"><div class="form-label">Total Units</div><div style="font-weight:700;margin-top:4px">${p.total_units}</div></div>
        <div class="col-6"><div class="form-label">Occupied</div><div style="font-weight:700;color:var(--success-text);margin-top:4px">${p.occupied_units}</div></div>
        <div class="col-6"><div class="form-label">Revenue MTD</div><div style="font-weight:800;color:var(--success-text);margin-top:4px">${Admin.fmt.currency(p.revenue)}</div></div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("viewPlazaModal"),
    ).show();
  }

  function savePlaza() {
    const p = all.find((x) => x.id === selectedId);
    if (!p) return;
    p.name = document.getElementById("editPlazaName")?.value || p.name;
    p.location =
      document.getElementById("editPlazaLocation")?.value || p.location;
    Admin.toast("Plaza updated", "success");
    render();
    bootstrap.Modal.getInstance(
      document.getElementById("viewPlazaModal"),
    )?.hide();
  }

  return { init, filter, clearFilters, setView, render, viewPlaza, savePlaza };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminReports
   ───────────────────────────────────────────────────────────── */
const AdminReports = (() => {
  async function init() {
    Admin.initSidebar();
    const [statsR, chartR, llR, maintR, payR] = await Promise.all([
      Admin.api("GET", "/admin/stats"),
      Admin.api("GET", "/admin/revenue_chart"),
      Admin.api("GET", "/admin/top_landlords"),
      Admin.api("GET", "/admin/maintenance"),
      Admin.api("GET", "/admin/payments"),
    ]);
    renderKPIs(statsR.data);
    renderChart(chartR.data);
    renderTopLandlords(llR.data);
    renderMaintenance(maintR.data);
    renderPaymentMethods(payR.data);
  }

  function renderKPIs(s) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("rRevenue", Admin.fmt.currency(s.revenue_mtd));
    set("rRevenueDelta", "+8.4% vs last month");
    set("rUsers", s.total_users);
    set("rUsersDelta", "+12 this month");
    set("rOccupancy", Admin.fmt.pct(s.occupancy));
    set("rOccDelta", "+1.2% this month");
    set("rCollection", Admin.fmt.pct(s.collection_rate));
    set("rCollDelta", "+2.1% this month");
  }

  function renderChart(data) {
    const el = document.getElementById("reportsRevenueChart");
    if (!el) return;
    const max = Math.max(...data.map((d) => d.value));
    el.style.display = "flex";
    el.style.alignItems = "flex-end";
    el.style.gap = "10px";
    el.innerHTML = data
      .map((d) => {
        const h = Math.max(8, Math.round((d.value / max) * 160));
        return `<div class="bar-col">
        <div class="bar-val">${Admin.fmt.currency(d.value).replace("GHS ", "")}</div>
        <div class="bar-wrap" style="height:160px"><div class="bar-fill" style="height:${h}px"></div></div>
        <div class="bar-label">${d.month}</div>
      </div>`;
      })
      .join("");
  }

  function renderTopLandlords(data) {
    const tb = document.getElementById("rTopLandlords");
    if (!tb) return;
    tb.innerHTML = data
      .map(
        (ll, i) => `
      <tr>
        <td style="font-weight:800;color:${i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "var(--text-muted)"}">#${i + 1}</td>
        <td style="font-weight:700">${ll.name}</td>
        <td>${ll.plazas}</td>
        <td>${ll.tenants}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(ll.revenue)}</td>
        <td class="trend-up"><i class="bi bi-arrow-up-short"></i>+${(Math.random() * 15 + 2).toFixed(1)}%</td>
      </tr>`,
      )
      .join("");
  }

  function renderMaintenance(data) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("rMaintOpen", data.filter((m) => m.status === "open").length);
    set(
      "rMaintProgress",
      data.filter((m) => m.status === "in_progress").length,
    );
    set("rMaintResolved", data.filter((m) => m.status === "resolved").length);
    set("rMaintAvg", "2.4d");
  }

  function renderPaymentMethods(data) {
    const tb = document.getElementById("rPayMethods");
    if (!tb) return;
    const methodMap = {};
    data.forEach((p) => {
      methodMap[p.method] = methodMap[p.method] || { count: 0, total: 0 };
      methodMap[p.method].count++;
      methodMap[p.method].total += p.amount;
    });
    const total = Object.values(methodMap).reduce((s, v) => s + v.total, 0);
    const methods = [
      { name: "MTN MoMo", key: "momo" },
      { name: "Bank Transfer", key: "bank" },
      { name: "Vodafone Cash", key: "vodafone_cash" },
      { name: "AirtelTigo", key: "airteltigo" },
      { name: "Cash", key: "cash" },
    ];
    tb.innerHTML = methods
      .map((m) => {
        const d = methodMap[m.key] || { count: 0, total: 0 };
        const share = total ? ((d.total / total) * 100).toFixed(1) : "0.0";
        return `<tr>
        <td style="font-weight:700">${m.name}</td>
        <td>${d.count}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(d.total)}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div style="width:80px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${share}%;height:100%;background:var(--primary);border-radius:3px"></div></div><span style="font-size:.75rem;font-weight:700">${share}%</span></div></td>
        <td class="trend-up"><i class="bi bi-arrow-up-short"></i></td>
      </tr>`;
      })
      .join("");
  }

  function changePeriod() {
    Admin.toast("Period filter applied (demo)", "info");
  }

  function exportReport() {
    Admin.toast("Generating PDF report…", "info");
    setTimeout(() => Admin.toast("Report exported (demo)", "success"), 1200);
  }

  return { init, changePeriod, exportReport };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminRoles
   ───────────────────────────────────────────────────────────── */
const AdminRoles = (() => {
  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/stats");
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v + " users";
    };
    set("superAdminCount", 1);
    set("adminCount", r.data.admins || 5);
    set("landlordCount", r.data.landlords);
    set("tenantCount", r.data.tenants);
  }

  function saveAll() {
    Admin.toast("Permissions saved successfully", "success");
    const el = document.getElementById("lastSaved");
    if (el) el.textContent = new Date().toLocaleTimeString();
    Admin.setMsg(
      "rolesMsg",
      "All permission changes have been saved.",
      "success",
    );
  }

  function resetToDefaults() {
    Admin.confirm("Reset all permissions to defaults?", () => {
      // Re-check all standard permissions
      [
        "admin_view_users",
        "admin_create_users",
        "admin_delete_users",
        "admin_view_plazas",
        "admin_edit_plazas",
        "admin_manage_leases",
        "admin_view_payments",
        "admin_mark_paid",
        "admin_export_finance",
        "admin_view_audit",
        "ll_create_plaza",
        "ll_manage_units",
        "ll_manage_tenants",
        "ll_invite_codes",
        "ll_payments",
        "ll_export_payments",
        "ll_announcements",
        "ll_maintenance",
        "ll_messages",
        "t_view_lease",
        "t_pay_rent",
        "t_payment_history",
        "t_maintenance",
        "t_announcements",
        "t_messages",
        "t_receipts",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = true;
      });
      [
        "admin_settings",
        "admin_backup",
        "admin_roles",
        "feat_self_register",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
      });
      Admin.toast("Permissions reset to defaults", "info");
    });
  }

  return { init, saveAll, resetToDefaults };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminSettings
   ───────────────────────────────────────────────────────────── */
const AdminSettings = (() => {
  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/settings");
    populateForm(r.data);
  }

  function populateForm(s) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!v;
      else el.value = v || "";
    };
    set("platformName", s.platform_name);
    set("supportEmail", s.support_email);
    set("currency", s.currency);
    set("timezone", s.timezone);
    set("dateFormat", s.date_format);
    set("language", s.language);
    set("maxPlazas", s.max_plazas);
    set("maxUnits", s.max_units);
    set("maxCodes", s.max_codes);
    // features
    if (s.features)
      Object.entries(s.features).forEach(([k, v]) => set("feat_" + k, v));
    // smtp
    if (s.smtp) {
      set("smtpHost", s.smtp.host);
      set("smtpPort", s.smtp.port);
      set("smtpUser", s.smtp.user);
      set("fromName", s.smtp.from_name);
      set("fromEmail", s.smtp.from_email);
    }
    // notif
    if (s.notif)
      Object.entries(s.notif).forEach(([k, v]) => set("notif_" + k, v));
    // security
    if (s.security) {
      set("sessionTimeout", s.security.session_timeout);
      set("maxLoginAttempts", s.security.max_attempts);
      set("lockoutDuration", s.security.lockout);
      set("sec_strong_pw", s.security.strong_pw);
      set("sec_audit", s.security.audit);
      set("sec_login_alert", s.security.login_alert);
      set("sec_rate_limit", s.security.rate_limit);
    }
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
    Admin.setMsg("generalMsg", "General settings saved.", "success");
    Admin.toast("General settings saved", "success");
  }
  function savePlatform() {
    Admin.setMsg("featuresMsg", "Feature settings saved.", "success");
    Admin.toast("Platform features saved", "success");
  }
  function saveEmail() {
    Admin.setMsg("emailMsg", "Email settings saved.", "success");
    Admin.toast("Email settings saved", "success");
  }
  function saveSecurity() {
    Admin.setMsg("securityMsg", "Security settings saved.", "success");
    Admin.toast("Security settings saved", "success");
  }

  function testEmail() {
    Admin.toast(
      "Test email sent to " +
        (document.getElementById("fromEmail")?.value || ""),
      "info",
    );
  }

  function clearCache() {
    Admin.toast("Cache cleared successfully", "success");
  }

  function exportAll() {
    Admin.toast("Export started — check your email", "info");
  }

  function signOutAll() {
    Admin.confirm("Sign out all other admin sessions?", () =>
      Admin.toast("All other sessions signed out", "success"),
    );
  }

  function wipeConfirm() {
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("wipeModal"),
    ).show();
  }

  function executeWipe() {
    const confirm = document.getElementById("wipeConfirmText")?.value;
    const pass = document.getElementById("wipePassword")?.value;
    if (confirm !== "WIPE PLATFORM") {
      Admin.setMsg(
        "wipeMsg",
        "Please type WIPE PLATFORM to confirm.",
        "danger",
      );
      return;
    }
    if (!pass) {
      Admin.setMsg("wipeMsg", "Please enter your password.", "danger");
      return;
    }
    Admin.setMsg("wipeMsg", "⚠️ This is a demo — wipe is disabled.", "warning");
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

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminSupport
   ───────────────────────────────────────────────────────────── */
const AdminSupport = (() => {
  let all = [],
    filtered = [];
  let tab = "all";
  let activeId = null;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/tickets");
    all = r.data || [];
    filtered = [...all];
    renderStats();
    renderList();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("stOpen", all.filter((t) => t.status === "open").length);
    set("stProgress", all.filter((t) => t.status === "in_progress").length);
    set("stResolved", all.filter((t) => t.status === "resolved").length);
    set("stAvgTime", "2.4h");
  }

  function switchTab(name, btn) {
    tab = name;
    document
      .querySelectorAll(".ttab")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    applyFilters();
  }

  function filter() {
    applyFilters();
  }

  function applyFilters() {
    const q = (
      document.getElementById("ticketSearch")?.value || ""
    ).toLowerCase();
    const pri = document.getElementById("ticketPriority")?.value || "";
    const cat = document.getElementById("ticketCategory")?.value || "";
    filtered = all.filter((t) => {
      const matchTab =
        tab === "all" ||
        (tab === "open" &&
          (t.status === "open" || t.status === "in_progress")) ||
        tab === "mine";
      const matchQ =
        !q ||
        t.subject.toLowerCase().includes(q) ||
        t.user.toLowerCase().includes(q);
      const matchPri = !pri || t.priority === pri;
      const matchCat = !cat || t.category === cat;
      return matchTab && matchQ && matchPri && matchCat;
    });
    renderList();
  }

  function renderList() {
    const el = document.getElementById("ticketList");
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML =
        '<div class="empty-state" style="padding:40px"><i class="bi bi-headset"></i><p>No tickets found</p></div>';
      return;
    }
    el.innerHTML = filtered
      .map(
        (t) => `
      <div class="ticket-item ${activeId === t.id ? "active-ticket" : ""}" onclick="AdminSupport.openTicket(${t.id})">
        <div class="d-flex align-items-center gap-2 mb-1">
          <div class="p-dot ${t.priority}"></div>
          <div class="t-subject flex-1">${t.subject}</div>
          ${Admin.badge(t.status)}
        </div>
        <div class="d-flex align-items-center">
          <span style="font-size:.73rem;color:var(--text-muted)">${t.user} · ${t.category}</span>
          <span style="font-size:.7rem;color:var(--text-subtle);margin-left:auto">${Admin.fmt.timeAgo(t.created)}</span>
        </div>
      </div>`,
      )
      .join("");
  }

  function openTicket(id) {
    activeId = id;
    renderList();
    const t = all.find((x) => x.id === id);
    if (!t) return;
    const pane = document.getElementById("threadPane");
    if (!pane) return;
    pane.innerHTML = `
      <div class="thread-header">
        <div style="flex:1;min-width:0">
          <div class="thread-title">${t.subject}</div>
          <div class="thread-meta">
            ${Admin.badge(t.priority)} ${Admin.badge(t.status)}
            <span style="font-size:.75rem;color:var(--text-muted)">${t.user} · ${t.category}</span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <select class="form-select form-select-sm" style="width:auto" onchange="AdminSupport.updateTicketStatus(${t.id}, this.value)">
            <option value="open" ${t.status === "open" ? "selected" : ""}>Open</option>
            <option value="in_progress" ${t.status === "in_progress" ? "selected" : ""}>In Progress</option>
            <option value="resolved" ${t.status === "resolved" ? "selected" : ""}>Resolved</option>
            <option value="closed" ${t.status === "closed" ? "selected" : ""}>Closed</option>
          </select>
        </div>
      </div>
      <div class="thread-body" id="threadBody">
        ${(t.thread || [])
          .map(
            (m) => `
          <div>
            <div class="msg-bubble ${m.role === "admin" ? "admin-msg" : "user"}">${m.body}</div>
            <div class="msg-meta ${m.role === "admin" ? "right" : ""}">${m.sender} · ${Admin.fmt.timeAgo(m.time)}</div>
          </div>`,
          )
          .join("")}
      </div>
      <div class="thread-reply">
        <div class="d-flex gap-2">
          <textarea class="form-control" id="replyBox" rows="2" placeholder="Type your reply…"></textarea>
          <button class="btn btn-purple btn-sm" onclick="AdminSupport.sendReply(${t.id})" style="align-self:flex-end"><i class="bi bi-send me-1"></i>Send</button>
        </div>
      </div>`;
  }

  function sendReply(id) {
    const box = document.getElementById("replyBox");
    const txt = box?.value?.trim();
    if (!txt) return;
    const t = all.find((x) => x.id === id);
    if (!t) return;
    t.thread = t.thread || [];
    t.thread.push({
      role: "admin",
      sender: MOCK.admin.first_name + " " + MOCK.admin.last_name,
      body: txt,
      time: new Date().toISOString(),
    });
    box.value = "";
    openTicket(id);
    Admin.toast("Reply sent", "success");
  }

  function updateTicketStatus(id, status) {
    const t = all.find((x) => x.id === id);
    if (!t) return;
    t.status = status;
    renderStats();
    renderList();
    Admin.toast("Ticket status updated", "info");
  }

  function createTicket() {
    const subject = document.getElementById("newTicketSubject")?.value;
    const msg = document.getElementById("newTicketMsg")?.value;
    const priority = document.getElementById("newTicketPriority")?.value;
    const category = document.getElementById("newTicketCategory")?.value;
    if (!subject || !msg) {
      Admin.setMsg(
        "newTicketMsgAlert",
        "Please fill in subject and message.",
        "danger",
      );
      return;
    }
    const newT = {
      id: all.length + 1,
      subject,
      user: "Admin (Manual)",
      role: "admin",
      category,
      priority,
      status: "open",
      created: new Date().toISOString(),
      thread: [
        {
          role: "admin",
          sender: "Admin",
          body: msg,
          time: new Date().toISOString(),
        },
      ],
    };
    all.unshift(newT);
    filtered = [...all];
    renderStats();
    renderList();
    bootstrap.Modal.getInstance(
      document.getElementById("newTicketModal"),
    )?.hide();
    Admin.toast("Ticket created", "success");
  }

  return {
    init,
    switchTab,
    filter,
    renderList,
    openTicket,
    sendReply,
    updateTicketStatus,
    createTicket,
  };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminCodes
   ───────────────────────────────────────────────────────────── */
const AdminCodes = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;
  let revokeTarget = null;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/codes");
    all = r.data || [];
    filtered = [...all];
    renderStats();
    render();
    populateLandlordDropdowns();
  }

  function renderStats() {
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
  }

  function filter() {
    const q = (
      document.getElementById("codeSearch")?.value || ""
    ).toLowerCase();
    const stat = document.getElementById("codeStatusFilter")?.value || "";
    const ll = document.getElementById("codeLandlordFilter")?.value || "";
    filtered = all.filter(
      (c) =>
        (!q ||
          c.code.toLowerCase().includes(q) ||
          (c.landlord || "").toLowerCase().includes(q) ||
          (c.plaza || "").toLowerCase().includes(q)) &&
        (!stat || c.status === stat) &&
        (!ll || c.landlord === ll),
    );
    page = 1;
    render();
  }

  function clearFilters() {
    ["codeSearch", "codeStatusFilter", "codeLandlordFilter"].forEach((id) => {
      const e = document.getElementById(id);
      if (e) e.value = "";
    });
    filtered = [...all];
    page = 1;
    render();
  }

  function render() {
    const tb = document.getElementById("codesBody");
    const info = document.getElementById("codePaginInfo");
    const nav = document.getElementById("codePaginNav");
    if (!tb) return;
    const start = (page - 1) * PER;
    const slice = filtered.slice(start, start + PER);
    if (!slice.length) {
      tb.innerHTML =
        '<tr><td colspan="9"><div class="empty-state" style="padding:32px"><i class="bi bi-key"></i><p>No codes found</p></div></td></tr>';
      return;
    }
    tb.innerHTML = slice
      .map((c) => {
        const usePct = c.max_uses ? (c.uses / c.max_uses) * 100 : 0;
        const barCol =
          usePct === 100
            ? "var(--success)"
            : usePct > 0
              ? "var(--primary)"
              : "var(--border)";
        return `<tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <span class="code-badge">${c.code}</span>
            <button class="copy-btn" onclick="AdminCodes.copyCode('${c.code}')" title="Copy"><i class="bi bi-clipboard"></i></button>
          </div>
        </td>
        <td style="font-weight:700">${c.landlord}</td>
        <td style="font-size:.8rem">${c.plaza}</td>
        <td style="font-size:.8rem;font-weight:700">${c.unit || "Any"}</td>
        <td>
          <div style="font-size:.8rem;font-weight:700">${c.uses}/${c.max_uses}</div>
          <div class="usage-bar"><div class="usage-fill" style="width:${usePct}%;background:${barCol}"></div></div>
        </td>
        <td style="font-size:.8rem;color:var(--text-muted)">${c.claimed_by || "—"}</td>
        <td style="font-size:.8rem">${Admin.fmt.date(c.expires)}</td>
        <td>${Admin.badge(c.status)}</td>
        <td>
          <div class="d-flex gap-1">
            ${c.status === "active" ? `<button class="btn btn-outline-danger btn-xs" onclick="AdminCodes.revokeCode('${c.code}')">Revoke</button>` : ""}
            <button class="btn btn-outline-secondary btn-xs" onclick="AdminCodes.deleteCode(${c.id})"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
    if (info)
      info.textContent = `Showing ${start + 1}–${Math.min(start + PER, filtered.length)} of ${filtered.length} codes`;
    if (nav)
      nav.innerHTML =
        filtered.length > PER
          ? Admin.pagination(filtered.length, page, PER, "AdminCodes.goPage")
          : "";
  }

  function goPage(p) {
    page = p;
    render();
  }

  function copyCode(code) {
    navigator.clipboard
      ?.writeText(code)
      .then(() => Admin.toast("Code copied: " + code, "success"))
      .catch(() => Admin.toast("Code: " + code, "info"));
  }

  function revokeCode(code) {
    revokeTarget = code;
    const el = document.getElementById("revokeCodeVal");
    if (el) el.textContent = code;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("revokeModal"),
    ).show();
  }

  function confirmRevoke() {
    const c = all.find((x) => x.code === revokeTarget);
    if (!c) return;
    c.status = "revoked";
    renderStats();
    render();
    bootstrap.Modal.getInstance(document.getElementById("revokeModal"))?.hide();
    Admin.toast("Code revoked: " + revokeTarget, "warning");
  }

  function deleteCode(id) {
    Admin.confirm("Delete this invite code?", () => {
      all = all.filter((x) => x.id !== id);
      filtered = filtered.filter((x) => x.id !== id);
      renderStats();
      render();
      Admin.toast("Code deleted", "success");
    });
  }

  function populateLandlordDropdowns() {
    const landlords = [
      ...new Set(
        MOCK.users.filter((u) => u.role === "landlord").map((u) => u.full_name),
      ),
    ];
    ["genLandlord", "codeLandlordFilter"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const first = el.querySelector("option")?.outerHTML || "";
      el.innerHTML =
        first +
        landlords.map((l) => `<option value="${l}">${l}</option>`).join("");
    });
  }

  function loadLandlordPlazas() {
    const ll = document.getElementById("genLandlord")?.value;
    const pEl = document.getElementById("genPlaza");
    if (!pEl) return;
    const plazas = MOCK.plazas.filter((p) => p.landlord_name === ll);
    pEl.innerHTML =
      '<option value="">Select plaza…</option>' +
      plazas.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    document.getElementById("genUnit").innerHTML =
      '<option value="">Any unit</option>';
  }

  function loadUnits() {
    const pId = parseInt(document.getElementById("genPlaza")?.value);
    const p = MOCK.plazas.find((x) => x.id === pId);
    const uEl = document.getElementById("genUnit");
    if (!uEl) return;
    if (!p) {
      uEl.innerHTML = '<option value="">Any unit</option>';
      return;
    }
    const opts = Array.from(
      { length: p.total_units },
      (_, i) => `<option>Unit ${i + 1}</option>`,
    ).join("");
    uEl.innerHTML = '<option value="">Any unit</option>' + opts;
  }

  function randomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const a = Array.from(
      { length: 2 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    const b = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    return `${a}-${b}`;
  }

  function previewCodes() {
    const count = parseInt(document.getElementById("genCount")?.value) || 1;
    const prev = document.getElementById("genPreview");
    const container = document.getElementById("genPreviewCodes");
    if (!prev || !container) return;
    const codes = Array.from({ length: Math.min(count, 10) }, randomCode);
    container.innerHTML = codes
      .map(
        (c) =>
          `<span class="preview-code-val" style="background:var(--bg-body);border:1px solid var(--border);padding:4px 10px;border-radius:8px;font-family:monospace;font-weight:800;color:var(--primary)">${c}</span>`,
      )
      .join("");
    prev.style.display = "";
  }

  function generateCodes() {
    const ll = document.getElementById("genLandlord")?.value;
    const count = parseInt(document.getElementById("genCount")?.value) || 1;
    const max = parseInt(document.getElementById("genMaxUses")?.value) || 1;
    const exp = document.getElementById("genExpiry")?.value;
    if (!ll) {
      Admin.setMsg("genMsg", "Please select a landlord.", "danger");
      return;
    }
    const plazaId =
      parseInt(document.getElementById("genPlaza")?.value) || null;
    const plaza = MOCK.plazas.find((x) => x.id === plazaId);
    for (let i = 0; i < count; i++) {
      all.push({
        id: all.length + i + 1,
        code: randomCode(),
        landlord: ll,
        plaza: plaza?.name || "—",
        unit: document.getElementById("genUnit")?.value || "Any",
        max_uses: max,
        uses: 0,
        claimed_by: null,
        expires: exp || null,
        status: "active",
      });
    }
    filtered = [...all];
    renderStats();
    render();
    bootstrap.Modal.getInstance(
      document.getElementById("generateModal"),
    )?.hide();
    Admin.toast(
      `${count} invite code${count > 1 ? "s" : ""} generated`,
      "success",
    );
  }

  function exportCsv() {
    const rows = [
      [
        "Code",
        "Landlord",
        "Plaza",
        "Unit",
        "Max Uses",
        "Uses",
        "Status",
        "Expires",
      ],
    ];
    filtered.forEach((c) =>
      rows.push([
        c.code,
        c.landlord,
        c.plaza,
        c.unit,
        c.max_uses,
        c.uses,
        c.status,
        c.expires || "",
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "invite_codes.csv";
    a.click();
    Admin.toast("CSV downloaded", "success");
  }

  return {
    init,
    filter,
    clearFilters,
    render,
    goPage,
    copyCode,
    revokeCode,
    confirmRevoke,
    deleteCode,
    loadLandlordPlazas,
    loadUnits,
    previewCodes,
    generateCodes,
    exportCsv,
  };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminHealth
   ───────────────────────────────────────────────────────────── */
const AdminHealth = (() => {
  async function init() {
    Admin.initSidebar();
    await refresh();
  }

  async function refresh() {
    const r = await Admin.api("GET", "/admin/health");
    render(r.data);
    const el = document.getElementById("lastRefreshed");
    if (el) el.textContent = new Date().toLocaleTimeString();
  }

  function render(h) {
    // Banner
    const banner = document.getElementById("healthBanner");
    const icon = document.getElementById("healthIcon");
    const label = document.getElementById("healthLabel");
    const sub = document.getElementById("healthSub");
    const downsvc = h.services.filter((s) => s.status === "down").length;
    const warnsvc = h.services.filter((s) => s.status === "warn").length;
    const overall = downsvc > 0 ? "down" : warnsvc > 0 ? "warn" : "ok";
    if (banner) {
      banner.className = "health-banner " + overall;
    }
    if (icon) {
      icon.className =
        "health-status-icon bi bi-" +
        (overall === "ok"
          ? "check-circle-fill text-success"
          : overall === "warn"
            ? "exclamation-triangle-fill text-warning"
            : "x-circle-fill text-danger");
    }
    if (label)
      label.textContent =
        overall === "ok"
          ? "All Systems Operational"
          : overall === "warn"
            ? "Degraded Performance"
            : "Service Disruption";
    if (sub)
      sub.textContent = `${h.services.filter((s) => s.status === "ok").length}/${h.services.length} services running normally`;

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("hUptime", h.uptime_30d + "%");
    set("hLatency", h.avg_latency + "ms");
    set(
      "hServicesOk",
      h.services.filter((s) => s.status === "ok").length +
        "/" +
        h.services.length,
    );

    // Resources
    setResource("rCpu", h.cpu + "%", h.cpu, "rCpuBar");
    setResource("rMem", h.mem + "%", h.mem, "rMemBar");
    setResource("rDisk", h.disk + "%", h.disk, "rDiskBar");
    const apiPct = Math.min(100, Math.round(h.api_ms / 10));
    setResource("rApi", h.api_ms + "ms", apiPct, "rApiBar");

    // Services list
    const sl = document.getElementById("servicesList");
    if (sl)
      sl.innerHTML = h.services
        .map(
          (s) => `
      <div class="service-card">
        <div class="service-pulse ${s.status}"></div>
        <div class="service-name">${s.name}</div>
        <div class="service-latency">${s.latency ? s.latency + "ms" : "—"}</div>
        ${Admin.badge(s.status)}
      </div>`,
        )
        .join("");

    // Quick stats
    set("qsSessions", h.sessions);
    set("qsRequests", h.api_requests.toLocaleString());
    set("qsErrors", h.errors_24h);
    set("qsDbConn", h.db_connections);
    set("qsLastBackup", "Today 03:00");
    set("qsServerUp", h.server_uptime);

    // Services subtitle
    const ss = document.getElementById("servicesSubtitle");
    if (ss)
      ss.textContent =
        h.services.filter((s) => s.status === "ok").length +
        " healthy, " +
        (warnsvc + downsvc) +
        " need attention";

    // Uptime bar
    renderUptimeBar();
  }

  function setResource(valId, valText, pct, barId) {
    const vEl = document.getElementById(valId);
    const bEl = document.getElementById(barId);
    if (vEl) vEl.textContent = valText;
    if (bEl) {
      bEl.style.width = pct + "%";
      bEl.className =
        "metric-bar-fill " + (pct >= 80 ? "bad" : pct >= 60 ? "warn" : "ok");
    }
  }

  function renderUptimeBar() {
    const el = document.getElementById("uptimeBar");
    if (!el) return;
    const ticks = Array.from({ length: 30 }, (_, i) => {
      const r = Math.random();
      return r > 0.96 ? "down" : r > 0.88 ? "warn" : "ok";
    });
    el.innerHTML = ticks
      .map(
        (s, i) =>
          `<div class="uptime-tick ${s}" title="Day ${30 - i}: ${s}" style="flex:1"></div>`,
      )
      .join("");
  }

  return { init, refresh };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminProfile
   ───────────────────────────────────────────────────────────── */
const AdminProfile = (() => {
  async function init() {
    Admin.initSidebar();
    const [profR, sessR, auditR] = await Promise.all([
      Admin.api("GET", "/admin/profile"),
      Admin.api("GET", "/admin/sessions"),
      Admin.api("GET", "/admin/audit"),
    ]);
    renderProfile(profR.data);
    renderActivity(auditR.data);
    populateForm(profR.data);
    renderSessions(sessR.data);
    render2FA(profR.data.two_fa);
  }

  function renderProfile(p) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("profileName", p.first_name + " " + p.last_name);
    set(
      "profileInitials",
      Admin.fmt.initials(p.first_name + " " + p.last_name),
    );
    set("profileEmail", p.email);
    set("profileRoleLabel", p.role.replace(/_/g, " "));
    set("pstatActions", p.actions);
    set("pstatDays", p.days_active);
    set("pstatLogins", p.logins);
    const sn = document.getElementById("sidebarName");
    if (sn) sn.textContent = p.first_name + " " + p.last_name;
    const sa = document.getElementById("sidebarAvatar");
    if (sa)
      sa.textContent = Admin.fmt.initials(p.first_name + " " + p.last_name);
  }

  function populateForm(p) {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v || "";
    };
    set("infoFirstName", p.first_name);
    set("infoLastName", p.last_name);
    set("infoEmail", p.email);
    set("infoPhone", p.phone);
    set("infoTimezone", p.timezone);
    set("infoLanguage", p.language);
    set("infoBio", p.bio);
  }

  function renderActivity(data) {
    const el = document.getElementById("profileActivity");
    if (!el) return;
    const colors = {
      login: "var(--primary)",
      create: "var(--success)",
      update: "var(--warning)",
      delete: "var(--danger)",
      security: "var(--danger)",
    };
    el.innerHTML = data
      .slice(0, 4)
      .map(
        (a) => `
      <div class="activity-item">
        <div style="width:28px;height:28px;border-radius:8px;background:rgba(37,99,235,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="bi bi-${a.action === "login" ? "box-arrow-in-right" : a.action === "create" ? "plus" : "pencil"}" style="font-size:.75rem;color:${colors[a.action] || "var(--primary)"}"></i>
        </div>
        <div style="min-width:0;flex:1">
          <div style="font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.description}</div>
          <div style="font-size:.7rem;color:var(--text-muted)">${Admin.fmt.timeAgo(a.time)}</div>
        </div>
      </div>`,
      )
      .join("");
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
    const first = document.getElementById("infoFirstName")?.value;
    const last = document.getElementById("infoLastName")?.value;
    if (!first || !last) {
      Admin.setMsg("infoMsg", "First and last name are required.", "danger");
      return;
    }
    MOCK.admin.first_name = first;
    MOCK.admin.last_name = last;
    MOCK.admin.email =
      document.getElementById("infoEmail")?.value || MOCK.admin.email;
    MOCK.admin.phone =
      document.getElementById("infoPhone")?.value || MOCK.admin.phone;
    const nm = document.getElementById("profileName");
    if (nm) nm.textContent = first + " " + last;
    const sn = document.getElementById("sidebarName");
    if (sn) sn.textContent = first + " " + last;
    Admin.setMsg("infoMsg", "Profile updated successfully.", "success");
    Admin.toast("Profile saved", "success");
  }

  function checkPwStrength() {
    const pw = document.getElementById("newPw")?.value || "";
    const bar = document.getElementById("pwStrengthBar");
    const lbl = document.getElementById("pwStrengthLabel");
    if (!bar || !lbl) return;
    if (!pw) {
      bar.style.display = "none";
      lbl.textContent = "";
      return;
    }
    bar.style.display = "block";
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
    lbl.textContent = labels[score] || "Weak";
    lbl.style.color = colors[lvl] || "var(--danger)";
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
      Admin.setMsg("passwordMsg", "New passwords do not match.", "danger");
      return;
    }
    if (nw.length < 8) {
      Admin.setMsg(
        "passwordMsg",
        "Password must be at least 8 characters.",
        "danger",
      );
      return;
    }
    ["currentPw", "newPw", "confirmPw"].forEach((id) => {
      const e = document.getElementById(id);
      if (e) e.value = "";
    });
    Admin.setMsg("passwordMsg", "Password changed successfully.", "success");
    Admin.toast("Password updated", "success");
  }

  function render2FA(enabled) {
    const badge = document.getElementById("tfaStatusBadge");
    const setup = document.getElementById("tfaSetup");
    const enabDiv = document.getElementById("tfaEnabled");
    const enBtn = document.getElementById("tfaEnableBtn");
    const disBtn = document.getElementById("tfaDisableBtn");
    if (badge) {
      badge.textContent = enabled ? "Enabled" : "Disabled";
      badge.className =
        "badge-status " + (enabled ? "badge-active" : "badge-closed");
    }
    if (setup) setup.style.display = "none";
    if (enabDiv) enabDiv.style.display = enabled ? "" : "none";
    if (enBtn) enBtn.style.display = enabled ? "none" : "";
    if (disBtn) disBtn.style.display = enabled ? "" : "none";
  }

  function showTFASetup() {
    const setup = document.getElementById("tfaSetup");
    if (setup) setup.style.display = "";
    const key = document.getElementById("tfaManualKey");
    if (key)
      key.textContent = Array.from({ length: 4 }, () =>
        Array.from(
          { length: 4 },
          () =>
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)],
        ).join(""),
      ).join(" ");
  }

  function enableTFA() {
    const code = document.getElementById("tfaCode")?.value;
    if (!code || code.length !== 6) {
      Admin.setMsg("tfaMsg", "Please enter a 6-digit code.", "danger");
      return;
    }
    MOCK.admin.two_fa = true;
    render2FA(true);
    Admin.setMsg("tfaMsg", "Two-factor authentication enabled.", "success");
    Admin.toast("2FA enabled", "success");
  }

  function disableTFA() {
    Admin.confirm("Disable two-factor authentication?", () => {
      MOCK.admin.two_fa = false;
      render2FA(false);
      Admin.toast("2FA disabled", "warning");
    });
  }

  function renderSessions(data) {
    const el = document.getElementById("sessionsList");
    if (!el) return;
    el.innerHTML = data
      .map(
        (s) => `
      <div class="session-card ${s.current ? "current" : ""}">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px">
            <i class="bi bi-${s.device.includes("Mobile") || s.device.includes("iPhone") || s.device.includes("Android") ? "phone" : "display"}" style="color:var(--primary)"></i>
            <span style="font-weight:700">${s.device}</span>
            ${s.current ? '<span class="badge-status badge-active" style="font-size:.65rem">Current</span>' : ""}
          </div>
          <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">${s.location} · ${s.ip} · ${s.last_active}</div>
        </div>
        ${!s.current ? `<button class="btn btn-outline-danger btn-xs" onclick="AdminProfile.revokeSession('${s.id}')">Sign Out</button>` : ""}
      </div>`,
      )
      .join("");
  }

  function revokeSession(id) {
    Admin.confirm("Sign out this session?", () => {
      Admin.toast("Session signed out", "success");
      const el = document.getElementById("sessionsList");
      if (el) {
        const card = el
          .querySelector(`[onclick*="${id}"]`)
          ?.closest(".session-card");
        if (card) card.remove();
      }
    });
  }

  function revokeAllSessions() {
    Admin.confirm("Sign out all other sessions?", () => {
      const el = document.getElementById("sessionsList");
      if (el)
        el.querySelectorAll(".session-card:not(.current)").forEach((c) =>
          c.remove(),
        );
      Admin.toast("All other sessions signed out", "success");
    });
  }

  function uploadAvatar(input) {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const av = document.getElementById("profileAvatar");
      if (av) {
        let img = av.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          av.appendChild(img);
        }
        img.src = e.target.result;
        const span = av.querySelector("span");
        if (span) span.style.display = "none";
      }
      Admin.toast("Avatar updated", "success");
    };
    reader.readAsDataURL(file);
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

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminAudit (audit-log.html)
   ───────────────────────────────────────────────────────────── */
const AdminAudit = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 15;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/audit");
    all = r.data || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    const today = new Date().toDateString();
    set("auditTotal", all.length);
    set("auditLogins", all.filter((a) => a.action === "login").length);
    set(
      "auditChanges",
      all.filter((a) => ["create", "update", "delete"].includes(a.action))
        .length,
    );
    set("auditSecurity", all.filter((a) => a.action === "security").length);
  }

  function filter() {
    const q = (
      document.getElementById("auditSearch")?.value || ""
    ).toLowerCase();
    const act = document.getElementById("auditAction")?.value || "";
    const role = document.getElementById("auditRole")?.value || "";
    const date = document.getElementById("auditDate")?.value || "";
    filtered = all.filter(
      (a) =>
        (!q ||
          a.actor.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.ip.includes(q)) &&
        (!act || a.action === act) &&
        (!role || a.role === role) &&
        (!date || a.time.startsWith(date)),
    );
    page = 1;
    render();
  }

  function clearFilters() {
    ["auditSearch", "auditAction", "auditRole", "auditDate"].forEach((id) => {
      const e = document.getElementById(id);
      if (e) e.value = "";
    });
    filtered = [...all];
    page = 1;
    render();
  }

  function render() {
    const tb = document.getElementById("auditBody");
    const info = document.getElementById("auditPaginInfo");
    const nav = document.getElementById("auditPaginNav");
    if (!tb) return;
    const icons = {
      login: "bi-box-arrow-in-right",
      create: "bi-plus-circle-fill",
      update: "bi-pencil-fill",
      delete: "bi-trash-fill",
      security: "bi-shield-exclamation",
    };
    const iconColors = {
      login: "var(--primary)",
      create: "var(--success)",
      update: "var(--warning)",
      delete: "var(--danger)",
      security: "var(--danger)",
    };
    const start = (page - 1) * PER;
    const slice = filtered.slice(start, start + PER);
    if (!slice.length) {
      tb.innerHTML =
        '<div class="empty-state" style="padding:32px"><i class="bi bi-journal"></i><p>No audit events found</p></div>';
      return;
    }
    tb.innerHTML = slice
      .map(
        (a) => `
      <div class="audit-row" onclick="AdminAudit.viewEvent(${a.id})">
        <div class="audit-icon" style="background:rgba(37,99,235,.1)">
          <i class="bi ${icons[a.action] || "bi-dot"}" style="color:${iconColors[a.action] || "var(--text-muted)"}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.875rem;font-weight:600">${a.description}</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${a.actor} · ${a.role} · IP: ${a.ip}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${Admin.badge(a.action)}
          <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">${Admin.fmt.timeAgo(a.time)}</div>
        </div>
      </div>`,
      )
      .join("");
    if (info)
      info.textContent = `Showing ${start + 1}–${Math.min(start + PER, filtered.length)} of ${filtered.length}`;
    if (nav)
      nav.innerHTML =
        filtered.length > PER
          ? Admin.pagination(filtered.length, page, PER, "AdminAudit.goPage")
          : "";
  }

  function goPage(p) {
    page = p;
    render();
  }

  function viewEvent(id) {
    const a = all.find((x) => x.id === id);
    if (!a) return;
    const body = document.getElementById("auditDetailBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-6"><div class="form-label">Action</div>${Admin.badge(a.action)}</div>
        <div class="col-6"><div class="form-label">Actor</div><strong>${a.actor}</strong></div>
        <div class="col-6"><div class="form-label">Role</div>${a.role}</div>
        <div class="col-6"><div class="form-label">IP Address</div><code>${a.ip}</code></div>
        <div class="col-12"><div class="form-label">Description</div>${a.description}</div>
        <div class="col-6"><div class="form-label">Timestamp</div>${Admin.fmt.datetime(a.time)}</div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("auditDetailModal"),
    )?.show();
  }

  function exportAudit() {
    const rows = [["Actor", "Role", "Action", "Description", "IP", "Time"]];
    filtered.forEach((a) =>
      rows.push([
        a.actor,
        a.role,
        a.action,
        `"${a.description}"`,
        a.ip,
        a.time,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const el = document.createElement("a");
    el.href = "data:text/csv," + encodeURIComponent(csv);
    el.download = "audit_log.csv";
    el.click();
    Admin.toast("Audit log exported", "success");
  }

  return { init, filter, clearFilters, render, goPage, viewEvent, exportAudit };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminMaintenance
   ───────────────────────────────────────────────────────────── */
const AdminMaintenance = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/maintenance");
    all = r.data || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("maintStatOpen", all.filter((m) => m.status === "open").length);
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
        <td><div class="d-flex align-items-center gap-2"><div class="priority-dot ${m.priority}"></div><div style="font-weight:700">${m.title}</div></div></td>
        <td>${m.tenant_name}</td>
        <td style="font-size:.8rem">${m.plaza_name} · ${m.unit}</td>
        <td style="font-size:.8rem;color:var(--text-muted)">${m.category}</td>
        <td>${Admin.badge(m.priority)}</td>
        <td>${Admin.badge(m.status)}</td>
        <td style="font-size:.8rem">${Admin.fmt.date(m.created)}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-xs" onclick="AdminMaintenance.viewRequest(${m.id})"><i class="bi bi-eye"></i></button>
            <select class="form-select form-select-sm" style="width:auto;padding:2px 6px;font-size:.72rem" onchange="AdminMaintenance.updateStatus(${m.id},this.value)">
              <option value="open" ${m.status === "open" ? "selected" : ""}>Open</option>
              <option value="in_progress" ${m.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="resolved" ${m.status === "resolved" ? "selected" : ""}>Resolved</option>
            </select>
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
    const m = all.find((x) => x.id === id);
    if (!m) return;
    const body = document.getElementById("maintDetailBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-12"><div class="form-label">Issue</div><strong>${m.title}</strong></div>
        <div class="col-6"><div class="form-label">Tenant</div>${m.tenant_name}</div>
        <div class="col-6"><div class="form-label">Plaza / Unit</div>${m.plaza_name} · ${m.unit}</div>
        <div class="col-6"><div class="form-label">Category</div>${m.category}</div>
        <div class="col-6"><div class="form-label">Priority</div>${Admin.badge(m.priority)}</div>
        <div class="col-6"><div class="form-label">Status</div>${Admin.badge(m.status)}</div>
        <div class="col-6"><div class="form-label">Submitted</div>${Admin.fmt.date(m.created)}</div>
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

  function exportCsv() {
    const rows = [
      [
        "Title",
        "Tenant",
        "Plaza",
        "Unit",
        "Category",
        "Priority",
        "Status",
        "Submitted",
      ],
    ];
    filtered.forEach((m) =>
      rows.push([
        m.title,
        m.tenant_name,
        m.plaza_name,
        m.unit,
        m.category,
        m.priority,
        m.status,
        m.created,
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "maintenance.csv";
    a.click();
    Admin.toast("CSV downloaded", "success");
  }

  function saveFromModal() {
    // In modal, status select has id 'maintModalStatus' if present
    const sel = document.getElementById("maintModalStatus");
    if (sel && _editId) updateStatus(_editId, sel.value);
    bootstrap.Modal.getInstance(
      document.getElementById("maintDetailModal"),
    )?.hide();
  }

  let _editId = null;
  // Override viewRequest to track current id and add editable status
  const _origView = viewRequest;
  function viewRequestEnhanced(id) {
    _editId = id;
    const m = all.find((x) => x.id === id);
    if (!m) return;
    const body = document.getElementById("maintDetailBody");
    if (body)
      body.innerHTML = `
      <div class="row g-3">
        <div class="col-12"><div class="form-label">Issue</div><strong>${m.title}</strong></div>
        <div class="col-6"><div class="form-label">Tenant</div>${m.tenant_name}</div>
        <div class="col-6"><div class="form-label">Plaza / Unit</div>${m.plaza_name} · ${m.unit}</div>
        <div class="col-6"><div class="form-label">Category</div>${m.category}</div>
        <div class="col-6"><div class="form-label">Priority</div>${Admin.badge(m.priority)}</div>
        <div class="col-6"><div class="form-label">Submitted</div>${Admin.fmt.date(m.created)}</div>
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

  return {
    init,
    filter,
    render,
    goPage,
    viewRequest: viewRequestEnhanced,
    updateStatus,
    exportCsv,
    saveFromModal,
  };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminAnnouncements
   ───────────────────────────────────────────────────────────── */
const AdminAnnouncements = (() => {
  let all = [],
    filtered = [];
  let selectedAudience = "all";

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/announcements");
    all = r.data || [];
    filtered = [...all];
    renderHistory();
  }

  function selectAudience(chip, val) {
    selectedAudience = val;
    document
      .querySelectorAll(".audience-chip")
      .forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
  }

  function filter() {
    const tag = document.getElementById("annTagFilter")?.value || "";
    filtered = all.filter((a) => !tag || a.tag === tag);
    renderHistory();
  }

  function renderHistory() {
    const el = document.getElementById("annHistory");
    if (!el) return;
    if (!filtered.length) {
      el.innerHTML =
        '<div class="empty-state" style="padding:32px"><i class="bi bi-megaphone"></i><p>No announcements yet</p></div>';
      return;
    }
    const tagColors = {
      urgent: "var(--danger-light)",
      reminder: "var(--warning-light)",
      general: "var(--primary-glow)",
    };
    const tagTextColors = {
      urgent: "var(--danger-text)",
      reminder: "var(--warning-text)",
      general: "#60a5fa",
    };
    el.innerHTML = filtered
      .map(
        (a) => `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:10px">
        <div class="d-flex align-items-start justify-content-between gap-3">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-weight:800;font-size:.9rem">${a.title}</span>
              <span style="background:${tagColors[a.tag] || "var(--primary-glow)"};color:${tagTextColors[a.tag] || "#60a5fa"};padding:2px 8px;border-radius:20px;font-size:.65rem;font-weight:800">${a.tag}</span>
            </div>
            <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:8px">${a.message}</div>
            <div style="display:flex;gap:16px;font-size:.75rem;color:var(--text-muted)">
              <span><i class="bi bi-people me-1"></i>${a.audience}</span>
              <span><i class="bi bi-send me-1"></i>${a.sent_count} sent</span>
              <span><i class="bi bi-eye me-1"></i>${a.read_rate}% read</span>
              <span><i class="bi bi-clock me-1"></i>${Admin.fmt.timeAgo(a.created)}</span>
            </div>
          </div>
        </div>
      </div>`,
      )
      .join("");
  }

  function sendAnnouncement() {
    const title = document.getElementById("annTitle")?.value;
    const msg = document.getElementById("annMessage")?.value;
    const tag = document.getElementById("annTag")?.value || "general";
    if (!title || !msg) {
      Admin.setMsg("annMsg", "Please fill in title and message.", "danger");
      return;
    }
    const newAnn = {
      id: all.length + 1,
      title,
      message: msg,
      audience: selectedAudience,
      tag,
      sent_count: MOCK.stats.total_users,
      read_rate: 0,
      created: new Date().toISOString(),
    };
    all.unshift(newAnn);
    filtered = [...all];
    renderHistory();
    if (document.getElementById("annTitle"))
      document.getElementById("annTitle").value = "";
    if (document.getElementById("annMessage"))
      document.getElementById("annMessage").value = "";
    Admin.toast("Announcement sent to " + selectedAudience, "success");
    Admin.setMsg("annMsg", "Announcement sent successfully.", "success");
  }

  return { init, selectAudience, filter, sendAnnouncement };
})();

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminNotifications
   ───────────────────────────────────────────────────────────── */
const AdminNotifications = (() => {
  let all = [],
    filtered = [];
  let tab = "all";

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/notifications");
    all = r.data || [];
    filtered = [...all];
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("notifTotal", all.length);
    set("notifUnread", all.filter((n) => !n.is_read).length);
    set("notifSecurity", all.filter((n) => n.type === "security").length);
    set("notifSystem", all.filter((n) => n.type === "system").length);
  }

  function switchTab(name, btn) {
    tab = name;
    document
      .querySelectorAll(".ntab")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    applyFilters();
  }

  function filter() {
    applyFilters();
  }

  function applyFilters() {
    const q = (
      document.getElementById("notifSearch")?.value || ""
    ).toLowerCase();
    const type = document.getElementById("notifType")?.value || "";
    filtered = all.filter(
      (n) =>
        (tab === "all" || (tab === "unread" && !n.is_read)) &&
        (!q ||
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)) &&
        (!type || n.type === type),
    );
    render();
  }

  function render() {
    const el = document.getElementById("notifList");
    if (!el) return;
    const typeIcons = {
      payment: "bi-credit-card-fill",
      user: "bi-person-fill",
      security: "bi-shield-exclamation",
      system: "bi-gear-fill",
      general: "bi-bell-fill",
    };
    const typeColors = {
      payment: "var(--success)",
      user: "var(--primary)",
      security: "var(--danger)",
      system: "var(--warning)",
      general: "var(--purple)",
    };
    if (!filtered.length) {
      el.innerHTML =
        '<div class="empty-state" style="padding:32px"><i class="bi bi-bell-slash"></i><p>No notifications</p></div>';
      return;
    }
    el.innerHTML = filtered
      .map(
        (n) => `
      <div class="d-flex align-items-start gap-3 p-3" style="border-bottom:1px solid var(--border);${!n.is_read ? "background:rgba(37,99,235,.03)" : ""}">
        <div style="width:36px;height:36px;border-radius:10px;background:${typeColors[n.type] + "22"};color:${typeColors[n.type]};display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="bi ${typeIcons[n.type] || "bi-bell"}"></i></div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:700;font-size:.875rem">${n.title}</span>
            ${!n.is_read ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--primary);flex-shrink:0"></div>' : ""}
          </div>
          <div style="font-size:.8rem;color:var(--text-muted);margin-top:2px">${n.message}</div>
          <div style="font-size:.7rem;color:var(--text-subtle);margin-top:4px">${Admin.fmt.timeAgo(n.created)}</div>
        </div>
        <div class="d-flex gap-1">
          ${!n.is_read ? `<button class="btn btn-xs btn-outline-secondary" onclick="AdminNotifications.markRead(${n.id})" title="Mark read"><i class="bi bi-check2"></i></button>` : ""}
          <button class="btn btn-xs btn-outline-secondary" onclick="AdminNotifications.dismiss(${n.id})" title="Dismiss"><i class="bi bi-x"></i></button>
        </div>
      </div>`,
      )
      .join("");
  }

  function markRead(id) {
    const n = all.find((x) => x.id === id);
    if (n) n.is_read = true;
    renderStats();
    applyFilters();
  }
  function markAllRead() {
    all.forEach((n) => (n.is_read = true));
    renderStats();
    applyFilters();
    Admin.toast("All marked as read", "success");
  }
  function dismiss(id) {
    all = all.filter((x) => x.id !== id);
    filtered = filtered.filter((x) => x.id !== id);
    renderStats();
    render();
  }
  function clearAll() {
    Admin.confirm("Clear all notifications?", () => {
      all = [];
      filtered = [];
      renderStats();
      render();
      Admin.toast("Cleared", "success");
    });
  }

  function sendManual() {
    const title = document.getElementById("sendNotifTitle")?.value?.trim();
    const body = document.getElementById("sendNotifBody")?.value?.trim();
    const type = document.getElementById("sendNotifType")?.value || "system";
    const target = document.getElementById("sendNotifTarget")?.value || "all";
    if (!title || !body) {
      Admin.setMsg(
        "sendNotifMsg",
        "Please fill in title and message.",
        "danger",
      );
      return;
    }
    all.unshift({
      id: all.length + 1,
      type,
      title,
      message: body + " → Sent to: " + target,
      is_read: true,
      created: new Date().toISOString(),
    });
    filtered = [...all];
    renderStats();
    applyFilters();
    bootstrap.Modal.getInstance(
      document.getElementById("sendNotifModal"),
    )?.hide();
    Admin.toast("Notification sent to " + target, "success");
    document.getElementById("sendNotifTitle").value = "";
    document.getElementById("sendNotifBody").value = "";
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

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminLeases
   ───────────────────────────────────────────────────────────── */
const AdminLeases = (() => {
  let all = [],
    filtered = [],
    page = 1;
  const PER = 10;

  async function init() {
    Admin.initSidebar();
    const r = await Admin.api("GET", "/admin/leases");
    all = r.data || [];
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
    // Expiring alert
    const endingSoon = all.filter((l) => l.status === "ending_soon");
    const alert = document.getElementById("expiringAlert");
    const alertTxt = document.getElementById("expiringAlertText");
    if (alert) alert.style.display = endingSoon.length ? "" : "none";
    if (alertTxt && endingSoon.length)
      alertTxt.textContent = `${endingSoon.length} lease${endingSoon.length > 1 ? "s" : ""} expiring within 30 days — action may be required.`;
  }

  function filter() {
    const q = (
      document.getElementById("leaseSearch")?.value || ""
    ).toLowerCase();
    const stat = document.getElementById("leaseStatus")?.value || "";
    filtered = all.filter(
      (l) =>
        (!q ||
          l.tenant_name.toLowerCase().includes(q) ||
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
        <td style="font-weight:700">${l.tenant_name}</td>
        <td style="font-size:.8rem">${l.plaza_name} · <strong>${l.unit}</strong></td>
        <td style="font-size:.8rem;color:var(--text-muted)">${l.landlord}</td>
        <td style="font-weight:800;color:var(--success-text)">${Admin.fmt.currency(l.rent)}/mo</td>
        <td style="font-size:.8rem">${Admin.fmt.date(l.start)}</td>
        <td style="font-size:.8rem">${Admin.fmt.date(l.end)}</td>
        <td>${Admin.badge(l.status)}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-xs" onclick="AdminLeases.viewLease(${l.id})"><i class="bi bi-eye"></i></button>
            ${l.status !== "expired" ? `<button class="btn btn-outline-danger btn-xs" onclick="AdminLeases.terminate(${l.id})" title="Terminate">Terminate</button>` : ""}
            <button class="btn btn-outline-success btn-xs" onclick="AdminLeases.renew(${l.id})" title="Renew">Renew</button>
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
        <div class="col-6"><div class="form-label">Tenant</div><strong>${l.tenant_name}</strong></div>
        <div class="col-6"><div class="form-label">Landlord</div>${l.landlord}</div>
        <div class="col-6"><div class="form-label">Plaza / Unit</div>${l.plaza_name} · ${l.unit}</div>
        <div class="col-6"><div class="form-label">Monthly Rent</div><strong style="color:var(--success-text)">${Admin.fmt.currency(l.rent)}</strong></div>
        <div class="col-6"><div class="form-label">Start Date</div>${Admin.fmt.date(l.start)}</div>
        <div class="col-6"><div class="form-label">End Date</div>${Admin.fmt.date(l.end)}</div>
        <div class="col-6"><div class="form-label">Status</div>${Admin.badge(l.status)}</div>
      </div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("leaseDetailModal"),
    )?.show();
  }

  function terminate(id) {
    const l = all.find((x) => x.id === id);
    if (!l) return;
    Admin.confirm(`Terminate ${l.tenant_name}'s lease?`, () => {
      l.status = "expired";
      renderStats();
      render();
      Admin.toast("Lease terminated", "warning");
    });
  }

  function renew(id) {
    const l = all.find((x) => x.id === id);
    if (!l) return;
    const end = new Date(l.end);
    end.setFullYear(end.getFullYear() + 1);
    l.end = end.toISOString().split("T")[0];
    l.status = "active";
    renderStats();
    render();
    Admin.toast("Lease renewed by 1 year", "success");
  }

  function exportCsv() {
    const rows = [
      ["Tenant", "Landlord", "Plaza", "Unit", "Rent", "Start", "End", "Status"],
    ];
    filtered.forEach((l) =>
      rows.push([
        l.tenant_name,
        l.landlord,
        l.plaza_name,
        l.unit,
        l.rent,
        l.start,
        l.end,
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

/* ─────────────────────────────────────────────────────────────
   MODULE: AdminBackup
   ───────────────────────────────────────────────────────────── */
const AdminBackup = (() => {
  const backups = [
    {
      id: 1,
      label: "Daily Auto — Feb 25 2026",
      date: "2026-02-25T03:00:00Z",
      size: "1.24 GB",
      type: "auto",
      status: "completed",
    },
    {
      id: 2,
      label: "Daily Auto — Feb 24 2026",
      date: "2026-02-24T03:00:00Z",
      size: "1.22 GB",
      type: "auto",
      status: "completed",
    },
    {
      id: 3,
      label: "Manual — Feb 20 2026",
      date: "2026-02-20T14:30:00Z",
      size: "1.21 GB",
      type: "manual",
      status: "completed",
    },
    {
      id: 4,
      label: "Daily Auto — Feb 19 2026",
      date: "2026-02-19T03:00:00Z",
      size: "1.20 GB",
      type: "auto",
      status: "failed",
    },
    {
      id: 5,
      label: "Daily Auto — Feb 18 2026",
      date: "2026-02-18T03:00:00Z",
      size: "1.18 GB",
      type: "auto",
      status: "completed",
    },
  ];

  async function init() {
    Admin.initSidebar();
    renderStats();
    render();
  }

  function renderStats() {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("bkTotal", backups.length);
    set("bkCompleted", backups.filter((b) => b.status === "completed").length);
    set("bkFailed", backups.filter((b) => b.status === "failed").length);
    set("bkSize", "1.24 GB");
  }

  function render() {
    const tb = document.getElementById("backupsBody");
    if (!tb) return;
    tb.innerHTML = backups
      .map(
        (b) => `
      <tr>
        <td style="font-weight:700">${b.label}</td>
        <td style="font-size:.8rem">${Admin.fmt.datetime(b.date)}</td>
        <td style="font-weight:700">${b.size}</td>
        <td><span class="badge-status ${b.type === "auto" ? "badge-closed" : "badge-in-progress"}">${b.type}</span></td>
        <td>${Admin.badge(b.status)}</td>
        <td>
          <div class="d-flex gap-1">
            ${
              b.status === "completed"
                ? `<button class="btn btn-outline-secondary btn-xs" onclick="AdminBackup.download(${b.id})"><i class="bi bi-download"></i></button>
            <button class="btn btn-outline-warning btn-xs" onclick="AdminBackup.restore(${b.id})">Restore</button>`
                : ""
            }
            <button class="btn btn-outline-danger btn-xs" onclick="AdminBackup.deleteBackup(${b.id})"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`,
      )
      .join("");
  }

  function createBackup() {
    const btn = document.getElementById("createBackupBtn");
    const prog = document.getElementById("backupProgress");
    if (btn) btn.disabled = true;
    if (prog) {
      prog.style.display = "";
    }
    let pct = 0;
    const bar = document.getElementById("backupBar");
    const pctEl = document.getElementById("backupPct");
    const iv = setInterval(() => {
      pct += Math.floor(Math.random() * 12) + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        if (btn) btn.disabled = false;
        setTimeout(() => {
          if (prog) prog.style.display = "none";
        }, 1000);
        backups.unshift({
          id: backups.length + 1,
          label: "Manual — " + new Date().toLocaleDateString(),
          date: new Date().toISOString(),
          size: "1.24 GB",
          type: "manual",
          status: "completed",
        });
        renderStats();
        render();
        Admin.toast("Backup created successfully", "success");
      }
      if (bar) bar.style.width = pct + "%";
      if (pctEl) pctEl.textContent = pct + "%";
    }, 200);
  }

  function download(id) {
    Admin.toast("Download started (demo)", "info");
  }

  function restore(id) {
    const b = backups.find((x) => x.id === id);
    if (!b) return;
    const body = document.getElementById("restoreBody");
    if (body)
      body.innerHTML = `<p style="margin-bottom:12px">Restore from <strong>${b.label}</strong>?</p><div class="mb-3"><label class="form-label small fw-bold">Admin Password</label><input type="password" class="form-control" id="restorePass" placeholder="Your password"/></div>`;
    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("restoreModal"),
    )?.show();
  }

  function confirmRestore() {
    const pass = document.getElementById("restorePass")?.value;
    if (!pass) {
      Admin.setMsg("restoreMsg", "Password required.", "danger");
      return;
    }
    bootstrap.Modal.getInstance(
      document.getElementById("restoreModal"),
    )?.hide();
    Admin.toast("Restore started (demo)", "warning");
  }

  function deleteBackup(id) {
    Admin.confirm("Delete this backup permanently?", () => {
      const i = backups.findIndex((x) => x.id === id);
      if (i >= 0) backups.splice(i, 1);
      renderStats();
      render();
      Admin.toast("Backup deleted", "success");
    });
  }

  function saveSchedule() {
    const freq = document.getElementById("backupFreq")?.value;
    Admin.toast(`Auto-backup schedule saved: ${freq}`, "success");
  }

  return {
    init,
    render,
    createBackup,
    download,
    restore,
    confirmRestore,
    deleteBackup,
    saveSchedule,
  };
})();
