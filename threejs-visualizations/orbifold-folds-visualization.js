(function(){
  // Orbifold Folds (audio-reactive 3D fractal) – inspired by IFS/inversion fold scene
  // Mangled from a reference fold+inversion shader: different warp, palette and distance
  

  class OrbifoldFoldsVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/orbifold.frag.glsl'
    );

      this.params = {
        // Structure
        scale: 1.2,
        warp: 0.8,
        rot: 1.0,
        warpFreq: 3.3,
        warpSpeed: 1.0,
        axisMix: 0.65,
        distCoeff: 0.22,
        // Antialias
        aa: 2,
        // Color
        hueBase: 0.62,
        hueRange: 0.45,
        hueSpeed: 0.6,
        sat: 0.9,
        val: 1.0,
        // Lighting & fog
        ambient: 0.45,
        key: 1.0,
        back: 0.35,
        aoExp: 1.2,
        fog: 0.22,
        // Camera
        camRadius: 2.8,
        camHeight: 0.5,
        fov: 2.0
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        // structure / fold
        uScale:{value:this.params.scale}, uWarp:{value:this.params.warp}, uRot:{value:this.params.rot},
        uWarpFreq:{value:this.params.warpFreq}, uWarpSpeed:{value:this.params.warpSpeed},
        uAxisMix:{value:this.params.axisMix}, uDistCoeff:{value:this.params.distCoeff},
        // camera / projection
        uCamRadius:{value:this.params.camRadius}, uCamHeight:{value:this.params.camHeight}, uFov:{value:this.params.fov},
        // AA
        uAA:{value:this.params.aa},
        // color
        uHueBase:{value:this.params.hueBase}, uHueRange:{value:this.params.hueRange}, uHueSpeed:{value:this.params.hueSpeed},
        uSat:{value:this.params.sat}, uVal:{value:this.params.val},
        // lighting & fog
        uAmb:{value:this.params.ambient}, uKey:{value:this.params.key}, uBack:{value:this.params.back},
        uAOExp:{value:this.params.aoExp}, uFog:{value:this.params.fog}
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
      const p = this.params;
      // structure
      this.uniforms.uScale.value = p.scale;
      this.uniforms.uWarp.value = p.warp;
      this.uniforms.uRot.value = p.rot;
      this.uniforms.uWarpFreq.value = p.warpFreq;
      this.uniforms.uWarpSpeed.value = p.warpSpeed;
      this.uniforms.uAxisMix.value = p.axisMix;
      this.uniforms.uDistCoeff.value = p.distCoeff;
      // camera
      this.uniforms.uCamRadius.value = p.camRadius;
      this.uniforms.uCamHeight.value = p.camHeight;
      this.uniforms.uFov.value = p.fov;
      // AA
      this.uniforms.uAA.value = p.aa;
      // color
      this.uniforms.uHueBase.value = p.hueBase;
      this.uniforms.uHueRange.value = p.hueRange;
      this.uniforms.uHueSpeed.value = p.hueSpeed;
      this.uniforms.uSat.value = p.sat;
      this.uniforms.uVal.value = p.val;
      // lighting & fog
      this.uniforms.uAmb.value = p.ambient;
      this.uniforms.uKey.value = p.key;
      this.uniforms.uBack.value = p.back;
      this.uniforms.uAOExp.value = p.aoExp;
      this.uniforms.uFog.value = p.fog;
    }
    onResize(){ const d=this.renderer.domElement; if (this.uniforms) this.uniforms.resolution.value.set(d.width,d.height); }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.OrbifoldFoldsVisualization = OrbifoldFoldsVisualization;
})();

