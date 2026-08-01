/* ==========================================================================
 * Hitserkopian – en Hitster-klon med egen spellista
 * ========================================================================== */

const STORE_KEY = "hitserkopian.v2";
const GAME_KEY = "hitserkopian.game";
const LEGACY_KEY = "hitserkopian.playlist";

const AVATARS = ["🎸", "🎤", "🎧", "🥁", "🎹", "🎺", "🎻", "🪩"];
const COLORS = ["#ff4d8d", "#8b5cf6", "#22d3ee", "#34d399", "#ffcf5c", "#fb7185", "#a3e635", "#f97316"];

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

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
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
 * STARTSKÄRM
 * ========================================================================== */
function renderStart() {
  renderResume();
  renderPlaylistPicker();
  renderSettings();
}

function renderResume() {
  const saved = loadSavedGame();
  $("resume-banner").classList.toggle("hidden", !saved);
  if (saved) {
    const p = saved.players[saved.current];
    $("resume-info").textContent =
      `${p.name} står på tur · ${saved.deck.length} kort kvar · mål ${saved.target}`;
  }
}

function renderPlaylistPicker() {
  const wrap = $("playlist-picker");
  wrap.innerHTML = "";
  store.playlists.forEach((pl) => {
    const playable = pl.songs.filter((s) => s.year > 0).length;
    const div = document.createElement("div");
    div.className = "pl-card" + (pl.id === store.activeId ? " on" : "");
    div.innerHTML = `
      <div class="pl-name">${escapeHtml(pl.name || "Namnlös")}</div>
      <div class="pl-meta">${pl.songs.length} låtar · ${playable} spelbara</div>`;
    div.onclick = () => {
      store.activeId = pl.id;
      saveStore();
      renderPlaylistPicker();
    };
    wrap.appendChild(div);
  });
}

function renderSettings() {
  $("target-seg").querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.v) === store.settings.target);
  });
  $("toggle-tokens").setAttribute("aria-checked", String(store.settings.tokens));
  $("toggle-sound").setAttribute("aria-checked", String(store.settings.sound));
}

$("target-seg").querySelectorAll("button").forEach((b) => {
  b.onclick = () => {
    store.settings.target = Number(b.dataset.v);
    saveStore();
    renderSettings();
  };
});

for (const [id, key] of [["toggle-tokens", "tokens"], ["toggle-sound", "sound"]]) {
  $(id).onclick = () => {
    store.settings[key] = !store.settings[key];
    saveStore();
    renderSettings();
    if (key === "sound" && store.settings.sound) sfx.token();
  };
}

function addPlayerInput(value = "") {
  const wrap = $("player-inputs");
  const i = wrap.children.length;
  const row = document.createElement("div");
  row.className = "player-input-row";
  row.innerHTML = `
    <span class="avatar" style="background:${COLORS[i % COLORS.length]}33">${AVATARS[i % AVATARS.length]}</span>
    <input type="text" placeholder="Spelarnamn" value="${escapeHtml(value)}" maxlength="20">
    <button class="btn ghost small" title="Ta bort">✕</button>`;
  row.querySelector("button").onclick = () => {
    if (wrap.children.length > 1) row.remove();
  };
  wrap.appendChild(row);
}

$("btn-add-player").onclick = () => {
  if ($("player-inputs").children.length >= 8) { toast("Max 8 spelare!", "warn"); return; }
  addPlayerInput();
};

$("btn-new-playlist").onclick = () => {
  const pl = { id: uid(), name: "Ny spellista", songs: [] };
  store.playlists.push(pl);
  store.activeId = pl.id;
  saveStore();
  openEditor();
};

$("btn-open-editor").onclick = openEditor;

$("btn-start-game").onclick = () => {
  const names = [...$("player-inputs").querySelectorAll("input")]
    .map((i) => i.value.trim())
    .filter(Boolean);
  if (names.length === 0) { toast("Lägg till minst en spelare!", "err"); return; }

  const pl = currentPlaylist();
  const valid = pl.songs.filter((s) => s.year > 0);
  const skipped = pl.songs.length - valid.length;
  const minSongs = names.length + 3;
  if (valid.length < minSongs) {
    toast(
      `”${pl.name}” behöver minst ${minSongs} spelbara låtar för ${names.length} spelare.` +
      (skipped ? ` (${skipped} saknar årtal.)` : ""), "err"
    );
    return;
  }
  if (skipped > 0) toast(`${skipped} låtar utan årtal hoppas över.`, "warn");
  localStorage.removeItem(GAME_KEY);
  startGame(names, store.settings.target, valid);
};

$("btn-resume").onclick = () => {
  const saved = loadSavedGame();
  if (!saved) { renderResume(); return; }
  game = saved;
  loadTrack(game.card);
  showScreen("screen-game");
  renderGame();
  toast("Välkomna tillbaka! 🎶", "ok");
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
  renderStart();
  showScreen("screen-start");
  toast("Listan borttagen.", "warn");
};

$("btn-editor-back").onclick = () => {
  clearSongForm();
  renderStart();
  showScreen("screen-start");
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
    if (!p || !Array.isArray(p.songs)) throw new Error("saknar 'songs'");
    const songs = p.songs.map(normalizeSong).filter((s) => s.artist || s.title);
    if (songs.length === 0) throw new Error("inga giltiga låtar");
    const name = String(p.name ?? file.name.replace(/\.json$/i, ""));
    const existing = store.playlists.find((x) => x.name === name);
    if (existing && confirm(`”${name}” finns redan – ersätta den? (Avbryt = skapa ny lista)`)) {
      existing.songs = songs;
      store.activeId = existing.id;
    } else {
      const pl = { id: uid(), name: existing ? `${name} (2)` : name, songs };
      store.playlists.push(pl);
      store.activeId = pl.id;
    }
    saveStore();
    renderEditor();
    toast(`Importerade ${songs.length} låtar! 🎉`, "ok");
  } catch (err) {
    toast(`Kunde inte läsa filen: ${err.message}`, "err");
  }
  e.target.value = "";
};

$("btn-load-sample").onclick = () => {
  const pl = { id: uid(), name: SAMPLE_PLAYLIST.name, songs: structuredClone(SAMPLE_PLAYLIST.songs) };
  store.playlists.push(pl);
  store.activeId = pl.id;
  saveStore();
  renderEditor();
  toast("Exempellistan tillagd som ny lista! 🎁", "ok");
};

$("btn-copy-tidbit-prompt").onclick = async () => {
  const pl = currentPlaylist();
  const prompt =
`Hej Claude! Här är min Hitster-spellista som JSON:

${JSON.stringify({ name: pl.name, songs: pl.songs }, null, 2)}

Gör så här:
1. Skriv en kort, rolig och gärna överraskande "tidbit" på svenska (1–2 meningar) om artisten eller låten i fältet "tidbit" för varje låt.
2. Där "artist" är tom eller "year" är 0: fyll i artist och originalåret då låten först släpptes, om du känner igen låten (titeln och Spotify-länken i "url" är ledtrådar). Är du osäker på året, lämna 0.
3. Ändra inget annat – behåll "title" och "url" exakt som de är.

Svara med enbart den kompletta JSON-filen (samma format) så att jag kan importera den direkt i spelet.`;
  try {
    await navigator.clipboard.writeText(prompt);
    toast("Prompt kopierad! Klistra in hos Claude → spara svaret som .json → importera här.", "ok");
  } catch (_) {
    window.prompt("Kopiera texten manuellt:", prompt);
  }
};

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
    const pl = currentPlaylist();
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
    renderEditor();
    toast(
      `Importerade ${added} låtar! 🎉` +
      (dupes ? ` ${dupes} dubbletter hoppades över.` : "") +
      (missingYear ? ` ⚠️ ${missingYear} saknar årtal.` : ""), "ok"
    );
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
    renderEditor();
    $("input-paste-links").value = "";
    toast(
      `La till ${added} låtar!` + (dupes ? ` (${dupes} dubbletter.)` : "") +
      ` ⚠️ Komplettera årtal – eller låt Claude fixa det via 🤖-knappen.`, "warn"
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
let currentTrack = { type: "none" };

window.onSpotifyIframeApiReady = (api) => { spotifyApi = api; };

function destroyPlayers() {
  if (ytPlayer) { try { ytPlayer.destroy(); } catch (_) {} ytPlayer = null; }
  if (spotifyController) { try { spotifyController.destroy(); } catch (_) {} spotifyController = null; }
  $("embed-holder").innerHTML = "";
}

function setSpinning(on) {
  $("vinyl").classList.toggle("spinning", on);
}

function loadTrack(song) {
  destroyPlayers();
  currentTrack = parseMusicUrl(song.url);
  setSpinning(false);

  const wrap = $("embed-wrap");
  wrap.classList.remove("show-embed");
  $("btn-play").classList.remove("hidden");
  $("btn-pause").classList.add("hidden");
  $("btn-yt-search").classList.add("hidden");
  $("btn-toggle-embed").classList.add("hidden");
  $("btn-toggle-embed").textContent = "👀 Visa spelaren";

  if (currentTrack.type === "none") {
    wrap.classList.add("empty");
    $("btn-play").classList.add("hidden");
    const q = encodeURIComponent(`${song.artist} ${song.title}`);
    const a = $("btn-yt-search");
    a.href = `https://www.youtube.com/results?search_query=${q}`;
    a.classList.remove("hidden");
    return;
  }

  wrap.classList.remove("empty");
  $("btn-toggle-embed").classList.remove("hidden");

  const holder = document.createElement("div");
  $("embed-holder").appendChild(holder);

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

$("btn-play").onclick = () => {
  if (currentTrack.type === "youtube" && ytPlayer?.playVideo) ytPlayer.playVideo();
  else if (currentTrack.type === "spotify" && spotifyController) spotifyController.play();
  else return;
  setSpinning(true);
  $("btn-play").classList.add("hidden");
  $("btn-pause").classList.remove("hidden");
};

$("btn-pause").onclick = () => {
  if (currentTrack.type === "youtube" && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
  else if (currentTrack.type === "spotify" && spotifyController) spotifyController.pause();
  setSpinning(false);
  $("btn-pause").classList.add("hidden");
  $("btn-play").classList.remove("hidden");
};

$("btn-toggle-embed").onclick = () => {
  const wrap = $("embed-wrap");
  wrap.classList.toggle("show-embed");
  $("btn-toggle-embed").textContent = wrap.classList.contains("show-embed")
    ? "🙈 Dölj spelaren"
    : "👀 Visa spelaren";
};

function stopMusic() {
  if (currentTrack.type === "youtube" && ytPlayer?.pauseVideo) { try { ytPlayer.pauseVideo(); } catch (_) {} }
  if (currentTrack.type === "spotify" && spotifyController) { try { spotifyController.pause(); } catch (_) {} }
  setSpinning(false);
}

/* ==========================================================================
 * SPELET
 * ========================================================================== */
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
    useTokens: store.settings.tokens,
  };
  nextCard();
  showScreen("screen-game");
}

function nextCard() {
  if (game.deck.length === 0) { endGame(null); return; }
  game.card = game.deck.pop();
  game.selectedSlot = null;
  game.revealed = false;
  game.bonusGiven = false;
  $("flip-card").classList.remove("flipped");
  loadTrack(game.card);
  saveGame();
  renderGame();
}

function currentPlayer() { return game.players[game.current]; }

function renderGame() {
  const p = currentPlayer();
  $("deck-count").textContent = `🃏 ${game.deck.length}`;
  $("timeline-heading").innerHTML =
    `${p.avatar} <b>${escapeHtml(p.name)}</b>s tidslinje · ${p.timeline.length}/${game.target}`;
  $("reveal-panel").classList.toggle("hidden", !game.revealed);
  $("timeline-hint").classList.toggle("hidden", game.revealed);
  $("btn-reveal").classList.toggle("hidden", game.revealed);
  $("btn-reveal").disabled = game.selectedSlot === null;
  $("flip-card").classList.toggle("flipped", game.revealed);
  if (game.revealed) $("flip-year").textContent = game.card.year;

  // Byt låt-knapp (pollett)
  $("btn-skip-song").classList.toggle(
    "hidden",
    !game.useTokens || game.revealed || p.tokens < 1
  );

  // Poängtavla
  const sb = $("scoreboard");
  sb.innerHTML = "";
  game.players.forEach((pl, i) => {
    const chip = document.createElement("span");
    chip.className = "sb-chip" + (i === game.current ? " on" : "");
    chip.innerHTML =
      `<span class="avatar" style="background:${pl.color}33">${pl.avatar}</span>` +
      `<b>${escapeHtml(pl.name)}</b> ${pl.timeline.length}/${game.target}` +
      (game.useTokens ? `<span class="sb-tokens">🪙${pl.tokens}</span>` : "");
    sb.appendChild(chip);
  });

  // Tidslinje med luckor
  const tl = $("timeline");
  tl.innerHTML = "";
  const addSlot = (i) => {
    const b = document.createElement("button");
    b.className = "slot" + (game.selectedSlot === i ? " selected" : "");
    b.textContent = "+";
    b.title = "Placera här";
    b.disabled = game.revealed;
    b.onclick = () => { game.selectedSlot = i; saveGame(); renderGame(); };
    tl.appendChild(b);
  };
  addSlot(0);
  p.timeline.forEach((s, i) => {
    const c = document.createElement("div");
    c.className = "card" + (game.justPlaced === i ? " new-card" : "");
    c.innerHTML = `
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
  stopMusic();
  sfx.token();
  toast(`${p.name} bytte låt! (−1 🪙)`, "warn");
  nextCard();
};

$("btn-reveal").onclick = () => {
  if (game.selectedSlot === null || game.revealed) return;
  stopMusic();

  const p = currentPlayer();
  const i = game.selectedSlot;
  const card = game.card;
  const before = i === 0 ? null : p.timeline[i - 1];
  const after = i === p.timeline.length ? null : p.timeline[i];
  const correct =
    (!before || before.year <= card.year) &&
    (!after || card.year <= after.year);

  game.revealed = true;
  $("embed-wrap").classList.add("show-embed");
  $("flip-year").textContent = card.year;
  $("flip-card").classList.add("flipped");

  const res = $("reveal-result");
  res.textContent = correct ? "✅ Rätt placerat!" : "❌ Fel plats!";
  res.className = "reveal-result " + (correct ? "ok" : "fail");

  $("reveal-card").innerHTML = `
    <div class="card-year">${escapeHtml(card.year)}</div>
    <div class="card-title">${escapeHtml(card.title)}</div>
    <div class="card-artist">${escapeHtml(card.artist)}</div>`;

  const tb = $("reveal-tidbit");
  tb.classList.toggle("hidden", !card.tidbit);
  tb.textContent = card.tidbit ? `💡 ${card.tidbit}` : "";

  $("btn-bonus").classList.toggle("hidden", !game.useTokens);
  $("btn-bonus").disabled = false;

  if (correct) {
    sfx.correct();
    confetti.burst();
    p.timeline.splice(i, 0, card);
    game.justPlaced = i;
    if (p.timeline.length >= game.target) {
      saveGame();
      renderGame();
      setTimeout(() => endGame(p), 1500);
      return;
    }
  } else {
    sfx.wrong();
    const panel = document.querySelector(".timeline-panel");
    panel.classList.add("shake");
    setTimeout(() => panel.classList.remove("shake"), 500);
  }
  saveGame();
  renderGame();
};

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

$("btn-next").onclick = () => {
  stopMusic();
  game.current = (game.current + 1) % game.players.length;
  nextCard();
};

function endGame(winner) {
  stopMusic();
  destroyPlayers();
  localStorage.removeItem(GAME_KEY);

  const sorted = [...game.players].sort((a, b) => b.timeline.length - a.timeline.length);
  const max = sorted[0].timeline.length;
  const tops = sorted.filter((p) => p.timeline.length === max);

  if (winner) {
    $("winner-text").textContent = `${winner.name} vinner! 🎉`;
  } else if (tops.length === 1) {
    $("winner-text").textContent = `Leken är slut – ${tops[0].name} vinner med ${max} kort!`;
  } else {
    $("winner-text").textContent =
      `Leken är slut – oavgjort mellan ${tops.map((p) => p.name).join(" & ")}!`;
  }

  const medals = ["🥇", "🥈", "🥉"];
  $("standings").innerHTML = sorted.map((p, i) => `
    <div class="standing-row">
      <span class="medal">${medals[i] || "•"}</span>
      <span class="avatar" style="background:${p.color}33">${p.avatar}</span>
      <span class="name">${escapeHtml(p.name)}</span>
      <span class="score">${p.timeline.length} kort</span>
    </div>`).join("");

  showScreen("screen-winner");
  sfx.win();
  confetti.rain();
}

$("btn-quit").onclick = () => {
  if (confirm("Avsluta spelet? (Det sparas inte.)")) {
    stopMusic();
    destroyPlayers();
    localStorage.removeItem(GAME_KEY);
    renderStart();
    showScreen("screen-start");
  }
};

$("btn-play-again").onclick = () => {
  renderStart();
  showScreen("screen-start");
};

/* ==========================================================================
 * Init
 * ========================================================================== */
renderStart();
addPlayerInput("Spelare 1");
addPlayerInput("Spelare 2");
