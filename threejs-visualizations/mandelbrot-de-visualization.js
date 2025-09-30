(function(){
  // Mandelbrot Distance Estimator Visualization (audio-reactive)
  // Adapted for Three.js full-screen shader and audio uniforms.
  // Original algorithm and distance formulation by Inigo Quilez.
  // The user supplied the reference shader text for educational adaptation.
  

  class MandelbrotDEVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/mandelbrot.frag.glsl'
    );

      this.params = {
        centerX: -0.05,
        centerY:  0.6805,
        zoomPow:  13.0,
        speed:    1.0,
        colorExp: 0.5,
        hueShift: 0.0
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uCenter:{value:new THREE.Vector2(this.params.centerX, this.params.centerY)},
        uZoomPow:{value:this.params.zoomPow},
        uSpeed:{value:this.params.speed},
        uColorExp:{value:this.params.colorExp},
        uHueShift:{value:this.params.hueShift}
      };
      this.material = new THREE.ShaderMaterial({
        uniforms:this.uniforms,
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
      // Sync params -> uniforms
      const p = this.params;
      this.uniforms.uCenter.value.set(p.centerX, p.centerY);
      this.uniforms.uZoomPow.value = p.zoomPow;
      this.uniforms.uSpeed.value = p.speed;
      this.uniforms.uColorExp.value = p.colorExp;
      this.uniforms.uHueShift.value = p.hueShift;
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
  window.MandelbrotDEVisualization = MandelbrotDEVisualization;
})();

