AFRAME.registerComponent('follow-shadow', {
    //  this.data aframe scheme
    schema: {type: 'selector'},
    init: function() {
        console.log("[follow-shadow] Initializing"); // Log initialization
        this.el.object3D.renderOrder = -1; // Keep render order
        this.targetEl = null;
        this.initialPosSet = false;

        
        this.targetEl = this.data; // this.data IS the selected element (or null)
      

        // Log whether the target was found by A-Frame
        if (this.targetEl) {
            console.log(`[follow-shadow] Initial target element found: ${this.targetEl.id}`);
        } else {
             // A-Frame couldn't find the element based on the HTML attribute value
             console.warn(`[follow-shadow] Initial target element not found by A-Frame based on HTML attribute value provided.`);
        }
    },
    update: function(oldData) {
        // When the component data changes (e.g., attribute value in HTML changes)
        if (this.data !== oldData) {
            console.log("[follow-shadow] Target data updated.");

            // **** CORRECTED: Directly use the NEW element from this.data ****
            this.targetEl = this.data;
            // **** END CORRECTION ****

            this.initialPosSet = false; // Reset position flag on target change

             if (this.targetEl) {
                 console.log("[follow-shadow] New target element assigned:", this.targetEl.id);
             } else {
                  console.warn(`[follow-shadow] New target element not found by A-Frame.`);
             }
        }
    },
    tick: function() {
        // Tick logic remains the same - it correctly uses this.targetEl
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