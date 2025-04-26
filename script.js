// --- Component Definitions ---
AFRAME.registerComponent('follow-shadow', {
    schema: {type: 'selector'},
    init: function() {
        this.el.object3D.renderOrder = -1;
        this.targetEl = null;
        this.initialPosSet = false;
        this.targetEl = this.data ? document.querySelector(this.data) : null;
        if(!this.targetEl && this.data) console.warn(`[follow-shadow] Initial target selector "${this.data}" not found.`);
    },
    update: function(oldData) {
        if (this.data && this.data !== oldData) {
             this.targetEl = document.querySelector(this.data);
             this.initialPosSet = false;
             console.log("[follow-shadow] Target element updated:", this.targetEl ? this.targetEl.id : 'None');
             if(!this.targetEl) console.warn(`[follow-shadow] Updated target selector "${this.data}" not found.`);
        } else if (!this.data) { this.targetEl = null; }
    },
    tick: function() {
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

// Projectile Component with Collision Detection
AFRAME.registerComponent('projectile-hitter', {
    schema: {
      speed: { default: 10.0 },
      lifetime: { default: 3000.0 },
      direction: { type: 'vec3' },
      targetSelector: { type: 'string', default: '.orbiting-target' },
      collisionRadius: { type: 'number', default: 0.15 } // Approx combined radius
    },
    init: function () {
      this.startTime = this.el.sceneEl.time;
      if (this.data.direction.lengthSq() > 0.001) { this.data.direction.normalize(); }
      else { this.data.direction.set(0, 0, -1); }

      this.targets = []; // Initialize empty
      this.targetsFound = false; // Flag to only query until found
      this.projectileWorldPos = new THREE.Vector3();
      this.targetWorldPos = new THREE.Vector3();
      this.collisionRadiusSq = this.data.collisionRadius * this.data.collisionRadius;

      // Defer target query slightly
      setTimeout(() => {
          this.targets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
          console.log(`[projectile-hitter] Initialized for ${this.el.id || 'projectile'}. Targeting: ${this.data.targetSelector}. Found ${this.targets.length} targets.`);
          if(this.targets.length === 0) console.warn("[projectile-hitter] No targets found!");
      }, 100);
    },
    tick: function (time, timeDelta) {
      const data = this.data;
      const el = this.el;
      const elapsedTime = time - this.startTime;

      // Lifetime check
      if (elapsedTime > data.lifetime) {
        if (el.parentNode) { el.parentNode.removeChild(el); }
        return;
      }

      // Movement logic
      const distance = data.speed * (timeDelta / 1000);
      if (isNaN(distance) || distance <= 0 || !isFinite(distance) || !el.object3D) return;
      el.object3D.position.addScaledVector(data.direction, distance);

      // Query for targets in tick until found
      if (!this.targetsFound && this.targets.length > 0) { // Check length before setting flag
          this.targetsFound = true;
          // console.log(`[projectile-hitter] Target list confirmed with ${this.targets.length} targets.`);
      } else if (!this.targetsFound) {
           // Optional: Warn if targets *never* found after some time
           if (elapsedTime > 2000 && !this._warned_no_targets) {
               console.warn(`[projectile-hitter] Still haven't found targets matching "${this.data.targetSelector}". Check class names and timing.`);
               this._warned_no_targets = true;
           }
          return; // Exit tick early if no targets found yet
      }

      // Collision Check
      if (!el.object3D) return;
      el.object3D.getWorldPosition(this.projectileWorldPos);

      for (let i = 0; i < this.targets.length; i++) {
        const target = this.targets[i];
        if (!target?.object3D) continue; // Skip if target invalid

        const targetVisible = target.getAttribute('visible'); // Check A-Frame visibility
        const hasHitReceiver = target.components['hit-receiver'];

        if (targetVisible && hasHitReceiver) {
          target.object3D.getWorldPosition(this.targetWorldPos);
          const distSq = this.projectileWorldPos.distanceToSquared(this.targetWorldPos);

          if (distSq < this.collisionRadiusSq) {
            console.log(`%c[projectile-hitter] HIT DETECTED with ${target.id}! DistSq=${distSq.toFixed(4)}`, "color: green; font-weight: bold;");
            hasHitReceiver.hit(); // Call the hit method on the component
            if (el.parentNode) { el.parentNode.removeChild(el); } // Remove projectile
            return; // Exit loop and tick after hit
          }
        }
      }
    }
});

// Hit Receiver Component (Calls score update)
AFRAME.registerComponent('hit-receiver', {
    schema: {
        respawnDelay: { type: 'number', default: 10000 } // 10 seconds
    },
    init: function () {
        this.isVisible = this.el.getAttribute('visible'); // Initial state from element
        this.respawnTimer = null;
        this.hit = this.hit.bind(this);
        console.log(`[hit-receiver] Initialized on ${this.el.id}. Initial visibility: ${this.isVisible}`);
    },
    hit: function() {
        if (!this.isVisible) {
             console.log(`[hit-receiver] ${this.el.id} already hit. Ignoring.`);
             return; // Ignore if already invisible/respawning
        }

        console.log(`[hit-receiver] ${this.el.id} HIT! Hiding...`);
        this.isVisible = false;
        this.el.setAttribute('visible', 'false'); // Make invisible

        // Call global score function if it exists
        if (window.incrementScore) {
            window.incrementScore();
        } else { console.warn("incrementScore function not found on window."); }

        if (this.respawnTimer) clearTimeout(this.respawnTimer);
        this.respawnTimer = setTimeout(() => {
            console.log(`[hit-receiver] Respawning ${this.el.id}.`);
            this.isVisible = true;
            this.el.setAttribute('visible', 'true'); // Make visible again
            this.respawnTimer = null;
        }, this.data.respawnDelay);
    },
    remove: function() {
       if (this.respawnTimer) {
            clearTimeout(this.respawnTimer);
            console.log(`[hit-receiver] Cleared respawn timer for removed ${this.el.id}.`);
       }
    }
});

// Start Orbit In AR Component
AFRAME.registerComponent('start-orbit-in-ar', {
    schema: { radius: {type: 'number', default: 0.5}, speed: {type: 'number', default: 1.0} },
    init: function () {
      this.isAR = false; this.angle = 0; this.centerPoint = new THREE.Vector3(); this.initialLocalPosition = new THREE.Vector3();
      this.onEnterVR = this.onEnterVR.bind(this); this.onExitVR = this.onExitVR.bind(this);
      const captureInitialState = () => { if (this.el.object3D && this.el.parentNode?.object3D) { this.initialLocalPosition.copy(this.el.object3D.position); this.el.object3D.getWorldPosition(this.centerPoint); this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR); this.el.sceneEl.addEventListener('exit-vr', this.onExitVR); if (this.el.sceneEl.is('ar-mode')) { this.isAR = true; } } else { if (this.el.object3D) setTimeout(captureInitialState, 50); else this.el.addEventListener('object3dset', captureInitialState, {once: true}); } };
      setTimeout(captureInitialState, 100);
    },
    remove: function() { this.el.sceneEl.removeEventListener('enter-vr', this.onEnterVR); this.el.sceneEl.removeEventListener('exit-vr', this.onExitVR); },
    onEnterVR: function() { if (this.el.sceneEl.is('ar-mode')) { this.isAR = true; if (this.el.object3D) { this.el.object3D.getWorldPosition(this.centerPoint); } } else { this.isAR = false; } },
    onExitVR: function() { this.isAR = false; if (this.el.object3D && this.initialLocalPosition) { this.el.object3D.position.copy(this.initialLocalPosition); } this.angle = 0; },
    tick: function (time, timeDelta) { if (!this.isAR || !this.el.object3D || !timeDelta || timeDelta <= 0 || this.centerPoint.lengthSq() === 0) { return; } this.angle += this.data.speed * (timeDelta / 1000); this.angle = this.angle % (Math.PI * 2); const radius = this.data.radius * (this.el.parentEl?.object3D.scale.x || 1); const x = this.centerPoint.x + radius * Math.cos(this.angle); const z = this.centerPoint.z + radius * Math.sin(this.angle); const y = this.centerPoint.y; if (this.el.parentEl?.object3D) { this.el.parentEl.object3D.worldToLocal(this.el.object3D.position.set(x, y, z)); } else { this.el.object3D.position.set(x, y, z); } }
});


// --- Global Scope Variables & Functions ---
let score = 0;
let scoreDisplayEl = null; // Assigned in DOMContentLoaded

function updateScoreDisplay() {
    if (scoreDisplayEl) {
        scoreDisplayEl.textContent = `Score: ${score}`;
    }
}

window.incrementScore = function() {
    score++;
    console.log("Score increased to:", score);
    updateScoreDisplay();
}


// --- Global Scope Setup for Scene Listeners ---
const sceneElGlobal = document.querySelector('a-scene');
if (!sceneElGlobal) { console.error("FATAL: A-Frame scene not found!"); }
else {
    // --- Attach Core Event Listeners Directly to Scene ---
    sceneElGlobal.addEventListener('enter-vr', () => {
        console.log('Event: enter-vr');
        const exitVRButton = document.getElementById('exitVRButton');
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        const placementCheckbox = document.getElementById('placementModeCheckbox');
        if (sceneElGlobal.is('ar-mode')) {
            console.log('AR Mode detected.');
            if (exitVRButton) exitVRButton.style.display = 'inline-block';
            if (reticleEl) reticleEl.setAttribute('visible', false);
            if (placementCheckbox && placementCheckbox.checked && scanningFeedbackEl) {
                scanningFeedbackEl.textContent = "Scanning for surfaces...\nMove phone slowly.";
                scanningFeedbackEl.style.display = 'block';
            } else if (scanningFeedbackEl) {
                scanningFeedbackEl.style.display = 'none';
            }
        } else {
            console.warn('VR Mode or AR Session Failed.');
            if (exitVRButton) exitVRButton.style.display = 'none';
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
        }
    });

    sceneElGlobal.addEventListener('exit-vr', () => {
        console.log('Event: exit-vr');
        const exitVRButton = document.getElementById('exitVRButton');
        const reticleEl = document.getElementById('placement-reticle');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        if (exitVRButton) exitVRButton.style.display = 'none';
        if (reticleEl) reticleEl.setAttribute('visible', false);
        if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
    });

    sceneElGlobal.addEventListener('ar-hit-test-start', () => {
        console.log('Event: ar-hit-test-start (Searching...)');
        const reticleEl = document.getElementById('placement-reticle');
        const placementCheckbox = document.getElementById('placementModeCheckbox');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        if (reticleEl) reticleEl.setAttribute('visible', 'false');
        if (placementCheckbox && placementCheckbox.checked && scanningFeedbackEl) {
            scanningFeedbackEl.textContent = "Scanning for surfaces...\nMove phone slowly.";
            scanningFeedbackEl.style.display = 'block';
        }
    });

    sceneElGlobal.addEventListener('ar-hit-test-achieved', () => {
        console.log('Event: ar-hit-test-achieved (Surface Found!)');
        const reticleEl = document.getElementById('placement-reticle');
        const placementCheckbox = document.getElementById('placementModeCheckbox');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        if (placementCheckbox && placementCheckbox.checked && reticleEl) {
            reticleEl.setAttribute('visible', 'true');
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
        } else {
            if (reticleEl) reticleEl.setAttribute('visible', 'false');
            if (scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
        }
    });

    sceneElGlobal.addEventListener('ar-hit-test-lost', () => {
        console.log('Event: ar-hit-test-lost (Surface Lost)');
        const reticleEl = document.getElementById('placement-reticle');
        const placementCheckbox = document.getElementById('placementModeCheckbox');
        const scanningFeedbackEl = document.getElementById('scanning-feedback');
        if (reticleEl) reticleEl.setAttribute('visible', 'false');
        if (placementCheckbox && placementCheckbox.checked && scanningFeedbackEl) {
            scanningFeedbackEl.textContent = "Scanning for surfaces...\nMove phone slowly.";
            scanningFeedbackEl.style.display = 'block';
        }
    });

    // AR Placement Listener
    sceneElGlobal.addEventListener('ar-hit-test-select', (e) => {
        console.log("Event: ar-hit-test-select FIRED!");
        const placementCheckbox = document.getElementById('placementModeCheckbox');
        const reticleEl = document.getElementById('placement-reticle');
        const isPlacementMode = placementCheckbox && placementCheckbox.checked;
        const isReticleVisible = reticleEl && reticleEl.getAttribute('visible');
        console.log(`Placement Mode Checked?: ${isPlacementMode}`);
        console.log(`Is Reticle Visible?: ${isReticleVisible}`);
        if (isPlacementMode && isReticleVisible) {
            console.log('Conditions met: Attempting to place NEW cube...');
            const position = reticleEl.getAttribute('position');
            if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) { console.error("Placement failed: Invalid position from reticle.", position); return; }
            console.log(`Reticle position obtained: x=${position.x.toFixed(3)}, y=${position.y.toFixed(3)}, z=${position.z.toFixed(3)}`);
            const newBox = document.createElement('a-box');
            if (!newBox) { console.error("Failed to create a-box!"); return; }
            console.log("a-box element created.");
            newBox.classList.add('interactive');
            newBox.setAttribute('position', position);
            newBox.setAttribute('scale', '0.2 0.2 0.2');
            newBox.setAttribute('color', '#228B22');
            newBox.setAttribute('shadow', 'cast: true; receive: false;');
            newBox.setAttribute('draggable', '');
            console.log("Attributes set on new box.");
            sceneElGlobal.appendChild(newBox);
            console.log('New cube successfully appended to the scene.');
        } else { console.log(`Placement check failed. Mode Active: ${isPlacementMode}, Reticle Visible: ${isReticleVisible}.`); }
    });
} // End of else block for sceneElGlobal check


// --- Run Setup After DOM Loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI listeners and initial state...");

    const sceneEl_dom = document.querySelector('a-scene');
    const overlay = document.getElementById('dom-overlay');
    const reticleEl_dom = document.getElementById('placement-reticle');
    const exitVRButton = document.getElementById('exitVRButton');
    const placementCheckbox = document.getElementById('placementModeCheckbox');
    const scanningFeedbackEl = document.getElementById('scanning-feedback');
    const shootButton = document.getElementById('shootButton');
    const cameraEl = document.getElementById('player-camera');
    const cameraMarkerEl = document.getElementById('camera-aim-marker');
    // Assign scoreDisplayEl from the global scope variable declared above
    scoreDisplayEl = document.getElementById('score-display');

    const sceneInstance = sceneElGlobal || sceneEl_dom;

    if (!sceneInstance || !overlay || !exitVRButton || !placementCheckbox || !scanningFeedbackEl || !shootButton || !cameraEl || !cameraMarkerEl || !reticleEl_dom || !scoreDisplayEl ) {
        console.error("Essential page elements not found within DOMContentLoaded!"); return;
    } else {
        console.log("All essential elements confirmed within DOMContentLoaded.");
    }

    // Vectors for shooting
    const shootCameraWorldPos = new THREE.Vector3();
    const shootCameraWorldDir = new THREE.Vector3();
    const targetMarkerWorldPos = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();
    const projectileStartPos = new THREE.Vector3();


    // --- Overlay Interaction ---
    overlay.addEventListener('beforexrselect', function (e) {
        const widget = e.target.closest('.overlay-widget');
        if (e.target === overlay || (widget && !(e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT'))) {
            e.preventDefault();
        }
    });

    // --- UI Functions ---
    // Definitions are now in global scope
    // window.toggleSphereColor = function({value}) { ... }
    // window.toggleLabels = function({value}) { ... }

    // --- Checkbox Change Listener ---
    placementCheckbox.addEventListener('change', () => {
        console.log("Placement checkbox changed:", placementCheckbox.checked);
        if (sceneInstance.is('ar-mode')) {
            const isReticleCurrentlyVisible = reticleEl_dom && reticleEl_dom.getAttribute('visible');
            if (!placementCheckbox.checked) { // Interaction Mode
                console.log("Switched to Interaction mode.");
                if(reticleEl_dom) reticleEl_dom.setAttribute('visible', 'false');
                if(scanningFeedbackEl) scanningFeedbackEl.style.display = 'none';
            } else { // Placement Mode
                console.log("Switched to Placement mode.");
                if (!isReticleCurrentlyVisible && scanningFeedbackEl) {
                     scanningFeedbackEl.textContent = "Scanning for surfaces...\nMove phone slowly.";
                     scanningFeedbackEl.style.display = 'block';
                } else if (isReticleCurrentlyVisible && scanningFeedbackEl) {
                    scanningFeedbackEl.style.display = 'none';
                }
                if (isReticleCurrentlyVisible && reticleEl_dom) {
                     reticleEl_dom.setAttribute('visible', 'true');
                }
            }
        }
    });


    // --- Shoot Button Listener (Targets Camera Marker, Uses projectile-hitter) ---
    shootButton.addEventListener('click', () => {
        console.log("Shoot button clicked.");
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

        const projectile = document.createElement('a-sphere');
        projectile.setAttribute('radius', '0.1');
        projectile.setAttribute('color', '#FFFF00'); // Yellow
        projectile.setAttribute('material', 'shader: flat;');

        const startOffset = 0.2;
        projectileStartPos.copy(shootCameraWorldPos).addScaledVector(shootCameraWorldDir, startOffset);
        projectile.setAttribute('position', projectileStartPos);

        // Attach projectile-hitter component
        projectile.setAttribute('projectile-hitter', {
            direction: shootDirection.clone(),
            speed: 10,
            lifetime: 3000,
            targetSelector: '.orbiting-target'
        });
         console.log("Projectile component attributes set.");

         sceneInstance.appendChild(projectile);
         console.log("Projectile added to scene.");

    }); // End of shoot button listener


    // --- Initialize UI ---
    console.log("Initializing UI states...");
    updateScoreDisplay(); // Set initial score text to 0
    setTimeout(() => {
       if (window.toggleLabels) { window.toggleLabels({ value: document.querySelector('input[name="labelsVisible"]:checked')?.value || 'no' }); }
       if (window.toggleSphereColor) { window.toggleSphereColor({ value: document.querySelector('input[name="sphereColor"]:checked')?.value || '#EF2D5E' }); }
        const sphereLabel = document.getElementById('sphere-label');
        const boxLabel = document.getElementById('box-label');
        const cylinderLabel = document.getElementById('cylinder-label');
        if(sphereLabel) sphereLabel.textContent = 'A red sphere';
        if(boxLabel) boxLabel.textContent = 'A blue box';
        if(cylinderLabel) cylinderLabel.textContent = 'A yellow cylinder';
    }, 0);


    // --- Set willReadFrequently on Canvas ---
    sceneInstance.addEventListener('loaded', () => {
       console.log("Scene loaded event. Attempting to set willReadFrequently.");
       const canvas = sceneInstance.canvas;
       if (canvas) {
           try { canvas.getContext('2d', { willReadFrequently: true }); console.log("Set 'willReadFrequently' on 2D context."); } catch (e) {
               try { canvas.getContext('webgl', { antialias: true }); console.log("Got WebGL context instead."); } catch(glError) { console.warn("Could not get canvas context."); }
           }
       } else { console.warn("Canvas element not found on scene load."); }
     });

}); // End of DOMContentLoaded listener