// komponento follow-shadow aprašymas
AFRAME.registerComponent('follow-shadow', {
    schema: {type: 'selector'},
    init: function() {
        console.log("[follow-shadow] inicijuojama");
        this.el.object3D.renderOrder = -1; // užtikrinti, kad šešėlis renderintųsi po apačia
        this.targetEl = null;
        this.initialPosSet = false;

        this.targetEl = this.data; // this.data YRA išspręstas target elementas

        if (this.targetEl) {
            console.log(`[follow-shadow] pradinis target elementas rastas: ${this.targetEl.id}`);
        } else {
             console.warn(`[follow-shadow] pradinis target elemento selektorius neišspręstas.`);
        }
    },
    update: function(oldData) {
        if (this.data !== oldData) {
            console.log("[follow-shadow] target duomenys atnaujinti.");
            this.targetEl = this.data; // atnaujinti nuorodą į naują target elementą
            this.initialPosSet = false; // nustatyti pozicijos flag'ą iš naujo kai keičiasi target

             if (this.targetEl) {
                 console.log("[follow-shadow] naujas target elementas priskirtas:", this.targetEl.id);
             } else {
                  console.warn(`[follow-shadow] naujas target elemento selektorius neišspręstas.`);
             }
        }
    },
    tick: function() {
        if (this.targetEl?.object3D?.visible) {
            // naudoti target pasaulio poziciją jei reikia, arba lokalią jei parent ryšys garantuotas
            // naudojama lokali pozicija darant prielaidą, kad šešėlis yra to paties parent arba scenos vaikas
            const targetPos = this.targetEl.object3D.position;

            if (!this.initialPosSet && targetPos.y > -100) { // tikrinti ar y nėra numatytoji didelė neigiama
                 this.initialPosSet = true;
            }
            if (this.initialPosSet) {
                 this.el.object3D.position.copy(targetPos);
                 this.el.object3D.position.y = 0.001; // laikyti šešėlį truputį virš žemės
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