// Component definition for auto-shooter
AFRAME.registerComponent('auto-shooter', {
    schema: {
        shootDelay: { type: 'number', default: 5000 }, // Base delay
        targetSelector: { type: 'string', default: '.enemy' },
        projectileSpeed: { type: 'number', default: 8.0 },
        projectileLifetime: { type: 'number', default: 4000.0 },
        projectileRadius: { type: 'number', default: 0.08 },
        projectileColor: { type: 'string', default: '#FF8C00' }, // Default (shooter)
        type: { type: 'string', default: 'damage', oneOf: ['damage', 'slow'] },
        slowPercentage: { type: 'number', default: 0.3 }, // For 'slow' type
        turretDamage: { type: 'number', default: 1 }      // For 'damage' type
    },

    init: function () {
        console.log(`[auto-shooter] Initializing on ${this.el.id}. Type: ${this.data.type}, Delay: ${this.data.shootDelay}ms, Damage: ${this.data.turretDamage}, Slow: ${this.data.slowPercentage}`);
        this.lastShotTime = 0;
        this.targets = []; // Re-query periodically in tick
        this.shooterWorldPos = new THREE.Vector3();
        this.targetWorldPos = new THREE.Vector3();
        this.shootDirection = new THREE.Vector3();
        this.projectileStartPos = new THREE.Vector3();
    },

    tick: function (time, timeDelta) {
        // --- Basic Checks --- Don't shoot if game over/paused/etc.
        if (isGameOver || isGamePaused || !isGameSetupComplete || !this.el.object3D?.visible) {
            return;
        }

        // --- Rate Limiting --- Check if enough time passed since last shot
        if (time < this.lastShotTime + this.data.shootDelay) {
            return;
        }

        // --- Find Targets --- Get potential targets (visible enemies)
        // Query within tick to get the current list of enemies
        const potentialTargets = this.el.sceneEl.querySelectorAll(this.data.targetSelector + '[visible="true"]');
        if (potentialTargets.length === 0) {
            return; // No visible enemies
        }

        // --- Find Closest Visible Target ---
        let closestTarget = null;
        let minDistanceSq = Infinity;
        this.el.object3D.getWorldPosition(this.shooterWorldPos);

        for (const targetEl of potentialTargets) {
            // Basic check if object3D exists (it should if visible=true was queried)
            if (!targetEl.object3D) continue;

            targetEl.object3D.getWorldPosition(this.targetWorldPos);
            const distanceSq = this.shooterWorldPos.distanceToSquared(this.targetWorldPos);

            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestTarget = targetEl;
            }
        }

        // --- Shoot if a Target Was Found ---
        if (closestTarget) {
            console.log(`AUTO-SHOOTER (${this.data.type}) TICK: Closest visible target is ${closestTarget.id}. Firing!`);

            // Calculate direction
            closestTarget.object3D.getWorldPosition(this.targetWorldPos);
            this.shootDirection.copy(this.targetWorldPos).sub(this.shooterWorldPos).normalize();

            // Create projectile element
            const projectile = document.createElement('a-sphere');
            projectile.setAttribute('radius', this.data.projectileRadius);
            projectile.setAttribute('material', 'shader: flat;');

            // Calculate starting position slightly in front of the turret
            const startOffset = 0.2;
            this.projectileStartPos.copy(this.shooterWorldPos).addScaledVector(this.shootDirection, startOffset);
            projectile.setAttribute('position', this.projectileStartPos);

            // --- Configure Projectile Hitter Data ---
            let projectileData = {
                direction: this.shootDirection.clone(),
                speed: this.data.projectileSpeed,
                lifetime: this.data.projectileLifetime,
                targetSelector: this.data.targetSelector,
                collisionRadius: GAME_CONFIG.PROJECTILES.COLLISION_RADIUS, // Use config
                // Defaults
                damage: 0,
                isSlowing: false,
                slowAmount: 0,
                aoeRadius: 0
            };

            if (this.data.type === 'slow') {
                projectile.setAttribute('color', GAME_CONFIG.TURRETS.SLOWER.PROJECTILE_COLOR); // Use config
                projectileData.isSlowing = true;
                projectileData.slowAmount = this.data.slowPercentage;
                projectileData.aoeRadius = GAME_CONFIG.PROJECTILES.AOE_SLOW_RADIUS; // Use config for AoE
                console.log(`   - Slow Projectile Configured: Slow=${projectileData.slowAmount * 100}%, AoE=${projectileData.aoeRadius}`);
            } else { // 'damage' type
                projectile.setAttribute('color', this.data.projectileColor);
                projectileData.damage = this.data.turretDamage;
                console.log(`   - Damage Projectile Configured: Damage=${projectileData.damage}`);
            }

            // Attach the projectile-hitter component
            projectile.setAttribute('projectile-hitter', projectileData);

            // Add to scene and update last shot time
            this.el.sceneEl.appendChild(projectile);
            this.lastShotTime = time;
        } // End if(closestTarget)
    },

    remove: function() {
         console.log(`[auto-shooter] Removed from ${this.el.id}`);
         // Additional cleanup if needed
    }
}); 