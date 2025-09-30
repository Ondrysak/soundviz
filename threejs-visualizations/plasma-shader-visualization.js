(function(){
  

  class PlasmaShaderVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/plasma.frag.glsl'
    );

      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = { time:{value:0}, resolution:{value:new THREE.Vector2(1,1)}, bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0} };
      this.material = new THREE.ShaderMaterial({ uniforms:this.uniforms, fragmentShader: fragShader, vertexShader: vertShader});
      this.mesh = new THREE.Mesh(this.geometry, this.material); this.scene.add(this.mesh); this.camera.position.set(0,0,5);
      this.onResize();
    }
    update(audio){ this.uniforms.time.value = audio.time||0; this.uniforms.bassLevel.value=audio.bass||0; this.uniforms.midLevel.value=audio.mid||0; this.uniforms.trebleLevel.value=audio.treble||0; }
    onResize(){ const d=this.renderer.domElement; if (this.uniforms) this.uniforms.resolution.value.set(d.width,d.height); }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.PlasmaShaderVisualization = PlasmaShaderVisualization;
})();

