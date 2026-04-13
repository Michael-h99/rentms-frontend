/**
 * RENTMS API CLIENT  v2
 * Central module for all HTTP requests to the backend.
 * Automatically attaches auth token, handles errors, retries, and manages sessions.
 *
 * Usage:
 *   const result = await API.Landlord.getStats()
 *   const result = await API.Admin.getUsers()
 *   const result = await API.Tenant.getDashboard()
 */

const API = (() => {
  const BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5000/api"
      : "https://rentms-backend-5.onrender.com/api";

  /* ══════════════════════════════════════════════════════════
     TOKEN / SESSION HELPERS
     Each role stores its token under a separate key so landlord,
     tenant, and admin sessions never collide.
  ══════════════════════════════════════════════════════════ */

  /*
   * FIX 1 — KEYS collision:
   * Original code gave landlord and tenant the SAME localStorage keys
   * ("token" / "user"). This meant _keys() would return the correct role
   * object, but both pointed at identical key names, so a landlord token
   * would be read on any /tenant/ page and vice-versa.
   * Fix: give each role its own distinct key names.
   */
  const KEYS = {
    landlord: { token: "landlord_token", user: "landlord_user" },
    tenant: { token: "tenant_token", user: "tenant_user" },
    admin: { token: "admin_token", user: "admin_user" },
  };

  /** Pick the right storage keys based on the current URL path */
  function _keys() {
    const path = window.location.pathname;
    if (path.includes("/admin/")) return KEYS.admin;
    if (path.includes("/tenant/")) return KEYS.tenant;
    return KEYS.landlord;
  }

  const getToken = () => localStorage.getItem(_keys().token);
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(_keys().user) || "{}");
    } catch {
      return {};
    }
  };

  function clearSession() {
    const k = _keys();
    localStorage.removeItem(k.token);
    localStorage.removeItem(k.user);
  }

  function saveSession(token, user) {
    const k = _keys();
    localStorage.setItem(k.token, token);
    localStorage.setItem(k.user, JSON.stringify(user));
  }

  function isLoggedIn() {
    return !!getToken();
  }

  /** Redirect to the correct login page if not authenticated or wrong role */
  function requireAuth(role = null) {
    if (!isLoggedIn()) {
      const loginPage =
        role === "admin" ? "/auth/admin-login.html" : "/auth/login.html";
      window.location.href = loginPage + "?session=expired";
      return false;
    }
    if (role) {
      const user = getUser();
      const isAdmin = ["admin", "super_admin"].includes(user.role);
      if (role === "admin" && !isAdmin) {
        window.location.href = "/auth/admin-login.html";
        return false;
      }
      if (role !== "admin" && user.role !== role) {
        const redirects = {
          landlord: "/landlord/dashboard.html",
          tenant: "/tenant/dashboard.html",
        };
        window.location.href = redirects[user.role] || "/auth/login.html";
        return false;
      }
    }
    return true;
  }

  /*
   * FIX 2 — logout() was client-only:
   * Original logout() only cleared localStorage and redirected. The JWT
   * remained valid server-side until it expired naturally. Now we fire
   * Auth.logoutAll() first (best-effort — we don't block on it or show
   * errors if it fails, since the user is logging out regardless).
   */
  function logout(redirect = null) {
    const path = window.location.pathname;
    const dest =
      redirect ||
      (path.includes("/admin/")
        ? "/auth/admin-login.html"
        : "/auth/login.html");
    // Best-effort server-side token invalidation before clearing local state
    request("POST", "/auth/logout-all").catch(() => {});
    clearSession();
    window.location.href = dest;
  }

  /* ══════════════════════════════════════════════════════════
     CORE REQUEST  (with 15s timeout + 1 automatic retry on 5xx)
  ══════════════════════════════════════════════════════════ */
  async function request(method, endpoint, body = undefined, opts = {}) {
    const TIMEOUT_MS = 15000;
    const MAX_RETRIES = 1;

    async function attempt(triesLeft) {
      /*
       * FIX 3 — uploadAvatar Content-Type not removed for FormData:
       * Original code built headers with Content-Type:application/json first,
       * then spread opts.headers on top. Passing opts.headers={} just added
       * nothing — it never deleted the existing Content-Type key. The browser
       * must set Content-Type automatically for FormData (so it can include the
       * multipart boundary), so we must not set it at all for those requests.
       *
       * Fix: only add Content-Type:application/json when we are NOT sending a
       * raw body via opts.body (i.e. not a FormData / file upload call).
       */
      const isRawBody = opts.body !== undefined;
      const headers = isRawBody
        ? {} // let browser set Content-Type + boundary
        : { "Content-Type": "application/json" }; // normal JSON requests

      const token = getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Allow callers to add extra headers (but NOT override the logic above)
      const mergedHeaders = { ...headers, ...(opts.headers || {}) };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const config = {
        method,
        headers: mergedHeaders,
        signal: controller.signal,
      };

      if (isRawBody) {
        config.body = opts.body; // FormData / Blob etc.
      } else if (body !== undefined) {
        config.body = JSON.stringify(body); // normal JSON body
      }

      let res;
      try {
        res = await fetch(BASE_URL + endpoint, config);
      } catch (err) {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          return {
            ok: false,
            error: true,
            message: "Request timed out. Please try again.",
          };
        }
        console.error("[API] Network error:", method, endpoint, err);
        return {
          ok: false,
          error: true,
          message: "Cannot connect to server. Check your connection.",
        };
      }
      clearTimeout(timer);

      /* Session expired */
      if (res.status === 401) {
        clearSession();
        const loginPage = window.location.pathname.includes("/admin/")
          ? "/auth/admin-login.html"
          : "/auth/login.html";
        window.location.href = loginPage + "?session=expired";
        return {
          ok: false,
          error: true,
          message: "Session expired. Please log in again.",
        };
      }

      /* Forbidden */
      if (res.status === 403) {
        return {
          ok: false,
          error: true,
          message: "You don't have permission to do that.",
        };
      }

      /* No content */
      if (res.status === 204) {
        return { ok: true, error: false, data: null, message: "Done" };
      }

      /* Server error — retry once after short delay */
      if (res.status >= 500 && triesLeft > 0) {
        console.warn(
          `[API] ${res.status} on ${method} ${endpoint} — retrying…`,
        );
        await new Promise((r) => setTimeout(r, 600));
        return attempt(triesLeft - 1);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        return {
          ok: false,
          error: true,
          message: "Invalid response from server.",
        };
      }

      if (!res.ok) {
        console.warn("[API]", method, endpoint, "→", res.status, data?.message);
        return {
          ok: false,
          error: true,
          message: data?.message || `Request failed (${res.status})`,
          status: res.status,
        };
      }

      return { ok: true, error: false, ...data };
    }

    return attempt(MAX_RETRIES);
  }

  /* ══════════════════════════════════════════════════════════
     HTTP CONVENIENCE METHODS
  ══════════════════════════════════════════════════════════ */
  const get = (url) => request("GET", url);
  const post = (url, body) => request("POST", url, body);
  const put = (url, body) => request("PUT", url, body);
  const patch = (url, body) => request("PATCH", url, body);
  const del = (url) => request("DELETE", url);

  /* ══════════════════════════════════════════════════════════
     AUTH ENDPOINTS
  ══════════════════════════════════════════════════════════ */
  const Auth = {
    login: (email, password) => post("/auth/login", { email, password }),
    adminLogin: (email, password) => post("/auth/login", { email, password }),
    register: (data) => post("/auth/register", data),
    /*
     * FIX 4 — Auth.getMe was missing:
     * landlord.js (LandlordProfile.load) calls GET /auth/me to fetch the
     * current user's profile. There was no corresponding method in Auth.
     */
    getMe: () => get("/auth/me"),
    forgotPassword: (email) => post("/auth/forgot-password", { email }),
    verifyResetToken: (token) => post("/auth/verify-reset-token", { token }),
    resetPassword: (token, password) =>
      post("/auth/reset-password", { token, password }),
    changePassword: (current_password, new_password) =>
      post("/auth/change-password", { current_password, new_password }),
    logoutAll: () => post("/auth/logout-all", {}),
  };

  /* ══════════════════════════════════════════════════════════
     ADMIN ENDPOINTS  — matches every Admin.api() call in admin.js
  ══════════════════════════════════════════════════════════ */
  const Admin = {
    /* Overview */
    getStats: () => get("/admin/stats"),
    getRevenueChart: (params = {}) =>
      get("/admin/revenue_chart" + toQuery(params)),
    getTopLandlords: (params = {}) =>
      get("/admin/top_landlords" + toQuery(params)),

    /* Users */
    getUsers: (params = {}) => get("/admin/users" + toQuery(params)),
    updateUser: (id, data) => put(`/admin/users/${id}`, data),
    suspendUser: (id) => patch(`/admin/users/${id}/suspend`, {}),
    activateUser: (id) => patch(`/admin/users/${id}/activate`, {}),
    deleteUser: (id) => del(`/admin/users/${id}`),
    inviteUser: (data) => post("/admin/users/invite", data),

    /* Plazas */
    getPlazas: (params = {}) => get("/admin/plazas" + toQuery(params)),
    updatePlaza: (id, data) => put(`/admin/plazas/${id}`, data),
    deletePlaza: (id) => del(`/admin/plazas/${id}`),

    /* Leases */
    getLeases: (params = {}) => get("/admin/leases" + toQuery(params)),
    updateLease: (id, data) => put(`/admin/leases/${id}`, data),
    terminateLease: (id) => del(`/admin/leases/${id}`),

    /* Payments */
    getPayments: (params = {}) => get("/admin/payments" + toQuery(params)),
    markPaid: (id) => patch(`/admin/payments/${id}/paid`, {}),
    exportPayments: (params = {}) =>
      get("/admin/payments/export" + toQuery(params)),

    /* Maintenance */
    getMaintenance: (params = {}) =>
      get("/admin/maintenance" + toQuery(params)),
    updateMaintenance: (id, data) => put(`/admin/maintenance/${id}`, data),

    /* Announcements */
    getAnnouncements: (params = {}) =>
      get("/admin/announcements" + toQuery(params)),
    createAnnouncement: (data) => post("/admin/announcements", data),
    deleteAnnouncement: (id) => del(`/admin/announcements/${id}`),

    /* Notifications */
    getNotifications: (params = {}) =>
      get("/admin/notifications" + toQuery(params)),
    sendNotification: (data) => post("/admin/notifications", data),

    /* Support Tickets */
    getTickets: (params = {}) => get("/admin/tickets" + toQuery(params)),
    updateTicket: (id, data) => put(`/admin/tickets/${id}`, data),
    replyTicket: (id, message) =>
      post(`/admin/tickets/${id}/reply`, { message }),
    closeTicket: (id) => patch(`/admin/tickets/${id}/close`, {}),

    /* Invite Codes */
    getCodes: (params = {}) => get("/admin/codes" + toQuery(params)),
    createCode: (data) => post("/admin/codes", data),
    revokeCode: (id) => patch(`/admin/codes/${id}/revoke`, {}),
    deleteCode: (id) => del(`/admin/codes/${id}`),

    /* Audit Log */
    getAudit: (params = {}) => get("/admin/audit" + toQuery(params)),
    exportAudit: (params = {}) => get("/admin/audit/export" + toQuery(params)),

    /* Reports */
    exportReport: (params = {}) =>
      get("/admin/reports/export" + toQuery(params)),

    /* System Health */
    getHealth: () => get("/admin/health"),
    getHealthHistory: (params = {}) =>
      get("/admin/health/history" + toQuery(params)),

    /* Admin Profile & Sessions */
    getProfile: () => get("/admin/profile"),
    updateProfile: (data) => put("/admin/profile", data),
    getSessions: () => get("/admin/sessions"),
    revokeSession: (id) => del(`/admin/sessions/${id}`),
    revokeAllSessions: () => del("/admin/sessions"),

    /* Settings */
    getSettings: () => get("/admin/settings"),
    updateSettings: (data) => put("/admin/settings", data),
    updateSecurity: (data) => put("/admin/settings/security", data),
    updateSmtp: (data) => put("/admin/settings/smtp", data),
    testSmtp: () => post("/admin/settings/smtp/test", {}),

    /* Backup & Restore */
    getBackups: () => get("/admin/backups"),
    createBackup: (data) => post("/admin/backups", data),
    restoreBackup: (id) => post(`/admin/backups/${id}/restore`, {}),
    deleteBackup: (id) => del(`/admin/backups/${id}`),
    downloadBackup: (id) => get(`/admin/backups/${id}/download`),

    /* Roles & Permissions */
    getRoles: () => get("/admin/roles"),
    updateRoles: (data) => put("/admin/roles", data),
  };

  /* ══════════════════════════════════════════════════════════
     LANDLORD ENDPOINTS
     FIX 5 — Path prefix was /landlords/* (plural) throughout this module.
     landlord.js makes raw RentMs.get() calls using /landlord/* (singular).
     Standardised everything to /landlord/* (singular) to match what the
     existing landlord.js and backend routes already use.
  ══════════════════════════════════════════════════════════ */
  const Landlord = {
    /* Stats & Profile */
    getStats: () => get("/landlord/stats"),
    getProfile: () => get("/auth/me"), // uses shared /auth/me
    updateProfile: (data) => patch("/auth/me", data),
    uploadAvatar: (formData) =>
      request("POST", "/landlord/profile/avatar", undefined, {
        body: formData, // FormData — Content-Type handled correctly by FIX 3
      }),
    getSettings: () => get("/landlord/settings"),
    updateSettings: (data) => put("/landlord/settings", data),
    deleteAccount: (password) =>
      del(`/landlord/account?password=${encodeURIComponent(password)}`),

    /* Plazas */
    getPlazas: () => get("/landlord/plazas"),
    createPlaza: (data) => post("/landlord/plazas", data),
    updatePlaza: (id, data) => put(`/landlord/plazas/${id}`, data),
    deletePlaza: (id) => del(`/landlord/plazas/${id}`),

    /* Invite Codes */
    getCodes: (params = {}) => get("/invite-codes" + toQuery(params)),
    createCode: (data) => post("/invite-codes", data),
    revokeCode: (id) => del(`/invite-codes/${id}`),
    deleteCode: (id) => del(`/invite-codes/${id}`),
    inviteTenant: (plazaId, data) =>
      post(`/landlord/plazas/${plazaId}/invite`, data),

    /* Tenants */
    getTenants: (params = {}) => get("/landlord/tenants" + toQuery(params)),
    removeTenant: (tenancyId) => del(`/landlord/tenancies/${tenancyId}/tenant`),
    updateTenancy: (id, data) => put(`/landlord/tenancies/${id}`, data),

    /* Maintenance */
    getMaintenance: (params = {}) =>
      get("/landlord/maintenance" + toQuery(params)),
    updateMaintenance: (id, data) => put(`/landlord/maintenance/${id}`, data),

    /* Announcements */
    getAnnouncements: (params = {}) =>
      get("/landlord/announcements" + toQuery(params)),
    createAnnouncement: (data) => post("/landlord/announcements", data),
    deleteAnnouncement: (id) => del(`/landlord/announcements/${id}`),

    /* Messages / Groups */
    getGroups: () => get("/landlord/groups"),
    createGroup: (data) => post("/landlord/groups", data),
    updateGroup: (id, data) => put(`/landlord/groups/${id}`, data),
    getMessages: (groupId) => get(`/landlord/groups/${groupId}/messages`),
    sendMessage: (groupId, msg) =>
      post(`/landlord/groups/${groupId}/messages`, { message: msg }),

    /* Payments */
    getPayments: (params = {}) => get("/payments/all" + toQuery(params)),

    /* Notifications */
    getNotifications: (params = {}) => get("/notifications" + toQuery(params)),
    markNotifRead: (id) => patch(`/notifications/${id}/read`, {}),
    markAllNotifsRead: () => post("/notifications/read-all", {}),

    /* Reports */
    getRevenue: (params = {}) =>
      get("/landlord/reports/revenue" + toQuery(params)),
    getTenantReport: (params = {}) =>
      get("/landlord/reports/tenants" + toQuery(params)),
    exportReport: (params = {}) =>
      get("/landlord/reports/export" + toQuery(params)),
  };

  /* ══════════════════════════════════════════════════════════
     PAYMENTS ENDPOINTS
  ══════════════════════════════════════════════════════════ */
  const Payments = {
    getAll: (params = {}) => get("/payments/all" + toQuery(params)),
    getReceipt: (id) => get(`/payments/${id}/receipt`),
    create: (data) => post("/payments", data),
    verify: (reference) => post("/payments/verify", { reference }),
    export: (params = {}) => get("/payments/export" + toQuery(params)),
  };

  /* ══════════════════════════════════════════════════════════
     NOTIFICATIONS ENDPOINTS
  ══════════════════════════════════════════════════════════ */
  const Notifications = {
    getAll: (params = {}) => get("/notifications" + toQuery(params)),
    markRead: (id) => patch(`/notifications/${id}/read`, {}),
    markAllRead: () => post("/notifications/read-all", {}),
    deleteOne: (id) => del(`/notifications/${id}`),
    getUnreadCount: () => get("/notifications/unread-count"),
  };

  /* ══════════════════════════════════════════════════════════
     EMAIL ENDPOINTS
  ══════════════════════════════════════════════════════════ */
  const Email = {
    sendReminder: (tenancy_id) =>
      post("/email/payment-reminder", { tenancy_id }),
    sendBulkReminder: (plaza_id = null) =>
      post("/email/bulk-reminder", plaza_id ? { plaza_id } : {}),
    sendContact: (data) => post("/contact", data),
  };

  /* ══════════════════════════════════════════════════════════
     TENANT ENDPOINTS
  ══════════════════════════════════════════════════════════ */
  const Tenant = {
    /* Profile */
    getProfile: () => get("/tenant/profile"),
    updateProfile: (data) => put("/tenant/profile", data),
    uploadAvatar: (formData) =>
      request("POST", "/tenant/profile/avatar", undefined, {
        body: formData, // FormData — Content-Type handled correctly by FIX 3
      }),

    /* Dashboard & Lease */
    getDashboard: () => get("/tenant/dashboard"),
    getLease: () => get("/tenant/lease"),

    /* Payments */
    getPayments: (params = {}) => get("/tenant/payments" + toQuery(params)),
    makePayment: (data) => post("/tenant/payments", data),
    getReceipt: (id) => get(`/tenant/payments/${id}/receipt`),

    /* Maintenance */
    getMaintenance: () => get("/tenant/maintenance"),
    submitMaintenance: (data) => post("/tenant/maintenance", data),
    updateMaintenance: (id, data) => put(`/tenant/maintenance/${id}`, data),
    cancelMaintenance: (id) => del(`/tenant/maintenance/${id}`),

    /* Announcements */
    getAnnouncements: () => get("/tenant/announcements"),

    /* Notifications */
    getNotifications: (params = {}) =>
      get("/tenant/notifications" + toQuery(params)),
    markRead: (id) => patch(`/tenant/notifications/${id}/read`, {}),
    markAllRead: () => post("/tenant/notifications/read-all", {}),

    /* Groups / Messaging */
    getGroups: () => get("/tenant/groups"),
    joinGroup: (invite_code) => post("/tenant/groups/join", { invite_code }),
    getMessages: (groupId) => get(`/tenant/groups/${groupId}/messages`),
    sendMessage: (groupId, msg) =>
      post(`/tenant/groups/${groupId}/messages`, { message: msg }),

    /* Support Tickets */
    getTickets: () => get("/tenant/tickets"),
    createTicket: (data) => post("/tenant/tickets", data),
    replyTicket: (id, message) =>
      post(`/tenant/tickets/${id}/reply`, { message }),
  };

  /* ══════════════════════════════════════════════════════════
     UTILITIES
  ══════════════════════════════════════════════════════════ */

  /** Convert params object → query string: { limit:10, page:1 } → "?limit=10&page=1" */
  function toQuery(params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    return qs ? "?" + qs : "";
  }

  /* ── Public API ── */
  return {
    /* Raw HTTP */
    get,
    post,
    put,
    patch,
    del,

    /* Domain modules */
    Auth,
    Admin,
    Landlord,
    Payments,
    Notifications,
    Email,
    Tenant,

    /* Session helpers */
    getToken,
    getUser,
    isLoggedIn,
    requireAuth,
    saveSession,
    logout,
    toQuery,
  };
})();

/* Make available globally for non-module scripts */
window.API = API;
