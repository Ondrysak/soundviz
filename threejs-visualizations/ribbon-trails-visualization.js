(function(){
  class RibbonTrailsVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { ribbons: 24, length: 160, spread: 2.0, speed: 1.0 };
      this.material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.85 });
      this.ribbons = [];
      for (let i=0;i<this.params.ribbons;i++){
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(this.params.length * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(geo, this.material.clone());
        this.scene.add(line);
        this.ribbons.push({ geo, positions, head:0, off: Math.random()*100, line });
      }
      const amb = new THREE.AmbientLight(0x404040, 0.7); const p = new THREE.PointLight(0xffffff, 1.0, 0, 2); p.position.set(5,6,8);
      this.scene.add(amb,p);
      this.camera.position.set(0,0,6);
    }
    _emitPos(i, t, bass, mid, tre){
      const a = t* (0.6 + this.params.speed*0.6 + mid) + i*0.3;
      const b = t* (1.2 + tre*0.8) + i*0.7;
      const r = this.params.spread * (1.0 + bass*0.5);
      return new THREE.Vector3(
        Math.sin(a*1.3)*r + Math.sin(b*0.7)*0.3,
        Math.cos(a*0.9)*r*0.6 + Math.sin(b*1.1)*0.4,
        Math.sin(a*0.5 + b*0.3)*r*0.8
      );
    }
    update(audio){
      const t = audio.time||0; const bass=audio.bass||0, mid=audio.mid||0, tre=audio.treble||0;
      for (let i=0;i<this.ribbons.length;i++){
        const rb = this.ribbons[i];
        const headPos = this._emitPos(i + rb.off, t, bass, mid, tre);
        // shift positions
        const arr = rb.positions;
        for (let k=arr.length-3; k>=3; k-=3){ arr[k]=arr[k-3]; arr[k+1]=arr[k-2]; arr[k+2]=arr[k-1]; }
        arr[0]=headPos.x; arr[1]=headPos.y; arr[2]=headPos.z;
        rb.geo.attributes.position.needsUpdate = true;
        rb.line.material.color.setHSL((t*0.05 + i*0.03 + tre*0.3)%1.0, 0.8, 0.6);
      }
      this.camera.position.x = Math.cos(t*0.2)*7; this.camera.position.y = Math.sin(t*0.13)*2; this.camera.lookAt(0,0,0);
    }
    dispose(){ super.dispose(); this.ribbons.forEach(r=>r.geo.dispose()); }
  }
  window.RibbonTrailsVisualization = RibbonTrailsVisualization;
})();

