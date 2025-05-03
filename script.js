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
            INITIAL_SLOW_PERCENTAGE: 0.90,// Base slow for newly placed turret
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
            INITIAL_DELAY: 6000,
            INITIAL_SLOW_PERCENTAGE: 0.3,
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
// // --- Component Definitions ---
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
        targetSelector: { type: 'string', default: '.enemy' },
        collisionRadius: { type: 'number', default: 0.2 },
        damage: { type: 'number', default: 1 },
        isSlowing: { type: 'boolean', default: false },
        slowAmount: { type: 'number', default: 0 },
        aoeRadius: { type: 'number', default: 1.5 } // **** NEW: AoE Radius ****fault: 0 }
        // **** END SLOWING SCHEMA ****
    },
    init: function () {
        if (this.data.direction.lengthSq() > 0.001) { this.data.direction.normalize(); }
        else { this.data.direction.set(0, 0, -1); }
        this.targets = [];
        this.targetsFound = false;
        this.projectileWorldPos = new THREE.Vector3();
        this.targetWorldPos = new THREE.Vector3(); // Position of primary target hit
        this.otherEnemyWorldPos = new THREE.Vector3(); // For checking nearby enemies
        this.collisionRadiusSq = this.data.collisionRadius * this.data.collisionRadius;
        this.aoeRadiusSq = this.data.aoeRadius * this.data.aoeRadius; // Pre-calculate squared radius

      // Defer target query slightly
      setTimeout(() => {
        this.targets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
        console.log(`[projectile-hitter] Initialized. Targeting: ${this.data.targetSelector}. Found ${this.targets.length} initial targets.`);
        if(this.targets.length === 0) console.warn(`[projectile-hitter] No initial targets found for ${this.data.targetSelector}`);
        this.targetsFound = this.targets.length > 0;
      }, 100);
    },
    tick: function (time, timeDelta) {
        console.log('[projectile-hitter] Initialized with data:', this.data);
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

 // Loop through potential targets
       for (let i = 0; i < this.targets.length; i++) {
         const primaryTarget = this.targets[i]; // Renamed for clarity
         if (!primaryTarget?.object3D) continue;
         const targetVisibleAttr = primaryTarget.getAttribute('visible');
         const primaryHitReceiver = primaryTarget.components['hit-receiver'];

         if (targetVisibleAttr && primaryTarget.object3D.visible && primaryHitReceiver) {
           primaryTarget.object3D.getWorldPosition(this.targetWorldPos); // Store primary target position
           const distSq = this.projectileWorldPos.distanceToSquared(this.targetWorldPos);

           // --- Collision Detected ---
           if (distSq < this.collisionRadiusSq) {

             // Apply effect based on projectile type
             if (data.isSlowing) {
                 console.log(`%c[projectile-hitter] SLOW HIT on Primary: ${primaryTarget.id}! Amount: ${data.slowAmount * 100}%`, "color: cyan; font-weight: bold;");
                 // --- Apply Slow to Primary Target ---
                 primaryHitReceiver.applySlow(data.slowAmount);

                 // --- Apply AoE Slow ---
                 console.log(`[projectile-hitter] Checking for AoE targets within ${data.aoeRadius}m...`);
                 const allEnemies = this.el.sceneEl.querySelectorAll(data.targetSelector + '[visible="true"]'); // Get currently visible enemies
                 let aoeHits = 0;

                 allEnemies.forEach(otherEnemy => {
                    if (otherEnemy === primaryTarget || !otherEnemy?.object3D?.visible) {
                        return; // Skip the primary target and non-visible ones
                    }

                    const secondaryHitReceiver = otherEnemy.components['hit-receiver'];
                    if (!secondaryHitReceiver) return; // Skip if no hit-receiver

                    // Check distance from the impact point (primary target position)
                    otherEnemy.object3D.getWorldPosition(this.otherEnemyWorldPos);
                    const distToImpactSq = this.targetWorldPos.distanceToSquared(this.otherEnemyWorldPos);

                    if (distToImpactSq < this.aoeRadiusSq) {
                        console.log(`  -> Applying AoE slow to ${otherEnemy.id}`);
                        secondaryHitReceiver.applySlow(data.slowAmount);
                        aoeHits++;
                    }
                 });
                 if (aoeHits > 0) console.log(`[projectile-hitter] Applied AoE slow to ${aoeHits} additional targets.`);
                 // --- End AoE Slow ---

             } else { // Regular Damage Hit
                 console.log(`%c[projectile-hitter] DAMAGE HIT on: ${primaryTarget.id}! Damage: ${data.damage}`, "color: green; font-weight: bold;");
                 primaryHitReceiver.hit(data.damage);
             }

             // Remove Projectile after applying effect(s)
             if (el.parentNode) { el.parentNode.removeChild(el); }
             return; // Exit loop and tick after hit
           }
         }
       } // End target loop
     } // End tick
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

    updateHealthText: function() {
        if (this.healthTextEl && this.isEnemy && this.data.maxHealth > 1) {
            this.healthTextEl.setAttribute('value', `HP: ${this.currentHealth}`);
            this.healthTextEl.setAttribute('visible', this.currentHealth > 0);
        } else if (this.healthTextEl) {
             this.healthTextEl.setAttribute('visible', false);
        }
    },

    init: function () {
        this.isVisible = this.el.getAttribute('visible');
        this.respawnTimer = null;
        this.hit = this.hit.bind(this); // Keep this bind
        // REMOVED BIND for updateHealthText
        this.isEnemy = this.el.classList.contains('enemy');
        this.currentHealth = this.data.initialHealth;
        this.healthTextEl = this.el.querySelector('.enemy-health-text');
        console.log(`[hit-receiver] Initialized on ${this.el.id}. Is Enemy: ${this.isEnemy}. MaxHealth: ${this.data.maxHealth}, CurrentHealth: ${this.currentHealth}`);
        this.updateHealthText(); // Initial update - Should definitely work now
    },

    hit: function(damageAmount = 1) {
        // Initial checks (Should be present)
        if (!this.isVisible || isGameOver) { return; }
        console.log(`[hit-receiver] ${this.el.id} HIT for ${damageAmount} damage!`);

        // Check if it's an enemy (Should be present)
        if (this.isEnemy) {

            // **** CRITICAL: Health Subtraction ****
            // Make SURE this line exists and is correct
            this.currentHealth -= damageAmount;
            this.currentHealth = Math.max(0, this.currentHealth); // Prevent negative
            // **** ----------------------------- ****

            console.log(`[hit-receiver] Enemy health: ${this.currentHealth}/${this.data.maxHealth}`);
            this.updateHealthText(); // Update health display

            // **** CRITICAL: Destruction Check ****
            // Make SURE this entire 'if' block exists and is correct
            if (this.currentHealth <= 0) {
                // --- Enemy destroyed logic ---
                 console.log(`[hit-receiver] Enemy ${this.el.id} destroyed!`);
                 this.isVisible = false;
                 this.el.setAttribute('visible', 'false');
                 if (window.incrementScore) { window.incrementScore(); }
                 if (window.enemyManager) { window.enemyManager.decrementCount(); }
                 if (this.el.parentNode) {
                     const removeDelay = GAME_CONFIG.TIMINGS.ENEMY_REMOVE_DELAY_MS;
                     setTimeout(() => { if(this.el.parentNode) this.el.parentNode.removeChild(this.el); }, removeDelay);
                 }
            // **** -------------------------- ****

            } else {
                // --- Enemy Damaged but not destroyed ---
                // (The Flash logic block we added goes in here)
                try {
                    // **** INCREASED DURATION & BRIGHT COLOR ****
                    const particleDuration = 800; // ms (Make it last longer)
                    const particleColor = '#FFFFFF'; // Bright Cyan - high visibility

                    const hitPosition = new THREE.Vector3();
                    this.el.object3D.updateMatrixWorld(true);
                    this.el.object3D.getWorldPosition(hitPosition);

                    // **** SLIGHTLY OFFSET POSITION (e.g., slightly above) ****
                    hitPosition.y += 0.1; // Move it up a tiny bit from enemy origin

                    console.log(`[hit-receiver] Creating DEBUG hit particle for ${this.el.id}`);

                    const impactMarker = document.createElement('a-ring');

                    impactMarker.setAttribute('position', hitPosition); // Use slightly offset position
                    impactMarker.setAttribute('color', particleColor);
                    impactMarker.setAttribute('material', 'shader: flat; side: double;');

                    // **** INCREASED SIZE ****
                    impactMarker.setAttribute('radius-inner', '0.05'); // Larger inner radius
                    impactMarker.setAttribute('radius-outer', '0.30'); // Larger outer radius

                    impactMarker.setAttribute('rotation', '0 0 0'); // Keep flat

                 
                    impactMarker.setAttribute('animation__hithide', {
                        property: 'scale',
                        from: '1 1 1',
                        to: '0 0 0',
                        dur: particleDuration, // Use longer duration
                        easing: 'easeInQuad'
                    });

                    this.el.sceneEl.appendChild(impactMarker);

                    // Remove after longer duration + buffer
                    setTimeout(() => {
                        if (impactMarker && impactMarker.parentNode) {
                           impactMarker.parentNode.removeChild(impactMarker);
                        }
                    }, particleDuration + 100); // Remove after animation ends

                } catch (particleError) {
                    console.error(`[hit-receiver] Error creating particle effect for ${this.el.id}:`, particleError);
                }
            }
        } else {
            // ... Non-enemy hit logic ...
            console.log(`[hit-receiver] Non-enemy ${this.el.id} hit. No action taken.`);
        }
    }, // End hit function

  // --- Inside 'hit-receiver' component ---
  applySlow: function(slowAmount) {
    // Problematic console.log removed.

    if (!this.isEnemy || isGameOver) return; // Only slow active enemies

    console.log(`[hit-receiver] Applying slow (${(slowAmount * 100).toFixed(0)}%) to ${this.el.id}`); // This log should appear now
    const moveComponent = this.el.components['move-towards-target'];

    if (moveComponent && moveComponent.applySlowEffect) {
        const SLOW_DURATION_MS = 3000; // Slow lasts for 3 seconds
        moveComponent.applySlowEffect(slowAmount, SLOW_DURATION_MS); // This should now be called
    } else {
        console.warn(`[hit-receiver] Could not find move-towards-target component or applySlowEffect method on ${this.el.id} to apply slow.`);
    }
    // Note: Projectile removal is handled by projectile-hitter
},
    // **** END HEALTH TEXT UPDATE FUNCTION ****
    remove: function() {
        if (this.respawnTimer) { clearTimeout(this.respawnTimer); }
        // Decrement count if removed externally AND health was > 0
        if (this.isEnemy && window.enemyManager && this.currentHealth > 0 && !isGameOver) {
             // Only decrement if it wasn't already destroyed by a hit
            window.enemyManager.decrementCount();
       //     console.warn(`[hit-receiver] Decremented count via REMOVE for ${this.el.id} which had health > 0.`);
        }
    }
});

// priesai juda prie boxto
AFRAME.registerComponent('move-towards-target', {
    schema: {
        target: { type: 'selector' },
        speed: { type: 'number', default: GAME_CONFIG.ENEMIES.BASE_SPEED },
        reachDistance: { type: 'number', default: GAME_CONFIG.ENEMIES.TARGET_REACH_DISTANCE }
    },
    init: function () {
        this.targetPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        // **** ADD SLOW STATE VARIABLES ****
        this.isSlowed = false;
        this.slowMultiplier = 1.0; // 1.0 means no slow
        this.slowEndTime = 0;
        this.originalColor = null; // To store original color when slowed
        // **** END SLOW STATE ****


        const currentScale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 }; // Get current scale if possible
        const targetScale = { x: currentScale.x * 0.75, y: currentScale.y * 0.75, z: currentScale.z * 0.75 }; // Scale down slightly

        this.el.setAttribute('animation__wiggle', { // Renamed animation for clarity
            property: 'scale',                          // Target scale property
            from: `${currentScale.x} ${currentScale.y} ${currentScale.z}`, // Start at original scale
            to: `${targetScale.x} ${targetScale.y} ${targetScale.z}`,     // Go to smaller scale
            dur: 500,                                   // Duration of one pulse phase (ms)
            dir: 'alternate',                           // Go back and forth
            loop: true,                                 // Repeat while slowed
            easing: 'easeInOutSine',                    // Smooth easing
            enabled: false                              // Start disabled
        });
        // **** END SCALE ANIMATION DEFINITION ****
        // Store the original Z rotation if needed (optional, lookAt might handle reset)
        this.originalZRotation = this.el.object3D.rotation.z;
        console.log(`[move-towards] Initialized on ${this.el.id || 'enemy'}.`);
        // Log initial target data
        console.log(`[move-towards] Initial target data received:`, this.data.target?.id || this.data.target);
        if (!this.data.target) { /* ... error log ... */ }
    },

    applySlowEffect: function(percentage, duration) {
        if (isGameOver) return; // Don't apply if game over

        const currentTime = this.el.sceneEl.time;
        this.isSlowed = true;
        this.slowMultiplier = Math.max(0, 1.0 - percentage); // Clamp multiplier at 0 (100% slow)
        this.slowEndTime = currentTime + duration;

        console.log(`[move-towards] ${this.el.id} slowed! Multiplier: ${this.slowMultiplier.toFixed(2)}, EndTime: ${this.slowEndTime.toFixed(0)}`);
        console.log(`[move-towards applySlow] Indicator element check:`, this.slowIndicator);

        // Visual indicator: Change color to blue
        try {
            // Ensure the animation component exists before playing
            if (this.el.components['animation__wiggle']) {
                this.el.components['animation__wiggle'].play();
                console.log(`[move-towards] Started wiggle animation for ${this.el.id}`);
            } else {
                console.warn(`[move-towards] Could not find animation__wiggle component on ${this.el.id} to play.`);
            }
       } catch (e) {
           console.error(`[move-towards] Error trying to play wiggle animation for ${this.el.id}:`, e);
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
        // **** Log 1: Check if Tick is running ****
        // console.log(`[move-towards] Tick running for ${this.el.id}. TimeDelta: ${timeDelta.toFixed(1)}`); // Can be very noisy, uncomment temporarily if needed

        const targetEl = this.data.target;
        const el = this.el;

        if (this.isSlowed && time > this.slowEndTime) {
            console.log(`[move-towards] ${this.el.id} slow expired.`);
            this.isSlowed = false;
            this.slowMultiplier = 1.0;
            this.slowEndTime = 0;
   
            // **** HIDE AND STOP INDICATOR **** // <-- This comment refers to the section below
            try {
                // Ensure the animation component exists before pausing
                if (this.el.components['animation__wiggle']) {
                    this.el.components['animation__wiggle'].pause();
                    // Optional: Explicitly reset rotation component if lookAt doesn't fix it immediately
                    // this.el.object3D.rotation.z = this.originalZRotation || 0;
                    console.log(`[move-towards] Paused wiggle animation for ${this.el.id}`);
                } else {
                     console.warn(`[move-towards] Could not find animation__wiggle component on ${this.el.id} to pause.`);
                }
            } catch (e) {
                 console.error(`[move-towards] Error trying to pause wiggle animation for ${this.el.id}:`, e);
            }
            // Removed color restore logic
            // if (this.originalColor && this.el) { /* ... restore color ... */ }
            // **** -------------- // <-- End of section referred to by comment
        } // <-- End of the if block

        // **** Log 3: Check Guard Conditions ****
        if (!targetEl || !targetEl.object3D || !el.object3D || timeDelta <= 0 || !el.getAttribute('visible') || isGameOver || isGamePaused) {
             // **** Log 3a: If guard FAILS, log why ****
             console.warn(`[move-towards] Tick skipped for ${this.el.id}:`, {
                 targetExists: !!targetEl,
                 target3D: !!targetEl?.object3D,
                 el3D: !!el.object3D,
                 timeDeltaOK: timeDelta > 0,
                 isVisible: el.getAttribute('visible'),
                 isGameOver,
                 isGamePaused
             });
            return;
        }
        // **** END PAUSE CHECK ****

        targetEl.object3D.getWorldPosition(this.targetPosition);
        el.object3D.getWorldPosition(this.currentPosition);


        try {
            // Check distance to prevent errors if positions are identical
            if (this.targetPosition.distanceToSquared(this.currentPosition) > 0.0001) {
                 this.el.object3D.lookAt(this.targetPosition);
                 // Note: This might rotate the enemy on all axes. If you want it to only rotate
                 // around the Y (up) axis, more complex quaternion math would be needed.
            }
        } catch(lookAtError) {
            console.error(`[move-towards] Error during lookAt for ${this.el.id}:`, lookAtError);
        }

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
         // **** APPLY SLOW MULTIPLIER TO MOVEMENT ****
         const moveDistance = this.data.speed * this.slowMultiplier * (timeDelta / 1000);
         // **** END SPEED MODIFICATION ****
         if (isNaN(moveDistance) || !isFinite(moveDistance)) {
            console.error(`[move-towards] Invalid moveDistance calculated for ${this.el.id}:`, moveDistance);
            return; // Don't try to move if distance is invalid
       }
        // Move the element
        el.object3D.position.addScaledVector(this.direction, moveDistance);
       // console.log(`[MoveCalc <span class="math-inline">\{this\.el\.id\}\] Speed\=</span>{this.data.speed.toFixed(2)}, Mult=<span class="math-inline">\{this\.slowMultiplier\.toFixed\(2\)\}, dT\=</span>{timeDelta.toFixed(1)}, MoveDist=${moveDistance.toFixed(4)}`);

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
        shootDelay: { type: 'number', default: 5000 }, // Base delay for damage turret
        targetSelector: { type: 'string', default: '.enemy' },
        projectileSpeed: { type: 'number', default: 8.0 },
        projectileLifetime: { type: 'number', default: 4000.0 },
        projectileRadius: { type: 'number', default: 0.08 },
        projectileColor: { type: 'string', default: '#FF8C00' }, // Default damage color
        // **** NEW SCHEMA PROPERTIES ****
        type: { type: 'string', default: 'damage', oneOf: ['damage', 'slow'] }, // Type of turret
        slowPercentage: { type: 'number', default: 0.3 }, // Base slow amount for slow turret
        turretDamage: { type: 'number', default: 1 } // **** ADD turretDamage ****

        // **** END NEW SCHEMA ****
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
        console.log(`[auto-shooter] Initialized on ${this.el.id}. Type: ${this.data.type}, Delay: ${this.data.shootDelay}ms`);


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
        console.log('[auto-shooter] Firing slow projectile. Slow %:', this.data.slowPercentage);
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
    console.log(`AUTO-SHOOTER (${this.data.type}) TICK: Closest visible target is ${closestTarget.id}. Firing!`);

    // Calculate direction (same as before)
    closestTarget.object3D.getWorldPosition(this.targetWorldPos);
    this.shootDirection.copy(this.targetWorldPos).sub(this.shooterWorldPos).normalize();

    // Create projectile
    const projectile = document.createElement('a-sphere');
    projectile.setAttribute('radius', this.data.projectileRadius);
    projectile.setAttribute('material', 'shader: flat;');

    // Calculate start position (same as before)
    const startOffset = 0.2;
    this.projectileStartPos.copy(this.shooterWorldPos).addScaledVector(this.shootDirection, startOffset);
    projectile.setAttribute('position', this.projectileStartPos);

    // **** CONFIGURE PROJECTILE BASED ON TYPE ****
    let projectileData = {
        direction: this.shootDirection.clone(),
        speed: this.data.projectileSpeed,
        lifetime: this.data.projectileLifetime,
        targetSelector: this.data.targetSelector,
        // Default damage settings
        damage: 1,
        isSlowing: false,
        slowAmount: 0
    };

    if (this.data.type === 'slow') {
        projectile.setAttribute('color', '#FFFFFF');
        projectileData.damage = 0;
        projectileData.isSlowing = true;
        projectileData.slowAmount = this.data.slowPercentage; // Use current slow%
        // console.log(`   - Slow Projectile Configured: Slow=${projectileData.slowAmount * 100}%`);
    } else { // 'damage' type
        projectile.setAttribute('color', this.data.projectileColor);
         // **** Use turretDamage from component data ****
        projectileData.damage = this.data.turretDamage;
        // **** ---------------------------------- ****
        projectileData.isSlowing = false;
        // console.log(`   - Damage Projectile Configured: Damage=${projectileData.damage}`);
    }
    // **** END PROJECTILE CONFIGURATION ****

    // Attach the projectile-hitter component with configured data
    projectile.setAttribute('projectile-hitter', projectileData);

    // Add to scene and update time
    this.el.sceneEl.appendChild(projectile);
    this.lastShotTime = time;
}
// ... (rest of tick logic) ...
},

    remove: function() {
         console.log(`[auto-shooter] Removed from ${this.el.id}`);
    }
});

// --- Add this FPS Counter Component ---
AFRAME.registerComponent('fps-counter', {
    schema: {
      updateInterval: { type: 'number', default: 1000 } // Update display every 1000ms (1 second)
    },
    init: function () {
      this.fpsTextEl = document.getElementById('fps-counter');
      this.frameCount = 0;
      this.lastUpdateTime = 0; // Initialize to 0
  
      if (!this.fpsTextEl) {
        // Use console.error for important setup issues
        console.error("FPS Counter INIT Error: DOM element #fps-counter not found!");
      } else {
        console.log("FPS Counter component initialized, found element:", this.fpsTextEl);
      }
      // Initialize startTime based on the first tick's time for better first calculation
      this.startTime = -1; // Use -1 to indicate it hasn't been set yet
    },
  
    tick: function (time, timeDelta) {
      // Log 1: Confirm tick is running (can be noisy, uncomment temporarily if needed)
      // console.log(`FPS Tick: time=${time.toFixed(0)}`);
  
      // Log 2: Check if element exists *every tick* just in case
      if (!this.fpsTextEl) {
          // console.warn("FPS Tick: fpsTextEl is null, cannot update."); // Only log if it's actually missing
          return; // Stop if element not found
      }
  
      // Initialize startTime on the first valid tick
      if (this.startTime === -1 && time > 0) { // Ensure time is valid
    //      console.log("FPS Tick: Initializing startTime and lastUpdateTime to", time);
          this.startTime = time;
          this.lastUpdateTime = time; // Set lastUpdateTime on first tick too
      } else if (this.startTime === -1) {
          // Waiting for first valid time signal from A-Frame
          return;
      }
  
  
      this.frameCount++;
      const now = time;
      const elapsedTimeSinceUpdate = now - this.lastUpdateTime;
  
      // Log 3: Check timing condition (uncomment to see interval checks)
      // console.log(`FPS Tick: elapsedTimeSinceUpdate=${elapsedTimeSinceUpdate.toFixed(0)}, TargetInterval=${this.data.updateInterval}`);
  
      // Check if interval has passed
      if (elapsedTimeSinceUpdate >= this.data.updateInterval) {
        const interval = elapsedTimeSinceUpdate; // Use actual elapsed time
        const fps = Math.round((this.frameCount * 1000) / interval); // Calculate FPS
  
        // Log 4: Log calculated FPS and the update action
      //  console.log(`FPS Update: Interval=${interval.toFixed(0)}ms, Frames=${this.frameCount}, Calculated FPS=${fps}`);
        this.fpsTextEl.textContent = `FPS: ${fps}`; // Update the display
  
        // Reset for next interval
        this.frameCount = 0;
        this.lastUpdateTime = now;
      }
    }
});
  // --- End FPS Counter Component ---

// **** END NEW COMPONENT ****



// --- Global Scope Variables & Functions ---
let gameState = 'menu'
let highScore = 0; // For storing high score
let score = 0;
let currentLevel = 1;
let scoreForNextLevel = GAME_CONFIG.LEVELING.INITIAL_SCORE_THRESHOLD;
let scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;

let currentMaxTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
let currentTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;

// Upgrade State
let upgradeShooter1Placed = false;
let upgradeShooter2Placed = false;
let upgradeSlowTurretPlaced = false;
let upgradeSlowTurret2Placed = false; // **** NEW: Flag for 2nd slow turret ****
let shooterLevel = 0;
let playerDamageLevel = 0;
let slowTurretLevel = 0;
let nextShooterUpgradeLevel = GAME_CONFIG.UPGRADES.SHOOTER.INITIAL_LEVEL_CHECK;
let nextSlowTurretUpgradeLevel = GAME_CONFIG.UPGRADES.UNLOCKS.SLOW_TURRET + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;

// Game State
let isGameSetupComplete = false;
let towerPlaced = false;
let placedTowerEl = null;
let isGamePaused = false;
let placingUpgrade = null;
let placedUpgradeEl = null;
let activeShooterUpgrades = [];
let activeSlowTurrets = [];
let isGameOver = false;

// Technical State
let lastSelectTime = 0;
const SELECT_DEBOUNCE_MS = GAME_CONFIG.TIMINGS.DEBOUNCE_SELECT_MS;

// UI Element References
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
let upgradeShooterBtn = null;
let upgradeHealthBtn = null;
let upgradeSlowerBtn = null;
let upgradePlayerDamageBtn = null;
let closeUpgradePopupBtnEl = null;
let manualUpgradesButtonEl = null;
let levelDisplayEl = null;

// Enemy Manager Setup
window.enemyManager = {
    activeEnemies: 0,
    maxEnemies: GAME_CONFIG.ENEMIES.MAX_ACTIVE,
    spawnInterval: GAME_CONFIG.ENEMIES.SPAWN_INTERVAL_MS,
    spawnTimerId: null,
    baseSpeed: GAME_CONFIG.ENEMIES.BASE_SPEED,
    speedMultiplier: 1.0, // Starts at 1, increased by levels
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
    if (currentLevel >= GAME_CONFIG.LEVELING.MAX_LEVEL || isGameOver) return; // Use Config
    if (score >= scoreForNextLevel) {
        const oldLevel = currentLevel;
        currentLevel++;
        console.log(`%cLEVEL UP! Reached Level ${currentLevel} at Score ${score}`, "color: lime; font-weight: bold;");
        window.updateLevelDisplay();
        window.showLevelUpPopup(currentLevel);
        window.increaseEnemySpeed();
        if (currentLevel < GAME_CONFIG.LEVELING.MAX_LEVEL) { // Use Config
            if (oldLevel < 4) { // Threshold for changing gap calculation
                scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP; // Use Config
            } else {
                 scoreGap = Math.round(scoreGap * GAME_CONFIG.LEVELING.GAP_MULTIPLIER); // Use Config
                 scoreGap = Math.max(scoreGap, GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP + GAME_CONFIG.LEVELING.GAP_MIN_INCREASE); // Use Config
            }
            scoreForNextLevel += scoreGap;
            console.log(`Next level (${currentLevel + 1}) requires score: ${scoreForNextLevel} (Gap: ${scoreGap})`);
        } else {
            console.log("Max Level Reached!");
            scoreForNextLevel = Infinity;
        }
        window.showUpgradePopup(true);
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
        }, GAME_CONFIG.TIMINGS.LEVEL_UP_POPUP_MS); // Slightly longer display time
    } else {
        console.error("Could not find level-up popup elements!", { popupEl, levelNumEl });
    }
};

// Function to increase enemy speed
window.increaseEnemySpeed = function() {

    // **** ADD LEVEL CAP CHECK ****
    const SPEED_CAP_LEVEL = GAME_CONFIG.ENEMIES.SPEED_CAP_LEVEL; // Use Config
    if (currentLevel >= SPEED_CAP_LEVEL) {
        console.log(`Enemy speed increase capped at Level ${SPEED_CAP_LEVEL}. No further increase.`);
        // We still need to apply the current capped speed to any *newly* spawned enemies
        // So, we update existing enemies but DON'T increase the multiplier further.
        const activeEnemies = document.querySelectorAll('.enemy');
        console.log(`Found ${activeEnemies.length} active enemies to apply capped speed.`);
        activeEnemies.forEach(enemyEl => {
            if (enemyEl.components['move-towards-target']) {
                const currentBaseSpeed = window.enemyManager.baseSpeed;
                // Apply the speed based on the multiplier *as it was* when level 8 was reached
                const cappedSpeed = currentBaseSpeed * window.enemyManager.speedMultiplier;
                enemyEl.setAttribute('move-towards-target', 'speed', cappedSpeed);
            }
        });
        return; // Exit before increasing multiplier
    }

    window.enemyManager.speedMultiplier *= GAME_CONFIG.ENEMIES.SPEED_INCREASE_FACTOR; // Use Config
    console.log(`New enemy speed multiplier: ${window.enemyManager.speedMultiplier.toFixed(2)} (Level ${currentLevel})`);
    // Update existing enemies

    const activeEnemies = document.querySelectorAll('.enemy');
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

    if (score > highScore) {
        console.log(`New High Score: ${score} (Old: ${highScore})`);
        highScore = score;
        localStorage.setItem('arTowerDefenseHighScore', highScore.toString());
        // Update menu display immediately if possible (though menu is hidden)
        const menuHighScoreDisplay = document.getElementById('menuHighScore');
        if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore;
    }

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
// (~ Line 771)
// --- Update Upgrade Button States Function ---
window.updateUpgradePopupButtonStates = function() {
    upgradeShooterBtn = upgradeShooterBtn || document.getElementById('upgradeShooter');
    upgradeHealthBtn = upgradeHealthBtn || document.getElementById('upgradeHealth');
    upgradeSlowerBtn = upgradeSlowerBtn || document.getElementById('upgradeSlower');
    upgradePlayerDamageBtn = upgradePlayerDamageBtn || document.getElementById('upgradePlayerDamage');

    let title, desc, available, nextLvl;
    let shooterText, shooterDesc, shooterAvailable, shooterNextLvl;
    let slowerText, slowerDesc, slowerAvailable, slowerNextLvl;
    let currentMult, nextMult;
    let currentDmg, currentDelay, nextDelay, nextSlow;

    const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS; // Alias for cleaner access


    // --- SHOOTER Button Logic ---
    shooterText = "SHOOTER"; // Assign to function-scoped variable
    shooterDesc = "";        // Assign to function-scoped variable
    shooterAvailable = false;// Assign to function-scoped variable
    shooterNextLvl = -1;     // Assign to function-scoped variable

    if (!upgradeShooter1Placed) {
        shooterAvailable = true;
        shooterDesc = "Padėti pirmą bokštą";
    } else if (!upgradeShooter2Placed && currentLevel >= UNLOCKS.SECOND_SHOOTER) { // Use Config
        shooterAvailable = true;
        shooterDesc = "Padėti antrą bokstą";
    } else if (!upgradeShooter2Placed && currentLevel < UNLOCKS.SECOND_SHOOTER) { // Use Config
        shooterAvailable = false;
        shooterDesc = "Padėti antrą bokstą";
        shooterNextLvl = UNLOCKS.SECOND_SHOOTER; // Use Config
    } else { // Both placed, check for upgrades
        if (currentLevel >= nextShooterUpgradeLevel) {
             shooterAvailable = true;
             const SHOOTER_CONFIG = GAME_CONFIG.UPGRADES.SHOOTER; // Alias
             if (shooterLevel === GAME_CONFIG.UPGRADES.SHOOTER.LEVEL_FOR_DAMAGE_1 - 1) { // Check if next level IS Damage 1
                const baseDmg = GAME_CONFIG.TURRETS.SHOOTER.BASE_DAMAGE;
                const nextDmg = (baseDmg * GAME_CONFIG.UPGRADES.SHOOTER.DAMAGE_1_MULTIPLIER);
                // **** Corrected Display Calculation ****
                desc = `Damage: ${baseDmg.toFixed(1)} -> ${nextDmg.toFixed(1)}`;
                // **** --------------------------- ****
            } else if (shooterLevel === GAME_CONFIG.UPGRADES.SHOOTER.LEVEL_FOR_DAMAGE_2 - 1) { // Check if next level IS Damage 2
                let currentDmg = (GAME_CONFIG.TURRETS.SHOOTER.BASE_DAMAGE * GAME_CONFIG.UPGRADES.SHOOTER.DAMAGE_1_MULTIPLIER); // Estimate Dmg1 level
                if(activeShooterUpgrades.length > 0) { currentDmg = activeShooterUpgrades[0].getAttribute('auto-shooter')?.turretDamage || currentDmg; }
                const nextDmg = (currentDmg * GAME_CONFIG.UPGRADES.SHOOTER.DAMAGE_2_FACTOR);
                // **** Corrected Display Calculation ****
                desc = `Damage: ${currentDmg.toFixed(1)} -> ${nextDmg.toFixed(1)}`;
             } else { // Next upgrade is Speed
                let currentDelay = GAME_CONFIG.TURRETS.SHOOTER.INITIAL_DELAY;
                if(activeShooterUpgrades.length > 0) { currentDelay = activeShooterUpgrades[0].getAttribute('auto-shooter')?.shootDelay || currentDelay; }
                const nextDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentDelay * GAME_CONFIG.UPGRADES.SHOOTER.SPEED_INCREASE_FACTOR);
                // Display Calculation remains the same (rounding delay is fine)
                desc = `Speed Up (Delay ${currentDelay.toFixed(0)} -> ${nextDelay.toFixed(0)}ms)`;
           }
             shooterDesc = desc;
        } else {
            shooterAvailable = false;
            shooterDesc = "(Atnaujinti šaudyklę)";
            shooterNextLvl = nextShooterUpgradeLevel;
        }
    }
    window.setUpgradeButtonState(upgradeShooterBtn, shooterText, shooterDesc, shooterAvailable, shooterNextLvl);


    // --- HEALTH Button Logic ---
    title = "HEALTH";
    available = true;
    desc = `Max HP: ${currentMaxTowerHealth} -> ${currentMaxTowerHealth + GAME_CONFIG.UPGRADES.HEALTH.HP_INCREASE}`; // Use Config
    window.setUpgradeButtonState(upgradeHealthBtn, title, desc, available);

    // --- SLOWER Button Logic ---
    slowerText = "SLOWER"; // Assign to function-scoped variable
    slowerDesc = "";       // Assign to function-scoped variable
    slowerAvailable = false; // Assign to function-scoped variable (declared at top)
    slowerNextLvl = -1;    // Assign to function-scoped variable

    if (!upgradeSlowTurretPlaced) { // Can place the first one?
        if (currentLevel >= UNLOCKS.SLOW_TURRET) {
            slowerAvailable = true;
            slowerDesc = "Padėti Lėtintoją (1/2)"; // Update text
        } else {
            slowerAvailable = false;
            slowerDesc = "Padėti Lėtintoją (1/2)";
            slowerNextLvl = UNLOCKS.SLOW_TURRET;
        }
    } else if (!upgradeSlowTurret2Placed) { // First is placed, can place the second?
        if (currentLevel >= UNLOCKS.SECOND_SLOW_TURRET) {
            slowerAvailable = true;
            slowerDesc = "Padėti antrą Lėtintoją (2/2)"; // Update text
        } else {
            slowerAvailable = false;
            slowerDesc = "Padėti antrą Lėtintoją (2/2)";
            slowerNextLvl = UNLOCKS.SECOND_SLOW_TURRET;
        }
    } else { // Both placed, check for upgrades
        if (currentLevel >= nextSlowTurretUpgradeLevel) {
            slowerAvailable = true;
            // Calculate next state description (remains the same)
            let currentDelay = GAME_CONFIG.TURRETS.SLOWER.INITIAL_DELAY;
            let currentSlow = GAME_CONFIG.TURRETS.SLOWER.INITIAL_SLOW_PERCENTAGE;
            // ... (get current stats from activeSlowTurrets[0] if available) ...
            let nextDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentDelay * GAME_CONFIG.UPGRADES.SLOWER.SPEED_INCREASE_FACTOR).toFixed(0);
            let nextSlow = Math.min(GAME_CONFIG.UPGRADES.SLOWER.SLOW_MAX_PERCENTAGE, currentSlow + GAME_CONFIG.UPGRADES.SLOWER.SLOW_INCREASE_AMOUNT) * 100;
            slowerDesc = `Atnaujinti Lėtintoją (${(currentSlow * 100).toFixed(0)}% -> ${nextSlow.toFixed(0)}%)`; // Updated text
        } else {
            slowerAvailable = false;
            slowerDesc = "Atnaujinti Lėtintoją";
            slowerNextLvl = nextSlowTurretUpgradeLevel;
        }
    }
     window.setUpgradeButtonState(upgradeSlowerBtn, title, slowerDesc, slowerAvailable, slowerNextLvl); // Pass slowerAvailable here


    // --- PLAYER DAMAGE Button Logic ---
    title = "DAMAGE";
    available = true;
    currentMult = (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** playerDamageLevel); // Use Config
    nextMult = (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** (playerDamageLevel + 1)); // Use Config
    desc = `Player Dmg: ${currentMult.toFixed(2)}x -> ${nextMult.toFixed(2)}x`;
    window.setUpgradeButtonState(upgradePlayerDamageBtn, title, desc, available);
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
// (~ Line 910)
window.resetGame = function() {
    console.log("Resetting game...");

    // Reset state variables (Keep all these)
    isGameOver = false;
    isGameSetupComplete = false;
    towerPlaced = false;
    score = 0;
    currentLevel = 1;
    scoreForNextLevel = GAME_CONFIG.LEVELING.INITIAL_SCORE_THRESHOLD;
    scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;
    currentMaxTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
    currentTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
    window.enemyManager.activeEnemies = 0;
    window.enemyManager.speedMultiplier = 1.0;
    isGamePaused = false;
    placingUpgrade = null;
    upgradeShooter1Placed = false;
    upgradeShooter2Placed = false;
    upgradeSlowTurretPlaced = false;
    upgradeSlowTurret2Placed = false;
    shooterLevel = 0;
    playerDamageLevel = 0;
    slowTurretLevel = 0;
    nextShooterUpgradeLevel = GAME_CONFIG.UPGRADES.SHOOTER.INITIAL_LEVEL_CHECK;
    nextSlowTurretUpgradeLevel = GAME_CONFIG.UPGRADES.UNLOCKS.SLOW_TURRET + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;
    window.enemyManager.baseSpeed = GAME_CONFIG.ENEMIES.BASE_SPEED;
    window.enemyManager.spawnInterval = GAME_CONFIG.ENEMIES.SPAWN_INTERVAL_MS;


    // Clear spawner (Keep)
    if (window.enemyManager.spawnTimerId) { clearInterval(window.enemyManager.spawnTimerId); window.enemyManager.spawnTimerId = null; }

    // Hide Game Over screen (Keep)
    if (gameOverScreenEl) gameOverScreenEl.style.display = 'none';

    // Remove placed tower (Keep)
    if (placedTowerEl && placedTowerEl.parentNode) {
        placedTowerEl.parentNode.removeChild(placedTowerEl);
    }
    placedTowerEl = null;

    // Remove placed upgrades (Keep)
    activeShooterUpgrades.forEach(shooter => { if (shooter.parentNode) shooter.parentNode.removeChild(shooter); });
    activeShooterUpgrades = [];
    activeSlowTurrets.forEach(turret => { if (turret.parentNode) turret.parentNode.removeChild(turret); });
    activeSlowTurrets = [];
    console.log("Removed active upgrades.");

    // Remove enemies and projectiles (Keep)
    const entitiesToRemove = document.querySelectorAll('.enemy, [projectile-hitter]');
    entitiesToRemove.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
    console.log(`Removed ${entitiesToRemove.length} enemies/projectiles.`);


    // Reset UI elements (Keep these updates)
    window.updateScoreDisplay();
    window.updateTowerHealthUI();
    window.updateLevelDisplay();

    // **** MODIFY UI RESET FOR AR MODE ****
    if (sceneElGlobal && sceneElGlobal.is('ar-mode')) {
        // Reset UI directly to the "Surface Found, Place Tower" state
        console.log('Resetting UI to Place Tower state (AR Mode).');

        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
        const reticleEl = document.getElementById('placement-reticle');
        const confirmArea = document.getElementById('confirm-placement-area'); // Ensure confirm area is hidden too

        // Hide scanning feedback and general controls
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
        if (controlsWidget) controlsWidget.style.display = 'none';
        if (confirmArea) confirmArea.style.display = 'none';


        // Show the "Place Tower" popup
        if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'block';

        // Ensure buttons within the popup are in the correct initial state
        if (startGameButton) startGameButton.disabled = true; // Start button must be disabled
        if (towerPlacedFeedback) towerPlacedFeedback.style.display = 'none'; // Hide placement feedback

        // Ensure main game buttons are disabled/hidden
        if (shootButton) shootButton.disabled = true;

        // Show the placement reticle (ready for placement)
        if (reticleEl) reticleEl.setAttribute('visible', 'true');

        // Ensure health is hidden initially as game hasn't started
         window.updateTowerHealthUI(); // This function already hides it if isGameSetupComplete is false


    } else {
        // Non-AR mode reset (remains the same)
         const controlsWidget = document.getElementById('controls-widget');
         if(controlsWidget) controlsWidget.style.display = 'block'; // Show controls if not in AR
         // Hide AR specific popups if they were somehow visible
         const placeTowerPopupEl = document.getElementById('place-tower-popup');
         if (placeTowerPopupEl) placeTowerPopupEl.style.display = 'none';
         const scanningFeedbackEl = document.getElementById('scanning-feedback');
         if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
    }
    // **** END MODIFIED UI RESET ****
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
    const spawnPos = new THREE.Vector3(); // Calculated potential spawn position
    const camToSpawnDir = new THREE.Vector3();
    const activeEnemyPos = new THREE.Vector3(); // For checking proximity

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
    const angleRange = GAME_CONFIG.ENEMIES.SPAWN_ANGLE_RANGE_RAD;
    const randomAngle = (Math.random() - 0.5) * angleRange;
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    spawnOffsetDir.copy(spawnBaseDir).applyAxisAngle(rotationAxis, randomAngle);
    // 3. Spawn Distance
    const spawnDistance = 12 + Math.random() * 6;
    // 4. Calculate Final Spawn Position
    spawnPos.copy(towerPos).addScaledVector(spawnOffsetDir, spawnDistance);

    // --- Validation Checks (Logic remains the same) ---

    // --- Validation Checks --- (Remain the same)
    // A. Behind tower check
    towerToCamDir.copy(camPos).sub(towerPos).normalize();
    const towerToSpawnDir = new THREE.Vector3().copy(spawnPos).sub(towerPos).normalize();
    const dotSideCheck = towerToCamDir.dot(towerToSpawnDir);
    if (dotSideCheck > -0.2) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Not behind tower.");
        setTimeout(window.spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // B. Min distance from Camera
    if (spawnPos.distanceToSquared(camPos) < GAME_CONFIG.ENEMIES.MIN_DIST_FROM_CAM_SQ) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Too close to camera.");
        setTimeout(window.spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // C. Min distance from Tower
    if (spawnPos.distanceToSquared(towerPos) < GAME_CONFIG.ENEMIES.MIN_DIST_FROM_TOWER_SQ) {
       if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Too close to tower.");
       setTimeout(window.spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }
    // D. Check camera view
    camToSpawnDir.copy(spawnPos).sub(camPos).normalize();
    const dotCamView = camDir.dot(camToSpawnDir);
    if (dotCamView > GAME_CONFIG.ENEMIES.VIEW_CONE_DOT_THRESHOLD) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) console.warn("Spawn rejected: Outside camera view cone.");
        setTimeout(window.spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); return;
    }

    // Clamp Y position
    spawnPos.y = THREE.MathUtils.clamp(towerPos.y + 0.5 + (Math.random() - 0.5) * 1.5, GAME_CONFIG.ENEMIES.Y_POS_CLAMP_MIN, GAME_CONFIG.ENEMIES.Y_POS_CLAMP_MAX);

    // --- Create Enemy (If validation passed) ---
    console.log(`Spawn validation passed. Spawning check at: ${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)}`);

 // **** NEW: Check Proximity to Existing Enemies ****
 const minSeparationSq = GAME_CONFIG.ENEMIES.MIN_ENEMY_SEPARATION_SQ;
 const activeEnemies = enemyContainer.querySelectorAll('.enemy[visible="true"]'); // Query only visible enemies

 for (let i = 0; i < activeEnemies.length; i++) {
    const enemyEl = activeEnemies[i];
    if (!enemyEl.object3D) continue;

    enemyEl.object3D.getWorldPosition(activeEnemyPos);
    const distSq = spawnPos.distanceToSquared(activeEnemyPos);

    if (distSq < minSeparationSq) {
        if (GAME_CONFIG.DEBUG_LOGS.spawnValidation) {
             console.warn(`Spawn rejected: Too close to existing enemy ${enemyEl.id} (DistSq: ${distSq.toFixed(2)} < ${minSeparationSq.toFixed(2)}). Retrying.`);
        }
        setTimeout(window.spawnEnemy, GAME_CONFIG.TIMINGS.SPAWN_RETRY_DELAY_MS); // Retry
        return; // Stop this spawn attempt
    }
}

   // --- *** Determine Enemy Type based on Score *** ---
   let enemyType = 'basic';
   let enemyHealth = GAME_CONFIG.ENEMIES.BASIC.HEALTH; // Use config
   let enemyColor = `hsl(${Math.random() * 360}, 70%, 60%)`; // Default basic color (used only if not GLTF)
   let enemyScale = GAME_CONFIG.ENEMIES.BASIC.SCALE; // Use config
   let enemyShape = GAME_CONFIG.ENEMIES.BASIC.SHAPE; // Use config

   const SCORE_THRESHOLD_TOUGHEST = GAME_CONFIG.ENEMIES.TOUGHEST.SCORE_THRESHOLD;
   const SCORE_THRESHOLD_TOUGH = GAME_CONFIG.ENEMIES.TOUGH.SCORE_THRESHOLD;
   const randomRoll = Math.random();

   // 1. Check for Toughest Enemy
   // Inside the if (score >= SCORE_THRESHOLD_TOUGHEST) block:

   const T_CONFIG = GAME_CONFIG.ENEMIES.TOUGHEST; // Alias
   const scoreAboveThreshold = score - SCORE_THRESHOLD_TOUGHEST;
   const additionalChance = Math.floor(scoreAboveThreshold / 5) * T_CONFIG.CHANCE_INCREASE_PER_5_SCORE; // Use Config

   // **** ENSURE THIS LINE EXISTS ****
   const toughestSpawnChance = Math.min(1.0, T_CONFIG.BASE_CHANCE + additionalChance); // Use Config
   // **** ----------------------- ****

   if (GAME_CONFIG.DEBUG_LOGS.spawnChance) console.log(`Score ${score}, Toughest Chance: ${(toughestSpawnChance * 100).toFixed(0)}%`);

   // This line (your line 1458) needs the variable defined above
   if (randomRoll < toughestSpawnChance) {
    enemyType = 'toughest';
    enemyHealth = T_CONFIG.HEALTH;
    enemyColor = T_CONFIG.COLOR;
    enemyScale = T_CONFIG.SCALE;
    // **** DOUBLE-CHECK THIS LINE CAREFULLY ****
    enemyShape = T_CONFIG.SHAPE; // Make sure it's exactly this!
    // **** ----------------------------- ****
    console.log('%c--> Spawning TOUGHEST Enemy!', 'color: #FFA500; font-weight: bold;');
}

   // 2. Check for Tough Enemy (only if Toughest didn't spawn)
   if (enemyType === 'basic' && score >= SCORE_THRESHOLD_TOUGH) {
    const T_CONFIG = GAME_CONFIG.ENEMIES.TOUGH; // Alias

    // **** ADD THIS LINE BACK TO CALCULATE THE CHANCE ****
    const toughChance = Math.min(T_CONFIG.CHANCE_CAP, T_CONFIG.BASE_CHANCE + Math.floor((score - SCORE_THRESHOLD_TOUGH) / 5) * T_CONFIG.CHANCE_INCREASE_PER_5_SCORE); // Use Configs
    // **** -------------------------------------- ****

    if (GAME_CONFIG.DEBUG_LOGS.spawnChance) console.log(`Score ${score}, Tough Chance: ${(toughChance * 100).toFixed(1)}%`); // Log using defined toughChance

    // This line (your line 1455) should now work
    if (Math.random() < toughChance) {
        enemyType = 'tough';
        enemyHealth = T_CONFIG.HEALTH;
        enemyColor = T_CONFIG.COLOR;
        enemyScale = T_CONFIG.SCALE;
        enemyShape = T_CONFIG.SHAPE;
        console.log('%c--> Spawning TOUGH Enemy!', 'color: #DC143C; font-weight: bold;');
    }
}

   // --- Create Enemy Element (Modified) ---
   let enemy; // Declare variable
   const enemyId = `enemy-${enemyType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; // Generate ID once
   console.log(`[spawnEnemy Create Check] enemyType is: "${enemyType}"`);

   enemy = document.createElement('a-entity'); // Create an entity for all types now
   enemy.setAttribute('id', enemyId);
   enemy.classList.add('enemy');
   enemy.setAttribute('position', spawnPos);
   enemy.setAttribute('visible', 'true');

    if (enemyType === 'basic') {
        // --- Configure Basic Enemy ---
        console.log('--> Creating BASIC GLTF Enemy.');
        enemy.setAttribute('gltf-model', '#basic-enemy-model');
        enemy.setAttribute('material', { shader: 'flat', src: '#basic-enemy-texture' });
        enemy.setAttribute('scale', '0.3 0.3 0.3'); // Keep adjusted scale

    } else if (enemyType === 'tough') {
        // --- Configure Tough Enemy ---
        console.log('--> Creating TOUGH GLTF Enemy.');
        enemy.setAttribute('gltf-model', '#tough-enemy-model'); // Use tough model
        enemy.setAttribute('material', { shader: 'flat', src: '#tough-enemy-texture' }); // Use tough texture
        enemy.setAttribute('scale', '0.3 0.3 0.3'); // EXAMPLE SCALE - ADJUST FOR TOUGH MODEL!

    } else { // Must be toughest
        // --- Configure Toughest Enemy ---
        console.log('--> Creating TOUGHEST GLTF Enemy.');
        enemy.setAttribute('gltf-model', '#toughest-enemy-model'); // Use toughest model
        enemy.setAttribute('material', { shader: 'flat', src: '#toughest-enemy-texture' }); // Use toughest texture
        enemy.setAttribute('scale', '0.3 0.3 0.3'); // EXAMPLE SCALE - ADJUST FOR TOUGHEST MODEL!
    }
   // --- End Create Enemy Element ---


   // Create Health Indicator if needed (Logic remains the same)
   if (enemyHealth > 1) {
       const healthText = document.createElement('a-text');
       healthText.classList.add('enemy-health-text');
       healthText.setAttribute('value', `HP: ${enemyHealth}`);
       // ** Adjust Y position based on the basic model's height/origin **
       healthText.setAttribute('position', '0 0.5 0'); // Example: Might need to be higher/lower - ADJUST!
       healthText.setAttribute('scale', '2 2 2');
       healthText.setAttribute('align', 'center');
       healthText.setAttribute('color', '#FFFFFF');
       healthText.setAttribute('side', 'double');
       healthText.setAttribute('billboard', '');
       enemy.appendChild(healthText);
   }

   // Attach Components (Logic remains the same)
   enemy.setAttribute('hit-receiver', { maxHealth: enemyHealth, initialHealth: enemyHealth });
   enemy.setAttribute('move-towards-target', {
       target: placedTowerEl, // <-- Passing the actual tower element reference
       speed: manager.baseSpeed * manager.speedMultiplier,
       reachDistance: GAME_CONFIG.ENEMIES.TARGET_REACH_DISTANCE
   });

   // Add to Scene (Logic remains the same)
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
        console.log('Event: enter-vr');
        gameState = 'ar_setup'; // Update state
        const myEnterARButton = document.getElementById('myEnterARButton'); // Get Enter AR button
        const exitVRButton = document.getElementById('exitVRButton');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placeTowerPopupEl = document.getElementById('place-tower-popup');
        const controlsWidget = document.getElementById('controls-widget');
        const shootButton = document.getElementById('shootButton');
        const startGameButton = document.getElementById('startGameButton');
        const towerPlacedFeedback = document.getElementById('tower-placed-feedback');
        const fpsCounterEl = document.getElementById('fps-counter'); // Get FPS element

        

            if (sceneElGlobal.is('ar-mode')) {
                console.log('AR Mode detected. Starting setup phase.');
                if (myEnterARButton) myEnterARButton.style.display = 'none';
                if (exitVRButton) exitVRButton.style.display = 'inline-block';
                if (controlsWidget) controlsWidget.classList.add('hidden'); // Ensure controls hidden on enter
            if (exitVRButton) exitVRButton.style.display = 'inline-block';
            if (scanningFeedbackEl) {
                scanningFeedbackEl.textContent = "Skanuojamas paviršius..."; // Update text slightly
                scanningFeedbackEl.style.display = 'block';
            }
            if (fpsCounterEl) fpsCounterEl.classList.remove('hidden'); // **** SHOW FPS COUNTER ****

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
             if (exitVRButton) exitVRButton.style.display = 'none';
             if (fpsCounterEl) fpsCounterEl.classList.add('hidden'); // **** HIDE FPS COUNTER ****
        }
    });

    sceneElGlobal.addEventListener('exit-vr', () => {
        console.log('Event: exit-vr');
        // Reset state and hide all AR popups
        isGameSetupComplete = false;
        towerPlaced = false;
        placedTowerEl = null;
        isGameOver = false; // Reset game over flag
        gameState = 'menu'; // Update state

        window.resetGame(); // Calling resetGame also handles UI now

        sceneElGlobal.style.display = 'none';

        const mainMenu = document.getElementById('main-menu');
        const menuHighScoreDisplay = document.getElementById('menuHighScore');
        if (mainMenu) mainMenu.style.display = 'flex';
        if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore; // Update score display

        // 5. Ensure overlay widgets hidden (Reset game might already do this)
        const fpsCounterEl = document.getElementById('fps-counter'); // Get FPS element

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
        if (fpsCounterEl) fpsCounterEl.classList.add('hidden'); // **** HIDE FPS COUNTER ****

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
            // **** Create Entity instead of Box ****
            const upgradeEntity = document.createElement('a-entity');
            const visualId = `${placingUpgrade}-visual-${Date.now()}`;
            upgradeEntity.setAttribute('id', visualId);

            let modelId = '';
            let textureId = '';
            let scale = '1 1 1'; // Default scale - ADJUST PER MODEL!

            // **** Set Model/Texture/Scale based on placingUpgrade type ****
            if (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') {
                console.log(`Placing Shooter (${placingUpgrade}) upgrade visually...`);
                modelId = '#shooter-upgrade-model';
                textureId = '#shooter-upgrade-texture';
                scale = '0.05 0.05 0.05'; // EXAMPLE SCALE - ADJUST FOR SHOOTER MODEL
            } else if (placingUpgrade === 'slowTurret1' || placingUpgrade === 'slowTurret2') {
                console.log(`Placing Slower (${placingUpgrade}) upgrade visually...`);
                modelId = '#slower-upgrade-model';
                textureId = '#slower-upgrade-texture';
                scale = '0.05 0.05 0.05'; // EXAMPLE SCALE - ADJUST FOR SLOWER MODEL
            } else {
                console.warn("Unknown upgrade type being placed:", placingUpgrade);
                // Optional: fallback to a box or skip?
                return; // Don't place if type unknown
            }

            upgradeEntity.setAttribute('gltf-model', modelId);
            // Apply flat shader and texture
            upgradeEntity.setAttribute('material', {
                shader: 'flat',
                src: textureId
            });
            upgradeEntity.setAttribute('scale', scale); // Apply adjusted scale
            upgradeEntity.setAttribute('position', position);
            // Removed shadow setting

            sceneElGlobal.appendChild(upgradeEntity);
            placedUpgradeEl = upgradeEntity; // Store reference to the A-ENTITY

            // Enable confirm button & update feedback (remains same)
            const currentConfirmButton = document.getElementById('confirmPlacementButton');
            if (currentConfirmButton) currentConfirmButton.disabled = false;
            if (scanningFeedbackEl) { scanningFeedbackEl.textContent = "Paspausk pakeist poziciją arba pradėk"; }

        } else { // Subsequent taps: Move the visual entity
             console.log(`Moving ${placingUpgrade} upgrade visual...`);
             placedUpgradeEl.setAttribute('position', position); // Moves the a-entity
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
            tower.setAttribute('gltf-model', '#tower-model')
            tower.setAttribute('material', {
                shader: 'flat', // Use flat shading
                src: '#tower-texture'
            });
            tower.setAttribute('scale', '0.05 0.05 0.05');
            tower.setAttribute('position', position); // Set initial position

            console.log("Tower (GLTF) attributes set.");
            sceneElGlobal.appendChild(tower);
            placedTowerEl = tower; // Store reference
            towerPlaced = true; // Mark as placed
            console.log('Tower (GLTF) successfully placed.');

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
    const mainMenu = document.getElementById('main-menu'); // **** Get Main Menu ****
    const mainMenuStartButton = document.getElementById('mainMenuStartButton');
    const menuHighScoreDisplay = document.getElementById('menuHighScore'); // Get high score display
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
     if (!mainMenu) missingElements.push("mainMenu (#main-menu)");
     if (!mainMenuStartButton) missingElements.push("mainMenuStartButton (#mainMenuStartButton)");
     if (!menuHighScoreDisplay) missingElements.push("menuHighScoreDisplay (#menuHighScore)");
     if (!mainMenuStartButton) missingElements.push("mainMenuStartButton (#mainMenuStartButton)"); // **** Check Menu Start Button ****
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
    // --- Load High Score ---
    highScore = parseInt(localStorage.getItem('arTowerDefenseHighScore') || '0');
    if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = highScore;

     // **** END Granular Element Checks ****
     if (gameState === 'menu') {
        if (sceneInstance) sceneInstance.style.display = 'none'; // Hide scene initially
        if (mainMenu) mainMenu.style.display = 'flex'; // Show menu
        if (controlsWidget) controlsWidget.classList.add('hidden'); // Ensure controls are hidden
        // Ensure other overlay widgets are hidden via HTML 'hidden' class
    }

    // Existing vectors for shooting (no change needed here)
    const shootCameraWorldPos = new THREE.Vector3();
    const shootCameraWorldDir = new THREE.Vector3();
    const targetMarkerWorldPos = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();
    const projectileStartPos = new THREE.Vector3();



      // --- Event Listeners ---
    // Existing overlay interaction listener (beforexrselect)


    if (mainMenuStartButton) {
        mainMenuStartButton.addEventListener('click', () => {
            console.log("Main Menu Start Button Clicked!");
            if (mainMenu) mainMenu.style.display = 'none'; // Hide menu
            if (sceneInstance) {
                sceneInstance.style.display = 'block'; // Show scene
                console.log("Attempting to enter AR...");
                // Use a slight delay to ensure the scene is rendered before entering AR? (Optional)
                // setTimeout(() => {
                    sceneInstance.enterAR().catch(e => {
                        console.error("AR Entry Failed:", e);
                        // Optionally show an error message to the user here
                        if (mainMenu) mainMenu.style.display = 'flex'; // Show menu again on failure
                        if (sceneInstance) sceneInstance.style.display = 'none';
                    });
                // }, 100); // 100ms delay example
                gameState = 'starting_ar'; // Update state
            }
        });
    }

    const howToPlayButton = document.getElementById('menuHowToPlayButton');
    if (howToPlayButton) {
        howToPlayButton.addEventListener('click', () => {
            alert("How to Play:\n1. Scan your environment.\n2. Tap the blue reticle to place your tower.\n3. Press Start Game.\n4. Tap Shoot to destroy enemies.\n5. Choose upgrades when you level up!");
        });
    }

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

        const basePlayerDamage = GAME_CONFIG.PLAYER.SHOOT_DAMAGE_BASE;
        const currentPlayerDamage = Math.round(basePlayerDamage * (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** playerDamageLevel));
        console.log(`Player shooting. Damage Level: ${playerDamageLevel}, Calculated Damage: ${currentPlayerDamage}`);
       
        const projectile = document.createElement('a-sphere');
        projectile.setAttribute('radius', '0.1');
        projectile.setAttribute('color', '#FFFF00'); // Yellow
        projectile.setAttribute('material', 'shader: flat;');

        const startOffset = 0.2;
        projectileStartPos.copy(shootCameraWorldPos).addScaledVector(shootCameraWorldDir, startOffset);
        projectile.setAttribute('position', projectileStartPos);

        // Attach projectile-hitter component
        projectile.setAttribute('projectile-hitter', {
            // Use config values for defaults if needed, but most are set here
            direction: shootDirection.clone(),
            speed: GAME_CONFIG.PROJECTILES.SPEED, // Use Config
            lifetime: GAME_CONFIG.PROJECTILES.LIFETIME, // Use Config
            targetSelector: '.enemy',
            damage: currentPlayerDamage, // Pass calculated damage
            isSlowing: false, // Player doesn't slow
            slowAmount: 0,
            aoeRadius: 0 // Player doesn't have AoE slow
        });
        projectile.setAttribute('color', GAME_CONFIG.PROJECTILES.PLAYER_COLOR); // Use Config
        projectile.setAttribute('radius', GAME_CONFIG.PROJECTILES.PLAYER_RADIUS); // Use Config

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
            currentMaxTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
            currentTowerHealth = GAME_CONFIG.TOWER.INITIAL_MAX_HEALTH;
            scoreForNextLevel = GAME_CONFIG.LEVELING.INITIAL_SCORE_THRESHOLD;
            scoreGap = GAME_CONFIG.LEVELING.INITIAL_SCORE_GAP;
            nextShooterUpgradeLevel = GAME_CONFIG.UPGRADES.SHOOTER.INITIAL_LEVEL_CHECK;
            nextSlowTurretUpgradeLevel = GAME_CONFIG.UPGRADES.UNLOCKS.SLOW_TURRET + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;
            score = 0; // Reset score
            currentLevel = 1; // Reset level
            scoreForNextLevel = 10; // Reset level threshold
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
            window.enemyManager.spawnTimerId = setInterval(window.spawnEnemy, GAME_CONFIG.ENEMIES.SPAWN_INTERVAL_MS);
            console.log(`Enemy spawner started with interval: ${GAME_CONFIG.ENEMIES.SPAWN_INTERVAL_MS}ms`);

        } else {
             console.log("DEBUG: Condition 'towerPlaced' is FALSE inside listener."); // Log state
            console.warn("Start button clicked, but tower not placed yet.");
        }
    });
    console.log("DEBUG: startGameButton listener ATTACHED in DOMContentLoaded."); // Keep this log

     // --- Try Again Button Listener ---
    tryAgainButton.addEventListener('click', window.resetGame); // Use window.

   // --- Upgrade/Confirm/Manual/Close Listeners ---
   console.log("DEBUG: Attaching listeners for UPGRADE/Confirm/Close/Manual buttons directly...");

   if (upgradeHealthBtn) {
    upgradeHealthBtn.addEventListener('click', () => {
        if (isGamePaused) {
             currentMaxTowerHealth += GAME_CONFIG.UPGRADES.HEALTH.HP_INCREASE; // Use Config
             currentTowerHealth = currentMaxTowerHealth;
             window.updateTowerHealthUI();
             console.log(`Health upgraded. Max: ${currentMaxTowerHealth}`);
             window.resumeGame();
        } else { /* Handle manual click if needed */ }
    });
} else { console.error("Cannot add listener: upgradeHealthBtn is null!"); }

if (upgradePlayerDamageBtn) {
    upgradePlayerDamageBtn.addEventListener('click', () => {
         if (isGamePaused) {
              playerDamageLevel++;
              let multiplier = (GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER ** playerDamageLevel); // Use Config
              console.log(`Player Damage upgraded to Level ${playerDamageLevel}. Multiplier: ${multiplier.toFixed(2)}x (+${(GAME_CONFIG.PLAYER.DAMAGE_UPGRADE_MULTIPLIER-1)*100}% each)`);
              window.resumeGame();
         } else { /* Handle manual click */ }
     });
 } else { console.error("Cannot add listener: upgradePlayerDamageBtn is null!"); }

 if (upgradeShooterBtn) {
    upgradeShooterBtn.addEventListener('click', () => {
        if (isGamePaused) {
            const SHOOTER_CONFIG = GAME_CONFIG.UPGRADES.SHOOTER; // Alias
            const TURRET_CONFIG = GAME_CONFIG.TURRETS.SHOOTER; // Alias
            const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS; // Alias
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
             } else if (!upgradeShooter2Placed && currentLevel >= UNLOCKS.SECOND_SHOOTER) {
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
             }   else if (upgradeShooter1Placed && currentLevel >= nextShooterUpgradeLevel) { // Check if UPGRADE is due
                // Increment internal level FIRST to decide effect
                shooterLevel++;
                console.log(`Selected Shooter Upgrade. Internal Shooter Level now: ${shooterLevel}.`);
            
                let upgradeApplied = false; let upgradeDescription = "";
            
                // Determine and apply effect based on the new shooterLevel
                if (shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_1) { // Use Config level
                    console.log(" -> Applying Shooter Damage Upgrade I");
                     activeShooterUpgrades.forEach(shooterEl => {
                         if (shooterEl?.components['auto-shooter']) {
                             const newDamage = Math.round(TURRET_CONFIG.BASE_DAMAGE * SHOOTER_CONFIG.DAMAGE_1_MULTIPLIER); // Use Configs
                             shooterEl.setAttribute('auto-shooter', 'turretDamage', newDamage);
                             console.log(`  - Turret ${shooterEl.id} damage set to ${newDamage}`);
                             upgradeApplied = true;
                         }
                     });
                     upgradeDescription = "(Dmg I Applied!)";
            
                    } else if (shooterLevel === SHOOTER_CONFIG.LEVEL_FOR_DAMAGE_2) { // Use Config level
                        console.log(" -> Applying Shooter Damage Upgrade II");
                        activeShooterUpgrades.forEach(shooterEl => {
                            if (shooterEl?.components['auto-shooter']) {
                                const currentDamage = shooterEl.getAttribute('auto-shooter')?.turretDamage || (TURRET_CONFIG.BASE_DAMAGE * SHOOTER_CONFIG.DAMAGE_1_MULTIPLIER);
                                const newDamage = Math.round(currentDamage * SHOOTER_CONFIG.DAMAGE_2_FACTOR); // Use Configs
                                shooterEl.setAttribute('auto-shooter', 'turretDamage', newDamage);
                                console.log(`  - Turret ${shooterEl.id} damage increased to ${newDamage}`);
                                upgradeApplied = true;
                            }
                     });
                     upgradeDescription = "(Dmg II Applied!)";
            
                } else { // All other upgrades (Level 0, Level 3+) are speed increases
                    console.log(` -> Applying Shooter Speed Upgrade (Level ${shooterLevel})`);
                    activeShooterUpgrades.forEach(shooterEl => {
                        if (shooterEl?.components['auto-shooter']) {
                            const currentDelay = shooterEl.getAttribute('auto-shooter').shootDelay;
                            const newDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentDelay * SHOOTER_CONFIG.SPEED_INCREASE_FACTOR); // Use Configs
                            shooterEl.setAttribute('auto-shooter', 'shootDelay', newDelay);
                            console.log(`  - Turret ${shooterEl.id} speed increased (Delay: ${newDelay.toFixed(0)}ms)`);
                            upgradeApplied = true;
                        }
                    });
                     upgradeDescription = `(Speed Lv ${shooterLevel})`; // Indicate speed level
                }
            
                // Set next available upgrade level (always 2 levels later)
                nextShooterUpgradeLevel += SHOOTER_CONFIG.UPGRADE_FREQUENCY; // Use Config
                console.log(`Next shooter upgrade available at Player Lv ${nextShooterUpgradeLevel}.`);
            
                if (!upgradeApplied) { console.log("No upgrade effect applied (check conditions)."); }
                else {
                    // Optionally update button description temporarily after upgrade
                    const descSpan = upgradeShooterBtn.querySelector('.upgrade-desc');
                    if (descSpan) descSpan.textContent = upgradeDescription;
                }
                window.resumeGame(); // Resume after applying
            
             } else { // Conditions for placing 2nd shooter or upgrading not met
                 console.log("Shooter upgrade not available at this level or condition not met.");
                 window.resumeGame(); // Resume even if no action taken
             }
        
            } else { /* Handle manual click */ }
        });
    } else { console.error("Cannot add listener: upgradeShooterBtn is null!"); }

       // Slower Turret Upgrade (Place / Upgrade Level)
      if (upgradeSlowerBtn) {
        upgradeSlowerBtn.addEventListener('click', () => {
            console.log("Upgrade Slower chosen.");
            if (isGamePaused) {
                const SLOWER_CONFIG = GAME_CONFIG.UPGRADES.SLOWER;
                const UNLOCKS = GAME_CONFIG.UPGRADES.UNLOCKS;

                // Action 1: Place First Slow Turret
                if (!upgradeSlowTurretPlaced && currentLevel >= UNLOCKS.SLOW_TURRET) {
                     console.log("Initiating placement for Slow Turret 1...");
                     placingUpgrade = 'slowTurret1'; // Distinguish first placement
                     // Start placement process... (Show reticle, confirm button etc.)
                     placedUpgradeEl = null;
                     const reticleEl = document.getElementById('placement-reticle');
                     const feedbackEl = document.getElementById('scanning-feedback');
                     confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
                     confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
                     if (reticleEl) reticleEl.setAttribute('visible', true);
                     if (feedbackEl) { feedbackEl.textContent = `Padėti Lėtintoją (1/2)`; feedbackEl.style.display = 'block'; }
                     if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'block';
                     if (confirmPlacementButtonEl) confirmPlacementButtonEl.disabled = true;
                     if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
                }
                // Action 2: Place Second Slow Turret
                else if (upgradeSlowTurretPlaced && !upgradeSlowTurret2Placed && currentLevel >= UNLOCKS.SECOND_SLOW_TURRET) {
                    console.log("Initiating placement for Slow Turret 2...");
                    placingUpgrade = 'slowTurret2'; // Distinguish second placement
                    // Start placement process...
                    placedUpgradeEl = null;
                    const reticleEl = document.getElementById('placement-reticle');
                    const feedbackEl = document.getElementById('scanning-feedback');
                    confirmPlacementAreaEl = confirmPlacementAreaEl || document.getElementById('confirm-placement-area');
                    confirmPlacementButtonEl = confirmPlacementButtonEl || document.getElementById('confirmPlacementButton');
                    if (reticleEl) reticleEl.setAttribute('visible', true);
                    if (feedbackEl) { feedbackEl.textContent = `Padėti Lėtintoją (2/2)`; feedbackEl.style.display = 'block'; }
                    if (confirmPlacementAreaEl) confirmPlacementAreaEl.style.display = 'block';
                    if (confirmPlacementButtonEl) confirmPlacementButtonEl.disabled = true;
                    if (upgradesPopupEl) upgradesPopupEl.style.display = 'none';
                }
                // Action 3: Upgrade Existing Slow Turrets
                else if (upgradeSlowTurretPlaced && upgradeSlowTurret2Placed && currentLevel >= nextSlowTurretUpgradeLevel) {
                    slowTurretLevel++;
                    console.log(`Upgrading Slow Turrets to Level ${slowTurretLevel}.`);

                    // Apply upgrade effect (speed + slow%)
                    let turretsUpgraded = 0;
                    let currentShootDelay = GAME_CONFIG.TURRETS.SLOWER.INITIAL_DELAY; // Use defaults if no active found
                    let currentSlowPerc = GAME_CONFIG.TURRETS.SLOWER.INITIAL_SLOW_PERCENTAGE;
                    if (activeSlowTurrets.length > 0 && activeSlowTurrets[0].components['auto-shooter']) {
                        const currentData = activeSlowTurrets[0].getAttribute('auto-shooter');
                        currentShootDelay = currentData.shootDelay;
                        currentSlowPerc = currentData.slowPercentage;
                    }
                    const newDelay = Math.max(GAME_CONFIG.TURRETS.MIN_SHOOT_DELAY, currentShootDelay * SLOWER_CONFIG.SPEED_INCREASE_FACTOR);
                    const newSlowPercentage = Math.min(SLOWER_CONFIG.SLOW_MAX_PERCENTAGE, currentSlowPerc + SLOWER_CONFIG.SLOW_INCREASE_AMOUNT);

                    console.log(` -> Calculated new stats: Delay=${newDelay.toFixed(0)}ms, Slow=${(newSlowPercentage * 100).toFixed(0)}%`);

                    activeSlowTurrets.forEach(turretEl => { // Apply to ALL active slow turrets
                        if (turretEl?.components['auto-shooter']) {
                            try {
                                turretEl.setAttribute('auto-shooter', { shootDelay: newDelay, slowPercentage: newSlowPercentage });
                                turretsUpgraded++;
                            } catch (err) { console.error("Error upgrading slow turret:", err); }
                        }
                    });

                    if (turretsUpgraded > 0) {
                        nextSlowTurretUpgradeLevel += SLOWER_CONFIG.UPGRADE_FREQUENCY; // Set next available level
                        console.log(`Next Slow Turret upgrade available at Lv ${nextSlowTurretUpgradeLevel}.`);
                        const descSpan = upgradeSlowerBtn.querySelector('.upgrade-desc');
                        if (descSpan) descSpan.textContent = `(Atnaujinta Lvl ${slowTurretLevel})`;
                    } else {
                        console.log("No active slow turrets found to upgrade.");
                    }
                    window.resumeGame();

                } else { // Conditions for placing or upgrading not met
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

    // Confirm Placement Listener
  if (confirmPlacementButtonEl) {
    confirmPlacementButtonEl.addEventListener('click', () => {
        console.log("Confirm Placement button clicked for:", placingUpgrade);
             const currentConfirmArea = document.getElementById('confirm-placement-area');
             const feedbackEl = document.getElementById('scanning-feedback');
             if (placedUpgradeEl && placingUpgrade) {
                  console.log(`Finalizing placement for ${placingUpgrade}...`);

                  // Apply component based on type
                  if (placingUpgrade === 'shooter1' || placingUpgrade === 'shooter2') {
                    placedUpgradeEl.setAttribute('auto-shooter', {
                        type: 'damage',
                        shootDelay: GAME_CONFIG.TURRETS.SHOOTER.INITIAL_DELAY, // Use Config
                        turretDamage: GAME_CONFIG.TURRETS.SHOOTER.BASE_DAMAGE // Use Config
                    });
                      activeShooterUpgrades.push(placedUpgradeEl);
                      if (placingUpgrade === 'shooter1') { upgradeShooter1Placed = true; console.log("Shooter 1 marked as placed."); }
                      else { upgradeShooter2Placed = true; console.log("Shooter 2 marked as placed.");}
                    }  else if (placingUpgrade === 'slowTurret1' || placingUpgrade === 'slowTurret2') {
                        placedUpgradeEl.setAttribute('auto-shooter', {
                            type: 'slow',
                            shootDelay: GAME_CONFIG.TURRETS.SLOWER.INITIAL_DELAY,
                            slowPercentage: GAME_CONFIG.TURRETS.SLOWER.INITIAL_SLOW_PERCENTAGE,
                            turretDamage: 0
                        });
                        activeSlowTurrets.push(placedUpgradeEl); // Add to the array
  
                        // Update appropriate placed flag and next upgrade level ONLY after first one
                        if (placingUpgrade === 'slowTurret1') {
                            upgradeSlowTurretPlaced = true; // Mark first as placed
                            console.log("Slow Turret 1 marked as placed.");
                            // Set the level for the *first* stat upgrade after placing the first turret
                            nextSlowTurretUpgradeLevel = currentLevel + GAME_CONFIG.UPGRADES.SLOWER.UPGRADE_FREQUENCY;
                             console.log(`Next Slow Turret upgrade available at Lv ${nextSlowTurretUpgradeLevel}`);
                        } else { // placingUpgrade === 'slowTurret2'
                             upgradeSlowTurret2Placed = true; // Mark second as placed
                             console.log("Slow Turret 2 marked as placed.");
                             // No need to update nextSlowTurretUpgradeLevel here again
                        }
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