// ========================================================
// =================== GAME LOGIC =======================
// ========================================================

// --- Enemy Management ---
const enemyManager = {
    activeEnemies: 0,
    maxEnemies: GAME_CONFIG.ENEMIES.MAX_ACTIVE,
    spawnInterval: GAME_CONFIG.ENEMIES.SPAWN_INTERVAL_MS,
    spawnTimerId: null,
    baseSpeed: GAME_CONFIG.ENEMIES.BASE_SPEED,
    speedMultiplier: 1.0, // Starts at 1, increased by levels

    // Decrements the active enemy count
    decrementCount: function() {
        this.activeEnemies = Math.max(0, this.activeEnemies - 1);
    },
    // Stops the spawner interval
    stopSpawner: function() {
        if (this.spawnTimerId) {
            clearInterval(this.spawnTimerId);
            this.spawnTimerId = null;
            console.log("Enemy spawner stopped/paused.");
        }
    },
    // Starts the spawner interval
    startSpawner: function() {
        // Access global state directly (Consider passing state manager)
        if (!this.spawnTimerId && isGameSetupComplete && !isGameOver && !isGamePaused) {
            this.spawnTimerId = setInterval(spawnEnemy, this.spawnInterval);
            console.log(`Enemy spawner started/resumed with interval: ${this.spawnInterval}ms`);
        } else {
            console.log("Spawner not started (conditions not met or already running).");
        }
    }
};
// Make it globally accessible (alternative: pass instance where needed)
window.enemyManager = enemyManager;

// --- Spawning Logic ---
function spawnEnemy() {
    // Access global state directly
    if (!isGameSetupComplete || !placedTowerEl?.object3D || !sceneElGlobal || isGamePaused) return;
    if (enemyManager.activeEnemies >= enemyManager.maxEnemies) return;

    const sceneEl = sceneElGlobal;
    const cameraEl = document.getElementById('player-camera'); // Assume ID exists
    if (!cameraEl?.object3D) return;

    const enemyContainer = document.getElementById('enemies') || sceneEl;

    // --- Calculation Vectors (Reused) ---
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const towerPos = new THREE.Vector3();
    const towerToCamDir = new THREE.Vector3();
    const spawnBaseDir = new THREE.Vector3();
    const spawnOffsetDir = new THREE.Vector3();
    const spawnPos = new THREE.Vector3();
    const camToSpawnDir = new THREE.Vector3();
    const activeEnemyPos = new THREE.Vector3();
    const rotationAxis = new THREE.Vector3(0, 1, 0); // Y-axis

    // --- Calculate Spawn Position ---
    cameraEl.object3D.getWorldPosition(camPos);
    cameraEl.object3D.getWorldDirection(camDir);
    placedTowerEl.object3D.getWorldPosition(towerPos);

    // 1. Base Direction (Away from camera relative to tower)
    towerToCamDir.copy(camPos).sub(towerPos);
    if (towerToCamDir.lengthSq() < 0.1) {
        spawnBaseDir.copy(camDir).negate(); // Fallback if camera too close
    } else {
        spawnBaseDir.copy(towerToCamDir).normalize().negate();
    }
    spawnBaseDir.y = 0;
    spawnBaseDir.normalize();

    // 2. Angular Offset
    const angleRange = GAME_CONFIG.ENEMIES.SPAWN_ANGLE_RANGE_RAD;
    const randomAngle = (Math.random() - 0.5) * angleRange;
    spawnOffsetDir.copy(spawnBaseDir).applyAxisAngle(rotationAxis, randomAngle);

    // 3. Distance
    const spawnDistance = GAME_CONFIG.ENEMIES.SPAWN_DISTANCE_MIN +
                          Math.random() * GAME_CONFIG.ENEMIES.SPAWN_DISTANCE_RANGE;

    // 4. Final Position
    spawnPos.copy(towerPos).addScaledVector(spawnOffsetDir, spawnDistance);

    // --- Validation Checks ---
    // A. Behind tower check
    towerToCamDir.copy(camPos).sub(towerPos).normalize(); // Recalculate normalized dir
    const towerToSpawnDir = new THREE.Vector3().copy(spawnPos).sub(towerPos).normalize();
    if (towerToCamDir.dot(towerToSpawnDir) > -0.2) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Not behind tower.");
        setTimeout(spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // B. Min distance from Camera
    if (spawnPos.distanceToSquared(camPos) < GAME_CONFIG.ENEMIES.MIN_DIST_FROM_CAM_SQ) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Too close to camera.");
        setTimeout(spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // C. Min distance from Tower
    if (spawnPos.distanceToSquared(towerPos) < GAME_CONFIG.ENEMIES.MIN_DIST_FROM_TOWER_SQ) {
       if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Too close to tower.");
       setTimeout(spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // D. Check camera view cone
    camToSpawnDir.copy(spawnPos).sub(camPos).normalize();
    if (camDir.dot(camToSpawnDir) > GAME_CONFIG.ENEMIES.VIEW_CONE_DOT_THRESHOLD) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Outside camera view cone.");
        setTimeout(spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // E. Proximity to other enemies
    const minSeparationSq = GAME_CONFIG.ENEMIES.MIN_ENEMY_SEPARATION_SQ;
    const activeEnemies = enemyContainer.querySelectorAll('.enemy[visible="true"]');
    for (let i = 0; i < activeEnemies.length; i++) {
        const enemyEl = activeEnemies[i];
        if (!enemyEl.object3D) continue;
        enemyEl.object3D.getWorldPosition(activeEnemyPos);
        if (spawnPos.distanceToSquared(activeEnemyPos) < minSeparationSq) {
            if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn(`Spawn rejected: Too close to existing enemy ${enemyEl.id}. Retrying.`);
            setTimeout(spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS);
            return;
        }
    }

    // F. Clamp Y position
    spawnPos.y = THREE.MathUtils.clamp(towerPos.y + 0.5 + (Math.random() - 0.5) * 1.5, // Add randomness relative to tower Y
                                       GAME_CONFIG.ENEMIES.Y_POS_CLAMP_MIN,
                                       GAME_CONFIG.ENEMIES.Y_POS_CLAMP_MAX);

    // --- Determine Enemy Type ---
    let enemyType = 'basic';
    let enemyConfig = GAME_CONFIG.ENEMIES.BASIC;
    const randomRoll = Math.random();

    if (score >= GAME_CONFIG.ENEMIES.TOUGHEST.SCORE_THRESHOLD) {
        const T_CONFIG = GAME_CONFIG.ENEMIES.TOUGHEST;
        const scoreAbove = score - T_CONFIG.SCORE_THRESHOLD;
        const chance = Math.min(T_CONFIG.CHANCE_CAP, T_CONFIG.BASE_CHANCE + Math.floor(scoreAbove / 5) * T_CONFIG.CHANCE_INCREASE_PER_5_SCORE);
        if (GAME_CONFIG.DEBUG_LOGS.spawnChance) console.log(`Score ${score}, Toughest Chance: ${(chance * 100).toFixed(0)}%`);
        if (randomRoll < chance) {
            enemyType = 'toughest';
            enemyConfig = T_CONFIG;
            console.log('%c--> Spawning TOUGHEST Enemy!', 'color: #FFA500; font-weight: bold;');
        }
    }
    // Use a separate random roll for tough check if toughest check failed
    if (enemyType === 'basic' && score >= GAME_CONFIG.ENEMIES.TOUGH.SCORE_THRESHOLD) {
        const T_CONFIG = GAME_CONFIG.ENEMIES.TOUGH;
        const scoreAbove = score - T_CONFIG.SCORE_THRESHOLD;
        const chance = Math.min(T_CONFIG.CHANCE_CAP, T_CONFIG.BASE_CHANCE + Math.floor(scoreAbove / 5) * T_CONFIG.CHANCE_INCREASE_PER_5_SCORE);
        if (GAME_CONFIG.DEBUG_LOGS.spawnChance) console.log(`Score ${score}, Tough Chance: ${(chance * 100).toFixed(1)}%`);
        if (Math.random() < chance) { // Separate random roll
            enemyType = 'tough';
            enemyConfig = T_CONFIG;
            console.log('%c--> Spawning TOUGH Enemy!', 'color: #DC143C; font-weight: bold;');
        }
    }

    // --- Create Enemy Element ---
    console.log(`Spawn validation passed. Creating ${enemyType} enemy.`);
    const enemy = document.createElement('a-entity');
    const enemyId = `enemy-${enemyType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    enemy.setAttribute('id', enemyId);
    enemy.classList.add('enemy');
    enemy.setAttribute('position', spawnPos);
    enemy.setAttribute('visible', 'true');

    // Apply model/material based on type
    let modelId = '#basic-enemy-model'; // Default
    let textureId = '#basic-enemy-texture';
    let scale = enemyConfig.SCALE || '0.3 0.3 0.3'; // Use config scale or fallback

    if (enemyType === 'tough') {
        modelId = '#tough-enemy-model';
        textureId = '#tough-enemy-texture';
    } else if (enemyType === 'toughest') {
        modelId = '#toughest-enemy-model';
        textureId = '#toughest-enemy-texture';
    }
    enemy.setAttribute('gltf-model', modelId);
    enemy.setAttribute('material', { shader: 'flat', src: textureId });
    enemy.setAttribute('scale', scale);

    // Add Health Indicator if needed
    if (enemyConfig.HEALTH > 1) {
        const healthText = document.createElement('a-text');
        healthText.classList.add('enemy-health-text');
        healthText.setAttribute('value', `HP: ${enemyConfig.HEALTH}`);
        healthText.setAttribute('position', '0 0.5 0'); // Adjust Y based on model height
        healthText.setAttribute('scale', '2 2 2');
        healthText.setAttribute('align', 'center');
        healthText.setAttribute('color', '#FFFFFF');
        healthText.setAttribute('side', 'double');
        healthText.setAttribute('billboard', ''); // Make it face the camera
        enemy.appendChild(healthText);
    }

    // Attach Components
    enemy.setAttribute('hit-receiver', {
        maxHealth: enemyConfig.HEALTH,
        initialHealth: enemyConfig.HEALTH
    });
    enemy.setAttribute('move-towards-target', {
        target: '#placed-base-tower', // Use selector, component resolves it
        speed: enemyManager.baseSpeed * enemyManager.speedMultiplier,
        reachDistance: GAME_CONFIG.ENEMIES.TARGET_REACH_DISTANCE
    });

    // Add to Scene
    enemyContainer.appendChild(enemy);
    enemyManager.activeEnemies++;
    console.log(`%cSpawn Successful: ${enemyType} ${enemyId} (HP:${enemyConfig.HEALTH}). Active Count:${enemyManager.activeEnemies}`, "color: cyan;");
}
// Make spawnEnemy globally accessible if called by setInterval without context
window.spawnEnemy = spawnEnemy;

// --- Leveling and Score ---

// Increments score and checks for level up
function incrementScore() {
    // Access global state
    if (isGameOver) return;
    score++;
    console.log("Score increased to:", score);
    // Calls UI updates (assumes these functions are globally available)
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    updateLevelingState(); // Check for level up
    if (typeof updateXPBar === 'function') updateXPBar();
}
window.incrementScore = incrementScore; // Make global if needed by components

// Updates the player level based on score thresholds
function updateLevelingState() {
    // Access global state
    if (currentLevel >= GAME_CONFIG.LEVELING.MAX_LEVEL || isGameOver) return;

    if (score >= scoreForNextLevel) {
        const oldLevel = currentLevel;
        currentLevel++;
        console.log(`%cLEVEL UP! Reached Level ${currentLevel} at Score ${score}`, "color: lime; font-weight: bold;");

        // Update UI (assumes functions are global)
        if (typeof updateXPBar === 'function') updateXPBar();
        if (typeof showLevelUpPopup === 'function') showLevelUpPopup(currentLevel);

        // Increase enemy speed
        increaseEnemySpeed();

        // Calculate next score threshold
        if (currentLevel < GAME_CONFIG.LEVELING.MAX_LEVEL) {
            if (oldLevel < 4) { // Use initial gap for levels 1-4
                scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;
            } else { // Apply multiplier after level 4
                 let increase = Math.round(scoreGap * (GAME_CONFIG.LEVELING.GAP_MULTIPLIER - 1));
                 increase = Math.max(increase, GAME_CONFIG.LEVELING.GAP_MIN_INCREASE);
                 scoreGap += increase;
            }
            scoreForNextLevel += scoreGap;
            console.log(`Next level (${currentLevel + 1}) requires score: ${scoreForNextLevel} (Gap: ${scoreGap})`);
        } else {
            console.log("Max Level Reached!");
            scoreForNextLevel = Infinity;
        }

        // Show upgrade popup (assumes function is global)
        if (typeof showUpgradePopup === 'function') showUpgradePopup(true, true); // Show and pause
    }
}

// Increases speed for all active enemies and updates the manager's multiplier
function increaseEnemySpeed() {
    const SPEED_CAP_LEVEL = GAME_CONFIG.ENEMIES.SPEED_CAP_LEVEL;
    let cappedSpeed;

    // Access global state
    if (currentLevel >= SPEED_CAP_LEVEL) {
        console.log(`Enemy speed increase capped at Level ${SPEED_CAP_LEVEL}.`);
        // Calculate the capped speed based on the multiplier when cap was reached
        cappedSpeed = enemyManager.baseSpeed * enemyManager.speedMultiplier;
    } else {
        // Increase the multiplier
        enemyManager.speedMultiplier *= GAME_CONFIG.ENEMIES.SPEED_INCREASE_FACTOR;
        console.log(`New enemy speed multiplier: ${enemyManager.speedMultiplier.toFixed(2)} (Level ${currentLevel})`);
        cappedSpeed = enemyManager.baseSpeed * enemyManager.speedMultiplier;
    }

    // Update existing enemies with the new (potentially capped) speed
    const activeEnemies = document.querySelectorAll('.enemy[move-towards-target]'); // Target enemies with the component
    console.log(`Applying speed ${cappedSpeed.toFixed(2)} to ${activeEnemies.length} active enemies.`);
    activeEnemies.forEach(enemyEl => {
        // Directly set attribute which triggers component update
        enemyEl.setAttribute('move-towards-target', 'speed', cappedSpeed);
    });
}

// --- Tower Logic ---

// Handles the tower taking a hit
function towerHit() {
    // Access global state
    if (isGameOver) return;
    currentTowerHealth--;
    console.log(`%cTower Hit! Health: ${currentTowerHealth}/${currentMaxTowerHealth}`, "color: orange; font-weight: bold;");

    // Update UI (assumes function is global)
    if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();

    if (currentTowerHealth <= 0) {
        gameOver(); // Trigger game over
    }
}
window.towerHit = towerHit; // Make global if needed by components

// --- Game State Transitions ---

// Pauses the game
function pauseGame() {
    // Access global state
    if (isGameOver || isGamePaused) return;
    console.log("Pausing game.");
    isGamePaused = true;
    gameState = 'paused';
    enemyManager.stopSpawner();
    // UI changes (like showing pause menu) are handled by the caller (e.g., button listener)
}
window.pauseGame = pauseGame;

// Resumes the game from pause or upgrade placement
function resumeGame(forceClosePopup = true) {
    // Access global state
    if (isGameOver || !isGamePaused) return;
    console.log("Resuming game...");
    isGamePaused = false;
    gameState = 'playing';

    // Hide popups (Could be UI Manager's job)
    if (forceClosePopup) {
        const upgradesPopup = document.getElementById('upgrades-popup');
        if (upgradesPopup) upgradesPopup.style.display = 'none';
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.style.display = 'none';
    }
    const confirmArea = document.getElementById('confirm-placement-area');
    if (confirmArea) confirmArea.style.display = 'none';
    const feedbackEl = document.getElementById('scanning-feedback');
    if (feedbackEl) feedbackEl.style.display = 'none';
    const reticleEl = document.getElementById('placement-reticle');
    if (reticleEl) reticleEl.setAttribute('visible', false);

    // Show controls
    const controlsWidget = document.getElementById('controls-widget');
    if (controlsWidget) controlsWidget.style.display = 'block';

    // Restart spawner
    enemyManager.startSpawner();
}
window.resumeGame = resumeGame;

// Handles the game over sequence
function gameOver() {
    // Access global state
    if (isGameOver) return;
    console.log("%cGAME OVER!", "color: red; font-size: 1.5em; font-weight: bold;");
    isGameOver = true;
    gameState = 'game_over';
    enemyManager.stopSpawner();

    // Stop enemies from moving
    document.querySelectorAll('.enemy[move-towards-target]').forEach(enemy => {
        enemy.removeAttribute('move-towards-target');
    });

    // Hide game controls, health bar (via UI update)
    const controlsWidget = document.getElementById('controls-widget');
    if (controlsWidget) controlsWidget.style.display = 'none';
    if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI(); // This will hide it

    // Update and Save High Score
    if (score > highScore) {
        console.log(`New High Score: ${score} (Old: ${highScore})`);
        highScore = score;
        try {
            localStorage.setItem('arTowerDefenseHighScore', highScore.toString());
        } catch (e) {
            console.error("Failed to save high score to localStorage:", e);
        }
        // Update menu display immediately (though menu is hidden)
        const menuHighScoreDisplay = document.getElementById('menuHighScore');
        if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore;
    }

    // Show Game Over Screen (UI Manager's job?)
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScore = document.getElementById('final-score');
    if (gameOverScreen && finalScore) {
        finalScore.textContent = `Tavo taškai: ${score}`;
        gameOverScreen.style.display = 'block';
    }
}
window.gameOver = gameOver;

// Resets the game state and elements for a new game
function resetGame() {
    console.log("Resetting game...");

    // --- Reset State Variables (Accesses global state) ---
    isGameOver = false;
    isGameSetupComplete = false;
    towerPlaced = false;
    score = 0;
    currentLevel = 1;
    // Reset config-derived values
    scoreForNextLevel = GAME_CONFIG.LEVELING.INITIAL_SCORE_THRESHOLD;
    scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;
    currentMaxTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
    currentTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
    enemyManager.activeEnemies = 0;
    enemyManager.speedMultiplier = 1.0;
    enemyManager.baseSpeed = GAME_CONFIG.ENEMIES.BASE_SPEED;
    enemyManager.spawnInterval = GAME_CONFIG.ENEMIES.SPAWN_INTERVAL_MS;
    isGamePaused = false;
    placingUpgrade = null;
    placedUpgradeEl = null;
    // Reset upgrade levels/flags
    upgradeShooter1Placed = false;
    upgradeShooter2Placed = false;
    upgradeSlowTurretPlaced = false;
    upgradeSlowTurret2Placed = false;
    shooterLevel = 0;
    playerDamageLevel = 0;
    slowTurretLevel = 0;
    nextShooterUpgradeLevel = GAME_CONFIG.UPGRADES.SHOOTER.INITIAL_LEVEL_CHECK;
    nextSlowTurretUpgradeLevel = GAME_CONFIG.UPGRADES.UNLOCKS.SLOW_TURRET + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;

    // --- Clear Timers and Remove Entities ---
    enemyManager.stopSpawner();
    if (placedTowerEl?.parentNode) placedTowerEl.parentNode.removeChild(placedTowerEl);
    placedTowerEl = null;
    activeShooterUpgrades.forEach(shooter => { if (shooter.parentNode) shooter.parentNode.removeChild(shooter); });
    activeShooterUpgrades = [];
    activeSlowTurrets.forEach(turret => { if (turret.parentNode) turret.parentNode.removeChild(turret); });
    activeSlowTurrets = [];
    const entitiesToRemove = document.querySelectorAll('.enemy, [projectile-hitter], [auto-shooter]'); // Include auto-shooters
    entitiesToRemove.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
    console.log(`Removed ${entitiesToRemove.length} game entities.`);

    // --- Reset UI (Call UI functions if available) ---
    const gameOverScreen = document.getElementById('game-over-screen'); // Get ref here
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
    if (typeof updateLevelDisplay === 'function') updateLevelDisplay();
    if (typeof updateXPBar === 'function') updateXPBar();

    // Reset UI for AR mode specifically (start placement)
    sceneElGlobal = sceneElGlobal || document.querySelector('a-scene');
    if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
        console.log('Resetting UI to Place Tower state (AR Mode).');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
        const reticleEl = document.getElementById('placement-reticle');
        const confirmArea = document.getElementById('confirm-placement-area');

        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
        if (controlsWidget) controlsWidget.style.display = 'none';
        if (confirmArea) confirmArea.style.display = 'none';
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'block';
        if (startGameButton) startGameButton.disabled = true;
        if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none';
        // Assume surface is found shortly after reset/enter AR
        if (reticleEl) reticleEl.setAttribute('visible', 'true');
    } else {
        // Reset for non-AR (show controls)
        const controlsWidget = document.getElementById('controls-widget');
        if(controlsWidget) controlsWidget.style.display = 'block';
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
    }
}
window.resetGame = resetGame;

// --- Upgrade Logic ---

// Updates the state of the upgrade buttons in the popup
function updateUpgradePopupButtonStates() {
    // Query buttons (Ideally cached in UI manager)
    const upgradeShooterBtn = document.getElementById('upgradeShooter');
    const upgradeHealthBtn = document.getElementById('upgradeHealth');
    const upgradeSlowerBtn = document.getElementById('upgradeSlower');
    const upgradePlayerDamageBtn = document.getElementById('upgradePlayerDamage');

    const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS;
    let title, desc, available, nextLvl;

    // --- SHOOTER Button Logic ---
    title = "SHOOTER";
    available = false;
    nextLvl = -1;
    if (!upgradeShooter1Placed) {
        available = true;
        desc = "Padėti pirmą bokštą";
    } else if (!upgradeShooter2Placed) {
        if (currentLevel >= UNLOCKS.SECOND_SHOOTER) {
            available = true;
            desc = "Padėti antrą bokstą";
        } else {
            desc = "Padėti antrą bokstą";
            nextLvl = UNLOCKS.SECOND_SHOOTER;
        }
    } else { // Both placed, check for upgrades
        if (currentLevel >= nextShooterUpgradeLevel) {
             available = true;
             const SHOOTER_CONFIG = GAME_CONFIG.UPGRADES.SHOOTER;
             const TURRET_CONFIG = GAME_CONFIG.TURRETS.SHOOTER;
             const nextInternalLevel = shooterLevel + 1;

             if (nextInternalLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1) {
                const baseDmg = TURRET_CONFIG.BASE_DAMAGE;
                const nextDmg = Math.round(baseDmg * SHOOTER_CONFIG.DAMAGE_1_MULTIPLIER);
                desc = `Damage I: ${baseDmg} -> ${nextDmg}`;
            } else if (nextInternalLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_2) {
                let currentDmg = Math.round(TURRET_CONFIG.BASE_DAMAGE * SHOOTER_CONFIG.DAMAGE_1_MULTIPLIER);
                if(activeShooterUpgrades.length > 0 && activeShooterUpgrades[0]) {
                     currentDmg = activeShooterUpgrades[0].getAttribute('auto-shooter')?.turretDamage || currentDmg;
                }
                const nextDmg = Math.round(currentDmg * SHOOTER_CONFIG.DAMAGE_2_FACTOR);
                desc = `Damage II: ${currentDmg} -> ${nextDmg}`;
             } else { // Speed upgrade
                let currentDelay = TURRET_CONFIG.INITIAL_DELAY;
                if(activeShooterUpgrades.length > 0 && activeShooterUpgrades[0]) {
                     currentDelay = activeShooterUpgrades[0].getAttribute('auto-shooter')?.shootDelay || currentDelay;
                 }
                const nextDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentDelay * SHOOTER_CONFIG.SPEED_INCREASE_FACTOR);
                desc = `Speed Up (Delay ${currentDelay.toFixed(0)} -> ${nextDelay.toFixed(0)}ms)`;
           }
        } else {
            desc = "(Atnaujinti šaudyklę)";
            nextLvl = nextShooterUpgradeLevel;
        }
    }
    // Update UI (assumes setUpgradeButtonState is global)
    if (typeof setUpgradeButtonState === 'function') setUpgradeButtonState(upgradeShooterBtn, title, desc, available, nextLvl);

    // --- HEALTH Button Logic ---
    title = "HEALTH";
    available = true; // Always available
    desc = `Max HP: ${currentMaxTowerHealth} -> ${currentMaxTowerHealth + GAME_CONFIG.UPGRADES.HEALTH.HP_INCREASE}`;
    if (typeof setUpgradeButtonState === 'function') setUpgradeButtonState(upgradeHealthBtn, title, desc, available);

    // --- SLOWER Button Logic ---
    title = "SLOWER";
    available = false;
    nextLvl = -1;
    if (!upgradeSlowTurretPlaced) { // Place 1
        if (currentLevel >= UNLOCKS.SLOW_TURRET) {
            available = true;
            desc = "Padėti Lėtintoją (1/2)";
        } else {
            desc = "Padėti Lėtintoją (1/2)";
            nextLvl = UNLOCKS.SLOW_TURRET;
        }
    } else if (!upgradeSlowTurret2Placed) { // Place 2
        if (currentLevel >= UNLOCKS.SECOND_SLOW_TURRET) {
            available = true;
            desc = "Padėti antrą Lėtintoją (2/2)";
        } else {
            desc = "Padėti antrą Lėtintoją (2/2)";
            nextLvl = UNLOCKS.SECOND_SLOW_TURRET;
        }
    } else { // Both placed, check for upgrades
        if (currentLevel >= nextSlowTurretUpgradeLevel) {
            available = true;
            const SLOWER_CONF = GAME_CONFIG.UPGRADES.SLOWER;
            const TURRET_CONF = GAME_CONFIG.TURRETS.SLOWER;
            let currentSlow = TURRET_CONF.INITIAL_SLOW_PERCENTAGE;
            if (activeSlowTurrets.length > 0 && activeSlowTurrets[0]) {
                 currentSlow = activeSlowTurrets[0].getAttribute('auto-shooter')?.slowPercentage || currentSlow;
            }
            let nextSlowPerc = Math.min(SLOWER_CONF.SLOW_MAX_PERCENTAGE, currentSlow + SLOWER_CONF.SLOW_INCREASE_AMOUNT) * 100;
            desc = `Atnaujinti Lėtintoją (${(currentSlow * 100).toFixed(0)}% -> ${nextSlowPerc.toFixed(0)}%)`;
        } else {
            desc = "Atnaujinti Lėtintoją";
            nextLvl = nextSlowTurretUpgradeLevel;
        }
    }
    if (typeof setUpgradeButtonState === 'function') setUpgradeButtonState(upgradeSlowerBtn, title, desc, available, nextLvl);

    // --- PLAYER DAMAGE Button Logic ---
    title = "DAMAGE";
    available = true; // Always available
    const currentMult = (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** playerDamageLevel);
    const nextMult = (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** (playerDamageLevel + 1));
    desc = `Player Dmg: ${currentMult.toFixed(2)}x -> ${nextMult.toFixed(2)}x`;
    if (typeof setUpgradeButtonState === 'function') setUpgradeButtonState(upgradePlayerDamageBtn, title, desc, available);
}
// Make global if called from UI script?
window.updateUpgradePopupButtonStates = updateUpgradePopupButtonStates;

// --- Player Actions ---

// Handles the shoot button click (now globally accessible)
function handleShootClick() {
    const shootButton = document.getElementById('shootButton');
    sceneElGlobal = sceneElGlobal || document.querySelector('a-scene');
    const cameraEl = document.getElementById('player-camera');
    const cameraMarkerEl = document.getElementById('camera-aim-marker');

    console.log("Shoot button clicked (via handleShootClick).");

    // Access global state
    if (!isGameSetupComplete || isGameOver || isGamePaused) return;
    if (!sceneElGlobal.is('ar-mode')) { console.log("Shoot ignored: Not in AR mode."); return; }
    if (!cameraEl?.object3D || !cameraMarkerEl?.object3D) {
        console.error("Cannot shoot: Camera or Aim Marker not ready!"); return;
    }

    // Animation (Trigger CSS class)
    if (shootButton) {
        shootButton.classList.add('shoot-active');
        setTimeout(() => { shootButton.classList.remove('shoot-active'); }, 150);
    }

    // Shooting Logic (Vectors and Projectile Creation)
    const shootCameraWorldPos = new THREE.Vector3();
    const shootCameraWorldDir = new THREE.Vector3();
    const targetMarkerWorldPos = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();
    const projectileStartPos = new THREE.Vector3();

    cameraEl.object3D.getWorldPosition(shootCameraWorldPos);
    cameraMarkerEl.object3D.getWorldPosition(targetMarkerWorldPos);
    cameraEl.object3D.getWorldDirection(shootCameraWorldDir);
    shootDirection.copy(targetMarkerWorldPos).sub(shootCameraWorldPos).normalize();

    const basePlayerDamage = GAME_CONFIG.PLAYER.SHOOT_DAMAGE_BASE;
    const currentPlayerDamage = Math.round(basePlayerDamage * (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** playerDamageLevel));

    const projectile = document.createElement('a-sphere');
    projectile.setAttribute('radius', GAME_CONFIG.PROJECTILES.PLAYER_RADIUS);
    projectile.setAttribute('color', GAME_CONFIG.PROJECTILES.PLAYER_COLOR);
    projectile.setAttribute('material', 'shader: flat;');

    const startOffset = 0.2;
    projectileStartPos.copy(shootCameraWorldPos).addScaledVector(shootCameraWorldDir, startOffset);
    projectile.setAttribute('position', projectileStartPos);

    projectile.setAttribute('projectile-hitter', {
        direction: shootDirection.clone(),
        speed: GAME_CONFIG.PROJECTILES.SPEED,
        lifetime: GAME_CONFIG.PROJECTILES.LIFETIME,
        targetSelector: '.enemy',
        damage: currentPlayerDamage,
        isSlowing: false,
        slowAmount: 0,
        aoeRadius: 0
    });

    sceneElGlobal.appendChild(projectile);
    console.log("Player projectile added to scene.");
}
window.handleShootClick = handleShootClick; // Make available globally for onclick

// --- Upgrade Placement Confirmation ---
function confirmUpgradePlacement() {
    console.log("Confirm Placement button clicked logic executing for:", placingUpgrade);
    const currentConfirmArea = document.getElementById('confirm-placement-area');
    const feedbackEl = document.getElementById('scanning-feedback');

    // Access global state
    if (placedUpgradeEl && placingUpgrade) {
        console.log(`Finalizing placement for ${placingUpgrade}...`);

        // Apply component based on type
        if (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') {
            placedUpgradeEl.setAttribute('auto-shooter', {
                type: 'damage',
                shootDelay: GAME_CONFIG.TURRETS.SHOOTER.INITIAL_DELAY,
                turretDamage: GAME_CONFIG.TURRETS.SHOOTER.BASE_DAMAGE
            });
            activeShooterUpgrades.push(placedUpgradeEl);
            if (placingUpgrade === 'shooter1') { upgradeShooter1Placed = true; console.log("Shooter 1 marked as placed."); }
            else { upgradeShooter2Placed = true; console.log("Shooter 2 marked as placed.");}
        } else if (placingUpgrade === 'slowTurret1' || placingUpgrade === 'slowTurret2') {
            placedUpgradeEl.setAttribute('auto-shooter', {
                type: 'slow',
                shootDelay: GAME_CONFIG.TURRETS.SLOWER.INITIAL_DELAY,
                slowPercentage: GAME_CONFIG.TURRETS.SLOWER.INITIAL_SLOW_PERCENTAGE,
                turretDamage: 0
            });
            activeSlowTurrets.push(placedUpgradeEl);

            if (placingUpgrade === 'slowTurret1') {
                upgradeSlowTurretPlaced = true;
                console.log("Slow Turret 1 marked as placed.");
                // Set the level for the *first* stat upgrade after placing the first turret
                nextSlowTurretUpgradeLevel = currentLevel + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;
                 console.log(`Next Slow Turret upgrade available at Lv ${nextSlowTurretUpgradeLevel}`);
            } else { // placingUpgrade === 'slowTurret2'
                 upgradeSlowTurret2Placed = true;
                 console.log("Slow Turret 2 marked as placed.");
            }
        }

        // Reset placement state and UI
        placingUpgrade = null;
        placedUpgradeEl = null;
        if (currentConfirmArea) currentConfirmArea.style.display = 'none';
        if (feedbackEl) feedbackEl.style.display = 'none';
        const reticleEl = document.getElementById('placement-reticle');
        if (reticleEl) reticleEl.setAttribute('visible', false);
        resumeGame(false); // Resume game without closing popups necessarily

    } else {
        console.warn("Confirm button clicked inappropriately (no upgrade visual or type).");
    }
}

// ========================================================
// ================= END GAME LOGIC =====================
// ========================================================