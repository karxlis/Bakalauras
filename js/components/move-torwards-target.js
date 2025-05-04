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

// Inside init function of move-towards-target:
const currentScale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
// Define a slightly larger scale for the 'to' state
const targetScaleUp = { x: currentScale.x * 3, y: currentScale.y * 3, z: currentScale.z * 3 };

this.el.setAttribute('animation__wiggle', {
    property: 'scale',
    from: `${currentScale.x} ${currentScale.y} ${currentScale.z}`, // Start at normal
    to: `${targetScaleUp.x} ${targetScaleUp.y} ${targetScaleUp.z}`, // Go slightly bigger
    dur: 400, // Maybe faster duration for a pulse
    dir: 'alternate',
    loop: true,
    easing: 'easeInOutSine',
    enabled: false
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