

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI listeners and initial state...");

    sceneElGlobal = document.querySelector('a-scene'); 
    const overlay = document.getElementById('dom-overlay');
    const mainMenu = document.getElementById('main-menu');
    const mainMenuStartButton = document.getElementById('mainMenuStartButton');
    const menuHighScoreDisplay = document.getElementById('menuHighScore');
    const exitVRButton = document.getElementById('exitVRButton'); 
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
    }


    try {
        highScore = parseInt(localStorage.getItem('arTowerDefenseHighScore') || '0');
        if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore;
    } catch (e) {
        console.error("Failed to load high score from localStorage:", e);
        highScore = 0; 
    }

    
    if (gameState === 'menu') {
        if (sceneElGlobal) sceneElGlobal.style.display = 'none';
        if (mainMenu) mainMenu.style.display = 'flex';
        if (controlsWidget) controlsWidget.classList.add('hidden');
    }

    

    
    if (sceneElGlobal) {
        sceneElGlobal.addEventListener('enter-vr', () => {
            console.log('Event: enter-vr');
            isGameSetupComplete = false;
            towerPlaced = false;
            placedTowerEl = null;
            gameState = 'ar_setup';

            
            const myEnterARButton = document.getElementById('myEnterARButton');
            const scanningFeedbackEl = document.getElementById('scanning-feedback');
            const fpsCounterEl = document.getElementById('fps-counter');
            if (myEnterARButton) myEnterARButton.style.display = 'none';
            if (exitVRButton) exitVRButton.style.display = 'inline-block';
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
            resetGame(); 

            
            if (sceneElGlobal) sceneElGlobal.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
            if (mainMenu) mainMenu.style.display = 'flex';
            if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore; 

            
            const fpsCounterEl = document.getElementById('fps-counter');
            const myEnterARButton = document.getElementById('myEnterARButton');
            if (fpsCounterEl) fpsCounterEl.classList.add('hidden');
            if (exitVRButton) exitVRButton.style.display = 'none';
            if (myEnterARButton) myEnterARButton.style.display = 'inline-block';
        });

        sceneElGlobal.addEventListener('ar-hit-test-start', () => {
            
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
                 
                 const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', 'true');
            }
        });

        sceneElGlobal.addEventListener('ar-hit-test-lost', () => {
            
            if (!isGameSetupComplete) {
                console.log('Event: ar-hit-test-lost (Surface Lost)');
                const reticleEl = document.getElementById('placement-reticle');
                const scanningFeedbackEl = document.getElementById('scanning-feedback');
                if (reticleEl) reticleEl.setAttribute('visible', 'false');
                if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
                if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            } else {
                 
                 const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', 'false');
            }
        });

        sceneElGlobal.addEventListener('ar-hit-test-select', (e) => {
            
            const now = performance.now();
            if (now - lastSelectTime < GAME_CONFIG.TIMINGS.DEBOUNCE_SELECT_MS) return;
            lastSelectTime = now;

            
            const targetElement = e.detail?.sourceEvent?.target;
            const isUITap = targetElement?.closest && targetElement.closest('#dom-overlay button, #dom-overlay fieldset, #dom-overlay section');
            if (isUITap && targetElement.tagName !== 'CANVAS') {
                console.log("AR Select ignored: Tap on overlay UI element.");
                return;
            }
            console.log("Event: ar-hit-test-select processed.");

            const reticleEl = document.getElementById('placement-reticle');
            const feedbackEl = document.getElementById('scanning-feedback');

            
            if (placingUpgrade && reticleEl?.getAttribute('visible')) {
                const position = reticleEl.getAttribute('position');
                if (!position || isNaN(position.x)) {
                    console.error("Upgrade Placement failed: Invalid position."); return;
                }

                if (!placedUpgradeEl) { 
                    const upgradeEntity = document.createElement('a-entity');
                    upgradeEntity.setAttribute('id', `${placingUpgrade}-visual-${Date.now()}`);
                    let modelId = '', textureId = '', scale = '0.05 0.05 0.05';
                    if (placingUpgrade.startsWith('shooter')) {
                        modelId = '#shooter-upgrade-model'; textureId = '#shooter-upgrade-texture';
                    } else if (placingUpgrade.startsWith('slowTurret')) {
                        modelId = '#slower-upgrade-model'; textureId = '#slower-upgrade-texture';
                    } else { return; } 

                    upgradeEntity.setAttribute('gltf-model', modelId);
                    upgradeEntity.setAttribute('material', { src: textureId });
                    upgradeEntity.setAttribute('scale', scale);
                    upgradeEntity.setAttribute('position', position);
                    sceneElGlobal.appendChild(upgradeEntity);
                    placedUpgradeEl = upgradeEntity;

                    
                    if (confirmPlacementButton) confirmPlacementButton.disabled = false;
                    if (feedbackEl) { feedbackEl.textContent = "Paspausk pakeist poziciją arba pradėk"; feedbackEl.style.display = 'block';}

                } else { 
                     placedUpgradeEl.setAttribute('position', position);
                }
            
            } else if (!isGameSetupComplete && reticleEl?.getAttribute('visible')) {
                const position = reticleEl.getAttribute('position');
                if (!position || isNaN(position.x)) {
                     console.error("Tower Placement/Move failed: Invalid position."); return;
                }

                if (!towerPlaced) { 
                    console.log('Placing TOWER...');
                    const tower = document.createElement('a-entity'); 
                    tower.setAttribute('id', 'placed-base-tower');
                    tower.setAttribute('gltf-model', '#tower-model');
                    tower.setAttribute('material', { src: '#tower-texture' });
                    tower.setAttribute('scale', '0.05 0.05 0.05');
                    tower.setAttribute('position', position);
                    sceneElGlobal.appendChild(tower);
                    placedTowerEl = tower;
                    towerPlaced = true;

                    
                    if (startGameButton) startGameButton.disabled = false;
                    const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
                    if (towerPlacedFeedback) {
                        towerPlacedFeedback.textContent = "Bokštas padėtas! Paspausk kitur pakeisti jo poziciją arba pradėk žaist.";
                        towerPlacedFeedback.style.display = 'block';
                    }
                    if(reticleEl) reticleEl.setAttribute('visible', 'true'); 

                } else if (placedTowerEl) { 
                     placedTowerEl.setAttribute('position', position);
                }
            } else {
                console.log("AR Select ignored: Conditions not met.");
            }
        });
    }

    
    if (overlay) {
        overlay.addEventListener('beforexrselect', (e) => {
            const targetElement = e.target;
            
            const allowDefault = targetElement?.tagName === 'BUTTON' &&
                                 targetElement.closest &&
                                 targetElement.closest('#place-tower-popup, #upgrades-popup, #confirm-placement-area, #game-over-screen, #controls-widget, #pause-menu');
            if (!allowDefault) {
                e.preventDefault();
            }
        });
    }

    

    
    if (mainMenuStartButton) {
        mainMenuStartButton.addEventListener('click', () => {
            console.log("Main Menu Start Button Clicked!");
            if (mainMenu) mainMenu.style.display = 'none';
            if (sceneElGlobal) {
                sceneElGlobal.style.display = 'block';
                console.log("Attempting to enter AR...");
                sceneElGlobal.enterAR().catch(e => {
                    console.error("AR Entry Failed:", e);
                    alert("AR nepalaikoma arba buvo atmesta."); 
                    if (mainMenu) mainMenu.style.display = 'flex'; 
                    if (sceneElGlobal) sceneElGlobal.style.display = 'none';
                });
                gameState = 'starting_ar';
            }
        });
    }
    const howToPlayButton = document.getElementById('menuHowToPlayButton');
    if (howToPlayButton) {
        howToPlayButton.addEventListener('click', () => {
            
            alert("Kaip žaisti:\n1. Nuskanuok aplinką.\n2. Paspausk ant mėlyno taikinuko, kad padėtum bokštą.\n3. Paspausk Pradėti žaidimą.\n4. Šaudyk priešus spausdamas mygtuką.\n5. Tobulink bokštą ir save kai pasieksi naują lygį."); 
        });
    }

    
    if (exitVRButton) {
        exitVRButton.addEventListener('click', () => {
            if (isGameSetupComplete && !isGameOver && !isGamePaused) {
                pauseGame(); 
                
                if (controlsWidget) controlsWidget.style.display = 'none';
                if (pauseMenu) pauseMenu.style.display = 'flex';
            } else if (isGamePaused) {
                 resumeGame(true); 
            } else {
                console.log("Pause button ignored (game not running or already over).");
            }
        });
    }

    
    if (pauseResumeButton) {
        pauseResumeButton.addEventListener('click', () => {
            if (isGamePaused) resumeGame(true);
        });
    }
    if (pauseMainMenuButton) {
        pauseMainMenuButton.addEventListener('click', () => {
            if (isGamePaused || isGameOver) {
                console.log("Transitioning to Main Menu...");
                if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
                    sceneElGlobal.exitVR(); 
                } else {
                    
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

    
    if (shootButton) {
        
        
        
        if (!shootButton.hasAttribute('onclick')) {
             console.warn("Shoot button missing onclick attribute, attaching listener via JS.");
             shootButton.addEventListener('click', handleShootClick);
        }
    }

    
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            if (towerPlaced) {
                console.log("Start Game button clicked. Starting game!");
                isGameSetupComplete = true;
                isGameOver = false;
                
                currentMaxTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
                currentTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
                score = 0;
                currentLevel = 1;
                scoreForNextLevel = GAME_CONFIG.LEVELING.INITIAL_SCORE_THRESHOLD;
                scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;
                nextShooterUpgradeLevel = GAME_CONFIG.UPGRADES.SHOOTER.INITIAL_LEVEL_CHECK;
                nextSlowTurretUpgradeLevel = GAME_CONFIG.UPGRADES.UNLOCKS.SLOW_TURRET + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;
                playerDamageLevel = 0; 
                shooterLevel = 0;
                slowTurretLevel = 0;
                upgradeShooter1Placed = false; upgradeShooter2Placed = false;
                upgradeSlowTurretPlaced = false; upgradeSlowTurret2Placed = false;

                
                if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
                if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
                if (typeof updateLevelDisplay === 'function') updateLevelDisplay();
                if (typeof updateXPBar === 'function') updateXPBar();

                
                if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
                const reticleEl = document.getElementById('placement-reticle');
                if (reticleEl) reticleEl.setAttribute('visible', false);
                if (controlsWidget) controlsWidget.style.display = 'block';
                if (shootButton) shootButton.disabled = false;

                
                enemyManager.startSpawner();
            } else {
                console.warn("Start button clicked, but tower not placed yet.");
            }
        });
    }

    
    if (tryAgainButton) {
        tryAgainButton.addEventListener('click', () => {
            
            resetGame();
            
            if (gameOverScreen) gameOverScreen.style.display = 'none';
            
        });
    }

    
    if (gameOverMenuButton) {
         gameOverMenuButton.addEventListener('click', () => {
            console.log("Game Over -> Main Menu button clicked.");
            if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
                sceneElGlobal.exitVR(); 
            } else {
                 
                 if (gameOverScreen) gameOverScreen.style.display = 'none';
                 resetGame();
                 if (sceneElGlobal) sceneElGlobal.style.display = 'none';
                 if (mainMenu) mainMenu.style.display = 'flex';
                 if (overlay) overlay.style.display = 'none';
                 gameState = 'menu';
            }
        });
    }

    

    
    if (upgradeHealthBtn) {
        upgradeHealthBtn.addEventListener('click', () => {
            if (isGamePaused) {
                 currentMaxTowerHealth += GAME_CONFIG.UPGRADES.HEALTH.HP_INCREASE;
                 currentTowerHealth = currentMaxTowerHealth; 
                 if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
                 console.log(`Health upgraded. Max: ${currentMaxTowerHealth}`);
                 resumeGame();
            }
        });
    }

    
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

    
    if (upgradeShooterBtn) {
        upgradeShooterBtn.addEventListener('click', () => {
            if (isGamePaused) {
                const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS;
                
                if (!upgradeShooter1Placed) {
                     console.log("Initiating placement for Shooter 1...");
                     placingUpgrade = 'shooter1';
                     placedUpgradeEl = null; 
                     
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     if (reticleEl) reticleEl.setAttribute('visible', 'true');
                     if (feedbackEl) { feedbackEl.textContent = `Paspausk ant paviršiaus padėti Šaudyklę`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                     if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                     if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                
                else if (!upgradeShooter2Placed && currentLevel >= UNLOCKS.SECOND_SHOOTER) {
                     console.log("Initiating placement for Shooter 2...");
                     placingUpgrade = 'shooter2';
                     placedUpgradeEl = null;
                     
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     if (reticleEl) reticleEl.setAttribute('visible', 'true');
                     if (feedbackEl) { feedbackEl.textContent = `Paspausk ant paviršiaus padėti Šaudyklę`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                     if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                     if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                
                else if (upgradeShooter1Placed && upgradeShooter2Placed && currentLevel >= nextShooterUpgradeLevel) {
                    shooterLevel++;
                    console.log(`Applying Shooter Upgrade. Internal Level now: ${shooterLevel}.`);
                    const SHOOTER_CONFIG = GAME_CONFIG.UPGRADES.SHOOTER;
                    const TURRET_CONFIG = GAME_CONFIG.TURRETS.SHOOTER;
                    let upgradeApplied = false;

                    
                    if (shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1 || shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_2) {
                        const isDmg1 = shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1;
                        console.log(` -> Applying Shooter Damage Upgrade ${isDmg1 ? 'I' : 'II'}`);
                        activeShooterUpgrades.forEach(shooterEl => {
                            if (shooterEl?.components['auto-shooter']) {
                                let currentDamage = shooterEl.getAttribute('auto-shooter')?.turretDamage || TURRET_CONFIG.BASE_DAMAGE;
                                const multiplier = isDmg1 ? SHOOTER_CONFIG.DAMAGE_1_MULTIPLIER : SHOOTER_CONFIG.DAMAGE_2_FACTOR;
                                if (!isDmg1 && shooterLevel > SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1) { }
                                const newDamage = Math.round(currentDamage * multiplier);
                                shooterEl.setAttribute('auto-shooter', 'turretDamage', newDamage);
                                console.log(`  - Turret ${shooterEl.id} damage set to ${newDamage}`);
                                upgradeApplied = true;
                            }
                        });
                    } else { 
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
                    resumeGame(); 
                } else {
                     console.log("Shooter upgrade not available.");
                     resumeGame(); 
                }
            }
        });
    }

    
    if (upgradeSlowerBtn) {
        upgradeSlowerBtn.addEventListener('click', () => {
            if (isGamePaused) {
                const SLOWER_CONFIG = GAME_CONFIG.UPGRADES.SLOWER;
                const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS;
                
                if (!upgradeSlowTurretPlaced && currentLevel >= UNLOCKS.SLOW_TURRET) {
                     console.log("Initiating placement for Slow Turret 1...");
                     placingUpgrade = 'slowTurret1';
                     placedUpgradeEl = null;
                     
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     if (reticleEl) reticleEl.setAttribute('visible', 'true');
                     if (feedbackEl) { feedbackEl.textContent = `Padėti Lėtintoją`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                     if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                     if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                
                else if (upgradeSlowTurretPlaced && !upgradeSlowTurret2Placed && currentLevel >= UNLOCKS.SECOND_SLOW_TURRET) {
                    console.log("Initiating placement for Slow Turret 2...");
                    placingUpgrade = 'slowTurret2';
                    placedUpgradeEl = null;
                    
                    const reticleEl = document.getElementById('placement-reticle');
                    const feedbackEl = document.getElementById('scanning-feedback');
                    if (reticleEl) reticleEl.setAttribute('visible', 'true');
                    if (feedbackEl) { feedbackEl.textContent = `Padėti Lėtintoją`; feedbackEl.style.display = 'block'; }
                    if (confirmPlacementArea) confirmPlacementArea.style.display = 'block';
                    if (confirmPlacementButton) confirmPlacementButton.disabled = true;
                    if (upgradesPopup) upgradesPopup.style.display = 'none';
                }
                
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

    
    if (manualUpgradesButton) {
        manualUpgradesButton.addEventListener('click', () => {
            if (!upgradesPopup) return;
            const isVisible = upgradesPopup.style.display === 'block';
            if (isVisible) {
                
                showUpgradePopup(false);
                if (isGamePaused) resumeGame(false);
            } else if (!isGamePaused && isGameSetupComplete) {
                
                showUpgradePopup(true, false);
            } else {
                console.log("Cannot open upgrades manually (Game Paused/Not Started).");
            }
        });
    }

    
    if (closeUpgradePopupBtn) {
         closeUpgradePopupBtn.addEventListener('click', () => {
             showUpgradePopup(false); 
             
             
             if (isGamePaused) resumeGame(false);
         });
    }

    
    if (confirmPlacementButton) {
        
        confirmPlacementButton.addEventListener('click', confirmUpgradePlacement);
    }

    
    console.log("Initializing UI states...");
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (typeof updateTowerHealthUI === 'function') updateTowerHealthUI();
    if (typeof updateLevelDisplay === 'function') updateLevelDisplay();
    if (typeof updateXPBar === 'function') updateXPBar();

}); 