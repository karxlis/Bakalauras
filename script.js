// --- Component defin ---
AFRAME.registerComponent('follow-shadow', {
    //  this.data aframe scheme
    schema: {type: 'selector'},
    init: function() {
        console.log("[follow-shadow] Initializing"); // Log initialization
        this.el.object3D.renderOrder = -1; // Keep render order
        this.targetEl = null;
        this.initialPosSet = false;

        
        this.targetEl = this.data; // this.data IS the selected element (or null)
      

        // Log whether the target was found by A-Frame
        if (this.targetEl) {
            console.log(`[follow-shadow] Initial target element found: ${this.targetEl.id}`);
        } else {
             // A-Frame couldn't find the element based on the HTML attribute value
             console.warn(`[follow-shadow] Initial target element not found by A-Frame based on HTML attribute value provided.`);
        }
    },
    update: function(oldData) {
        // When the component data changes (e.g., attribute value in HTML changes)
        if (this.data !== oldData) {
            console.log("[follow-shadow] Target data updated.");

            // **** CORRECTED: Directly use the NEW element from this.data ****
            this.targetEl = this.data;
            // **** END CORRECTION ****

            this.initialPosSet = false; // Reset position flag on target change

             if (this.targetEl) {
                 console.log("[follow-shadow] New target element assigned:", this.targetEl.id);
             } else {
                  console.warn(`[follow-shadow] New target element not found by A-Frame.`);
             }
        }
    },
    tick: function() {
        // Tick logic remains the same - it correctly uses this.targetEl
        if (this.targetEl?.object3D?.visible) {
            if (!this.initialPosSet && this.targetEl.object3D.position.y > -100) {
                 this.initialPosSet = true;
            }
            if (this.initialPosSet) {
                 this.el.object3D.position.copy(this.targetEl.object3D.position);
                 this.el.object3D.position.y = 0.001;
                 if (!this.el.object3D.visible) { this.el.object3D.visible = true; }
            } else if (this.el.object3D.visible) { this.el.object3D.visible = false; }
        } else if (this.el.object3D.visible) {
            this.el.object3D.visible = false;
            if (this.initialPosSet) { this.initialPosSet = false; }
        }
    }
});
// --- End of follow-shadow component ---

const vector = new THREE.Vector3(); // Reusable vector for attach-dom-element
AFRAME.registerComponent('attach-dom-element', {
    schema: { type: 'string', default: '' },
    init: function() {
        this.screenElements = [];
        this.updateElements();
        this.el.addEventListener('componentchanged', (evt) => {
            if (evt.detail.name === 'attach-dom-element') { this.updateElements(); }
        });
    },
    updateElements: function() {
        if (!this.data) { this.screenElements = []; return; }
        try {
            this.screenElements = Array.from(document.querySelectorAll(this.data));
            // console.log(`attach-dom-element for ${this.el.id || 'element'} found ${this.screenElements.length} DOM elements with selector: ${this.data}`);
             if (this.screenElements.length === 0 && this.data) {
                console.warn(`attach-dom-element selector "${this.data}" on ${this.el.id || 'element'} found no matching DOM elements.`);
            }
        } catch (e) {
            console.error(`Invalid selector "${this.data}" for attach-dom-element on ${this.el.id || 'element'}:`, e);
            this.screenElements = [];
        }
    },
    tick() {
        if (this.screenElements.length === 0 || !this.el.sceneEl?.hasLoaded || !this.el.sceneEl.camera?.el || !this.el.object3D) return;
        if (!this.el.object3D.visible) { this.screenElements.forEach(el => { if (el) el.style.display = 'none'; }); return; }
        this.el.object3D.getWorldPosition(vector);
        vector.project(this.el.sceneEl.camera);
        const w = window.innerWidth * 0.5; const h = window.innerHeight * 0.5;
        const screenX = w + w * vector.x; const screenY = h - h * vector.y;
        for (const el of this.screenElements) {
            if (!el) continue;
            if (vector.z < 1) { el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`; el.style.display = 'block'; }
            else { el.style.display = 'none'; }
        }
    }
});

AFRAME.registerComponent('projectile-hitter', {
    schema: {
      speed: { default: 10.0 },
      lifetime: { default: 3000.0 },
      direction: { type: 'vec3' },
      targetSelector: { type: 'string', default: '.enemy' }, // Target enemies
      collisionRadius: { type: 'number', default: 0.2 }
    },
    init: function () {
      this.startTime = this.el.sceneEl.time;
      if (this.data.direction.lengthSq() > 0.001) { this.data.direction.normalize(); }
      else { this.data.direction.set(0, 0, -1); }

      this.targets = [];
      this.targetsFound = false;
      this.projectileWorldPos = new THREE.Vector3();
      this.targetWorldPos = new THREE.Vector3();
      this.collisionRadiusSq = this.data.collisionRadius * this.data.collisionRadius;

      // Defer target query slightly
      setTimeout(() => {
        this.targets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
        console.log(`[projectile-hitter] Initialized. Targeting: ${this.data.targetSelector}. Found ${this.targets.length} initial targets.`);
        if(this.targets.length === 0) console.warn(`[projectile-hitter] No initial targets found for ${this.data.targetSelector}`);
        this.targetsFound = this.targets.length > 0;
      }, 100);
    },
    tick: function (time, timeDelta) {
       const data = this.data; // Define inside tick
       const el = this.el;     // Define inside tick
       const elapsedTime = time - this.startTime; // Define inside tick

       // *** ADD dynamic target finding inside tick ***
       if (!this.targetsFound || time % 1000 < timeDelta) { // Check periodically
         const currentTargets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
         if (currentTargets.length !== this.targets.length) {
           this.targets = currentTargets;
         }
         this.targetsFound = this.targets.length > 0;
       }
       // *** END dynamic target finding ***

       // Lifetime check
       if (elapsedTime > data.lifetime) {
         if (el.parentNode) { el.parentNode.removeChild(el); }
         return; // This return is VALID inside the tick function
       }

       // Movement logic
       const distance = data.speed * (timeDelta / 1000);
       if (isNaN(distance) || distance <= 0 || !isFinite(distance) || !el.object3D) return; // Also valid here
       el.object3D.position.addScaledVector(data.direction, distance);

       // Collision Check
       if (!el.object3D) return; // Also valid here
       el.object3D.getWorldPosition(this.projectileWorldPos);

        // Check periodically for targets if not found initially, or update list
       if (!this.targetsFound && this.targets.length > 0) {
           this.targetsFound = true;
       } else if (!this.targetsFound) {
           // Optional: Warn if targets *never* found after some time
           if (elapsedTime > 2000 && !this._warned_no_targets) {
               console.warn(`[projectile-hitter] Still haven't found targets matching "${this.data.targetSelector}".`);
               this._warned_no_targets = true;
           }
           return; // Exit tick early if no targets found yet
       }

       for (let i = 0; i < this.targets.length; i++) {
         const target = this.targets[i];
         if (!target?.object3D) continue;
         const targetVisible = target.getAttribute('visible');
         const hasHitReceiver = target.components['hit-receiver'];

         if (targetVisible && hasHitReceiver) {
           target.object3D.getWorldPosition(this.targetWorldPos);
           const distSq = this.projectileWorldPos.distanceToSquared(this.targetWorldPos);
           if (distSq < this.collisionRadiusSq) {
             console.log(`%c[projectile-hitter] HIT DETECTED with ${target.id}!`, "color: green; font-weight: bold;");
             hasHitReceiver.hit(); // Call hit method
             if (el.parentNode) { el.parentNode.removeChild(el); } // Remove projectile
             return; // Exit loop and tick after hit
           }
         }
       }
     } // <<<< Closing brace for tick function
   });



// Hit Receiver Component (Calls score update)
AFRAME.registerComponent('hit-receiver', {
    schema: {
        respawnDelay: { type: 'number', default: 10000 },
        // **** ADD HEALTH SCHEMA ****
        maxHealth: { type: 'int', default: 1 },
        initialHealth: { type: 'int', default: 1 } // Use this to set starting HP
        // **** END HEALTH SCHEMA ****
    },
    init: function () {
        this.isVisible = this.el.getAttribute('visible');
        this.respawnTimer = null;
        this.hit = this.hit.bind(this);
        this.isEnemy = this.el.classList.contains('enemy');
        // **** INITIALIZE CURRENT HEALTH ****
        this.currentHealth = this.data.initialHealth;
        this.healthTextEl = this.el.querySelector('.enemy-health-text'); // Find health text child
        // **** END INITIALIZE CURRENT HEALTH ****
        console.log(`[hit-receiver] Initialized on ${this.el.id}. Is Enemy: ${this.isEnemy}. MaxHealth: ${this.data.maxHealth}, CurrentHealth: ${this.currentHealth}`);
        this.updateHealthText(); // Initial update
    },
    hit: function() {
        if (!this.isVisible || isGameOver) { return; } // Already hit or game over

        console.log(`[hit-receiver] ${this.el.id} HIT!`);

        // --- Handle Health Decrement ---
        if (this.isEnemy) {
            this.currentHealth--;
            console.log(`[hit-receiver] Enemy health: ${this.currentHealth}/${this.data.maxHealth}`);
            this.updateHealthText(); // Update visual indicator

            if (this.currentHealth <= 0) {
                // --- Enemy Destroyed ---
                console.log(`[hit-receiver] Enemy ${this.el.id} destroyed!`);
                this.isVisible = false; // Prevent further actions
                this.el.setAttribute('visible', 'false'); // Hide visually (optional before removal)

                if (window.incrementScore) { window.incrementScore(); } // Increment score ONLY on destroy

                if (window.enemyManager) {
                    window.enemyManager.decrementCount();
                    console.log(`[hit-receiver] Decremented enemy count via destroy. Current: ${window.enemyManager.activeEnemies}`);
                }
                if (this.el.parentNode) {
                    const removeDelay = 50; // Can be shorter now
                    setTimeout(() => {
                       if(this.el.parentNode) this.el.parentNode.removeChild(this.el);
                    }, removeDelay);
                }
            } else {
                // --- Enemy Damaged but not destroyed ---
                // Optional: Add a visual hit effect (e.g., flash color)
                const originalColor = this.el.getAttribute('material')?.color || '#FFFFFF';
                this.el.setAttribute('material', 'color', '#FFFFFF'); // Flash white
                setTimeout(() => { this.el.setAttribute('material', 'color', originalColor); }, 100);
            }
        } else {
            // --- Non-Enemy Hit Logic (Respawn) ---
            this.isVisible = false;
            this.el.setAttribute('visible', 'false');
            if (window.incrementScore) { window.incrementScore(); } // Score for non-enemy hits?
             if (this.respawnTimer) clearTimeout(this.respawnTimer);
            this.respawnTimer = setTimeout(() => {
                 this.isVisible = true;
                 this.el.setAttribute('visible', 'true');
                 this.respawnTimer = null;
             }, this.data.respawnDelay);
        }
    },
    // **** ADD HEALTH TEXT UPDATE FUNCTION ****
    updateHealthText: function() {
        if (this.healthTextEl && this.isEnemy && this.data.maxHealth > 1) {
            // **** CHANGE THIS LINE ****
            // Original: this.healthTextEl.setAttribute('value', `${this.currentHealth}/${this.data.maxHealth}`);
            this.healthTextEl.setAttribute('value', `HP: ${this.currentHealth}`); // New Format
             // **** END CHANGE ****
            this.healthTextEl.setAttribute('visible', this.currentHealth > 0); // Also hide if health is 0
        } else if (this.healthTextEl) {
             this.healthTextEl.setAttribute('visible', false);
        }
    },
    // **** END HEALTH TEXT UPDATE FUNCTION ****
    remove: function() {
        if (this.respawnTimer) { clearTimeout(this.respawnTimer); }
        // Decrement count if removed externally AND health was > 0
        if (this.isEnemy && window.enemyManager && this.currentHealth > 0 && !isGameOver) {
             // Only decrement if it wasn't already destroyed by a hit
            window.enemyManager.decrementCount();
            console.warn(`[hit-receiver] Decremented count via REMOVE for ${this.el.id} which had health > 0.`);
        }
    }
});

// priesai juda prie boxto
AFRAME.registerComponent('move-towards-target', {
    schema: {
        target: { type: 'selector' },
        speed: { type: 'number', default: 0.5 }, // Initial speed
        reachDistance: { type: 'number', default: 0.2 } // How close before stopping/destroying
    },
    init: function () {
        this.targetPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();

        // Add class for easy selection
        this.el.classList.add('enemy');
        this.el.setAttribute('visible', true); // Ensure visible on init
        console.log(`[move-towards] Initialized on ${this.el.id || 'enemy'} targeting ${this.data.target?.id || 'null'}. Speed: ${this.data.speed}`);

        if (!this.data.target) {
             console.error(`[move-towards] Target not set for ${this.el.id}`);
        }
    },
    update: function(oldData) {
        // Handle target or speed changes if needed later
         if (oldData.speed !== this.data.speed) {
             console.log(`[move-towards] Speed updated for ${this.el.id} to ${this.data.speed}`);
         }
         if (oldData.target !== this.data.target && !this.data.target) {
             console.error(`[move-towards] Target became null for ${this.el.id}`);
         }
    },
    tick: function (time, timeDelta) {
        const targetEl = this.data.target;
        const el = this.el;

        if (!targetEl || !targetEl.object3D || !el.object3D || timeDelta <= 0 || !el.getAttribute('visible') || isGameOver || isGamePaused) {
            return; // Stop if paused, game over, or other issues
        }
        // **** END PAUSE CHECK ****

        targetEl.object3D.getWorldPosition(this.targetPosition);
        el.object3D.getWorldPosition(this.currentPosition);

        const distanceToTargetSq = this.currentPosition.distanceToSquared(this.targetPosition);

        // Check if reached target
        if (distanceToTargetSq < (this.data.reachDistance * this.data.reachDistance)) {
            console.log(`%c[move-towards] ${el.id || 'Enemy'} reached target!`, "color: red; font-weight: bold;");

            // **** CALL TOWER HIT ****
            window.towerHit(); // Use window.
            // **** END CALL TOWER HIT ****

            // Remove the enemy element
            if (el.parentNode) {
                el.parentNode.removeChild(el);
                // Decrement count is now handled by the component's remove method
                // if (window.enemyManager) window.enemyManager.decrementCount(); // Can remove this line
            }
            return; // Exit tick
        }
        // Calculate direction towards target
        this.direction.copy(this.targetPosition).sub(this.currentPosition).normalize();

        // Calculate movement distance
        const moveDistance = this.data.speed * (timeDelta / 1000);

        // Move the element
        el.object3D.position.addScaledVector(this.direction, moveDistance);

    },
    remove: function() {
        // Cleanup if needed
        console.log(`[move-towards] ${this.el.id || 'Enemy'} removed.`);
        // Ensure count is decremented if removed externally (e.g., by hit-receiver)
        if (window.enemyManager && !isGameOver) {
            // Decrement count is now handled by hit-receiver remove if health > 0,
            // but keep this for cases where the enemy might be removed by other means
            // without health reaching zero.
            // window.enemyManager.decrementCount(); // Consider if still needed
        }
    }
});

// **** NEW: Auto Shooter Component ****
AFRAME.registerComponent('auto-shooter', {
    schema: {
        shootDelay: { type: 'number', default: 1000 }, // Configurable delay (ms)
        targetSelector: { type: 'string', default: '.enemy' },
        projectileSpeed: { type: 'number', default: 8.0 },
        projectileLifetime: { type: 'number', default: 4000.0 },
        projectileRadius: { type: 'number', default: 0.08 },
        projectileColor: { type: 'string', default: '#FF8C00' } // Dark Orange
    },

    init: function () {
        console.log(`AUTO-SHOOTER INIT: Initializing on ${this.el.id}`); // <-- ADD LOG
        this.lastShotTime = 0;
        this.targets = [];
        this.shooterWorldPos = new THREE.Vector3();
        this.targetWorldPos = new THREE.Vector3();
        this.shootDirection = new THREE.Vector3();
        this.projectileStartPos = new THREE.Vector3();
        console.log(`[auto-shooter] Initialized on ${this.el.id}. Shoot Delay: ${this.data.shootDelay}ms`);

    },

    tick: function (time, timeDelta) {
        // --- Basic Checks ---
        //onsole.log(`AUTO-SHOOTER TICK: Running at time ${time.toFixed(0)}`); // <-- ADD LOG (Uncomment temporarily, can be very noisy)
        // --- Basic Checks ---
        if (isGameOver || isGamePaused || !isGameSetupComplete || !this.el.object3D?.visible) {
            // console.log(`AUTO-SHOOTER TICK: Paused/Stopped`); // Optional debug
            return;
        }

        // --- Rate Limiting ---
        if (time < this.lastShotTime + this.data.shootDelay) {
            // console.log(`AUTO-SHOOTER TICK: Waiting for delay`); // Optional debug
            return;
        }

        // --- Find Targets (Periodically Refresh List) ---
        const potentialTargets = this.el.sceneEl.querySelectorAll(this.data.targetSelector); // e.g., ".enemy"

        if (potentialTargets.length === 0) {
             // console.log(`AUTO-SHOOTER TICK: Found 0 potential targets matching "${this.data.targetSelector}"`); // Optional debug
            return; // No potential targets at all
        }

        // --- Find Closest Target ---
        let closestTarget = null;
        let minDistanceSq = Infinity;
        this.el.object3D.getWorldPosition(this.shooterWorldPos);
        let visibleTargetCount = 0; // Counter for logging

        for (const targetEl of potentialTargets) {
            // Check if the target element and its 3D object exist AND if its object3D is actually visible
            if (!targetEl?.object3D || !targetEl.object3D.visible) {
                continue; // Skip this target if not valid or not visible in the 3D scene
            }

            // If it passed the visibility check, count it and check distance
            visibleTargetCount++;
            targetEl.object3D.getWorldPosition(this.targetWorldPos);
            const distanceSq = this.shooterWorldPos.distanceToSquared(this.targetWorldPos);

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestTarget = targetEl;
            }
        }


                // Log how many targets were actually visible after filtering
        if (visibleTargetCount > 0) {
             console.log(`AUTO-SHOOTER TICK: Found ${visibleTargetCount} visible targets after filtering.`); // <-- NEW LOG
        } else if (potentialTargets.length > 0) {
             console.log(`AUTO-SHOOTER TICK: Found ${potentialTargets.length} potential targets, but 0 were visible via object3D.visible.`); // <-- NEW LOG
             return; // No visible targets found
        }


        // --- Shoot if a Target Was Found ---
 // --- Shoot if a Closest Visible Target Was Found ---
 if (closestTarget) {
    console.log(`AUTO-SHOOTER TICK: Closest visible target is ${closestTarget.id}. Firing!`); // <-- UPDATED LOG

    // Calculate direction
    closestTarget.object3D.getWorldPosition(this.targetWorldPos);
    this.shootDirection.copy(this.targetWorldPos).sub(this.shooterWorldPos).normalize();

    // Create projectile
    const projectile = document.createElement('a-sphere');
    projectile.setAttribute('radius', this.data.projectileRadius);
    projectile.setAttribute('color', this.data.projectileColor);
    projectile.setAttribute('material', 'shader: flat;');

    // Calculate start position
    const startOffset = 0.2;
    this.projectileStartPos.copy(this.shooterWorldPos).addScaledVector(this.shootDirection, startOffset);
    projectile.setAttribute('position', this.projectileStartPos);

    // Attach the projectile-hitter component
    projectile.setAttribute('projectile-hitter', {
        direction: this.shootDirection.clone(),
        speed: this.data.projectileSpeed,
        lifetime: this.data.projectileLifetime,
        targetSelector: this.data.targetSelector
    });

    // Add to scene and update time
    this.el.sceneEl.appendChild(projectile);
    this.lastShotTime = time;
} else if (visibleTargetCount > 0) {
     // This case shouldn't happen if visibleTargetCount > 0, but good for debugging
     console.log(`AUTO-SHOOTER TICK: Found ${visibleTargetCount} visible targets, but failed to select closest.`);
}
}, // End tick function

    remove: function() {
         console.log(`[auto-shooter] Removed from ${this.el.id}`);
    }
});
// **** END NEW COMPONENT ****

// --- Global Scope Variables & Functions ---
let score = 0;
let currentLevel = 1; // Start at level 1
const MAX_LEVEL = 100; // **** NEW: Max level constant ****
let scoreForNextLevel = 10; // **** NEW: Score needed for next level ****
let scoreGap = 10;          // **** NEW: Score increase required for last level ****

// --- Health Variables (Keep Existing) ---
const TOWER_MAX_HEALTH = 10;
let currentMaxTowerHealth = TOWER_MAX_HEALTH;
let currentTowerHealth = TOWER_MAX_HEALTH;

const UPGRADE_UNLOCKS = { // Define unlock levels
    SLOW_TURRET: 3,
    SECOND_SHOOTER: 4,
    SHOOTER_DAMAGE_1: 5,
    SHOOTER_DAMAGE_2: 6
};

let upgradeShooter1Placed = false;
let upgradeShooter2Placed = false;
let upgradeSlowTurretPlaced = false;
let shooterLevel = 0; // Tracks speed/damage upgrades
let playerDamageLevel = 0; // Tracks number of times player damage was upgraded
let slowTurretLevel = 0; // Tracks slow turret upgrades (speed/slow amount)
let nextShooterUpgradeLevel = 3; // Start checking for shooter upgrade availability from level 3
let nextSlowTurretUpgradeLevel = UPGRADE_UNLOCKS.SLOW_TURRET + 3; // Start checking 3 levels after placement unlock

// --- Game State Variables (Keep Existing) ---
let isGameSetupComplete = false;
let towerPlaced = false;
let placedTowerEl = null;
let isGamePaused = false;
let placingUpgrade = null; // 'shooter1', 'shooter2', 'slowTurret'
let placedUpgradeEl = null; // Visual element during placement
let activeShooterUpgrades = []; // Array to hold references to functional shooter entities
let activeSlowTurrets = []; // Array to hold references to functional slow turrets
let isGameOver = false;

// --- Debounce Variables (Keep Existing) ---
let lastSelectTime = 0;
const SELECT_DEBOUNCE_MS = 100;

// --- UI Element References (Initialize as null) ---
let scoreDisplayEl = null;
let levelUpPopupEl = null;
let levelNumberEl = null;
let levelUpTimeout = null;
let towerHealthIndicatorEl = null;
let gameOverScreenEl = null;
let finalScoreEl = null;
let upgradesPopupEl = null;
let confirmPlacementAreaEl = null;
let confirmPlacementButtonEl = null;
// References for NEW upgrade buttons
let upgradeShooterBtn = null; // Renamed to match grid
let upgradeHealthBtn = null;
let upgradeSlowerBtn = null;
let upgradePlayerDamageBtn = null;
let closeUpgradePopupBtnEl = null;
let manualUpgradesButtonEl = null;
let levelDisplayEl = null;

window.enemyManager = {
    activeEnemies: 0,
    maxEnemies: 8,
    spawnInterval: 1000,
    spawnTimerId: null,
    baseSpeed: 0.5,
    speedMultiplier: 1.0,
    decrementCount: function() {
        this.activeEnemies = Math.max(0, this.activeEnemies - 1);
    }
};

// ========================================================
// ========== GLOBAL FUNCTION DEFINITIONS =================
// ========================================================
// (Attaching to window object)
window.updateScoreDisplay = function() {
    scoreDisplayEl = scoreDisplayEl || document.getElementById('score-display');
    if (scoreDisplayEl) {
        scoreDisplayEl.textContent = `Score: ${score}`;
    }
};

window.updateLevelDisplay = function() { // **** NEW **** Attached to window
    levelDisplayEl = levelDisplayEl || document.getElementById('level-display');
    if (levelDisplayEl) {
        levelDisplayEl.textContent = `Level: ${currentLevel}`;
    } else {
        // Log an error only once if it's persistently missing after initial load
        if (!window._levelElWarned) {
             console.error("Level display element (#level-display) not found!");
             window._levelElWarned = true;
        }
    }
};

// Function to calculate the score needed TO REACH a specific level
window.calculateScoreForLevel = function(targetLevel) {
    if (targetLevel <= 1) return 0;
    if (targetLevel > MAX_LEVEL) targetLevel = MAX_LEVEL;
    let scoreThreshold = 0;
    let currentGap = 10;
    for (let level = 1; level < targetLevel; level++) {
        scoreThreshold += currentGap;
        if (level >= 4) {
            currentGap = Math.round(currentGap * 1.5);
        }
    }
    return scoreThreshold;
};

// Function to update level state based on score
window.updateLevelingState = function() {
    if (currentLevel >= MAX_LEVEL || isGameOver) return;
    if (score >= scoreForNextLevel) {
        const oldLevel = currentLevel;
        currentLevel++;
        console.log(`%cLEVEL UP! Reached Level ${currentLevel} at Score ${score}`, "color: lime; font-weight: bold;");
        window.updateLevelDisplay();
        window.showLevelUpPopup(currentLevel);
        window.increaseEnemySpeed();
        if (currentLevel < MAX_LEVEL) {
            if (oldLevel < 4) { scoreGap = 10; }
            else { scoreGap = Math.round(scoreGap * 1.5); }
            scoreForNextLevel += scoreGap;
            console.log(`Next level (${currentLevel + 1}) requires score: ${scoreForNextLevel} (Gap: ${scoreGap})`);
        } else {
            console.log("Max Level Reached!");
            scoreForNextLevel = Infinity;
        }
        window.showUpgradePopup(true); // Show upgrade choices on level up
    }
};

// Function to show the level up popup
window.showLevelUpPopup = function(level) {
    const popupEl = document.getElementById('level-up-popup');
    const levelNumEl = document.getElementById('level-number');
    if (popupEl && levelNumEl) {
        levelNumEl.textContent = `Level: ${level}`;
        popupEl.style.display = 'block';
        void popupEl.offsetWidth; // Reflow
        if (levelUpTimeout) clearTimeout(levelUpTimeout);
        levelUpTimeout = setTimeout(() => {
            if (popupEl) popupEl.style.display = 'none';
            levelUpTimeout = null;
        }, 1500); // Slightly longer display time
    } else {
        console.error("Could not find level-up popup elements!", { popupEl, levelNumEl });
    }
};

// Function to increase enemy speed
window.increaseEnemySpeed = function() {
    window.enemyManager.speedMultiplier *= 1.3; // Slightly reduced increase per level
    console.log(`New enemy speed multiplier: ${window.enemyManager.speedMultiplier.toFixed(2)}`);
    const activeEnemies = document.querySelectorAll('.enemy');
    activeEnemies.forEach(enemyEl => {
        if (enemyEl.components['move-towards-target']) {
            const currentBaseSpeed = window.enemyManager.baseSpeed;
            const newSpeed = currentBaseSpeed * window.enemyManager.speedMultiplier;
            enemyEl.setAttribute('move-towards-target', 'speed', newSpeed);
        }
    });
};

// Modified incrementScore to check for level up
window.incrementScore = function() {
    if (isGameOver) return;
    score++;
    console.log("Score increased to:", score);
    window.updateScoreDisplay();
    window.updateLevelingState();
};


window.updateTowerHealthUI = function() {
    towerHealthIndicatorEl = towerHealthIndicatorEl || document.getElementById('tower-health-indicator');
    if (towerHealthIndicatorEl) {
        towerHealthIndicatorEl.textContent = `Gyvybė: ${currentTowerHealth}/${currentMaxTowerHealth}`;
        towerHealthIndicatorEl.style.display = isGameSetupComplete && !isGameOver ? 'block' : 'none';
        const healthPercent = currentMaxTowerHealth > 0 ? (currentTowerHealth / currentMaxTowerHealth) : 0;
        if (healthPercent > 0.6) towerHealthIndicatorEl.style.backgroundColor = 'rgba(0, 150, 0, 0.7)';
        else if (healthPercent > 0.3) towerHealthIndicatorEl.style.backgroundColor = 'rgba(180, 130, 0, 0.7)';
        else towerHealthIndicatorEl.style.backgroundColor = 'rgba(150, 0, 0, 0.7)';
    }
};

window.towerHit = function() {
    if (isGameOver) return;
    currentTowerHealth--;
    console.log(`%cTower Hit! Health: ${currentTowerHealth}/${currentMaxTowerHealth}`, "color: orange; font-weight: bold;");
    window.updateTowerHealthUI();
    if (currentTowerHealth <= 0) {
        window.gameOver();
    }
};

window.gameOver = function() {
    if (isGameOver) return;
    console.log("%cGAME OVER!", "color: red; font-size: 1.5em; font-weight: bold;");
    isGameOver = true;
    if (window.enemyManager.spawnTimerId) {
        clearInterval(window.enemyManager.spawnTimerId);
        window.enemyManager.spawnTimerId = null;
    }
    document.querySelectorAll('.enemy').forEach(enemy => {
        if (enemy.components['move-towards-target']) enemy.removeAttribute('move-towards-target');
    });
    const controlsWidget = document.getElementById('controls-widget');
    if (controlsWidget) controlsWidget.style.display = 'none';
    window.updateTowerHealthUI();
    gameOverScreenEl = gameOverScreenEl || document.getElementById('game-over-screen');
    finalScoreEl = finalScoreEl || document.getElementById('final-score');
    if (gameOverScreenEl && finalScoreEl) {
        finalScoreEl.textContent = `Tavo taškai: ${score}`;
        gameOverScreenEl.style.display = 'block';
    }
};

window.showUpgradePopup = function(pauseGame = false) {
    if (isGameOver) return;
    console.log(`Showing Upgrade Popup... (Pause: ${pauseGame})`);
    if (pauseGame && !isGamePaused) {
        isGamePaused = true;
        if (window.enemyManager.spawnTimerId) {
            clearInterval(window.enemyManager.spawnTimerId);
            window.enemyManager.spawnTimerId = null;
        }
        const controlsWidget = document.getElementById('controls-widget');
        if (controlsWidget) controlsWidget.style.display = 'none';
    }
    upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
    if (!upgradesPopupEl) { console.error("Upgrade popup element not found!"); return; }

    window.updateUpgradePopupButtonStates(); // Update button states before showing

    upgradesPopupEl.style.display = 'block';
    if (pauseGame) {
        const reticleEl = document.getElementById('placement-reticle');
        if (reticleEl) reticleEl.setAttribute('visible', 'false');
    }
};

// **** NEW: Helper function to update button states ****
window.updateUpgradePopupButtonStates = function() {
    // Get fresh references (important if called before DOMContentLoaded finishes fully)
    upgradeShooterBtn = upgradeShooterBtn || document.getElementById('upgradeShooter');
    upgradeHealthBtn = upgradeHealthBtn || document.getElementById('upgradeHealth');
    upgradeSlowerBtn = upgradeSlowerBtn || document.getElementById('upgradeSlower');
    upgradePlayerDamageBtn = upgradePlayerDamageBtn || document.getElementById('upgradePlayerDamage');

    // --- Logic for each button ---

    // SHOOTER Button Logic
    let shooterText = "SHOOTER";
    let shooterDesc = "";
    let shooterAvailable = false;
    let shooterNextLvl = -1;

    if (!upgradeShooter1Placed) {
        shooterAvailable = true; // Can always place the first one
        shooterDesc = "Padėti pirmą bokštą";
    } else if (!upgradeShooter2Placed && currentLevel >= UPGRADE_UNLOCKS.SECOND_SHOOTER) {
        shooterAvailable = true;
        shooterDesc = "Padėti antrą bokstą";
    } else if (!upgradeShooter2Placed && currentLevel < UPGRADE_UNLOCKS.SECOND_SHOOTER) {
        shooterAvailable = false;
        shooterDesc = "Padėti pirmą bosktą"; // Show Place 1st as disabled until Lv 10
        shooterNextLvl = UPGRADE_UNLOCKS.SECOND_SHOOTER;
    } else { // Both placed, check for upgrades
        if (currentLevel >= nextShooterUpgradeLevel) {
             shooterAvailable = true;
             // Determine next upgrade type based on shooterLevel or specific level thresholds
             if (currentLevel >= UPGRADE_UNLOCKS.SHOOTER_DAMAGE_2 && shooterLevel >= 2) { // Example threshold check
                 shooterDesc = "(+20% Turret Damage)";
                 shooterLevel = 2; // Max level for now
             } else if (currentLevel >= UPGRADE_UNLOCKS.SHOOTER_DAMAGE_1 && shooterLevel >= 1) {
                 shooterDesc = "(+30% Turret Damage)";
                 shooterLevel = 1;
             } else {
                 shooterDesc = "(Increase Turret Speed)";
                 shooterLevel = 0;
             }
        } else {
            shooterAvailable = false;
            shooterDesc = "(Upgrade Turrets)";
            shooterNextLvl = nextShooterUpgradeLevel;
        }
    }
    window.setUpgradeButtonState(upgradeShooterBtn, shooterText, shooterDesc, shooterAvailable, shooterNextLvl);


    // HEALTH Button Logic (Always available)
    window.setUpgradeButtonState(upgradeHealthBtn, "HEALTH", "(+3 Max HP)", true);

    // SLOWER Button Logic
    let slowerText = "SLOWER";
    let slowerDesc = "";
    let slowerAvailable = false;
    let slowerNextLvl = -1;

    if (!upgradeSlowTurretPlaced) {
        if (currentLevel >= UPGRADE_UNLOCKS.SLOW_TURRET) {
            slowerAvailable = true;
            slowerDesc = "(Padėti letintojo bokštą)";
        } else {
            slowerAvailable = false;
            slowerDesc = "(Padėti letintojo bokštą)";
            slowerNextLvl = UPGRADE_UNLOCKS.SLOW_TURRET;
        }
    } else { // Placed, check for upgrades
        if (currentLevel >= nextSlowTurretUpgradeLevel) {
            slowerAvailable = true;
            slowerDesc = "Atnaujinti lėtą bokštą"; // Speed + Slow %
        } else {
            slowerAvailable = false;
            slowerDesc = "Atnaujinti lėtą bokštą";
            slowerNextLvl = nextSlowTurretUpgradeLevel;
        }
    }
     window.setUpgradeButtonState(upgradeSlowerBtn, slowerText, slowerDesc, slowerAvailable, slowerNextLvl);


    // PLAYER DAMAGE Button Logic (Always available)
     window.setUpgradeButtonState(upgradePlayerDamageBtn, "DAMAGE", "(+15% Žaidėjo Damage)", true);

};
// Helper to set state for a single upgrade button
window.setUpgradeButtonState = function(buttonEl, title, description, available, nextLevel = -1) {
    if (!buttonEl) return;

    const titleSpan = buttonEl.querySelector('span:not(.upgrade-desc):not(.upgrade-desc-level)'); // Exclude both desc spans
    const descSpan = buttonEl.querySelector('.upgrade-desc');
    const levelDescSpan = buttonEl.querySelector('.upgrade-desc-level'); // Get the new span

    if (titleSpan) titleSpan.textContent = title;

    if (available) {
        buttonEl.disabled = false;
        buttonEl.classList.remove('disabled:bg-gray-700', 'disabled:text-gray-500', 'disabled:border-gray-600', 'disabled:opacity-70', 'disabled:cursor-not-allowed'); // Updated Tailwind classes
        if (descSpan) descSpan.textContent = description;
        if (levelDescSpan) levelDescSpan.style.display = 'none'; // Hide level requirement
    } else {
        buttonEl.disabled = true;
        buttonEl.classList.add('disabled:bg-gray-700', 'disabled:text-gray-500', 'disabled:border-gray-600', 'disabled:opacity-70', 'disabled:cursor-not-allowed'); // Updated Tailwind classes
        if (descSpan) descSpan.textContent = description; // Show base description
        if (levelDescSpan) { // Show level requirement in its dedicated span
            if (nextLevel > 0) {
                levelDescSpan.textContent = `(Unlock at Lv ${nextLevel})`;
                levelDescSpan.style.display = 'block';
            } else {
                 levelDescSpan.style.display = 'none'; // Hide if no specific level needed but still disabled
            }
        }
    }
};

window.enableUpgradeButton = function (buttonEl, enabledCondition, levelReq, isDisabledOverride = false) {
    if (!buttonEl) return;
    const levelMet = currentLevel >= levelReq;
    const shouldBeEnabled = enabledCondition && levelMet && !isDisabledOverride;
    buttonEl.disabled = !shouldBeEnabled;
    buttonEl.classList.toggle('disabled-upgrade', !shouldBeEnabled); // Use specific disable class if not using Tailwind selectors
    const descSpan = buttonEl.querySelector('.upgrade-desc');
    if (descSpan) {
        // (Existing logic to show Lv required can be adapted or removed if new function handles it)
         if (!levelMet && descSpan.textContent.indexOf('Lv') === -1) { // Prevent overwriting if already set
             // Store original text? For now, just set it.
             // buttonEl.dataset.originalDesc = descSpan.textContent; // Example storage
             descSpan.textContent = `(Lv ${levelReq} Required)`;
         } else if (levelMet && buttonEl.dataset.originalDesc){
              // Restore original text? Needs robust implementation.
              // descSpan.textContent = buttonEl.dataset.originalDesc;
         }
    }
};

// **** PASTE resumeGame HERE ****
window.resumeGame = function(forceClosePopup = true) {
    if (isGameOver) return;
    console.log("Resuming game...");
    isGamePaused = false;
    placingUpgrade = null;
    if (forceClosePopup) {
        upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
        if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
    }
    confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
    if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'none';
    const feedbackEl = document.getElementById('scanning-feedback');
    if (feedbackEl) feedbackEl.style.display = 'none';
    const reticleEl = document.getElementById('placement-reticle');
    if (reticleEl) reticleEl.setAttribute('visible', false);
    const controlsWidget = document.getElementById('controls-widget');
    if (controlsWidget) controlsWidget.style.display = 'block';
    if (isGameSetupComplete && !isGameOver && !window.enemyManager.spawnTimerId) {
        window.enemyManager.spawnTimerId = setInterval(window.spawnEnemy, window.enemyManager.spawnInterval);
        console.log("Enemy spawner resumed.");
    }
};


// **** ADD GAME RESET LOGIC ****
window.resetGame = function() {
    console.log("Resetting game...");
    isGameOver = false;
    isGameSetupComplete = false;
    towerPlaced = false;
    score = 0;
    currentLevel = 1;
    scoreForNextLevel = 10;
    scoreGap = 10;
    currentMaxTowerHealth = TOWER_MAX_HEALTH;
    currentTowerHealth = TOWER_MAX_HEALTH;
    window.enemyManager.activeEnemies = 0;
    window.enemyManager.speedMultiplier = 1.0;
    isGamePaused = false;
    placingUpgrade = null;
    // Reset upgrade states
    upgradeShooter1Placed = false;
    upgradeShooter2Placed = false;
    upgradeSlowTurretPlaced = false;
    shooterLevel = 0;
    playerDamageLevel = 0;
    slowTurretLevel = 0;
    nextShooterUpgradeLevel = 3;
    nextSlowTurretUpgradeLevel = UPGRADE_UNLOCKS.SLOW_TURRET + 3;


    if (window.enemyManager.spawnTimerId) { clearInterval(window.enemyManager.spawnTimerId); window.enemyManager.spawnTimerId = null; }
    if (gameOverScreenEl) gameOverScreenEl.style.display = 'none';
    if (placedTowerEl && placedTowerEl.parentNode) placedTowerEl.parentNode.removeChild(placedTowerEl);
    placedTowerEl = null;
    activeShooterUpgrades.forEach(shooter => { if (shooter.parentNode) shooter.parentNode.removeChild(shooter); });
    activeShooterUpgrades = [];
    activeSlowTurrets.forEach(turret => { if (turret.parentNode) turret.parentNode.removeChild(turret); }); // Remove slow turrets
    activeSlowTurrets = [];
    console.log("Removed active upgrades.");

    const entitiesToRemove = document.querySelectorAll('.enemy, [projectile-hitter]');
    entitiesToRemove.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
    console.log(`Removed ${entitiesToRemove.length} enemies/projectiles.`);

    window.updateScoreDisplay();
    window.updateTowerHealthUI();
    window.updateLevelDisplay();
    if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        if (controlsWidget) controlsWidget.style.display = 'none';
        if (shootButton) shootButton.disabled = true;
        if (startGameButton) startGameButton.disabled = true;
        if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none';
        window.updateTowerHealthUI();
        const reticleEl = document.getElementById('placement-reticle');
        if (reticleEl) reticleEl.setAttribute('visible', false);
    } else {
        const controlsWidget = document.getElementById('controls-widget');
        if (controlsWidget) controlsWidget.style.display = 'block';
    }
};



window.spawnEnemy = function() { // Attached to window
    // --- Initial Checks ---
    if (!isGameSetupComplete || !placedTowerEl?.object3D || !sceneElGlobal || isGamePaused) return;
    const manager = window.enemyManager;
    if (manager.activeEnemies >= manager.maxEnemies) { return; }

    const sceneEl = sceneElGlobal;
    const cameraEl = document.getElementById('player-camera');
    if (!cameraEl?.object3D) return;

    const enemyContainer = document.getElementById('enemies') || sceneEl;

    // --- Target & Spawn Calculation Vectors ---
    // (Vectors remain the same: camPos, camDir, towerPos, towerToCamDir, etc.)
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const towerPos = new THREE.Vector3();
    const towerToCamDir = new THREE.Vector3();
    const spawnBaseDir = new THREE.Vector3();
    const spawnOffsetDir = new THREE.Vector3();
    const spawnPos = new THREE.Vector3();
    const camToSpawnDir = new THREE.Vector3();

    // Get world positions/directions
    cameraEl.object3D.getWorldPosition(camPos);
    cameraEl.object3D.getWorldDirection(camDir);
    placedTowerEl.object3D.getWorldPosition(towerPos);

    // --- Calculate Spawn Position (Logic remains the same) ---
    // 1. Base Direction
    towerToCamDir.copy(camPos).sub(towerPos);
    if (towerToCamDir.lengthSq() < 0.1) {
        spawnBaseDir.copy(camDir).negate();
        console.warn("Camera close to tower, using inverted camera forward for spawn base direction.");
    } else {
        spawnBaseDir.copy(towerToCamDir).normalize().negate();
    }
    spawnBaseDir.y = 0;
    spawnBaseDir.normalize();
    // 2. Angular Offset
    const angleRange = Math.PI / 3.0;
    const randomAngle = (Math.random() - 0.5) * angleRange;
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    spawnOffsetDir.copy(spawnBaseDir).applyAxisAngle(rotationAxis, randomAngle);
    // 3. Spawn Distance
    const spawnDistance = 12 + Math.random() * 6;
    // 4. Calculate Final Spawn Position
    spawnPos.copy(towerPos).addScaledVector(spawnOffsetDir, spawnDistance);

    // --- Validation Checks (Logic remains the same) ---
    // A. Behind tower check
    towerToCamDir.copy(camPos).sub(towerPos).normalize();
    const towerToSpawnDir = new THREE.Vector3().copy(spawnPos).sub(towerPos).normalize();
    const dotSideCheck = towerToCamDir.dot(towerToSpawnDir);
    if (dotSideCheck > -0.2) {
        // console.warn(`Spawn rejected: Not clearly behind tower relative to cam (dotSideCheck: ${dotSideCheck.toFixed(2)}). Retrying.`); // Less verbose logging
        // Consider trying again instead of just returning
        setTimeout(window.spawnEnemy, 50); // Retry slightly later
        return;
    }
    // B. Min distance from Camera
    const minCamDistSq = 5 * 5;
    if (spawnPos.distanceToSquared(camPos) < minCamDistSq) {
        // console.warn("Spawn rejected: Too close to the camera. Retrying.");
        setTimeout(window.spawnEnemy, 50); // Retry slightly later
        return;
    }
    // C. Min distance from Tower
    const minDistTowerSq = 6 * 6;
    if (spawnPos.distanceToSquared(towerPos) < minDistTowerSq) {
        // console.warn(`Spawn rejected: Calculated position too close to tower (DistSq: ${spawnPos.distanceToSquared(towerPos).toFixed(2)}). Retrying.`);
       setTimeout(window.spawnEnemy, 50); // Retry slightly later
       return;
    }
    // D. Check camera view
    camToSpawnDir.copy(spawnPos).sub(camPos).normalize();
    const dotCamView = camDir.dot(camToSpawnDir);
     // Allow spawning slightly behind the direct view to make it harder
    if (dotCamView > 0.3) { // More lenient check (acos(0.3) ~ 72 degrees)
        // console.warn(`Spawn rejected: Position outside forward camera view cone (dotCamView: ${dotCamView.toFixed(2)}). Retrying.`);
        setTimeout(window.spawnEnemy, 50); // Retry slightly later
        return;
    }

    // Clamp Y position
    spawnPos.y = THREE.MathUtils.clamp(towerPos.y + 0.5 + (Math.random() - 0.5) * 1.5, 0.2, 3.0);

    // --- Create Enemy (If validation passed) ---
    console.log(`Spawn validation passed. Spawning check at: ${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)}`);

    // --- *** Determine Enemy Type based on Score *** ---
    let enemyType = 'basic';
    let enemyHealth = 1;
    let enemyColor = `hsl(${Math.random() * 360}, 70%, 60%)`; // Default basic color
    let enemyScale = '0.25 0.25 0.25';
    let enemyShape = 'box'; // Default basic shape

    const SCORE_THRESHOLD_TOUGHEST = 30;
    const SCORE_THRESHOLD_TOUGH = 10;
    const randomRoll = Math.random(); // Roll once for chance checks

    // 1. Check for Toughest Enemy
    if (score >= SCORE_THRESHOLD_TOUGHEST) {
        const baseChanceToughest = 0.2; // 50% at score 30
        const scoreAboveThreshold = score - SCORE_THRESHOLD_TOUGHEST;
        const additionalChance = Math.floor(scoreAboveThreshold / 5) * 0.05; // +5% for every 5 points above 30
        const toughestSpawnChance = Math.min(1.0, baseChanceToughest + additionalChance); // Cap at 100%

        console.log(`Score ${score}, Toughest Chance: ${(toughestSpawnChance * 100).toFixed(0)}%`); // Log chance

        if (randomRoll < toughestSpawnChance) {
            enemyType = 'toughest';
            enemyHealth = 7; // Give it more health
            enemyColor = '#FFA500'; // Neon Orange
            enemyScale = '0.45 0.45 0.45'; // Make it larger
            enemyShape = 'dodecahedron'; // Make it a distinct shape
            console.log('%c--> Spawning TOUGHEST Enemy!', 'color: #FFA500; font-weight: bold;');
        }
    }

    // 2. Check for Tough Enemy (only if Toughest didn't spawn)
    if (enemyType === 'basic' && score >= SCORE_THRESHOLD_TOUGH) {
        // Note: This chance calculation might overlap with toughest. Adjust if needed.
        // Original tough chance calculation:
        const toughChance = Math.min(0.60, 0.35 + Math.floor((score - SCORE_THRESHOLD_TOUGH) / 5) * 0.07);
        console.log(`Score ${score}, Tough Chance: ${(toughChance * 100).toFixed(1)}%`); // Log chance

        // Roll again? Or use a different part of the original roll? Let's use a separate check for simplicity.
        if (Math.random() < toughChance) { // Separate roll for tough if toughest didn't spawn
            enemyType = 'tough';
            enemyHealth = 3;
            enemyColor = '#8B0000'; // Dark Red
            enemyScale = '0.35 0.35 0.35';
            enemyShape = 'sphere';
            console.log('%c--> Spawning TOUGH Enemy!', 'color: #DC143C; font-weight: bold;');
        }
    }

    // 3. Basic Enemy (Default if others didn't spawn)
    if (enemyType === 'basic') {
         console.log('--> Spawning BASIC Enemy.');
         // Basic attributes are already set by default
    }

    // --- Create Enemy Element ---
    const enemy = document.createElement(`a-${enemyShape}`); // Use determined shape
    const enemyId = `enemy-${enemyType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    enemy.setAttribute('id', enemyId);
    enemy.classList.add('enemy');
    enemy.setAttribute('color', enemyColor); // Use determined color
    enemy.setAttribute('scale', enemyScale); // Use determined scale
    enemy.setAttribute('position', spawnPos);
    enemy.setAttribute('shadow', 'cast: true; receive: false;');
    enemy.setAttribute('visible', 'true');

    // Create Health Indicator if needed
    if (enemyHealth > 1) {
        const healthText = document.createElement('a-text');
        healthText.classList.add('enemy-health-text');
        healthText.setAttribute('value', `HP: ${enemyHealth}`);
        healthText.setAttribute('position', '0 0.6 0'); // Adjust Y offset based on scale if needed
        healthText.setAttribute('scale', '2 2 2');      // Adjust scale relative to parent
        healthText.setAttribute('align', 'center');
        healthText.setAttribute('color', '#FFFFFF');
        healthText.setAttribute('side', 'double');
        healthText.setAttribute('billboard', ''); // Make it face the camera
        enemy.appendChild(healthText);
    }

    // Attach Components
    enemy.setAttribute('hit-receiver', { maxHealth: enemyHealth, initialHealth: enemyHealth });
    enemy.setAttribute('move-towards-target', {
        target: `#${placedTowerEl.id}`,
        speed: manager.baseSpeed * manager.speedMultiplier // Use current speed multiplier
    });

    // Add to Scene
    enemyContainer.appendChild(enemy);
    manager.activeEnemies++;
    console.log(`%cSpawn Successful: ${enemyType} ${enemyId} (HP:${enemyHealth}). Active Count:${manager.activeEnemies}`, "color: cyan;");

}; // End of spawnEnemy

// --- Global Scope Setup for Scene Listeners ---
const sceneElGlobal = document.querySelector('a-scene');
if (!sceneElGlobal) { console.error("FATAL: A-Frame scene not found!"); }
else {
    // --- Attach Core Event Listeners Directly to Scene ---
    sceneElGlobal.addEventListener('enter-vr', () => {
        console.log('Event: enter-vr');
        // Reset state on entering AR
        isGameSetupComplete = false;
        towerPlaced = false;
        placedTowerEl = null;

        const myEnterARButton = document.getElementById('myEnterARButton'); // Get Enter AR button
        const exitVRButton = document.getElementById('exitVRButton');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');

        if (sceneElGlobal.is('ar-mode')) {
            console.log('AR Mode detected. Starting setup phase.');
            if (myEnterARButton) myEnterARButton.style.display = 'none';
            if (exitVRButton) exitVRButton.style.display = 'inline-block';
            if (scanningFeedbackEl) {
                scanningFeedbackEl.textContent = "Skanuojamas paviršius..."; // Update text slightly
                scanningFeedbackEl.style.display = 'block';
            }
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none'; // Ensure hidden
            if (controlsWidget) controlsWidget.style.display = 'none';      // Hide normal controls
            if (shootButton) shootButton.disabled = true;                 // Ensure shoot is disabled
            if (startGameButton) startGameButton.disabled = true;         // Disable start initially
            if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none'; // Hide feedback

            // Ensure reticle is hidden initially
            const reticleEl = document.getElementById('placement-reticle');
            if (reticleEl) reticleEl.setAttribute('visible', false);


        } else {
            console.warn('VR Mode or AR Session Failed.');
             // Hide AR specific UI if entering non-AR mode
             // **** SHOW Enter AR Button / HIDE Exit Button if not AR ****
             if (myEnterARButton) myEnterARButton.style.display = 'inline-block';
             if (exitVRButton) exitVRButton.style.display = 'none';
             // **** ------------------------------------------ ****
             if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
             if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
             if (controlsWidget) controlsWidget.style.display = 'block';
             if (shootButton) shootButton.disabled = false; // Or manage based on game state

        }
    });

    sceneElGlobal.addEventListener('exit-vr', () => {
        console.log('Event: exit-vr');
        // Reset state and hide all AR popups
        isGameSetupComplete = false;
        towerPlaced = false;
        placedTowerEl = null;
        isGameOver = false; // Reset game over flag

        const exitVRButton = document.getElementById('exitVRButton');
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');

        if (exitVRButton) exitVRButton.style.display = 'none';
        if (reticleEl) reticleEl.setAttribute('visible', false);
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        if (controlsWidget) controlsWidget.style.display = 'block'; // Show normal controls again

        if (myEnterARButton) myEnterARButton.style.display = 'inline-block';
        if (exitVRButton) exitVRButton.style.display = 'none';

        gameOverScreenEl = gameOverScreenEl || document.getElementById('game-over-screen');
        towerHealthIndicatorEl = towerHealthIndicatorEl || document.getElementById('tower-health-indicator');
        if (gameOverScreenEl) gameOverScreenEl.style.display = 'none';
        if (towerHealthIndicatorEl) towerHealthIndicatorEl.style.display = 'none';

        // Stop spawner
        if (window.enemyManager.spawnTimerId) {
            clearInterval(window.enemyManager.spawnTimerId);
            window.enemyManager.spawnTimerId = null;
            console.log("Enemy spawner stopped.");
        }
        // Remove existing enemies/shooters on exit
        const entitiesToRemove = document.querySelectorAll('.enemy, [projectile-hitter], [auto-shooter]');
         entitiesToRemove.forEach(enemy => {
             if(enemy.parentNode) enemy.parentNode.removeChild(enemy);
         });
         window.enemyManager.activeEnemies = 0;
         activeShooterUpgrades = [];
         console.log("Cleared existing enemies, projectiles, and shooters.");
    });


    sceneElGlobal.addEventListener('ar-hit-test-start', () => {
        console.log('Event: ar-hit-test-start (Searching...)');
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');

        if (!isGameSetupComplete) { // Only during setup
            if (reticleEl) reticleEl.setAttribute('visible', 'false');
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        }
    });

    sceneElGlobal.addEventListener('ar-hit-test-achieved', () => {
        console.log('Event: ar-hit-test-achieved (Surface Found!)');
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');

        if (!isGameSetupComplete) { // Only during setup
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'block'; // Show Place Tower popup
             if (reticleEl && !towerPlaced) { // Show reticle only if tower not placed yet
                 reticleEl.setAttribute('visible', 'true');
             } else if (reticleEl) {
                 reticleEl.setAttribute('visible', 'false'); // Hide if tower already placed
             }
        } else {
            // Handle hit-test achievement after setup if needed (e.g., for shooter placement)
            if (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') {
                 if (reticleEl) reticleEl.setAttribute('visible', 'true');
             }
             // Handle generic cube placement if feature is re-added
            // const placementCheckbox = document.getElementById('placementModeCheckbox');
            // if (placementCheckbox && placementCheckbox.checked && reticleEl) {
            //    reticleEl.setAttribute('visible', 'true');
            // }
        }
    });

    sceneElGlobal.addEventListener('ar-hit-test-lost', () => {
        console.log('Event: ar-hit-test-lost (Surface Lost)');
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');


        if (!isGameSetupComplete) { // Only during setup
            if (reticleEl) reticleEl.setAttribute('visible', 'false');
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        } else {
             // Handle hit-test lost after setup if needed (e.g. during upgrade placement)
            if (reticleEl) reticleEl.setAttribute('visible', 'false');
        }
    });

// AR Placement Listener - Handles Tower, Upgrade, and Generic Cube placement
sceneElGlobal.addEventListener('ar-hit-test-select', (e) => {
    // --- Debounce Check ---
    const now = performance.now();
    if (now - lastSelectTime < SELECT_DEBOUNCE_MS) { return; }
    lastSelectTime = now;
    console.log("Event: ar-hit-test-select FIRED! (Processed)");

    const sourceEvent = e.detail?.sourceEvent;
    if (sourceEvent && sourceEvent.target) {
        const targetElement = sourceEvent.target;
        const closestPopup = targetElement.closest && (targetElement.closest('#place-tower-popup') || targetElement.closest('#upgrades-popup') || targetElement.closest('#confirm-placement-area') || targetElement.closest('#game-over-screen') || targetElement.closest('#controls-widget'));
        if (closestPopup && targetElement.tagName === 'BUTTON') {
             console.log("DEBUG: Tap occurred on overlay UI BUTTON, ignoring for AR placement/move. RETURNING.");
             return;
        }
    }
      // **** END UI TAP CHECK ****

      const reticleEl = document.getElementById('placement-reticle');
      const scanningFeedbackEl = document.getElementById('scanning-feedback');

    // --- UPGRADE PLACEMENT ---
    if (placingUpgrade && reticleEl && reticleEl.getAttribute('visible')) { // Check if placing *any* upgrade
        const position = reticleEl.getAttribute('position');
        if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { console.error("Upgrade Placement failed: Invalid position.", position); return; }

        if (!placedUpgradeEl) { // First tap for upgrade: Create visual
            let color = '#FF6347'; // Default color (shooter)
            let scale = '0.15 0.15 0.15';
            let height = 0.4;
            if (placingUpgrade === 'slowTurret') {
                color = '#87CEEB'; // Light Blue for slow turret
                scale = '0.2 0.2 0.2';
                height = 0.3;
            }
            console.log(`Placing ${placingUpgrade} upgrade visually...`);
            const upgradeBox = document.createElement('a-box'); // Use box for both for now
            const visualId = `${placingUpgrade}-visual-${Date.now()}`;
            upgradeBox.setAttribute('id', visualId);
            upgradeBox.setAttribute('color', color);
            upgradeBox.setAttribute('scale', scale);
            upgradeBox.setAttribute('height', height);
            upgradeBox.setAttribute('position', position);
            upgradeBox.setAttribute('shadow', 'cast: true; receive: false;');
            sceneElGlobal.appendChild(upgradeBox);
            placedUpgradeEl = upgradeBox;

            const currentConfirmButton = document.getElementById('confirmPlacementButton');
            if (currentConfirmButton) currentConfirmButton.disabled = false;
            if (scanningFeedbackEl) { scanningFeedbackEl.textContent = "Paspausk pakeist poziciją arba pradėk"; }
        } else { // Subsequent taps: Move the visual
             console.log(`Moving ${placingUpgrade} upgrade visual...`);
             placedUpgradeEl.setAttribute('position', position);
        }

    // --- TOWER PLACEMENT / MOVE (Setup Phase) ---
     } else if (!isGameSetupComplete && reticleEl && reticleEl.getAttribute('visible')) {
        const position = reticleEl.getAttribute('position');
        if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
             console.error("Placement/Move failed: Invalid position from reticle.", position); return;
        }
        console.log(`Reticle position for Tower placement/move: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}`);

        if (!towerPlaced) {
            // --- First Tap: Create the Tower ---
            console.log('Setup Phase: Attempting to place TOWER for the first time...');
            const tower = document.createElement('a-box');
            tower.setAttribute('id', 'placed-base-tower');
            tower.setAttribute('color', '#00008B'); // Dark Blue
            // **** USE SMALLER DIMENSIONS ****
            tower.setAttribute('height', '0.5'); // Smaller Height
            tower.setAttribute('width', '0.2');  // Smaller Width/Depth
            tower.setAttribute('depth', '0.2');
            // **** END SMALLER DIMENSIONS ****
            tower.setAttribute('position', position); // Set initial position
            tower.setAttribute('shadow', 'cast: true; receive: false;');

            console.log("Tower attributes set.");
            sceneElGlobal.appendChild(tower);
            placedTowerEl = tower; // Store reference
            towerPlaced = true; // Mark as placed
            console.log('Tower successfully placed.');

            // Update UI: Enable Start button, show feedback
            const startGameButton = document.getElementById('startGameButton');
            const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
            // **** Enable Start Game Button ****
            if (startGameButton) {
                 console.log("Attempting to enable Start Game button...");
                 startGameButton.disabled = false;
                 console.log("Start Game button enabled (disabled=false).");
            } else {
                 console.error("Start Game Button not found when trying to enable!");
            }
            // **** End Enable Start Game Button ****
            if (towerPlacedFeedback) {
                towerPlacedFeedback.textContent = "Bokštas padėtas! Paspausk kitur pakeiti jo pozicija arba pradėk žaist."; // Update feedback text
                towerPlacedFeedback.style.display = 'block';
            }
             // Keep reticle visible after first placement for moving
             if(reticleEl) reticleEl.setAttribute('visible', 'true');

        } else if (placedTowerEl) {
             // --- Subsequent Taps: Move the Existing Tower ---
             console.log('Setup Phase: Moving existing tower...');
             placedTowerEl.setAttribute('position', position); // Update position
             console.log('Tower position updated.');
        }

    // --- GENERIC CUBE PLACEMENT (Game Phase, if enabled and not paused - remove if feature unused) ---
    } else if (isGameSetupComplete && !isGamePaused) {
        // const placementCheckbox = document.getElementById('placementModeCheckbox');
        // const isPlacementMode = placementCheckbox && placementCheckbox.checked;
        const isPlacementMode = false; // Disable this if checkbox is removed
        const isReticleVisible = reticleEl && reticleEl.getAttribute('visible');

        if (isPlacementMode && isReticleVisible) {
            // console.log('Game Phase: Placing generic cube...'); // Code kept if feature re-added
            // const position = reticleEl.getAttribute('position');
            //  if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { console.error("Generic Cube Placement failed: Invalid position from reticle.", position); return; }
            //  const newBox = document.createElement('a-box');
            //  newBox.classList.add('interactive');
            //  newBox.setAttribute('position', position);
            //  newBox.setAttribute('scale', '0.2 0.2 0.2');
            //  newBox.setAttribute('color', '#228B22'); // Forest Green
            //  newBox.setAttribute('shadow', 'cast: true; receive: false;');
            //  sceneElGlobal.appendChild(newBox);
            //  console.log('New generic cube successfully appended.');
        } else {
             // console.log(`Game phase placement check failed or not active.`);
        }
    } else {
        console.log("Tap ignored: Conditions not met (Setup, Upgrade Placement, Game Phase checks failed).");
    }
}); // End COMBINED ar-hit-test-select listener
}

// --- Run Setup After DOM Loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI listeners and initial state...");
    // --- Get Element References ---
    const sceneInstance = sceneElGlobal || document.querySelector('a-scene');
    const overlay = document.getElementById('dom-overlay');
    const exitVRButton = document.getElementById('exitVRButton');
    const shootButton = document.getElementById('shootButton');
    const cameraEl = document.getElementById('player-camera');
    const cameraMarkerEl = document.getElementById('camera-aim-marker');
    const controlsWidget = document.getElementById('controls-widget');
    const placeTowerPopupEl = document.getElementById('place-tower-popup');
    const startGameButton = document.getElementById('startGameButton');
    const scanningFeedbackEl = document.getElementById('scanning-feedback');
    const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
    const tryAgainButton = document.getElementById('tryAgainButton');
    towerHealthIndicatorEl = document.getElementById('tower-health-indicator');
    gameOverScreenEl = document.getElementById('game-over-screen');
    finalScoreEl = document.getElementById('final-score');
    scoreDisplayEl = document.getElementById('score-display');
    levelUpPopupEl = document.getElementById('level-up-popup');
    levelNumberEl = document.getElementById('level-number');
    upgradesPopupEl = document.getElementById('upgrades-popup');
    confirmPlacementAreaEl = document.getElementById('confirm-placement-area');
    confirmPlacementButtonEl = document.getElementById('confirmPlacementButton');
    // Get NEW upgrade button references
    upgradeShooterBtn = document.getElementById('upgradeShooter'); // Use new ID
    upgradeHealthBtn = document.getElementById('upgradeHealth');   // Use new ID
    upgradeSlowerBtn = document.getElementById('upgradeSlower');     // Use new ID
    upgradePlayerDamageBtn = document.getElementById('upgradePlayerDamage'); // Use new ID
    closeUpgradePopupBtnEl = document.getElementById('closeUpgradePopupButton');
    manualUpgradesButtonEl = document.getElementById('manualUpgradesButton');
    levelDisplayEl = document.getElementById('level-display'); // **** NEW ****

     // **** GRANULAR ELEMENT CHECKS ****
     // (Add checks for new button IDs: upgradeShooterBtn, upgradeHealthBtn, upgradeSlowerBtn, upgradePlayerDamageBtn)
     const missingElements = [];
     if (!sceneInstance) missingElements.push("sceneInstance (a-scene)");
     if (!overlay) missingElements.push("overlay (#dom-overlay)");
     if (!startGameButton) missingElements.push("startGameButton (#startGameButton)");
     if (!tryAgainButton) missingElements.push("tryAgainButton (#tryAgainButton)");
     if (!shootButton) missingElements.push("shootButton (#shootButton)");
     if (!placeTowerPopupEl) missingElements.push("placeTowerPopupEl (#place-tower-popup)");
     if (!upgradesPopupEl) missingElements.push("upgradesPopupEl (#upgrades-popup)");
     if (!gameOverScreenEl) missingElements.push("gameOverScreenEl (#game-over-screen)");
     if (!confirmPlacementAreaEl) missingElements.push("confirmPlacementAreaEl (#confirm-placement-area)");
     if (!confirmPlacementButtonEl) missingElements.push("confirmPlacementButtonEl (#confirmPlacementButton)");
     // Check new grid buttons
     if (!upgradeShooterBtn) missingElements.push("upgradeShooterBtn (#upgradeShooter)");
     if (!upgradeHealthBtn) missingElements.push("upgradeHealthBtn (#upgradeHealth)");
     if (!upgradeSlowerBtn) missingElements.push("upgradeSlowerBtn (#upgradeSlower)");
     if (!upgradePlayerDamageBtn) missingElements.push("upgradePlayerDamageBtn (#upgradePlayerDamage)");
     if (!closeUpgradePopupBtnEl) missingElements.push("closeUpgradePopupBtnEl (#closeUpgradePopupButton)");
     if (!manualUpgradesButtonEl) missingElements.push("manualUpgradesButtonEl (#manualUpgradesButton)");
     if (!levelDisplayEl) missingElements.push("levelDisplayEl (#level-display)"); // **** NEW CHECK ****

     // Check display elements
     if (!towerHealthIndicatorEl) missingElements.push("towerHealthIndicatorEl (#tower-health-indicator)");
     if (!scoreDisplayEl) missingElements.push("scoreDisplayEl (#score-display)");
     if (!finalScoreEl) missingElements.push("finalScoreEl (#final-score)");

     if (missingElements.length > 0) {
        console.error(`Essential page element(s) missing! Check IDs in index.html: ${missingElements.join(', ')}`);
        return;
    } else {
        console.log("All essential page elements confirmed.");
    }
     // **** END Granular Element Checks ****


    // Existing vectors for shooting (no change needed here)
    const shootCameraWorldPos = new THREE.Vector3();
    const shootCameraWorldDir = new THREE.Vector3();
    const targetMarkerWorldPos = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();
    const projectileStartPos = new THREE.Vector3();



      // --- Event Listeners ---
    // Existing overlay interaction listener (beforexrselect)
    overlay.addEventListener('beforexrselect', function (e) {
        const targetElement = e.target;
        let allowDefault = false;
        if (targetElement && targetElement.tagName === 'BUTTON' && targetElement.closest && (
               targetElement.closest('#place-tower-popup') ||
               targetElement.closest('#upgrades-popup') ||
               targetElement.closest('#confirm-placement-area') ||
               targetElement.closest('#game-over-screen') ||
               targetElement.closest('#controls-widget')
           )) {
            allowDefault = true;
            console.log("beforexrselect: Allowing default for UI button target:", targetElement);
        }
        if (!allowDefault) {
            console.log("beforexrselect: Preventing default for non-UI target or non-button target.");
            e.preventDefault();
        }
    });

    // --- UI Functions (Definitions are now attached to window) ---

    // --- Shoot Button Listener ---
    shootButton.addEventListener('click', () => {
        console.log("Shoot button clicked.");
        if (!isGameSetupComplete || isGameOver) {
            console.log(`Shoot ignored: SetupComplete=${isGameSetupComplete}, GameOver=${isGameOver}`);
            return;
         }
        if (!sceneInstance.is('ar-mode')) { console.log("Shoot ignored: Not in AR mode."); return; }
        if (!cameraEl || !cameraEl.object3D || !cameraMarkerEl || !cameraMarkerEl.object3D) {
            console.error("Cannot shoot: Camera or Aim Marker not ready!");
            return;
        }

        cameraEl.object3D.getWorldPosition(shootCameraWorldPos);
        cameraMarkerEl.object3D.getWorldPosition(targetMarkerWorldPos);
        cameraEl.object3D.getWorldDirection(shootCameraWorldDir); // For offset

        shootDirection.copy(targetMarkerWorldPos).sub(shootCameraWorldPos).normalize(); // Direction towards marker

        console.log(`Calculated TARGETED dir: ${shootDirection.x.toFixed(2)}, ${shootDirection.y.toFixed(2)}, ${shootDirection.z.toFixed(2)}`);

        const projectile = document.createElement('a-sphere');
        projectile.setAttribute('radius', '0.1');
        projectile.setAttribute('color', '#FFFF00'); // Yellow
        projectile.setAttribute('material', 'shader: flat;');

        const startOffset = 0.2;
        projectileStartPos.copy(shootCameraWorldPos).addScaledVector(shootCameraWorldDir, startOffset);
        projectile.setAttribute('position', projectileStartPos);

        // Attach projectile-hitter component
        projectile.setAttribute('projectile-hitter', {
            direction: shootDirection.clone(),
            speed: 10,
            lifetime: 3000,
            targetSelector: '.enemy'
        });
         console.log("Projectile component attributes set.");

         sceneInstance.appendChild(projectile);
         console.log("Projectile added to scene.");

    }); // End of shoot button listener

    // --- Start Game Button Listener ---
    startGameButton.addEventListener('click', () => {
         console.log("DEBUG: startGameButton CLICKED!"); // Log click
        if (towerPlaced) {
            console.log("DEBUG: Condition 'towerPlaced' is TRUE inside listener."); // Log state
            console.log("Tower is placed. Starting game!");
            // Reset state for new game
            isGameSetupComplete = true;
            isGameOver = false; // Ensure game over is false
            currentMaxTowerHealth = TOWER_MAX_HEALTH;
            currentTowerHealth = TOWER_MAX_HEALTH; // Reset health
            score = 0; // Reset score
            currentLevel = 1; // Reset level
            scoreForNextLevel = 10; // Reset level threshold
            scoreGap = 10;          // Reset score gap
            upgradeShooter1Placed = false; // Reset upgrade flags
            upgradeShooter2Placed = false;
            window.enemyManager.activeEnemies = 0;
            window.enemyManager.speedMultiplier = 1.0;

            // Update UI
            window.updateScoreDisplay(); // Use window.
            window.updateTowerHealthUI();  // Use window.
            window.updateLevelDisplay();

            // ... (hide setup UI, show game UI, enable shoot button) ...
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            const reticleEl = document.getElementById('placement-reticle');
            if (reticleEl) reticleEl.setAttribute('visible', false);
            if (controlsWidget) controlsWidget.style.display = 'block';
            if (shootButton) shootButton.disabled = false;


            // Start Enemy Spawner
            if (window.enemyManager.spawnTimerId) clearInterval(window.enemyManager.spawnTimerId);
            window.enemyManager.spawnTimerId = setInterval(window.spawnEnemy, window.enemyManager.spawnInterval); // Use window.
            console.log(`Enemy spawner started with interval: ${window.enemyManager.spawnInterval}ms`);

        } else {
             console.log("DEBUG: Condition 'towerPlaced' is FALSE inside listener."); // Log state
            console.warn("Start button clicked, but tower not placed yet.");
        }
    });
    console.log("DEBUG: startGameButton listener ATTACHED in DOMContentLoaded."); // Keep this log

     // --- Try Again Button Listener ---
    tryAgainButton.addEventListener('click', window.resetGame); // Use window.

   // --- Attach Upgrade/Confirm/Manual/Close Listeners directly (NO setTimeout) ---
   console.log("DEBUG: Attaching listeners for UPGRADE/Confirm/Close/Manual buttons directly...");

   if (upgradeHealthBtn) {
    upgradeHealthBtn.addEventListener('click', () => {
        console.log("Upgrade Health chosen.");
        if (isGamePaused) {
             currentMaxTowerHealth += 3;
             currentTowerHealth = currentMaxTowerHealth;
             window.updateTowerHealthUI();
             console.log(`Health upgraded. Max: ${currentMaxTowerHealth}`);
             window.resumeGame();
        } else { /* Handle manual click if needed */ }
    });
} else { console.error("Cannot add listener: upgradeHealthBtn is null!"); }

if (upgradePlayerDamageBtn) {
    upgradePlayerDamageBtn.addEventListener('click', () => {
         console.log("Upgrade Player Damage chosen.");
         if (isGamePaused) {
              playerDamageLevel++;
              console.log(`Player Damage upgraded to Level ${playerDamageLevel}. Multiplier: ${(1 + playerDamageLevel * 0.15).toFixed(2)}x`); // Example multiplier logic
              // Actual damage increase needs modification in hit-receiver
              window.resumeGame();
         } else { /* Handle manual click if needed */ }
     });
 } else { console.error("Cannot add listener: upgradePlayerDamageBtn is null!"); }

 if (upgradeShooterBtn) {
    upgradeShooterBtn.addEventListener('click', () => {
        console.log("Upgrade Shooter chosen.");
        if (isGamePaused) {
            // Determine action: Place 1, Place 2, or Upgrade Level
            if (!upgradeShooter1Placed) {
                 console.log("Initiating placement for Shooter 1...");
                 placingUpgrade = 'shooter1';
                 // Start placement process... (Show reticle, confirm button etc.)
                 placedUpgradeEl = null;
                 const reticleEl = document.getElementById('placement-reticle');
                 const feedbackEl = document.getElementById('scanning-feedback');
                 confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
                 confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
                 if (reticleEl) reticleEl.setAttribute('visible', true);
                 if (feedbackEl) { feedbackEl.textContent = `Paspausk ant paviršiaus padėti bokštą`; feedbackEl.style.display = 'block'; }
                 if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'block';
                 if (confirmPlacementButtonEl) confirmPlacementButtonEl.disabled = true;
                 if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
             } else if (!upgradeShooter2Placed && currentLevel >= UPGRADE_UNLOCKS.SECOND_SHOOTER) {
                 console.log("Initiating placement for Shooter 2...");
                 placingUpgrade = 'shooter2';
                 // Start placement process... (similar to above)
                  placedUpgradeEl = null;
                 const reticleEl = document.getElementById('placement-reticle');
                 const feedbackEl = document.getElementById('scanning-feedback');
                 confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
                 confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
                 if (reticleEl) reticleEl.setAttribute('visible', true);
                 if (feedbackEl) { feedbackEl.textContent = `Paspausk ant paviršiaus padėti bokštą`; feedbackEl.style.display = 'block'; }
                 if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'block';
                 if (confirmPlacementButtonEl) confirmPlacementButtonEl.disabled = true;
                 if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
             } else if (upgradeShooter1Placed && currentLevel >= nextShooterUpgradeLevel) { // Check if upgrade is due
                shooterLevel++;
                nextShooterUpgradeLevel += 2; // Set next available level
                console.log(`Upgrading Shooters to Level ${shooterLevel}. Next upgrade available at Lv ${nextShooterUpgradeLevel}.`);
                // Apply the upgrade effect (e.g., speed first)
                activeShooterUpgrades.forEach(shooterEl => {
                     if (shooterEl && shooterEl.components['auto-shooter']) {
                         const currentDelay = shooterEl.getAttribute('auto-shooter').shootDelay;
                         const newDelay = Math.max(100, currentDelay * 0.8); // Example: 20% speed increase
                         shooterEl.setAttribute('auto-shooter', 'shootDelay', newDelay);
                         console.log(`  - Turret ${shooterEl.id} speed increased (Delay: ${newDelay.toFixed(0)}ms)`);
                     }
                     // Add logic for damage upgrades based on shooterLevel later
                });
                window.resumeGame();
             } else {
                 console.log("Shooter upgrade not available at this level or condition not met.");
                 window.resumeGame(); // Resume even if no action taken
             }
        
            } else { /* Handle manual click */ }
        });
    } else { console.error("Cannot add listener: upgradeShooterBtn is null!"); }

    if (upgradeSlowerBtn) {
        upgradeSlowerBtn.addEventListener('click', () => {
            console.log("Upgrade Slower chosen.");
            if (isGamePaused) {
                if (!upgradeSlowTurretPlaced && currentLevel >= UPGRADE_UNLOCKS.SLOW_TURRET) {
                     console.log("Initiating placement for Slow Turret...");
                     placingUpgrade = 'slowTurret';
                     // Start placement process...
                     placedUpgradeEl = null;
                    const reticleEl = document.getElementById('placement-reticle');
                    const feedbackEl = document.getElementById('scanning-feedback');
                    confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
                    confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
                    if (reticleEl) reticleEl.setAttribute('visible', true);
                    if (feedbackEl) { feedbackEl.textContent = `Padėti ant paviršiaus bokšta`; feedbackEl.style.display = 'block'; }
                    if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'block';
                    if (confirmPlacementButtonEl) confirmPlacementButtonEl.disabled = true;
                    if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
                 } else if (upgradeSlowTurretPlaced && currentLevel >= nextSlowTurretUpgradeLevel) {
                    slowTurretLevel++;
                    nextSlowTurretUpgradeLevel += 3; // Set next available level
                    console.log(`Upgrading Slow Turret to Level ${slowTurretLevel}. Next upgrade available at Lv ${nextSlowTurretUpgradeLevel}.`);
                    // Apply upgrade effect (speed + slow%) - Requires component modification
                    activeSlowTurrets.forEach(turretEl => {
                        // TODO: Add logic to modify slow turret component attributes
                        console.log(`  - Slow Turret ${turretEl.id} upgraded (Effect TBD)`);
                    });
                    window.resumeGame();
                 } else {
                     console.log("Slow Turret upgrade not available at this level or condition not met.");
                     window.resumeGame();
                 }
            } else { /* Handle manual click */ }
        });
    } else { console.error("Cannot add listener: upgradeSlowerBtn is null!"); }

    if (manualUpgradesButtonEl) {
        manualUpgradesButtonEl.addEventListener('click', () => {
            upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
            if (!upgradesPopupEl) return;
            if (upgradesPopupEl.style.display === 'block') { upgradesPopupEl.style.display = 'none'; }
            else if (!isGamePaused && isGameSetupComplete) { window.showUpgradePopup(false); }
            else { console.log("Cannot open upgrades manually (Game Paused/Not Started)."); }
        });
    } else { console.error("Cannot add listener: manualUpgradesButtonEl is null!"); }

    if (closeUpgradePopupBtnEl) {
         closeUpgradePopupBtnEl.addEventListener('click', () => {
             upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
             if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
             if (isGamePaused) { window.resumeGame(false); }
         });
    } else { console.error("Cannot add listener: closeUpgradePopupBtnEl is null!"); }

    if (confirmPlacementButtonEl) {
        confirmPlacementButtonEl.addEventListener('click', () => {
             console.log("Confirm Placement button clicked for:", placingUpgrade);
             const currentConfirmArea = document.getElementById('confirm-placement-area');
             const feedbackEl = document.getElementById('scanning-feedback');
             if (placedUpgradeEl && placingUpgrade) { // Check if we have a visual and type
                  console.log(`Finalizing placement for ${placingUpgrade}...`);

                  // Apply component based on type
                  if (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') {
                      placedUpgradeEl.setAttribute('auto-shooter', { shootDelay: 5000 }); // Initial delay
                      activeShooterUpgrades.push(placedUpgradeEl);
                      if (placingUpgrade === 'shooter1') { upgradeShooter1Placed = true; console.log("Shooter 1 marked as placed."); }
                      else { upgradeShooter2Placed = true; console.log("Shooter 2 marked as placed.");}
                  } else if (placingUpgrade === 'slowTurret') {
                      // TODO: Add component for slowing turret
                      // placedUpgradeEl.setAttribute('slowing-shooter', { slowAmount: 0.3, shootDelay: 6000 }); // Example
                      activeSlowTurrets.push(placedUpgradeEl);
                      upgradeSlowTurretPlaced = true;
                      console.log("Slow Turret marked as placed.");
                      nextSlowTurretUpgradeLevel = currentLevel + 3; // Set next upgrade level availability
                      console.log(`Next Slow Turret upgrade available at Lv ${nextSlowTurretUpgradeLevel}`);
                  }

                 // Reset state and UI
                 placingUpgrade = null;
                 placedUpgradeEl = null;
                 if (currentConfirmArea) currentConfirmArea.style.display = 'none';
                 if (feedbackEl) feedbackEl.style.display = 'none';
                 const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', false);
                 window.resumeGame(false); // Resume game

             } else { console.warn("Confirm button clicked inappropriately."); }
        });
    } else { console.error("Confirm Placement Button element not found!"); }


    // --- Initialize UI ---
    console.log("Initializing UI states...");
    window.updateScoreDisplay();
    window.updateTowerHealthUI();
    window.updateLevelDisplay(); 
    // Remove setTimeout for unused toggles
    // setTimeout(() => {
    //    if (window.toggleLabels) { window.toggleLabels({ value: document.querySelector('input[name="labelsVisible"]:checked')?.value || 'no' }); }
    //    if (window.toggleSphereColor) { window.toggleSphereColor({ value: document.querySelector('input[name="sphereColor"]:checked')?.value || '#EF2D5E' }); }
    // }, 0);

    // --- Set willReadFrequently on Canvas ---
    sceneInstance.addEventListener('loaded', () => {
        console.log("Scene loaded event. Attempting to set willReadFrequently.");
        const canvas = sceneInstance.canvas;
        if (canvas) {
            try {
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) console.log("Set 'willReadFrequently' on 2D context.");
                else throw new Error("Could not get 2D context");
            } catch (e) {
                try {
                   const glCtx = canvas.getContext('webgl', { antialias: true });
                   if (glCtx) console.log("Got WebGL context.");
                   else throw new Error("Could not get WebGL context");
                } catch(glError) {
                    console.warn("Could not get canvas 2D or WebGL context.");
                }
            }
        } else { console.warn("Canvas element not found on scene load."); }
      });

}); // End of DOMContentLoaded listener