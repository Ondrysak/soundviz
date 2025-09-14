(function(){
  class TorusKnotMaterialVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { textureSpeed: 1.0, emissive: 0.6 };
      this.geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 256, 48);
      // Procedural canvas texture
      this.texCanvas = document.createElement('canvas'); this.texCanvas.width = 256; this.texCanvas.height = 256;
      this.ctx2d = this.texCanvas.getContext('2d'); this.texture = new THREE.CanvasTexture(this.texCanvas); this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
      this.material = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this.texture, emissive: new THREE.Color(0x222222), emissiveIntensity: this.params.emissive, roughness:0.4, metalness:0.4 });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      const amb = new THREE.AmbientLight(0x404040, 0.7); const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(5,6,8);
      this.scene.add(amb, dir);
      this.camera.position.set(0,0,5);
      this._phase = 0;
    }
    _updateTexture(t, bass, mid, tre){
      const ctx = this.ctx2d; const w=ctx.canvas.width, h=ctx.canvas.height;
      // Animated radial gradient stripes
      ctx.clearRect(0,0,w,h);
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)/2);
      const hue0 = (t*20 + bass*120) % 360; const hue1 = (hue0 + 120 + mid*80) % 360; const hue2 = (hue1 + 120 + tre*160) % 360;
      g.addColorStop(0, `hsl(${hue0}, 90%, 55%)`);
      g.addColorStop(0.5, `hsl(${hue1}, 90%, 50%)`);
      g.addColorStop(1, `hsl(${hue2}, 90%, 45%)`);
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      // Overlay moving stripes
      const stripes = 12 + Math.floor(mid*24);
      ctx.globalAlpha = 0.35 + tre*0.3; ctx.fillStyle = '#fff';
      for (let i=0;i<stripes;i++){
        const y = ((i * (h/stripes)) + (t*120*(1+mid))) % h; ctx.fillRect(0, y, w, h/stripes*0.2);
      }
      ctx.globalAlpha = 1.0;
      this.texture.needsUpdate = true;
    }
    update(audio){
      const t = (audio.time||0) * this.params.textureSpeed; const b=audio.bass||0, m=audio.mid||0, tr=audio.treble||0;
      this._updateTexture(t, b, m, tr);
      this.mesh.rotation.y += 0.01 + m*0.03; this.mesh.rotation.x += 0.008 + tr*0.02;
      this.material.emissiveIntensity = 0.4 + b*1.2;
      // Subtle scale pulse
      const s = 1.0 + Math.sin((audio.time||0)*2.0) * (0.02 + b*0.05);
      this.mesh.scale.setScalar(s);
    }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.texture?.dispose?.(); this.material?.dispose?.(); }
  }
  window.TorusKnotMaterialVisualization = TorusKnotMaterialVisualization;
})();

