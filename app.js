/* ==========================================================================
 * Hitserkopian – en Hitster-klon med egen spellista
 * ========================================================================== */

const STORE_KEY = "hitserkopian.v2";
const GAME_KEY = "hitserkopian.game";
const LEGACY_KEY = "hitserkopian.playlist";

const AVATARS = ["🎸", "🎤", "🎧", "🥁", "🎹", "🎺", "🎻", "🪩"];
const COLORS = ["#d94a26", "#2f6f66", "#c8901b", "#7b4b94", "#3f699e", "#b03a5e", "#5c7f3c", "#8a5a34"];

/* ---------- Hjälpare ---------- */
const $ = (id) => document.getElementById(id);

const uid = () => Math.random().toString(36).slice(2, 10);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0 });
}

function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 350);
  }, 3400);
}

/* ---------- Ljudeffekter (WebAudio, inga filer) ---------- */
let audioCtx = null;
function playNotes(notes, wave = "triangle", vol = 0.16) {
  if (!store.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    let t = audioCtx.currentTime;
    for (const [freq, dur] of notes) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = wave;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
      t += dur * 0.82;
    }
  } catch (_) { /* ljud är aldrig kritiskt */ }
}
const sfx = {
  correct: () => playNotes([[523, 0.14], [659, 0.14], [784, 0.24]]),
  wrong: () => playNotes([[233, 0.2], [185, 0.34]], "sawtooth", 0.09),
  win: () => playNotes([[523, 0.16], [523, 0.12], [659, 0.16], [784, 0.16], [1047, 0.5]]),
  token: () => playNotes([[880, 0.1], [1175, 0.18]]),
};

/* ---------- Konfetti (egen mini-kanon) ---------- */
const confetti = (() => {
  const canvas = $("confetti-canvas");
  const ctx = canvas.getContext("2d");
  let parts = [];
  let running = false;

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener("resize", resize);
  resize();

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.y < canvas.height + 30 && p.life > 0);
    for (const p of parts) {
      p.vy += 0.16;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  function spawn(n, x, y, spread) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * spread;
      parts.push({
        x, y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - 4,
        vr: (Math.random() - 0.5) * 0.3,
        rot: Math.random() * Math.PI,
        s: 6 + Math.random() * 7,
        life: 130 + Math.random() * 60,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  return {
    burst: () => spawn(70, innerWidth / 2, innerHeight * 0.3, 6),
    rain: () => {
      let i = 0;
      const iv = setInterval(() => {
        spawn(26, Math.random() * innerWidth, -10, 4);
        if (++i > 11) clearInterval(iv);
      }, 220);
    },
  };
})();

/* ==========================================================================
 * Lagring: flera spellistor + inställningar
 * ========================================================================== */
function normalizeSong(s) {
  const y = Number(s.year);
  return {
    artist: String(s.artist ?? "").trim(),
    title: String(s.title ?? "").trim(),
    year: Number.isFinite(y) && y > 0 ? y : 0, // 0 = år saknas
    url: String(s.url ?? "").trim(),
    tidbit: String(s.tidbit ?? "").trim(),
    art: String(s.art ?? "").trim(),         // skivomslag (bild-URL)
    preview: String(s.preview ?? "").trim(), // 30 s ljudsnutt (URL)
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.playlists) && s.playlists.length) return s;
    }
  } catch (_) { /* korrupt – bygg om */ }

  const playlists = [];
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (legacy && Array.isArray(legacy.songs) && legacy.songs.length) {
      playlists.push({ id: uid(), name: legacy.name || "Min spellista", songs: legacy.songs.map(normalizeSong) });
    }
  } catch (_) { /* ingen gammal lista */ }
  playlists.push({ id: uid(), name: SAMPLE_PLAYLIST.name, songs: structuredClone(SAMPLE_PLAYLIST.songs) });

  return {
    playlists,
    activeId: playlists[0].id,
    settings: { target: 5, tokens: true, sound: true },
  };
}

let store = loadStore();
store.settings = {
  target: 5, tokens: true, sound: true,
  theme: "light", mode: "classic", exactBonus: false,
  ...store.settings,
};
store.players = Array.isArray(store.players) && store.players.length
  ? store.players
  : ["Spelare 1", "Spelare 2"];

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function applyTheme() {
  document.documentElement.dataset.theme = store.settings.theme === "dark" ? "dark" : "light";
}

function currentPlaylist() {
  return store.playlists.find((p) => p.id === store.activeId) || store.playlists[0];
}

function songExists(pl, song) {
  const key = (s) => `${s.artist}||${s.title}`.toLowerCase();
  return pl.songs.some(
    (s) => (song.url && s.url === song.url) ||
           (song.title && song.artist && key(s) === key(song))
  );
}

/* ---------- Musiklänkar ---------- */
function parseMusicUrl(url) {
  if (!url) return { type: "none" };
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return { type: "youtube", id: u.pathname.slice(1).split("/")[0] };
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch" && u.searchParams.get("v"))
        return { type: "youtube", id: u.searchParams.get("v") };
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
      if (m) return { type: "youtube", id: m[2] };
    }
    if (host === "open.spotify.com") {
      const m = u.pathname.match(/\/(?:intl-[\w-]+\/)?track\/(\w+)/);
      if (m) return { type: "spotify", id: m[1] };
    }
  } catch (_) { /* ogiltig URL */ }
  return { type: "none" };
}

/* ==========================================================================
 * NAVIGERING: HEM → NYTT SPEL / BIBLIOTEK / SKANNER
 * ========================================================================== */
let libraryReturn = "home"; // vart bibliotekets tillbaka-pil leder

function goHome() { renderHome(); showScreen("screen-home"); }
function goSetup() { renderSetup(); showScreen("screen-setup"); }
function goLibrary(from) {
  if (from) libraryReturn = from;
  renderLibrary();
  showScreen("screen-library");
}

/* ---------- Hem ---------- */
function renderHome() {
  renderResume();
  const n = store.playlists.length;
  $("home-library-count").textContent =
    n === 1 ? "1 lista sparad" : `${n} listor sparade`;
  const rec = $("home-record");
  rec.classList.toggle("hidden", !store.highscore);
  if (store.highscore) {
    rec.textContent = `Butiksrekord (solo): ${store.highscore.score} skivor – ${store.highscore.name}`;
  }
  applyTheme();
}

function renderResume() {
  const saved = loadSavedGame();
  $("resume-banner").classList.toggle("hidden", !saved);
  if (saved) {
    const p = saved.players[saved.current];
    $("resume-info").textContent =
      `${p.name} står på tur · ${saved.deck.length} skivor kvar i backen`;
  }
}

$("btn-home-play").onclick = goSetup;
$("btn-home-library").onclick = () => goLibrary("home");
$("btn-home-scan").onclick = () => startScanner();

/* ---------- Nytt spel ---------- */
function renderSetup() {
  renderPlayerChips();
  renderPlaylistPicker();
  renderSettings();
}

function renderPlayerChips() {
  const wrap = $("player-chips");
  wrap.innerHTML = "";
  store.players.forEach((name, i) => {
    const color = COLORS[i % COLORS.length];
    const chip = document.createElement("span");
    chip.className = "p-chip";
    chip.style.background = color + "22";
    chip.style.borderColor = color + "77";
    chip.innerHTML = `
      <span class="avatar">${AVATARS[i % AVATARS.length]}</span>
      <input value="${escapeHtml(name)}" maxlength="14" aria-label="Spelarnamn">
      <button title="Ta bort">✕</button>`;
    const input = chip.querySelector("input");
    const resize = () => { input.style.width = `${Math.max(4, input.value.length + 1)}ch`; };
    resize();
    input.oninput = resize;
    input.onchange = () => {
      store.players[i] = input.value.trim() || `Spelare ${i + 1}`;
      saveStore();
      renderPlayerChips();
    };
    chip.querySelector("button").onclick = () => {
      if (store.players.length <= 1) { toast("Någon måste ju spela! 🎤", "warn"); return; }
      store.players.splice(i, 1);
      saveStore();
      renderPlayerChips();
    };
    wrap.appendChild(chip);
  });

  const add = document.createElement("button");
  add.className = "p-chip p-chip-add";
  add.textContent = "＋ Lägg till";
  add.onclick = () => {
    if (store.players.length >= 8) { toast("Max 8 spelare – annars blir kvällen lång! 😅", "warn"); return; }
    store.players.push(`Spelare ${store.players.length + 1}`);
    saveStore();
    renderPlayerChips();
    const inputs = wrap.querySelectorAll(".p-chip input");
    const last = inputs[inputs.length - 1];
    if (last) { last.focus(); last.select(); }
  };
  wrap.appendChild(add);
}

function coverMosaic(pl) {
  const arts = pl.songs.filter((s) => s.art).map((s) => s.art).slice(0, 4);
  if (arts.length === 0) return `<div class="pl-mosaic pl-mosaic-empty">🎵</div>`;
  const cells = arts.map((a) => `<img src="${escapeHtml(a)}" alt="" loading="lazy">`);
  while (cells.length < 4) cells.push("<i></i>");
  return `<div class="pl-mosaic">${cells.join("")}</div>`;
}

function renderPlaylistPicker() {
  const wrap = $("playlist-picker");
  wrap.innerHTML = "";
  store.playlists.forEach((pl) => {
    const playable = pl.songs.filter((s) => s.year > 0).length;
    const div = document.createElement("div");
    div.className = "pl-card" + (pl.id === store.activeId ? " on" : "");
    div.innerHTML = `
      ${coverMosaic(pl)}
      <div class="pl-name">${escapeHtml(pl.name || "Namnlös")}</div>
      <div class="pl-meta">${playable ? `${playable} spelbara låtar` : "behöver årtal ⚠️"}</div>`;
    div.onclick = () => {
      store.activeId = pl.id;
      saveStore();
      renderPlaylistPicker();
    };
    wrap.appendChild(div);
  });
  const add = document.createElement("button");
  add.className = "pl-card pl-card-add";
  add.innerHTML = `<span class="pl-add-plus">＋</span><div class="pl-name">Hämta musik</div>`;
  add.onclick = () => goLibrary("setup");
  wrap.appendChild(add);
}

$("btn-setup-back").onclick = goHome;
$("btn-setup-library").onclick = () => goLibrary("setup");

/* ---------- Bibliotek & import ---------- */
function renderLibrary() {
  const grid = $("library-grid");
  grid.innerHTML = "";
  if (store.playlists.length === 0) {
    grid.innerHTML = `<p class="muted small-text center-text">Inga listor än – hämta din musik nedan 👇</p>`;
    return;
  }
  store.playlists.forEach((pl) => {
    const playable = pl.songs.filter((s) => s.year > 0).length;
    const div = document.createElement("button");
    div.className = "lib-card";
    div.innerHTML = `
      ${coverMosaic(pl)}
      <span class="lib-info">
        <span class="pl-name">${escapeHtml(pl.name || "Namnlös")}</span>
        <span class="pl-meta">${pl.songs.length} låtar · ${playable} spelbara${pl.id === store.activeId ? " · vald ✓" : ""}</span>
      </span>
      <span class="hi-arrow">→</span>`;
    div.onclick = () => {
      store.activeId = pl.id;
      saveStore();
      openEditor();
    };
    grid.appendChild(div);
  });
}

$("btn-library-back").onclick = () => (libraryReturn === "setup" ? goSetup() : goHome());

function openSheet(id) { $(id).classList.add("open"); }
function closeSheets() {
  document.querySelectorAll(".sheet").forEach((s) => s.classList.remove("open"));
}
document.querySelectorAll(".sheet [data-close]").forEach((el) => (el.onclick = closeSheets));

$("path-spotify").onclick = () => openSheet("sheet-spotify");
$("path-friend").onclick = () => openSheet("sheet-friend");
$("path-scratch").onclick = () => {
  const pl = { id: uid(), name: "Min nya lista", songs: [] };
  store.playlists.push(pl);
  store.activeId = pl.id;
  saveStore();
  openEditor();
  $("editor-add-details").open = true;
};
$("path-sample").onclick = () => {
  const pl = { id: uid(), name: SAMPLE_PLAYLIST.name, songs: structuredClone(SAMPLE_PLAYLIST.songs) };
  store.playlists.push(pl);
  store.activeId = pl.id;
  saveStore();
  renderLibrary();
  toast("Exempellistan ligger i hyllan – redo att spelas! 🎁", "ok");
};

$("btn-import-share-link").onclick = async () => {
  const v = $("input-share-link").value.trim();
  const m = v.match(/#pl=(.+)$/);
  if (!m) {
    toast("Hmm, det där ser inte ut som en delningslänk – den ska innehålla #pl=…", "err");
    return;
  }
  try {
    const p = await decodeShare(decodeURIComponent(m[1]));
    const pl = addImportedPlaylist(p);
    $("input-share-link").value = "";
    closeSheets();
    renderLibrary();
    toast(`”${pl.name}” importerad – tack kompisen! 💌`, "ok");
    offerQuickStart(pl);
  } catch (_) {
    toast("Kunde inte läsa länken – be kompisen skicka en ny.", "err");
  }
};

/* Gör om delad/importerad data till en ny lista i hyllan */
function addImportedPlaylist(p) {
  if (!p || !Array.isArray(p.songs)) throw new Error("fel format");
  const songs = p.songs.map(normalizeSong).filter((s) => s.artist || s.title);
  if (songs.length === 0) throw new Error("inga låtar");
  const pl = { id: uid(), name: p.name || "Importerad lista", songs };
  store.playlists.push(pl);
  store.activeId = pl.id;
  saveStore();
  return pl;
}

function renderSettings() {
  $("target-seg").querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.v) === store.settings.target);
  });
  $("mode-seg").querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", b.dataset.m === store.settings.mode);
  });
  $("toggle-tokens").setAttribute("aria-checked", String(store.settings.tokens));
  $("toggle-sound").setAttribute("aria-checked", String(store.settings.sound));
  $("toggle-exact").setAttribute("aria-checked", String(store.settings.exactBonus));
  $("toggle-theme").setAttribute("aria-checked", String(store.settings.theme === "dark"));
  $("rules-summary").textContent = [
    `först till ${store.settings.target}`,
    store.settings.mode === "decade" ? "🧒 decennium" : "🎯 klassiskt",
    store.settings.tokens ? "🪙 polletter" : "utan polletter",
  ].join(" · ");
  applyTheme();
}

$("target-seg").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    store.settings.target = Number(b.dataset.v);
    saveStore();
    renderSettings();
  };
});

$("mode-seg").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    store.settings.mode = b.dataset.m;
    saveStore();
    renderSettings();
  };
});

for (const [id, key] of [["toggle-tokens", "tokens"], ["toggle-sound", "sound"], ["toggle-exact", "exactBonus"]]) {
  $(id).onclick = () => {
    store.settings[key] = !store.settings[key];
    saveStore();
    renderSettings();
    if (key === "sound" && store.settings.sound) sfx.token();
  };
}

$("toggle-theme").onclick = () => {
  store.settings.theme = store.settings.theme === "light" ? "dark" : "light";
  saveStore();
  renderSettings();
};

function tryStartGame() {
  const names = store.players.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) { toast("Lägg till minst en spelare!", "err"); return false; }

  const pl = currentPlaylist();
  const valid = pl.songs.filter((s) => s.year > 0);
  const skipped = pl.songs.length - valid.length;
  const minSongs = names.length + 3;
  if (valid.length < minSongs) {
    toast(
      `”${pl.name}” behöver minst ${minSongs} låtar med årtal för ${names.length} spelare.` +
      (skipped ? ` Öppna listan och tryck 🍎 Komplettera – det brukar lösa det!` : " Fyll på med mer musik i biblioteket!"),
      "err"
    );
    return false;
  }
  if (skipped > 0) toast(`${skipped} låtar utan årtal sitter kvar på bänken denna omgång.`, "warn");
  localStorage.removeItem(GAME_KEY);
  startGame(names, store.settings.target, valid);
  return true;
}

$("btn-start-game").onclick = tryStartGame;

/* Efter en lyckad import: erbjud att dra igång en ny omgång direkt */
function offerQuickStart(pl) {
  const playable = pl.songs.filter((s) => s.year > 0).length;
  if (playable < 4) return; // för få spelbara låtar – stanna i redigeraren
  if (!confirm(`🎉 ”${pl.name}” är redo (${playable} spelbara låtar).\nStarta en ny omgång direkt?`)) return;
  store.activeId = pl.id;
  saveStore();
  if (!tryStartGame()) goSetup();
}

$("btn-resume").onclick = () => {
  const saved = loadSavedGame();
  if (!saved) { renderResume(); return; }
  game = saved;
  playerUI = PLAYER_UIS.game;
  loadTrack(game.card);
  showScreen("screen-game");
  renderGame();
  toast("Välkomna tillbaka – där ni slutade! 🎶", "ok");
};

$("btn-discard-game").onclick = () => {
  if (confirm("Slänga det pågående spelet?")) {
    localStorage.removeItem(GAME_KEY);
    renderResume();
  }
};

/* ==========================================================================
 * REDIGERAREN
 * ========================================================================== */
let editIndex = null;

function openEditor() {
  clearSongForm();
  $("input-song-search").value = "";
  renderEditor();
  showScreen("screen-editor");
}

function renderEditor() {
  const pl = currentPlaylist();
  $("input-playlist-name").value = pl.name || "";
  $("editor-song-count").textContent = pl.songs.length;
  $("editor-empty").classList.toggle("hidden", pl.songs.length > 0);

  const q = $("input-song-search").value.trim().toLowerCase();
  const ul = $("editor-song-list");
  ul.innerHTML = "";
  [...pl.songs]
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !q || `${s.artist} ${s.title} ${s.year}`.toLowerCase().includes(q))
    .sort((a, b) => a.s.year - b.s.year)
    .forEach(({ s, i }) => {
      const li = document.createElement("li");
      const flags =
        (parseMusicUrl(s.url).type !== "none" ? "🎧" : "🔎") +
        (s.tidbit ? " 💡" : "") +
        (s.year > 0 ? "" : " ⚠️");
      li.innerHTML = `
        <span class="song-year">${s.year > 0 ? escapeHtml(s.year) : "–"}</span>
        ${s.art ? `<img class="song-thumb" src="${escapeHtml(s.art)}" alt="" loading="lazy">` : ""}
        <span class="song-meta">
          <div class="t">${escapeHtml(s.title)}</div>
          <div class="a">${escapeHtml(s.artist)}</div>
        </span>
        <span class="song-flags" title="🎧 = har länk, 🔎 = YouTube-sökning, 💡 = har tidbit, ⚠️ = årtal saknas">${flags}</span>
        <button class="btn ghost small" data-act="edit">✏️</button>
        <button class="btn ghost small danger" data-act="del">🗑</button>`;
      li.querySelector('[data-act="edit"]').onclick = () => beginEditSong(i);
      li.querySelector('[data-act="del"]').onclick = () => {
        if (confirm(`Ta bort ”${s.title || s.artist}”?`)) {
          pl.songs.splice(i, 1);
          saveStore();
          renderEditor();
        }
      };
      ul.appendChild(li);
    });
}

$("input-song-search").oninput = renderEditor;

function beginEditSong(i) {
  const s = currentPlaylist().songs[i];
  editIndex = i;
  $("editor-add-details").open = true;
  $("editor-song-form-title").textContent = "✏️ Redigera låt";
  $("input-song-artist").value = s.artist;
  $("input-song-title").value = s.title;
  $("input-song-year").value = s.year || "";
  $("input-song-url").value = s.url;
  $("input-song-tidbit").value = s.tidbit;
  $("btn-cancel-edit").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  $("input-song-artist").focus();
}

function clearSongForm() {
  editIndex = null;
  $("editor-song-form-title").textContent = "➕ Lägg till låt";
  ["input-song-artist", "input-song-title", "input-song-year",
   "input-song-url", "input-song-tidbit"].forEach((id) => ($(id).value = ""));
  $("btn-cancel-edit").classList.add("hidden");
  $("editor-add-details").open = false;
}

$("btn-save-song").onclick = () => {
  const pl = currentPlaylist();
  const song = normalizeSong({
    artist: $("input-song-artist").value,
    title: $("input-song-title").value,
    year: $("input-song-year").value,
    url: $("input-song-url").value,
    tidbit: $("input-song-tidbit").value,
  });
  if (!song.artist && !song.title) {
    toast("Fyll i åtminstone artist eller titel.", "err");
    return;
  }
  if (song.year <= 0 &&
      !confirm("Inget årtal angivet – låten hoppas över i spelet tills året är ifyllt. Spara ändå?")) {
    return;
  }
  if (editIndex === null) pl.songs.push(song);
  else pl.songs[editIndex] = song;
  saveStore();
  clearSongForm();
  renderEditor();
  toast("Låten sparad! 🎵", "ok");
};

$("btn-cancel-edit").onclick = clearSongForm;

$("input-playlist-name").onchange = (e) => {
  currentPlaylist().name = e.target.value.trim() || "Namnlös";
  saveStore();
};

$("btn-delete-playlist").onclick = () => {
  const pl = currentPlaylist();
  if (!confirm(`Ta bort hela listan ”${pl.name}” (${pl.songs.length} låtar)?`)) return;
  store.playlists = store.playlists.filter((p) => p.id !== pl.id);
  if (store.playlists.length === 0) {
    store.playlists.push({ id: uid(), name: SAMPLE_PLAYLIST.name, songs: structuredClone(SAMPLE_PLAYLIST.songs) });
  }
  store.activeId = store.playlists[0].id;
  saveStore();
  goLibrary();
  toast("Listan är borta. 👋", "warn");
};

$("btn-editor-back").onclick = () => {
  clearSongForm();
  goLibrary();
};

/* --- Export / import / exempel --- */
$("btn-export").onclick = () => {
  const pl = currentPlaylist();
  const blob = new Blob(
    [JSON.stringify({ name: pl.name, songs: pl.songs }, null, 2)],
    { type: "application/json" }
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(pl.name || "spellista").replace(/[^\wåäöÅÄÖ -]/g, "")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

$("input-import").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const p = JSON.parse(await file.text());
    if (p && !p.name) p.name = file.name.replace(/\.json$/i, "");
    const pl = addImportedPlaylist(p);
    if (store.playlists.some((x) => x !== pl && x.name === pl.name)) pl.name += " (2)";
    saveStore();
    closeSheets();
    openEditor();
    toast(`”${pl.name}” importerad – ${pl.songs.length} låtar! 🎉`, "ok");
    offerQuickStart(pl);
  } catch (err) {
    toast(`Kunde inte läsa filen: ${err.message}`, "err");
  }
  e.target.value = "";
};

$("btn-copy-tidbit-prompt").onclick = async () => {
  const pl = currentPlaylist();
  const prompt =
`Hej Claude! Här är min Hitster-spellista som JSON:

${JSON.stringify({ name: pl.name, songs: pl.songs }, null, 2)}

Gör så här:
1. Skriv en kort, rolig och gärna överraskande "tidbit" på svenska (1–2 meningar) om artisten eller låten i fältet "tidbit" för varje låt.
2. Där "artist" är tom eller "year" är 0: fyll i artist och originalåret då låten först släpptes, om du känner igen låten (titeln och Spotify-länken i "url" är ledtrådar). Är du osäker på året, lämna 0.
3. Ändra inget annat – behåll "title", "url", "art" och "preview" exakt som de är.

Svara med enbart den kompletta JSON-filen (samma format) så att jag kan importera den direkt i spelet.`;
  try {
    await navigator.clipboard.writeText(prompt);
    toast("Prompt kopierad! Klistra in hos Claude → spara svaret som .json → importera här.", "ok");
  } catch (_) {
    window.prompt("Kopiera texten manuellt:", prompt);
  }
};

/* --- iTunes-uppslag: årtal, skivomslag och 30 s ljudsnutt --- */
async function itunesLookup(artist, title) {
  const term = encodeURIComponent(`${artist} ${title}`.trim());
  const res = await fetch(
    `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5&country=SE`
  );
  if (!res.ok) throw new Error(`iTunes svarade ${res.status}`);
  const results = (await res.json()).results || [];
  if (results.length === 0) return null;

  const norm = (x) => String(x || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const t = norm(title), a = norm(artist);
  const best = results.find((r) =>
    (!t || norm(r.trackName).includes(t) || t.includes(norm(r.trackName))) &&
    (!a || norm(r.artistName).includes(a) || a.includes(norm(r.artistName)))
  ) || results[0];

  const ym = String(best.releaseDate || "").match(/^(\d{4})/);
  return {
    artist: best.artistName || "",
    title: best.trackName || "",
    year: ym ? Number(ym[1]) : 0,
    art: (best.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
    preview: best.previewUrl || "",
  };
}

$("btn-autofill").onclick = async () => {
  const btn = $("btn-autofill");
  const pl = currentPlaylist();
  const todo = pl.songs.filter(
    (s) => (s.title || s.artist) && (s.year === 0 || !s.artist || !s.art || !s.preview)
  );
  if (todo.length === 0) { toast("Alla låtar har redan år, omslag och ljud! ✨", "ok"); return; }

  btn.disabled = true;
  let done = 0, filled = 0, failed = 0;
  for (const s of todo) {
    btn.textContent = `🍎 Slår upp ${++done}/${todo.length}…`;
    try {
      const hit = await itunesLookup(s.artist, s.title.replace(/\s*\(fyll i\)$/i, ""));
      if (hit) {
        if (s.year === 0 && hit.year) s.year = hit.year;
        if (!s.artist && hit.artist) s.artist = hit.artist;
        if (s.title.includes("Okänd låt") && hit.title) s.title = hit.title;
        if (!s.art && hit.art) s.art = hit.art;
        if (!s.preview && hit.preview) s.preview = hit.preview;
        filled++;
      } else failed++;
    } catch (_) { failed++; }
    saveStore();
    await new Promise((r) => setTimeout(r, 250)); // snällt mot API:t
  }
  btn.disabled = false;
  btn.textContent = "🍎 Auto-komplettera låtdata";
  renderEditor();
  toast(
    `Klart! ${filled} låtar kompletterade.` +
    (failed ? ` ${failed} hittades inte – fyll i dem för hand.` : " 🎉"),
    failed ? "warn" : "ok"
  );
};

/* --- Dela spellista via länk (allt bakas in i URL:en, ingen server) --- */
async function encodeShare(pl) {
  const bytes = new TextEncoder().encode(JSON.stringify({ name: pl.name, songs: pl.songs }));
  let payload = bytes, tag = "j";
  if (window.CompressionStream) {
    const buf = await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))
    ).arrayBuffer();
    payload = new Uint8Array(buf);
    tag = "z";
  }
  let bin = "";
  for (let i = 0; i < payload.length; i += 0x8000) {
    bin += String.fromCharCode(...payload.subarray(i, i + 0x8000));
  }
  return tag + "." + btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function decodeShare(s) {
  const dot = s.indexOf(".");
  const tag = s.slice(0, dot);
  const bin = atob(s.slice(dot + 1).replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  let json;
  if (tag === "z") {
    json = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
    ).text();
  } else {
    json = new TextDecoder().decode(bytes);
  }
  return JSON.parse(json);
}

$("btn-share").onclick = async () => {
  const pl = currentPlaylist();
  if (pl.songs.length === 0) { toast("Listan är tom – inget att dela.", "err"); return; }
  try {
    const link = location.origin + location.pathname + "#pl=" + await encodeShare(pl);
    await navigator.clipboard.writeText(link);
    toast(`Länk kopierad (${Math.round(link.length / 1024)} kB)! Skicka den till en kompis. 🔗`, "ok");
  } catch (_) {
    toast("Kunde inte skapa/kopiera länken i den här webbläsaren.", "err");
  }
};

async function importSharedFromHash() {
  const m = location.hash.match(/^#pl=(.+)$/);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    const p = await decodeShare(decodeURIComponent(m[1]));
    if (!p || !Array.isArray(p.songs)) throw new Error("fel format");
    if (!confirm(`📩 Någon har delat spellistan ”${p.name || "Namnlös"}” (${p.songs.length} låtar) med dig.\nLägga den i din hylla?`)) return;
    const pl = addImportedPlaylist(p);
    renderHome();
    toast(`”${pl.name}” ligger nu i din hylla! 🎉`, "ok");
    offerQuickStart(pl);
  } catch (_) {
    toast("Kunde inte läsa den delade länken – be om en ny.", "err");
  }
}

/* --- Utskrift av kort (QR-framsida + info-baksida) --- */
function songQrUrl(song) {
  if (parseMusicUrl(song.url).type !== "none") return song.url;
  return "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(`${song.artist} ${song.title}`);
}

function qrSvg(text) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
}

function renderPrint() {
  const pl = currentPlaylist();
  const songs = pl.songs.filter((s) => s.year > 0);
  $("print-title").textContent = `${pl.name} · ${songs.length} kort`;

  const wrap = $("print-pages");
  wrap.innerHTML = "";
  const PER_PAGE = 12, COLS = 3;

  const frontCard = (s) => {
    const d = document.createElement("div");
    d.className = "pcard pcard-front";
    let svg;
    try { svg = qrSvg(songQrUrl(s)); }
    catch (_) { svg = "<span style='font-size:3mm'>QR gick inte att skapa</span>"; }
    d.innerHTML = `<div class="pqr">${svg}</div><div class="pbrand">🎵 HITSERKOPIAN</div>`;
    return d;
  };
  const backCard = (s) => {
    const d = document.createElement("div");
    d.className = "pcard pcard-back";
    d.innerHTML = `
      <div class="pa">${escapeHtml(s.artist)}</div>
      <div class="py">${escapeHtml(s.year)}</div>
      <div class="pt">${escapeHtml(s.title)}</div>`;
    return d;
  };
  const emptyCell = () => {
    const d = document.createElement("div");
    d.className = "pcard pcard-empty";
    return d;
  };
  const label = (text) => {
    const d = document.createElement("div");
    d.className = "page-label";
    d.textContent = text;
    return d;
  };

  for (let off = 0; off < songs.length; off += PER_PAGE) {
    const chunk = songs.slice(off, off + PER_PAGE);
    const pageNo = off / PER_PAGE + 1;

    // Framsida: QR-koder i läsordning (fyll ut sista raden så speglingen stämmer)
    const padded = [...chunk];
    while (padded.length % COLS) padded.push(null);

    const front = document.createElement("div");
    front.className = "print-page";
    padded.forEach((s) => front.appendChild(s ? frontCard(s) : emptyCell()));

    // Baksida: varje rad spegelvänd, så dubbelsidig utskrift (vänd längs
    // långsidan) lägger rätt info bakom rätt QR-kod
    const back = document.createElement("div");
    back.className = "print-page";
    for (let r = 0; r < padded.length; r += COLS) {
      padded.slice(r, r + COLS).reverse()
        .forEach((s) => back.appendChild(s ? backCard(s) : emptyCell()));
    }

    wrap.appendChild(label(`Ark ${pageNo} – framsidor (QR)`));
    wrap.appendChild(front);
    wrap.appendChild(label(`Ark ${pageNo} – baksidor (år/artist/titel)`));
    wrap.appendChild(back);
  }
}

$("btn-print-cards").onclick = () => {
  const pl = currentPlaylist();
  const printable = pl.songs.filter((s) => s.year > 0).length;
  if (printable === 0) {
    toast("Inga låtar med årtal att skriva ut ännu.", "err");
    return;
  }
  const skipped = pl.songs.length - printable;
  if (skipped > 0) toast(`${skipped} låtar utan årtal hoppas över.`, "warn");
  renderPrint();
  showScreen("screen-print");
};

$("btn-print-back").onclick = () => showScreen("screen-editor");
$("btn-do-print").onclick = () => window.print();

/* --- Spotify-import: CSV (Exportify) & inklistrade länkar --- */
function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.length > 1 || row[0].trim() !== "") rows.push(row);
  return rows;
}

$("input-import-csv").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    // Importera till en egen ny lista (eller den aktiva om den är tom),
    // så gamla listan inte blandas ihop med den nya.
    let pl = currentPlaylist();
    if (pl.songs.length > 0) {
      pl = { id: uid(), name: file.name.replace(/\.csv$/i, "") || "Importerad lista", songs: [] };
      store.playlists.push(pl);
      store.activeId = pl.id;
    } else if (!pl.name || pl.name === "Ny spellista") {
      pl.name = file.name.replace(/\.csv$/i, "") || pl.name;
    }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) throw new Error("filen verkar vara tom");
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^﻿/, ""));
    const col = (...names) => header.findIndex((h) => names.some((n) => h.includes(n)));
    const iTitle = col("track name", "song name", "title");
    const iArtist = col("artist");
    const iDate = col("release", "year");
    const iUri = col("uri", "track url", "spotify url", "link");
    if (iTitle < 0 || iArtist < 0)
      throw new Error("hittar inga kolumner för titel/artist – är det en Exportify-CSV?");

    let added = 0, dupes = 0, missingYear = 0;
    for (const r of rows.slice(1)) {
      const title = (r[iTitle] || "").trim();
      const artist = (r[iArtist] || "").split(",")[0].trim();
      if (!title && !artist) continue;
      const ym = iDate >= 0 ? String(r[iDate] || "").match(/\d{4}/) : null;
      let url = "";
      const uriMatch = iUri >= 0 ? (r[iUri] || "").match(/track[:/]([A-Za-z0-9]+)/) : null;
      if (uriMatch) url = `https://open.spotify.com/track/${uriMatch[1]}`;
      const song = normalizeSong({ artist, title, year: ym ? Number(ym[0]) : 0, url, tidbit: "" });
      if (songExists(pl, song)) { dupes++; continue; }
      if (song.year === 0) missingYear++;
      pl.songs.push(song);
      added++;
    }
    saveStore();
    closeSheets();
    openEditor();
    toast(
      `${added} låtar in i ”${pl.name}”! 🎉` +
      (dupes ? ` ${dupes} dubbletter hoppades över.` : "") +
      (missingYear ? ` ⚠️ ${missingYear} saknar årtal – tryck 🍎 Komplettera.` : ""), "ok"
    );
    offerQuickStart(pl);
  } catch (err) {
    toast(`Kunde inte läsa CSV-filen: ${err.message}`, "err");
  }
  e.target.value = "";
};

$("btn-import-links").onclick = async () => {
  const btn = $("btn-import-links");
  const pl = currentPlaylist();
  const urls = [...new Set(
    $("input-paste-links").value.split(/\s+/).filter((u) => parseMusicUrl(u).type !== "none")
  )];
  if (urls.length === 0) {
    toast("Hittade inga giltiga Spotify- eller YouTube-länkar.", "err");
    return;
  }
  btn.disabled = true;
  btn.textContent = "⏳ Hämtar låtinfo…";
  try {
    const songs = await Promise.all(urls.map(async (url) => {
      let title = "";
      if (parseMusicUrl(url).type === "spotify") {
        try {
          const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
          if (res.ok) title = (await res.json()).title || "";
        } catch (_) { /* offline – fylls i manuellt */ }
      }
      return normalizeSong({ artist: "", title: title || "Okänd låt (fyll i)", year: 0, url, tidbit: "" });
    }));
    let added = 0, dupes = 0;
    for (const song of songs) {
      if (songExists(pl, song)) { dupes++; continue; }
      pl.songs.push(song);
      added++;
    }
    saveStore();
    closeSheets();
    openEditor();
    $("input-paste-links").value = "";
    toast(
      `La till ${added} låtar!` + (dupes ? ` (${dupes} dubbletter.)` : "") +
      ` Tryck 🍎 Komplettera så hämtas årtal, omslag och ljud.`, "warn"
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "🔗 Lägg till länkarna";
  }
};

/* ==========================================================================
 * MUSIKSPELARE (dold YouTube-/Spotify-spelare med egna kontroller)
 * ========================================================================== */
let ytPlayer = null;
let spotifyApi = null;
let spotifyController = null;
let previewAudio = null;
let currentTrack = { type: "none" };

/* Två uppsättningar spelarkontroller: spelets och skannerns */
const PLAYER_UIS = {
  game: { wrap: "embed-wrap", holder: "embed-holder", play: "btn-play", pause: "btn-pause",
          search: "btn-yt-search", toggle: "btn-toggle-embed", vinyl: "vinyl", eq: "eq-game" },
  scan: { wrap: "scan-embed-wrap", holder: "scan-embed-holder", play: "btn-scan-play", pause: "btn-scan-pause",
          search: "btn-scan-yt", toggle: "btn-scan-toggle", vinyl: "scan-vinyl", eq: "eq-scan" },
};
let playerUI = PLAYER_UIS.game;

window.onSpotifyIframeApiReady = (api) => { spotifyApi = api; };

function destroyPlayers() {
  if (ytPlayer) { try { ytPlayer.destroy(); } catch (_) {} ytPlayer = null; }
  if (spotifyController) { try { spotifyController.destroy(); } catch (_) {} spotifyController = null; }
  if (previewAudio) { try { previewAudio.pause(); } catch (_) {} previewAudio = null; }
  $(PLAYER_UIS.game.holder).innerHTML = "";
  $(PLAYER_UIS.scan.holder).innerHTML = "";
}

function setSpinning(on) {
  $(playerUI.vinyl).classList.toggle("spinning", on);
  $(playerUI.eq).classList.toggle("on", on);
}

function loadTrack(song) {
  destroyPlayers();
  setSpinning(false);

  const wrap = $(playerUI.wrap);
  wrap.classList.remove("show-embed");
  $(playerUI.play).classList.remove("hidden");
  $(playerUI.pause).classList.add("hidden");
  $(playerUI.search).classList.add("hidden");
  $(playerUI.toggle).classList.add("hidden");
  $(playerUI.toggle).textContent = "👀 Visa spelaren";

  // 30-sekunderssnutt från iTunes: pålitligast och helt osynlig – vinner
  if (song.preview) {
    currentTrack = { type: "preview", url: song.preview };
    wrap.classList.add("empty");
    return;
  }

  currentTrack = parseMusicUrl(song.url);

  if (currentTrack.type === "none") {
    wrap.classList.add("empty");
    $(playerUI.play).classList.add("hidden");
    const q = encodeURIComponent(`${song.artist} ${song.title}`);
    const a = $(playerUI.search);
    a.href = `https://www.youtube.com/results?search_query=${q}`;
    a.classList.remove("hidden");
    return;
  }

  wrap.classList.remove("empty");
  $(playerUI.toggle).classList.remove("hidden");

  const holder = document.createElement("div");
  $(playerUI.holder).appendChild(holder);

  if (currentTrack.type === "youtube") {
    const create = () => {
      ytPlayer = new YT.Player(holder, {
        width: "420", height: "236",
        videoId: currentTrack.id,
        playerVars: { rel: 0 },
      });
    };
    if (window.YT && YT.Player) create();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); create(); };
    }
  } else if (currentTrack.type === "spotify") {
    const create = () => {
      spotifyApi.createController(
        holder,
        { uri: `spotify:track:${currentTrack.id}`, width: "100%", height: 152 },
        (controller) => { spotifyController = controller; }
      );
    };
    if (spotifyApi) create();
    else {
      const prev = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api) => { spotifyApi = api; prev?.(api); create(); };
    }
  }
}

function resetPlayButtons() {
  setSpinning(false);
  $(playerUI.pause).classList.add("hidden");
  $(playerUI.play).classList.remove("hidden");
}

function playMusic() {
  if (currentTrack.type === "preview") {
    if (!previewAudio) {
      previewAudio = new Audio(currentTrack.url);
      previewAudio.onended = resetPlayButtons;
      previewAudio.onerror = () => { resetPlayButtons(); toast("Ljudsnutten gick inte att spela.", "err"); };
    }
    previewAudio.play().catch(() => toast("Kunde inte starta ljudet – försök igen.", "err"));
  }
  else if (currentTrack.type === "youtube" && ytPlayer?.playVideo) ytPlayer.playVideo();
  else if (currentTrack.type === "spotify" && spotifyController) spotifyController.play();
  else return;
  setSpinning(true);
  $(playerUI.play).classList.add("hidden");
  $(playerUI.pause).classList.remove("hidden");
}

function pauseMusic() {
  if (currentTrack.type === "preview" && previewAudio) previewAudio.pause();
  else if (currentTrack.type === "youtube" && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
  else if (currentTrack.type === "spotify" && spotifyController) spotifyController.pause();
  resetPlayButtons();
}

function toggleEmbed() {
  const wrap = $(playerUI.wrap);
  wrap.classList.toggle("show-embed");
  $(playerUI.toggle).textContent = wrap.classList.contains("show-embed")
    ? "🙈 Dölj spelaren"
    : "👀 Visa spelaren";
}

for (const ui of Object.values(PLAYER_UIS)) {
  $(ui.play).onclick = playMusic;
  $(ui.pause).onclick = pauseMusic;
  $(ui.toggle).onclick = toggleEmbed;
}

function stopMusic() {
  if (previewAudio) { try { previewAudio.pause(); } catch (_) {} }
  if (currentTrack.type === "youtube" && ytPlayer?.pauseVideo) { try { ytPlayer.pauseVideo(); } catch (_) {} }
  if (currentTrack.type === "spotify" && spotifyController) { try { spotifyController.pause(); } catch (_) {} }
  setSpinning(false);
}

/* ==========================================================================
 * QR-SKANNER – skanna utskrivna kort, spela dolt i appen
 * ========================================================================== */
let scanStream = null;
let scanTimer = null;
let scanCurrent = null;

function findSongByQr(text) {
  const target = parseMusicUrl(text);
  let searchQuery = "";
  try {
    const u = new URL(text);
    if (u.hostname.replace(/^www\./, "").endsWith("youtube.com") && u.pathname === "/results") {
      searchQuery = (u.searchParams.get("search_query") || "").toLowerCase().trim();
    }
  } catch (_) { /* ingen URL */ }

  for (const pl of store.playlists) {
    for (const s of pl.songs) {
      if (s.url && s.url === text) return s;
      if (target.type !== "none") {
        const own = parseMusicUrl(s.url);
        if (own.type === target.type && own.id === target.id) return s;
      }
      if (searchQuery && `${s.artist} ${s.title}`.toLowerCase().trim() === searchQuery) return s;
    }
  }
  return null;
}

async function startScanner() {
  playerUI = PLAYER_UIS.scan;
  showScreen("screen-scan");
  $("scan-result").classList.add("hidden");
  $("scan-view").classList.remove("hidden");
  $("scan-error").classList.add("hidden");
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch (_) {
    const err = $("scan-error");
    err.textContent = "🚫 Kunde inte öppna kameran. Ge sidan kameratillstånd och testa igen (kräver https).";
    err.classList.remove("hidden");
    return;
  }
  const video = $("scan-video");
  video.srcObject = scanStream;
  try { await video.play(); } catch (_) { /* iOS kräver playsinline – satt i HTML */ }

  const detector = "BarcodeDetector" in window
    ? new BarcodeDetector({ formats: ["qr_code"] })
    : null;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  scanTimer = setInterval(async () => {
    if (!video.videoWidth) return;
    let text = null;
    try {
      if (detector) {
        const codes = await detector.detect(video);
        if (codes.length) text = codes[0].rawValue;
      } else if (window.jsQR) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height);
        if (hit) text = hit.data;
      }
    } catch (_) { /* försök igen nästa varv */ }
    if (text) {
      stopScanCamera();
      handleScan(text);
    }
  }, 350);
}

function stopScanCamera() {
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
}

function handleScan(text) {
  const song = findSongByQr(text);
  scanCurrent = song || normalizeSong({
    title: "", artist: "",
    url: /^https?:\/\//i.test(text) ? text : "",
  });

  $("scan-view").classList.add("hidden");
  $("scan-result").classList.remove("hidden");
  $("scan-reveal").classList.add("hidden");
  $("btn-scan-reveal").disabled = false;
  playerUI = PLAYER_UIS.scan;
  loadTrack(scanCurrent);
  sfx.token();
  if (!song) {
    toast(
      scanCurrent.url
        ? "Kortet finns inte i dina sparade listor – spelar ändå dolt."
        : "QR-koden innehöll ingen spelbar länk.",
      "warn"
    );
  }
}

$("btn-scan-reveal").onclick = () => {
  if (!scanCurrent) return;
  stopMusic();
  $(PLAYER_UIS.scan.wrap).classList.add("show-embed");
  const s = scanCurrent;
  const known = s.title || s.artist;
  $("scan-reveal-card").innerHTML = known ? `
    ${s.art ? `<img class="reveal-art" src="${escapeHtml(s.art)}" alt="">` : ""}
    <div class="card-year">${s.year > 0 ? escapeHtml(s.year) : "?"}</div>
    <div class="card-title">${escapeHtml(s.title)}</div>
    <div class="card-artist">${escapeHtml(s.artist)}</div>` : `
    <div class="card-title">Okänt kort 🤷</div>
    <div class="card-artist">${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">Öppna länken</a>` : "Ingen länk hittades"}</div>`;
  const tb = $("scan-tidbit");
  tb.classList.toggle("hidden", !s.tidbit);
  tb.textContent = s.tidbit || "";
  $("scan-reveal").classList.remove("hidden");
  $("btn-scan-reveal").disabled = true;
  if (known && s.year > 0) odometer($("scan-reveal-card").querySelector(".card-year"), s.year);
};

$("btn-scan-next").onclick = () => {
  stopMusic();
  destroyPlayers();
  startScanner();
};

$("btn-scan-back").onclick = () => {
  stopScanCamera();
  stopMusic();
  destroyPlayers();
  playerUI = PLAYER_UIS.game;
  goHome();
};

/* ==========================================================================
 * SPELET
 * ========================================================================== */

/* Rullande årtalssiffror (odometer) */
function odometer(el, number) {
  const digits = String(number).split("");
  el.innerHTML = digits.map(() =>
    `<span class="odo-col"><span class="odo-strip">${
      "0123456789".split("").map((n) => `<i>${n}</i>`).join("")
    }</span></span>`
  ).join("");
  el.classList.add("odo");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll(".odo-strip").forEach((strip, i) => {
      strip.style.transitionDelay = `${i * 0.1}s`;
      strip.style.transform = `translateY(-${Number(digits[i])}em)`;
    });
  }));
}
let game = null;

function saveGame() {
  if (game) localStorage.setItem(GAME_KEY, JSON.stringify(game));
}

function loadSavedGame() {
  try {
    const g = JSON.parse(localStorage.getItem(GAME_KEY) || "null");
    if (g && Array.isArray(g.players) && g.card) return g;
  } catch (_) { /* trasigt sparfil */ }
  return null;
}

function startGame(names, target, songs) {
  const deck = shuffle(songs);
  const players = names.map((name, i) => ({
    name,
    avatar: AVATARS[i % AVATARS.length],
    color: COLORS[i % COLORS.length],
    timeline: [deck.pop()],
    tokens: store.settings.tokens ? 2 : 0,
  }));

  game = {
    players,
    deck,
    target,
    current: 0,
    card: null,
    selectedSlot: null,
    revealed: false,
    bonusGiven: false,
    exactGiven: false,
    useTokens: store.settings.tokens,
    mode: store.settings.mode,           // 'classic' | 'decade'
    exactBonus: store.settings.exactBonus,
    solo: players.length === 1,          // soloträning: ett fel = slut
    over: false,
    discard: [],                         // felplacerade/bytta kort
    sudden: false,                       // sudden death-läge
    alive: null,                         // spelarindex kvar i sudden death
    locked: false,   // gissningen låst → utmaningsfas
    bets: [],        // [{ p: spelarindex, slot }]
    picking: null,   // spelarindex som just väljer lucka för sin utmaning
  };
  if (game.solo) toast("🧑‍🎤 Soloträning: bygg så långt du kan – ett fel och det är över!", "warn");
  nextCard();
  showScreen("screen-game");
  if (!game.solo) showHandoff("Först ut:");
}

/* "Skicka mobilen"-ögonblicket: nästa spelare tar över utan att tjuvkika */
function showHandoff(prefix = "Din tur,") {
  const p = currentPlayer();
  const av = $("handoff-avatar");
  av.textContent = p.avatar;
  av.style.background = `${p.color}33`;
  av.style.borderColor = p.color;
  $("handoff-title").textContent = `${prefix} ${p.name}!`;
  $("handoff").classList.remove("hidden");
}

$("btn-handoff-go").onclick = () => $("handoff").classList.add("hidden");

function nextCard() {
  if (game.deck.length === 0) {
    // Oavgjort med kort i slaskhögen? Sudden death!
    if (!game.solo && !game.sudden && game.discard.length > 0) {
      const max = Math.max(...game.players.map((p) => p.timeline.length));
      const tied = game.players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.timeline.length === max);
      if (tied.length > 1) {
        game.sudden = true;
        game.alive = tied.map(({ i }) => i);
        game.deck = shuffle(game.discard);
        game.discard = [];
        game.current = game.alive[0];
        toast(`☠️ Sudden death mellan ${tied.map(({ p }) => p.name).join(" & ")} – först rätt vinner!`, "warn");
        sfx.wrong();
      } else { endGame(null); return; }
    } else { endGame(null); return; }
  }
  game.card = game.deck.pop();
  game.selectedSlot = null;
  game.revealed = false;
  game.bonusGiven = false;
  game.exactGiven = false;
  game.locked = false;
  game.bets = [];
  game.picking = null;
  $("reveal-stamp").classList.add("hidden");
  const flip = $("flip-card");
  flip.classList.remove("flipped", "deal");
  void flip.offsetWidth; // starta om kortgivnings-animationen
  flip.classList.add("deal");
  setTimeout(() => flip.classList.remove("deal"), 700);
  loadTrack(game.card);
  saveGame();
  renderGame();
}

/* Får kortet plats i luckan `slot` på tidslinjen `tl`?
   I decennieläget räcker rätt årtionde. */
function slotFits(tl, slot, year) {
  const k = game && game.mode === "decade" ? (y) => Math.floor(y / 10) : (y) => y;
  const before = slot === 0 ? null : tl[slot - 1];
  const after = slot === tl.length ? null : tl[slot];
  return (!before || k(before.year) <= k(year)) && (!after || k(year) <= k(after.year));
}

function insertByYear(tl, card) {
  let idx = tl.findIndex((s) => s.year > card.year);
  if (idx === -1) idx = tl.length;
  tl.splice(idx, 0, card);
}

function stealPossible() {
  if (game.solo || game.sudden) return false;
  return game.useTokens &&
    game.players.some((pl, i) => i !== game.current && (pl.tokens >= 1 || game.bets.some((b) => b.p === i)));
}

function currentPlayer() { return game.players[game.current]; }

function renderGame() {
  const p = currentPlayer();
  $("deck-count").textContent = `🃏 ${game.deck.length}`;
  $("timeline-heading").innerHTML =
    (game.sudden ? "☠️ " : "") +
    `${p.avatar} <b>${escapeHtml(p.name)}</b>s skivback · ` +
    (game.solo ? `${p.timeline.length} skivor` : `${p.timeline.length}/${game.target}`);
  $("timeline-hint").innerHTML =
    game.sudden ? "☠️ <b>Sudden death:</b> första rätta placeringen vinner allt!" :
    game.mode === "decade"
      ? "Tryck på ett fack <b>+</b> – i decennieläget räcker rätt årtionde! 🧒"
      : "Tryck på ett fack <b>+</b> där du tror att skivan hör hemma!";
  $("reveal-panel").classList.toggle("hidden", !game.revealed);
  $("timeline-hint").classList.toggle("hidden", game.revealed || game.locked);
  $("flip-card").classList.toggle("flipped", game.revealed);
  const fy = $("flip-year");
  if (game.revealed && !fy.classList.contains("odo")) fy.textContent = game.card.year;
  if (!game.revealed) { fy.classList.remove("odo"); fy.textContent = ""; }

  // Avslöja-/Lås-knappen
  const btnReveal = $("btn-reveal");
  btnReveal.classList.toggle("hidden", game.revealed);
  btnReveal.disabled = game.selectedSlot === null || game.picking !== null;
  btnReveal.textContent =
    !game.locked && stealPossible() ? "Lås gissningen" : "Vänd på skivan!";

  // Byt låt-knapp (pollett)
  $("btn-skip-song").classList.toggle(
    "hidden",
    !game.useTokens || game.revealed || game.locked || p.tokens < 1
  );

  // Utmaningspanelen
  const cp = $("challenge-panel");
  const inChallenge = game.locked && !game.revealed;
  cp.classList.toggle("hidden", !inChallenge);
  if (inChallenge) {
    const hint = $("challenge-hint");
    const act = $("challenge-actions");
    act.innerHTML = "";
    if (game.picking !== null) {
      const ch = game.players[game.picking];
      hint.innerHTML = `${ch.avatar} <b>${escapeHtml(ch.name)}</b>: tryck på luckan där <b>du</b> tror låten hör hemma!`;
      const cancel = document.createElement("button");
      cancel.className = "btn ghost small";
      cancel.textContent = "Ångra";
      cancel.onclick = () => { game.picking = null; renderGame(); };
      act.appendChild(cancel);
    } else {
      hint.innerHTML = `😈 Tror ni att <b>${escapeHtml(p.name)}</b> har fel? Utmana för 1 🪙 – rätt lucka snor kortet!`;
      game.players.forEach((pl2, idx) => {
        if (idx === game.current) return;
        const bet = game.bets.find((b) => b.p === idx);
        const b2 = document.createElement("button");
        b2.className = "btn secondary small";
        if (bet) {
          b2.textContent = `${pl2.avatar} ${pl2.name} har satsat ✕`;
          b2.onclick = () => {
            game.bets = game.bets.filter((b) => b.p !== idx);
            pl2.tokens++;
            saveGame(); renderGame();
          };
        } else if (pl2.tokens >= 1) {
          b2.textContent = `😈 ${pl2.name} utmanar (1 🪙)`;
          b2.onclick = () => { game.picking = idx; renderGame(); };
        } else {
          return;
        }
        act.appendChild(b2);
      });
    }
  }

  // Poängtavla
  const sb = $("scoreboard");
  sb.innerHTML = "";
  game.players.forEach((pl, i) => {
    const out = game.sudden && !game.alive.includes(i);
    const chip = document.createElement("span");
    chip.className = "sb-chip" + (i === game.current ? " on" : "") + (out ? " out" : "");
    chip.innerHTML =
      `<span class="avatar" style="background:${pl.color}33">${pl.avatar}</span>` +
      `<b>${escapeHtml(pl.name)}</b> ` +
      (game.solo ? `${pl.timeline.length}` : `${pl.timeline.length}/${game.target}`) +
      (game.useTokens ? `<span class="sb-tokens">🪙${pl.tokens}</span>` : "") +
      (out ? " 💤" : "");
    sb.appendChild(chip);
  });

  // Tidslinje med luckor
  const tl = $("timeline");
  tl.innerHTML = "";
  const addSlot = (i) => {
    const b = document.createElement("button");
    b.className = "slot" + (game.selectedSlot === i ? " selected" : "");
    const dots = game.bets
      .filter((bet) => bet.slot === i)
      .map((bet) => `<i style="background:${game.players[bet.p].color}" title="${escapeHtml(game.players[bet.p].name)}"></i>`)
      .join("");
    b.innerHTML = `+${dots ? `<span class="slot-dots">${dots}</span>` : ""}`;
    b.title = "Ställ skivan här";
    b.disabled = game.revealed || (game.locked && game.picking === null);
    b.onclick = () => {
      if (game.picking !== null) {
        if (i === game.selectedSlot) { toast(`Välj en annan lucka än ${p.name}s!`, "warn"); return; }
        const ch = game.players[game.picking];
        ch.tokens--;
        game.bets.push({ p: game.picking, slot: i });
        game.picking = null;
        sfx.token();
        saveGame(); renderGame();
      } else if (!game.locked) {
        game.selectedSlot = i;
        saveGame(); renderGame();
      }
    };
    tl.appendChild(b);
  };
  addSlot(0);
  p.timeline.forEach((s, i) => {
    const c = document.createElement("div");
    c.className = "card" + (game.justPlaced === i ? " new-card" : "");
    c.innerHTML = `
      ${s.art ? `<img class="card-art" src="${escapeHtml(s.art)}" alt="" loading="lazy">` : ""}
      <div class="card-year">${escapeHtml(s.year)}</div>
      <div class="card-info">${escapeHtml(s.title)}<br>${escapeHtml(s.artist)}</div>`;
    tl.appendChild(c);
    addSlot(i + 1);
  });
  game.justPlaced = undefined;

  // Övriga spelare
  const others = $("other-players");
  const rest = game.players
    .map((pl, i) => ({ pl, i }))
    .filter(({ i }) => i !== game.current);
  others.classList.toggle("hidden", rest.length === 0);
  others.innerHTML = rest.length === 0 ? "" : "<h3>👀 Övriga tidslinjer</h3>";
  rest.forEach(({ pl }) => {
    const div = document.createElement("div");
    div.className = "other-player";
    div.innerHTML =
      `<div class="op-name"><span class="avatar" style="background:${pl.color}33">${pl.avatar}</span>` +
      `${escapeHtml(pl.name)} <span class="muted">(${pl.timeline.length}/${game.target})</span></div>` +
      `<div class="op-cards">` +
      pl.timeline.map((s) => `<span class="op-chip"><b>${escapeHtml(s.year)}</b> ${escapeHtml(s.title)}</span>`).join("") +
      `</div>`;
    others.appendChild(div);
  });
}

$("btn-skip-song").onclick = () => {
  const p = currentPlayer();
  if (!game.useTokens || p.tokens < 1 || game.revealed) return;
  p.tokens--;
  game.discard.push(game.card);
  stopMusic();
  sfx.token();
  toast(`${p.name} bytte låt! (−1 🪙)`, "warn");
  nextCard();
};

$("btn-reveal").onclick = () => {
  if (game.selectedSlot === null || game.revealed || game.picking !== null) return;
  if (!game.locked && stealPossible()) {
    game.locked = true;
    saveGame();
    renderGame();
    return;
  }
  doReveal();
};

function doReveal() {
  stopMusic();

  const p = currentPlayer();
  const i = game.selectedSlot;
  const card = game.card;
  const correct = slotFits(p.timeline, i, card.year);

  // Stöld: om aktiva spelaren har fel vinner första utmanare med rätt lucka
  let stealer = null;
  if (!correct) {
    const winningBet = game.bets.find((b) => slotFits(p.timeline, b.slot, card.year));
    if (winningBet) stealer = game.players[winningBet.p];
  }

  game.revealed = true;
  game.picking = null;
  $(PLAYER_UIS.game.wrap).classList.add("show-embed");
  $("flip-card").classList.add("flipped");
  odometer($("flip-year"), card.year);

  const res = $("reveal-result");
  const stamp = $("reveal-stamp");
  stamp.classList.remove("hidden");
  if (correct && game.sudden) {
    res.textContent = "Rätt fack – och därmed hela vinsten!";
    res.className = "reveal-result ok";
    stamp.textContent = "SÅLD!";
    stamp.className = "stamp ok";
  } else if (correct) {
    res.textContent = "Rätt i backen!";
    res.className = "reveal-result ok";
    stamp.textContent = "SÅLD!";
    stamp.className = "stamp ok";
  } else if (stealer) {
    res.textContent = `${stealer.name} satsade rätt och snor skivan!`;
    res.className = "reveal-result ok";
    stamp.textContent = "SNODD!";
    stamp.className = "stamp ok";
  } else if (game.solo) {
    res.textContent = "Fel fack – rundan är över!";
    res.className = "reveal-result fail";
    stamp.textContent = "FEL FACK";
    stamp.className = "stamp fail";
  } else {
    res.textContent = "Fel fack – skivan åker tillbaka.";
    res.className = "reveal-result fail";
    stamp.textContent = "FEL FACK";
    stamp.className = "stamp fail";
  }

  $("reveal-card").innerHTML = `
    ${card.art ? `<img class="reveal-art" src="${escapeHtml(card.art)}" alt="">` : ""}
    <div class="card-year">${escapeHtml(card.year)}</div>
    <div class="card-title">${escapeHtml(card.title)}</div>
    <div class="card-artist">${escapeHtml(card.artist)}</div>`;

  const tb = $("reveal-tidbit");
  tb.classList.toggle("hidden", !card.tidbit);
  tb.textContent = card.tidbit || "";

  $("btn-bonus").classList.toggle("hidden", !game.useTokens);
  $("btn-bonus").disabled = false;
  $("btn-exact").classList.toggle("hidden", !(game.useTokens && game.exactBonus));
  $("btn-exact").disabled = false;

  if (correct) {
    sfx.correct();
    confetti.burst();
    p.timeline.splice(i, 0, card);
    game.justPlaced = i;
    if (game.sudden || (!game.solo && p.timeline.length >= game.target)) {
      saveGame();
      renderGame();
      setTimeout(() => endGame(p), 1500);
      return;
    }
  } else if (stealer) {
    sfx.correct();
    confetti.burst();
    insertByYear(stealer.timeline, card);
    toast(`😈 ${stealer.name} satsade rätt och stjäl kortet!`, "ok");
    if (stealer.timeline.length >= game.target) {
      saveGame();
      renderGame();
      setTimeout(() => endGame(stealer), 1500);
      return;
    }
  } else {
    sfx.wrong();
    game.discard.push(card);
    if (game.solo) {
      game.over = true;
      $("btn-next").textContent = "🏁 Se resultat";
    }
    const panel = document.querySelector(".timeline-panel");
    panel.classList.add("shake");
    setTimeout(() => panel.classList.remove("shake"), 500);
  }
  saveGame();
  renderGame();
}

$("btn-bonus").onclick = () => {
  if (game.bonusGiven) return;
  game.bonusGiven = true;
  const p = currentPlayer();
  p.tokens++;
  sfx.token();
  $("btn-bonus").disabled = true;
  toast(`${p.name} prickade artist + titel: +1 🪙!`, "ok");
  saveGame();
  renderGame();
};

$("btn-exact").onclick = () => {
  if (game.exactGiven) return;
  game.exactGiven = true;
  const p = currentPlayer();
  p.tokens++;
  sfx.token();
  $("btn-exact").disabled = true;
  toast(`${p.name} prickade exakta året (${game.card.year}): +1 🪙!`, "ok");
  saveGame();
  renderGame();
};

$("btn-next").onclick = () => {
  stopMusic();
  $("btn-next").textContent = "➡ Nästa spelare";
  if (game.over) { endGame(null); return; }
  if (game.sudden) {
    const pos = game.alive.indexOf(game.current);
    game.current = game.alive[(pos + 1) % game.alive.length];
  } else if (!game.solo) {
    game.current = (game.current + 1) % game.players.length;
  }
  nextCard();
  if (!game.solo && game.players.length > 1) showHandoff();
};

function endGame(winner) {
  stopMusic();
  destroyPlayers();
  localStorage.removeItem(GAME_KEY);

  const sorted = [...game.players].sort((a, b) => b.timeline.length - a.timeline.length);
  const max = sorted[0].timeline.length;
  const tops = sorted.filter((p) => p.timeline.length === max);
  const medals = ["🥇", "🥈", "🥉"];

  if (game.solo) {
    // Soloträning: poäng + rekord
    const score = game.players[0].timeline.length;
    const prev = store.highscore?.score ?? 0;
    const record = score > prev;
    if (record) {
      store.highscore = { score, name: game.players[0].name };
      saveStore();
    }
    $("winner-text").textContent = record
      ? `NYTT BUTIKSREKORD: ${score} skivor!`
      : `${score} skivor denna runda!`;
    $("standings").innerHTML = `
      <div class="standing-row">
        <span class="medal">🎯</span>
        <span class="name">Din runda</span>
        <span class="score">${score} skivor</span>
      </div>
      <div class="standing-row">
        <span class="medal">🏆</span>
        <span class="name">Rekord${store.highscore?.name ? ` (${escapeHtml(store.highscore.name)})` : ""}</span>
        <span class="score">${store.highscore?.score ?? score} skivor</span>
      </div>`;
  } else {
    if (winner) {
      $("winner-text").textContent = game.sudden
        ? `☠️ ${winner.name} vinner sudden death! 🎉`
        : `${winner.name} vinner! 🎉`;
    } else if (tops.length === 1) {
      $("winner-text").textContent = `Backen är tom – ${tops[0].name} vinner med ${max} skivor!`;
    } else {
      $("winner-text").textContent =
        `Backen är tom – oavgjort mellan ${tops.map((p) => p.name).join(" & ")}!`;
    }
    $("standings").innerHTML = sorted.map((p, i) => `
      <div class="standing-row">
        <span class="medal">${medals[i] || "•"}</span>
        <span class="avatar" style="background:${p.color}33">${p.avatar}</span>
        <span class="name">${escapeHtml(p.name)}</span>
        <span class="score">${p.timeline.length} skivor</span>
      </div>`).join("");
  }

  showScreen("screen-winner");
  sfx.win();
  confetti.rain();
}

$("btn-quit").onclick = () => {
  if (confirm("Avsluta spelet? (Omgången slängs.)")) {
    stopMusic();
    destroyPlayers();
    localStorage.removeItem(GAME_KEY);
    $("handoff").classList.add("hidden");
    goHome();
  }
};

$("btn-play-again").onclick = goSetup;
$("btn-winner-home").onclick = goHome;

/* ==========================================================================
 * Init
 * ========================================================================== */
renderHome();
importSharedFromHash();
addEventListener("hashchange", importSharedFromHash);
