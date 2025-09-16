(function(){
  // Mandelbrot Distance Estimator Visualization (audio-reactive)
  // Adapted for Three.js full-screen shader and audio uniforms.
  // Original algorithm and distance formulation by Inigo Quilez.
  // The user supplied the reference shader text for educational adaptation.
  const frag = `
    precision highp float;
    uniform float time; uniform vec2 resolution;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;

    uniform vec2  uCenter;       // center in complex plane
    uniform float uZoomPow;      // base zoom exponent (default ~13.0)
    uniform float uSpeed;        // animation speed
    uniform float uColorExp;     // color exponent bias
    uniform float uHueShift;     // base hue offset

    // --- Utility ---
    vec3 hsv2rgb(vec3 c){
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    // --- Distance to Mandelbrot set (IQ) ---
    float distanceToMandelbrot(in vec2 c){
      // bulb checks
      float c2 = dot(c, c);
      if (256.0*c2*c2 - 96.0*c2 + 32.0*c.x - 3.0 < 0.0) return 0.0;         // main cardioid
      if (16.0*(c2 + 2.0*c.x + 1.0) - 1.0 < 0.0) return 0.0;               // period-2 bulb

      float di = 1.0;
      vec2 z = vec2(0.0);
      float m2 = 0.0;
      vec2 dz = vec2(0.0);
      for (int i=0; i<300; i++){
        if (m2 > 1024.0){ di = 0.0; break; }
        // Z' -> 2·Z·Z' + 1
        dz = 2.0*vec2(z.x*dz.x - z.y*dz.y, z.x*dz.y + z.y*dz.x) + vec2(1.0, 0.0);
        // Z -> Z² + c
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        m2 = dot(z, z);
      }
      // distance d(c) = |Z| * log|Z| / |Z'|
      float d = 0.5 * sqrt(dot(z,z)/max(1e-12, dot(dz,dz))) * log(dot(z,z));
      if (di > 0.5) d = 0.0;
      return d;
    }

    void main(){
      vec2 fragCoord = gl_FragCoord.xy;
      vec2 p = (2.0*fragCoord - resolution.xy)/resolution.y;

      float bass = bassLevel, mid = midLevel, treb = trebleLevel;

      // Bass-driven zoom animation
      float sp = 0.225 * (0.7 + uSpeed*(0.6 + 0.8*bass));
      float tz = 0.5 - 0.5*cos(sp * time);
      float zoo = pow(0.5, uZoomPow * tz);

      // Center with subtle bass drift and treble micro-jitter for fine detail shimmer
      vec2 center = uCenter
                  + 0.05*bass * vec2(sin(time*0.3), cos(time*0.27))
                  + 0.002*treb * vec2(sin(time*3.1), cos(time*2.7));

      vec2 c = center + p * zoo;

      // Distance to Mandelbrot
      float d = distanceToMandelbrot(c);

      // Audio-reactive coloring
      float expBias = 0.2 + 0.4*uColorExp + 0.3*treb; // treble sharpens detail contrast
      float v = clamp(pow(4.0*d/max(1e-6, zoo), expBias), 0.0, 1.0);

      // Hue scroll with mids, structure from v and light time drift
      float hue = fract(uHueShift + 0.60 + v*0.35 + 0.20*mid + 0.10*sin(time*0.2));
      float sat = clamp(0.70 + 0.20*mid, 0.0, 1.0);
      float val = v + 0.15*smoothstep(0.9, 1.0, v + 0.2*treb);

      vec3 col = hsv2rgb(vec3(hue, sat, val));
      // mild tone mapping
      col = col / (1.0 + col);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  class MandelbrotDEVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = {
        centerX: -0.05,
        centerY:  0.6805,
        zoomPow:  13.0,
        speed:    1.0,
        colorExp: 0.5,
        hueShift: 0.0
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        uCenter:{value:new THREE.Vector2(this.params.centerX, this.params.centerY)},
        uZoomPow:{value:this.params.zoomPow},
        uSpeed:{value:this.params.speed},
        uColorExp:{value:this.params.colorExp},
        uHueShift:{value:this.params.hueShift}
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
      // Sync params -> uniforms
      const p = this.params;
      this.uniforms.uCenter.value.set(p.centerX, p.centerY);
      this.uniforms.uZoomPow.value = p.zoomPow;
      this.uniforms.uSpeed.value = p.speed;
      this.uniforms.uColorExp.value = p.colorExp;
      this.uniforms.uHueShift.value = p.hueShift;
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
  window.MandelbrotDEVisualization = MandelbrotDEVisualization;
})();

