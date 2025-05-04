// Component definition for follow-shadow
AFRAME.registerComponent('follow-shadow', {
    schema: {type: 'selector'},
    init: function() {
        console.log("[follow-shadow] Initializing");
        this.el.object3D.renderOrder = -1; // Ensure shadow renders underneath
        this.targetEl = null;
        this.initialPosSet = false;

        this.targetEl = this.data; // this.data IS the resolved target element

        if (this.targetEl) {
            console.log(`[follow-shadow] Initial target element found: ${this.targetEl.id}`);
        } else {
             console.warn(`[follow-shadow] Initial target element selector could not be resolved.`);
        }
    },
    update: function(oldData) {
        if (this.data !== oldData) {
            console.log("[follow-shadow] Target data updated.");
            this.targetEl = this.data; // Update reference to the new target element
            this.initialPosSet = false; // Reset position flag on target change

             if (this.targetEl) {
                 console.log("[follow-shadow] New target element assigned:", this.targetEl.id);
             } else {
                  console.warn(`[follow-shadow] New target element selector could not be resolved.`);
             }
        }
    },
    tick: function() {
        if (this.targetEl?.object3D?.visible) {
            // Use target's world position if needed, or local if parent relationship is guaranteed
            // Using local position assuming shadow is child of the same parent or scene
            const targetPos = this.targetEl.object3D.position;

            if (!this.initialPosSet && targetPos.y > -100) { // Check y isn't default large negative
                 this.initialPosSet = true;
            }
            if (this.initialPosSet) {
                 this.el.object3D.position.copy(targetPos);
                 this.el.object3D.position.y = 0.001; // Keep shadow slightly above ground
                 if (!this.el.object3D.visible) { this.el.object3D.visible = true; }
            } else if (this.el.object3D.visible) {
                 this.el.object3D.visible = false;
            }
        } else if (this.el.object3D.visible) {
            this.el.object3D.visible = false;
            if (this.initialPosSet) { this.initialPosSet = false; }
        }
    }
}); 