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