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
    // New controls
    uniform float uPatternMode; // 0=kalei,1=gridMirror,2=voronoi,3=hex,4=tri,5=spiralGrid,6=concentric
    uniform float uGridScale;
    uniform float uPatternRotate; uniform vec2 uPatternOffset; uniform float uPatternMorph;
    uniform float uPaletteMode; // 0=continuous,1=quantized,2=triadic,3=complementary,4=analogous,5=splitComp,6=tetradic,7=monochrome
    uniform float uHueSteps; uniform float uPaletteIntensity; uniform float uColorTemp;
    uniform float uEdgeStrength; uniform float uSharpen; uniform float uContrast;
    uniform float uVoronoiStrength; uniform float uRectWaveAmp; uniform float uRectWaveFreq; uniform float uZigzagAmp; uniform float uNoiseWarpStrength;

    // Hash/noise
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

    // Kaleidoscope mapping
    vec2 kalei(vec2 uv, float seg){
      float a = atan(uv.y, uv.x); float r = length(uv);
      float m = 6.2831853/seg;
      a = mod(a, m); a = abs(a - m*0.5);
      return vec2(cos(a), sin(a)) * r;
    }
    // Rect grid mirror mapping
    vec2 gridMirror(vec2 p, float scale){
      vec2 tp = p * scale;
      vec2 f = fract(tp) - 0.5;
      f = abs(f);
      return (f * 2.0 - 1.0) / scale;
    }
    // Triangle mirror using skewed lattice
    vec2 triMirror(vec2 p, float scale){
      mat2 B = mat2(1.0, 0.0, 0.5, 0.8660254);
      vec2 tp = (B * p) * scale;
      vec2 f = fract(tp) - 0.5; f = abs(f);
      vec2 rp = (f * 2.0 - 1.0) / scale;
      mat2 invB = mat2(1.0, 0.0, -0.5773503, 1.1547005);
      return invB * rp;
    }
    // Hex mirror via skewed lattice
    vec2 hexMirror(vec2 p, float scale){
      mat2 B = mat2(1.0, 0.0, 0.5, 0.8660254);
      vec2 tp = (B * p) * scale;
      vec2 f = fract(tp) - 0.5; f = abs(f);
      vec2 rp = (f * 2.0 - 1.0) / scale;
      mat2 invB = mat2(1.0, 0.0, -0.5773503, 1.1547005);
      return invB * rp;
    }
    // Spiral grid arms
    vec2 spiralGrid(vec2 p, float arms, float amt){
      float r = length(p); float a = atan(p.y,p.x);
      float m = 6.2831853/arms; a = floor(a/m + 0.5)*m + sin(r*4.0)*0.2*amt;
      return vec2(cos(a), sin(a)) * r;
    }
    // Concentric rings mapping
    vec2 concentric(vec2 p, float bands){
      float r = length(p); float a = atan(p.y,p.x);
      float stepR = 1.0/max(1.0,bands);
      r = floor(r/stepR + 0.5)*stepR;
      return vec2(cos(a), sin(a)) * r;
    }
    // Simple Voronoi-like offset (few samples)
    vec2 voronoiOffset(vec2 p){
      vec2 g = floor(p), f = fract(p); float md = 1.0; vec2 mv = vec2(0.0);
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
        vec2 o = vec2(float(i),float(j));
        vec2 h = vec2(hash(g+o), hash(g+o+1.23));
        vec2 r = o + h - f;
        float d = dot(r,r);
        if (d < md){ md = d; mv = r; }
      }
      return mv;
    }

    vec3 samplePrev(vec2 uv){ return texture2D(prevTex, clamp(uv, 0.0, 1.0)).rgb; }

    void main(){
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 p = uv * 2.0 - 1.0; p.x *= resolution.x / resolution.y;

      // Floors ensure strong effect even at low audio
      float b = max(bassLevel, uBassFloor);
      float m = max(midLevel,  uMidFloor);
      float t = max(trebleLevel, uTrebleFloor);

      // Pattern selection
      float seg = uSegBase + floor(m * uSegRange);
      vec2 q; float pr = uPatternRotate; mat2 R = mat2(cos(pr),-sin(pr),sin(pr),cos(pr));
      vec2 pp = R * (p + uPatternOffset);
      if (uPatternMode < 0.5){
        q = kalei(pp, seg);
      } else if (uPatternMode < 1.5){
        q = gridMirror(pp, max(uGridScale, 0.001));
      } else if (uPatternMode < 2.5){
        q = pp + voronoiOffset(pp*2.0) * 0.3;
      } else if (uPatternMode < 3.5){
        q = hexMirror(pp, max(uGridScale, 0.001));
      } else if (uPatternMode < 4.5){
        q = triMirror(pp, max(uGridScale, 0.001));
      } else if (uPatternMode < 5.5){
        q = spiralGrid(pp, max(1.0, seg), m);
      } else {
        q = concentric(pp, max(1.0, seg));
      }

      // Spiral/radial warp + non-radial distortions
      float r = length(q);
      float spiral = mix(uSpiralMin, uSpiralMax, b);
      float ang = time*uHueTimeSpeed + r * spiral;
      mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));

      // Rectangular wave / zigzag
      vec2 rw = vec2(sign(sin(q.x*uRectWaveFreq + time))*uRectWaveAmp,
                     sign(sin(q.y*uRectWaveFreq + time*1.1))*uRectWaveAmp);
      vec2 zz = vec2(sin(q.y*50.0 + time)*uZigzagAmp, sin(q.x*50.0 - time)*uZigzagAmp);

      // Fine detail noise
      float nAmp = uNoiseBase + t * uNoiseTreble + uNoiseWarpStrength;
      vec2 n = vec2(noise(q*6.0 + time*0.6), noise(q.yx*6.0 - time*0.5));

      vec2 samp = (rot * q) * (0.985 - b*0.10) + n*nAmp + rw + zz + uVoronoiStrength*voronoiOffset(q*2.5);
      vec2 texUV = samp * 0.5 + 0.5;

      // Previous frame and sharpen/edge
      vec2 px = 1.0 / resolution;
      vec3 c  = samplePrev(texUV);
      vec3 cx = samplePrev(texUV + vec2(px.x,0.0));
      vec3 cy = samplePrev(texUV + vec2(0.0,px.y));
      vec3 cxy= samplePrev(texUV + vec2(px.x,px.y));
      vec3 cxm= samplePrev(texUV - vec2(px.x,0.0));
      vec3 cym= samplePrev(texUV - vec2(0.0,px.y));
      float lx = dot(cx - cxm, vec3(0.299,0.587,0.114));
      float ly = dot(cy - cym, vec3(0.299,0.587,0.114));
      float edge = clamp(length(vec2(lx,ly))*2.0, 0.0, 1.0);
      vec3 blur = (c + cx + cy + cxy + cxm + cym) / 6.0;
      vec3 sharpPrev = mix(c, c + (c - blur), uSharpen);

      // Decay
      sharpPrev *= (uDecayBase - uDecayBass * b);

      // Color mapping with palette strategies
      float sat = clamp(uSatBase + uSatMid*m + uSatTreble*t, 0.0, 1.0) * uPaletteIntensity;
      float baseHue = fract(0.55 + time*uHueTimeSpeed + r*0.15);
      float hueShift = 0.05 + 0.12*b + 0.18*t;
      float hue = fract(baseHue + hueShift + uColorTemp*(b - t)*0.25);
      if (uPaletteMode > 0.5 && uPaletteMode < 1.5){
        float steps = max(1.0, uHueSteps);
        hue = floor(hue*steps)/steps;
      } else if (uPaletteMode < 2.5 && uPaletteMode >= 1.5){
        // triadic
        float h1 = hue;
        float h2 = fract(hue + 1.0/3.0);
        float h3 = fract(hue + 2.0/3.0);
        float sel = step(0.33, fract(sin(dot(q,vec2(12.3,7.9))*437.0)));
        hue = mix(h1, mix(h2,h3, step(0.66, fract(sin(dot(q,vec2(9.7,5.1))*311.0)))), sel);
      } else if (uPaletteMode < 3.5 && uPaletteMode >= 2.5){
        // complementary split
        hue = mix(hue, fract(hue + 0.5), step(0.0, q.x) * (0.4+0.4*t));
      } else if (uPaletteMode < 4.5){
        // analogous: +/- small shifts
        hue += (step(0.5, fract(sin(dot(q,vec2(21.7,17.3))*113.0)))>0.5 ? 0.08 : -0.08);
      } else if (uPaletteMode < 5.5){
        // split-complementary
        float s1 = fract(hue + 0.5 - 1.0/6.0);
        float s2 = fract(hue + 0.5 + 1.0/6.0);
        hue = mix(s1, s2, step(0.5, fract(sin(dot(q,vec2(3.3,9.1))*97.0))));
      } else if (uPaletteMode < 6.5){
        // tetradic
        float h4 = fract(hue + 0.25*float(int(mod(floor(dot(q,vec2(5.7,8.3))*10.0),4.0))));
        hue = h4;
      } else if (uPaletteMode >= 6.5){
        // monochrome: reduce saturation, vary value via bands
        sat *= 0.35;
      }
      vec3 fx = hsv2rgb(vec3(fract(hue), sat, 1.0));

      // Contrast curve
      fx = pow(fx, vec3(uGamma));

      // Blend and edge highlight
      float addW = uAddBase + uAddTreble*t;
      float mulW = uMulBase + uMulMid*m;
      float lum = dot(sharpPrev, vec3(0.2126, 0.7152, 0.0722));
      float addScale = 1.0 - smoothstep(0.7, 1.6, lum);
      vec3 outc = sharpPrev * (1.0 + mulW*(fx - 0.5)) + fx * addW * addScale;

      // Extra contrast control
      outc = (outc - 0.5) * (1.0 + uContrast) + 0.5;

      // Edge outline (towards white for clarity)
      outc = mix(outc, clamp(outc + edge*vec3(1.0), 0.0, 1.0), uEdgeStrength);

      // Brightness/tone map
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
        bassFloor: 0.12, midFloor: 0.10, trebleFloor: 0.08,
        patternMode: 1.0, gridScale: 6.0, patternRotate: 0.0,
        patternOffsetX: 0.0, patternOffsetY: 0.0, patternMorph: 0.0,
        paletteMode: 1.0, hueSteps: 8.0, paletteIntensity: 1.0, colorTemp: 0.0,
        edgeStrength: 0.3, sharpen: 0.3, contrast: 0.2,
        voronoiStrength: 0.08, rectWaveAmp: 0.01, rectWaveFreq: 8.0, zigzagAmp: 0.004, noiseWarpStrength: 0.003
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
        uBassFloor:{value:this.params.bassFloor}, uMidFloor:{value:this.params.midFloor}, uTrebleFloor:{value:this.params.trebleFloor},
        uPatternMode:{value:this.params.patternMode}, uGridScale:{value:this.params.gridScale},
        uPatternRotate:{value:this.params.patternRotate}, uPatternOffset:{value:new THREE.Vector2(this.params.patternOffsetX,this.params.patternOffsetY)}, uPatternMorph:{value:this.params.patternMorph},
        uPaletteMode:{value:this.params.paletteMode}, uHueSteps:{value:this.params.hueSteps}, uPaletteIntensity:{value:this.params.paletteIntensity}, uColorTemp:{value:this.params.colorTemp},
        uEdgeStrength:{value:this.params.edgeStrength}, uSharpen:{value:this.params.sharpen}, uContrast:{value:this.params.contrast},
        uVoronoiStrength:{value:this.params.voronoiStrength}, uRectWaveAmp:{value:this.params.rectWaveAmp}, uRectWaveFreq:{value:this.params.rectWaveFreq}, uZigzagAmp:{value:this.params.zigzagAmp}, uNoiseWarpStrength:{value:this.params.noiseWarpStrength}
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
      this.uniforms.uPatternMode.value = p.patternMode; this.uniforms.uGridScale.value = p.gridScale;
      this.uniforms.uPatternRotate.value = p.patternRotate; this.uniforms.uPatternOffset.value.set(p.patternOffsetX, p.patternOffsetY); this.uniforms.uPatternMorph.value = p.patternMorph;
      this.uniforms.uPaletteMode.value = p.paletteMode; this.uniforms.uHueSteps.value = p.hueSteps; this.uniforms.uPaletteIntensity.value = p.paletteIntensity; this.uniforms.uColorTemp.value = p.colorTemp;
      this.uniforms.uEdgeStrength.value = p.edgeStrength; this.uniforms.uSharpen.value = p.sharpen; this.uniforms.uContrast.value = p.contrast;
      this.uniforms.uVoronoiStrength.value = p.voronoiStrength; this.uniforms.uRectWaveAmp.value = p.rectWaveAmp; this.uniforms.uRectWaveFreq.value = p.rectWaveFreq; this.uniforms.uZigzagAmp.value = p.zigzagAmp; this.uniforms.uNoiseWarpStrength.value = p.noiseWarpStrength;

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

