(function(){
  class ParticleRingsVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { rings: 6, perRing: 300, baseRadius: 0.6, spacing: 0.5, spin: 0.4, waveHeight: 0.6 };
      const total = this.params.rings * this.params.perRing;
      this.geo = new THREE.SphereGeometry(0.04, 8, 8);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
      this.inst = new THREE.InstancedMesh(this.geo, this.mat, total);
      this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(this.inst);
      const amb = new THREE.AmbientLight(0x404040, 0.6);
      const p = new THREE.PointLight(0xffffff, 1.0, 0, 2.0); p.position.set(5,6,8);
      this.scene.add(amb, p);
      this._m4 = new THREE.Matrix4();
    }

    update(audio){
      const t = audio.time || 0; const bass = audio.bass||0; const mid = audio.mid||0; const treble = audio.treble||0;
      const perRing = this.params.perRing; const rings = this.params.rings; const baseR = this.params.baseRadius; const spacing = this.params.spacing;
      const spin = this.params.spin * (0.5 + mid);
      const waveH = this.params.waveHeight * (0.5 + bass*1.5);
      let i = 0;
      for (let r=0; r<rings; r++){
        const radius = baseR + r*spacing + Math.sin(t*1.5 + r)*0.1*(1+mid);
        for (let j=0; j<perRing; j++){
          const a = (j/perRing) * Math.PI*2 + t*spin + r*0.2;
          const x = Math.cos(a)*radius;
          const z = Math.sin(a)*radius;
          const y = Math.sin(a*3 + t*2 + r*0.5) * waveH;
          const s = 0.7 + bass*0.8 + Math.sin(t*3 + i*0.01)*0.05*treble;
          this._m4.makeScale(s,s,s).setPosition(x, y, z);
          this.inst.setMatrixAt(i++, this._m4);
        }
      }
      this.inst.instanceMatrix.needsUpdate = true;
      const hue = (t*0.05*(1+mid) + treble*0.2)%1; this.mat.color.setHSL(hue, 0.7, 0.6);
      this.camera.position.x = Math.cos(t*0.15)*7; this.camera.position.y = Math.sin(t*0.1)*2; this.camera.lookAt(0,0,0);
    }

    dispose(){ super.dispose(); this.geo?.dispose?.(); this.mat?.dispose?.(); }
    getStats(){ return { particles: this.params.rings * this.params.perRing }; }
  }
  window.ParticleRingsVisualization = ParticleRingsVisualization;
})();

