// komponento fps-counter aprašymas
AFRAME.registerComponent('fps-counter', {
    schema: {
      updateInterval: { type: 'number', default: 1000 } // atnaujinti rodymą kas 1000ms
    },
    init: function () {
      // rasti elementą dom'e. tikimės kad yra.
      // galima paduot selektorių per schema jei id keičiasi.
      this.fpsTextEl = document.getElementById('fps-counter'); 
      this.frameCount = 0;
      this.lastUpdateTime = 0;
      this.startTime = -1; // naudoti -1 rodyti, kad dar neinicijuota pirmu tick'u
  
      if (!this.fpsTextEl) {
        console.error("#fps-counter nerado");
      } else {
        console.log("fps counter start");
      }
    },
    tick: function (time, timeDelta) {
      if (!this.fpsTextEl) return; // sustoti jei elemento nėra
  
      // inicijuoti laiką pirmame teisingame tick'e
      if (this.startTime === -1 && time > 0) {
          this.startTime = time;
          this.lastUpdateTime = time;
      } else if (this.startTime === -1) {
          return; // laukti teisingo laiko
      }
  
      this.frameCount++;
      const now = time;
      const elapsedTimeSinceUpdate = now - this.lastUpdateTime;
  
      // atnaujinti rodymą jei intervalas praėjo
      if (elapsedTimeSinceUpdate >= this.data.updateInterval) {
        const interval = elapsedTimeSinceUpdate;
        const fps = Math.round((this.frameCount * 1000) / interval);
        this.fpsTextEl.textContent = `fps: ${fps}`;
  
        // nustatyti iš naujo kitam intervalui
        this.frameCount = 0;
        this.lastUpdateTime = now;
      }
    }
}); 