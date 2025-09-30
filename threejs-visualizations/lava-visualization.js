(function(){

  class LavaVisualization extends ThreeJSVisualization {
    constructor(container) {
      super(container);

      // Control parameters
      this.params = {
        flowSpeed: 1.0,
        flowIntensity: 1.0,
        spaceWarp: 1.0,
        rotationAmount: 1.0,
        jitterAmount: 1.0,
        edgeIntensity: 1.0,
        colorSpeed: 1.0,
        bassReactivity: 1.0,
        midReactivity: 1.0,
        trebleReactivity: 1.0
      };
    }

    async initialize() {
      // Load shaders
      const { vertexShader, fragmentShader } = await window.shaderLoader.loadPair(
        './shaders/basic.vert.glsl',
        './shaders/lava.frag.glsl'
      );

      this.geometry = new THREE.PlaneBufferGeometry(50, 50, 1, 1);
      this.uniforms = {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        bassLevel: { value: 0 },
        midLevel: { value: 0 },
        trebleLevel: { value: 0 },
        uFlowSpeed: { value: this.params.flowSpeed },
        uFlowIntensity: { value: this.params.flowIntensity },
        uSpaceWarp: { value: this.params.spaceWarp },
        uRotation: { value: this.params.rotationAmount },
        uJitter: { value: this.params.jitterAmount },
        uEdgeIntensity: { value: this.params.edgeIntensity },
        uColorSpeed: { value: this.params.colorSpeed }
      };

      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        fragmentShader: fragmentShader,
        vertexShader: vertexShader,
        depthTest: false,
        depthWrite: false
      });

      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      this.camera.position.set(0, 0, 5);
      this.onResize();
    }

    update(audio) {
      const t = audio.time || 0;
      this.uniforms.time.value = t;
      this.uniforms.bassLevel.value = (audio.bass || 0) * this.params.bassReactivity;
      this.uniforms.midLevel.value = (audio.mid || 0) * this.params.midReactivity;
      this.uniforms.trebleLevel.value = (audio.treble || 0) * this.params.trebleReactivity;

      // Update control uniforms
      this.uniforms.uFlowSpeed.value = this.params.flowSpeed;
      this.uniforms.uFlowIntensity.value = this.params.flowIntensity;
      this.uniforms.uSpaceWarp.value = this.params.spaceWarp;
      this.uniforms.uRotation.value = this.params.rotationAmount;
      this.uniforms.uJitter.value = this.params.jitterAmount;
      this.uniforms.uEdgeIntensity.value = this.params.edgeIntensity;
      this.uniforms.uColorSpeed.value = this.params.colorSpeed;
    }

    onResize() {
      if (!this.uniforms) return;
      const d = this.renderer.domElement;
      this.uniforms.resolution.value.set(d.width, d.height);
    }

    dispose() {
      super.dispose();
      this.geometry?.dispose?.();
      this.material?.dispose?.();
    }
  }

  window.LavaVisualization = LavaVisualization;
})();

