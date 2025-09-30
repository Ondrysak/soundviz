(function(){
  // Hexagon Cells Shader Visualization (audio-reactive)
  // Adapted from a Shadertoy-style hex tiling pattern into Three.js
  

  class HexagonShaderVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/hexagon.frag.glsl'
    );

      this.params = {
        speed: 1.0,
        scaleA: 8.0,
        scaleB: 6.0,
        distort: 1.2,
        redIntensity: 1.0,
        vignette: 0.10,
        zoomOut: 12.0,
        useTexture: false,
        texMix: 0.4,
        texScale: 1.0
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uSpeed:{value:this.params.speed}, uScaleA:{value:this.params.scaleA}, uScaleB:{value:this.params.scaleB},
        uDistort:{value:this.params.distort}, uRedIntensity:{value:this.params.redIntensity}, uVignette:{value:this.params.vignette},
        uTex:{value:null}, uUseTex:{value:0}, uTexMix:{value:this.params.texMix}, uTexScale:{value:this.params.texScale}
      };
      this.material = new THREE.ShaderMaterial({
        uniforms:this.uniforms,
        fragmentShader: fragShader,
        vertexShader: vertShader,
        depthTest:false, depthWrite:false
      });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      // Texture loader for optional hex textures
      this.textureLoader = new THREE.TextureLoader();

      this.camera.position.set(0,0,this.params.zoomOut);
      this.onResize();
    }
    update(audio){
      const t = audio.time || 0;
      this.uniforms.time.value = t;
      this.uniforms.bassLevel.value = audio.bass || 0;
      this.uniforms.midLevel.value = audio.mid || 0;
      this.uniforms.trebleLevel.value = audio.treble || 0;
      const p = this.params;
      this.uniforms.uSpeed.value = p.speed;
      this.uniforms.uScaleA.value = p.scaleA;
      this.uniforms.uScaleB.value = p.scaleB;
      this.uniforms.uDistort.value = p.distort;
      this.uniforms.uRedIntensity.value = p.redIntensity;
      this.uniforms.uVignette.value = p.vignette;
      // Texture uniforms
      this.uniforms.uTexMix.value = p.texMix;
      this.uniforms.uTexScale.value = p.texScale;
      this.uniforms.uUseTex.value = p.useTexture ? 1.0 : 0.0;
      // Camera zoom
      if (this.camera) this.camera.position.z = p.zoomOut;
    }
    setTextureURL(url){
      if (!this.textureLoader) this.textureLoader = new THREE.TextureLoader();
      this.textureLoader.load(url, tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = (this.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        this._setTexture(tex);
      });
    }

    _setTexture(tex){
      if (this._texture && this._texture !== tex){ try{ this._texture.dispose?.(); }catch(e){} }
      this._texture = tex;
      if (this.uniforms){ this.uniforms.uTex.value = tex; this.uniforms.uUseTex.value = 1.0; }
      if (this.params){ this.params.useTexture = true; }
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
      try{ this._texture?.dispose?.(); }catch(e){}
    }
  }
  window.HexagonShaderVisualization = HexagonShaderVisualization;
})();

