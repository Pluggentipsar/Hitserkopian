# 🎵 Hitserkopian

En egen kopia av musikspelet **Hitster** – med stöd för din egen spellista,
inbyggd musikspelare (Spotify/YouTube) och roliga tidbits om artisterna,
skrivna av Claude.

## Så spelar du

1. Öppna `index.html` i en webbläsare (dubbelklicka räcker, men musikspelaren
   fungerar bäst via en lokal server, se nedan).
2. Lägg till spelare och tryck **Starta spelet**.
3. Varje spelare börjar med ett kort på sin tidslinje.
4. På din tur: tryck **▶ Spela låten** (spelaren är dold – inga spoilers!),
   och klicka på luckan (`+`) i din tidslinje där du tror att låten hör hemma.
5. Tryck **🎬 Avslöja!** – är året rätt placerat får du kortet, annars ryker det.
   Samtidigt visas årtal, artist, titel och en 💡 tidbit om artisten.
6. Först till målet (standard 5 kort, ställbart) vinner!

> Tips: låtar utan länk får i stället en **🔎 YouTube-sökning**-knapp som
> öppnar sökresultatet i en ny flik, så att spelledaren kan trycka play där.

## Kör med lokal server (rekommenderas)

```bash
cd Hitserkopian
npx serve .        # eller: python3 -m http.server 8000
```

Öppna sedan adressen som visas (t.ex. http://localhost:3000).

## Egen spellista

Öppna **✏️ Redigera spellista** på startskärmen. Där kan du:

- Lägga till/redigera låtar: artist, titel, år, länk och tidbit.
- **Länkar**: klistra in en vanlig Spotify-låtlänk
  (`https://open.spotify.com/track/…`) eller YouTube-länk
  (`https://youtu.be/…` / `https://www.youtube.com/watch?v=…`).
  Spelaren bäddas in dold i spelet med egna play/paus-knappar.
- **Exportera/importera JSON** för att spara och dela listor.

Spellistan sparas automatiskt i webbläsaren (localStorage).

### Importera en hel Spotify-spellista

Två sätt, båda utan Spotify-inloggning:

1. **Exportify (rekommenderas)** – gå till [exportify.net](https://exportify.net),
   logga in och exportera din spellista som CSV. Importera sedan filen via
   **📄 Importera CSV (Exportify)** i redigeraren – artist, titel, årtal
   (albumets releasedatum) och låtlänk följer med automatiskt.
   Kontrollera gärna årtalen: för samlingsalbum kan releaseåret skilja sig
   från låtens originalår.
2. **Klistra in länkar** – markera alla låtar i Spotify-appen (Ctrl/Cmd+A),
   kopiera (Ctrl/Cmd+C) och klistra in i rutan i redigeraren. Låttitlarna
   hämtas automatiskt, men artist och årtal saknas – fyll i själv eller låt
   Claude göra det (se nedan).

Låtar utan årtal markeras med ⚠️ och hoppas över i spelet tills året är ifyllt.

### JSON-format

```json
{
  "name": "Min spellista",
  "songs": [
    {
      "artist": "ABBA",
      "title": "Dancing Queen",
      "year": 1976,
      "url": "https://open.spotify.com/track/…",
      "tidbit": "Kul fakta som visas när kortet avslöjas."
    }
  ]
}
```

## 🤖 Låt Claude skriva tidbits

I redigeraren finns knappen **🤖 Kopiera Claude-prompt för tidbits**. Den lägger
en färdig fråga i urklipp – med hela din spellista som JSON. Klistra in den i en
chatt med Claude, spara svaret som en `.json`-fil och importera den i
redigeraren. Claude skriver tidbits **och** fyller i saknade artistnamn och
årtal (praktiskt efter länk-import). Klart!

## Bra att veta om musiken

- **Spotify**: utan inloggning/Premium i webbläsaren spelas ofta bara en
  30-sekunders förhandsvisning – vilket faktiskt räcker fint för spelet.
- **YouTube**: hela låten spelas. Spelaren är dold bakom ett "🙈"-skydd;
  knappen **👀 Visa spelaren** finns om uppspelningen skulle strula.
- Om inget händer när du trycker play: visa spelaren och tryck play direkt i
  den inbäddade spelaren (webbläsares autoplay-regler kan ibland kräva det).
