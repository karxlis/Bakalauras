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