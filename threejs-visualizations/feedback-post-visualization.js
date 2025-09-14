(function(){
  // Simple ping-pong feedback full-screen shader visualization
  const quadVS = `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
  const quadFS = `
    precision highp float;
    uniform float time; uniform vec2 resolution; uniform sampler2D prevTex;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    uniform float uDecayBase; uniform float uDecayBass;
    uniform float uAddBase;  uniform float uAddTreble;
    uniform float uMulBase;  uniform float uMulMid;
    uniform float uSegBase;  uniform float uSegRange;
    uniform float uSpiralMin; uniform float uSpiralMax;
    uniform float uNoiseBase; uniform float uNoiseTreble;
    uniform float uHueTimeSpeed; uniform float uSatBase; uniform float uSatMid; uniform float uSatTreble; uniform float uGamma;
    uniform float uToneStrength; uniform float uBrightness;
    uniform float uBassFloor; uniform float uMidFloor; uniform float uTrebleFloor;

    // Simple hash/noise for fine distortion
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }

    vec3 hsv2rgb(vec3 c){
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    // Kaleidoscope mapping in polar space with segment mirroring
    vec2 kalei(vec2 uv, float seg){
      float a = atan(uv.y, uv.x); float r = length(uv);
      float m = 6.2831853/seg;
      a = mod(a, m); a = abs(a - m*0.5);
      return vec2(cos(a), sin(a)) * r;
    }

    void main(){
      // Screen to centered NDC with aspect
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 p = uv * 2.0 - 1.0; p.x *= resolution.x / resolution.y;

      // Floors ensure strong effect even at low audio
      float b = max(bassLevel, uBassFloor);
      float m = max(midLevel,  uMidFloor);
      float t = max(trebleLevel, uTrebleFloor);

      float seg = uSegBase + floor(m * uSegRange);
      vec2 k = kalei(p, seg);

      // Spiral/radial warp
      float r = length(k);
      float spiral = mix(uSpiralMin, uSpiralMax, b);
      float ang = time*uHueTimeSpeed + r * spiral;
      mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));

      // Fine detail noise
      float nAmp = uNoiseBase + t * uNoiseTreble;
      vec2 n = vec2(noise(k*6.0 + time*0.6), noise(k.yx*6.0 - time*0.5));

      // Final warped sample position
      vec2 samp = (rot * k) * (0.985 - b*0.10) + n*nAmp;
      vec2 texUV = samp * 0.5 + 0.5;

      // Previous frame sample with decay for trails
      vec3 prev = texture2D(prevTex, clamp(texUV, 0.0, 1.0)).rgb;
      prev *= (uDecayBase - uDecayBass * b);

      // Build color in HSV space
      float sat = clamp(uSatBase + uSatMid*m + uSatTreble*t, 0.0, 1.0);
      float baseHue = fract(0.55 + time*uHueTimeSpeed + r*0.15);
      float hueShift = 0.05 + 0.12*b + 0.18*t;
      vec3 fx = hsv2rgb(vec3(fract(baseHue + hueShift), sat, 1.0));

      // Contrast curve
      fx = pow(fx, vec3(uGamma));

      // Custom blend (reduce additive when already bright)
      float addW = uAddBase + uAddTreble*t;
      float mulW = uMulBase + uMulMid*m;
      float lum = dot(prev, vec3(0.2126, 0.7152, 0.0722));
      float addScale = 1.0 - smoothstep(0.7, 1.6, lum);
      vec3 outc = prev * (1.0 + mulW*(fx - 0.5)) + fx * addW * addScale;

      // Apply brightness and optional tonemapping (Reinhard)
      outc *= uBrightness;
      vec3 tone = outc / (1.0 + outc);
      outc = mix(outc, tone, uToneStrength);

      gl_FragColor = vec4(outc, 1.0);
    }
  `;
  class FeedbackPostVisualization extends ThreeJSVisualization {
    initialize(){
      // Adjustable parameters (tuned to reduce oversaturation by default)
      this.params = {
        decay: 0.975, decayBass: 0.02,
        addBase: 0.03, addTreble: 0.20,
        mulBase: 0.02, mulMid: 0.15,
        segBase: 8.0, segRange: 12.0,
        spiralMin: 0.08, spiralMax: 1.2,
        noiseBase: 0.0015, noiseTreble: 0.010,
        hueTimeSpeed: 0.02,
        satBase: 0.35, satMid: 0.25, satTreble: 0.15,
        gamma: 1.1,
        toneStrength: 0.8, brightness: 0.85,
        bassFloor: 0.12, midFloor: 0.10, trebleFloor: 0.08
      };
      const d = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer:false, stencilBuffer:false };
      this.rtA = new THREE.WebGLRenderTarget(d.x, d.y, opts);
      this.rtB = new THREE.WebGLRenderTarget(d.x, d.y, opts);
      this.rtA.texture.generateMipmaps = false; this.rtB.texture.generateMipmaps = false;
      this.rtA.texture.wrapS = this.rtA.texture.wrapT = THREE.ClampToEdgeWrapping;
      this.rtB.texture.wrapS = this.rtB.texture.wrapT = THREE.ClampToEdgeWrapping;
      this.quadGeo = new THREE.PlaneBufferGeometry(2,2);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(d.x, d.y)}, prevTex:{value:this.rtB.texture},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uDecayBase:{value:this.params.decay}, uDecayBass:{value:this.params.decayBass},
        uAddBase:{value:this.params.addBase}, uAddTreble:{value:this.params.addTreble},
        uMulBase:{value:this.params.mulBase}, uMulMid:{value:this.params.mulMid},
        uSegBase:{value:this.params.segBase}, uSegRange:{value:this.params.segRange},
        uSpiralMin:{value:this.params.spiralMin}, uSpiralMax:{value:this.params.spiralMax},
        uNoiseBase:{value:this.params.noiseBase}, uNoiseTreble:{value:this.params.noiseTreble},
        uHueTimeSpeed:{value:this.params.hueTimeSpeed},
        uSatBase:{value:this.params.satBase}, uSatMid:{value:this.params.satMid}, uSatTreble:{value:this.params.satTreble},
        uGamma:{value:this.params.gamma},
        uToneStrength:{value:this.params.toneStrength}, uBrightness:{value:this.params.brightness},
        uBassFloor:{value:this.params.bassFloor}, uMidFloor:{value:this.params.midFloor}, uTrebleFloor:{value:this.params.trebleFloor}
      };
      // Feedback material (used only for offscreen ping-pong)
      this.feedbackMat = new THREE.ShaderMaterial({ vertexShader:quadVS, fragmentShader:quadFS, uniforms:this.uniforms, depthTest:false, depthWrite:false });
      // Display material (just shows latest rt texture)
      this.displayUniforms = { prevTex:{value:this.rtB.texture}, resolution:{value:new THREE.Vector2(d.x,d.y)} };
      this.displayMat = new THREE.ShaderMaterial({
        vertexShader: 'void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'precision highp float; uniform sampler2D prevTex; uniform vec2 resolution; void main(){ vec2 uv = gl_FragCoord.xy / resolution; gl_FragColor = texture2D(prevTex, uv); }',
        uniforms: this.displayUniforms, depthTest:false, depthWrite:false
      });
      this.quad = new THREE.Mesh(this.quadGeo, this.displayMat);
      // Use an orthographic screen scene as the main scene so base renderer presents it
      this.scene = new THREE.Scene(); this.camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
      this.scene.add(this.quad);
    }
    onResize(){ const d=this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.rtA.setSize(d.x,d.y); this.rtB.setSize(d.x,d.y); this.uniforms.resolution.value.set(d.x,d.y); this.displayUniforms.resolution.value.set(d.x,d.y); }
    update(audio){
      const t = audio.time||0;
      // Smooth the bands to avoid visual pops
      if (!this._smooth){ this._smooth = { b:0.0, m:0.0, t:0.0 }; }
      const lerpA = 0.15; // smoothing factor
      this._smooth.b += ( (audio.bass||0) - this._smooth.b ) * lerpA;
      this._smooth.m += ( (audio.mid||0) - this._smooth.m ) * lerpA;
      this._smooth.t += ( (audio.treble||0) - this._smooth.t ) * lerpA;

      // Update time & bands
      this.uniforms.time.value = t;
      this.uniforms.bassLevel.value = this._smooth.b;
      this.uniforms.midLevel.value  = this._smooth.m;
      this.uniforms.trebleLevel.value = this._smooth.t;

      // Sync uniforms from params (GUI)
      const p = this.params;
      this.uniforms.uDecayBase.value = p.decay; this.uniforms.uDecayBass.value = p.decayBass;
      this.uniforms.uAddBase.value = p.addBase; this.uniforms.uAddTreble.value = p.addTreble;
      this.uniforms.uMulBase.value = p.mulBase; this.uniforms.uMulMid.value = p.mulMid;
      this.uniforms.uSegBase.value = p.segBase; this.uniforms.uSegRange.value = p.segRange;
      this.uniforms.uSpiralMin.value = p.spiralMin; this.uniforms.uSpiralMax.value = p.spiralMax;
      this.uniforms.uNoiseBase.value = p.noiseBase; this.uniforms.uNoiseTreble.value = p.noiseTreble;
      this.uniforms.uHueTimeSpeed.value = p.hueTimeSpeed;
      this.uniforms.uSatBase.value = p.satBase; this.uniforms.uSatMid.value = p.satMid; this.uniforms.uSatTreble.value = p.satTreble;
      this.uniforms.uGamma.value = p.gamma;
      this.uniforms.uToneStrength.value = p.toneStrength; this.uniforms.uBrightness.value = p.brightness;
      this.uniforms.uBassFloor.value = p.bassFloor; this.uniforms.uMidFloor.value = p.midFloor; this.uniforms.uTrebleFloor.value = p.trebleFloor;

      // Offscreen feedback step: sample previous rtB into rtA using feedback shader
      this.uniforms.prevTex.value = this.rtB.texture;
      this.quad.material = this.feedbackMat;
      this.renderer.setRenderTarget(this.rtA);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      // Ping-pong so rtB holds the newest frame
      const tmp = this.rtA; this.rtA = this.rtB; this.rtB = tmp;
      // Final display: set quad to show latest rtB; base class will render the scene
      this.displayUniforms.prevTex.value = this.rtB.texture;
      this.quad.material = this.displayMat;
    }
    dispose(){
      super.dispose();
      this.rtA?.dispose?.(); this.rtB?.dispose?.();
      this.quadGeo?.dispose?.();
      this.feedbackMat?.dispose?.(); this.displayMat?.dispose?.();
    }
  }
  window.FeedbackPostVisualization = FeedbackPostVisualization;
})();

