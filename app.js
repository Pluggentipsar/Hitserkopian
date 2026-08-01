/* ==========================================================================
 * Hitserkopian – en Hitster-klon med egen spellista
 * ========================================================================== */

const STORAGE_KEY = "hitserkopian.playlist";

/* ---------- Hjälpare ---------- */
const $ = (id) => document.getElementById(id);

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

/* ---------- Spellista (state + lagring) ---------- */
let playlist = loadPlaylist();

function loadPlaylist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.songs)) return p;
    }
  } catch (_) { /* korrupt lagring – fall tillbaka */ }
  return structuredClone(SAMPLE_PLAYLIST);
}

function savePlaylist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
  renderStartInfo();
}

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

function songExists(song) {
  const key = (s) => `${s.artist}||${s.title}`.toLowerCase();
  return playlist.songs.some(
    (s) => (song.url && s.url === song.url) ||
           (song.title && song.artist && key(s) === key(song))
  );
}

/* ==========================================================================
 * STARTSKÄRM
 * ========================================================================== */
function renderStartInfo() {
  $("start-playlist-info").textContent =
    `”${playlist.name || "Namnlös"}” – ${playlist.songs.length} låtar`;
}

function addPlayerInput(value = "") {
  const wrap = $("player-inputs");
  const row = document.createElement("div");
  row.className = "player-input-row";
  row.innerHTML = `
    <input type="text" placeholder="Spelarnamn" value="${escapeHtml(value)}">
    <button class="btn small secondary" title="Ta bort">✕</button>`;
  row.querySelector("button").onclick = () => {
    if (wrap.children.length > 1) row.remove();
  };
  wrap.appendChild(row);
}

$("btn-add-player").onclick = () => addPlayerInput();
$("btn-open-editor").onclick = () => { renderEditor(); showScreen("screen-editor"); };

$("btn-start-game").onclick = () => {
  const names = [...$("player-inputs").querySelectorAll("input")]
    .map((i) => i.value.trim())
    .filter(Boolean);
  if (names.length === 0) { alert("Lägg till minst en spelare!"); return; }

  const target = Math.max(2, parseInt($("input-target").value, 10) || 5);
  const valid = playlist.songs.filter((s) => s.year > 0);
  const skipped = playlist.songs.length - valid.length;
  const minSongs = names.length * 2 + 1;
  if (valid.length < minSongs) {
    alert(
      `Spellistan behöver minst ${minSongs} spelbara låtar för ${names.length} spelare.` +
      (skipped ? `\n(${skipped} låtar hoppas över eftersom årtal saknas – fyll i dem i redigeraren.)` : "")
    );
    return;
  }
  if (skipped > 0 && !confirm(`${skipped} låtar saknar årtal och hoppas över. Starta ändå?`)) return;
  startGame(names, target, valid);
};

/* ==========================================================================
 * REDIGERAREN
 * ========================================================================== */
let editIndex = null; // index i playlist.songs som redigeras, annars null

function renderEditor() {
  $("input-playlist-name").value = playlist.name || "";
  $("editor-song-count").textContent = playlist.songs.length;

  const ul = $("editor-song-list");
  ul.innerHTML = "";
  [...playlist.songs]
    .map((s, i) => ({ s, i }))
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
        <button class="btn small secondary" data-act="edit">✏️</button>
        <button class="btn small secondary" data-act="del">🗑</button>`;
      li.querySelector('[data-act="edit"]').onclick = () => beginEditSong(i);
      li.querySelector('[data-act="del"]').onclick = () => {
        if (confirm(`Ta bort ”${s.title}”?`)) {
          playlist.songs.splice(i, 1);
          savePlaylist();
          renderEditor();
        }
      };
      ul.appendChild(li);
    });
}

function beginEditSong(i) {
  const s = playlist.songs[i];
  editIndex = i;
  $("editor-song-form-title").textContent = "Redigera låt";
  $("input-song-artist").value = s.artist;
  $("input-song-title").value = s.title;
  $("input-song-year").value = s.year;
  $("input-song-url").value = s.url;
  $("input-song-tidbit").value = s.tidbit;
  $("btn-cancel-edit").classList.remove("hidden");
  $("input-song-artist").focus();
}

function clearSongForm() {
  editIndex = null;
  $("editor-song-form-title").textContent = "Lägg till låt";
  ["input-song-artist", "input-song-title", "input-song-year",
   "input-song-url", "input-song-tidbit"].forEach((id) => ($(id).value = ""));
  $("btn-cancel-edit").classList.add("hidden");
}

$("btn-save-song").onclick = () => {
  const song = normalizeSong({
    artist: $("input-song-artist").value,
    title: $("input-song-title").value,
    year: $("input-song-year").value,
    url: $("input-song-url").value,
    tidbit: $("input-song-tidbit").value,
  });
  if (!song.artist && !song.title) {
    alert("Fyll i åtminstone artist eller titel.");
    return;
  }
  if (song.year <= 0 &&
      !confirm("Inget årtal angivet – låten hoppas över i spelet tills året är ifyllt. Spara ändå?")) {
    return;
  }
  if (editIndex === null) playlist.songs.push(song);
  else playlist.songs[editIndex] = song;
  savePlaylist();
  clearSongForm();
  renderEditor();
};

$("btn-cancel-edit").onclick = clearSongForm;

$("input-playlist-name").onchange = (e) => {
  playlist.name = e.target.value.trim();
  savePlaylist();
};

$("btn-editor-back").onclick = () => { clearSongForm(); showScreen("screen-start"); };

/* --- Export / import / exempel --- */
$("btn-export").onclick = () => {
  const blob = new Blob([JSON.stringify(playlist, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(playlist.name || "spellista").replace(/[^\wåäöÅÄÖ -]/g, "")}.json`;
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
    playlist = { name: String(p.name ?? file.name.replace(/\.json$/i, "")), songs };
    savePlaylist();
    renderEditor();
    alert(`Importerade ${songs.length} låtar! 🎉`);
  } catch (err) {
    alert(`Kunde inte läsa filen: ${err.message}`);
  }
  e.target.value = "";
};

$("btn-load-sample").onclick = () => {
  if (confirm("Ersätta nuvarande spellista med exempellistan?")) {
    playlist = structuredClone(SAMPLE_PLAYLIST);
    savePlaylist();
    renderEditor();
  }
};

$("btn-copy-tidbit-prompt").onclick = async () => {
  const data = {
    name: playlist.name || "Min spellista",
    songs: playlist.songs,
  };
  const prompt =
`Hej Claude! Här är min Hitster-spellista som JSON:

${JSON.stringify(data, null, 2)}

Gör så här:
1. Skriv en kort, rolig och gärna överraskande "tidbit" på svenska (1–2 meningar) om artisten eller låten i fältet "tidbit" för varje låt.
2. Där "artist" är tom eller "year" är 0: fyll i artist och originalåret då låten först släpptes, om du känner igen låten (titeln och Spotify-länken i "url" är ledtrådar). Är du osäker på året, lämna 0.
3. Ändra inget annat – behåll "title" och "url" exakt som de är.

Svara med enbart den kompletta JSON-filen (samma format) så att jag kan importera den direkt i spelet.`;
  try {
    await navigator.clipboard.writeText(prompt);
    alert("Prompt kopierad! Klistra in den i en chatt med Claude, spara svaret som .json och importera här.");
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
      const year = ym ? Number(ym[0]) : 0;
      let url = "";
      const uriMatch = iUri >= 0 ? (r[iUri] || "").match(/track[:/]([A-Za-z0-9]+)/) : null;
      if (uriMatch) url = `https://open.spotify.com/track/${uriMatch[1]}`;
      const song = normalizeSong({ artist, title, year, url, tidbit: "" });
      if (songExists(song)) { dupes++; continue; }
      if (song.year === 0) missingYear++;
      playlist.songs.push(song);
      added++;
    }
    savePlaylist();
    renderEditor();
    alert(
      `Importerade ${added} låtar! 🎉` +
      (dupes ? `\n${dupes} dubbletter hoppades över.` : "") +
      (missingYear ? `\n⚠️ ${missingYear} låtar saknar årtal – fyll i eller använd Claude-knappen.` : "")
    );
  } catch (err) {
    alert(`Kunde inte läsa CSV-filen: ${err.message}`);
  }
  e.target.value = "";
};

$("btn-import-links").onclick = async () => {
  const btn = $("btn-import-links");
  const urls = [...new Set(
    $("input-paste-links").value.split(/\s+/).filter((u) => parseMusicUrl(u).type !== "none")
  )];
  if (urls.length === 0) {
    alert("Hittade inga giltiga Spotify- eller YouTube-länkar.");
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
        } catch (_) { /* offline eller blockerad – fyll i manuellt */ }
      }
      return normalizeSong({ artist: "", title: title || "Okänd låt (fyll i)", year: 0, url, tidbit: "" });
    }));
    let added = 0, dupes = 0;
    for (const song of songs) {
      if (songExists(song)) { dupes++; continue; }
      playlist.songs.push(song);
      added++;
    }
    savePlaylist();
    renderEditor();
    $("input-paste-links").value = "";
    alert(
      `La till ${added} låtar!` +
      (dupes ? ` (${dupes} dubbletter hoppades över.)` : "") +
      `\n⚠️ Årtal saknas – fyll i själv eller kopiera Claude-prompten så fixar Claude artist, år och tidbits.`
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "🔗 Lägg till länkarna";
  }
};

/* ==========================================================================
 * MUSIKSPELARE (dold YouTube-/Spotify-spelare med egna kontroller)
 * ========================================================================== */
let ytPlayer = null;          // aktiv YT.Player
let spotifyApi = null;        // Spotify IFrame API
let spotifyController = null; // aktiv Spotify-controller
let currentTrack = { type: "none" };

window.onSpotifyIframeApiReady = (api) => { spotifyApi = api; };

function destroyPlayers() {
  if (ytPlayer) { try { ytPlayer.destroy(); } catch (_) {} ytPlayer = null; }
  if (spotifyController) { try { spotifyController.destroy(); } catch (_) {} spotifyController = null; }
  $("embed-holder").innerHTML = "";
}

function loadTrack(song) {
  destroyPlayers();
  currentTrack = parseMusicUrl(song.url);

  const wrap = $("embed-wrap");
  wrap.classList.remove("show-embed");
  $("btn-play").classList.remove("hidden");
  $("btn-pause").classList.add("hidden");
  $("btn-yt-search").classList.add("hidden");
  $("btn-toggle-embed").classList.add("hidden");
  $("btn-toggle-embed").textContent = "👀 Visa spelaren (spoiler!)";

  if (currentTrack.type === "none") {
    // Ingen länk: erbjud en YouTube-sökning i ny flik (spelledaren trycker play där).
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
        width: "400", height: "225",
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
  $("btn-play").classList.add("hidden");
  $("btn-pause").classList.remove("hidden");
};

$("btn-pause").onclick = () => {
  if (currentTrack.type === "youtube" && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
  else if (currentTrack.type === "spotify" && spotifyController) spotifyController.pause();
  $("btn-pause").classList.add("hidden");
  $("btn-play").classList.remove("hidden");
};

$("btn-toggle-embed").onclick = () => {
  const wrap = $("embed-wrap");
  wrap.classList.toggle("show-embed");
  $("btn-toggle-embed").textContent = wrap.classList.contains("show-embed")
    ? "🙈 Dölj spelaren igen"
    : "👀 Visa spelaren (spoiler!)";
};

function stopMusic() {
  if (currentTrack.type === "youtube" && ytPlayer?.pauseVideo) { try { ytPlayer.pauseVideo(); } catch (_) {} }
  if (currentTrack.type === "spotify" && spotifyController) { try { spotifyController.pause(); } catch (_) {} }
}

/* ==========================================================================
 * SPELET
 * ========================================================================== */
let game = null;

function startGame(names, target, songs) {
  const deck = shuffle(songs);
  const players = names.map((name) => ({ name, timeline: [deck.pop()] }));
  players.forEach((p) => p.timeline.sort((a, b) => a.year - b.year));

  game = {
    players,
    deck,
    target,
    current: 0,
    card: null,
    selectedSlot: null,
    revealed: false,
  };
  nextCard();
  showScreen("screen-game");
}

function nextCard() {
  if (game.deck.length === 0) { endGame(null); return; }
  game.card = game.deck.pop();
  game.selectedSlot = null;
  game.revealed = false;
  loadTrack(game.card);
  renderGame();
}

function currentPlayer() { return game.players[game.current]; }

function renderGame() {
  const p = currentPlayer();
  $("game-status").textContent = `🎤 ${p.name}s tur`;
  $("deck-count").textContent = `🃏 ${game.deck.length} kvar i leken`;
  $("timeline-heading").textContent =
    `${p.name}s tidslinje (${p.timeline.length}/${game.target})`;
  $("reveal-panel").classList.toggle("hidden", !game.revealed);
  $("timeline-hint").classList.toggle("hidden", game.revealed);
  $("btn-reveal").classList.toggle("hidden", game.revealed);
  $("btn-reveal").disabled = game.selectedSlot === null;

  // Tidslinje med luckor
  const tl = $("timeline");
  tl.innerHTML = "";
  const addSlot = (i) => {
    const b = document.createElement("button");
    b.className = "slot" + (game.selectedSlot === i ? " selected" : "");
    b.textContent = "+";
    b.title = "Placera här";
    b.disabled = game.revealed;
    b.onclick = () => { game.selectedSlot = i; renderGame(); };
    tl.appendChild(b);
  };
  addSlot(0);
  p.timeline.forEach((s, i) => {
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `
      <div class="card-year">${escapeHtml(s.year)}</div>
      <div class="card-info">${escapeHtml(s.title)}<br>${escapeHtml(s.artist)}</div>`;
    tl.appendChild(c);
    addSlot(i + 1);
  });

  // Övriga spelare
  const others = $("other-players");
  const rest = game.players.filter((_, i) => i !== game.current);
  others.classList.toggle("hidden", rest.length === 0);
  others.innerHTML = rest.length === 0 ? "" : "<h3>Övriga spelare</h3>";
  rest.forEach((op) => {
    const div = document.createElement("div");
    div.className = "other-player";
    div.innerHTML =
      `<div class="op-name">${escapeHtml(op.name)} (${op.timeline.length}/${game.target})</div>` +
      `<div class="op-cards">` +
      op.timeline.map((s) => `<span class="op-chip"><b>${escapeHtml(s.year)}</b> ${escapeHtml(s.title)}</span>`).join("") +
      `</div>`;
    others.appendChild(div);
  });
}

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
  $("embed-wrap").classList.add("show-embed"); // ofarligt nu – visa gärna spelaren

  const res = $("reveal-result");
  res.textContent = correct ? "✅ Rätt placerat!" : "❌ Tyvärr, fel plats!";
  res.className = "reveal-result " + (correct ? "ok" : "fail");

  $("reveal-card").innerHTML = `
    <div class="card-year">${escapeHtml(card.year)}</div>
    <div class="card-title">${escapeHtml(card.title)}</div>
    <div class="card-artist">${escapeHtml(card.artist)}</div>`;

  const tb = $("reveal-tidbit");
  tb.classList.toggle("hidden", !card.tidbit);
  tb.textContent = card.tidbit ? `💡 ${card.tidbit}` : "";

  if (correct) {
    p.timeline.splice(i, 0, card);
    if (p.timeline.length >= game.target) {
      renderGame();
      setTimeout(() => endGame(p), 1400);
      return;
    }
  }
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
  if (!winner) {
    // Leken tog slut – flest kort vinner
    const max = Math.max(...game.players.map((p) => p.timeline.length));
    const tops = game.players.filter((p) => p.timeline.length === max);
    $("winner-text").textContent =
      tops.length === 1
        ? `Leken är slut – ${tops[0].name} vinner med ${max} kort!`
        : `Leken är slut – oavgjort mellan ${tops.map((p) => p.name).join(" och ")} (${max} kort)!`;
  } else {
    $("winner-text").textContent = `${winner.name} vinner med ${winner.timeline.length} kort! 🎉`;
  }
  showScreen("screen-winner");
}

$("btn-quit").onclick = () => {
  if (confirm("Avsluta spelet?")) {
    stopMusic();
    destroyPlayers();
    showScreen("screen-start");
  }
};

$("btn-play-again").onclick = () => showScreen("screen-start");

/* ==========================================================================
 * Init
 * ========================================================================== */
renderStartInfo();
addPlayerInput("Spelare 1");
addPlayerInput("Spelare 2");
