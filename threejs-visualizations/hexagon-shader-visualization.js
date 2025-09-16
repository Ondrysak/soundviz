(function(){
  // Hexagon Cells Shader Visualization (audio-reactive)
  // Adapted from a Shadertoy-style hex tiling pattern into Three.js
  const frag = `
    precision highp float;
    uniform float time; uniform vec2 resolution;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    uniform float uSpeed; uniform float uScaleA; uniform float uScaleB;
    uniform float uDistort; uniform float uRedIntensity; uniform float uVignette;

    // Hashes and value noise (3D) - textureless
    float hash1(vec2 p){ float n = dot(p, vec2(127.1,311.7)); return fract(sin(n)*43758.5453); }
    float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
    float vnoise3(vec3 x){
      vec3 p = floor(x); vec3 f = fract(x);
      f = f*f*(3.0-2.0*f);
      float n000 = hash3(p + vec3(0.0,0.0,0.0));
      float n100 = hash3(p + vec3(1.0,0.0,0.0));
      float n010 = hash3(p + vec3(0.0,1.0,0.0));
      float n110 = hash3(p + vec3(1.0,1.0,0.0));
      float n001 = hash3(p + vec3(0.0,0.0,1.0));
      float n101 = hash3(p + vec3(1.0,0.0,1.0));
      float n011 = hash3(p + vec3(0.0,1.0,1.0));
      float n111 = hash3(p + vec3(1.0,1.0,1.0));
      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);
      float nxy0 = mix(nx00, nx10, f.y);
      float nxy1 = mix(nx01, nx11, f.y);
      return mix(nxy0, nxy1, f.z);
    }

    // HSV to RGB helper for palette control
    vec3 hsv2rgb(vec3 c){
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }


    // Hexagon tiling helper
    // Returns: vec4(id, distToBorder, distToCenter)
    vec4 hexagon(vec2 p){
      vec2 q = vec2( p.x*2.0*(1.0/sqrt(3.0)), p.y + p.x*(1.0/sqrt(3.0)) );
      vec2 pi = floor(q);
      vec2 pf = fract(q);
      float v = mod(pi.x + pi.y, 3.0);
      float ca = step(1.0, v);
      float cb = step(2.0, v);
      vec2 ma = step(pf.xy, pf.yx);
      float e = dot( ma, 1.0 - pf.yx + ca*(pf.x+pf.y-1.0) + cb*(pf.yx - 2.0*pf.xy) );
      vec2 pp = vec2( q.x + floor(0.5 + p.y/1.5), 4.0*p.y/3.0 )*0.5 + 0.5;
      float f = length( (fract(pp) - 0.5)*vec2(1.0, 0.85) );
      return vec4(pi + ca - cb*ma, e, f);
    }

    void main(){
      vec2 fragCoord = gl_FragCoord.xy;
      vec2 uv = fragCoord / resolution;
      vec2 pos = (-resolution + 2.0*fragCoord)/resolution.y;

      float bass = bassLevel, mid = midLevel, treb = trebleLevel;

      // Distortion with bass influence

      pos *= (uDistort + 0.15*length(pos) + 0.25*bass);

      // Time scaling with bass for macro motion
      float tA = time * (0.5*uSpeed) * (0.8 + 0.8*bass);
      float tB = time * (0.6*uSpeed) * (0.8 + 0.8*bass);

      // Gray layer
      vec4 h = hexagon(uScaleA*pos + 0.5*tA);
      float n = vnoise3(vec3(0.3*h.xy + 0.1*tA, time));
      float baseT = 0.5 + 0.5*hash1(h.xy+1.2);
      vec3 baseA = vec3(0.18, 0.26, 0.35);
      vec3 baseB = vec3(0.60, 0.85, 1.00);
      vec3 col = mix(baseA, baseB, baseT);
      col *= smoothstep(0.10, 0.11, h.z);
      // Corrected center-distance via 60-degree symmetry (take min across 3 orientations)
      mat2 R60  = mat2(0.5, -0.8660254, 0.8660254, 0.5);
      mat2 Rm60 = mat2(0.5,  0.8660254, -0.8660254, 0.5);
      float fW = h.w;
      fW = min(fW, hexagon(uScaleA*(R60*pos)  + 0.5*tA).w);
      fW = min(fW, hexagon(uScaleA*(Rm60*pos) + 0.5*tA).w);

      col *= smoothstep(0.10, 0.11, fW);
      col *= 1.0 + 0.10*sin(40.0*h.z);
      col *= 0.70 + 0.45*h.z*n;

      // Shadow layer (displaced)
      h = hexagon(uScaleB*(pos + 0.1*vec2(-1.3,1.0)) + 0.6*tB);
      float nS = vnoise3(vec3(0.3*h.xy + 0.1*tB, 0.5*time));
      col *= 1.0 - 0.8*smoothstep(0.45, 0.451, nS);

      // Colored layer ("red") with mid driving intensity
      h = hexagon(uScaleB*pos + 0.6*tB);
      n = vnoise3(vec3(0.3*h.xy + 0.1*tB, 0.5*time));
      float tid = hash1(h.xy);
      float hue = fract(0.55 + 0.35*tid + 0.20*sin(0.30*time) + 0.25*mid);
      float sat = clamp(0.55 + 0.35*mid + 0.15*treb, 0.0, 1.0);
      float val = 0.55 + 0.35*n + 0.25*bass;
      vec3 colb = hsv2rgb(vec3(hue, sat, val));
      colb *= smoothstep(0.10, 0.11, h.z);
      colb *= 1.0 + 0.12*sin(40.0*h.z);
      colb *= (0.4 + uRedIntensity*(0.6 + 0.4*mid));

      // Mix colored into gray using noise threshold
      float mask = smoothstep(0.45, 0.451, n);
      col = mix(col, colb, mask);

      // Treble-driven fine flicker
      col *= 1.0 + 0.15*treb;

      // Gentle tone mapping
      col = 2.5*col/(2.0 + col);

      // Vignette
      float vig = pow(16.0*uv.x*(1.0-uv.x)*uv.y*(1.0-uv.y), uVignette);
      col *= clamp(vig, 0.0, 1.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  class HexagonShaderVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = {
        speed: 1.0,
        scaleA: 8.0,
        scaleB: 6.0,
        distort: 1.2,
        redIntensity: 1.0,
        vignette: 0.10
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uSpeed:{value:this.params.speed}, uScaleA:{value:this.params.scaleA}, uScaleB:{value:this.params.scaleB},
        uDistort:{value:this.params.distort}, uRedIntensity:{value:this.params.redIntensity}, uVignette:{value:this.params.vignette}
      };
      this.material = new THREE.ShaderMaterial({
        uniforms:this.uniforms,
        fragmentShader:frag,
        vertexShader:'void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
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
      this.uniforms.uSpeed.value = p.speed;
      this.uniforms.uScaleA.value = p.scaleA;
      this.uniforms.uScaleB.value = p.scaleB;
      this.uniforms.uDistort.value = p.distort;
      this.uniforms.uRedIntensity.value = p.redIntensity;
      this.uniforms.uVignette.value = p.vignette;
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
    }
  }
  window.HexagonShaderVisualization = HexagonShaderVisualization;
})();

