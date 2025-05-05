// komponento hit-receiver aprašymas
AFRAME.registerComponent('hit-receiver', {
    schema: {
        maxHealth: { type: 'int', default: 1 },
        initialHealth: { type: 'int', default: 1 }
    },

    init: function () {
        this.isVisible = this.el.getAttribute('visible'); // pradinė matomumo būsena
        this.isEnemy = this.el.classList.contains('enemy');
        this.currentHealth = this.data.initialHealth;
        this.healthTextEl = this.el.querySelector('.enemy-health-text'); // rasti galimą gyvybių teksto vaiką

        console.log(`[hit-receiver] inicijuotas ant ${this.el.id}. yra priešas: ${this.isEnemy}. maxhealth: ${this.data.maxHealth}, currenthealth: ${this.currentHealth}`);
        this.updateHealthText(); // nustatyti pradinį gyvybių tekstą jei taikoma
    },

    // atnaujina priešo gyvybių teksto rodymą (jei jis yra)
    updateHealthText: function() {
        if (this.healthTextEl && this.isEnemy && this.data.maxHealth > 1) {
            this.healthTextEl.setAttribute('value', `hp: ${this.currentHealth}`);
            this.healthTextEl.setAttribute('visible', this.currentHealth > 0);
        } else if (this.healthTextEl) {
             this.healthTextEl.setAttribute('visible', false);
        }
    },

    // kviečiamas kai entity pataiko žalą daranti kulka
    hit: function(damageAmount = 1) {
        if (!this.isVisible || isGameOver) { return; } // ignoruoti pataikymus jei nematomas arba žaidimas baigtas
        console.log(`[hit-receiver] ${this.el.id} gavo ${damageAmount} žalos!`);

        if (this.isEnemy) {
            this.currentHealth -= damageAmount;
            this.currentHealth = Math.max(0, this.currentHealth); // neleisti neigiamos gyvybės
            console.log(`[hit-receiver] priešo gyvybė: ${this.currentHealth}/${this.data.maxHealth}`);
            this.updateHealthText();

            if (this.currentHealth <= 0) {
                // --- priešo sunaikinimo logika ---
                 console.log(`[hit-receiver] priešas ${this.el.id} sunaikintas!`);
                 this.isVisible = false;
                 this.el.setAttribute('visible', 'false');

                 // atnaujinti globalią būseną (galima naudoti eventus)
                 if (window.incrementScore) { window.incrementScore(); } // globalios funkcijos kvietimas
                 if (window.enemyManager) { window.enemyManager.decrementCount(); } // globalaus objekto prieiga

                 // pašalinti elementą po trumpo uždelsimo
                 if (this.el.parentNode) {
                     const removeDelay = GAME_CONFIG.TIMINGS.ENEMY_REMOVE_DELAY_MS;
                     setTimeout(() => { if(this.el.parentNode) this.el.parentNode.removeChild(this.el); }, removeDelay);
                 }
            } else {
                // --- priešas pažeistas bet nesunaikintas: rodyti dalelių efektą ---
                try {
                    const particleDuration = 800;
                    const particleColor = '#FFFFFF'; // ryškiai baltas blyksnis
                    const hitPosition = new THREE.Vector3();

                    // užtikrinti, kad pasaulio matrica atnaujinta prieš gaunant pasaulio poziciją
                    this.el.object3D.updateMatrixWorld(true);
                    this.el.object3D.getWorldPosition(hitPosition);
                    hitPosition.y += 0.1; // šiek tiek pakelti

                    const impactMarker = document.createElement('a-ring');
                    impactMarker.setAttribute('position', hitPosition);
                    impactMarker.setAttribute('color', particleColor);
                    impactMarker.setAttribute('material', 'shader: flat; side: double;');
                    impactMarker.setAttribute('radius-inner', '0.05');
                    impactMarker.setAttribute('radius-outer', '0.30');
                    impactMarker.setAttribute('rotation', '0 0 0'); // laikyti plokščią pasaulio atžvilgiu
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
                    console.error(`[hit-receiver] klaida kuriant dalelių efektą ${this.el.id}:`, particleError);
                }
            }
        } else {
            // logika ne priešo pataikymams (pvz., pataikius į bokštą)
            // šis komponentas šiuo metu netvarko bokšto pataikymų;
            // ta logika atrodo yra globalioje `towerhit` funkcijoje.
            console.log(`[hit-receiver] ne priešas ${this.el.id} pataikytas. komponentas nieko nedaro.`);
        }
    }, // hit funkcijos pabaiga

  // kviečiamas kai pataiko lėtinanti kulka
  applySlow: function(slowAmount) {
    if (!this.isEnemy || isGameOver) return; // lėtinti tik aktyvius priešus
    console.log(`[hit-receiver] taikomas lėtinimas (${(slowAmount * 100).toFixed(0)}%) ${this.el.id}`);

    const moveComponent = this.el.components['move-towards-target'];
    if (moveComponent && moveComponent.applySlowEffect) {
        moveComponent.applySlowEffect(slowAmount, GAME_CONFIG.EFFECTS.SLOW_DURATION_MS); // naudoti config
    } else {
        console.warn(`[hit-receiver] nerastas move-towards-target komponentas arba applysloweffect metodas ant ${this.el.id} lėtinimui.`);
    }
  },

  // kviečiamas kai entity/komponentas pašalinamas iš scenos
    remove: function() {
        // sumažinti skaičių jei pašalinta išoriškai kol dar turėjo gyvybių
        // tai tvarko atvejus kai priešai gali būti pašalinti ne dėl mirties (pvz., žaidimo resetas)
        if (this.isEnemy && window.enemyManager && this.currentHealth > 0 && !isGameOver) {
             window.enemyManager.decrementCount();
             console.warn(`[hit-receiver] sumažintas skaičius per remove ${this.el.id} kuris turėjo gyvybių > 0.`);
        }
    }
}); 