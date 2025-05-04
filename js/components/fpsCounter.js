// Component definition for fps-counter
AFRAME.registerComponent('fps-counter', {
    schema: {
      updateInterval: { type: 'number', default: 1000 } // Update display every 1000ms
    },
    init: function () {
      // Find the element in the DOM. Assumes it exists.
      // Consider passing selector via schema if ID changes.
      this.fpsTextEl = document.getElementById('fps-counter'); 
      this.frameCount = 0;
      this.lastUpdateTime = 0;
      this.startTime = -1; // Use -1 to indicate not yet initialized by first tick
  
      if (!this.fpsTextEl) {
        console.error("FPS Counter INIT Error: DOM element #fps-counter not found!");
      } else {
        console.log("FPS Counter component initialized, found element.");
      }
    },
    tick: function (time, timeDelta) {
      if (!this.fpsTextEl) return; // Stop if element missing
  
      // Initialize time on the first valid tick
      if (this.startTime === -1 && time > 0) {
          this.startTime = time;
          this.lastUpdateTime = time;
      } else if (this.startTime === -1) {
          return; // Wait for valid time
      }
  
      this.frameCount++;
      const now = time;
      const elapsedTimeSinceUpdate = now - this.lastUpdateTime;
  
      // Update display if interval passed
      if (elapsedTimeSinceUpdate >= this.data.updateInterval) {
        const interval = elapsedTimeSinceUpdate;
        const fps = Math.round((this.frameCount * 1000) / interval);
        this.fpsTextEl.textContent = `FPS: ${fps}`;
  
        // Reset for next interval
        this.frameCount = 0;
        this.lastUpdateTime = now;
      }
    }
}); 