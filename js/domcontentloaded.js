// ========================================================
// ============ DOMContentLoaded SETUP & LISTENERS =========
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI listeners and initial state...");

    // --- Get Element References ---
    // Query crucial elements needed for setup and core listeners
    sceneElGlobal = document.querySelector('a-scene'); // Cache global scene ref
    const overlay = document.getElementById('dom-overlay');
    const mainMenu = document.getElementById('main-menu');
    const mainMenuStartButton = document.getElementById('mainMenuStartButton');
    const menuHighScoreDisplay = document.getElementById('menuHighScore');
    const exitVRButton = document.getElementById('exitVRButton'); // Pause button
    const shootButton = document.getElementById('shootButton');
    const controlsWidget = document.getElementById('controls-widget');
    const pauseMenu = document.getElementById('pause-menu');
    const pauseResumeButton = document.getElementById('pauseResumeButton');
    const pauseMainMenuButton = document.getElementById('pauseMainMenuButton');
    const placeTowerPopupEl = document.getElementById('place-tower-popup');
    const startGameButton = document.getElementById('startGameButton');
    const tryAgainButton = document.getElementById('tryAgainButton');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverMenuButton = document.getElementById('gameOverMenuButton');
    const upgradesPopup = document.getElementById('upgrades-popup');
    const confirmPlacementArea = document.getElementById('confirm-placement-area');
    const confirmPlacementButton = document.getElementById('confirmPlacementButton');
    const upgradeShooterBtn = document.getElementById('upgradeShooter');
    const upgradeHealthBtn = document.getElementById('upgradeHealth');
    const upgradeSlowerBtn = document.getElementById('upgradeSlower');
    const upgradePlayerDamageBtn = document.getElementById('upgradePlayerDamage');
    const closeUpgradePopupBtn = document.getElementById('closeUpgradePopupButton');
    const manualUpgradesButton = document.getElementById('manualUpgradesButton');
    // Add other less critical elements or query them inside specific functions if preferred

    // --- Basic Element Checks ---
    const essentialElements = {
        sceneElGlobal, overlay, mainMenu, mainMenuStartButton, menuHighScoreDisplay,
        exitVRButton, shootButton, controlsWidget, pauseMenu, pauseResumeButton,
        pauseMainMenuButton, placeTowerPopupEl, startGameButton, tryAgainButton,
        gameOverScreen, gameOverMenuButton, upgradesPopup, confirmPlacementArea,
        confirmPlacementButton, upgradeShooterBtn, upgradeHealthBtn, upgradeSlowerBtn,
        upgradePlayerDamageBtn, closeUpgradePopupBtn, manualUpgradesButton
    };
    const missingElements = Object.entries(essentialElements)
                              .filter(([_, el]) => !el)
                              .map(([name, _]) => name);
    if (missingElements.length > 0) {
        console.error(`Essential page element(s) missing! Check IDs in index.html: ${missingElements.join(', ')}`);
        // Optionally, disable functionality or show an error message to the user
        // return; // Might stop script execution if critical elements are missing
    }

    // --- Initial State Setup ---
    // Load High Score
    try {
        highScore = parseInt(localStorage.getItem('arTowerDefenseHighScore') || '0');
        if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore;
    } catch (e) {
        console.error("Failed to load high score from localStorage:", e);
        highScore = 0; // Default to 0 on error
    }

    // Set initial UI visibility based on gameState (should be 'menu')
    if (gameState === 'menu') {
        if (sceneElGlobal) sceneElGlobal.style.display = 'none';
        if (mainMenu) mainMenu.style.display = 'flex';
        if (controlsWidget) controlsWidget.classList.add('hidden');
    }

    // --- Core Event Listeners ---

    // Scene Listeners (AR lifecycle, hit-testing)
    if (sceneElGlobal) {
        sceneElGlobal.addEventListener('enter-vr', () => {
            console.log('Event: enter-vr');
            isGameSetupComplete = false;
            towerPlaced = false;
            placedTowerEl = null;
            gameState = 'ar_setup';

            // UI updates for entering AR
            const myEnterARButton = document.getElementById('myEnterARButton');
            const scanningFeedbackEl = document.getElementById('scanning-feedback');
            const fpsCounterEl = document.getElementById('fps-counter');
            if (myEnterARButton) myEnterARButton.style.display = 'none';
            if (exitVRButton) exitVRButton.style.display = 'inline-block'; // Show pause btn
            if (controlsWidget) controlsWidget.style.display = 'none';
            if (scanningFeedbackEl) {
                scanningFeedbackEl.textContent = "Skanuojamas paviršius...";
                scanningFeedbackEl.style.display = 'block';
            }
            if (fpsCounterEl) fpsCounterEl.classList.remove('hidden');
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            if (shootButton) shootButton.disabled = true;
            if (startGameButton) startGameButton.disabled = true;
            const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
            if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none';
            const reticleEl = document.getElementById('placement-reticle');
            if (reticleEl) reticleEl.setAttribute('visible', false);
        });

        sceneElGlobal.addEventListener('exit-vr', () => {
            console.log('Event: exit-vr');
            gameState = 'menu';
            resetGame(); // Handles state reset, entity removal, UI reset

            // Ensure scene and overlay are hidden, menu is shown
            if (sceneElGlobal) sceneElGlobal.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
            if (mainMenu) mainMenu.style.display = 'flex';
            if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore; // Update score display

            // Explicitly hide FPS counter and exit button, show Enter AR button
            const fpsCounterEl = document.getElementById('fps-counter');
            const myEnterARButton = document.getElementById('myEnterARButton');
            if (fpsCounterEl) fpsCounterEl.classList.add('hidden');
            if (exitVRButton) exitVRButton.style.display = 'none';
            if (myEnterARButton) myEnterARButton.style.display = 'inline-block';
        });

        sceneElGlobal.addEventListener('ar-hit-test-start', () => {
            // Show scanning feedback, hide reticle/placement UI during initial scan
            if (!isGameSetupComplete) {
                console.log('Event: ar-hit-test-start (Searching...)');
                const reticleEl = document.getElementById('placement-reticle');
                const scanningFeedbackEl = document.getElementById('scanning-feedback');
                if (reticleEl) reticleEl.setAttribute('visible', 'false');
                if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
                if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            }
        });

        sceneElGlobal.addEventListener('ar-hit-test-achieved', () => {
            // Surface found: Hide scanning, show reticle and placement UI
            if (!isGameSetupComplete) {
                console.log('Event: ar-hit-test-achieved (Surface Found!)');
                const reticleEl = document.getElementById('placement-reticle');
                const scanningFeedbackEl = document.getElementById('scanning-feedback');
                if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
                if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'block';
                if (reticleEl && !towerPlaced) {
                    reticleEl.setAttribute('visible', 'true');
                } else if (reticleEl) {
                    reticleEl.setAttribute('visible', 'false');
                }
            } else if (placingUpgrade) {
                 // Show reticle if placing an upgrade
                 const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', 'true');
            }
        });

        sceneElGlobal.addEventListener('ar-hit-test-lost', () => {
            // Surface lost: Hide reticle/placement UI, show scanning feedback
            if (!isGameSetupComplete) {
                console.log('Event: ar-hit-test-lost (Surface Lost)');
                const reticleEl = document.getElementById('placement-reticle');
                const scanningFeedbackEl = document.getElementById('scanning-feedback');
                if (reticleEl) reticleEl.setAttribute('visible', 'false');
                if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
                if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            } else {
                 // Hide reticle if lost during upgrade placement
                 const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', 'false');
            }
        });

        sceneElGlobal.addEventListener('ar-hit-test-select', (e) => {
            // Debounce
            const now = performance.now();
            if (now - lastSelectTime < GAME_CONFIG.TIMINGS.DEBOUNCE_SELECT_MS) return;
            lastSelectTime = now;

            // Prevent placement if tap is on UI
            const targetElement = e.detail?.sourceEvent?.target;
            const isUITap = targetElement?.closest && targetElement.closest('#dom-overlay button, #dom-overlay fieldset, #dom-overlay section');
            if (isUITap && targetElement.tagName !== 'CANVAS' /* Allow taps on canvas */) {
                console.log("AR Select ignored: Tap on overlay UI element.");
                return;
            }
            console.log("Event: ar-hit-test-select processed.");

            const reticleEl = document.getElementById('placement-reticle');
            const feedbackEl = document.getElementById('scanning-feedback');

            // --- Upgrade Placement ---
            if (placingUpgrade && reticleEl?.getAttribute('visible')) {
                const position = reticleEl.getAttribute('position');
                if (!position || isNaN(position.x)) {
                    console.error("Upgrade Placement failed: Invalid position."); return;
                }

                if (!placedUpgradeEl) { // First tap: Create visual
                    const upgradeEntity = document.createElement('a-entity');
                    upgradeEntity.setAttribute('id', `${placingUpgrade}-visual-${Date.now()}`);
                    let modelId = '', textureId = '', scale = '0.05 0.05 0.05';
                    if (placingUpgrade.startsWith('shooter')) {
                        modelId = '#shooter-upgrade-model'; textureId = '#shooter-upgrade-texture';
                    } else if (placingUpgrade.startsWith('slowTurret')) {
                        modelId = '#slower-upgrade-model'; textureId = '#slower-upgrade-texture';
                    } else { return; } // Unknown type

                    upgradeEntity.setAttribute('gltf-model', modelId);
                    upgradeEntity.setAttribute('material', { shader: 'flat', src: textureId });
                    upgradeEntity.setAttribute('scale', scale);
                    upgradeEntity.setAttribute('position', position);
                    sceneElGlobal.appendChild(upgradeEntity);
                    placedUpgradeEl = upgradeEntity;

                    // Update UI for confirmation
                    if (confirmPlacementButton) confirmPlacementButton.disabled = false;
                    if (feedbackEl) { feedbackEl.textContent = "Paspausk pakeist poziciją arba pradėk"; feedbackEl.style.display = 'block';}

                } else { // Subsequent taps: Move visual
                     placedUpgradeEl.setAttribute('position', position);
                }
            // --- Tower Placement / Move ---
            } else if (!isGameSetupComplete && reticleEl?.getAttribute('visible')) {
                const position = reticleEl.getAttribute('position');
                if (!position || isNaN(position.x)) {
                     console.error("Tower Placement/Move failed: Invalid position."); return;
                }

                if (!towerPlaced) { // First tap: Create Tower
                    console.log('Placing TOWER...');
                    const tower = document.createElement('a-entity'); // Use entity for consistency
                    tower.setAttribute('id', 'placed-base-tower');
                    tower.setAttribute('gltf-model', '#tower-model');
                    tower.setAttribute('material', { shader: 'flat', src: '#tower-texture' });
                    tower.setAttribute('scale', '0.05 0.05 0.05');
                    tower.setAttribute('position', position);
                    sceneElGlobal.appendChild(tower);
                    placedTowerEl = tower;
                    towerPlaced = true;

                    // Update UI: Enable Start button, show feedback
                    if (startGameButton) startGameButton.disabled = false;
                    const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
                    if (towerPlacedFeedback) {
                        towerPlacedFeedback.textContent = "Bokštas padėtas! Paspausk kitur pakeiti jo pozicija arba pradėk žaist.";
                        towerPlacedFeedback.style.display = 'block';
                    }
                    if(reticleEl) reticleEl.setAttribute('visible', 'true'); // Keep reticle for move

                } else if (placedTowerEl) { // Subsequent taps: Move Tower
                     placedTowerEl.setAttribute('position', position);
                }
            } else {
                console.log("AR Select ignored: Conditions not met.");
            }
        });
    }

    // Prevent AR select events when interacting with overlay buttons
    if (overlay) {
        overlay.addEventListener('beforexrselect', (e) => {
            const targetElement = e.target;
            // Allow default only if the target is a button within a known UI popup/widget area
            const allowDefault = targetElement?.tagName === 'BUTTON' &&
                                 targetElement.closest &&
                                 targetElement.closest('#place-tower-popup, #upgrades-popup, #confirm-placement-area, #game-over-screen, #controls-widget, #pause-menu');
            if (!allowDefault) {
                e.preventDefault();
            }
        });
    }

    // --- UI Button Listeners ---

    // Main Menu Buttons
    if (mainMenuStartButton) {
        mainMenuStartButton.addEventListener('click', () => {
            console.log("Main Menu Start Button Clicked!");
            if (mainMenu) mainMenu.style.display = 'none';
            if (sceneElGlobal) {
                sceneElGlobal.style.display = 'block';
                console.log("Attempting to enter AR...");
                sceneElGlobal.enterAR().catch(e => {
                    console.error("AR Entry Failed:", e);
                    alert("AR nepalaikoma arba buvo atmesta."); // User message
                    if (mainMenu) mainMenu.style.display = 'flex'; // Show menu again
                    if (sceneElGlobal) sceneElGlobal.style.display = 'none';
                });
                gameState = 'starting_ar';
            }
        });
    }
    const howToPlayButton = document.getElementById('menuHowToPlayButton');
    if (howToPlayButton) {
        howToPlayButton.addEventListener('click', () => {
            alert("Kaip žaisti:\n1. Nuskanuok aplinką.\n2. Paspausk ant mėlyno taikinuko, kad padėtum bokštą.\n3. Paspausk Pradėti žaidimą.\n4. Šaudyk priešus spausdamas mygtuką.\n5. Tobulink bokštą ir save kai pasieksi naują lygį!");
        });
    }

    // Pause Button (Previously Exit VR)
    if (exitVRButton) {
        exitVRButton.addEventListener('click', () => {
            if (isGameSetupComplete && !isGameOver && !isGamePaused) {
                pauseGame(); // Call game logic function
                // Show pause menu
                if (controlsWidget) controlsWidget.style.display = 'none';
                if (pauseMenu) pauseMenu.style.display = 'flex';
            } else if (isGamePaused) {
                 resumeGame(true); // Resume if already paused
            } else {
                console.log("Pause button ignored (game not running or already over).");
            }
        });
    }

    // Pause Menu Buttons
    if (pauseResumeButton) {
        pauseResumeButton.addEventListener('click', () => {
            if (isGamePaused) resumeGame(true);
        });
    }
    if (pauseMainMenuButton) {
        pauseMainMenuButton.addEventListener('click', () => {
            if (isGamePaused || isGameOver /* Allow exit from game over too */) {
                console.log("Transitioning to Main Menu...");
                if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
                    sceneElGlobal.exitVR(); // exit-vr listener handles cleanup
                } else {
                    // Manual transition if not in AR (shouldn't happen from pause)
                    if (pauseMenu) pauseMenu.style.display = 'none';
                    if (gameOverScreen) gameOverScreen.style.display = 'none';
                    resetGame();
                    if (sceneElGlobal) sceneElGlobal.style.display = 'none';
                    if (mainMenu) mainMenu.style.display = 'flex';
                    if (overlay) overlay.style.display = 'none';
                    gameState = 'menu';
                }
            }
        });
    }

    // Shoot Button (Uses global handleShootClick function)
    if (shootButton) {
        // If using onclick="handleShootClick()" in HTML, this listener is redundant
        // shootButton.addEventListener('click', handleShootClick);
        // Ensure the onclick attribute exists on the button in index.html
        if (!shootButton.hasAttribute('onclick')) {
             console.warn("Shoot button missing onclick attribute, attaching listener via JS.");
             shootButton.addEventListener('click', handleShootClick);
        }
    }

    // Start Game Button (Initial Setup)
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            if (towerPlaced) {
                console.log("Start Game button clicked. Starting game!");
                isGameSetupComplete = true;
                isGameOver = false;
                // Reset health/score/level (already done in resetGame, but safe to repeat)
                currentMaxTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
                currentTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
                score = 0;
                currentLevel = 1;
                scoreForNextLevel = GAME_CONFIG.LEVELING.INITIAL_SCORE_THRESHOLD;
                scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;
                nextShooterUpgradeLevel = GAME_CONFIG.UPGRADES.SHOOTER.INITIAL_LEVEL_CHECK;
                nextSlowTurretUpgradeLevel = GAME_CONFIG.UPGRADES.UNLOCKS.SLOW_TURRET + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;
                playerDamageLevel = 0; // Reset player damage
                shooterLevel = 0;
                slowTurretLevel = 0;
                upgradeShooter1Placed = false; upgradeShooter2Placed = false;
                upgradeSlowTurretPlaced = false; upgradeSlowTurret2Placed = false;

                // Update UI
                if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
                if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
                if (typeof updateLevelDisplay === 'function') updateLevelDisplay();
                if (typeof updateXPBar === 'function') updateXPBar();

                // Hide setup UI, show game UI
                if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
                const reticleEl = document.getElementById('placement-reticle');
                if (reticleEl) reticleEl.setAttribute('visible', false);
                if (controlsWidget) controlsWidget.style.display = 'block';
                if (shootButton) shootButton.disabled = false;

                // Start Spawner
                enemyManager.startSpawner();
            } else {
                console.warn("Start button clicked, but tower not placed yet.");
            }
        });
    }

    // Try Again Button (Game Over)
    if (tryAgainButton) {
        tryAgainButton.addEventListener('click', () => {
            // Reset game state and UI to the AR placement phase
            resetGame();
            // Ensure game over screen is hidden
            if (gameOverScreen) gameOverScreen.style.display = 'none';
            // Resetting already handles UI for AR placement start
        });
    }

    // Game Over -> Main Menu Button
    if (gameOverMenuButton) {
         gameOverMenuButton.addEventListener('click', () => {
            console.log("Game Over -> Main Menu button clicked.");
            if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
                sceneElGlobal.exitVR(); // exit-vr listener handles cleanup
            } else {
                 // Manual transition if not in AR
                 if (gameOverScreen) gameOverScreen.style.display = 'none';
                 resetGame();
                 if (sceneElGlobal) sceneElGlobal.style.display = 'none';
                 if (mainMenu) mainMenu.style.display = 'flex';
                 if (overlay) overlay.style.display = 'none';
                 gameState = 'menu';
            }
        });
    }

    // --- Upgrade Button Listeners ---

    // Health Upgrade
    if (upgradeHealthBtn) {
        upgradeHealthBtn.addEventListener('click', () => {
            if (isGamePaused) {
                 currentMaxTowerHealth += GAME_CONFIG.UPGRADES.HEALTH.HP_INCREASE;
                 currentTowerHealth = currentMaxTowerHealth; // Heal to full on upgrade
                 if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
                 console.log(`Health upgraded. Max: ${currentMaxTowerHealth}`);
                 resumeGame();
            }
        });
    }

    // Player Damage Upgrade
    if (upgradePlayerDamageBtn) {
        upgradePlayerDamageBtn.addEventListener('click', () => {
             if (isGamePaused) {
                  playerDamageLevel++;
                  let multiplier = (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** playerDamageLevel);
                  console.log(`Player Damage upgraded to Level ${playerDamageLevel}. Multiplier: ${multiplier.toFixed(2)}x`);
                  resumeGame();
             }
         });
     }

    // Shooter Upgrade / Placement
    if (upgradeShooterBtn) {
        upgradeShooterBtn.addEventListener('click', () => {
            if (isGamePaused) {
                const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS;
                // Action: Place 1?
                if (!upgradeShooter1Placed) {
                     console.log("Initiating placement for Shooter 1...");
                     placingUpgrade = 'shooter1';
                     placedUpgradeEl = null; // Clear any previous visual
                     // Show placement UI
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     if (reticleEl) reticleEl.setAttribute('visible', 'true');
                     if (feedbackEl) { feedbackEl.textContent = `Paspausk ant paviršiaus padėti Šaudyklę`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                     if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                     if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                // Action: Place 2?
                else if (!upgradeShooter2Placed && currentLevel >= UNLOCKS.SECOND_SHOOTER) {
                     console.log("Initiating placement for Shooter 2...");
                     placingUpgrade = 'shooter2';
                     placedUpgradeEl = null;
                     // Show placement UI (similar to above)
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     if (reticleEl) reticleEl.setAttribute('visible', 'true');
                     if (feedbackEl) { feedbackEl.textContent = `Paspausk ant paviršiaus padėti Šaudyklę`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                     if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                     if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                // Action: Upgrade Existing?
                else if (upgradeShooter1Placed && upgradeShooter2Placed && currentLevel >= nextShooterUpgradeLevel) {
                    shooterLevel++;
                    console.log(`Applying Shooter Upgrade. Internal Level now: ${shooterLevel}.`);
                    const SHOOTER_CONFIG = GAME_CONFIG.UPGRADES.SHOOTER;
                    const TURRET_CONFIG = GAME_CONFIG.TURRETS.SHOOTER;
                    let upgradeApplied = false;

                    // Apply Damage or Speed based on internal level
                    if (shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1 || shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_2) {
                        const isDmg1 = shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1;
                        console.log(` -> Applying Shooter Damage Upgrade ${isDmg1 ? 'I' : 'II'}`);
                        activeShooterUpgrades.forEach(shooterEl => {
                            if (shooterEl?.components['auto-shooter']) {
                                let currentDamage = shooterEl.getAttribute('auto-shooter')?.turretDamage || TURRET_CONFIG.BASE_DAMAGE;
                                const multiplier = isDmg1 ? SHOOTER_CONFIG.DAMAGE_1_MULTIPLIER : SHOOTER_CONFIG.DAMAGE_2_FACTOR;
                                if (!isDmg1 && shooterLevel > SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1) { /* Ensure Dmg1 applied first */ }
                                const newDamage = Math.round(currentDamage * multiplier);
                                shooterEl.setAttribute('auto-shooter', 'turretDamage', newDamage);
                                console.log(`  - Turret ${shooterEl.id} damage set to ${newDamage}`);
                                upgradeApplied = true;
                            }
                        });
                    } else { // Apply Speed Upgrade
                        console.log(` -> Applying Shooter Speed Upgrade (Level ${shooterLevel})`);
                        activeShooterUpgrades.forEach(shooterEl => {
                            if (shooterEl?.components['auto-shooter']) {
                                const currentDelay = shooterEl.getAttribute('auto-shooter').shootDelay;
                                const newDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentDelay * SHOOTER_CONFIG.SPEED_INCREASE_FACTOR);
                                shooterEl.setAttribute('auto-shooter', 'shootDelay', newDelay);
                                console.log(`  - Turret ${shooterEl.id} speed increased (Delay: ${newDelay.toFixed(0)}ms)`);
                                upgradeApplied = true;
                            }
                        });
                    }

                    if (upgradeApplied) {
                        nextShooterUpgradeLevel += SHOOTER_CONFIG.UPGRADE_FREQUENCY;
                        console.log(`Next shooter upgrade available at Player Lv ${nextShooterUpgradeLevel}.`);
                    }
                    resumeGame(); // Resume after applying
                } else {
                     console.log("Shooter upgrade not available.");
                     resumeGame(); // Resume even if no action
                }
            }
        });
    }

    // Slower Turret Upgrade / Placement
    if (upgradeSlowerBtn) {
        upgradeSlowerBtn.addEventListener('click', () => {
            if (isGamePaused) {
                const SLOWER_CONFIG = GAME_CONFIG.UPGRADES.SLOWER;
                const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS;
                // Action 1: Place First?
                if (!upgradeSlowTurretPlaced && currentLevel >= UNLOCKS.SLOW_TURRET) {
                     console.log("Initiating placement for Slow Turret 1...");
                     placingUpgrade = 'slowTurret1';
                     placedUpgradeEl = null;
                     // Show placement UI
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     if (reticleEl) reticleEl.setAttribute('visible', 'true');
                     if (feedbackEl) { feedbackEl.textContent = `Padėti Lėtintoją`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                     if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                     if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                // Action 2: Place Second?
                else if (upgradeSlowTurretPlaced && !upgradeSlowTurret2Placed && currentLevel >= UNLOCKS.SECOND_SLOW_TURRET) {
                    console.log("Initiating placement for Slow Turret 2...");
                    placingUpgrade = 'slowTurret2';
                    placedUpgradeEl = null;
                    // Show placement UI
                    const reticleEl = document.getElementById('placement-reticle');
                    const feedbackEl = document.getElementById('scanning-feedback');
                    if (reticleEl) reticleEl.setAttribute('visible', 'true');
                    if (feedbackEl) { feedbackEl.textContent = `Padėti Lėtintoją`; feedbackEl.style.display = 'block'; }
                    if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                    if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                    if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                // Action 3: Upgrade Existing?
                else if (upgradeSlowTurretPlaced && upgradeSlowTurret2Placed && currentLevel >= nextSlowTurretUpgradeLevel) {
                    slowTurretLevel++;
                    console.log(`Upgrading Slow Turrets to Level ${slowTurretLevel}.`);
                    let turretsUpgraded = 0;
                    let currentShootDelay = GAME_CONFIG.TURRETS.SLOWER.INITIAL_DELAY;
                    let currentSlowPerc = GAME_CONFIG.TURRETS.SLOWER.INITIAL_SLOW_PERCENTAGE;
                    if (activeSlowTurrets.length > 0 && activeSlowTurrets[0]?.components['auto-shooter']) {
                        const currentData = activeSlowTurrets[0].getAttribute('auto-shooter');
                        currentShootDelay = currentData.shootDelay;
                        currentSlowPerc = currentData.slowPercentage;
                    }
                    const newDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentShootDelay * SLOWER_CONFIG.SPEED_INCREASE_FACTOR);
                    const newSlowPercentage = Math.min(SLOWER_CONFIG.SLOW_MAX_PERCENTAGE, currentSlowPerc + SLOWER_CONFIG.SLOW_INCREASE_AMOUNT);

                    activeSlowTurrets.forEach(turretEl => {
                        if (turretEl?.components['auto-shooter']) {
                            turretEl.setAttribute('auto-shooter', { shootDelay: newDelay, slowPercentage: newSlowPercentage });
                            turretsUpgraded++;
                        }
                    });

                    if (turretsUpgraded > 0) {
                        nextSlowTurretUpgradeLevel += SLOWER_CONFIG.UPGRADE_FREQUENCY;
                        console.log(`Next Slow Turret upgrade available at Lv ${nextSlowTurretUpgradeLevel}.`);
                    }
                    resumeGame();
                } else {
                    console.log("Slower Turret upgrade not available.");
                    resumeGame();
                }
            }
        });
    }

    // Manual Upgrades Button (Toggle Popup)
    if (manualUpgradesButton) {
        manualUpgradesButton.addEventListener('click', () => {
            if (!upgradesPopup) return;
            const isVisible = upgradesPopup.style.display === 'block';
            if (isVisible) {
                // Hide popup, resume if paused by popup
                showUpgradePopup(false);
                if (isGamePaused) resumeGame(false);
            } else if (!isGamePaused && isGameSetupComplete) {
                // Show popup, don't pause game
                showUpgradePopup(true, false);
            } else {
                console.log("Cannot open upgrades manually (Game Paused/Not Started).");
            }
        });
    }

    // Close Upgrade Popup Button
    if (closeUpgradePopupBtn) {
         closeUpgradePopupBtn.addEventListener('click', () => {
             showUpgradePopup(false); // Hide the popup
             // If the game was paused *because* of the popup, resume it
             // Check isGamePaused state before resuming
             if (isGamePaused) resumeGame(false);
         });
    }

    // Confirm Upgrade Placement Button
    if (confirmPlacementButton) {
        // Use the globally defined function
        confirmPlacementButton.addEventListener('click', confirmUpgradePlacement);
    }

    // --- Initialize UI ---
    console.log("Initializing UI states...");
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
    if (typeof updateLevelDisplay === 'function') updateLevelDisplay();
    if (typeof updateXPBar === 'function') updateXPBar();

}); // End DOMContentLoaded

// ========================================================
// ========= END DOMContentLoaded SETUP & LISTENERS =======
// ========================================================