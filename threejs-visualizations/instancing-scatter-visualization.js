(function(){
  class InstancingScatterVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { count: 5000, spread: 6.0, rotate: 0.5 };
      const geo = new THREE.DodecahedronGeometry(0.08);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.5, metalness:0.1 });
      this.inst = new THREE.InstancedMesh(geo, mat, this.params.count);
      this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(this.inst);
      // Per-instance random color
      const color = new THREE.Color();
      for (let i=0;i<this.params.count;i++){
        color.setHSL(Math.random(), 0.7, 0.55);
        this.inst.setColorAt(i, color);
      }
      if (this.inst.instanceColor) this.inst.instanceColor.needsUpdate = true;
      this._m4 = new THREE.Matrix4(); this._q = new THREE.Quaternion();
      const amb = new THREE.AmbientLight(0x404040, 0.8);
      const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(6,7,8);
      this.scene.add(amb, dir);
      this.camera.position.set(0,0,8);
    }
    update(audio){
      const t = audio.time||0; const bass=audio.bass||0, mid=audio.mid||0, tre=audio.treble||0;
      const N = this.params.count; const S = this.params.spread;
      for (let i=0;i<N;i++){
        const seed = i*0.61803398875; // golden ratio seed
        // pseudo-random smooth motion fields
        const x = (Math.sin(seed*12.9898 + t*0.7) * 0.5 + Math.sin(t + i*0.01)*0.3) * S;
        const y = (Math.sin(seed*1.7 + t*0.9) * 0.6 + Math.sin(t*2.0 + i*0.013)*0.4) * (S*0.6 + bass*2.0);
        const z = (Math.cos(seed*2.3 + t*0.5) * 0.8) * S;
        const rot = t*(0.3 + this.params.rotate*0.7) + i*0.002 + mid*0.5;
        this._q.setFromEuler(new THREE.Euler(rot, rot*0.7, rot*0.3));
        const sc = 1.0 + tre*0.5 + 0.2*Math.sin(t*5.0 + i*0.05);
        this._m4.compose(new THREE.Vector3(x,y,z), this._q, new THREE.Vector3(sc, sc, sc));
        this.inst.setMatrixAt(i, this._m4);
      }
      this.inst.instanceMatrix.needsUpdate = true;
      // Slow camera orbit
      this.camera.position.x = Math.cos(t*0.1)*10; this.camera.position.z = Math.sin(t*0.1)*10; this.camera.lookAt(0,0,0);
    }
    getStats(){ return { particles: this.params.count }; }
    dispose(){ super.dispose(); this.inst?.geometry?.dispose?.(); this.inst?.material?.dispose?.(); }
  }
  window.InstancingScatterVisualization = InstancingScatterVisualization;
})();

