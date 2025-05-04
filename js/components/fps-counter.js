AFRAME.registerComponent('fps-counter', {
    schema: {
      updateInterval: { type: 'number', default: 1000 } // Update display every 1000ms (1 second)
    },
    init: function () {
      this.fpsTextEl = document.getElementById('fps-counter');
      this.frameCount = 0;
      this.lastUpdateTime = 0; // Initialize to 0
  
      if (!this.fpsTextEl) {
        // Use console.error for important setup issues
        console.error("FPS Counter INIT Error: DOM element #fps-counter not found!");
      } else {
        console.log("FPS Counter component initialized, found element:", this.fpsTextEl);
      }
      // Initialize startTime based on the first tick's time for better first calculation
      this.startTime = -1; // Use -1 to indicate it hasn't been set yet
    },
  
    tick: function (time, timeDelta) {
      // Log 1: Confirm tick is running (can be noisy, uncomment temporarily if needed)
      // console.log(`FPS Tick: time=${time.toFixed(0)}`);
  
      // Log 2: Check if element exists *every tick* just in case
      if (!this.fpsTextEl) {
          // console.warn("FPS Tick: fpsTextEl is null, cannot update."); // Only log if it's actually missing
          return; // Stop if element not found
      }
  
      // Initialize startTime on the first valid tick
      if (this.startTime === -1 && time > 0) { // Ensure time is valid
    //      console.log("FPS Tick: Initializing startTime and lastUpdateTime to", time);
          this.startTime = time;
          this.lastUpdateTime = time; // Set lastUpdateTime on first tick too
      } else if (this.startTime === -1) {
          // Waiting for first valid time signal from A-Frame
          return;
      }
  
  
      this.frameCount++;
      const now = time;
      const elapsedTimeSinceUpdate = now - this.lastUpdateTime;
  
      // Log 3: Check timing condition (uncomment to see interval checks)
      // console.log(`FPS Tick: elapsedTimeSinceUpdate=${elapsedTimeSinceUpdate.toFixed(0)}, TargetInterval=${this.data.updateInterval}`);
  
      // Check if interval has passed
      if (elapsedTimeSinceUpdate >= this.data.updateInterval) {
        const interval = elapsedTimeSinceUpdate; // Use actual elapsed time
        const fps = Math.round((this.frameCount * 1000) / interval); // Calculate FPS
  
        // Log 4: Log calculated FPS and the update action
      //  console.log(`FPS Update: Interval=${interval.toFixed(0)}ms, Frames=${this.frameCount}, Calculated FPS=${fps}`);
        this.fpsTextEl.textContent = `FPS: ${fps}`; // Update the display
  
        // Reset for next interval
        this.frameCount = 0;
        this.lastUpdateTime = now;
      }
    }
});