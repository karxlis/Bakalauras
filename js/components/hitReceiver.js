// Component definition for hit-receiver
AFRAME.registerComponent('hit-receiver', {
    schema: {
        maxHealth: { type: 'int', default: 1 },
        initialHealth: { type: 'int', default: 1 }
    },

    init: function () {
        this.isVisible = this.el.getAttribute('visible'); // Initial visibility
        this.isEnemy = this.el.classList.contains('enemy');
        this.currentHealth = this.data.initialHealth;
        this.healthTextEl = this.el.querySelector('.enemy-health-text'); // Find potential health text child

        console.log(`[hit-receiver] Initialized on ${this.el.id}. Is Enemy: ${this.isEnemy}. MaxHealth: ${this.data.maxHealth}, CurrentHealth: ${this.currentHealth}`);
        this.updateHealthText(); // Set initial health text if applicable
    },

    // Updates the enemy health text display (if it exists)
    updateHealthText: function() {
        if (this.healthTextEl && this.isEnemy && this.data.maxHealth > 1) {
            this.healthTextEl.setAttribute('value', `HP: ${this.currentHealth}`);
            this.healthTextEl.setAttribute('visible', this.currentHealth > 0);
        } else if (this.healthTextEl) {
             this.healthTextEl.setAttribute('visible', false);
        }
    },

    // Called when the entity is hit by a damaging projectile
    hit: function(damageAmount = 1) {
        if (!this.isVisible || isGameOver) { return; } // Ignore hits if invisible or game over
        console.log(`[hit-receiver] ${this.el.id} HIT for ${damageAmount} damage!`);

        if (this.isEnemy) {
            this.currentHealth -= damageAmount;
            this.currentHealth = Math.max(0, this.currentHealth); // Prevent negative health
            console.log(`[hit-receiver] Enemy health: ${this.currentHealth}/${this.data.maxHealth}`);
            this.updateHealthText();

            if (this.currentHealth <= 0) {
                // --- Enemy destroyed logic ---
                 console.log(`[hit-receiver] Enemy ${this.el.id} destroyed!`);
                 this.isVisible = false;
                 this.el.setAttribute('visible', 'false');

                 // Update global state (Consider using events instead)
                 if (window.incrementScore) { window.incrementScore(); } // Global function call
                 if (window.enemyManager) { window.enemyManager.decrementCount(); } // Global object access

                 // Remove element after a short delay
                 if (this.el.parentNode) {
                     const removeDelay = GAME_CONFIG.TIMINGS.ENEMY_REMOVE_DELAY_MS;
                     setTimeout(() => { if(this.el.parentNode) this.el.parentNode.removeChild(this.el); }, removeDelay);
                 }
            } else {
                // --- Enemy Damaged but not destroyed: Show particle effect ---
                try {
                    const particleDuration = 800;
                    const particleColor = '#FFFFFF'; // Bright white flash
                    const hitPosition = new THREE.Vector3();

                    // Ensure world matrix is up-to-date before getting world position
                    this.el.object3D.updateMatrixWorld(true);
                    this.el.object3D.getWorldPosition(hitPosition);
                    hitPosition.y += 0.1; // Offset slightly

                    const impactMarker = document.createElement('a-ring');
                    impactMarker.setAttribute('position', hitPosition);
                    impactMarker.setAttribute('color', particleColor);
                    impactMarker.setAttribute('material', 'shader: flat; side: double;');
                    impactMarker.setAttribute('radius-inner', '0.05');
                    impactMarker.setAttribute('radius-outer', '0.30');
                    impactMarker.setAttribute('rotation', '0 0 0'); // Keep flat relative to world
                    impactMarker.setAttribute('animation__hithide', {
                        property: 'scale',
                        from: '1 1 1',
                        to: '0 0 0',
                        dur: particleDuration,
                        easing: 'easeInQuad'
                    });
                    this.el.sceneEl.appendChild(impactMarker);
                    setTimeout(() => {
                        if (impactMarker && impactMarker.parentNode) {
                           impactMarker.parentNode.removeChild(impactMarker);
                        }
                    }, particleDuration + 100);
                } catch (particleError) {
                    console.error(`[hit-receiver] Error creating particle effect for ${this.el.id}:`, particleError);
                }
            }
        } else {
            // Logic for non-enemy hits (e.g., hitting the tower)
            // This component currently doesn't handle tower hits;
            // that logic seems to be in the global `towerHit` function.
            console.log(`[hit-receiver] Non-enemy ${this.el.id} hit. No action taken by component.`);
        }
    }, // End hit function

  // Called when hit by a slowing projectile
  applySlow: function(slowAmount) {
    if (!this.isEnemy || isGameOver) return; // Only slow active enemies
    console.log(`[hit-receiver] Applying slow (${(slowAmount * 100).toFixed(0)}%) to ${this.el.id}`);

    const moveComponent = this.el.components['move-towards-target'];
    if (moveComponent && moveComponent.applySlowEffect) {
        moveComponent.applySlowEffect(slowAmount, GAME_CONFIG.EFFECTS.SLOW_DURATION_MS); // Use config
    } else {
        console.warn(`[hit-receiver] Could not find move-towards-target component or applySlowEffect method on ${this.el.id} to apply slow.`);
    }
  },

  // Called when the entity/component is removed from the scene
    remove: function() {
        // Decrement count if removed externally WHILE it still had health
        // This handles cases where enemies might be removed by means other than dying (e.g., game reset)
        if (this.isEnemy && window.enemyManager && this.currentHealth > 0 && !isGameOver) {
             window.enemyManager.decrementCount();
             console.warn(`[hit-receiver] Decremented count via REMOVE for ${this.el.id} which had health > 0.`);
        }
    }
}); 