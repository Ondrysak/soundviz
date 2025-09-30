(function(){
  // Trippy Shader Visualization (adapted from Shadertoy style, audio-reactive)
  

  class TrippyShaderVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/trippy.frag.glsl'
    );

      this.params = {
        zoom: 1.0,
        swirl: 1.0,
        warp: 0.8,
        detail: 1.2,
        speed: 1.0,
        colorShift: 0.6
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uZoom:{value:this.params.zoom}, uSwirl:{value:this.params.swirl}, uWarp:{value:this.params.warp},
        uDetail:{value:this.params.detail}, uSpeed:{value:this.params.speed}, uColorShift:{value:this.params.colorShift}
      };
      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        fragmentShader: fragShader,
        vertexShader: vertShader,
        depthTest:false, depthWrite:false
      });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      this.camera.position.set(0,0,5);
      this.onResize();
    }

    update(audio){
      const t = audio.time || 0;
      this.uniforms.time.value = t;
      this.uniforms.bassLevel.value = audio.bass || 0;
      this.uniforms.midLevel.value = audio.mid || 0;
      this.uniforms.trebleLevel.value = audio.treble || 0;
      // Sync GUI params to uniforms
      const p = this.params;
      this.uniforms.uZoom.value = p.zoom;
      this.uniforms.uSwirl.value = p.swirl;
      this.uniforms.uWarp.value = p.warp;
      this.uniforms.uDetail.value = p.detail;
      this.uniforms.uSpeed.value = p.speed;
      this.uniforms.uColorShift.value = p.colorShift;
    }

    onResize(){
      if (!this.uniforms) return;
      const d = this.renderer.domElement;
      this.uniforms.resolution.value.set(d.width, d.height);
    }

    dispose(){
      super.dispose();
      this.geometry?.dispose?.();
      this.material?.dispose?.();
    }
  }

  window.TrippyShaderVisualization = TrippyShaderVisualization;
})();

