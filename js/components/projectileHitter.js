// Component definition for projectile-hitter
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
        aoeRadius: { type: 'number', default: 1.5 } // Radius for AoE slow
    },
    init: function () {
        if (this.data.direction.lengthSq() > 0.001) {
            this.data.direction.normalize();
        } else {
            this.data.direction.set(0, 0, -1); // Default direction if none provided
        }
        this.targets = [];
        this.targetsFound = false;
        this.projectileWorldPos = new THREE.Vector3();
        this.targetWorldPos = new THREE.Vector3(); // Position of primary target hit
        this.otherEnemyWorldPos = new THREE.Vector3(); // For checking nearby enemies in AoE
        this.collisionRadiusSq = this.data.collisionRadius * this.data.collisionRadius;
        this.aoeRadiusSq = this.data.aoeRadius * this.data.aoeRadius;
        this.startTime = this.el.sceneEl.time; // Store initial time

        // Defer initial target query slightly to allow scene population
        setTimeout(() => {
            this.targets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
            console.log(`[projectile-hitter] Initialized. Targeting: ${this.data.targetSelector}. Found ${this.targets.length} initial targets.`);
            if(this.targets.length === 0) {
                console.warn(`[projectile-hitter] No initial targets found for ${this.data.targetSelector}`);
            }
            this.targetsFound = this.targets.length > 0;
        }, GAME_CONFIG.TIMINGS.PROJECTILE_TARGET_QUERY_MS); // Use config for delay
    },

    tick: function (time, timeDelta) {
       const data = this.data;
       const el = this.el;
       const elapsedTime = time - this.startTime;

       // --- Lifetime Check ---
       if (elapsedTime > data.lifetime) {
         if (el.parentNode) { el.parentNode.removeChild(el); }
         return;
       }

       // --- Movement ---
       const distance = data.speed * (timeDelta / 1000);
       if (isNaN(distance) || distance <= 0 || !isFinite(distance) || !el.object3D) return;
       el.object3D.position.addScaledVector(data.direction, distance);

       // --- Target Refresh (Periodically) ---
       // Check if targets were found or if it's time for a refresh
       if (!this.targetsFound || time % 1000 < timeDelta) { // Rough check every second
         const currentTargets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
         // Only update the list if the count actually changed to avoid array recreation
         if (currentTargets.length !== this.targets.length) {
           this.targets = currentTargets;
         }
         this.targetsFound = this.targets.length > 0;
       }

       // --- Collision Check (Only if targets exist) ---
       if (!this.targetsFound || !el.object3D) return;
       el.object3D.getWorldPosition(this.projectileWorldPos);

       // Loop through potential targets
       for (let i = 0; i < this.targets.length; i++) {
         const primaryTarget = this.targets[i];
         if (!primaryTarget?.object3D || !primaryTarget.object3D.visible) continue; // Skip invalid/invisible targets

         const primaryHitReceiver = primaryTarget.components['hit-receiver'];
         if (!primaryHitReceiver) continue; // Skip if target cannot be hit

         primaryTarget.object3D.getWorldPosition(this.targetWorldPos); // Store primary target position
         const distSq = this.projectileWorldPos.distanceToSquared(this.targetWorldPos);

         // --- Collision Detected ---
         if (distSq < this.collisionRadiusSq) {
             // Apply effect based on projectile type
             if (data.isSlowing) {
                 console.log(`%c[projectile-hitter] SLOW HIT on Primary: ${primaryTarget.id}! Amount: ${data.slowAmount * 100}%`, "color: cyan; font-weight: bold;");
                 primaryHitReceiver.applySlow(data.slowAmount);

                 // --- Apply AoE Slow ---
                 if (data.aoeRadius > 0) {
                     console.log(`[projectile-hitter] Checking for AoE targets within ${data.aoeRadius}m...`);
                     // Refresh the list just before AoE check for max accuracy
                     const allEnemies = this.el.sceneEl.querySelectorAll(data.targetSelector + '[visible="true"]');
                     let aoeHits = 0;

                     allEnemies.forEach(otherEnemy => {
                        if (otherEnemy === primaryTarget || !otherEnemy?.object3D?.visible) return; // Skip self and invisible

                        const secondaryHitReceiver = otherEnemy.components['hit-receiver'];
                        if (!secondaryHitReceiver) return; // Skip if no hit-receiver

                        otherEnemy.object3D.getWorldPosition(this.otherEnemyWorldPos);
                        const distToImpactSq = this.targetWorldPos.distanceToSquared(this.otherEnemyWorldPos);

                        if (distToImpactSq < this.aoeRadiusSq) {
                            console.log(`  -> Applying AoE slow to ${otherEnemy.id}`);
                            secondaryHitReceiver.applySlow(data.slowAmount);
                            aoeHits++;
                        }
                     });
                     if (aoeHits > 0) console.log(`[projectile-hitter] Applied AoE slow to ${aoeHits} additional targets.`);
                 }
                 // --- End AoE Slow ---

             } else { // Regular Damage Hit
                 console.log(`%c[projectile-hitter] DAMAGE HIT on: ${primaryTarget.id}! Damage: ${data.damage}`, "color: green; font-weight: bold;");
                 primaryHitReceiver.hit(data.damage);
             }

             // Remove Projectile after applying effect(s)
             if (el.parentNode) { el.parentNode.removeChild(el); }
             return; // Exit loop and tick after hit
           }
       } // End target loop
     } // End tick
   }); 