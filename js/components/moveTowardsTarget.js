
AFRAME.registerComponent('move-towards-target', {
    schema: {
        target: { type: 'selector' }, 
        speed: { type: 'number', default: 0.9 }, 
        reachDistance: { type: 'number', default: 0.2 } 
    },
    init: function () {
        
        this.targetPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();

        
        this.isSlowed = false;
        this.slowMultiplier = 1.0; 
        this.slowEndTime = 0;

        
        const currentScale = this.el.getAttribute('scale') || { x: 1, y: 1, z: 1 };
        const targetScaleUp = {
            x: currentScale.x * 1.2, 
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
            enabled: false 
        });

        this.originalZRotation = this.el.object3D.rotation.z; 

        console.log(`[move-towards] Initialized on ${this.el.id || 'enemy'}.`);
        if (!this.data.target) {
            console.error(`[move-towards] No target specified for ${this.el.id}`);
        }
    },

    
    applySlowEffect: function(percentage, duration) {
        if (isGameOver) return; 

        const currentTime = this.el.sceneEl.time;
        this.isSlowed = true;
        this.slowMultiplier = Math.max(0, 1.0 - percentage); 
        this.slowEndTime = currentTime + duration;

        console.log(`[move-towards] ${this.el.id} slowed! Multiplier: ${this.slowMultiplier.toFixed(2)}, EndTime: ${this.slowEndTime.toFixed(0)}`);

        
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

        
        if (this.isSlowed && time > this.slowEndTime) {
            console.log(`[move-towards] ${this.el.id} slow expired.`);
            this.isSlowed = false;
            this.slowMultiplier = 1.0;
            this.slowEndTime = 0;

            
            try {
                const wiggleAnim = this.el.components['animation__wiggle'];
                if (wiggleAnim) {
                    wiggleAnim.pause();
                    
                    
                    console.log(`[move-towards] Paused wiggle animation for ${this.el.id}`);
                } else {
                     console.warn(`[move-towards] Could not find animation__wiggle component on ${this.el.id} to pause.`);
                }
            } catch (e) {
                 console.error(`[move-towards] Error trying to pause wiggle animation for ${this.el.id}:`, e);
            }
        }

        
        if (!targetEl?.object3D || !el.object3D || timeDelta <= 0 || !el.getAttribute('visible') || isGameOver || isGamePaused) {
            return;
        }

        
        targetEl.object3D.getWorldPosition(this.targetPosition);
        el.object3D.getWorldPosition(this.currentPosition);

        
        try {
            
            if (this.targetPosition.distanceToSquared(this.currentPosition) > 0.0001) {
                 el.object3D.lookAt(this.targetPosition);
                 
            }
        } catch(lookAtError) {
            console.error(`[move-towards] Error during lookAt for ${this.el.id}:`, lookAtError);
        }

        
        const distanceToTargetSq = this.currentPosition.distanceToSquared(this.targetPosition);
        if (distanceToTargetSq < (this.data.reachDistance * this.data.reachDistance)) {
            console.log(`%c[move-towards] ${el.id || 'Enemy'} reached target!`, "color: red; font-weight: bold;");

            
            if (window.towerHit) window.towerHit(); 

            
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            return; 
        }

        
        this.direction.copy(this.targetPosition).sub(this.currentPosition).normalize();
        
        const moveDistance = this.data.speed * this.slowMultiplier * (timeDelta / 1000);

        if (isNaN(moveDistance) || !isFinite(moveDistance)) {
            console.error(`[move-towards] Invalid moveDistance calculated for ${this.el.id}:`, moveDistance);
            return;
       }

        
        el.object3D.position.addScaledVector(this.direction, moveDistance);
    },

    
    remove: function() {
        console.log(`[move-towards] ${this.el.id || 'Enemy'} removed.`);
        
    }
}); 