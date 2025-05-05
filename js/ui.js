
let scoreDisplayEl = null;
let levelUpPopupEl = null;
let levelNumberEl = null;
let topUiContainerEl = null;
let hpNumberDisplayEl = null;
let hpBarFillEl = null;
let gameOverScreenEl = null;
let finalScoreEl = null;
let upgradesPopupEl = null;
let confirmPlacementAreaEl = null;
let confirmPlacementButtonEl = null;
let upgradeShooterBtn = null;
let upgradeHealthBtn = null;
let upgradeSlowerBtn = null;
let upgradePlayerDamageBtn = null;
let closeUpgradePopupBtnEl = null;
let manualUpgradesButtonEl = null;
let levelDisplayEl = null;
let xpLevelDisplayEl = null;
let xpBarFillEl = null;
let pauseMenuEl = null;
let sceneElGlobal = null; 



function updateScoreDisplay() {
    
    scoreDisplayEl = scoreDisplayEl || document.getElementById('score-display');
    if (scoreDisplayEl) {
        scoreDisplayEl.textContent = `Score: ${score}`;
    }
}


function updateLevelDisplay() {
    levelDisplayEl = levelDisplayEl || document.getElementById('level-display');
    if (levelDisplayEl) {
        levelDisplayEl.textContent = `Level: ${currentLevel}`;
    } else {
        
        if (!window._levelElWarned) {
             console.error("UI Error: Level display element (#level-display) not found!");
             window._levelElWarned = true;
        }
    }
}


function showLevelUpPopup(level) {
    levelUpPopupEl = levelUpPopupEl || document.getElementById('level-up-popup');
    levelNumberEl = levelNumberEl || document.getElementById('level-number');

    if (levelUpPopupEl && levelNumberEl) {
        levelNumberEl.textContent = `Level: ${level}`;
        levelUpPopupEl.style.display = 'block';
        void levelUpPopupEl.offsetWidth; 

        
        if (levelUpTimeout) clearTimeout(levelUpTimeout);

        levelUpTimeout = setTimeout(() => {
            if (levelUpPopupEl) levelUpPopupEl.style.display = 'none';
            levelUpTimeout = null;
        }, GAME_CONFIG.TIMINGS.LEVEL_UP_POPUP_MS); 
    } else {
        console.error("UI Error: Could not find level-up popup elements!");
    }
}


function updateTowerHealthUI() {
    
    topUiContainerEl = topUiContainerEl || document.getElementById('top-ui-container');
    hpNumberDisplayEl = hpNumberDisplayEl || document.getElementById('hp-number-display');
    hpBarFillEl = hpBarFillEl || document.getElementById('hp-bar-fill');

    if (!topUiContainerEl || !hpNumberDisplayEl || !hpBarFillEl) {
        if(topUiContainerEl) topUiContainerEl.classList.add('hidden');
        
        return;
    }

    
    if (isGameSetupComplete && !isGameOver) {
        topUiContainerEl.classList.remove('hidden');
    } else {
        topUiContainerEl.classList.add('hidden');
        return; 
    }

    
    hpNumberDisplayEl.textContent = `${currentTowerHealth}/${currentMaxTowerHealth}`;

    
    const healthPercent = currentMaxTowerHealth > 0 ? (currentTowerHealth / currentMaxTowerHealth) : 0;
    const healthWidthPercentage = Math.max(0, Math.min(100, healthPercent * 100));
    hpBarFillEl.style.width = `${healthWidthPercentage}%`;

    
    hpBarFillEl.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-600');
    if (healthPercent > 0.6) {
        hpBarFillEl.classList.add('bg-green-500');
    } else if (healthPercent > 0.3) {
        hpBarFillEl.classList.add('bg-yellow-500');
    } else {
        hpBarFillEl.classList.add('bg-red-600');
    }
}


function updateXPBar() {
    xpLevelDisplayEl = xpLevelDisplayEl || document.getElementById('xp-level-display');
    xpBarFillEl = xpBarFillEl || document.getElementById('xp-bar-fill');

    if (!xpLevelDisplayEl || !xpBarFillEl) {
        console.warn("UI Warning: XP Bar UI elements not found!");
        return;
    }

    xpLevelDisplayEl.textContent = currentLevel;

    let progress = 0;
    if (currentLevel >= GAME_CONFIG.LEVELING.MAX_LEVEL) {
        progress = 1.0;
    } else if (scoreGap > 0) {
        const scoreAtStartOfLevel = scoreForNextLevel - scoreGap;
        const scoreInCurrentLevel = score - scoreAtStartOfLevel;
        progress = Math.max(0, Math.min(1, scoreInCurrentLevel / scoreGap));
    } 

    const percentage = progress * 100;
    xpBarFillEl.style.width = `${percentage}%`;

    
    
}


function showUpgradePopup(show, pauseGame = false) {
    if (isGameOver && show) return; 

    upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
    if (!upgradesPopupEl) { console.error("UI Error: Upgrade popup element not found!"); return; }

    if (show) {
        console.log(`Showing Upgrade Popup... (Pause: ${pauseGame})`);
        if (pauseGame && !isGamePaused) {
            
            isGamePaused = true;
            if (window.enemyManager && window.enemyManager.stopSpawner) { window.enemyManager.stopSpawner(); }
            const controlsWidget = document.getElementById('controls-widget');
            if (controlsWidget) controlsWidget.style.display = 'none';
        }

        
        
        if (window.updateUpgradePopupButtonStates) window.updateUpgradePopupButtonStates();

        upgradesPopupEl.style.display = 'block';

        
        if (pauseGame) {
            const reticleEl = document.getElementById('placement-reticle');
            if (reticleEl) reticleEl.setAttribute('visible', 'false');
        }
    } else {
        console.log("Hiding Upgrade Popup...");
        upgradesPopupEl.style.display = 'none';
        
    }
}


function setUpgradeButtonState(buttonEl, title, description, available, nextLevel = -1) {
    if (!buttonEl) return;

    const titleSpan = buttonEl.querySelector('span:not(.upgrade-desc):not(.upgrade-desc-level)');
    const descSpan = buttonEl.querySelector('.upgrade-desc');
    const levelDescSpan = buttonEl.querySelector('.upgrade-desc-level');

    if (titleSpan) titleSpan.textContent = title;

    
    const disabledClasses = [
        'disabled:bg-gray-700', 'disabled:text-gray-500',
        'disabled:border-gray-600', 'disabled:opacity-70',
        'disabled:cursor-not-allowed'
    ];

    if (available) {
        buttonEl.disabled = false;
        buttonEl.classList.remove(...disabledClasses);
        if (descSpan) descSpan.textContent = description;
        if (levelDescSpan) levelDescSpan.style.display = 'none';
    } else {
        buttonEl.disabled = true;
        buttonEl.classList.add(...disabledClasses);
        if (descSpan) descSpan.textContent = description; 
        if (levelDescSpan) {
            if (nextLevel > 0) {
                levelDescSpan.textContent = `(Atsirakins ties ${nextLevel} Lyg.)`;
                levelDescSpan.style.display = 'block';
            } else {
                 levelDescSpan.style.display = 'none'; 
            }
        }
    }
}
