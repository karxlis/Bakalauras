// Component definition for move-towards-target
AFRAME.registerComponent('move-towards-target', {
    schema: {
        target: { type: 'selector' }, // The entity to move towards
        speed: { type: 'number', default: 0.9 }, // Base speed
        reachDistance: { type: 'number', default: 0.2 } // Distance to stop/trigger reach
    },
    init: function () {
        // Cache THREE.js objects for performance
        this.targetPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();

        // Slow effect state variables
        this.isSlowed = false;
        this.slowMultiplier = 1.0; // 1.0 = normal speed, < 1.0 = slowed
        this.slowEndTime = 0;

        // Define the wiggle animation for the slow effect
        const currentScale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
        const targetScaleUp = {
            x: currentScale.x * 1.2, // Scale up slightly
            y: currentScale.y * 1.2,
            z: currentScale.z * 1.2
        };
        this.el.setAttribute('animation__wiggle', {
            property: 'scale',
            from: `${currentScale.x} ${currentScale.y} ${currentScale.z}`,
            to: `${targetScaleUp.x} ${targetScaleUp.y} ${targetScaleUp.z}`,
            dur: 400,
            dir: 'alternate',
            loop: true,
            easing: 'easeInOutSine',
            enabled: false // Start disabled
        });

        this.originalZRotation = this.el.object3D.rotation.z; // Store original rotation if needed

        console.log(`[move-towards] Initialized on ${this.el.id || 'enemy'}.`);
        if (!this.data.target) {
            console.error(`[move-towards] No target specified for ${this.el.id}`);
        }
    },

    // Applies the slow effect for a given duration
    applySlowEffect: function(percentage, duration) {
        if (isGameOver) return; // Ignore if game over

        const currentTime = this.el.sceneEl.time;
        this.isSlowed = true;
        this.slowMultiplier = Math.max(0, 1.0 - percentage); // Calculate speed multiplier (0-1)
        this.slowEndTime = currentTime + duration;

        console.log(`[move-towards] ${this.el.id} slowed! Multiplier: ${this.slowMultiplier.toFixed(2)}, EndTime: ${this.slowEndTime.toFixed(0)}`);

        // Start the wiggle animation
        try {
            const wiggleAnim = this.el.components['animation__wiggle'];
            if (wiggleAnim) {
                wiggleAnim.play();
                console.log(`[move-towards] Started wiggle animation for ${this.el.id}`);
            } else {
                console.warn(`[move-towards] Could not find animation__wiggle component on ${this.el.id} to play.`);
            }
       } catch (e) {
           console.error(`[move-towards] Error trying to play wiggle animation for ${this.el.id}:`, e);
       }
    },

    update: function(oldData) {
        // Handle changes in speed or target if necessary
         if (oldData.speed !== this.data.speed) {
             console.log(`[move-towards] Speed updated for ${this.el.id} to ${this.data.speed}`);
         }
         if (oldData.target !== this.data.target) {
             console.log(`[move-towards] Target updated for ${this.el.id} to ${this.data.target?.id}`);
             if (!this.data.target) {
                 console.error(`[move-towards] Target became null for ${this.el.id}`);
             }
         }
    },

    tick: function (time, timeDelta) {
        const targetEl = this.data.target;
        const el = this.el;

        // --- Check and End Slow Effect ---
        if (this.isSlowed && time > this.slowEndTime) {
            console.log(`[move-towards] ${this.el.id} slow expired.`);
            this.isSlowed = false;
            this.slowMultiplier = 1.0;
            this.slowEndTime = 0;

            // Stop the wiggle animation
            try {
                const wiggleAnim = this.el.components['animation__wiggle'];
                if (wiggleAnim) {
                    wiggleAnim.pause();
                    // Reset scale if animation doesn't do it automatically on pause
                    // el.setAttribute('scale', wiggleAnim.data.from);
                    console.log(`[move-towards] Paused wiggle animation for ${this.el.id}`);
                } else {
                     console.warn(`[move-towards] Could not find animation__wiggle component on ${this.el.id} to pause.`);
                }
            } catch (e) {
                 console.error(`[move-towards] Error trying to pause wiggle animation for ${this.el.id}:`, e);
            }
        }

        // --- Guard Conditions --- Check if movement should occur
        if (!targetEl?.object3D || !el.object3D || timeDelta <= 0 || !el.getAttribute('visible') || isGameOver || isGamePaused) {
            return;
        }

        // --- Get Positions --- Get world positions
        targetEl.object3D.getWorldPosition(this.targetPosition);
        el.object3D.getWorldPosition(this.currentPosition);

        // --- Orientation --- Make the entity look at the target
        try {
            // Check distance to prevent errors if positions are identical (can happen at spawn)
            if (this.targetPosition.distanceToSquared(this.currentPosition) > 0.0001) {
                 el.object3D.lookAt(this.targetPosition);
                 // Optional: Constrain lookAt to Y-axis only if needed
            }
        } catch(lookAtError) {
            console.error(`[move-towards] Error during lookAt for ${this.el.id}:`, lookAtError);
        }

        // --- Check if Target Reached ---
        const distanceToTargetSq = this.currentPosition.distanceToSquared(this.targetPosition);
        if (distanceToTargetSq < (this.data.reachDistance * this.data.reachDistance)) {
            console.log(`%c[move-towards] ${el.id || 'Enemy'} reached target!`, "color: red; font-weight: bold;");

            // Trigger tower hit logic (Consider using events)
            if (window.towerHit) window.towerHit(); // Global function call

            // Remove the enemy element
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            return; // Exit tick
        }

        // --- Movement Calculation ---
        this.direction.copy(this.targetPosition).sub(this.currentPosition).normalize();
        // Apply slow multiplier to speed
        const moveDistance = this.data.speed * this.slowMultiplier * (timeDelta / 1000);

        if (isNaN(moveDistance) || !isFinite(moveDistance)) {
            console.error(`[move-towards] Invalid moveDistance calculated for ${this.el.id}:`, moveDistance);
            return;
       }

        // --- Apply Movement ---
        el.object3D.position.addScaledVector(this.direction, moveDistance);
    },

    // Called when the entity/component is removed
    remove: function() {
        console.log(`[move-towards] ${this.el.id || 'Enemy'} removed.`);
        // Note: Enemy count decrementing is primarily handled by hit-receiver remove
    }
}); 