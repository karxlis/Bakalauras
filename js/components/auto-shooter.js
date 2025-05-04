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