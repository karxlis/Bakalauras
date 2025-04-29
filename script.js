// --- Component Definitions ---
// --- Component Definitions ---
// --- Component Definitions ---
AFRAME.registerComponent('follow-shadow', {
    // Schema remains the same - A-Frame provides the element in this.data
    schema: {type: 'selector'},
    init: function() {
        console.log("[follow-shadow] Initializing..."); // Log initialization
        this.el.object3D.renderOrder = -1; // Keep render order
        this.targetEl = null;
        this.initialPosSet = false;

        // **** CORRECTED: Directly use the element from this.data ****
        this.targetEl = this.data; // this.data IS the selected element (or null)
        // **** END CORRECTION ****

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
        shootDelay: { type: 'number', default: 5000 }, // Configurable delay (ms)
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

// --- Upgrade State Flags ---
let upgradeShooter1Placed = false; // Renamed
let upgradeShooter2Placed = false; // **** NEW: Flag for 2nd shooter ****
// REMOVE: upgradeAvailable_Score10, upgradeAvailable_Score20, upgradeShooterTaken, upgradeHealthTaken

// --- Game State Variables (Keep Existing) ---
let isGameSetupComplete = false;
let towerPlaced = false;
let placedTowerEl = null;
let isGamePaused = false;
let placingUpgrade = null; // Will store 'shooter1', 'shooter2', or null
let placedUpgradeEl = null;
let activeShooterUpgrades = [];
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
let upgradeBtnHealthEl = null;
let upgradeBtnShooterEl = null; // <<<< Name Used in DOMContentLoaded assignment
let upgradeBtnShooterUpgradeEl = null;
let upgradeBtnSpeedEl = null;
let upgradeBtnSlowEl = null;
let closeUpgradePopupBtnEl = null;
let manualUpgradesButtonEl = null;

window.enemyManager = {
    activeEnemies: 0, // Start with 0 active enemies
    maxEnemies: 8,
    spawnInterval: 1000, // Time between spawn checks (ms)
    spawnTimerId: null,
    baseSpeed: 0.5,      // Initial enemy speed
    speedMultiplier: 1.0, // Multiplier increased by level ups

    // Define decrementCount directly inside the object
    decrementCount: function() {
        this.activeEnemies = Math.max(0, this.activeEnemies - 1);
        // Using 'this' refers to the enemyManager object itself
        // console.log(`Enemy count decremented. Current: ${this.activeEnemies}`);
    }
};

// **** NEW / MODIFIED GLOBAL FUNCTIONS ****
window.updateScoreDisplay = function() { // Attached to window
    scoreDisplayEl = scoreDisplayEl || document.getElementById('score-display');
    if (scoreDisplayEl) {
        scoreDisplayEl.textContent = `Score: ${score}`;
    }
};

// Function to calculate the score needed TO REACH a specific level
window.calculateScoreForLevel = function(targetLevel) { // Attached to window
    if (targetLevel <= 1) return 0;
    if (targetLevel > MAX_LEVEL) targetLevel = MAX_LEVEL; // Cap

    let scoreThreshold = 0;
    let currentGap = 10;
    for (let level = 1; level < targetLevel; level++) {
        scoreThreshold += currentGap;
        if (level >= 4) { // After reaching level 4 (i.e., starting calculation for level 5)
            currentGap = Math.round(currentGap * 1.5);
        }
    }
    return scoreThreshold;
};

// Function to update level state based on score
window.updateLevelingState = function() { // Attached to window
    if (currentLevel >= MAX_LEVEL || isGameOver) {
        return; // Stop leveling if max level reached or game over
    }

    if (score >= scoreForNextLevel) {
        // LEVEL UP!
        const oldLevel = currentLevel;
        currentLevel++;
        console.log(`%cLEVEL UP! Reached Level ${currentLevel} at Score ${score}`, "color: lime; font-weight: bold;");

        // Show visual notification
        window.showLevelUpPopup(currentLevel); // Use window.

        // Update enemy speed (consider if this should happen on level up)
         window.increaseEnemySpeed(); // Use window.

        // Calculate next score threshold if not max level yet
        if (currentLevel < MAX_LEVEL) {
            if (oldLevel < 4) { // If the level we just completed was 1, 2, 3
                scoreGap = 10; // Gap remains 10 for levels 2, 3, 4
            } else { // If the level we just completed was 4 or higher
                scoreGap = Math.round(scoreGap * 1.5);
            }
            scoreForNextLevel += scoreGap;
            console.log(`Next level (${currentLevel + 1}) requires score: ${scoreForNextLevel} (Gap: ${scoreGap})`);
        } else {
            console.log("Max Level Reached!");
            scoreForNextLevel = Infinity; // Prevent further checks
        }

        // Show the main upgrade choice popup
        window.showUpgradePopup(true); // Use window. (Pass true to indicate it's a level-up pause)
    }
};

// Function to show the level up popup
window.showLevelUpPopup = function(level) { // Attached to window
    console.log(`%%%%% showLevelUpPopup Function Called for Level: ${level} %%%%%`);

    // Get elements inside function every time
    const popupEl = document.getElementById('level-up-popup');
    const levelNumEl = document.getElementById('level-number');

    if (popupEl && levelNumEl) {
        console.log("Popup elements confirmed found.");
        levelNumEl.textContent = `Level: ${level}`;
        console.log(`Set level text to: ${levelNumEl.textContent}`);

        console.log("Popup current display (style):", popupEl.style.display);
        console.log("Popup current display (computed):", window.getComputedStyle(popupEl).display);
        popupEl.style.display = 'block'; // Force display
        // Force Reflow (sometimes helps ensure style applies before timeout)
        void popupEl.offsetWidth;
        console.log("Popup display style set to 'block'. New computed style:", window.getComputedStyle(popupEl).display);

        if (levelUpTimeout) clearTimeout(levelUpTimeout);

        console.log("Setting timeout to hide popup in 1000ms.");
        levelUpTimeout = setTimeout(() => {
            console.log("Executing timeout to hide popup.");
            if(popupEl) popupEl.style.display = 'none';
            levelUpTimeout = null;
        }, 1000);
    } else {
        console.error("Could not find necessary popup elements!", { popupEl, levelNumEl });
    }
};

// Function to increase enemy speed
window.increaseEnemySpeed = function() { // Attached to window
    console.log("%%%%% increaseEnemySpeed Function Called %%%%%");
    // Increase the global speed multiplier
    window.enemyManager.speedMultiplier *= 1.1; // Increase speed by 10% per level
    console.log(`New enemy speed multiplier: ${window.enemyManager.speedMultiplier.toFixed(2)}`);

    // Update speed of existing enemies
    const activeEnemies = document.querySelectorAll('.enemy'); // Use '.enemy' class
    console.log(`Found ${activeEnemies.length} active enemies to update speed.`);
    activeEnemies.forEach(enemyEl => {
        if (enemyEl.components['move-towards-target']) {
            const currentBaseSpeed = window.enemyManager.baseSpeed;
            const newSpeed = currentBaseSpeed * window.enemyManager.speedMultiplier;
            enemyEl.setAttribute('move-towards-target', 'speed', newSpeed);
        } else {
             console.warn(`Enemy ${enemyEl.id} missing 'move-towards-target' component during speed update.`);
        }
    })
};

// Modified incrementScore to check for level up
window.incrementScore = function() {
    if (isGameOver) return;

    score++;
    console.log("Score increased to:", score);
    window.updateScoreDisplay(); // Use window.

    // Check for level up
    window.updateLevelingState(); // Use window.
};


window.updateTowerHealthUI = function() { // Attached to window
    towerHealthIndicatorEl = towerHealthIndicatorEl || document.getElementById('tower-health-indicator');
    if (towerHealthIndicatorEl) {
        towerHealthIndicatorEl.textContent = `Tower Health: ${currentTowerHealth}/${currentMaxTowerHealth}`;
        towerHealthIndicatorEl.style.display = isGameSetupComplete && !isGameOver ? 'block' : 'none';

        // Optional: Change color based on health
        const healthPercent = currentMaxTowerHealth > 0 ? (currentTowerHealth / currentMaxTowerHealth) : 0;
        if (healthPercent > 0.6) {
            towerHealthIndicatorEl.style.backgroundColor = 'rgba(0, 150, 0, 0.7)'; // Greenish
        } else if (healthPercent > 0.3) {
            towerHealthIndicatorEl.style.backgroundColor = 'rgba(180, 130, 0, 0.7)'; // Orangeish
        } else {
            towerHealthIndicatorEl.style.backgroundColor = 'rgba(150, 0, 0, 0.7)'; // Reddish
        }
    }
};

window.towerHit = function() { // Attached to window
    if (isGameOver) return; // Don't decrease health if game is already over

    currentTowerHealth--;
    console.log(`%cTower Hit! Health: ${currentTowerHealth}/${currentMaxTowerHealth}`, "color: orange; font-weight: bold;"); // Show current max
    window.updateTowerHealthUI(); // Use window.

    // TODO: Add visual/sound effect for tower hit

    if (currentTowerHealth <= 0) {
        window.gameOver(); // Use window.
    }
};

window.gameOver = function() { // Attached to window
    if (isGameOver) return; // Prevent multiple calls
    console.log("%cGAME OVER!", "color: red; font-size: 1.5em; font-weight: bold;");
    isGameOver = true;

    // Stop spawning
    if (window.enemyManager.spawnTimerId) {
        clearInterval(window.enemyManager.spawnTimerId);
        window.enemyManager.spawnTimerId = null;
        console.log("Enemy spawner stopped due to game over.");
    }

    // Stop existing enemies (optional: could let them finish moving)
     const enemies = document.querySelectorAll('.enemy');
     enemies.forEach(enemy => {
         if (enemy.components['move-towards-target']) {
             enemy.removeAttribute('move-towards-target'); // Stop movement
         }
         // Maybe add a fade out effect later?
     });

    // Hide game UI elements
    const controlsWidget = document.getElementById('controls-widget');
    if (controlsWidget) controlsWidget.style.display = 'none';
    window.updateTowerHealthUI(); // Use window. (Hides health indicator because isGameOver is true)

    // Show Game Over screen
    gameOverScreenEl = gameOverScreenEl || document.getElementById('game-over-screen');
    finalScoreEl = finalScoreEl || document.getElementById('final-score');
    if (gameOverScreenEl && finalScoreEl) {
        finalScoreEl.textContent = `Your Score: ${score}`;
        gameOverScreenEl.style.display = 'block';
    }
};

window.showUpgradePopup = function(pauseGame = false){ // Attached to window
    if (isGameOver) return; // Don't show if game over

    console.log(`Showing Upgrade Popup... (Pause: ${pauseGame})`);

    if (pauseGame && !isGamePaused) {
        isGamePaused = true; // PAUSE THE GAME if triggered by level up
        if (window.enemyManager.spawnTimerId) {
            clearInterval(window.enemyManager.spawnTimerId);
            window.enemyManager.spawnTimerId = null;
            console.log("Enemy spawner paused for upgrade.");
        }
        const controlsWidget = document.getElementById('controls-widget');
        if (controlsWidget) controlsWidget.style.display = 'none'; // Hide controls when paused
    }

    // Get references (might be called manually before DOM ready)
    upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
    if (!upgradesPopupEl) return; // Exit if popup doesn't exist yet

    // Update button states
    window.updateUpgradePopupButtonStates(); // Use window.

    // Show the popup
    upgradesPopupEl.style.display = 'block';

    // Hide reticle if game paused
    if (pauseGame) {
        const reticleEl = document.getElementById('placement-reticle');
        if (reticleEl) reticleEl.setAttribute('visible', 'false');
    }
};

// **** NEW: Helper function to update button states ****
window.updateUpgradePopupButtonStates = function() { // Attached to window
    // Get fresh references inside the function
    upgradeBtnHealthEl = upgradeBtnHealthEl || document.getElementById('upgradeBtnHealth');
    upgradeBtnShooterEl = upgradeBtnShooterEl || document.getElementById('upgradeBtnShooter'); // Name used in DOMContentLoaded
    upgradeBtnShooterUpgradeEl = upgradeBtnShooterUpgradeEl || document.getElementById('upgradeBtnShooterUpgrade');
    upgradeBtnSpeedEl = upgradeBtnSpeedEl || document.getElementById('upgradeBtnSpeed');
    upgradeBtnSlowEl = upgradeBtnSlowEl || document.getElementById('upgradeBtnSlow');

    const canPlaceShooter1 = !upgradeShooter1Placed;
    const canPlaceShooter2 = upgradeShooter1Placed && !upgradeShooter2Placed && currentLevel >= 10; // Prereq: Lv 10

    // Enable/Disable based on conditions and level prerequisites
    // Format: enableButton(buttonElement, enableCondition, levelRequirement, takenFlag/Condition)
    window.enableUpgradeButton(upgradeBtnHealthEl, true, 1); // Use window. (Always available)
    window.enableUpgradeButton(upgradeBtnShooterEl, (canPlaceShooter1 || canPlaceShooter2), 1, (upgradeShooter1Placed && upgradeShooter2Placed)); // Use window.
    window.enableUpgradeButton(upgradeBtnSpeedEl, true, 5); // Use window. (Prereq: Lv 5)
    window.enableUpgradeButton(upgradeBtnSlowEl, true, 8); // Use window. (Prereq: Lv 8)
    window.enableUpgradeButton(upgradeBtnShooterUpgradeEl, true, 15); // Use window. (Prereq: Lv 15)

    // Update Shooter Button Text
    if (upgradeBtnShooterEl) { // Check the variable name here
        if (canPlaceShooter2) {
             upgradeBtnShooterEl.innerHTML = 'Add 2nd Shooter <span class="upgrade-desc">(Place Turret)</span>';
        } else if (canPlaceShooter1) {
            upgradeBtnShooterEl.innerHTML = 'Add Shooter <span class="upgrade-desc">(Place Turret)</span>';
        } else {
             upgradeBtnShooterEl.innerHTML = 'Shooters Maxed <span class="upgrade-desc">(2/2 Placed)</span>';
        }
    }
};

window.enableUpgradeButton = function (buttonEl, enabledCondition, levelReq, isDisabledOverride = false) { // Attached to window
    if (!buttonEl) return;

    const levelMet = currentLevel >= levelReq;
    const shouldBeEnabled = enabledCondition && levelMet && !isDisabledOverride;

    buttonEl.disabled = !shouldBeEnabled;
    buttonEl.classList.toggle('disabled-upgrade', !shouldBeEnabled);

    // Add "Level X Required" text if level not met
    const descSpan = buttonEl.querySelector('.upgrade-desc');
    if (descSpan) {
        if (!levelMet) {
            // Find original description text if possible (might need restructure)
            // For now, just overwrite
             descSpan.textContent = `(Lv ${levelReq} Required)`;
        } else {
            // Restore original description (needs improvement - store original text?)
             // Example: Quick restore for known buttons
             if (buttonEl.id === 'upgradeBtnHealth') descSpan.textContent = "(+3 Max HP)";
             else if (buttonEl.id === 'upgradeBtnShooter') descSpan.textContent = "(Place Turret)"; // This text changes anyway
             else if (buttonEl.id === 'upgradeBtnSpeed') descSpan.textContent = "(Future)";
             else if (buttonEl.id === 'upgradeBtnSlow') descSpan.textContent = "(Future)";
             else if (buttonEl.id === 'upgradeBtnShooterUpgrade') descSpan.textContent = "(Future)";
        }
    }
};

// **** PASTE resumeGame HERE ****
window.resumeGame = function(forceClosePopup = true){ // Attached to window
    if (isGameOver) return;

    console.log("Resuming game...");
    isGamePaused = false; // UNPAUSE
    placingUpgrade = null; // Clear placing state

    // Hide UI elements associated with pausing/upgrading
    if (forceClosePopup) {
         upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
         if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
    }
     confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
     if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'none'; // Ensure hidden
     const feedbackEl = document.getElementById('scanning-feedback');
     if (feedbackEl) feedbackEl.style.display = 'none'; // Ensure hidden

     const reticleEl = document.getElementById('placement-reticle');
     if (reticleEl) reticleEl.setAttribute('visible', 'false');

     const controlsWidget = document.getElementById('controls-widget');
     if (controlsWidget) controlsWidget.style.display = 'block'; // Show controls


    // Restart spawner ONLY if game was running and spawner isn't already active
    if (isGameSetupComplete && !isGameOver && !window.enemyManager.spawnTimerId) {
         window.enemyManager.spawnTimerId = setInterval(window.spawnEnemy, window.enemyManager.spawnInterval); // Use window.
         console.log("Enemy spawner resumed.");
    } else if (!isGameSetupComplete || isGameOver) {
        console.log("Not resuming spawner (Game not running).");
    } else if (window.enemyManager.spawnTimerId){
         console.log("Spawner seems to be already running.");
    }
};


// **** ADD GAME RESET LOGIC ****
window.resetGame = function() { // Attached to window
    console.log("Resetting game...");

    // Reset state variables
    isGameOver = false;
    isGameSetupComplete = false;
    towerPlaced = false;
    score = 0;
    currentLevel = 1; // Back to level 1
    scoreForNextLevel = 10; // Reset score threshold
    scoreGap = 10; // Reset score gap
    currentMaxTowerHealth = TOWER_MAX_HEALTH;
    currentTowerHealth = TOWER_MAX_HEALTH;
    window.enemyManager.activeEnemies = 0;
    window.enemyManager.speedMultiplier = 1.0; // Reset speed multiplier
    isGamePaused = false;
    placingUpgrade = null;
    upgradeShooter1Placed = false;
    upgradeShooter2Placed = false;

    // Clear spawner if somehow still active
     if (window.enemyManager.spawnTimerId) {
        clearInterval(window.enemyManager.spawnTimerId);
        window.enemyManager.spawnTimerId = null;
    }

    // Hide Game Over screen
    if (gameOverScreenEl) gameOverScreenEl.style.display = 'none';

    // Remove placed tower and existing enemies/projectiles
    if (placedTowerEl && placedTowerEl.parentNode) {
        placedTowerEl.parentNode.removeChild(placedTowerEl);
    }
    placedTowerEl = null;

    // Remove shooters explicitly tracked
    activeShooterUpgrades.forEach(shooter => { if (shooter.parentNode) shooter.parentNode.removeChild(shooter); });
    activeShooterUpgrades = []; // Clear the tracking array
    console.log("Removed active shooter upgrades during reset.");

    // Remove enemies and projectiles (selector updated)
    const entitiesToRemove = document.querySelectorAll('.enemy, [projectile-hitter]');
    entitiesToRemove.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
    console.log(`Removed ${entitiesToRemove.length} enemies/projectiles.`);


    // Reset UI elements to initial state (like entering AR)
    window.updateScoreDisplay(); // Use window.
    window.updateTowerHealthUI(); // Use window.
    if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
        // Trigger the setup flow UI again
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');

        console.log('Resetting setup phase UI.');
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block';
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        if (controlsWidget) controlsWidget.style.display = 'none';
        if (shootButton) shootButton.disabled = true;
        if (startGameButton) startGameButton.disabled = true; // Ensure start is disabled
        if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none';
        window.updateTowerHealthUI(); // Use window. (Hides health indicator too)

        const reticleEl = document.getElementById('placement-reticle');
        if (reticleEl) reticleEl.setAttribute('visible', false);
    } else {
         const controlsWidget = document.getElementById('controls-widget');
         if(controlsWidget) controlsWidget.style.display = 'block'; // Show controls if not in AR
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

    // --- Target Vectors ---
    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3(); // Camera's world forward direction
    const towerPos = new THREE.Vector3();
    const towerToCamDir = new THREE.Vector3(); // Direction FROM Tower TO Camera
    const spawnBaseDir = new THREE.Vector3(); // Direction FROM Tower AWAY from Camera
    const spawnOffsetDir = new THREE.Vector3(); // Final direction offset from Tower
    const spawnPos = new THREE.Vector3(); // Final spawn position
    const camToSpawnDir = new THREE.Vector3(); // For view validation

    // Get world positions/directions
    cameraEl.object3D.getWorldPosition(camPos);
    cameraEl.object3D.getWorldDirection(camDir);
    placedTowerEl.object3D.getWorldPosition(towerPos);

    // --- Calculate Spawn Position ---

    // 1. Base Direction: FROM Tower AWAY from Camera
    towerToCamDir.copy(camPos).sub(towerPos); // Vector T->C
    if (towerToCamDir.lengthSq() < 0.1) { // If camera is very close to tower
        spawnBaseDir.copy(camDir).negate(); // Use opposite of camera direction
        console.warn("Camera close to tower, using inverted camera forward for spawn base direction.");
    } else {
        spawnBaseDir.copy(towerToCamDir).normalize().negate(); // Normalize T->C then negate it
    }
    // Ensure base direction is roughly horizontal
    spawnBaseDir.y = 0;
    spawnBaseDir.normalize();

    // 2. Angular Offset relative to the Tower AWAY from Camera line
    const angleRange = Math.PI / 3.0; // Keep arc ~60 degrees wide relative to the base direction
    const randomAngle = (Math.random() - 0.5) * angleRange;
    const rotationAxis = new THREE.Vector3(0, 1, 0); // World Y axis

    // Apply random rotation to the base spawn direction
    spawnOffsetDir.copy(spawnBaseDir).applyAxisAngle(rotationAxis, randomAngle);

    // 3. Spawn Distance (Keep it far from Tower)
    const spawnDistance = 12 + Math.random() * 6; // Spawn 12-18 units away FROM TOWER

    // 4. Calculate Final Spawn Position (Offset from Tower along the calculated direction)
    spawnPos.copy(towerPos).addScaledVector(spawnOffsetDir, spawnDistance);

    // --- Validation Checks ---

    // A. Check if Spawn point is roughly behind the tower relative to the camera
    //    Dot product of T->C vector and T->Spawn vector should be NEGATIVE
    towerToCamDir.copy(camPos).sub(towerPos).normalize(); // Recalculate T->C normalized
    const towerToSpawnDir = new THREE.Vector3().copy(spawnPos).sub(towerPos).normalize();
    const dotSideCheck = towerToCamDir.dot(towerToSpawnDir);
    if (dotSideCheck > -0.2) { // Allow some tolerance, but must be mostly negative (acos(-0.2) ~ 101 deg)
        console.warn(`Spawn rejected: Not clearly behind tower relative to cam (dotSideCheck: ${dotSideCheck.toFixed(2)}). Retrying.`);
        return;
    }

    // B. Check Minimum distance from Camera
    const minCamDistSq = 5 * 5; // Min 5 units away from camera
    if (spawnPos.distanceToSquared(camPos) < minCamDistSq) {
         console.warn("Spawn rejected: Too close to the camera. Retrying.");
         return;
    }

    // C. Minimum distance from Tower
    const minDistTowerSq = 6 * 6; // Min 10 units away from tower center
    if (spawnPos.distanceToSquared(towerPos) < minDistTowerSq) {
       console.warn(`Spawn rejected: Calculated position too close to tower (DistSq: ${spawnPos.distanceToSquared(towerPos).toFixed(2)}). Retrying.`);
       return;
    }

    // D. Check if still broadly in front of CURRENT camera view (prevents spawning directly behind player if they turned around)
    camToSpawnDir.copy(spawnPos).sub(camPos).normalize();
    const dotCamView = camDir.dot(camToSpawnDir);
    if (dotCamView > 0) { // Stricter: Must be within 90 degrees of camera forward
        console.warn(`Spawn rejected: Position outside forward camera view (dotCamView: ${dotCamView.toFixed(2)}). Retrying.`);
        return;
    }

    // Clamp Y position (relative to tower height maybe?)
    spawnPos.y = THREE.MathUtils.clamp(towerPos.y + 0.5 + (Math.random() - 0.5) * 1.5, 0.2, 3.0);

    // --- Create Enemy (If validation passed) ---
    console.log(`Spawn validation passed. Spawning at: ${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)}`);

    // --- Determine Enemy Type (Score threshold 10) ---
    let enemyType = 'basic'; let enemyHealth = 1; let enemyColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    let enemyScale = '0.25 0.25 0.25'; let enemyShape = 'box';
    const SCORE_THRESHOLD_TOUGH = 10; // Use score 10 trigger
    if (score >= SCORE_THRESHOLD_TOUGH) {
        const toughChance = Math.min(0.60, 0.35 + Math.floor((score - SCORE_THRESHOLD_TOUGH) / 5) * 0.07);
        // console.log(`Score ${score}, Tough Chance: ${(toughChance * 100).toFixed(1)}%`); // Optional log
        if (Math.random() < toughChance) {
            enemyType = 'tough'; enemyHealth = 3; enemyColor = '#8B0000'; enemyScale = '0.35 0.35 0.35'; enemyShape = 'sphere';
        }
    }

    // --- Create Enemy Element ---
    const enemy = document.createElement(`a-${enemyShape}`);
    const enemyId = `enemy-${enemyType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    enemy.setAttribute('id', enemyId); enemy.classList.add('enemy'); enemy.setAttribute('color', enemyColor);
    enemy.setAttribute('scale', enemyScale); enemy.setAttribute('position', spawnPos); enemy.setAttribute('shadow', 'cast: true; receive: false;');
    enemy.setAttribute('visible', 'true');

    // Create Health Indicator
    if (enemyHealth > 1) { /* ... Add health text child ... */
        const healthText = document.createElement('a-text'); healthText.classList.add('enemy-health-text'); healthText.setAttribute('value', `HP: ${enemyHealth}`);
        healthText.setAttribute('position', '0 0.5 0'); healthText.setAttribute('scale', '1.5 1.5 1.5'); healthText.setAttribute('align', 'center');
        healthText.setAttribute('color', '#FFFFFF'); healthText.setAttribute('side', 'double'); healthText.setAttribute('billboard', ''); enemy.appendChild(healthText);
    }

    // Attach Components
    enemy.setAttribute('hit-receiver', { maxHealth: enemyHealth, initialHealth: enemyHealth });
    enemy.setAttribute('move-towards-target', { target: `#${placedTowerEl.id}`, speed: manager.baseSpeed * manager.speedMultiplier });

    // Add to Scene
    enemyContainer.appendChild(enemy); manager.activeEnemies++;
    console.log(`%cSpawned ${enemyType} ${enemyId} (HP:${enemyHealth}). Count:${manager.activeEnemies}`, "color: cyan;");

}; // End of spawnEnemy


// Keep toggleSphereColor / toggleLabels (or remove if fully unused)
window.toggleSphereColor = function({value}) { // Attached to window
    console.log("Toggle Sphere Color:", value);
    const scene = document.querySelector('a-scene');
    const sphere = scene ? scene.querySelector('#objects a-sphere') : null; // Assuming it was in #objects
    if (sphere) {
        sphere.setAttribute('color', value);
        const label = document.getElementById('sphere-label');
        if (label) label.textContent = `A ${value === '#EF2D5E' ? 'red' : 'blue'} sphere`;
    } else { console.warn("Could not find the sphere element."); }
};

window.toggleLabels = function({value}) { // Attached to window
     const shouldHide = value === 'no';
     console.log(`Toggle Labels: Value=${value}, Should Hide=${shouldHide}`);
     const overlayEl = document.getElementById('dom-overlay');
     if(overlayEl) {
          overlayEl.classList.toggle('hide-labels', shouldHide);
     } else {
          console.warn("Could not find dom-overlay element to toggle labels.");
     }
};

// --- Remove Old incrementScore version that had upgrade trigger logic ---
// (The version at line 648 already correctly calls updateLevelingState)

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

        const exitVRButton = document.getElementById('exitVRButton');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');

        if (sceneElGlobal.is('ar-mode')) {
            console.log('AR Mode detected. Starting setup phase.');
            if (exitVRButton) exitVRButton.style.display = 'inline-block';
            if (scanningFeedbackEl) {
                scanningFeedbackEl.textContent = "Scanning environment..."; // Update text slightly
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
            if (exitVRButton) exitVRButton.style.display = 'none';
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            if (controlsWidget) controlsWidget.style.display = 'block'; // Show controls in non-AR
            if (shootButton) shootButton.disabled = false; // Re-enable if needed outside AR? (Decide later)

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
    if (now - lastSelectTime < SELECT_DEBOUNCE_MS) {
        console.log("DEBUG: Debouncing rapid select event.");
        return; // Ignore rapid successive calls
    }
    lastSelectTime = now; // Record time of this execution
    console.log("Event: ar-hit-test-select FIRED! (Processed)");
    // --- End Debounce Check ---

      // **** RE-ADD UI Check with DETAILED LOGS ****
      const sourceEvent = e.detail?.sourceEvent;
      console.log("DEBUG UI Check: sourceEvent:", sourceEvent); // Log 1
      if (sourceEvent && sourceEvent.target) {
          const targetElement = sourceEvent.target;
          console.log("DEBUG UI Check: targetElement:", targetElement, "tagName:", targetElement.tagName); // Log 2
          const closestPopup = targetElement.closest && (
                 targetElement.closest('#place-tower-popup') ||
                 targetElement.closest('#upgrades-popup') ||
                 targetElement.closest('#confirm-placement-area') ||
                 targetElement.closest('#game-over-screen') ||
                 targetElement.closest('#controls-widget')
             );
          console.log("DEBUG UI Check: closestPopup:", closestPopup); // Log 3
          if (closestPopup && targetElement.tagName === 'BUTTON')
           {
               console.log("DEBUG: Tap occurred on overlay UI BUTTON, ignoring for AR placement/move. RETURNING."); // Log 4
               return; // Let the button's own listener handle it
          } else {
               console.log("DEBUG UI Check: Condition not met (Not button or not in known popup), proceeding with AR logic."); // Log 5
          }
      } else {
           console.log("DEBUG UI Check: No sourceEvent or target, proceeding with AR logic."); // Log 6
      }
      // **** END UI TAP CHECK ****

    const reticleEl = document.getElementById('placement-reticle');
    const scanningFeedbackEl = document.getElementById('scanning-feedback'); // Needed for multiple phases

    // --- UPGRADE PLACEMENT ---
    if ((placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') && reticleEl && reticleEl.getAttribute('visible')) { // Check both shooter types
        const position = reticleEl.getAttribute('position');
        if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { console.error("Upgrade Placement failed: Invalid position.", position); return;}

        if (!placedUpgradeEl) { // First tap for upgrade: Create visual
            console.log("Placing shooter upgrade visually...");
            const shooterBox = document.createElement('a-box');
            const visualId = `shooter-upgrade-visual-${Date.now()}`;
            shooterBox.setAttribute('id', visualId);
            shooterBox.setAttribute('color', '#FF6347'); // Tomato color
            shooterBox.setAttribute('scale', '0.15 0.15 0.15');
            shooterBox.setAttribute('height', '0.4');
            shooterBox.setAttribute('position', position);
            shooterBox.setAttribute('shadow', 'cast: true; receive: false;');

            sceneElGlobal.appendChild(shooterBox);
            placedUpgradeEl = shooterBox; // Store reference to the VISUAL element

            // Enable confirm button
            const currentConfirmButton = document.getElementById('confirmPlacementButton');
            if (currentConfirmButton) currentConfirmButton.disabled = false;

            // Update instructions
            if(scanningFeedbackEl){ scanningFeedbackEl.textContent = "Tap to move, or Confirm Placement"; }

        } else { // Subsequent taps for upgrade: Move the visual
             console.log('Moving shooter upgrade visual...');
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
                towerPlacedFeedback.textContent = "Tower Placed! Tap again to move or press Start."; // Update feedback text
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
    const sceneInstance = sceneElGlobal || document.querySelector('a-scene'); // Use existing global or query
    const overlay = document.getElementById('dom-overlay');
    const exitVRButton = document.getElementById('exitVRButton');
    // const placementCheckbox = document.getElementById('placementModeCheckbox'); // Removed if not used
    const shootButton = document.getElementById('shootButton');
    const cameraEl = document.getElementById('player-camera');
    const cameraMarkerEl = document.getElementById('camera-aim-marker');
    const controlsWidget = document.getElementById('controls-widget');
    const placeTowerPopupEl = document.getElementById('place-tower-popup');
    const startGameButton = document.getElementById('startGameButton');
    const scanningFeedbackEl = document.getElementById('scanning-feedback');
    const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
    const tryAgainButton = document.getElementById('tryAgainButton');

    // Assign global vars (ensure declared globally with let)
    towerHealthIndicatorEl = document.getElementById('tower-health-indicator');
    gameOverScreenEl = document.getElementById('game-over-screen');
    finalScoreEl = document.getElementById('final-score');
    scoreDisplayEl = document.getElementById('score-display');
    levelUpPopupEl = document.getElementById('level-up-popup');
    levelNumberEl = document.getElementById('level-number');
    upgradesPopupEl = document.getElementById('upgrades-popup');
    confirmPlacementAreaEl = document.getElementById('confirm-placement-area');
    confirmPlacementButtonEl = document.getElementById('confirmPlacementButton');

    // **** CORRECTED References for NEW upgrade buttons ****
    upgradeBtnHealthEl = document.getElementById('upgradeBtnHealth');         // Correct ID
    upgradeShooterButtonEl = document.getElementById('upgradeBtnShooter');     // Correct ID <<< FIXED VARIABLE NAME
    upgradeBtnShooterUpgradeEl = document.getElementById('upgradeBtnShooterUpgrade'); // Correct ID
    upgradeBtnSpeedEl = document.getElementById('upgradeBtnSpeed');            // Correct ID
    upgradeBtnSlowEl = document.getElementById('upgradeBtnSlow');              // Correct ID
    closeUpgradePopupBtnEl = document.getElementById('closeUpgradePopupButton'); // Correct ID
    manualUpgradesButtonEl = document.getElementById('manualUpgradesButton');    // Correct ID
    // **** END Corrected References ****

     // **** GRANULAR ELEMENT CHECKS ****
     const missingElements = [];
     if (!sceneInstance) missingElements.push("sceneInstance (a-scene)");
     if (!overlay) missingElements.push("overlay (#dom-overlay)");
     // Check core game buttons
     if (!startGameButton) missingElements.push("startGameButton (#startGameButton)");
     if (!tryAgainButton) missingElements.push("tryAgainButton (#tryAgainButton)");
     if (!shootButton) missingElements.push("shootButton (#shootButton)");
     // Check popups
     if (!placeTowerPopupEl) missingElements.push("placeTowerPopupEl (#place-tower-popup)");
     if (!upgradesPopupEl) missingElements.push("upgradesPopupEl (#upgrades-popup)");
     if (!gameOverScreenEl) missingElements.push("gameOverScreenEl (#game-over-screen)");
     if (!confirmPlacementAreaEl) missingElements.push("confirmPlacementAreaEl (#confirm-placement-area)");
     if (!confirmPlacementButtonEl) missingElements.push("confirmPlacementButtonEl (#confirmPlacementButton)");
     // Check new upgrade buttons
     if (!upgradeBtnHealthEl) missingElements.push("upgradeBtnHealthEl (#upgradeBtnHealth)");
     if (!upgradeShooterButtonEl) missingElements.push("upgradeShooterButtonEl (#upgradeBtnShooter)"); // Check correct var name
     if (!upgradeBtnShooterUpgradeEl) missingElements.push("upgradeBtnShooterUpgradeEl (#upgradeBtnShooterUpgrade)");
     if (!upgradeBtnSpeedEl) missingElements.push("upgradeBtnSpeedEl (#upgradeBtnSpeed)");
     if (!upgradeBtnSlowEl) missingElements.push("upgradeBtnSlowEl (#upgradeBtnSlow)");
     if (!closeUpgradePopupBtnEl) missingElements.push("closeUpgradePopupBtnEl (#closeUpgradePopupButton)");
     if (!manualUpgradesButtonEl) missingElements.push("manualUpgradesButtonEl (#manualUpgradesButton)");
     // Check display elements
     if (!towerHealthIndicatorEl) missingElements.push("towerHealthIndicatorEl (#tower-health-indicator)");
     if (!scoreDisplayEl) missingElements.push("scoreDisplayEl (#score-display)");
     if (!finalScoreEl) missingElements.push("finalScoreEl (#final-score)");
     // Add checks for any other critical elements here...

     if (missingElements.length > 0) {
         console.error(`Essential page element(s) missing! Check IDs in index.html: ${missingElements.join(', ')}`);
         return; // Stop execution if critical elements are missing
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

    if (upgradeBtnHealthEl) {
        upgradeBtnHealthEl.addEventListener('click', () => {
            console.log("Upgrade Health chosen.");
            if (isGamePaused) {
                 currentMaxTowerHealth += 3;
                 currentTowerHealth = currentMaxTowerHealth;
                 window.updateTowerHealthUI(); // Use window.
                 console.log(`Health upgraded. Max: ${currentMaxTowerHealth}`);
                 window.resumeGame(); // Use window.
            } else {
                console.log("Health upgrade clicked, but game not paused (manual view?). No action.");
                 if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
            }
        });
    } else { console.error("Cannot add listener: upgradeBtnHealthEl is null!"); }

    if (upgradeShooterButtonEl) { // Use correct variable name
        upgradeShooterButtonEl.addEventListener('click', () => {
            console.log("Upgrade Shooter chosen.");
            if (isGamePaused) {
                const canPlaceShooter1 = !upgradeShooter1Placed;
                const canPlaceShooter2 = upgradeShooter1Placed && !upgradeShooter2Placed && currentLevel >= 10;
                if (canPlaceShooter1) { placingUpgrade = 'shooter1'; }
                else if (canPlaceShooter2) { placingUpgrade = 'shooter2'; }
                else { console.log("Shooter slots full, cannot place."); window.resumeGame(); return; } // Use window.

                console.log(`Initiating placement for ${placingUpgrade}...`);
                placedUpgradeEl = null;
                const reticleEl = document.getElementById('placement-reticle');
                const feedbackEl = document.getElementById('scanning-feedback');
                confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
                confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
                if (reticleEl) reticleEl.setAttribute('visible', true);
                if (feedbackEl) { feedbackEl.textContent = `Tap surface to place ${placingUpgrade === 'shooter1' ? 'Shooter 1' : 'Shooter 2'}`; feedbackEl.style.display = 'block'; }
                if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'block';
                if (confirmPlacementButtonEl) confirmPlacementButtonEl.disabled = true;
                if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
            } else {
                 console.log("Shooter upgrade clicked, but game not paused. No action.");
                 if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
            }
        });
    } else { console.error("Cannot add listener: upgradeShooterButtonEl is null!"); } // Check correct var name

    if (upgradeBtnSpeedEl) {
        upgradeBtnSpeedEl.addEventListener('click', () => {
            console.log("Placeholder: Shooting Speed selected.");
            if(isGamePaused) window.resumeGame(); else if (upgradesPopupEl) upgradesPopupEl.style.display = 'none'; // Use window.
        });
    } else { console.error("Cannot add listener: upgradeBtnSpeedEl is null!"); }

    if (upgradeBtnSlowEl) {
        upgradeBtnSlowEl.addEventListener('click', () => {
            console.log("Placeholder: Slowing Effect selected.");
            if(isGamePaused) window.resumeGame(); else if (upgradesPopupEl) upgradesPopupEl.style.display = 'none'; // Use window.
        });
    } else { console.error("Cannot add listener: upgradeBtnSlowEl is null!"); }

    if (upgradeBtnShooterUpgradeEl) {
        upgradeBtnShooterUpgradeEl.addEventListener('click', () => {
            console.log("Placeholder: Turret Synergy selected.");
            if(isGamePaused) window.resumeGame(); else if (upgradesPopupEl) upgradesPopupEl.style.display = 'none'; // Use window.
        });
    } else { console.error("Cannot add listener: upgradeBtnShooterUpgradeEl is null!"); }

    if (manualUpgradesButtonEl) {
        manualUpgradesButtonEl.addEventListener('click', () => {
            upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
            if (!upgradesPopupEl) return;
            if (upgradesPopupEl.style.display === 'block') {
                upgradesPopupEl.style.display = 'none';
            } else if (!isGamePaused && isGameSetupComplete) {
                window.showUpgradePopup(false); // Use window.
            } else { console.log("Cannot open upgrades manually (Game Paused/Not Started)."); }
        });
    } else { console.error("Cannot add listener: manualUpgradesButtonEl is null!"); }

    if (closeUpgradePopupBtnEl) {
         closeUpgradePopupBtnEl.addEventListener('click', () => {
             upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
             if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
             if (isGamePaused) { window.resumeGame(false); } // Use window.
         });
    } else { console.error("Cannot add listener: closeUpgradePopupBtnEl is null!"); }

    if (confirmPlacementButtonEl) {
        confirmPlacementButtonEl.addEventListener('click', () => {
             console.log("Confirm Placement button clicked.");
             const currentConfirmArea = document.getElementById('confirm-placement-area');
             const feedbackEl = document.getElementById('scanning-feedback');
             if (placedUpgradeEl && (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2')) {
                 console.log(`Finalizing placement for ${placingUpgrade}...`);
                 placedUpgradeEl.setAttribute('auto-shooter', { shootDelay: 5000 });
                 activeShooterUpgrades.push(placedUpgradeEl);
                 if (placingUpgrade === 'shooter1') { upgradeShooter1Placed = true; console.log("Shooter 1 marked as placed."); }
                 else if (placingUpgrade === 'shooter2') { upgradeShooter2Placed = true; console.log("Shooter 2 marked as placed."); }
                 placingUpgrade = null;
                 placedUpgradeEl = null;
                 if (currentConfirmArea) currentConfirmArea.style.display = 'none';
                 if (feedbackEl) feedbackEl.style.display = 'none';
                 const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', false);
                 window.resumeGame(false); // Use window.
             } else {
                  console.warn("Confirm button clicked inappropriately.");
                  if (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') {
                       placingUpgrade = null;
                       if (currentConfirmArea) currentConfirmArea.style.display = 'none';
                       if (feedbackEl) feedbackEl.style.display = 'none';
                       const reticleEl = document.getElementById('placement-reticle');
                       if (reticleEl) reticleEl.setAttribute('visible', false);
                       window.resumeGame(false); // Use window.
                  }
             }
        });
    } else { console.error("Cannot add listener: confirmPlacementButtonEl is null!"); }

    console.log("DEBUG: Upgrade/Confirm/Close/Manual button listeners ATTACHED directly.");


    // --- Initialize UI ---
    console.log("Initializing UI states...");
    window.updateScoreDisplay(); // Use window.
    window.updateTowerHealthUI(); // Use window.

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