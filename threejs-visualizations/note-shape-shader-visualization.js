(function(){
  

  class NoteShapeShaderVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/note-shape.frag.glsl'
    );

      this.params = { twist: 0.6, zoom: 1.0, lineThickness: 3.0, lineCount: 6, lineSpacing: 8.0,
        spacingMode: 'Linear', exponentialBase: 1.6, sinusoidFreq: 1.0, sinusoidAmp: 0.6, logBase: 3.0,
        lineBrightness: 1.0, lineSoftness: 1.0, lineOffset: 0.0, lineSide: 'Both', lineJitterAmp: 0.0, lineJitterSpeed: 0.8 };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uLineThickness:{value:this.params.lineThickness},
        uLineCount:{value:this.params.lineCount}, uLineSpacing:{value:this.params.lineSpacing},
        uSpacingMode:{value:0.0}, uExpBase:{value:this.params.exponentialBase},
        uSinFreq:{value:this.params.sinusoidFreq}, uSinAmp:{value:this.params.sinusoidAmp},
        uLogBase:{value:this.params.logBase},
        uLineOffset:{value:this.params.lineOffset}, uLineJitterAmp:{value:this.params.lineJitterAmp},
        uLineJitterSpeed:{value:this.params.lineJitterSpeed}, uLineSoftness:{value:this.params.lineSoftness},
        uLineBrightness:{value:this.params.lineBrightness}, uLineSide:{value:0.0}
      };
      this.material = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        fragmentShader: fragShader,
        vertexShader: vertShader,
        depthTest: false, depthWrite: false
      });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      this.camera.position.set(0,0,5);
      this.onResize();
    }
    update(audio){
      this.uniforms.time.value = audio.time || 0;
      this.uniforms.bassLevel.value = audio.bass || 0;
      this.uniforms.midLevel.value = audio.mid || 0;
      this.uniforms.trebleLevel.value = audio.treble || 0;
      this.uniforms.uLineThickness.value = this.params.lineThickness;
      this.uniforms.uLineCount.value = this.params.lineCount;
      this.uniforms.uLineSpacing.value = this.params.lineSpacing;
      // Map spacing mode string to numeric enum for shader
      var sm = this.params.spacingMode;
      var mode = 0.0;
      if (sm === 'Linear') mode = 0.0;
      else if (sm === 'Exponential') mode = 1.0;
      else if (sm === 'Sinusoidal') mode = 2.0;
      else if (sm === 'Logarithmic') mode = 3.0;
      this.uniforms.uSpacingMode.value = mode;
      this.uniforms.uExpBase.value = this.params.exponentialBase;
      this.uniforms.uSinFreq.value = this.params.sinusoidFreq;
      this.uniforms.uSinAmp.value = this.params.sinusoidAmp;
      this.uniforms.uLogBase.value = this.params.logBase;
      this.uniforms.uLineOffset.value = this.params.lineOffset;
      this.uniforms.uLineJitterAmp.value = this.params.lineJitterAmp;
      this.uniforms.uLineJitterSpeed.value = this.params.lineJitterSpeed;
      this.uniforms.uLineSoftness.value = this.params.lineSoftness;
      this.uniforms.uLineBrightness.value = this.params.lineBrightness;
      // Line side mapping
      var ls = this.params.lineSide;
      var side = 0.0;
      if (ls === 'Inside') side = 1.0; else if (ls === 'Outside') side = 2.0; else side = 0.0;
      this.uniforms.uLineSide.value = side;
    }
    onResize(){ const d=this.renderer.domElement; if (this.uniforms) this.uniforms.resolution.value.set(d.width,d.height); }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.NoteShapeShaderVisualization = NoteShapeShaderVisualization;
})();

