

// pagrindinė žaidimo būsena
let gameState = 'menu'; // meniu, startuoja ar, ar ruošimas, stato bokštą, žaidžia, pauzė, žaidimas baigtas
let highScore = 0; // aukščiausio rezultato saugojimui
let score = 0;
let currentLevel = 1;
let scoreForNextLevel = 10; // pradinė reikšmė, atnaujins game_config
let scoreGap = 10;          // pradinė reikšmė, atnaujins game_config

// bokšto būsena
let currentMaxTowerHealth = 10; // pradinė reikšmė, atnaujins game_config
let currentTowerHealth = 10;    // pradinė reikšmė, atnaujins game_config

// upgrade'ų būsena
let upgradeShooter1Placed = false;
let upgradeShooter2Placed = false;
let upgradeSlowTurretPlaced = false;
let upgradeSlowTurret2Placed = false;
let shooterLevel = 0;           // vidinis šaudyklės upgrade'ų lygis (greitis/žala)
let playerDamageLevel = 0;      // žaidėjo rankinio šūvio žalos lygis
let slowTurretLevel = 0;        // vidinis lėtintojo upgrade'ų lygis (greitis/lėtinimo %)
let nextShooterUpgradeLevel = 3; // žaidėjo lygis kada kitas šaudyklės upgrade'as galimas (atnaujina config/logika)
let nextSlowTurretUpgradeLevel = 5; // žaidėjo lygis kada kitas lėtintojo upgrade'as galimas (atnaujina config/logika)

// žaidimo eigos flag'ai
let isGameSetupComplete = false; // true po bokšto padėjimo ir žaidimo starto
let towerPlaced = false;         // true kai bokštas yra ar
let isGamePaused = false;
let isGameOver = false;

// padėjimo būsena (upgrade'ams)
let placingUpgrade = null; // dedamo upgrade'o tipas (pvz., 'shooter1', 'slowTurret2')
let placedUpgradeEl = null; // nuoroda į laikiną vizualų elementą kuris dedamas

// nuorodos į aktyvius žaidimo objektus
let placedTowerEl = null;        // nuoroda į padėtą bokšto a-frame elementą
let activeShooterUpgrades = []; // masyvas aktyvių šaudyklių elementų nuorodoms laikyti
let activeSlowTurrets = [];   // masyvas aktyvių lėtintojų elementų nuorodoms laikyti

// techninė būsena
let lastSelectTime = 0;       // ar padėjimo paspaudimų
// select_debounce_ms apibrėžtas game_config.timings

// ui elementų nuorodos (galima perkelt viską į uimanager.js jei norisi)
// paliekam kai kurias čia laikinai jei būsenos logika tiesiogiai naudoja, bet idealiu atveju ui valdytojas tvarko visas dom nuorodas.
let levelUpTimeout = null; // timeout id lygio pakilimo popupo slėpimui