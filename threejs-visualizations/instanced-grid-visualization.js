(function(){
  class InstancedGridVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { grid: 32, spacing: 0.25, waveSpeed: 1.0, rotate: 0.6 };
      const n = this.params.grid; const total = n*n;
      this.geo = new THREE.BoxGeometry(0.18,0.18,0.18);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.6, metalness:0.2 });
      this.inst = new THREE.InstancedMesh(this.geo, this.mat, total);
      this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(this.inst);
      const amb = new THREE.AmbientLight(0x404040, 0.8); const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(6,7,8);
      this.scene.add(amb, dir);
      this._m4 = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this.camera.position.set(0,3.5,6.5);
      this.camera.lookAt(0,0,0);
    }
    update(audio){
      const n = this.params.grid; const sp = this.params.spacing; const t = audio.time||0;
      const bass = audio.bass||0, mid=audio.mid||0, tre=audio.treble||0;
      let i=0;
      for (let y=0;y<n;y++){
        for (let x=0;x<n;x++){
          const px = (x - n/2) * sp; const pz = (y - n/2) * sp;
          const d = Math.sqrt(px*px+pz*pz);
          const h = Math.sin(d*3.0 + t*(1.5+mid*2.0)) * (0.4 + bass*1.8);
          const rot = (t*(0.5+this.params.rotate*mid) + d*1.5);
          this._q.setFromEuler(new THREE.Euler(rot, rot*0.7, rot*0.3));
          this._m4.compose(new THREE.Vector3(px, h, pz), this._q, new THREE.Vector3(1.0+tre*0.5, 1.0+tre*0.5, 1.0+tre*0.5));
          this.inst.setMatrixAt(i++, this._m4);
        }
      }
      this.inst.instanceMatrix.needsUpdate = true;
      const hue = (t*0.05 + tre*0.3)%1.0; this.mat.color.setHSL(hue, 0.7, 0.6);
      this.camera.position.x = Math.cos(t*0.15)*7.0; this.camera.position.z = Math.sin(t*0.15)*7.0;
      this.camera.lookAt(0,0,0);
    }
    dispose(){ super.dispose(); this.geo?.dispose?.(); this.mat?.dispose?.(); }
  }
  window.InstancedGridVisualization = InstancedGridVisualization;
})();

