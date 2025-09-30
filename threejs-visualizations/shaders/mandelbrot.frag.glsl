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
