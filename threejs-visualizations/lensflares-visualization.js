(function(){
  function makeFlareTexture(size){
    const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; return tex;
  }

  class LensFlaresVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { intensity: 1.5 };
      // Background stars for context
      const starGeo = new THREE.BufferGeometry(); const N = 1500; const pos = new Float32Array(N*3);
      for (let i=0;i<N;i++){ pos[i*3]=(Math.random()-0.5)*60; pos[i*3+1]=(Math.random()-0.5)*40; pos[i*3+2]=(Math.random()-0.2)*-60; }
      starGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
      const starMat = new THREE.PointsMaterial({ color:0xffffff, size:0.06, sizeAttenuation:true });
      this.stars = new THREE.Points(starGeo, starMat); this.scene.add(this.stars);

      // Light source
      this.light = new THREE.PointLight(0xffffff, this.params.intensity, 0, 2.0);
      this.light.position.set(3,2,4); this.scene.add(this.light);

      // Flare sprites
      this.flareTexture = makeFlareTexture(128);
      this.flares = [];
      const count = 6;
      for (let i=0;i<count;i++){
        const mat = new THREE.SpriteMaterial({ map:this.flareTexture, color:0xffffff, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true });
        const spr = new THREE.Sprite(mat); this.scene.add(spr); this.flares.push(spr);
      }
      this.camera.position.set(0,0,8);
    }
    _ndcOfWorld(obj){
      return new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld).project(this.camera);
    }
    update(audio){
      const t = audio.time||0; const b=audio.bass||0, m=audio.mid||0, tr=audio.treble||0;
      // Animate light
      this.light.position.x = Math.sin(t*0.7) * (3.5 + b*2.0);
      this.light.position.y = Math.cos(t*0.9) * (2.5 + m*1.5);
      this.light.intensity = this.params.intensity + b*3.0;
      // Rotate starfield slowly
      this.stars.rotation.y += 0.0008 + m*0.002;
      // Compute line from light to screen center in NDC
      const ndc = this._ndcOfWorld(this.light);
      const dir = new THREE.Vector2(0 - ndc.x, 0 - ndc.y);
      const steps = this.flares.length; const baseSize = 0.6 + tr*1.2;
      for (let i=0;i<steps;i++){
        const f = i/(steps-1);
        const pNdc = new THREE.Vector3(ndc.x + dir.x*f, ndc.y + dir.y*f, 0);
        const pos = pNdc.unproject(this.camera);
        const spr = this.flares[i]; spr.position.copy(pos);
        const s = baseSize * (1.0 + Math.sin(t*3.0 + i)*0.2) * (1.0 + b*0.6);
        spr.scale.set(s, s, s);
        const hue = (0.6 + f*0.3 + tr*0.2) % 1.0; spr.material.color.setHSL(hue, 0.8, 0.7);
        spr.material.opacity = 0.5 + 0.5*(1.0-f) * (0.3 + m*0.7);
      }
      // Subtle camera motion
      this.camera.position.x = Math.sin(t*0.2)*1.0; this.camera.position.y = Math.cos(t*0.17)*0.8; this.camera.lookAt(0,0,0);
    }
    dispose(){ super.dispose(); this.flareTexture?.dispose?.(); }
  }
  window.LensFlaresVisualization = LensFlaresVisualization;
})();
