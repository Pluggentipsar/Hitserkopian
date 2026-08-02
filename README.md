# 💿 Skivbacken

Musikquizet för hela gänget: hör en låt, gissa vilket år den släpptes och
placera den rätt i din tidslinje av skivor. Egen spellista, inbyggd
musikspelare, utskrivbara spelkort med QR-koder – och roliga tidbits om
artisterna, skrivna av Claude.

## Så spelar du

Appen har tre vägar från hemskärmen: **🎮 Nytt spel**, **💿 Mina spellistor**
och **📷 Skanna kort**.

1. **Nytt spel**: lägg till spelare (namnen sparas till nästa kväll), välj
   spellista, justera husreglerna om ni vill – och kör igång.
2. Mellan varje tur visas en **"skicka mobilen"-skärm** så att nästa spelare
   kan ta över utan att se något i förväg.
3. På din tur: tryck **▶** (spelaren är dold – inga spoilers!), och klicka på
   luckan (`+`) i din tidslinje där du tror att låten hör hemma.
4. Tryck **🎬 Avslöja!** – är året rätt placerat får du kortet, annars ryker
   det. Samtidigt visas årtal, artist, titel, omslag och en 💡 tidbit.
5. Först till målet (standard 5 poäng, ställbart) vinner! Rätt placering
   ger 1 poäng och rätt quizsvar 1 poäng.

I **💿 Mina spellistor** hanterar du musiken: hämta från Spotify, ta emot från
en kompis, bygg själv – eller börja med exempellistan. Låtlistan i
redigeraren är **dold som standard** (bakom en spoilerknapp) så att
spelledaren kan kopiera Claude-prompten utan att se årtalen i förväg.

> Tips: låtar utan länk får i stället en **🔎 YouTube-sökning**-knapp som
> öppnar sökresultatet i en ny flik, så att spelledaren kan trycka play där.

## Kör med lokal server (rekommenderas)

```bash
cd Skivbacken   # eller vad mappen heter hos dig
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
   **📄 Importera CSV** i redigeraren – artist, titel, årtal (albumets
   releasedatum) och låtlänk följer med automatiskt. Importen hamnar som en
   **egen ny lista** (döpt efter filen) och du får direkt frågan om du vill
   starta en ny omgång med den. Kontrollera gärna årtalen: för samlingsalbum
   kan releaseåret skilja sig från låtens originalår.
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

## 🍎 Auto-komplettera låtdata

Knappen **🍎 Auto-komplettera låtdata** i redigeraren slår upp låtarna i
iTunes öppna sök-API (ingen inloggning behövs) och fyller i:

- **Originalår** för låtar som saknar årtal
- **Artist** och riktig titel för låtar som importerats som bara länkar
- **Skivomslag** som visas på tidslinjen och när kortet avslöjas
- **30-sekunders ljudsnutt** som spelas direkt i appen – osynligt, utan
  YouTube/Spotify-inbäddningar, och fungerar även utan Spotify-konto

Ljudsnutten används automatiskt i spelet när den finns; annars används
Spotify-/YouTube-länken som tidigare.

## 😈 Utmana och stjäl (polletter)

När polletter är på kan de andra spelarna utmana: den aktiva spelaren
**låser sin gissning**, sedan kan varje motspelare satsa 1 🪙 på en annan
lucka. Har den aktiva fel och en utmanare rätt – då **stjäl utmanaren
kortet** rakt in i sin egen tidslinje. Först satsad, först vinner.

## 🔗 Dela spellistor via länk

**🔗 Dela lista** kopierar en länk där hela spellistan är inbakad
(komprimerad i själva URL:en – ingen server inblandad). Skicka länken till
en kompis: när de öppnar den får de frågan att importera listan direkt i
sin app, inklusive tidbits, omslag och ljudsnuttar.

## 📷 Skanna utskrivna kort

Knappen **📷 Skanna kort** på startskärmen öppnar mobilkameran. Skanna
QR-koden på ett utskrivet kort så spelas låten **dolt i appen** – ingen
Spotify-app öppnas och ingen titel avslöjas. Finns låten i någon av dina
sparade listor visas år, artist, titel, omslag och tidbit när du trycker
**Avslöja**. Kameran kräver https (den publicerade sajten funkar fint) och
kameratillstånd. På iPhone används en inbyggd QR-avläsare (jsQR) som
reserv.

## 🎮 Spelvarianter

- **❓ Kunskapsfråga (standard, går att stänga av)** – efter avslöjandet
  får spelaren en flervalsfråga. Välj **frågetyp** i husreglerna:
  🎤 om artisten/bandet, 📅 om vad som hände samma år, eller 🎲 blandat.
  Frågorna genereras av Claude via 🤖-knappen (se nedan) och följer med
  när listor delas. Exempellistan har färdiga frågor av båda typerna.
- **🧮 Poängräkning** – 1 poäng för rätt placerad låt + 1 poäng för rätt
  quizsvar, och det är poängen som räknas mot vinstmålet. Bryts en
  vinstsvit ryker kortens poäng, men quizpoäng behåller man alltid.
- **🔥 Vinstsvit (standard, går att stänga av)** – svarar du rätt får du
  välja: stanna och säkra kortet, eller våga dra nästa låt direkt. Max tre
  kort per tur – men gissar du fel någon gång under turen ryker **alla**
  kort du vunnit den turen tillbaka i leken. Kort som står på spel märks
  med 🔥 på tidslinjen.
- **🎯 Valfritt vinstmål** – snabbknappar för 5/7/10 kort, eller skriv in
  vilket mål som helst mellan 2 och 30.
- **🧒 Decennium-läge** – rätt årtionde räcker för att kortet ska sitta.
  Perfekt för barn eller som uppvärmning.
- **🎯 Exakt år-bonus** – slå på i inställningarna: den som säger exakt
  rätt årtal får +1 🪙 (hederssystem, som artist/titel-bonusen).
- **🧑‍🎤 Soloträning** – starta med bara en spelare: bygg så lång tidslinje
  du kan, ett fel och omgången är över. Rekordet sparas i appen.
- **☠️ Sudden death** – står det lika när leken tar slut blandas de
  bortslängda korten om och de som ligger lika möts: första rätta
  placeringen vinner allt.
- **☀️ Ljust tema** – för utomhusspel i solen (spelkorten behåller sin
  mörka look).

## 🖨 Skriv ut riktiga kort

I redigeraren finns **🖨 Skriv ut kort** – den gör om spellistan till
utskrivbara spelkort i A4-format (12 kort per ark, ca 60×60 mm):

- **Framsidan**: en QR-kod som öppnar låten (Spotify/YouTube). Låtar utan
  länk får en QR-kod som öppnar en YouTube-sökning.
- **Baksidan**: artist, årtal och titel – och har listan quizfrågor kan
  du med ett reglage i utskriftsvyn även trycka **frågan med
  svarsalternativ** på kortet, med rätt svar markerat ✓ (den som läser
  upp kortet ser facit). Välj frågetyp: 🎤 artist, 📅 året eller
  🎲 blandat (varvar typerna jämnt över korten).

Skriv ut **dubbelsidigt** med **”Vänd längs långsidan”** – baksidorna är
spegelvända per rad så att rätt info hamnar bakom rätt QR-kod. Klipp längs
de streckade linjerna, blanda och spela som med riktiga spelkort:
skanna med mobilen, lyssna och gissa!

## 🤖 Låt Claude skriva tidbits

Så här funkar AI-flödet i redigeraren:

1. **🤖 Kopiera prompt** – lägger en färdig fråga i urklipp med hela din
   spellista som JSON.
2. Klistra in i en chatt med Claude (eller annan AI). Claude skriver
   tidbits, **quizfrågor** av båda typerna **och** fyller i saknade
   artistnamn och årtal.
3. **📥 Läs in svar** – klistra in hela svaret (det gör inget om det är
   text runt JSON:en) eller välj en sparad fil. Låtarna i listan
   **uppdateras på plats** – inga dubbletter, och befintliga länkar,
   omslag och ljudsnuttar behålls.

## Publicera på webben

### GitHub Pages (redan uppsatt ✅)

Repot innehåller ett GitHub Actions-flöde (`.github/workflows/deploy-pages.yml`)
som automatiskt publicerar spelet till GitHub Pages vid varje push. Sajten
hamnar på:

**https://pluggentipsar.github.io/skivbacken/**

### Cloudflare Pages (alternativ)

Vill du hellre ligga på Cloudflare? Inget byggsteg behövs:

1. Logga in på [dash.cloudflare.com](https://dash.cloudflare.com) →
   **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Välj repot `Pluggentipsar/skivbacken` och branchen du vill publicera.
3. Lämna *Build command* tomt och sätt *Build output directory* till `/`.
4. Klart – du får en adress i stil med `skivbacken.pages.dev`, och varje
   push publiceras automatiskt.

## Bra att veta om musiken

- **Spotify**: utan inloggning/Premium i webbläsaren spelas ofta bara en
  30-sekunders förhandsvisning – vilket faktiskt räcker fint för spelet.
- **YouTube**: hela låten spelas. Spelaren är dold bakom ett "🙈"-skydd;
  knappen **👀 Visa spelaren** finns om uppspelningen skulle strula.
- Om inget händer när du trycker play: visa spelaren och tryck play direkt i
  den inbäddade spelaren (webbläsares autoplay-regler kan ibland kräva det).
