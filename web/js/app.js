/* Trippy Web — screen router + rendering (vanilla JS, no build step) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Router ─────────────────────────────────────────────── */
  const NAV_SCREENS = { home: "home", triplist: "triplist", community: "community", profile: "profile" };
  const DARK_NAV = new Set(["triplist", "community", "profile", "plan", "spot", "madeforyou"]);
  const NO_NAV = new Set(["welcome", "onboarding", "ai-filter", "loading", "custom", "hotels", "flights", "reels"]);

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
    closeModal();
    if (location.hash !== "#/" + id) history.replaceState(null, "", "#/" + id);
    window.scrollTo({ top: 0 });
  }

  function runLoading() {
    current = "loading";
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "loading"));
    $("#navbar").classList.remove("show");
    closeModal();
    setTimeout(() => go("triplist"), 2200);
  }

  /* ── Toast ──────────────────────────────────────────────── */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ── Create sheet ───────────────────────────────────────── */
  const modal = $("#createModal");
  const closeModal = () => modal.classList.remove("open");
  $("#plusBtn").addEventListener("click", () => modal.classList.add("open"));
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
  $("#obBack").addEventListener("click", () => { obStep === 0 ? go("home") : (obStep--, renderOb()); });
  $("#obNext").addEventListener("click", () => { obStep === DATA.onboarding.length - 1 ? go("home") : (obStep++, renderOb()); });
  renderOb();

  /* ── Home: themes ───────────────────────────────────────── */
  const THEME_ICONS = {
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/>',
    heart: '<path d="M12 20.5S3.5 15.5 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.9-8.5 10.9-8.5 10.9Z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    food: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="M7.5 12a4.5 4.5 0 0 1 9 0"/>',
  };
  $("#themesRow").innerHTML = DATA.themes.map((t) => `
    <button class="theme" data-go="spot">
      <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="1.7">${THEME_ICONS[t.icon]}</svg></span>
      <span>${t.label}</span>
    </button>`).join("");

  /* ── AI Filter ──────────────────────────────────────────── */
  $("#catSelect").innerHTML = DATA.categories
    .map((c, i) => `<option ${i === 0 ? "disabled selected" : ""}>${c}</option>`).join("");
  $("#groupChips").innerHTML = DATA.groupSizes
    .map((g) => `<button class="chip">${g}</button>`).join("");
  $$("#groupChips .chip").forEach((c) =>
    c.addEventListener("click", () => c.classList.toggle("selected")));

  /* ── TripList ───────────────────────────────────────────── */
  const tl = DATA.trip;
  $("#tlCollage").innerHTML =
    tl.photos.map((p) => `<div class="cell"><img src="${p}" alt=""/></div>`).join("") +
    `<div class="cell cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/></svg></div>`;
  $("#tlPlaces").innerHTML = tl.places.map((p) => `
    <div class="place-row">
      <img class="ph" src="${p.img}" alt=""/>
      <div class="info"><b>${p.name}</b><span>${p.sub}</span></div>
      <span class="num">${p.n}</span>
    </div>`).join("");

  /* ── Calendar (Custom build) ────────────────────────────── */
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  let calY = 2024, calM = 4; // May 2024 (as in Figma)
  let selStart = null, selEnd = null;

  function renderCal() {
    $("#calLabel").textContent = `${MONTHS[calM]} ${calY}`;
    const grid = $("#calGrid");
    grid.innerHTML = ["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => `<span class="dow">${d}</span>`).join("");
    const first = new Date(calY, calM, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
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
  function pickDay(ts) {
    if (!selStart || (selStart && selEnd)) { selStart = ts; selEnd = null; }
    else if (ts < selStart) { selEnd = selStart; selStart = ts; }
    else selEnd = ts;
    const fmt = (t) => { const d = new Date(t); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
    $("#rangeText").value = selStart ? (selEnd ? `${fmt(selStart)} – ${fmt(selEnd)}` : fmt(selStart)) : "";
    renderCal();
  }
  $("#calPrev").addEventListener("click", () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCal(); });
  $("#calNext").addEventListener("click", () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCal(); });
  $("#calSave").addEventListener("click", () => {
    if (selStart) {
      const d = new Date(selStart);
      const label = `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
      $("#tlDate").textContent = label;
      $("#tlDayHead").textContent = `Day 1: ${label}`;
    }
    runLoading();
  });
  renderCal();

  /* ── TrippySpot ─────────────────────────────────────────── */
  $("#spotCards").innerHTML = DATA.spots.map((s) => `
    <div class="spot-card ${s.n === 1 ? "" : "dim"}">
      ${s.hot ? '<span class="hot-badge">🔥 Hot</span>' : ""}
      <div class="toprow">
        <span class="thumb"><img src="${s.img}" alt=""/><span class="n">${s.n}</span></span>
        <div class="meta">
          <b>${s.name}</b>
          <span class="cat">${s.cat}</span>
          <div class="statusline">
            <span class="${s.status}">● ${s.statusText}</span>
            <span>◦</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="mins">${s.mins} min</span>
          </div>
        </div>
      </div>
      <div class="spot-tags">${s.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <button class="navigate" data-toast="Opening directions to ${s.name} 🧭">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21.4 2.6 2.8 9.7c-.9.4-.8 1.7.2 1.9l7.6 1.8 1.8 7.6c.2 1 1.5 1.1 1.9.2l7.1-18.6c.3-.9-.5-1.7-1.4-1.4Z" transform="scale(.92) translate(1 1)"/></svg>
        Navigate
      </button>
    </div>`).join("");

  const drive = $("#modeDrive"), walk = $("#modeWalk");
  const setMode = (isDrive) => {
    drive.classList.toggle("on", isDrive);
    walk.classList.toggle("on", !isDrive);
    $$("#spotCards .mins").forEach((el, i) => {
      el.textContent = `${DATA.spots[i].mins * (isDrive ? 1 : 3)} min`;
    });
  };
  drive.addEventListener("click", () => setMode(true));
  walk.addEventListener("click", () => setMode(false));

  /* ── Made for You ───────────────────────────────────────── */
  function renderMfy(kind) {
    const items = DATA.madeForYou[kind];
    $("#mfyGrid").innerHTML = items.map((i) => `
      <button class="mfy-card" data-toast="Saved to your library 📚">
        <span class="img"><img src="${i.img}" alt="" loading="lazy"/></span>
        <b>${i.name}</b>
        <span>${typeof i.items === "number" ? i.items + " items" : i.items}</span>
      </button>`).join("");
    $$(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.mfy === kind));
  }
  $$(".seg button").forEach((b) => b.addEventListener("click", () => renderMfy(b.dataset.mfy)));
  renderMfy("triplists");

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
  $("#postFeed").innerHTML = DATA.posts.map((p, i) => `
    <article class="post">
      <div class="who">
        <img src="${p.avatar}" alt=""/>
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

  /* ── Profile ────────────────────────────────────────────── */
  $("#storyRow").innerHTML = DATA.regions.map((r) => `
    <button class="story" data-toast="${r.name} highlights — coming to web soon">
      <span class="ring"><img src="${r.img}" alt=""/></span>
      <span>${r.name}</span>
    </button>`).join("");
  $("#profileLists").innerHTML = DATA.profileTriplists.map((t) => `
    <div class="tl-row" data-go="triplist">
      <img src="${t.img}" alt=""/>
      <div><b>${t.name}</b><span>${t.items} items</span></div>
    </div>`).join("");

  /* ── Boot ───────────────────────────────────────────────── */
  const start = location.hash.replace("#/", "");
  go(document.getElementById(start) && start !== "loading" ? start : "welcome");
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace("#/", "");
    if (id && id !== current && document.getElementById(id)) go(id);
  });
})();
