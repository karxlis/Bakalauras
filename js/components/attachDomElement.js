
const _attachDomElementVector = new THREE.Vector3();

AFRAME.registerComponent('attach-dom-element', {
    schema: { type: 'string', default: '' }, // css selektorius dom elementui(-ams)
    init: function() {
        this.screenElements = [];
        this.updateElements(); // pradinis užklausimas

        // perklausti jei selektoriaus atributas pasikeičia
        this.el.addEventListener('componentchanged', (evt) => {
            if (evt.detail.name === 'attach-dom-element') {
                this.updateElements();
            }
        });
    },
    // randa dom elementus pagal selektorių
    updateElements: function() {
        if (!this.data) {
            this.screenElements = [];
            return;
        }
        try {
            this.screenElements = Array.from(document.querySelectorAll(this.data));
            if (this.screenElements.length === 0 && this.data) {
                console.warn(`attach-dom-element selektorius "${this.data}" ant ${this.el.id || 'elemento'} nerado atitinkančių dom elementų.`);
            }
        } catch (e) {
            console.error(`neteisingas selektorius "${this.data}" attach-dom-element ant ${this.el.id || 'elemento'}:`, e);
            this.screenElements = [];
        }
    },
    // atnaujina dom elementų poziciją kiekviename kadre
    tick: function() {
        if (this.screenElements.length === 0 || !this.el.sceneEl?.hasLoaded || !this.el.sceneEl.camera?.el || !this.el.object3D) {
            return; // išeiti jei nėra elementų, scena/kamera neparuošta, arba elementas pašalintas
        }

        // paslėpti dom elementus jei a-frame entity paslėptas
        if (!this.el.object3D.visible) {
            this.screenElements.forEach(el => { if (el) el.style.display = 'none'; });
            return;
        }

        // projektuoti a-frame entity pasaulio poziciją į ekrano koordinates
        this.el.object3D.getWorldPosition(_attachDomElementVector);
        _attachDomElementVector.project(this.el.sceneEl.camera);

        const w = window.innerWidth * 0.5;
        const h = window.innerHeight * 0.5;
        const screenX = w + w * _attachDomElementVector.x;
        const screenY = h - h * _attachDomElementVector.y;

        // atnaujinti kiekvieno dom elemento poziciją
        for (const el of this.screenElements) {
            if (!el) continue;

            // jei pries cammera
            if (_attachDomElementVector.z < 1) {
                // naudoti translate(-50%, -50%) centruoti elementą ant projektuojamo taško
                el.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`;
                el.style.display = 'block';
            } else {
                el.style.display = 'none'; // paslėpti jei už kameros
            }
        }
    }
}); 