(function(){
  

  class ShaderVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/uv.vert.glsl',
      './shaders/shader.frag.glsl'
    );

      this.params = { intensity: 1.0 };
      // Big plane covering view
      this.geometry = new THREE.PlaneBufferGeometry(50, 50, 1, 1);
      this.uniforms = {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1,1) },
        bassLevel: { value: 0 },
        midLevel: { value: 0 },
        trebleLevel: { value: 0 }
      };
      this.material = new THREE.ShaderMaterial({
        fragmentShader: fragShader,
        vertexShader: vertShader,
        uniforms: this.uniforms,
        transparent: false
      });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      this.camera.position.set(0,0,5);
      this.onResize(this.renderer.domElement.width, this.renderer.domElement.height);
    }

    update(audio) {
      const t = audio.time || 0;
      this.uniforms.time.value = t;
      this.uniforms.bassLevel.value = audio.bass || 0;
      this.uniforms.midLevel.value = audio.mid || 0;
      this.uniforms.trebleLevel.value = audio.treble || 0;
    }

    onResize(w, h) {
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
  window.ShaderVisualization = ShaderVisualization;
})();

