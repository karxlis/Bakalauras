// ========================================================
// ================= GAME CONFIGURATION ===================
// ========================================================
const GAME_CONFIG = {
    DEBUG_LOGS: {
        spawnValidation: true, // Set to true to see detailed spawn rejection reasons
        spawnChance: true,     // Log enemy spawn chances
        upgradeCalculation: false // Log detailed upgrade availability steps
    },
    LEVELING: {
        MAX_LEVEL: 100,
        INITIAL_SCORE_THRESHOLD: 10,
        INITIAL_SCORE_GAP: 10,
        GAP_MULTIPLIER: 1.1, // Score gap increases by 10% after level 4
        GAP_MIN_INCREASE: 1    // Ensure gap increases by at least 1
    },
    TOWER: {
        INITIAL_MAX_HEALTH: 10
    },
    PLAYER: {
        SHOOT_DAMAGE_BASE: 1,
        DAMAGE_UPGRADE_MULTIPLIER: 1.30 // +30% damage per upgrade level
    },
    UPGRADES: {
        UNLOCKS: {
            SLOW_TURRET: 2,      // Level required to unlock placing the slow turret
            SECOND_SHOOTER: 10,  // Level required to unlock placing the second shooter
            SHOOTER_DAMAGE_1: 15, // Player Level when Damage I upgrade *can* first be applied (via shooterLevel 1)
            SHOOTER_DAMAGE_2: 25, // Player Level when Damage II upgrade *can* first be applied (via shooterLevel 2)
            SECOND_SLOW_TURRET: 13
        },
        HEALTH: {
            HP_INCREASE: 3
        },
        SHOOTER: {
            UPGRADE_FREQUENCY: 2, // Upgrade offered every 2 levels (odd numbers)
            INITIAL_LEVEL_CHECK: 3, // Start checking for upgrades from Player Level 3
            SPEED_INCREASE_FACTOR: 0.85, // Speed upgrade reduces delay to 85% (15% faster)
            DAMAGE_1_MULTIPLIER: 1.3, // +30% damage
            DAMAGE_2_FACTOR: 1.2, // +20% on top of Damage 1
            LEVEL_FOR_DAMAGE_1: 1, // Internal shooterLevel when Dmg I is applied
            LEVEL_FOR_DAMAGE_2: 2  // Internal shooterLevel when Dmg II is applied
        },
        SLOWER: {
            UPGRADE_FREQUENCY: 3, // Upgrade offered every 3 levels
            SPEED_INCREASE_FACTOR: 0.90, // Speed upgrade reduces delay to 90% (10% faster)
            SLOW_INCREASE_AMOUNT: 0.90, // Add +20% slow effectiveness
            SLOW_MAX_PERCENTAGE: 0.90 // Cap slow effectiveness at 90%
        }
    },
    TURRETS: { // Default/Initial values for placed turrets
        SHOOTER: {
            INITIAL_DELAY: 5000,
            BASE_DAMAGE: 1
        },
        SLOWER: {
            INITIAL_DELAY: 3000,
            INITIAL_SLOW_PERCENTAGE: 0.5,
            PROJECTILE_COLOR: '#FFFFFF' // White projectiles
        },
        PROJECTILE_DEFAULTS: { // Shared defaults
            SPEED: 8.0,
            LIFETIME: 4000.0,
            RADIUS: 0.08,
            COLOR: '#FF8C00' // Default shooter color
        },
        MIN_SHOOT_DELAY: 100 // Minimum delay in ms for any turret
    },
    ENEMIES: {
        MAX_ACTIVE: 8,
        SPAWN_INTERVAL_MS: 1000,
        BASE_SPEED: 0.9,
        SPEED_INCREASE_FACTOR: 1.1, // Speed multiplier increases by 10% per level (before cap)
        SPEED_CAP_LEVEL: 8,         // Level at which speed stops increasing
        TARGET_REACH_DISTANCE: 0.2,
        // Spawn Position Logic
        SPAWN_DISTANCE_MIN: 12,
        SPAWN_DISTANCE_RANGE: 6, // Spawn 12 to (12+6)=18 units away
        SPAWN_ANGLE_RANGE_RAD: Math.PI / 3.0, // 60 degrees arc
        MIN_DIST_FROM_CAM_SQ: 4 * 4,
        MIN_DIST_FROM_TOWER_SQ: 4 * 4,
        VIEW_CONE_DOT_THRESHOLD: 0.3, // How far behind player they can spawn
        Y_POS_CLAMP_MIN: 0.2,
        Y_POS_CLAMP_MAX: 3.0,
        MIN_ENEMY_SEPARATION_SQ:  4 * 4,

        // Enemy Types & Chances
        TOUGH: {
            SCORE_THRESHOLD: 10,
            BASE_CHANCE: 0.35,
            CHANCE_INCREASE_PER_5_SCORE: 0.07,
            CHANCE_CAP: 0.60,
            HEALTH: 3,
            SCALE: '0.35 0.35 0.35',
            SHAPE: 'sphere',
            COLOR: '#8B0000' // Dark Red
        },
        TOUGHEST: {
            SCORE_THRESHOLD: 30,
            BASE_CHANCE: 0.2, // Reduced base chance
            CHANCE_INCREASE_PER_5_SCORE: 0.05, // Kept increase rate
            CHANCE_CAP: 1.0,
            HEALTH: 7,
            SCALE: '0.45 0.45 0.45',
            SHAPE: 'dodecahedron',
            COLOR: '#FFA500' // Neon Orange
        },
        BASIC: {
            HEALTH: 1,
            SCALE: '0.25 0.25 0.25',
            SHAPE: 'box'
            // Color is random HSL
        }
    },
    EFFECTS: {
        SLOW_DURATION_MS: 3000,
        HIT_FLASH_COLOR_ENEMY: '#FF0000', // Red flash
        SLOW_COLOR_INDICATOR: '#87CEEB' // Light blue
    },
    PROJECTILES: { // Defaults for projectile-hitter if not overridden
        SPEED: 10.0,
        LIFETIME: 3000.0,
        COLLISION_RADIUS: 0.2,
        PLAYER_COLOR: '#FFFF00', // Yellow
        PLAYER_RADIUS: 0.1,
        AOE_SLOW_RADIUS: 1.5
    },
    TIMINGS: {
        LEVEL_UP_POPUP_MS: 1500,
        ENEMY_REMOVE_DELAY_MS: 50,
        SPAWN_RETRY_DELAY_MS: 50,
        PROJECTILE_TARGET_QUERY_MS: 100,
        DEBOUNCE_SELECT_MS: 100
    }
};
// ========================================================
// ============ END GAME CONFIGURATION ====================
// ========================================================

// Removed export default GAME_CONFIG; - Scripts are loaded globally