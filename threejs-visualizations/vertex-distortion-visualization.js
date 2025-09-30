(function(){
  
  

  class VertexDistortionVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/vertex-distortion.vert.glsl',
      './shaders/vertex-distortion.frag.glsl'
    );

      this.params = { detail: 3 };
      this.geometry = new THREE.SphereBufferGeometry(1.6, 96, 64);
      this.uniforms = { time:{value:0}, bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0} };
      this.material = new THREE.ShaderMaterial({ vertexShader: vertShader, fragmentShader: fragShader, uniforms:this.uniforms, flatShading:false });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      const amb = new THREE.AmbientLight(0x404040, 0.8); const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(5,6,8);
      this.scene.add(amb, dir);
      this.camera.position.set(0,0,5);
    }
    update(audio){
      const t = audio.time||0; this.uniforms.time.value=t; this.uniforms.bassLevel.value=audio.bass||0; this.uniforms.midLevel.value=audio.mid||0; this.uniforms.trebleLevel.value=audio.treble||0;
      this.mesh.rotation.y += 0.01 + (audio.mid||0)*0.03; this.mesh.rotation.x += 0.008 + (audio.treble||0)*0.02;
    }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.VertexDistortionVisualization = VertexDistortionVisualization;
})();

