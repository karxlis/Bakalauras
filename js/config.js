//configuracija
const GAME_CONFIG = {
    DEBUG_LOGS: {
        spawnValidation: true, // įjungti jei nori matyt kodėl atmestas spawnas
        spawnChance: true,     // rodyti priešų atsiradimo šansus
        upgradeCalculation: false // rodyti detalius upgrade'o prieinamumo žingsnius
    },
    LEVELING: {
        MAX_LEVEL: 100,
        INITIAL_SCORE_THRESHOLD: 10,
        INITIAL_SCORE_GAP: 10,
        GAP_MULTIPLIER: 1.1, // taškų skirtumas didėja 10% po 4 lygio
        GAP_MIN_INCREASE: 1    // užtikrinti kad skirtumas didėtų bent 1
    },
    TOWER: {
        INITIAL_MAX_HEALTH: 10
    },
    PLAYER: {
        SHOOT_DAMAGE_BASE: 1,
        DAMAGE_UPGRADE_MULTIPLIER: 1.30 // +30% žalos per upgrade lygį
    },
    UPGRADES: {
        UNLOCKS: {
            SLOW_TURRET: 5,      // lygis kada galima statyti lėtintoją
            SECOND_SHOOTER: 10,  // lygis kada galima statyti antrą šaudyklę
            SHOOTER_DAMAGE_1: 5, // žaidėjo lygis kada žalos i upgrade'as *gali* būti pritaikytas (per shooterlevel 1)
            SHOOTER_DAMAGE_2: 20, // žaidėjo lygis kada žalos ii upgrade'as *gali* būti pritaikytas (per shooterlevel 2)
            SECOND_SLOW_TURRET:14
        },
        HEALTH: {
            HP_INCREASE: 3
        },
        SHOOTER: {
            UPGRADE_FREQUENCY: 2, // upgrade'as siūlomas kas 2 lygius (nelyginiai skaičiai)
            INITIAL_LEVEL_CHECK: 3, // pradėti tikrinti upgrade'us nuo žaidėjo 3 lygio
            SPEED_INCREASE_FACTOR: 0.85, // greičio upgrade'as sumažina uždelsimą iki 85% (15% greičiau)
            DAMAGE_1_MULTIPLIER: 1.3, // +30% žalos
            DAMAGE_2_FACTOR: 1.2, // +20% ant žalos 1
            LEVEL_FOR_DAMAGE_1: 1, // vidinis šaudyklės lygis kada žala i pritaikoma
            LEVEL_FOR_DAMAGE_2: 2  // vidinis šaudyklės lygis kada žala ii pritaikoma
        },
        SLOWER: {
            UPGRADE_FREQUENCY: 3, // upgrade'as siūlomas kas 3 lygius
            SPEED_INCREASE_FACTOR: 0.90, // greičio upgrade'as sumažina uždelsimą iki 90% (10% greičiau)
            SLOW_INCREASE_AMOUNT: 0.90, // pridėti +20% lėtinimo efektyvumo (klaidingas komentaras, reiktų taisyt į 10% pagal faktorių arba formulę)
            SLOW_MAX_PERCENTAGE: 0.90 // lėtinimo efektyvumo riba 90%
        }
    },
    TURRETS: { 
        SHOOTER: {
            INITIAL_DELAY: 5000,
            BASE_DAMAGE: 1
        },
        SLOWER: {
            INITIAL_DELAY: 3000,
            INITIAL_SLOW_PERCENTAGE: 0.5,
            PROJECTILE_COLOR: '#FFFFFF' 
        },
        PROJECTILE_DEFAULTS: { 
            SPEED: 8.0,
            LIFETIME: 4000.0,
            RADIUS: 0.08,
            COLOR: '#FF8C00' 
        },
        MIN_SHOOT_DELAY: 100 
    },
    ENEMIES: {
        MAX_ACTIVE: 5,
        SPAWN_INTERVAL_MS: 1000,
        BASE_SPEED: 0.5,
        SPEED_INCREASE_FACTOR: 1.2, // dideja kas 1.1x
        SPEED_CAP_LEVEL: 8,         // greicio cap
        TARGET_REACH_DISTANCE: 0.2,
        SPAWN_DISTANCE_MIN: 10,
        SPAWN_DISTANCE_RANGE: 8, // atsiranda 12 iki (12+6)=18 vienetų atstumu
        SPAWN_ANGLE_RANGE_RAD: Math.PI / 3.0, // 60 laipsnių lankas
        MIN_DIST_FROM_CAM_SQ: 4 * 4,
        MIN_DIST_FROM_TOWER_SQ: 4 * 4,
        VIEW_CONE_DOT_THRESHOLD: 0.3, // kiek už žaidėjo nugaros gali atsirasti
        Y_POS_CLAMP_MIN: 0.2,
        Y_POS_CLAMP_MAX: 3.0,
        MIN_ENEMY_SEPARATION_SQ:  4 * 4,

        // priešų tipai ir šansai
        TOUGH: {
            SCORE_THRESHOLD: 15,
            BASE_CHANCE: 0.2,
            CHANCE_INCREASE_PER_5_SCORE: 0.07,
            CHANCE_CAP: 0.60,
            HEALTH: 3,
            SCALE: '0.35 0.35 0.35',
            SHAPE: 'sphere',
            COLOR: '#8B0000' // tamsiai raudona
        },
        TOUGHEST: {
            SCORE_THRESHOLD: 40,
            BASE_CHANCE: 0.1, // sumažintas pradinis šansas
            CHANCE_INCREASE_PER_5_SCORE: 0.05, // paliktas didėjimo greitis
            CHANCE_CAP: 1.0,
            HEALTH: 7,
            SCALE: '0.3 0.3 0.3',
            SHAPE: 'dodecahedron',
            COLOR: '#FFA500' // neoninė oranžinė
        },
        BASIC: {
            HEALTH: 1,
            SCALE: '0.25 0.25 0.25',
            SHAPE: 'box'
            // spalva yra atsitiktinė hsl
        }
    },
    EFFECTS: {
        SLOW_DURATION_MS: 5000,
        HIT_FLASH_COLOR_ENEMY: '#FF0000', // raudonas blyksnis
        SLOW_COLOR_INDICATOR: '#87CEEB' // šviesiai mėlyna
    },
    PROJECTILES: { // numatytosios reikšmės projectile-hitter jei nenurodyta kitaip
        SPEED: 10.0,
        LIFETIME: 3000.0,
        COLLISION_RADIUS: 0.2,
        PLAYER_COLOR: '#FFFF00', // geltona
        PLAYER_RADIUS: 0.1,
        AOE_SLOW_RADIUS: 1.5 // plotinio lėtinimo spindulys
    },
    TIMINGS: {
        LEVEL_UP_POPUP_MS: 1500,
        ENEMY_REMOVE_DELAY_MS: 50,
        SPAWN_RETRY_DELAY_MS: 50,
        PROJECTILE_TARGET_QUERY_MS: 100,
        DEBOUNCE_SELECT_MS: 100
    }
};
