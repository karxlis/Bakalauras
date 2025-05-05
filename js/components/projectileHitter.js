// komponento projectile-hitter aprašymas
AFRAME.registerComponent('projectile-hitter', {
    schema: {
        speed: { default: 10.0 },
        lifetime: { default: 3000.0 },
        direction: { type: 'vec3' },
        targetSelector: { type: 'string', default: '.enemy' },
        collisionRadius: { type: 'number', default: 0.2 },
        damage: { type: 'number', default: 1 },
        isSlowing: { type: 'boolean', default: false },
        slowAmount: { type: 'number', default: 0 },
        aoeRadius: { type: 'number', default: 1.5 } // spindulys plotiniam lėtinimui
    },
    init: function () {
        if (this.data.direction.lengthSq() > 0.001) {
            this.data.direction.normalize();
        } else {
            this.data.direction.set(0, 0, -1); // numatytoji kryptis jei nenurodyta
        }
        this.targets = [];
        this.targetsFound = false;
        this.projectileWorldPos = new THREE.Vector3();
        this.targetWorldPos = new THREE.Vector3(); // pirminio pataikyto taikinio pozicija
        this.otherEnemyWorldPos = new THREE.Vector3(); // tikrinti artimus priešus plotiniam efektui
        this.collisionRadiusSq = this.data.collisionRadius * this.data.collisionRadius;
        this.aoeRadiusSq = this.data.aoeRadius * this.data.aoeRadius;
        this.startTime = this.el.sceneEl.time; // saugoti pradinį laiką

        // atidėti pradinę taikinių užklausą šiek tiek, kad scena spėtų užsikrauti
        setTimeout(() => {
            this.targets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
            console.log(`[projectile-hitter] inicijuotas. taikosi į: ${this.data.targetSelector}. rasta ${this.targets.length} pradinių taikinių.`);
            if(this.targets.length === 0) {
                console.warn(`[projectile-hitter] nerasta pradinių taikinių ${this.data.targetSelector}`);
            }
            this.targetsFound = this.targets.length > 0;
        }, GAME_CONFIG.TIMINGS.PROJECTILE_TARGET_QUERY_MS); // naudoti config uždelsimui
    },

    tick: function (time, timeDelta) {
       const data = this.data;
       const el = this.el;
       const elapsedTime = time - this.startTime;

       // --- gyvavimo laiko patikra ---
       if (elapsedTime > data.lifetime) {
         if (el.parentNode) { el.parentNode.removeChild(el); }
         return;
       }

       // --- judėjimas ---
       const distance = data.speed * (timeDelta / 1000);
       if (isNaN(distance) || distance <= 0 || !isFinite(distance) || !el.object3D) return;
       el.object3D.position.addScaledVector(data.direction, distance);

       // --- taikinių atnaujinimas (periodiškai) ---
       // tikrinti ar taikiniai rasti arba ar laikas atnaujinti
       if (!this.targetsFound || time % 1000 < timeDelta) { // grubus patikrinimas kas sekundę
         const currentTargets = Array.from(this.el.sceneEl.querySelectorAll(this.data.targetSelector));
         // atnaujinti sąrašą tik jei skaičius pasikeitė, kad išvengti masyvo perkūrimo
         if (currentTargets.length !== this.targets.length) {
           this.targets = currentTargets;
         }
         this.targetsFound = this.targets.length > 0;
       }

       // --- susidūrimo patikra (tik jei yra taikinių) ---
       if (!this.targetsFound || !el.object3D) return;
       el.object3D.getWorldPosition(this.projectileWorldPos);

       // ciklas per galimus taikinius
       for (let i = 0; i < this.targets.length; i++) {
         const primaryTarget = this.targets[i];
         if (!primaryTarget?.object3D || !primaryTarget.object3D.visible) continue; // praleisti neteisingus/nematomus taikinius

         const primaryHitReceiver = primaryTarget.components['hit-receiver'];
         if (!primaryHitReceiver) continue; // praleisti jei taikinys negali gauti žalos

         primaryTarget.object3D.getWorldPosition(this.targetWorldPos); // saugoti pirminio taikinio poziciją
         const distSq = this.projectileWorldPos.distanceToSquared(this.targetWorldPos);

         // --- susidūrimas aptiktas ---
         if (distSq < this.collisionRadiusSq) {
             // pritaikyti efektą pagal kulkos tipą
             if (data.isSlowing) {
                 console.log(`%c[projectile-hitter] lėtinantis pataikymas į pirminį: ${primaryTarget.id}! kiekis: ${data.slowAmount * 100}%`, "color: cyan; font-weight: bold;");
                 primaryHitReceiver.applySlow(data.slowAmount);

                 // --- pritaikyti plotinį lėtinimą ---
                 if (data.aoeRadius > 0) {
                     console.log(`[projectile-hitter] tikrinami plotiniai taikiniai ${data.aoeRadius}m spinduliu...`);
                     // atnaujinti sąrašą prieš pat plotinio efekto patikrą maksimaliam tikslumui
                     const allEnemies = this.el.sceneEl.querySelectorAll(data.targetSelector + '[visible="true"]');
                     let aoeHits = 0;

                     allEnemies.forEach(otherEnemy => {
                        if (otherEnemy === primaryTarget || !otherEnemy?.object3D?.visible) return; // praleisti save ir nematomus

                        const secondaryHitReceiver = otherEnemy.components['hit-receiver'];
                        if (!secondaryHitReceiver) return; // praleisti jei nėra hit-receiver

                        otherEnemy.object3D.getWorldPosition(this.otherEnemyWorldPos);
                        const distToImpactSq = this.targetWorldPos.distanceToSquared(this.otherEnemyWorldPos);

                        if (distToImpactSq < this.aoeRadiusSq) {
                            console.log(`  -> taikomas plotinis lėtinimas ${otherEnemy.id}`);
                            secondaryHitReceiver.applySlow(data.slowAmount);
                            aoeHits++;
                        }
                     });
                     if (aoeHits > 0) console.log(`[projectile-hitter] pritaikytas plotinis lėtinimas ${aoeHits} papildomiems taikiniams.`);
                 }
                 // --- plotinio lėtinimo pabaiga ---

             } else { // įprastas žalos pataikymas
                 console.log(`%c[projectile-hitter] žalos pataikymas į: ${primaryTarget.id}! žala: ${data.damage}`, "color: green; font-weight: bold;");
                 primaryHitReceiver.hit(data.damage);
             }

             // pašalinti kulką pritaikius efektą(-us)
             if (el.parentNode) { el.parentNode.removeChild(el); }
             return; // išeiti iš ciklo ir tick'o po pataikymo
           }
       } // taikinių ciklo pabaiga
     } // tick pabaiga
   }); 