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