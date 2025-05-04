// Component definition for attach-dom-element

// Reusable vector for screen projection calculation
const _attachDomElementVector = new THREE.Vector3();

AFRAME.registerComponent('attach-dom-element', {
    schema: { type: 'string', default: '' }, // CSS selector for the DOM element(s)
    init: function() {
        this.screenElements = [];
        this.updateElements(); // Initial query

        // Re-query if the selector attribute changes
        this.el.addEventListener('componentchanged', (evt) => {
            if (evt.detail.name === 'attach-dom-element') {
                this.updateElements();
            }
        });
    },
    // Finds the DOM elements based on the selector
    updateElements: function() {
        if (!this.data) {
            this.screenElements = [];
            return;
        }
        try {
            this.screenElements = Array.from(document.querySelectorAll(this.data));
            if (this.screenElements.length === 0 && this.data) {
                console.warn(`attach-dom-element selector "${this.data}" on ${this.el.id || 'element'} found no matching DOM elements.`);
            }
        } catch (e) {
            console.error(`Invalid selector "${this.data}" for attach-dom-element on ${this.el.id || 'element'}:`, e);
            this.screenElements = [];
        }
    },
    // Updates the position of the DOM elements each frame
    tick: function() {
        if (this.screenElements.length === 0 || !this.el.sceneEl?.hasLoaded || !this.el.sceneEl.camera?.el || !this.el.object3D) {
            return; // Exit if no elements, scene/camera not ready, or element removed
        }

        // Hide DOM elements if the A-Frame entity is hidden
        if (!this.el.object3D.visible) {
            this.screenElements.forEach(el => { if (el) el.style.display = 'none'; });
            return;
        }

        // Project the A-Frame entity's world position to screen coordinates
        this.el.object3D.getWorldPosition(_attachDomElementVector);
        _attachDomElementVector.project(this.el.sceneEl.camera);

        const w = window.innerWidth * 0.5;
        const h = window.innerHeight * 0.5;
        const screenX = w + w * _attachDomElementVector.x;
        const screenY = h - h * _attachDomElementVector.y;

        // Update each DOM element's position
        for (const el of this.screenElements) {
            if (!el) continue;

            // Only display if the element is in front of the camera (z < 1 in normalized device coords)
            if (_attachDomElementVector.z < 1) {
                // Use translate(-50%, -50%) to center the element on the projected point
                el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
                el.style.display = 'block';
            } else {
                el.style.display = 'none'; // Hide if behind the camera
            }
        }
    }
}); 