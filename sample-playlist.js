// Exempelspellista för Skivbacken.
// Lägg gärna in egna Spotify-/YouTube-länkar i "url" – utan länk får du en
// YouTube-sökknapp i spelet i stället.
const SAMPLE_PLAYLIST = {
  name: "Exempellistan – blandade hits",
  songs: [
    {
      artist: "Elvis Presley", title: "Jailhouse Rock", year: 1957, url: "",
      tidbit: "Låten skrevs till filmen med samma namn, där Elvis själv var med och koreograferade den berömda fängelsedansscenen.",
      quiz: [{ q: "Vad kallas Elvis Presley ofta?", options: ["The Boss", "The King", "The Duke", "The Voice"], correct: 1 }]
    },
    {
      artist: "The Beatles", title: "Hey Jude", year: 1968, url: "",
      tidbit: "Paul McCartney skrev låten för att trösta John Lennons son Julian under föräldrarnas skilsmässa – den hette först 'Hey Jules'.",
      quiz: [{ q: "Vem i The Beatles skrev Hey Jude?", options: ["Paul McCartney", "John Lennon", "George Harrison", "Ringo Starr"], correct: 0 }]
    },
    {
      artist: "Queen", title: "Bohemian Rhapsody", year: 1975, url: "",
      tidbit: "Skivbolaget tyckte att låten var alldeles för lång för radio med sina nästan sex minuter – den blev en av världens mest spelade låtar ändå.",
      quiz: [{ q: "Vad hette Queens legendariske sångare?", options: ["Brian May", "Roger Taylor", "Freddie Mercury", "John Deacon"], correct: 2 }]
    },
    {
      artist: "ABBA", title: "Dancing Queen", year: 1976, url: "",
      tidbit: "Dancing Queen är ABBA:s enda etta på USA:s Billboard-lista, och den framfördes för svenska kungaparet kvällen före bröllopet 1976.",
      quiz: [{ q: "Vilken tävling vann ABBA 1974 med Waterloo?", options: ["Melodifestivalen (bara)", "MTV Awards", "Grammygalan", "Eurovision Song Contest"], correct: 3 }]
    },
    {
      artist: "Gyllene Tider", title: "Sommartider", year: 1982, url: "",
      tidbit: "Per Gessle skrev hitten som sedan dess är ett obligatoriskt inslag i varje svensk sommar – han tog senare över världen med Roxette.",
      quiz: [{ q: "Vem är sångare i Gyllene Tider?", options: ["Per Gessle", "Tomas Ledin", "Magnus Uggla", "Joakim Berg"], correct: 0 }]
    },
    {
      artist: "Toto", title: "Africa", year: 1982, url: "",
      tidbit: "Ingen i bandet hade satt sin fot i Afrika när låten skrevs – texten inspirerades av tv-dokumentärer.",
      quiz: [{ q: "Från vilket land kommer bandet Toto?", options: ["Storbritannien", "USA", "Australien", "Sydafrika"], correct: 1 }]
    },
    {
      artist: "Michael Jackson", title: "Billie Jean", year: 1983, url: "",
      tidbit: "Det var under ett framförande av Billie Jean på Motown 25-galan 1983 som Michael Jackson visade upp sin moonwalk för första gången.",
      quiz: [{ q: "Vilket danssteg blev Michael Jackson världskänd för?", options: ["Roboten", "Vogue", "Moonwalk", "Breakdance"], correct: 2 }]
    },
    {
      artist: "Roxette", title: "The Look", year: 1989, url: "",
      tidbit: "Låten blev etta i USA tack vare en amerikansk utbytesstudent som tog med sig skivan hem och tjatade på en radiostation i Minneapolis att spela den.",
      quiz: [{ q: "Vilka två bildade Roxette?", options: ["Per Gessle & Marie Fredriksson", "Benny & Björn", "Tomas & Lena", "Per & Agnetha"], correct: 0 }]
    },
    {
      artist: "Nirvana", title: "Smells Like Teen Spirit", year: 1991, url: "",
      tidbit: "Titeln kommer från graffitin 'Kurt smells like Teen Spirit' – Kurt Cobain visste inte att Teen Spirit var ett deodorantmärke.",
      quiz: [{ q: "Vad hette Nirvanas sångare och gitarrist?", options: ["Eddie Vedder", "Dave Grohl", "Chris Cornell", "Kurt Cobain"], correct: 3 }]
    },
    {
      artist: "Whitney Houston", title: "I Will Always Love You", year: 1992, url: "",
      tidbit: "Låten är faktiskt en cover – Dolly Parton skrev och släppte originalet redan 1974, och lär ha byggt en nöjespark för royaltypengarna.",
      quiz: [{ q: "I vilken film sjöng Whitney Houston I Will Always Love You?", options: ["Sister Act", "The Bodyguard", "Ghost", "Pretty Woman"], correct: 1 }]
    },
    {
      artist: "Britney Spears", title: "...Baby One More Time", year: 1998, url: "",
      tidbit: "Världshitten skrevs av svensken Max Martin i Stockholm – och refuserades först av både TLC och Backstreet Boys.",
      quiz: [{ q: "Vilken svensk låtskrivare låg bakom ...Baby One More Time?", options: ["Max Martin", "Benny Andersson", "Avicii", "RedOne"], correct: 0 }]
    },
    {
      artist: "Håkan Hellström", title: "Känn ingen sorg för mig Göteborg", year: 2000, url: "",
      tidbit: "Innan solokarriären satt Håkan bakom trummorna i Broder Daniel – debutsingeln gjorde honom över en natt till hela Göteborgs husgud.",
      quiz: [{ q: "Vilket band spelade Håkan Hellström i innan solokarriären?", options: ["Kent", "bob hund", "Broder Daniel", "Soundtrack of Our Lives"], correct: 2 }]
    },
    {
      artist: "Robyn", title: "Dancing On My Own", year: 2010, url: "",
      tidbit: "Robyn lämnade sitt stora skivbolag och startade eget (Konichiwa Records) för att få göra precis den här sortens musik – kritikerna utsåg låten till en av 2010-talets bästa.",
      quiz: [{ q: "Vad heter Robyns eget skivbolag?", options: ["Polar Music", "Konichiwa Records", "Cheiron", "Refune"], correct: 1 }]
    },
    {
      artist: "Veronica Maggio", title: "Jag kommer", year: 2011, url: "",
      tidbit: "Låten från albumet 'Satan i gatan' gick rakt upp som etta i Sverige och skrevs ihop med producenten Christian Walz.",
      quiz: [{ q: "Vilket album finns Jag kommer på?", options: ["Satan i gatan", "Vatten och bröd", "Den första är alltid gratis", "Fiender är tråkigt"], correct: 0 }]
    },
    {
      artist: "Avicii", title: "Wake Me Up", year: 2013, url: "",
      tidbit: "Tim 'Avicii' Bergling chockade dansvärlden genom att blanda house med country och Aloe Blaccs röst – låten toppade listorna i över 20 länder.",
      quiz: [{ q: "Vad hette Avicii egentligen?", options: ["Axel Hedfors", "Sebastian Ingrosso", "Steve Angello", "Tim Bergling"], correct: 3 }]
    },
    {
      artist: "Daft Punk", title: "Get Lucky", year: 2013, url: "",
      tidbit: "Med Nile Rodgers på gitarr och Pharrell på sång tog de franska robotarna hem Grammy för årets inspelning 2014.",
      quiz: [{ q: "Vem gästsjunger på Get Lucky?", options: ["Bruno Mars", "Justin Timberlake", "Pharrell Williams", "The Weeknd"], correct: 2 }]
    }
  ]
};
