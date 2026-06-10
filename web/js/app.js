/* Trippy Web — screen router, rendering and live wiring
 * Demo-safe: every live call (backend / TrippyAI) falls back to bundled data. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Router ─────────────────────────────────────────────── */
  const NAV_SCREENS = { home: "home", triplist: "triplist", community: "community", profile: "profile", trending: "trending" };
  const DARK_NAV = new Set(["triplist", "community", "profile", "plan", "spot", "madeforyou", "trending"]);
  const NO_NAV = new Set(["welcome", "onboarding", "ai-filter", "loading", "custom", "hotels", "flights", "reels", "login", "signup", "verify"]);

  let current = "";
  function go(id) {
    if (!document.getElementById(id)) return;
    if (id === "loading") return runLoading();
    current = id;
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    const nav = $("#navbar");
    nav.classList.toggle("show", !NO_NAV.has(id));
    nav.classList.toggle("dark", DARK_NAV.has(id));
    $$(".nav-item", nav).forEach((b) => b.classList.toggle("active", NAV_SCREENS[b.dataset.nav] === id));
    $$("#sidebar .sb-nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav ? NAV_SCREENS[b.dataset.nav] === id : b.dataset.go === id));
    closeModal();
    if (location.hash !== "#/" + id) history.replaceState(null, "", "#/" + id);
    window.scrollTo({ top: 0 });
    if (id === "trending") loadTrending(trendKind);
  }

  /* loading screen — waits for an in-flight AI request when there is one */
  let pendingTrip = null;
  function runLoading() {
    current = "loading";
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "loading"));
    $("#navbar").classList.remove("show");
    closeModal();
    const minWait = new Promise((r) => setTimeout(r, 1800));
    Promise.allSettled([pendingTrip, minWait]).then(([trip]) => {
      if (trip && trip.status === "fulfilled" && trip.value) {
        renderTrip(trip.value, true);
        toast("TripList crafted by TrippyAI ✨");
      } else if (pendingTrip) {
        toast("TrippyAI unavailable — showing a demo TripList");
      }
      pendingTrip = null;
      go("triplist");
    });
  }

  /* ── Toast ──────────────────────────────────────────────── */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ── Create sheet ───────────────────────────────────────── */
  const modal = $("#createModal");
  const closeModal = () => modal.classList.remove("open");
  $("#plusBtn").addEventListener("click", () => modal.classList.add("open"));
  $("#sbCreate")?.addEventListener("click", () => modal.classList.add("open"));
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  /* ── Global click delegation ────────────────────────────── */
  document.addEventListener("click", (e) => {
    const goEl = e.target.closest("[data-go]");
    if (goEl) return go(goEl.dataset.go);
    const navEl = e.target.closest("[data-nav]");
    if (navEl) return go(NAV_SCREENS[navEl.dataset.nav]);
    const toastEl = e.target.closest("[data-toast]");
    if (toastEl) return toast(toastEl.dataset.toast);
  });

  /* ── Onboarding ─────────────────────────────────────────── */
  const collage = $("#collageGrid");
  for (let c = 0; c < 3; c++) {
    const col = document.createElement("div");
    col.className = "cg-col";
    DATA.collage.filter((_, i) => i % 3 === c).forEach((card) => {
      const el = document.createElement("div");
      el.className = "collage-card";
      el.innerHTML = `<img src="${card.img}" alt="" loading="lazy"/><span>${card.label}</span>`;
      col.appendChild(el);
    });
    collage.appendChild(col);
  }

  let obStep = 0;
  const obDots = $("#obDots");
  DATA.onboarding.forEach(() => obDots.appendChild(document.createElement("i")));
  function renderOb() {
    const s = DATA.onboarding[obStep];
    $("#obTitle").textContent = s.title;
    $("#obBody").textContent = s.body;
    $$("#obDots i").forEach((d, i) => d.classList.toggle("on", i === obStep));
    $("#obBack").textContent = obStep === 0 ? "Skip" : "Back";
    $("#obNext").textContent = obStep === DATA.onboarding.length - 1 ? "Let's go!" : "Next";
  }
  const finishOb = () => go(TrippyAPI.loggedIn ? "home" : "signup");
  $("#obBack").addEventListener("click", () => { obStep === 0 ? go("home") : (obStep--, renderOb()); });
  $("#obNext").addEventListener("click", () => { obStep === DATA.onboarding.length - 1 ? finishOb() : (obStep++, renderOb()); });
  renderOb();

  /* ── Auth ───────────────────────────────────────────────── */
  function applyUser() {
    const u = TrippyAPI.user;
    const name = u?.name || u?.userName || DATA.user.name;
    const handle = u?.userName ? "@" + u.userName : DATA.user.handle;
    $("#home .hi").textContent = `Hi, ${name}!`;
    $("#profile .nm").textContent = name;
    $("#profile .un").textContent = handle;
    if (u?.followers != null) {
      $("#profile .stats").innerHTML = `<b>${u.followers ?? 0}</b> followers <i>•</i> <b>${u.following ?? 0}</b> following`;
    }
    const av = u?.imageUrl;
    if (av) ["#home .avatar", "#profile .pavatar", ".tl-owner img"].forEach((s) => $$(s).forEach((el) => (el.src = av)));

    $("#profileAuthRow").innerHTML = TrippyAPI.loggedIn
      ? `<button class="text-btn" id="logoutBtn">Log out</button>`
      : `<button class="text-btn" data-go="login">Guest mode — <b>Log in</b></button>`;
    $("#logoutBtn")?.addEventListener("click", () => {
      TrippyAPI.logout();
      applyUser();
      toast("Logged out");
      go("welcome");
    });

    const sb = $("#sbUser");
    if (sb) {
      sb.innerHTML = TrippyAPI.loggedIn
        ? `<button class="chip-user" data-nav="profile"><img src="${av || "assets/avatar.png"}" alt=""/><span><b>${name}</b><span>${handle}</span></span></button>`
        : `<button class="chip-user" data-go="login"><img src="assets/appicon.png" alt=""/><span><b>Log in</b><span>or sign up</span></span></button>`;
    }
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#loginBtn"); const err = $("#loginError");
    btn.disabled = true; btn.textContent = "Logging in…"; err.textContent = "";
    try {
      const u = await TrippyAPI.login($("#loginUser").value.trim(), $("#loginPass").value);
      applyUser();
      loadLive();
      toast(`Welcome back, ${u?.name || u?.userName || "traveler"}! 👋`);
      go("home");
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false; btn.textContent = "Log in";
    }
  });

  let pendingSignup = null;
  $("#signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#signupBtn"); const err = $("#signupError");
    const email = $("#suEmail").value.trim();
    const userName = $("#suUser").value.trim();
    const password = $("#suPass").value;
    btn.disabled = true; btn.textContent = "Creating account…"; err.textContent = "";
    try {
      await TrippyAPI.signup({ email, password, userName });
      pendingSignup = { email, userName, password };
      $("#verifyEmail").textContent = email;
      go("verify");
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false; btn.textContent = "Sign up";
    }
  });

  $("#verifyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#verifyBtn"); const err = $("#verifyError");
    btn.disabled = true; btn.textContent = "Verifying…"; err.textContent = "";
    try {
      await TrippyAPI.verifyOtp(pendingSignup?.email, $("#otpInput").value.trim());
      try { await TrippyAPI.login(pendingSignup.userName, pendingSignup.password); } catch { /* user can log in manually */ }
      applyUser();
      loadLive();
      toast("Account created — welcome to Trippy! 🎉");
      go("home");
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false; btn.textContent = "Verify & log in";
    }
  });

  /* ── Home: themes ───────────────────────────────────────── */
  const THEME_ICONS = {
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/>',
    heart: '<path d="M12 20.5S3.5 15.5 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.9-8.5 10.9-8.5 10.9Z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    food: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="M7.5 12a4.5 4.5 0 0 1 9 0"/>',
  };
  $("#themesRow").innerHTML = DATA.themes.map((t) => `
    <button class="theme" data-theme="${t.label}">
      <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="1.7">${THEME_ICONS[t.icon]}</svg></span>
      <span>${t.label}</span>
    </button>`).join("");
  $$("#themesRow .theme").forEach((b) => b.addEventListener("click", () => {
    spotTheme = b.dataset.theme;
    $("#spot .spot-head h2").textContent = `TrippySpot ${spotTheme}`;
    go("spot");
    refreshSpots(false);
  }));

  /* ── AI Filter ──────────────────────────────────────────── */
  $("#catSelect").innerHTML = DATA.categories
    .map((c, i) => `<option ${i === 0 ? "disabled selected" : ""}>${c}</option>`).join("");
  $("#groupChips").innerHTML = DATA.groupSizes
    .map((g) => `<button class="chip">${g}</button>`).join("");
  $$("#groupChips .chip").forEach((c) =>
    c.addEventListener("click", () => c.classList.toggle("selected")));

  function startAIGeneration() {
    const cat = $("#catSelect").value;
    const group = $$("#groupChips .chip.selected").map((c) => c.textContent.trim()).join(", ") || "Solo";
    const destination = $("#destInput").value.trim() || $("#aiLocation").value.trim() || "Hong Kong";
    const dates = $("#aiDates").value.trim();
    if (TrippyAPI.aiAvailable) {
      pendingTrip = TrippyAPI.aiTriplist({
        destination,
        category: cat.startsWith("Select") ? "Nature" : cat,
        groupSize: group,
        dates,
        days: 1,
      }).then((d) => ({ title: d.title, days: d.days }));
      pendingTrip.catch(() => {});
    } else {
      pendingTrip = null;
    }
    runLoading();
  }
  $("#aiNext").addEventListener("click", startAIGeneration);
  $("#aiSkip").addEventListener("click", startAIGeneration);

  /* ── TripList rendering ─────────────────────────────────── */
  const TRIP_IMGS = ["assets/cat_nature_feels.jpg", "assets/cat_island_hopping.jpg", "assets/cat_photogenic_spots.jpg",
    "assets/cat_most_popular_visits.jpg", "assets/cat_must_eat_dishes.jpg", "assets/cat_wan_chai_wednesday.jpg"];

  function renderTrip(trip, generated = false) {
    $("#tlTitle").textContent = trip.title;
    $("#tlOwner").textContent = trip.owner || (TrippyAPI.user?.userName ?? DATA.trip.owner);
    const days = trip.days || [{ label: DATA.trip.day, places: DATA.trip.places }];
    const firstLabel = days[0].label.match(/:\s*(.+)$/)?.[1];
    if (firstLabel) $("#tlDate").textContent = firstLabel;

    $("#tlCollage").innerHTML =
      (trip.photos || TRIP_IMGS.slice(0, 3)).slice(0, 3).map((p) => `<div class="cell"><img src="${p}" alt=""/></div>`).join("") +
      `<div class="cell cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/></svg></div>`;

    $("#tlDays").innerHTML = days.map((day, di) => `
      <div class="day-head">${day.label}</div>
      ${day.places.map((p, i) => `
        <div class="place-row">
          <img class="ph" src="${p.img || TRIP_IMGS[(di * 3 + i) % TRIP_IMGS.length]}" alt=""/>
          <div class="info"><b>${p.name}</b><span>${p.sub}</span>${p.time ? `<span class="time">${p.time}</span>` : ""}</div>
          <span class="num">${i + 1}</span>
        </div>`).join("")}`).join("");

    if (generated) $("#tlDays").insertAdjacentHTML("beforeend",
      `<div class="trend-sub" style="padding-top:14px">✨ Generated by TrippyAI (${TrippyAPI.aiAvailable ? "Claude" : "demo"})</div>`);
  }
  renderTrip(DATA.trip);

  /* ── Calendar (Custom build) ────────────────────────────── */
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  let calY = 2024, calM = 4;
  let selStart = null, selEnd = null;

  function renderCal() {
    $("#calLabel").textContent = `${MONTHS[calM]} ${calY}`;
    const grid = $("#calGrid");
    grid.innerHTML = ["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => `<span class="dow">${d}</span>`).join("");
    const first = new Date(calY, calM, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(calY, calM + 1, 0).getDate();
    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("span"));
    for (let d = 1; d <= days; d++) {
      const b = document.createElement("button");
      b.className = "day";
      b.textContent = d;
      const ts = new Date(calY, calM, d).getTime();
      if ((selStart && ts === selStart) || (selEnd && ts === selEnd)) b.classList.add("sel");
      else if (selStart && selEnd && ts > selStart && ts < selEnd) b.classList.add("range");
      b.addEventListener("click", () => pickDay(ts));
      grid.appendChild(b);
    }
  }
  const fmtD = (t) => { const d = new Date(t); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
  function pickDay(ts) {
    if (!selStart || (selStart && selEnd)) { selStart = ts; selEnd = null; }
    else if (ts < selStart) { selEnd = selStart; selStart = ts; }
    else selEnd = ts;
    $("#rangeText").value = selStart ? (selEnd ? `${fmtD(selStart)} – ${fmtD(selEnd)}` : fmtD(selStart)) : "";
    renderCal();
  }
  $("#calPrev").addEventListener("click", () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCal(); });
  $("#calNext").addEventListener("click", () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCal(); });
  $("#calSave").addEventListener("click", () => {
    const dates = $("#rangeText").value;
    const nDays = selStart && selEnd ? Math.min(Math.round((selEnd - selStart) / 86400000) + 1, 5) : 1;
    if (TrippyAPI.aiAvailable) {
      pendingTrip = TrippyAPI.aiTriplist({
        destination: $("#destInput").value.trim() || "Hong Kong",
        category: "best of the city",
        groupSize: "Friends",
        dates,
        days: nDays,
      }).then((d) => ({ title: d.title, days: d.days }));
      pendingTrip.catch(() => {});
    } else if (selStart) {
      const demoDays = [];
      for (let i = 0; i < nDays; i++) {
        demoDays.push({ label: `Day ${i + 1}: ${fmtD(selStart + i * 86400000)}`, places: DATA.trip.places });
      }
      pendingTrip = Promise.resolve({ title: DATA.trip.title, days: demoDays });
    }
    runLoading();
  });
  renderCal();

  /* ── TrippySpot ─────────────────────────────────────────── */
  let spotTheme = "After Work";
  let spotRefreshLeft = 5;
  let driveMode = true;
  const SPOT_IMGS = ["assets/cat_girls_night_out.jpg", "assets/cat_photogenic_spots.jpg", "assets/cat_must_eat_dishes.jpg",
    "assets/cat_wan_chai_wednesday.jpg", "assets/cat_music_fest.jpg"];

  function renderSpots(spots) {
    $("#spotCount").textContent = `${spots.length} spots`;
    $("#spotCards").innerHTML = spots.map((s, i) => `
      <div class="spot-card ${i === 0 ? "" : "dim"}">
        ${s.hot ? '<span class="hot-badge">🔥 Hot</span>' : ""}
        <div class="toprow">
          <span class="thumb"><img src="${s.img || SPOT_IMGS[i % SPOT_IMGS.length]}" alt=""/><span class="n">${i + 1}</span></span>
          <div class="meta">
            <b>${s.name}</b>
            <span class="cat">${s.cat}</span>
            <div class="statusline">
              <span class="${s.status}">● ${s.statusText}</span>
              <span>◦</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span class="mins" data-mins="${s.mins}">${s.mins} min</span>
            </div>
          </div>
        </div>
        <div class="spot-tags">${s.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <button class="navigate" data-toast="Opening directions to ${s.name} 🧭">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21.4 2.6 2.8 9.7c-.9.4-.8 1.7.2 1.9l7.6 1.8 1.8 7.6c.2 1 1.5 1.1 1.9.2l7.1-18.6c.3-.9-.5-1.7-1.4-1.4Z" transform="scale(.92) translate(1 1)"/></svg>
          Navigate
        </button>
      </div>`).join("");
    setMode(driveMode);
  }

  async function refreshSpots(decrement = true) {
    if (decrement) {
      if (spotRefreshLeft <= 0) return toast("No refreshes left today");
      spotRefreshLeft--;
      $("#spotRefreshN").textContent = spotRefreshLeft;
    }
    if (!TrippyAPI.aiAvailable) {
      if (decrement) toast("Demo mode — start server/ for live TrippyAI spots");
      return renderSpots(DATA.spots);
    }
    $("#spotCards").innerHTML = `<div class="rank-skel">TrippyAI is scanning nearby spots…</div>`;
    try {
      const exclude = $$("#spotCards b").map((b) => b.textContent);
      const { spots } = await TrippyAPI.aiSpots({ theme: spotTheme, location: "Tsim Sha Tsui, Hong Kong", exclude });
      renderSpots(spots);
      toast("Fresh spots from TrippyAI ✨");
    } catch {
      renderSpots(DATA.spots);
      toast("TrippyAI unavailable — demo spots shown");
    }
  }
  $("#spotRefresh").addEventListener("click", () => refreshSpots(true));

  const drive = $("#modeDrive"), walk = $("#modeWalk");
  function setMode(isDrive) {
    driveMode = isDrive;
    drive.classList.toggle("on", isDrive);
    walk.classList.toggle("on", !isDrive);
    $$("#spotCards .mins").forEach((el) => {
      el.textContent = `${(+el.dataset.mins) * (isDrive ? 1 : 3)} min`;
    });
  }
  drive.addEventListener("click", () => setMode(true));
  walk.addEventListener("click", () => setMode(false));
  renderSpots(DATA.spots);

  /* ── Made for You ───────────────────────────────────────── */
  function renderMfy(kind) {
    const items = DATA.madeForYou[kind];
    $("#mfyGrid").innerHTML = items.map((i) => `
      <button class="mfy-card" data-toast="Saved to your library 📚">
        <span class="img"><img src="${i.img}" alt="" loading="lazy"/></span>
        <b>${i.name}</b>
        <span>${typeof i.items === "number" ? i.items + " items" : i.items}</span>
      </button>`).join("");
    $$("#madeforyou .seg button").forEach((b) => b.classList.toggle("on", b.dataset.mfy === kind));
  }
  $$("#madeforyou .seg button").forEach((b) => b.addEventListener("click", () => renderMfy(b.dataset.mfy)));
  renderMfy("triplists");

  /* ── Trending Top 50 ────────────────────────────────────── */
  let trendKind = "categories";
  const trendCache = {};
  const DELTA = { up: "▲", down: "▼", same: "—", new: "NEW" };

  function renderRanking(entry, demo) {
    $("#trendSub").innerHTML = `${entry.date} · ${demo
      ? "demo ranking — start server/ with ANTHROPIC_API_KEY for the live TrippyAI Top 50"
      : '<span class="live">live · ranked daily by TrippyAI</span>'}`;
    $("#rankList").innerHTML = entry.items.map((it, i) => `
      <div class="rank-row">
        <span class="pos">${i + 1}</span>
        <div class="body"><b>${it.name}</b><span>${it.area} · ${it.blurb}</span></div>
        <span class="delta ${it.trend}">${DELTA[it.trend] || "—"}</span>
      </div>`).join("");
    $("#homeTrending").innerHTML = entry.items.slice(0, 5).map((it, i) => `
      <div class="rank-row" data-go="trending">
        <span class="pos">${i + 1}</span>
        <div class="body"><b>${it.name}</b><span>${it.area}</span></div>
        <span class="delta ${it.trend}">${DELTA[it.trend] || "—"}</span>
      </div>`).join("");
  }

  async function loadTrending(kind) {
    trendKind = kind;
    $$("#trending .seg button").forEach((b) => b.classList.toggle("on", b.dataset.trend === kind));
    if (trendCache[kind]) return renderRanking(trendCache[kind], trendCache[kind].demo);
    renderRanking(buildTrendingFallback(kind), true);
    if (!TrippyAPI.aiAvailable) { trendCache[kind] = buildTrendingFallback(kind); return; }
    $("#trendSub").innerHTML = "TrippyAI is ranking today's Top 50…";
    try {
      const live = await TrippyAPI.trending(kind);
      trendCache[kind] = live;
      if (trendKind === kind) renderRanking(live, false);
    } catch {
      trendCache[kind] = buildTrendingFallback(kind);
      if (trendKind === kind) renderRanking(trendCache[kind], true);
    }
  }
  $$("#trending .seg button").forEach((b) => b.addEventListener("click", () => loadTrending(b.dataset.trend)));

  /* ── Hotels: trend chart + deals ────────────────────────── */
  (function chart() {
    const data = DATA.hotels.trend;
    const W = 340, H = 134, padL = 34, padB = 24, padT = 16;
    const min = 390, max = 610;
    const x = (i) => padL + (i * (W - padL - 8)) / (data.length - 1);
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const line = data.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.v)}`).join(" ");
    $("#trendChart").innerHTML = `
      ${[610, 500, 390].map((v) => `
        <text x="0" y="${y(v) + 3}" font-size="9" fill="#6e6e74">${v}</text>
        <line x1="${padL - 6}" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="rgba(255,255,255,.06)"/>`).join("")}
      <path d="${line} L${x(data.length - 1)},${H - padB} L${x(0)},${H - padB} Z" fill="url(#tg)" opacity=".25"/>
      <path d="${line}" fill="none" stroke="url(#tg)" stroke-width="2.4" stroke-linecap="round"/>
      ${data.map((p, i) => `
        <circle cx="${x(i)}" cy="${y(p.v)}" r="3" fill="#0a0a0c" stroke="#4de8c2" stroke-width="1.6"/>
        <text x="${x(i)}" y="${H - 10}" font-size="9" fill="#6e6e74" text-anchor="middle">${p.d}</text>
        <text x="${x(i)}" y="${y(p.v) - 8}" font-size="8.5" fill="#98989e" text-anchor="middle">${p.v}</text>`).join("")}
      <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#4f7df9"/><stop offset="1" stop-color="#4de8c2"/>
      </linearGradient></defs>`;
    $("#cheaperText").textContent = DATA.hotels.cheaper;
  })();

  $("#dealGrid").innerHTML = DATA.hotels.deals.map((d) => `
    <div class="deal" data-toast="${d.city} hotels — coming to web soon">
      <div class="img">
        <img src="${d.img}" alt="" loading="lazy"/>
        <span class="off">↘ ${d.off}</span>
        ${d.best ? '<span class="best">BEST DEAL</span>' : ""}
      </div>
      <div class="body">
        <b>${d.city}</b><span class="country">${d.country}</span>
        <div class="price">${d.price} <small>HKD/night</small></div>
        <div class="stars">★ ${d.rating}</div>
      </div>
    </div>`).join("");

  /* ── Flights ────────────────────────────────────────────── */
  const flRound = $("#flRound"), flOne = $("#flOne");
  [flRound, flOne].forEach((b) => b.addEventListener("click", () => {
    flRound.classList.toggle("on", b === flRound);
    flOne.classList.toggle("on", b === flOne);
  }));
  $("#flReset").addEventListener("click", () => {
    $$("#flights input").forEach((i) => (i.value = ""));
    $$("#flights input")[0].value = "HKG";
    toast("Search reset");
  });
  $("#flSwap").addEventListener("click", () => {
    const ins = $$("#flights .field input");
    [ins[0].value, ins[1].value] = [ins[1].value, ins[0].value];
  });

  /* ── Community ──────────────────────────────────────────── */
  function renderPosts(posts) {
    $("#postFeed").innerHTML = posts.map((p, i) => `
      <article class="post">
        <div class="who">
          <img src="${p.avatar}" alt="" onerror="this.src='assets/appicon.png'"/>
          <div><span class="nm">${p.name}</span><span class="meta">${p.meta}</span></div>
          <button class="dots" data-toast="Post options — coming to web soon">⋮</button>
        </div>
        <h4>${p.title}</h4>
        <p>${p.body}</p>
        <span class="qtag"># ${p.tag}</span>
        <div class="foot">
          <button class="like" data-i="${i}">👍 <span>${p.likes}</span></button>
          <button data-toast="Comments — coming to web soon">💬${p.comments ? " " + p.comments : ""}</button>
          <span class="ago">${p.ago}</span>
        </div>
      </article>`).join("");
    $$("#postFeed .like").forEach((b) => b.addEventListener("click", () => {
      const liked = b.classList.toggle("liked");
      const n = b.querySelector("span");
      n.textContent = +n.textContent + (liked ? 1 : -1);
    }));
  }
  renderPosts(DATA.posts);

  /* ── Profile ────────────────────────────────────────────── */
  $("#storyRow").innerHTML = DATA.regions.map((r) => `
    <button class="story" data-toast="${r.name} highlights — coming to web soon">
      <span class="ring"><img src="${r.img}" alt=""/></span>
      <span>${r.name}</span>
    </button>`).join("");

  function renderProfileLists(lists) {
    $("#profileLists").innerHTML = lists.map((t) => `
      <div class="tl-row" data-go="triplist">
        <img src="${t.img}" alt="" onerror="this.src='assets/cat_made_for_you.jpg'"/>
        <div><b>${t.name}</b><span>${t.items} items</span></div>
      </div>`).join("");
  }
  renderProfileLists(DATA.profileTriplists);

  /* ── Live data (backend via proxy) ──────────────────────── */
  async function loadLive() {
    if (!TrippyAPI.loggedIn) return;
    TrippyAPI.getProfile().then(applyUser).catch(() => {});
    TrippyAPI.getPosts().then((p) => { if (p.length) renderPosts(p); }).catch(() => {});
    TrippyAPI.getMyTriplists().then((l) => { if (l.length) renderProfileLists(l); }).catch(() => {});
  }

  /* ── Boot ───────────────────────────────────────────────── */
  applyUser();
  loadLive();
  loadTrending("categories");
  const start = location.hash.replace("#/", "");
  const landing = TrippyAPI.loggedIn ? "home" : "welcome";
  go(document.getElementById(start) && start !== "loading" ? start : landing);
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace("#/", "");
    if (id && id !== current && document.getElementById(id)) go(id);
  });
})();
