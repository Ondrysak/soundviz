(function(){
  class AudioBars3DVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { bars: 96, radius: 3.0 };
      this.geo = new THREE.BoxGeometry(0.08, 1.0, 0.08);
      this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.5, metalness:0.2 });
      this.inst = new THREE.InstancedMesh(this.geo, this.mat, this.params.bars);
      this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(this.inst);
      const amb = new THREE.AmbientLight(0x404040, 0.8); const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(4,5,6);
      this.scene.add(amb, dir);
      this._m4 = new THREE.Matrix4();
    }

    update(audio){
      const t = audio.time||0; const n = this.params.bars; const r = this.params.radius;
      // Map frequency bins to bars; handle when no audio
      let arr = null; let len = 0; if (audio.hasAudio && audio.frequencyData){ arr = audio.frequencyData; len = arr.length; }
      for (let i=0;i<n;i++){
        const angle = (i/n)*Math.PI*2;
        let v = audio.total||0.15; // fallback animation
        if (arr){ const idx = Math.min(len-1, Math.floor(i/ n * len)); v = arr[idx]/255; }
        const h = 0.3 + v*3.0;
        const x = Math.cos(angle)*r; const z = Math.sin(angle)*r; const y = h*0.5;
        this._m4.compose(new THREE.Vector3(x,y,z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), angle), new THREE.Vector3(1,h,1));
        this.inst.setMatrixAt(i, this._m4);
      }
      this.inst.instanceMatrix.needsUpdate = true;
      const hue = (t*0.05 + (audio.treble||0)*0.3)%1; this.mat.color.setHSL(hue,0.8,0.6);
      this.camera.position.x = Math.cos(t*0.2)*6; this.camera.position.z = Math.sin(t*0.2)*6; this.camera.position.y = 2.5 + Math.sin(t*0.3)*0.5; this.camera.lookAt(0,0,0);
    }

    dispose(){ super.dispose(); this.geo?.dispose?.(); this.mat?.dispose?.(); }
    getStats(){ return { particles: this.params.bars }; }
  }
  window.AudioBars3DVisualization = AudioBars3DVisualization;
})();

