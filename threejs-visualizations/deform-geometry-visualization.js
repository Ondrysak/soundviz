(function(){
  class DeformGeometryVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { frequency: 2.0, amplitude: 0.6 };
      const geo = new THREE.IcosahedronGeometry(1.5, 3);
      this.geometry = geo.toNonIndexed();
      const pos = this.geometry.getAttribute('position');
      const count = pos.count; this.original = new Float32Array(count*3);
      for (let i=0;i<count*3;i++) this.original[i] = pos.array[i];
      this.material = new THREE.MeshStandardMaterial({ color: 0x66ccff, roughness:0.4, metalness:0.2, flatShading:false });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      const amb = new THREE.AmbientLight(0x404040, 0.8); const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(5,6,8);
      this.scene.add(amb, dir);
      this.camera.position.set(0,0,5);
    }

    update(audio){
      const t = audio.time||0, bass=audio.bass||0, mid=audio.mid||0, tre=audio.treble||0;
      const pos = this.geometry.getAttribute('position'); const arr = pos.array; const org = this.original; const n = pos.count;
      const freq = 1.0 + mid*4.0 + Math.sin(t*0.5)*0.5; const amp = 0.2 + (bass*1.2 + tre*0.8) * this.params.amplitude;
      for (let i=0;i<n;i++){
        const ix=i*3; const x=org[ix], y=org[ix+1], z=org[ix+2];
        const r = Math.sqrt(x*x+y*y+z*z);
        const d = Math.sin(r*3.0*freq + t*2.0 + i*0.01) * amp;
        const scale = 1.0 + d;
        arr[ix] = x*scale; arr[ix+1] = y*scale; arr[ix+2] = z*scale;
      }
      pos.needsUpdate = true; this.geometry.computeVertexNormals();
      this.mesh.rotation.x += 0.01 + mid*0.02; this.mesh.rotation.y += 0.012 + tre*0.02;
      const hue = (t*0.04 + tre*0.3)%1; this.material.color.setHSL(hue, 0.7, 0.6);
    }

    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.DeformGeometryVisualization = DeformGeometryVisualization;
})();

