(function(){
  
  

  class GalaxyParticlesVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/galaxy-particles.vert.glsl',
      './shaders/galaxy-particles.frag.glsl'
    );

      this.params = { count: 8000, radius: 4.0 };
      const g = new THREE.BufferGeometry();
      const N = this.params.count; const R = this.params.radius;
      const positions = new Float32Array(N*3); const sizes = new Float32Array(N);
      for (let i=0;i<N;i++){
        const r = Math.pow(Math.random(), 0.5) * R; // denser center
        const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1);
        const x = r*Math.sin(phi)*Math.cos(theta);
        const y = r*Math.cos(phi);
        const z = r*Math.sin(phi)*Math.sin(theta);
        positions[i*3]=x; positions[i*3+1]=y; positions[i*3+2]=z; sizes[i] = 2.0 + Math.random()*3.0;
      }
      g.setAttribute('position', new THREE.BufferAttribute(positions,3));
      g.setAttribute('aSize', new THREE.BufferAttribute(sizes,1));
      this.uniforms = { time:{value:0}, bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0} };
      this.material = new THREE.ShaderMaterial({ vertexShader: vertShader, fragmentShader: fragShader, uniforms:this.uniforms, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true });
      this.points = new THREE.Points(g, this.material);
      this.scene.add(this.points);
      this.camera.position.set(0,0,8);
    }
    update(audio){
      const t = audio.time||0; this.uniforms.time.value=t; this.uniforms.bassLevel.value=audio.bass||0; this.uniforms.midLevel.value=audio.mid||0; this.uniforms.trebleLevel.value=audio.treble||0;
      this.points.rotation.y += 0.002 + (audio.mid||0)*0.01; this.points.rotation.x += 0.001 + (audio.treble||0)*0.008;
    }
    dispose(){ super.dispose(); this.points?.geometry?.dispose?.(); this.material?.dispose?.(); }
    getStats(){ return { particles: this.params.count }; }
  }
  window.GalaxyParticlesVisualization = GalaxyParticlesVisualization;
})();

