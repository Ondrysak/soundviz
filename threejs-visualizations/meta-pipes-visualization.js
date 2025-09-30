(function(){
  // Meta Pipes Lattice (audio-reactive) – heavily remixed from a cylinder-grid idea
  // Different mapping, colors, lighting and structure; uses cell rotation + swirl + banded radius
  

  class MetaPipesVisualization extends ThreeJSVisualization {
    async initialize() {
    // Load shaders
    const { vertexShader: vertShader, fragmentShader: fragShader } = await window.shaderLoader.loadPair(
      './shaders/basic.vert.glsl',
      './shaders/meta-pipes.frag.glsl'
    );

      this.params = {
        // Structure
        tile: 2.2,
        pipeR: 0.22,
        swirl: 0.7,
        swirlFreq: 1.6,
        swirlSpeed: 1.0,
        bandFreq: 5.0,
        bandStr: 0.35,
        // Camera
        camRadius: 3.2,
        camHeight: 0.6,
        fov: 2.0,
        // Shading & color
        ambient: 0.45,
        key: 1.0,
        back: 0.35,
        fog: 0.22,
        hueBase: 0.05,
        hueRange: 0.55,
        sat: 0.95,
        val: 1.0,
        // Quality
        aa: 2
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        // structure
        uTile:{value:this.params.tile}, uPipeR:{value:this.params.pipeR},
        uSwirl:{value:this.params.swirl}, uSwirlFreq:{value:this.params.swirlFreq}, uSwirlSpeed:{value:this.params.swirlSpeed},
        uBandFreq:{value:this.params.bandFreq}, uBandStr:{value:this.params.bandStr},
        // camera
        uCamRadius:{value:this.params.camRadius}, uCamHeight:{value:this.params.camHeight}, uFov:{value:this.params.fov},
        // shading & color
        uAmb:{value:this.params.ambient}, uKey:{value:this.params.key}, uBack:{value:this.params.back}, uFog:{value:this.params.fog},
        uHueBase:{value:this.params.hueBase}, uHueRange:{value:this.params.hueRange}, uSat:{value:this.params.sat}, uVal:{value:this.params.val},
        // quality
        uAA:{value:this.params.aa}
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
      this.uniforms.uTile.value = p.tile;
      this.uniforms.uPipeR.value = p.pipeR;
      this.uniforms.uSwirl.value = p.swirl;
      this.uniforms.uSwirlFreq.value = p.swirlFreq;
      this.uniforms.uSwirlSpeed.value = p.swirlSpeed;
      this.uniforms.uBandFreq.value = p.bandFreq;
      this.uniforms.uBandStr.value = p.bandStr;
      this.uniforms.uCamRadius.value = p.camRadius;
      this.uniforms.uCamHeight.value = p.camHeight;
      this.uniforms.uFov.value = p.fov;
      this.uniforms.uAmb.value = p.ambient;
      this.uniforms.uKey.value = p.key;
      this.uniforms.uBack.value = p.back;
      this.uniforms.uFog.value = p.fog;
      this.uniforms.uHueBase.value = p.hueBase;
      this.uniforms.uHueRange.value = p.hueRange;
      this.uniforms.uSat.value = p.sat;
      this.uniforms.uVal.value = p.val;
      this.uniforms.uAA.value = p.aa;
    }
    onResize(){ const d=this.renderer.domElement; if (this.uniforms) this.uniforms.resolution.value.set(d.width,d.height); }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.MetaPipesVisualization = MetaPipesVisualization;
})();

