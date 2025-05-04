// ========================================================
// =================== GAME STATE =======================
// ========================================================

// Core Game State
let gameState = 'menu'; // menu, starting_ar, ar_setup, placing_tower, playing, paused, game_over
let highScore = 0; // For storing high score
let score = 0;
let currentLevel = 1;
let scoreForNextLevel = 10; // Initial value, will be updated by GAME_CONFIG
let scoreGap = 10;          // Initial value, will be updated by GAME_CONFIG

// Tower State
let currentMaxTowerHealth = 10; // Initial value, will be updated by GAME_CONFIG
let currentTowerHealth = 10;    // Initial value, will be updated by GAME_CONFIG

// Upgrade State
let upgradeShooter1Placed = false;
let upgradeShooter2Placed = false;
let upgradeSlowTurretPlaced = false;
let upgradeSlowTurret2Placed = false;
let shooterLevel = 0;           // Internal level for shooter upgrades (speed/dmg)
let playerDamageLevel = 0;      // Level for player's manual shot damage
let slowTurretLevel = 0;        // Internal level for slower upgrades (speed/slow%)
let nextShooterUpgradeLevel = 3; // Player level when next shooter upgrade is available (updated by config/logic)
let nextSlowTurretUpgradeLevel = 5; // Player level when next slower upgrade is available (updated by config/logic)

// Gameplay Status Flags
let isGameSetupComplete = false; // True after tower is placed and game started
let towerPlaced = false;         // True once the base tower exists in AR
let isGamePaused = false;
let isGameOver = false;

// Placement State (for upgrades)
let placingUpgrade = null; // Type of upgrade being placed (e.g., 'shooter1', 'slowTurret2')
let placedUpgradeEl = null; // Reference to the temporary visual element being placed

// References to Active Game Objects
let placedTowerEl = null;        // Reference to the placed tower A-Frame element
let activeShooterUpgrades = []; // Array to hold references to active shooter turret elements
let activeSlowTurrets = [];   // Array to hold references to active slow turret elements

// Technical State
let lastSelectTime = 0;       // For debouncing AR placement taps
// Note: SELECT_DEBOUNCE_MS is defined in GAME_CONFIG.TIMINGS

// UI Element References (Consider moving entirely to uiManager.js if preferred)
// Keeping some here temporarily if state logic directly uses them, but ideally UI manager handles all DOM refs.
let levelUpTimeout = null; // Timeout ID for hiding the level up popup

// ========================================================
// ================= END GAME STATE =====================
// ========================================================


