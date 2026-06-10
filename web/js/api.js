/* Trippy Web — API client
 *
 * Two backends:
 *   • Trippy backend (api.trippy.global) — auth, profile, posts, triplists.
 *     Mirrors frontend-beta-dev/app/src/api. When the page is served by
 *     server/server.js the calls go through the same-origin /backend proxy
 *     (no CORS needed); otherwise they hit the API base directly.
 *   • TrippyAI server (server/server.js) — Claude-powered recommendations
 *     and the daily Top-50 trending rankings.
 *
 * Every call fails soft: callers fall back to the bundled demo data.
 */
const TrippyAPI = (() => {
  const cfg = window.TRIPPY_CONFIG || {};
  const served = location.protocol.startsWith("http");
  const apiBase = (localStorage.getItem("trippy.apiBase") || cfg.apiBase || "https://api.trippy.global").replace(/\/$/, "");
  const backend = served ? "/backend" : apiBase; // proxy when served by our node server
  const aiBase = served ? "" : null;             // AI only available same-origin

  const store = {
    get access() { return localStorage.getItem("trippy.accessToken"); },
    set access(v) { v ? localStorage.setItem("trippy.accessToken", v) : localStorage.removeItem("trippy.accessToken"); },
    get refresh() { return localStorage.getItem("trippy.refreshToken"); },
    set refresh(v) { v ? localStorage.setItem("trippy.refreshToken", v) : localStorage.removeItem("trippy.refreshToken"); },
    get user() { try { return JSON.parse(localStorage.getItem("trippy.user")); } catch { return null; } },
    set user(v) { v ? localStorage.setItem("trippy.user", JSON.stringify(v)) : localStorage.removeItem("trippy.user"); },
  };

  async function req(base, path, { method = "GET", body, auth = true, timeout = 9000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const headers = { "Content-Type": "application/json" };
    if (auth && store.access) headers["Authorization"] = `Bearer ${store.access}`;
    try {
      return await fetch(base + path, {
        method, headers, signal: ctrl.signal,
        body: body ? JSON.stringify(body) : undefined,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function jsonOrThrow(res, what) {
    if (!res.ok) {
      let msg = `${what} failed (${res.status})`;
      try { msg = (await res.json()).message || msg; } catch { /* keep default */ }
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    try { return await res.json(); } catch { return {}; }
  }

  function fmtDate(dt) {
    if (!dt) return "";
    return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function timeAgo(dt) {
    if (!dt) return "";
    const s = Math.max(1, (Date.now() - new Date(dt)) / 1000);
    if (s < 3600) return `${Math.floor(s / 60) || 1} minutes ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
    return `${Math.floor(s / 86400)} days ago`;
  }

  return {
    get user() { return store.user; },
    get loggedIn() { return !!store.access; },
    get aiAvailable() { return aiBase !== null; },

    /* ── Auth (mirrors login.js / signUp.js / otpverify.js) ── */

    async login(userName, password) {
      const res = await req(backend, "/login", { method: "POST", body: { userName, password }, auth: false, timeout: 12000 });
      let access = res.headers.get("authorization")?.replace(/^Bearer /, "");
      let refresh = res.headers.get("refresh-token")?.replace(/^Bearer /, "");
      const data = await jsonOrThrow(res, "Login");
      access = access || data.accessToken;
      refresh = refresh || data.refreshToken;
      if (!access) throw new Error("Login succeeded but no token was returned (check CORS expose headers)");
      store.access = access;
      store.refresh = refresh || null;
      try { await this.getProfile(); } catch { store.user = { userName }; }
      return store.user;
    },

    async signup({ email, password, userName, name }) {
      const res = await req(backend, "/api/v1/signup", {
        method: "POST", auth: false, timeout: 15000,
        body: { email, password, userName, name: name || userName, imageUrl: null, role: "USER" },
      });
      return jsonOrThrow(res, "Sign up");
    },

    async verifyOtp(email, otp) {
      const res = await req(backend, "/api/v1/verify", {
        method: "POST", auth: false, body: { email, otp }, timeout: 15000,
      });
      return jsonOrThrow(res, "Verification");
    },

    logout() { store.access = null; store.refresh = null; store.user = null; },

    /* ── Backend data ───────────────────────────────────────── */

    async getProfile() {
      const u = await jsonOrThrow(await req(backend, "/api/users/v1/profile"), "Profile");
      store.user = u;
      return u;
    },

    async getPosts(page = 0, size = 10) {
      const data = await jsonOrThrow(await req(backend, `/api/community/v1/posts?page=${page}&size=${size}`), "Posts");
      return (data.content || []).map((p) => ({
        name: p.user?.userName || "Trippy user",
        avatar: p.user?.imageUrl || "assets/appicon.png",
        meta: `${fmtDate(p.datetime)} · ⌖ ${p.location || "Hong Kong"}`,
        title: p.title || "",
        body: p.content || "",
        tag: p.topic || "General",
        likes: p.numberOfLikes ?? p.totalLikes ?? p.likeCount ?? 0,
        comments: p.numberOfComments ?? p.totalComments ?? p.commentCount ?? 0,
        ago: timeAgo(p.datetime),
      }));
    },

    async getMyTriplists() {
      const data = await jsonOrThrow(await req(backend, "/api/triplists/v1"), "TripLists");
      const list = Array.isArray(data) ? data : data.content || [];
      return list.map((t) => ({
        name: t.name || t.title || "TripList",
        items: t.placeCount ?? t.itemCount ?? (t.places?.length || 0),
        img: t.coverImageUrl || t.imageUrl || "assets/cat_made_for_you.jpg",
      }));
    },

    /* ── TrippyAI (Claude via server/server.js) ─────────────── */

    async aiTriplist(params) {
      if (aiBase === null) throw new Error("AI server not available");
      const res = await req(aiBase, "/api/ai/triplist", { method: "POST", body: params, auth: false, timeout: 90000 });
      return jsonOrThrow(res, "TrippyAI");
    },

    async aiSpots(params) {
      if (aiBase === null) throw new Error("AI server not available");
      const res = await req(aiBase, "/api/ai/spots", { method: "POST", body: params, auth: false, timeout: 45000 });
      return jsonOrThrow(res, "TrippyAI");
    },

    async trending(kind) {
      if (aiBase === null) throw new Error("AI server not available");
      const res = await req(aiBase, `/api/trending/${kind}`, { auth: false, timeout: 120000 });
      return jsonOrThrow(res, "Trending");
    },
  };
})();
