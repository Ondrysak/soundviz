(function(){
  class SpotlightsVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { angle: 0.6, penumbra: 0.25 };
      // Floor and columns
      const floorGeo = new THREE.PlaneGeometry(40,40);
      const floorMat = new THREE.MeshStandardMaterial({ color:0x101010, roughness:0.9, metalness:0.0 });
      this.floor = new THREE.Mesh(floorGeo, floorMat); this.floor.rotation.x = -Math.PI/2; this.floor.position.y = -2.0; this.scene.add(this.floor);
      this.columns = [];
      for (let i=0;i<8;i++){
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,4,24), new THREE.MeshStandardMaterial({ color:0x333333, roughness:0.8 }));
        col.position.set(Math.cos(i/8*Math.PI*2)*6, 0, Math.sin(i/8*Math.PI*2)*6);
        this.scene.add(col); this.columns.push(col);
      }
      // Ambient and hemisphere for base visibility
      this.scene.add(new THREE.AmbientLight(0x222222, 0.5));
      this.scene.add(new THREE.HemisphereLight(0x334455, 0x000000, 0.3));
      // Spotlights (no shadows for perf unless we add a toggle later)
      this.spots = [];
      for (let i=0;i<3;i++){
        const s = new THREE.SpotLight(0xffffff, 2.0, 40, this.params.angle, this.params.penumbra);
        s.position.set(0,4,0); s.target.position.set(0,0,0);
        this.scene.add(s); this.scene.add(s.target);
        s.castShadow = false;
        this.spots.push(s);
      }
      this.camera.position.set(0,2,10); this.camera.lookAt(0,0,0);
    }
    update(audio){
      const t = audio.time||0; const b=audio.bass||0, m=audio.mid||0, tr=audio.treble||0;
      const R = 7.5 + b*4.0;
      for (let i=0;i<this.spots.length;i++){
        const s = this.spots[i];
        const a = t*(0.6 + i*0.1) + i*2.0;
        s.position.set(Math.cos(a)*R, 4.0 + Math.sin(t*0.9+i)*1.0, Math.sin(a)*R);
        const tx = Math.cos(a*1.3 + i)*2.0; const tz = Math.sin(a*1.1 + i)*2.0;
        s.target.position.set(tx, -1.0 + Math.sin(t*1.7+i)*0.5, tz);
        s.intensity = 1.5 + b*3.0 + m*1.0;
        s.angle = 0.4 + m*0.5; s.penumbra = 0.1 + tr*0.6;
        s.color.setHSL((0.6 + i*0.15 + tr*0.3)%1.0, 0.8, 0.6+0.2*Math.sin(t*3.0+i));
      }
      this.columns.forEach((c,idx)=>{ const hue=(0.55 + idx*0.07 + tr*0.3)%1.0; c.material.color.setHSL(hue, 0.6, 0.25 + 0.2*b); });
      this.camera.position.x = Math.cos(t*0.2)*12; this.camera.position.z = Math.sin(t*0.2)*12; this.camera.lookAt(0,0,0);
    }
    dispose(){ super.dispose(); }
  }
  window.SpotlightsVisualization = SpotlightsVisualization;
})();

