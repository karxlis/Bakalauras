// --- Component Definitions ---
AFRAME.registerComponent('follow-shadow', {
    schema: {type: 'selector'},
    init: function() {
        this.el.object3D.renderOrder = -1;
        this.targetEl = null;
        this.initialPosSet = false;
        this.targetEl = this.data ? document.querySelector(this.data) : null;
        if(!this.targetEl && this.data) console.warn(`[follow-shadow] Initial target selector "${this.data}" not found.`);
    },
    update: function(oldData) {
        if (this.data && this.data !== oldData) {
             this.targetEl = document.querySelector(this.data);
             this.initialPosSet = false;
             console.log("[follow-shadow] Target element updated:", this.targetEl ? this.targetEl.id : 'None');
             if(!this.targetEl) console.warn(`[follow-shadow] Updated target selector "${this.data}" not found.`);
        } else if (!this.data) { this.targetEl = null; }
    },
    tick: function() {
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
            towerHit();
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
            window.enemyManager.decrementCount();
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
let score = 0;
let currentLevel = 1; // Start at level 1
let scoreDisplayEl = null;
let levelUpPopupEl = null; // Reference for popup
let levelNumberEl = null;  // Reference for level number text
let levelUpTimeout = null; // Timer for hiding popup

// **** ADD GAME STATE VARIABLES ****
let isGameSetupComplete = false; // Tracks if the initial tower placement is done
let towerPlaced = false;         // Tracks if the tower has been placed in setup
let placedTowerEl = null;        // Reference to the placed tower
// **** END OF GAME STATE VARIABLES ****

// **** ADD NEW STATE VARIABLES ****
let isGamePaused = false;             // General pause flag
let placingUpgrade = null;          // Tracks which upgrade is being placed ('shooter', null, etc.)
let upgradeAvailable_Score10 = true; // Flag to ensure upgrade popup shows only once per threshold
// **** END NEW STATE VARIABLES ****
let placedUpgradeEl = null;// Holds the temporary visual during placement
let activeShooterUpgrades = []; // **** NEW: Keep track of active shooters ****

const TOWER_MAX_HEALTH = 10; // Base max health
let currentMaxTowerHealth = TOWER_MAX_HEALTH; // **** NEW: Track current max health ****
let currentTowerHealth = TOWER_MAX_HEALTH; // Initialize current health
let towerHealthIndicatorEl = null;
let gameOverScreenEl = null;       // Reference to Game Over UI
let finalScoreEl = null;           // Reference to final score display
let isGameOver = false;            // Game over state flag
// **** END TOWER HEALTH & GAME OVER STATE ****

let upgradesPopupEl = null;
let upgradeShooterButtonEl = null;
let upgradeHealthButtonEl = null; // **** NEW: Reference for health button ****
// **** ADD CONFIRM BUTTON REF ****
let confirmPlacementAreaEl = null;
let confirmPlacementButtonEl = null;
let upgradeAvailable_Score20 = true; // **** NEW: Flag for score 20 trigger ****
let upgradeShooterTaken = false;   // **** NEW: Track if shooter upgrade taken ****
let upgradeHealthTaken = false;    // **** NEW: Track if health upgrade taken ****
// **** END CONFIRM BUTTON REF ****

window.enemyManager = {
    activeEnemies: 0,
    maxEnemies: 5,
    spawnInterval: 2000, // Time between spawn checks (ms)
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

function updateScoreDisplay() {
    // Find element only if null (might not be ready on first call)
    scoreDisplayEl = scoreDisplayEl || document.getElementById('score-display');
    if (scoreDisplayEl) {
        scoreDisplayEl.textContent = `Score: ${score}`;
    }
}

// Function to show the level up popup
function showLevelUpPopup(level) {
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
}

// Function to increase orbit speed
function increaseEnemySpeed() {
    console.log("%%%%% increaseEnemySpeed Function Called %%%%%");
    // Increase the global speed multiplier
    window.enemyManager.speedMultiplier *= 1.5; // Increase speed by 50% per level
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
}

// Modified incrementScore to check for level up
window.incrementScore = function() {
    const previousLevel = currentLevel;
    score++;
    currentLevel = Math.floor(score / 5) + 1; // Calculate new level
    console.log("Score increased to:", score, "Current Level:", currentLevel);
    if (currentLevel > previousLevel) {
        console.log("LEVEL UP! Increasing enemy speed and showing popup...");
        increaseEnemySpeed(); // **** CORRECTED FUNCTION CALL ****
        showLevelUpPopup(currentLevel);
    }
    updateScoreDisplay();
};


function updateTowerHealthUI() {
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
}

function towerHit() {
    if (isGameOver) return; // Don't decrease health if game is already over

    currentTowerHealth--;
    console.log(`%cTower Hit! Health: ${currentTowerHealth}/${TOWER_MAX_HEALTH}`, "color: orange; font-weight: bold;");
    updateTowerHealthUI();

    // TODO: Add visual/sound effect for tower hit

    if (currentTowerHealth <= 0) {
        gameOver();
    }
}

function gameOver() {
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
    updateTowerHealthUI(); // Hides health indicator because isGameOver is true

    // Show Game Over screen
    gameOverScreenEl = gameOverScreenEl || document.getElementById('game-over-screen');
    finalScoreEl = finalScoreEl || document.getElementById('final-score');
    if (gameOverScreenEl && finalScoreEl) {
        finalScoreEl.textContent = `Your Score: ${score}`;
        gameOverScreenEl.style.display = 'block';
    }
}

function showUpgradePopup() {
    if (isGameOver || !isGameSetupComplete || placingUpgrade || (upgradeShooterTaken && upgradeHealthTaken)) {
        // Don't show if game over, not set up, placing another upgrade, or both upgrades already taken
        return;
    }

    console.log("Showing Upgrade Popup...");
    isGamePaused = true; // PAUSE THE GAME

    // Stop spawner
    if (window.enemyManager.spawnTimerId) {
        clearInterval(window.enemyManager.spawnTimerId);
        window.enemyManager.spawnTimerId = null;
        console.log("Enemy spawner paused for upgrade.");
    }

    // Hide main controls, show upgrade popup
    const controlsWidget = document.getElementById('controls-widget');
    if (controlsWidget) controlsWidget.style.display = 'none';

    // Get references to buttons INSIDE the function to ensure they are fresh
    upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup');
    upgradeShooterButtonEl = upgradeShooterButtonEl || document.getElementById('upgradeShooterButton');
    upgradeHealthButtonEl = upgradeHealthButtonEl || document.getElementById('upgradeHealthButton');

    // **** Dynamically show/hide buttons based on taken status ****
    if (upgradeShooterButtonEl) {
        upgradeShooterButtonEl.style.display = upgradeShooterTaken ? 'none' : 'inline-block'; // Show if not taken
    }
    if (upgradeHealthButtonEl) {
        upgradeHealthButtonEl.addEventListener('click', () => {
            console.log("Upgrade Health button clicked.");
            if (!isGamePaused || placingUpgrade || upgradeHealthTaken) return; // Added check if already taken

            console.log("Applying Health Upgrade.");
            currentMaxTowerHealth = 20;
            currentTowerHealth = currentMaxTowerHealth;
            upgradeHealthTaken = true; // **** NEW: Mark health upgrade as taken ****

            updateTowerHealthUI();

            if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
            resumeGame();
        });
    }
    // **** END button visibility logic ****

    // Show the popup itself
    if (upgradesPopupEl) upgradesPopupEl.style.display = 'block';

    // Hide reticle initially
     const reticleEl = document.getElementById('placement-reticle');
     if (reticleEl) reticleEl.setAttribute('visible', 'false');
}

// **** PASTE resumeGame HERE ****
function resumeGame() {
    if (isGameOver) return;

    console.log("Resuming game...");
    isGamePaused = false; // UNPAUSE
    placingUpgrade = null; // Clear placing state

    // Hide upgrade popup and potentially placement instructions
    upgradesPopupEl = upgradesPopupEl || document.getElementById('upgrades-popup'); // Ensure ref exists
    if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';

     const reticleEl = document.getElementById('placement-reticle');
     if (reticleEl) reticleEl.setAttribute('visible', 'false');

     const controlsWidget = document.getElementById('controls-widget');
     if (controlsWidget) controlsWidget.style.display = 'block';


    // Restart spawner ONLY if game is running
    if (isGameSetupComplete && !isGameOver && !window.enemyManager.spawnTimerId) {
         window.enemyManager.spawnTimerId = setInterval(spawnEnemy, window.enemyManager.spawnInterval);
         console.log("Enemy spawner resumed.");
    } else if (window.enemyManager.spawnTimerId){
         console.log("Spawner already running?");
    }
}


// **** ADD GAME RESET LOGIC ****
function resetGame() {
    console.log("Resetting game...");

    // Reset state variables
    isGameOver = false;
    isGameSetupComplete = false;
    towerPlaced = false;
    score = 0;
    currentLevel = 1;
    currentMaxTowerHealth = TOWER_MAX_HEALTH;
    currentTowerHealth = TOWER_MAX_HEALTH;
    window.enemyManager.activeEnemies = 0;
    window.enemyManager.speedMultiplier = 1.0;
    isGamePaused = false;
    placingUpgrade = null;
    upgradeAvailable_Score10 = true;
    upgradeAvailable_Score20 = true;
    upgradeShooterTaken = false;
    upgradeHealthTaken = false;

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

    const entitiesToRemove = document.querySelectorAll('.enemy, [projectile-hitter], [id^="shooter-upgrade-"]'); // Also remove shooter upgrades
    entitiesToRemove.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    console.log(`Removed ${entitiesToRemove.length} dynamic entities.`);

    
    activeShooterUpgrades.forEach(shooter => {
        if (shooter.parentNode) {
            shooter.parentNode.removeChild(shooter);
        }
    });
    activeShooterUpgrades = [];
    console.log("Removed active shooter upgrades during reset.");

    // **** NEW: Resume Game Function ****
    
    // Reset UI elements to initial state (like entering AR)
    updateScoreDisplay(); // Reset score display to 0
    updateTowerHealthUI();
    const sceneEl = sceneElGlobal;
    if (sceneEl && sceneEl.is('ar-mode')) {
        // Trigger the setup flow again
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        console.log("Start Game Button Element:", startGameButton); 
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');

        console.log('Restarting setup phase UI.');
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'block'; // Show scanning
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
        if (controlsWidget) controlsWidget.style.display = 'none';
        if (shootButton) shootButton.disabled = true;
        if (startGameButton) startGameButton.disabled = true;
        if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none';
        updateTowerHealthUI(); // Ensure health UI is hidden

        const reticleEl = document.getElementById('placement-reticle');
        if (reticleEl) reticleEl.setAttribute('visible', false);

        // Maybe re-trigger hit-test search? It should still be active.
        // sceneEl.emit('ar-hit-test-start'); // Optional: force start event
    } else {
        // If not in AR mode, just ensure UI is reasonable for non-AR
         const controlsWidget = document.getElementById('controls-widget');
         if(controlsWidget) controlsWidget.style.display = 'block';
    }
}



function spawnEnemy() {
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

} // End of spawnEnemy
   


window.toggleSphereColor = function({value}) {
    console.log("Toggle Sphere Color:", value);
    // Find scene element dynamically
    const scene = document.querySelector('a-scene');
    const sphere = scene ? scene.querySelector('#objects a-sphere') : null;
    if (sphere) {
        sphere.setAttribute('color', value);
        const label = document.getElementById('sphere-label');
        if (label) label.textContent = `A ${value === '#EF2D5E' ? 'red' : 'blue'} sphere`;
    } else { console.warn("Could not find the sphere element."); }
}
window.toggleLabels = function({value}) {
     const shouldHide = value === 'no';
     console.log(`Toggle Labels: Value=${value}, Should Hide=${shouldHide}`);
     // Find overlay dynamically
     const overlayEl = document.getElementById('dom-overlay');
     if(overlayEl) {
          overlayEl.classList.toggle('hide-labels', shouldHide);
     } else {
          console.warn("Could not find dom-overlay element to toggle labels.");
     }
}

     // Make incrementScore global
     window.incrementScore = function() {
        if (isGameOver) return;
    
        const previousLevel = currentLevel;
        score++;
        currentLevel = Math.floor(score / 5) + 1;
        console.log("Score increased to:", score, "Current Level:", currentLevel);
    
        // --- Level Up Logic ---
        if (currentLevel > previousLevel) {
            console.log("LEVEL UP! Increasing enemy speed and showing popup...");
            increaseEnemySpeed();
            showLevelUpPopup(currentLevel); // Shows the small "Level X" notification
        }
    
        // --- Upgrade Trigger Logic ---
        const SCORE_THRESHOLD_UPGRADE1 = 10;
        const SCORE_THRESHOLD_UPGRADE2 = 20; // **** NEW: Score 20 threshold ****
        if (score === SCORE_THRESHOLD_UPGRADE1 && upgradeAvailable_Score10) {
            console.log(`Score reached ${SCORE_THRESHOLD_UPGRADE1}! Triggering upgrade popup.`);
            upgradeAvailable_Score10 = false; // Prevent re-triggering for score 10
            showUpgradePopup(); // Shows the choice popup
       }

       // **** NEW: Check Score 20 Trigger ****
       else if (score === SCORE_THRESHOLD_UPGRADE2 && upgradeAvailable_Score20) {
            // Only show if at least one upgrade is still available
            if (!upgradeShooterTaken || !upgradeHealthTaken) {
               console.log(`Score reached ${SCORE_THRESHOLD_UPGRADE2}! Triggering upgrade popup.`);
               upgradeAvailable_Score20 = false; // Prevent re-triggering for score 20
               showUpgradePopup(); // Shows the choice popup (will only show available buttons)
            } else {
                console.log(`Score reached ${SCORE_THRESHOLD_UPGRADE2}, but both upgrades already taken.`);
            }
       }
       // **** END Score 20 Trigger Check ****
   
       // Add more upgrade triggers later if needed
   
       updateScoreDisplay(); // Update score display
    };


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

        // Stop orbiting if targets exist
        if (window.enemyManager.spawnTimerId) {
            clearInterval(window.enemyManager.spawnTimerId);
            window.enemyManager.spawnTimerId = null;
            console.log("Enemy spawner stopped.");
        }
        // Remove existing enemies on exit?
        const enemies = document.querySelectorAll('.enemy');
         enemies.forEach(enemy => {
             if(enemy.parentNode) enemy.parentNode.removeChild(enemy);
         });
         window.enemyManager.activeEnemies = 0;
         console.log("Cleared existing enemies.");



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
            // Handle hit-test achievement after setup if needed (e.g., for generic cube placement)
            const placementCheckbox = document.getElementById('placementModeCheckbox');
             if (placementCheckbox && placementCheckbox.checked && reticleEl) {
                reticleEl.setAttribute('visible', 'true');
             }
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
             // Handle hit-test lost after setup if needed
            if (reticleEl) reticleEl.setAttribute('visible', 'false');
        }
    });
    // AR Placement Listener - Modified for Setup Phase with Repositioning

    sceneElGlobal.addEventListener('ar-hit-test-select', (e) => {
        console.log("Event: ar-hit-test-select FIRED!");
        const reticleEl = document.getElementById('placement-reticle');

        // --- SETUP PHASE ---
        if (!isGameSetupComplete && reticleEl && reticleEl.getAttribute('visible')) {
            const position = reticleEl.getAttribute('position');
            if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                 console.error("Placement/Move failed: Invalid position from reticle.", position); return;
            }
            console.log(`Reticle position for placement/move: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}`);

            if (!towerPlaced) {
                // --- First Tap: Create the Tower ---
                console.log('Setup Phase: Attempting to place TOWER for the first time...');

                // Create the tower (Tall, Dark Blue Box)
                const tower = document.createElement('a-box');
                tower.setAttribute('id', 'placed-base-tower');
                tower.setAttribute('color', '#00008B'); // Dark Blue
                tower.setAttribute('height', '0.2');
                tower.setAttribute('width', '0.1');
                tower.setAttribute('depth', '0.0');
                tower.setAttribute('position', position); // Set initial position
                tower.setAttribute('shadow', 'cast: true; receive: false;');

                console.log("Tower attributes set.");
                sceneElGlobal.appendChild(tower);
                placedTowerEl = tower; // Store reference
                towerPlaced = true; // Mark as placed
                console.log('Tower successfully placed.');

                // Update UI: Enable Start button, show feedback
                // Reticle remains visible for potential repositioning
                const startGameButton = document.getElementById('startGameButton');
                const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
                if (startGameButton) startGameButton.disabled = false;
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

        // --- GAME PHASE ---
        } else if (isGameSetupComplete) {
            // Handle standard cube placement (if enabled)
            const placementCheckbox = document.getElementById('placementModeCheckbox');
            const isPlacementMode = placementCheckbox && placementCheckbox.checked;
            const isReticleVisible = reticleEl && reticleEl.getAttribute('visible');
            console.log(`Game Phase: Placement Mode Checked?: ${isPlacementMode}, Is Reticle Visible?: ${isReticleVisible}`);

            if (isPlacementMode && isReticleVisible) {
                console.log('Game Phase: Conditions met: Attempting to place NEW cube...');
                const position = reticleEl.getAttribute('position');
                 if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { console.error("Placement failed: Invalid position from reticle.", position); return; }
                 const newBox = document.createElement('a-box');
                 newBox.classList.add('interactive');
                 newBox.setAttribute('position', position);
                 newBox.setAttribute('scale', '0.2 0.2 0.2');
                 newBox.setAttribute('color', '#228B22');
                 newBox.setAttribute('shadow', 'cast: true; receive: false;');
                 newBox.setAttribute('draggable', '');
                 sceneElGlobal.appendChild(newBox);
                 console.log('New game cube successfully appended to the scene.');
            } else {
                 console.log(`Game phase placement check failed or not active. Mode Active: ${isPlacementMode}, Reticle Visible: ${isReticleVisible}.`);
            }
        } else {
            console.log("Tap ignored: Setup not complete and reticle not visible, or game phase placement check failed.");
        }
    });

} // End of else block for sceneElGlobal check


    // AR Placement Listener - Handles Tower, Upgrade, and Generic Cube placement
    sceneElGlobal.addEventListener('ar-hit-test-select', (e) => {
        console.log("Event: ar-hit-test-select FIRED!");
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback'); // Needed for upgrade placement instructions

        // --- UPGRADE PLACEMENT ---
        if (placingUpgrade === 'shooter' && reticleEl && reticleEl.getAttribute('visible')) {
            const position = reticleEl.getAttribute('position');
            if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { /* Error handling */ return;}

            if (!placedUpgradeEl) { // First tap: Create visual representation ONLY
                console.log("Placing shooter upgrade visually...");
                const shooterBox = document.createElement('a-box');
                const visualId = `shooter-upgrade-visual-${Date.now()}`;
                shooterBox.setAttribute('id', visualId);
                shooterBox.setAttribute('color', '#FF6347'); // Tomato color
                shooterBox.setAttribute('scale', '0.15 0.15 0.15');
                shooterBox.setAttribute('height', '0.4');
                shooterBox.setAttribute('position', position);
                shooterBox.setAttribute('shadow', 'cast: true; receive: false;');
                // NO auto-shooter component here

                sceneElGlobal.appendChild(shooterBox);
                placedUpgradeEl = shooterBox; // Store reference to the VISUAL element

                // Enable confirm button
                const currentConfirmButton = document.getElementById('confirmPlacementButton');
                if (currentConfirmButton) currentConfirmButton.disabled = false;

                // Update instructions
                const feedbackEl = document.getElementById('scanning-feedback');
                if(feedbackEl){ feedbackEl.textContent = "Tap to move, or Confirm Placement"; }

            } else { // Subsequent taps: Move the visual
                 console.log('Moving shooter upgrade visual...');
                 placedUpgradeEl.setAttribute('position', position);
                 console.log('Shooter upgrade position updated.');
            }

        // --- TOWER PLACEMENT / MOVE (Setup Phase) ---
        } else if (!isGameSetupComplete && reticleEl && reticleEl.getAttribute('visible')) {
            const position = reticleEl.getAttribute('position');
            if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
                 console.error("Placement/Move failed: Invalid position from reticle.", position); return;
            }
            console.log(`Reticle position for placement/move: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}`);

            if (!towerPlaced) {
                // --- First Tap: Create the Tower ---
                console.log('Setup Phase: Attempting to place TOWER for the first time...');
                const tower = document.createElement('a-box');
                tower.setAttribute('id', 'placed-base-tower');
                tower.setAttribute('color', '#00008B'); // Dark Blue
                tower.setAttribute('height', '1.0');    // Ensure height is 1.0
                tower.setAttribute('width', '0.3');
                tower.setAttribute('depth', '0.3');
                tower.setAttribute('position', position);
                tower.setAttribute('shadow', 'cast: true; receive: false;');

                console.log("Tower attributes set.");
                sceneElGlobal.appendChild(tower);
                placedTowerEl = tower;
                towerPlaced = true;
                console.log('Tower successfully placed.');

                // Update UI
                const startGameButton = document.getElementById('startGameButton');
                const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
                if (startGameButton) startGameButton.disabled = false;
                if (towerPlacedFeedback) {
                    towerPlacedFeedback.textContent = "Tower Placed! Tap again to move or press Start.";
                    towerPlacedFeedback.style.display = 'block';
                }
                if(reticleEl) reticleEl.setAttribute('visible', 'true'); // Keep reticle visible

            } else if (placedTowerEl) {
                 // --- Subsequent Taps: Move the Existing Tower ---
                 console.log('Setup Phase: Moving existing tower...');
                 placedTowerEl.setAttribute('position', position);
                 console.log('Tower position updated.');
            }

        // --- GENERIC CUBE PLACEMENT (Game Phase, if enabled) ---
        } else if (isGameSetupComplete && !isGamePaused) { // Add !isGamePaused check
             const placementCheckbox = document.getElementById('placementModeCheckbox');
             const isPlacementMode = placementCheckbox && placementCheckbox.checked;
             const isReticleVisible = reticleEl && reticleEl.getAttribute('visible');
             // console.log(`Game Phase: Placement Mode Checked?: ${isPlacementMode}, Is Reticle Visible?: ${isReticleVisible}`); // Less verbose log

             if (isPlacementMode && isReticleVisible) {
                console.log('Game Phase: Placing generic cube...');
                const position = reticleEl.getAttribute('position');
                 if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { console.error("Placement failed: Invalid position from reticle.", position); return; }
                 const newBox = document.createElement('a-box');
                 newBox.classList.add('interactive');
                 newBox.setAttribute('position', position);
                 newBox.setAttribute('scale', '0.2 0.2 0.2');
                 newBox.setAttribute('color', '#228B22');
                 newBox.setAttribute('shadow', 'cast: true; receive: false;');
                 newBox.setAttribute('draggable', ''); // Ensure draggable is from aframe-extras
                 sceneElGlobal.appendChild(newBox);
                 console.log('New game cube successfully appended.');
            } else {
                 // console.log(`Game phase placement check failed or not active. Mode Active: ${isPlacementMode}, Reticle Visible: ${isReticleVisible}.`); // Can uncomment if needed
            }
        } else {
            console.log("Tap ignored: Conditions not met (Setup, Upgrade Placement, Game Placement).");
        }
    }); // End ar-hit-test-select listener


// --- Run Setup After DOM Loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI listeners and initial state...");

    // Get references (many already exist from original code)
    const sceneEl_dom = document.querySelector('a-scene');
    const overlay = document.getElementById('dom-overlay');
    const exitVRButton = document.getElementById('exitVRButton');
    const placementCheckbox = document.getElementById('placementModeCheckbox');
    const shootButton = document.getElementById('shootButton');
    const cameraEl = document.getElementById('player-camera');
    const cameraMarkerEl = document.getElementById('camera-aim-marker');
    const controlsWidget = document.getElementById('controls-widget'); // Need this


    
    // **** ADD REFERENCES FOR NEW ELEMENTS ****
    const placeTowerPopupEl = document.getElementById('place-tower-popup');
    const startGameButton = document.getElementById('startGameButton');
    const scanningFeedbackEl = document.getElementById('scanning-feedback'); // Already if (!sceneInstance || !overlay || !startGameButton || !placeTowerPopupEl || !tryAgainButton || !gameOverScreenEl || !towerHealthIndicatorEl || !upgradesPopup, useful here
    // **** END NEW REFERENCES ****

  // **** GET REFERENCES FOR NEW UI ****
    towerHealthIndicatorEl = document.getElementById('tower-health-indicator');
    gameOverScreenEl = document.getElementById('game-over-screen');
    finalScoreEl = document.getElementById('final-score');
    const tryAgainButton = document.getElementById('tryAgainButton');
    scoreDisplayEl = document.getElementById('score-display');
    levelUpPopupEl = document.getElementById('level-up-popup');
    // Assign scoreDisplayEl etc. (existing code)
    scoreDisplayEl = document.getElementById('score-display');
    levelUpPopupEl = document.getElementById('level-up-popup');
    levelNumberEl = document.getElementById('level-number');

    upgradesPopupEl = document.getElementById('upgrades-popup');
    upgradeShooterButtonEl = document.getElementById('upgradeShooterButton');
    upgradeHealthButtonEl = document.getElementById('upgradeHealthButton'); // **** NEW: Get health button ref ****
    confirmPlacementAreaEl = document.getElementById('confirm-placement-area');
    confirmPlacementButtonEl = document.getElementById('confirmPlacementButton');
    towerHealthIndicatorEl = document.getElementById('tower-health-indicator');
    gameOverScreenEl = document.getElementById('game-over-screen');
    finalScoreEl = document.getElementById('final-score');

    const sceneInstance = sceneElGlobal || sceneEl_dom;

    if (!upgradeHealthButtonEl) {
        console.error("Essential page element not found: #upgradeHealthButton");
        // return; // Optional: stop execution if critical elements missing
    }

    // Simplified check - assume most elements are there from HTML
    if (!sceneInstance || !overlay || !startGameButton || !placeTowerPopupEl || !tryAgainButton || !gameOverScreenEl || !towerHealthIndicatorEl || !upgradesPopupEl || !upgradeShooterButtonEl) { // Added upgrade UI checks
        console.error("Essential page elements not found within DOMContentLoaded!"); return;
   } else {
        console.log("Essential elements confirmed within DOMContentLoaded.");
   }

    // Existing vectors for shooting (no change needed here)
    const shootCameraWorldPos = new THREE.Vector3();
    const shootCameraWorldDir = new THREE.Vector3();
    const targetMarkerWorldPos = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();
    const projectileStartPos = new THREE.Vector3();

    // Existing overlay interaction listener (no change needed)
    overlay.addEventListener('beforexrselect', function (e) { /* ... */ });

    // Existing checkbox change listener (might become less relevant during setup)
    placementCheckbox.addEventListener('change', () => {
        console.log("Placement checkbox changed:", placementCheckbox.checked);
        // This logic might need refinement depending on how setup/game phases interact
        if (sceneInstance.is('ar-mode') && isGameSetupComplete) {
             const reticleEl_dom = document.getElementById('placement-reticle');
             const isReticleCurrentlyVisible = reticleEl_dom && reticleEl_dom.getAttribute('visible');
             if (!placementCheckbox.checked) { // Interaction Mode
                 if(reticleEl_dom) reticleEl_dom.setAttribute('visible', 'false');
             } else { // Placement Mode
                 if (isReticleCurrentlyVisible && reticleEl_dom) {
                     reticleEl_dom.setAttribute('visible', 'true'); // Show if surface found
                 }
                 // Note: Doesn't show 'Scanning...' here anymore, relies on hit-test events
             }
        }

        
    });

    // --- UI Functions ---
    // Definitions are now in global scope
    // window.toggleSphereColor = function({value}) { ... }
    // window.toggleLabels = function({value}) { ... }

    // --- Checkbox Change Listener ---
    placementCheckbox.addEventListener('change', () => {
        console.log("Placement checkbox changed:", placementCheckbox.checked);
        if (sceneInstance.is('ar-mode')) {
            const isReticleCurrentlyVisible = reticleEl_dom && reticleEl_dom.getAttribute('visible');
            if (!placementCheckbox.checked) { // Interaction Mode
                console.log("Switched to Interaction mode.");
                if(reticleEl_dom) reticleEl_dom.setAttribute('visible', 'false');
                if(scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
            } else { // Placement Mode
                console.log("Switched to Placement mode.");
                if (!isReticleCurrentlyVisible && scanningFeedbackEl) {
                     scanningFeedbackEl.textContent = "Scanning for surfaces...\nMove phone slowly.";
                     scanningFeedbackEl.style.display = 'block';
                } else if (isReticleCurrentlyVisible && scanningFeedbackEl) {
                    scanningFeedbackEl.style.display = 'none';
                }
                if (isReticleCurrentlyVisible && reticleEl_dom) {
                     reticleEl_dom.setAttribute('visible', 'true');
                }
            }
        }
    });


    // --- Shoot Button Listener (Targets Camera Marker, Uses projectile-hitter) ---
    shootButton.addEventListener('click', () => {
        console.log("Shoot button clicked.");
        if (!isGameSetupComplete || isGameOver) { // **** ADD isGameOver CHECK ****
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
            targetSelector: '.enemy' // **** CORRECTED TARGET ****
        });
         console.log("Projectile component attributes set.");

         sceneInstance.appendChild(projectile);
         console.log("Projectile added to scene.");

    }); // End of shoot button listener

    startGameButton.addEventListener('click', () => {
        if (towerPlaced) {
            console.log("Tower is placed. Starting game!");
            // Reset state for new game
            isGameSetupComplete = true;
            isGameOver = false; // Ensure game over is false
            currentMaxTowerHealth = TOWER_MAX_HEALTH;
            currentTowerHealth = TOWER_MAX_HEALTH; // Reset health
            score = 0; // Reset score
            currentLevel = 1; // Reset level
            window.enemyManager.activeEnemies = 0;
            window.enemyManager.speedMultiplier = 1.0;

            // Update UI
            updateScoreDisplay(); // Show score 0
            updateTowerHealthUI();  // Show full health

            // ... (hide setup UI, show game UI, enable shoot button) ...
            if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
            const reticleEl = document.getElementById('placement-reticle');
            if (reticleEl) reticleEl.setAttribute('visible', false);
            if (controlsWidget) controlsWidget.style.display = 'block';
            if (shootButton) shootButton.disabled = false;


            // Start Enemy Spawner
            if (window.enemyManager.spawnTimerId) clearInterval(window.enemyManager.spawnTimerId);
            window.enemyManager.spawnTimerId = setInterval(spawnEnemy, window.enemyManager.spawnInterval);
            console.log(`Enemy spawner started with interval: ${window.enemyManager.spawnInterval}ms`);

        } else {
            console.warn("Start button clicked, but tower not placed yet.");
        }
    });

     // **** ADD TRY AGAIN BUTTON LISTENER ****

    tryAgainButton.addEventListener('click', resetGame);
 // **** ADD UPGRADE BUTTON LISTENER ****
 upgradeShooterButtonEl.addEventListener('click', () => {
    console.log("Upgrade Shooter button clicked.");
    if (!isGamePaused || placingUpgrade) return;

    if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
    placingUpgrade = 'shooter';
    placedUpgradeEl = null;

    const reticleEl = document.getElementById('placement-reticle');
    const feedbackEl = document.getElementById('scanning-feedback');

    
    confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
        confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');

    if (reticleEl) reticleEl.setAttribute('visible', true);
    if (feedbackEl) {
        feedbackEl.textContent = "Tap surface to place Shooter Upgrade";
        feedbackEl.style.display = 'block';
    }

    if (confirmPlacementAreaEl) {
        console.log("Attempting to show confirm placement area..."); // Log before
        confirmPlacementAreaEl.style.display = 'block';
        // **** ADD THIS LOG ****
        //console.log("Computed display style for #confirm-placement-area:", window.getComputedStyle(confirmPlacementAreaEl).display);
        // **** END ADDED LOG ****
    } else {
        console.error("Confirm placement area element NOT found!");
    }

    if (confirmPlacementButtonEl) {
         confirmPlacementButtonEl.disabled = true;
    } else {
         console.error("Confirm placement button element NOT found!");
    } 

});

if (upgradeHealthButtonEl) { // Check if button exists before adding listener
    upgradeHealthButtonEl.addEventListener('click', () => {
        console.log("Upgrade Health button clicked.");
        if (!isGamePaused || placingUpgrade) return; // Should only trigger when popup is visible

        console.log("Applying Health Upgrade.");
        currentMaxTowerHealth = 20; // Set new max health
        currentTowerHealth = currentMaxTowerHealth; // Heal to full new max health

        updateTowerHealthUI(); // Update the UI immediately

        // Hide popup and resume game (no placement needed for this upgrade)
        if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
        resumeGame();
    });
}

    // --- Initialize UI ---
    console.log("Initializing UI states...");
    updateScoreDisplay();
    updateTowerHealthUI(); 

    setTimeout(() => {
       if (window.toggleLabels) { window.toggleLabels({ value: document.querySelector('input[name="labelsVisible"]:checked')?.value || 'no' }); }
       if (window.toggleSphereColor) { window.toggleSphereColor({ value: document.querySelector('input[name="sphereColor"]:checked')?.value || '#EF2D5E' }); }
        const sphereLabel = document.getElementById('sphere-label');
        const boxLabel = document.getElementById('box-label');
        const cylinderLabel = document.getElementById('cylinder-label');
        if(sphereLabel) sphereLabel.textContent = 'A red sphere';
        if(boxLabel) boxLabel.textContent = 'A blue box';
        if(cylinderLabel) cylinderLabel.textContent = 'A yellow cylinder';
    }, 0);



    // --- Set willReadFrequently on Canvas ---
    sceneInstance.addEventListener('loaded', () => {
        console.log("Scene loaded event. Attempting to set willReadFrequently.");
        const canvas = sceneInstance.canvas;
        if (canvas) {
            try { canvas.getContext('2d', { willReadFrequently: true }); console.log("Set 'willReadFrequently' on 2D context."); } catch (e) {
                try { canvas.getContext('webgl', { antialias: true }); console.log("Got WebGL context instead."); } catch(glError) { console.warn("Could not get canvas context."); }
            }
        } else { console.warn("Canvas element not found on scene load."); }
      });

      confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
      confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area'); // Get ref for hiding area
  
      confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton'); // Keep initial ref for adding listener
      if (confirmPlacementButtonEl) {
        // **** REPLACE existing listener with this ****
        confirmPlacementButtonEl.addEventListener('click', () => {
            console.log("Confirm Placement button clicked.");

            

            const currentConfirmArea = document.getElementById('confirm-placement-area');
            const feedbackEl = document.getElementById('scanning-feedback');

            // Check if we were placing the shooter AND the visual element exists
            if (placingUpgrade === 'shooter' && placedUpgradeEl) {
                console.log(`CONFIRM: Attaching auto-shooter to ${placedUpgradeEl.id}`); // <-- ADD LOG
                placedUpgradeEl.setAttribute('auto-shooter', { shootDelay: 2500 });
                console.log(`CONFIRM: Component attached. Check inspector.`); // <-- ADD LOG
                activeShooterUpgrades.push(placedUpgradeEl);
                upgradeShooterTaken = true; // **** NEW: Mark shooter upgrade as taken ****
                 // **** NEW: Add to active list for reset ****

                // Reset state and UI
                placingUpgrade = null;
                placedUpgradeEl = null; // Clear the temporary reference

                if (currentConfirmArea) currentConfirmArea.style.display = 'none';
                if (feedbackEl) feedbackEl.style.display = 'none';

                // Hide reticle after placement
                const reticleEl = document.getElementById('placement-reticle');
                 if (reticleEl) reticleEl.setAttribute('visible', false);

                // Resume the game
                resumeGame();

            } else {
                 console.warn("Confirm button clicked inappropriately.");
                 // Cleanup if needed and resume
                 if (placingUpgrade === 'shooter') {
                     placingUpgrade = null;
                     if (currentConfirmArea) currentConfirmArea.style.display = 'none';
                     if (feedbackEl) feedbackEl.style.display = 'none';
                     const reticleEl = document.getElementById('placement-reticle');
                     if (reticleEl) reticleEl.setAttribute('visible', false);
                     resumeGame();
                 }
            }
        });
      } else {
           console.error("Confirm Placement Button element could not be found to attach listener!");
      }
    

}); // End of DOMContentLoaded listener