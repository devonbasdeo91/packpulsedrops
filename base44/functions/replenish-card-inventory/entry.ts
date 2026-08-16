import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { isInternalCall } from "../../shared/internalAuth.ts";

// Minimum cards a pack must have; below this we top back up to TARGET.
const MIN_CARDS = 500;
const TARGET = 1000;

const NAME_POOLS = {
  yugioh: ["Blue-Eyes White Dragon","Dark Magician","Exodia the Forbidden One","Slifer the Sky Dragon","Obelisk the Tormentor","The Winged Dragon of Ra","Red-Eyes Black Dragon","Summoned Skull","Monster Reborn","Pot of Greed","Celtic Guardian","Kuriboh","Jinzo","Relinquished","Black Luster Soldier","Chaos Emperor Dragon","Mirror Force","Ring of Destruction","Magic Cylinder","Man-Eater Bug","Mystical Elf","Gaia the Fierce Knight","Dark Magician Girl","Buster Blader","Swords of Revealing Light","Thousand Dragon","Time Wizard","Castle Walls","Negate Attack","Giant Soldier of Stone"],
  pokemon: ["Charizard","Pikachu","Blastoise","Venusaur","Mewtwo","Mew","Lugia","Ho-Oh","Rayquaza","Groudon","Kyogre","Dialga","Palkia","Giratina","Reshiram","Zekrom","Xerneas","Yveltal","Solgaleo","Lunala","Eevee","Snorlax","Gengar","Alakazam","Machamp","Gyarados","Dragonite","Moltres","Zapdos","Articuno","Sylveon","Umbreon","Espeon","Charmander","Squirtle","Bulbasaur"],
  dragonball: ["Goku","Vegeta","Gohan","Piccolo","Frieza","Cell","Majin Buu","Broly","Beerus","Whis","Jiren","Toppo","Krillin","Tien","Yamcha","Android 18","Android 17","Trunks","Goten","Bardock","Cooler","Janemba","Gogeta","Vegito","Kefla","Hit","Cabba","Kale","Caulifla","Champa","Vados","Golden Frieza","SSJ3 Goku","Mystic Gohan","Super Saiyan Blue Goku"],
  digimon: ["Agumon","Gabumon","Biyomon","Palmon","Gomamon","Patamon","Gatomon","Tentomon","Omnimon","WarGreymon","MetalGarurumon","MagnaAngemon","Angewomon","Imperialdramon","Gallantmon","Sukuyomon","Phoenixmon","Rosemon","HerculesKabuterimon","MegaSeadramon","MetalSeadramon","Machinedramon","Piedmon","Puppetmon","MetalEtemon","Apocalymon","Diaboromon","Cherubimon","Seraphimon","Ophanimon","Beelzemon","Leomon","Monzaemon","Wizardmon","Myotismon"],
  baseball: ["Mike Trout","Shohei Ohtani","Aaron Judge","Ronald Acuna Jr","Mookie Betts","Fernando Tatis Jr","Juan Soto","Vladimir Guerrero Jr","Bryce Harper","Manny Machado","Jose Altuve","Freddie Freeman","Trea Turner","Walker Buehler","Jacob deGrom","Gerrit Cole","Clayton Kershaw","Nolan Arenado","Rafael Devers","Julio Rodriguez","Bobby Witt Jr","Adley Rutschman","Spencer Strider","Corbin Carroll","Oneil Cruz","Wander Franco","Bo Bichette","Gunnar Henderson","Adolis Garcia","Ronald Acuna"],
  basketball: ["LeBron James","Stephen Curry","Kevin Durant","Giannis Antetokounmpo","Luka Doncic","Nikola Jokic","Joel Embiid","Jayson Tatum","Donovan Mitchell","Ja Morant","Zion Williamson","Anthony Edwards","LaMelo Ball","Tyrese Haliburton","De'Aaron Fox","Devin Booker","Karl-Anthony Towns","Anthony Davis","Kawhi Leonard","Damian Lillard","Jaylen Brown","Paolo Banchero","Victor Wembanyama","Chet Holmgren","Scoot Henderson","Brandon Ingram","Dejounte Murray","Pascal Siakam","Bam Adebayo","Tyler Herro"],
  naruto: ["Naruto Uzumaki","Sasuke Uchiha","Sakura Haruno","Kakashi Hatake","Itachi Uchiha","Madara Uchiha","Obito Uchiha","Pain","Konan","Kisame","Deidara","Sasori","Gaara","Rock Lee","Might Guy","Neji Hyuga","Hinata Hyuga","Shikamaru Nara","Shino Aburame","Kiba Inuzuka","Tsunade","Jiraiya","Orochimaru","Minato Namikaze","Kushina Uzumaki","Hashirama Senju","Tobirama Senju","Hiruzen Sarutobi","Danzo Shimura","Killer Bee","Sage Naruto","Six Paths Sasuke","Eight Gates Guy","Edo Madara","Sage Kabuto"],
  bleach: ["Ichigo Kurosaki","Rukia Kuchiki","Orihime Inoue","Uryu Ishida","Chad Yasutora","Renji Abarai","Byakuya Kuchiki","Toshiro Hitsugaya","Rangiku Matsumoto","Kenpachi Zaraki","Yoruichi Shihoin","Kisuke Urahara","Shunsui Kyoraku","Jushiro Ukitake","Sosuke Aizen","Gin Ichimaru","Kaname Tosen","Yamamoto","Unohana","Mayuri Kurotsuchi","Grimmjow","Ulquiorra","Starrk","Harribel","Nnoitra","Szayelaporro","Zommari","Aaroniero","Yammy","Wonderweiss","Bankai Ichigo","Hollow Ichigo","Vasto Lorde","Aizen Hogyoku","True Bankai Renji"],
  football: ["Patrick Mahomes","Tom Brady","Aaron Rodgers","Josh Allen","Joe Burrow","Justin Herbert","Lamar Jackson","Dak Prescott","Derrick Henry","Christian McCaffrey","Cooper Kupp","Davante Adams","Tyreek Hill","Travis Kelce","George Kittle","Nick Bosa","Aaron Donald","Jalen Ramsey","TJ Watt","Micah Parsons","Justin Jefferson","Ja'Marr Chase","Stefon Diggs","Saquon Barkley","Maxx Crosby","Nick Chubb","DK Metcalf","Tee Higgins","Jaylen Waddle","Deebo Samuel"],
  soccer: ["Lionel Messi","Cristiano Ronaldo","Neymar Jr","Kylian Mbappe","Erling Haaland","Kevin De Bruyne","Mohamed Salah","Sadio Mane","Harry Kane","Son Heung-min","Robert Lewandowski","Karim Benzema","Luka Modric","Toni Kroos","N'Golo Kante","Paul Pogba","Bruno Fernandes","Jack Grealish","Phil Foden","Vinicius Jr","Jude Bellingham","Pedri","Ansu Fati","Joao Felix","Eduardo Camavinga","Bukayo Saka","Rafael Leao","Lautaro Martinez","Federico Valverde","Rodri"],
  cricket: ["Virat Kohli","Sachin Tendulkar","Ricky Ponting","Brian Lara","Wasim Akram","Shane Warne","Muttiah Muralitharan","Jacques Kallis","Kumar Sangakkara","AB de Villiers","Ben Stokes","Steve Smith","Kane Williamson","Joe Root","Babar Azam","Rohit Sharma","Jasprit Bumrah","Pat Cummins","Mitchell Starc","Trent Boult","Rashid Khan","Quinton de Kock","David Warner","Glenn Maxwell","Hardik Pandya","KL Rahul","Shubman Gill","Shaheen Afridi","Jofra Archer","Kagiso Rabada"],
  tennis: ["Roger Federer","Rafael Nadal","Novak Djokovic","Serena Williams","Pete Sampras","Andre Agassi","Bjorn Borg","John McEnroe","Steffi Graf","Martina Navratilova","Andy Murray","Stan Wawrinka","Marin Cilic","Juan Martin del Potro","Carlos Alcaraz","Jannik Sinner","Daniil Medvedev","Alexander Zverev","Stefanos Tsitsipas","Casper Ruud","Naomi Osaka","Ashleigh Barty","Iga Swiatek","Aryna Sabalenka","Coco Gauff","Emma Raducanu","Bianca Andreescu","Petra Kvitova","Simona Halep","Maria Sharapova"],
  wnba: ["A'ja Wilson","Breanna Stewart","Candace Parker","Diana Taurasi","Sue Bird","Maya Moore","Tamika Catchings","Lisa Leslie","Sheryl Swoopes","Lauren Jackson","Sylvia Fowles","Elena Delle Donne","Skylar Diggins-Smith","Jewell Loyd","Sabrina Ionescu","Arike Ogunbowale","Jonquel Jones","Alyssa Thomas","Napheesa Collier","Chelsea Gray","Kelsey Plum","Brittney Griner","Nneka Ogwumike","Chiney Ogwumike","Tina Charles","DeWanna Bonner","Angel McCoughtry","Aerial Powers","Jackie Young","Alysha Clark"],
  nhl: ["Wayne Gretzky","Mario Lemieux","Bobby Orr","Sidney Crosby","Alexander Ovechkin","Connor McDavid","Patrick Kane","Auston Matthews","Nathan MacKinnon","Leon Draisaitl","Nikita Kucherov","Andrei Vasilevskiy","Victor Hedman","Erik Karlsson","Drew Doughty","Anze Kopitar","John Tavares","Steven Stamkos","Phil Kessel","Claude Giroux","Mark Stone","Brayden Point","Cale Makar","Quinn Hughes","Elias Pettersson","Jack Hughes","Kirill Kaprizov","Roman Josi","Igor Shesterkin","Carey Price"],
  golf: ["Tiger Woods","Rory McIlroy","Jack Nicklaus","Phil Mickelson","Jordan Spieth","Brooks Koepka","Dustin Johnson","Justin Thomas","Jon Rahm","Collin Morikawa","Scottie Scheffler","Xander Schauffele","Hideki Matsuyama","Bryson DeChambeau","Patrick Cantlay","Tony Finau","Viktor Hovland","Matthew Fitzpatrick","Sam Burns","Cameron Smith","Adam Scott","Jason Day","Rickie Fowler","Max Homa","Wyndham Clark","Lucas Glover","Keegan Bradley","Russell Henley","Tom Kim","Sepp Straka"],
  badminton: ["Lin Dan","Lee Chong Wei","Peter Gade","Taufik Hidayat","Chen Long","Kento Momota","Viktor Axelsen","Anders Antonsen","Anthony Ginting","Jonatan Christie","Shi Yuqi","Lee Zii Jia","Loh Kean Yew","Kunlavut Vitidsarn","Praveen Jordan","Marcus Gideon","Kevin Sanjaya","Mohammad Ahsan","Hendra Setiawan","Lee Yong-dae","Carolina Marin","Tai Tzu-ying","PV Sindhu","Nozomi Okuhara","Akane Yamaguchi","Ratchanok Intanon","Chen Yufei","He Bingjiao","An Se-young","Wang Yihan"],
  tabletennis: ["Ma Long","Fan Zhendong","Xu Xin","Zhang Jike","Wang Liqin","Timo Boll","Jan-Ove Waldner","Liu Guoliang","Kong Linghui","Deng Yaping","Zhang Yining","Wang Nan","Liu Shiwen","Ding Ning","Sun Yingsha","Chen Meng","Wang Chuqin","Liang Jingkun","Tomokazu Harimoto","Hugo Calderano","Mattias Falck","Dang Qiu","Lin Yun-ju","Chuang Chih-yuan","Jorgen Persson","Jean-Philippe Gatien","Jean-Michel Saive","Kalinikos Kreanga","Truls Moregard","Ma Lin"],
  swimming: ["Michael Phelps","Katie Ledecky","Mark Spitz","Ian Thorpe","Caeleb Dressel","Ryan Lochte","Missy Franklin","Natalie Coughlin","Matt Biondi","Janet Evans","Aaron Peirsol","Grant Hackett","Sun Yang","Adam Peaty","Dana Vollmer","Allison Schmitt","Lilly King","Simone Manuel","Rowdy Gaines","Gary Hall Jr","Penny Oleksiak","Sarah Sjostrom","Katinka Hosszu","Ruta Meilutyte","Florent Manaudou","Joseph Schooling","Chad le Clos","Park Tae-hwan","Brendan Hansen","Emma McKeon"],
  trackfield: ["Usain Bolt","Carl Lewis","Jesse Owens","Michael Johnson","Allyson Felix","Florence Griffith-Joyner","Shelly-Ann Fraser-Pryce","Asafa Powell","Yohan Blake","Justin Gatlin","Christian Coleman","Noah Lyles","Eliud Kipchoge","Mo Farah","Kenenisa Bekele","Hicham El Guerrouj","Sifan Hassan","Faith Kipyegon","Letesenbet Gidey","Dalilah Muhammad","Sydney McLaughlin","Athing Mu","Shaunae Miller-Uibo","Marie-Jose Perec","Wayde van Niekerk","Kirani James","Renaud Lavillenie","Mondo Duplantis","Sam Kendricks","Ryan Crouser"],
  f1: ["Lewis Hamilton","Max Verstappen","Charles Leclerc","Lando Norris","Charles Leclerc","Carlos Sainz","Sergio Perez","George Russell","Fernando Alonso","Esteban Ocon","Pierre Gasly","Valtteri Bottas","Lance Stroll","Sebastian Vettel","Daniel Ricciardo","Yuki Tsunoda","Zhou Guanyu","Alex Albon","Nico Hulkenberg","Kevin Magnussen","Nyck de Vries","Logan Sargeant","Oscar Piastri","Fernando Alonso","Ayrton Senna","Michael Schumacher","Niki Lauda","Alain Prost","Nigel Mansell","Jackie Stewart","Emerson Fittipaldi","Nelson Piquet","Keke Rosberg","Damon Hill","Jacques Villeneuve","Mika Hakkinen","Kimi Raikkonen","Jenson Button","Nico Rosberg","Rubens Barrichello","Giancarlo Fisichella","Ralf Schumacher","Juan Pablo Montoya","David Coulthard","Mark Webber","Felipe Massa","Robert Kubica","Heikki Kovalainen","Timo Glock","Adrian Sutil"],
};

// Values are in gems; GEMS_PER_USD = 0.0035, so 42857 gems = $150 (platform cap).
const TCG_RARITIES = [
  { rarity: "Common", count: 10, value: 286 },     // ~$1
  { rarity: "Rare", count: 6, value: 1143 },       // ~$4
  { rarity: "Short Print", count: 4, value: 2286 },// ~$8
  { rarity: "Super Rare", count: 4, value: 7143 }, // ~$25
  { rarity: "Ultra Rare", count: 3, value: 14286 },// ~$50
  { rarity: "Secret Rare", count: 2, value: 21429 },// ~$75
  { rarity: "Ghost Rare", count: 1, value: 28571 },// ~$100
  { rarity: "1/1", count: 1, value: 35714 },       // ~$125
  { rarity: "Diamond", count: 1, value: 42857 },  // ~$150 (cap)
];

const SPORTS_RARITIES = [
  { rarity: "Base", count: 10, value: 286 },        // ~$1
  { rarity: "Short Print", count: 5, value: 1143 },// ~$4
  { rarity: "Rare", count: 4, value: 2286 },       // ~$8
  { rarity: "Refractor", count: 4, value: 4286 },  // ~$15
  { rarity: "Super Rare", count: 3, value: 7143 },// ~$25
  { rarity: "Ultra Rare", count: 2, value: 14286 },// ~$50
  { rarity: "Auto", count: 2, value: 17143 },      // ~$60
  { rarity: "Relic", count: 2, value: 12857 },     // ~$45
  { rarity: "1/1", count: 1, value: 35714 },       // ~$125
  { rarity: "Diamond", count: 1, value: 42857 },   // ~$150 (cap)
];

const SPORTS_CATS = ["baseball", "basketball", "football", "soccer", "cricket", "tennis", "wnba", "nhl", "golf", "badminton", "tabletennis", "swimming", "trackfield"];
const subsetNames = ["Base Set", "Holo Parallel", "Gold Series", "Limited Edition", "Chase Edition", "Premium Foil", "Anniversary Edition", "Rookie Edition"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only endpoint — called by the "Card Inventory Replenishment"
    // scheduled workflow. Authenticated via the internal_secret body field
    // (stored in the platform secrets manager) — the only accepted method.
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: "Forbidden" }, { status: 403 });

    const packs = await base44.asServiceRole.entities.Pack.list("-created_date", 100);

    const replenished = [];
    let totalCreated = 0;

    for (const pack of packs) {
      const existing = await base44.asServiceRole.entities.Card.filter({ pack_id: pack.id }, "-created_date", 200);
      const count = existing.length;
      if (count >= MIN_CARDS) continue;

      const needed = Math.max(0, TARGET - count);
      if (needed <= 0) continue;

      const pool = NAME_POOLS[pack.category] || NAME_POOLS.yugioh;
      const raritySet = SPORTS_CATS.includes(pack.category) ? SPORTS_RARITIES : TCG_RARITIES;

      // Flatten rarities into a weighted cycle so top-ups keep the rarity spread.
      const flatRarities = [];
      for (const r of raritySet) {
        for (let i = 0; i < r.count; i++) flatRarities.push({ rarity: r.rarity, value: r.value });
      }

      const newCards = [];
      let nameIdx = 0;
      for (let i = 0; i < needed; i++) {
        const { rarity, value } = flatRarities[i % flatRarities.length];
        const baseName = pool[nameIdx % pool.length];
        nameIdx++;
        newCards.push({
          name: `${baseName} ${rarity} #${count + i + 1}`,
          pack_id: pack.id,
          category: pack.category,
          rarity,
          value_gems: value,
          subset: subsetNames[nameIdx % subsetNames.length],
          description: `${baseName} — ${rarity} tier digital collectible from ${pack.name}.`,
        });
      }

      for (let i = 0; i < newCards.length; i += 400) {
        const batch = newCards.slice(i, i + 400);
        await base44.entities.Card.bulkCreate(batch);
      }
      totalCreated += newCards.length;
      replenished.push({ pack_id: pack.id, pack_name: pack.name, before: count, added: newCards.length });
    }

    return Response.json({
      success: true,
      packs_checked: packs.length,
      packs_replenished: replenished.length,
      cards_created: totalCreated,
      replenished,
    });
  } catch (error) {
    console.error("replenish-card-inventory error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}