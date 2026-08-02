// Exempelspellista för Skivbacken.
// Lägg gärna in egna Spotify-/YouTube-länkar i "url" – utan länk får du en
// YouTube-sökknapp i spelet i stället.
const SAMPLE_PLAYLIST = {
  name: "Exempellistan – blandade hits",
  songs: [
    {
      artist: "Elvis Presley", title: "Jailhouse Rock", year: 1957, url: "",
      tidbit: "Låten skrevs till filmen med samma namn, där Elvis själv var med och koreograferade den berömda fängelsedansscenen.",
      quiz: [
        { type: "artist", q: "Vad kallas Elvis Presley ofta?", options: ["The Boss", "The King", "The Duke", "The Voice"], correct: 1 },
        { type: "year", q: "Vad hände också 1957?", options: ["Berlinmuren byggdes", "Sovjet skickade upp Sputnik", "Månlandningen", "VM i fotboll i Sverige"], correct: 1 }
      ]
    },
    {
      artist: "The Beatles", title: "Hey Jude", year: 1968, url: "",
      tidbit: "Paul McCartney skrev låten för att trösta John Lennons son Julian under föräldrarnas skilsmässa – den hette först 'Hey Jules'.",
      quiz: [
        { type: "artist", q: "Vem i The Beatles skrev Hey Jude?", options: ["Paul McCartney", "John Lennon", "George Harrison", "Ringo Starr"], correct: 0 },
        { type: "year", q: "Vad hände också 1968?", options: ["Martin Luther King mördades", "Berlinmuren föll", "Titanic hittades", "Elvis dog"], correct: 0 }
      ]
    },
    {
      artist: "Queen", title: "Bohemian Rhapsody", year: 1975, url: "",
      tidbit: "Skivbolaget tyckte att låten var alldeles för lång för radio med sina nästan sex minuter – den blev en av världens mest spelade låtar ändå.",
      quiz: [
        { type: "artist", q: "Vad hette Queens legendariske sångare?", options: ["Brian May", "Roger Taylor", "Freddie Mercury", "John Deacon"], correct: 2 },
        { type: "year", q: "Vad hände också 1975?", options: ["Apple grundades", "Vietnamkriget tog slut", "Tjernobylolyckan", "Falklandskriget"], correct: 1 }
      ]
    },
    {
      artist: "ABBA", title: "Dancing Queen", year: 1976, url: "",
      tidbit: "Dancing Queen är ABBA:s enda etta på USA:s Billboard-lista, och den framfördes för svenska kungaparet kvällen före bröllopet 1976.",
      quiz: [
        { type: "artist", q: "Vilken tävling vann ABBA 1974 med Waterloo?", options: ["Melodifestivalen (bara)", "MTV Awards", "Grammygalan", "Eurovision Song Contest"], correct: 3 },
        { type: "year", q: "Vilket företag grundades 1976?", options: ["Apple", "Google", "Facebook", "Microsoft"], correct: 0 }
      ]
    },
    {
      artist: "Gyllene Tider", title: "Sommartider", year: 1982, url: "",
      tidbit: "Per Gessle skrev hitten som sedan dess är ett obligatoriskt inslag i varje svensk sommar – han tog senare över världen med Roxette.",
      quiz: [
        { type: "artist", q: "Vem är sångare i Gyllene Tider?", options: ["Per Gessle", "Tomas Ledin", "Magnus Uggla", "Joakim Berg"], correct: 0 },
        { type: "year", q: "Vad lanserades 1982?", options: ["Kassettbandet", "CD-skivan", "MP3-spelaren", "Vinylskivan"], correct: 1 }
      ]
    },
    {
      artist: "Toto", title: "Africa", year: 1982, url: "",
      tidbit: "Ingen i bandet hade satt sin fot i Afrika när låten skrevs – texten inspirerades av tv-dokumentärer.",
      quiz: [
        { type: "artist", q: "Från vilket land kommer bandet Toto?", options: ["Storbritannien", "USA", "Australien", "Sydafrika"], correct: 1 },
        { type: "year", q: "Vilken film hade premiär 1982?", options: ["Star Wars", "Jurassic Park", "E.T.", "Tillbaka till framtiden"], correct: 2 }
      ]
    },
    {
      artist: "Michael Jackson", title: "Billie Jean", year: 1983, url: "",
      tidbit: "Det var under ett framförande av Billie Jean på Motown 25-galan 1983 som Michael Jackson visade upp sin moonwalk för första gången.",
      quiz: [
        { type: "artist", q: "Vilket danssteg blev Michael Jackson världskänd för?", options: ["Roboten", "Vogue", "Moonwalk", "Breakdance"], correct: 2 },
        { type: "year", q: "Vad lanserades kommersiellt 1983?", options: ["Den första mobiltelefonen", "Walkman", "iPod", "DVD-spelaren"], correct: 0 }
      ]
    },
    {
      artist: "Roxette", title: "The Look", year: 1989, url: "",
      tidbit: "Låten blev etta i USA tack vare en amerikansk utbytesstudent som tog med sig skivan hem och tjatade på en radiostation i Minneapolis att spela den.",
      quiz: [
        { type: "artist", q: "Vilka två bildade Roxette?", options: ["Per Gessle & Marie Fredriksson", "Benny & Björn", "Tomas & Lena", "Per & Agnetha"], correct: 0 },
        { type: "year", q: "Vad hände också 1989?", options: ["Sovjet upplöstes", "Berlinmuren föll", "EU bildades", "Estonia förliste"], correct: 1 }
      ]
    },
    {
      artist: "Nirvana", title: "Smells Like Teen Spirit", year: 1991, url: "",
      tidbit: "Titeln kommer från graffitin 'Kurt smells like Teen Spirit' – Kurt Cobain visste inte att Teen Spirit var ett deodorantmärke.",
      quiz: [
        { type: "artist", q: "Vad hette Nirvanas sångare och gitarrist?", options: ["Eddie Vedder", "Dave Grohl", "Chris Cornell", "Kurt Cobain"], correct: 3 },
        { type: "year", q: "Vad hände också 1991?", options: ["Sovjetunionen upplöstes", "Berlinmuren föll", "11 september-attackerna", "Euron infördes"], correct: 0 }
      ]
    },
    {
      artist: "Whitney Houston", title: "I Will Always Love You", year: 1992, url: "",
      tidbit: "Låten är faktiskt en cover – Dolly Parton skrev och släppte originalet redan 1974, och lär ha byggt en nöjespark för royaltypengarna.",
      quiz: [
        { type: "artist", q: "I vilken film sjöng Whitney Houston I Will Always Love You?", options: ["Sister Act", "The Bodyguard", "Ghost", "Pretty Woman"], correct: 1 },
        { type: "year", q: "Var hölls sommar-OS 1992?", options: ["Aten", "Sydney", "Atlanta", "Barcelona"], correct: 3 }
      ]
    },
    {
      artist: "Britney Spears", title: "...Baby One More Time", year: 1998, url: "",
      tidbit: "Världshitten skrevs av svensken Max Martin i Stockholm – och refuserades först av både TLC och Backstreet Boys.",
      quiz: [
        { type: "artist", q: "Vilken svensk låtskrivare låg bakom ...Baby One More Time?", options: ["Max Martin", "Benny Andersson", "Avicii", "RedOne"], correct: 0 },
        { type: "year", q: "Vilket företag grundades 1998?", options: ["Google", "Spotify", "YouTube", "Amazon"], correct: 0 }
      ]
    },
    {
      artist: "Håkan Hellström", title: "Känn ingen sorg för mig Göteborg", year: 2000, url: "",
      tidbit: "Innan solokarriären satt Håkan bakom trummorna i Broder Daniel – debutsingeln gjorde honom över en natt till hela Göteborgs husgud.",
      quiz: [
        { type: "artist", q: "Vilket band spelade Håkan Hellström i innan solokarriären?", options: ["Kent", "bob hund", "Broder Daniel", "Soundtrack of Our Lives"], correct: 2 },
        { type: "year", q: "Vad invigdes år 2000?", options: ["Globen", "Öresundsbron", "Arlanda Express", "Turning Torso"], correct: 1 }
      ]
    },
    {
      artist: "Robyn", title: "Dancing On My Own", year: 2010, url: "",
      tidbit: "Robyn lämnade sitt stora skivbolag och startade eget (Konichiwa Records) för att få göra precis den här sortens musik – kritikerna utsåg låten till en av 2010-talets bästa.",
      quiz: [
        { type: "artist", q: "Vad heter Robyns eget skivbolag?", options: ["Polar Music", "Konichiwa Records", "Cheiron", "Refune"], correct: 1 },
        { type: "year", q: "Vilken app lanserades 2010?", options: ["Snapchat", "TikTok", "Instagram", "WhatsApp"], correct: 2 }
      ]
    },
    {
      artist: "Veronica Maggio", title: "Jag kommer", year: 2011, url: "",
      tidbit: "Låten från albumet 'Satan i gatan' gick rakt upp som etta i Sverige och skrevs ihop med producenten Christian Walz.",
      quiz: [
        { type: "artist", q: "Vilket album finns Jag kommer på?", options: ["Satan i gatan", "Vatten och bröd", "Den första är alltid gratis", "Fiender är tråkigt"], correct: 0 },
        { type: "year", q: "Vilket kungligt bröllop stod 2011?", options: ["William & Kate", "Harry & Meghan", "Victoria & Daniel", "Carl Philip & Sofia"], correct: 0 }
      ]
    },
    {
      artist: "Avicii", title: "Wake Me Up", year: 2013, url: "",
      tidbit: "Tim 'Avicii' Bergling chockade dansvärlden genom att blanda house med country och Aloe Blaccs röst – låten toppade listorna i över 20 länder.",
      quiz: [
        { type: "artist", q: "Vad hette Avicii egentligen?", options: ["Axel Hedfors", "Sebastian Ingrosso", "Steve Angello", "Tim Bergling"], correct: 3 },
        { type: "year", q: "Vad hände också 2013?", options: ["Brexit-omröstningen", "Påve Franciskus valdes", "Trump blev president", "OS i London"], correct: 1 }
      ]
    },
    {
      artist: "Daft Punk", title: "Get Lucky", year: 2013, url: "",
      tidbit: "Med Nile Rodgers på gitarr och Pharrell på sång tog de franska robotarna hem Grammy för årets inspelning 2014.",
      quiz: [
        { type: "artist", q: "Vem gästsjunger på Get Lucky?", options: ["Bruno Mars", "Justin Timberlake", "Pharrell Williams", "The Weeknd"], correct: 2 },
        { type: "year", q: "Vilken serie hade premiär på Netflix 2013?", options: ["Stranger Things", "Breaking Bad", "House of Cards", "Game of Thrones"], correct: 2 }
      ]
    }
  ]
};
