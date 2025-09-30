    precision highp float;
    uniform float time; uniform vec2 resolution;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    uniform float uZoom, uSwirl, uWarp, uDetail, uSpeed, uColorShift;

    // Simple hash / value noise
    float hash(vec2 p){ return fract(1e4 * sin(17.0*p.x + 0.1*p.y) * (0.1 + abs(sin(13.0*p.y + p.x)))); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }

    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

    vec3 hsv2rgb(vec3 c){
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy / resolution.xy)*2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;

      float bass = bassLevel; float mid = midLevel; float treb = trebleLevel;

      // Large-scale zoom and drift driven by bass
      float zoom = mix(1.0, uZoom, 0.7) * (1.0 + 0.8*bass);
      vec2 p = uv * zoom;
      vec2 drift = 0.20 * bass * vec2(sin(time*0.60), cos(time*0.50));
      p += drift;

      // Swirl field varying with radius and time; scaled by bass and user
      float swirlAmp = uSwirl * (0.20 + 1.20*bass);
      float ang = length(p)* (1.5 + 1.5*mid) + time * (0.7*uSpeed);
      p = rot(swirlAmp * sin(ang)) * p;

      // Domain warp with value noise; strength modulated by bass and user
      float d1 = 1.5 + uDetail*1.5;
      float d2 = 2.2 + uDetail*2.0;
      vec2 warp = vec2(vnoise(p*d1 + time*0.25), vnoise(p.yx*d2 - time*0.30));
      p += (0.20 + 0.80*bass) * uWarp * (warp - 0.5);

      // Build interference pattern: rings + angular waves
      float r = length(p);
      float a = atan(p.y,p.x);
      float waves = 0.5 + 0.5*sin((3.0 + 2.0*uDetail + 4.0*mid)*a + time*(0.8*uSpeed));
      float rings = sin(8.0*r - time*(1.0 + 1.5*bass));

      // Fine treble-driven details and sparkles
      float hf = sin((30.0 + 120.0*treb)*p.x + time*2.0) * sin((28.0 + 110.0*treb)*p.y - time*1.7);
      float spark = smoothstep(0.95, 1.0, vnoise(p*8.0 + time*1.2) + treb*0.35);

      // Hue shifts with time and mids; add structure from waves/rings
      float hue = fract(0.60 + time*0.05*(1.0 + 0.6*mid) + uColorShift*0.20*mid + 0.20*waves + 0.08*rings);
      float sat = clamp(0.70 + 0.20*mid + 0.10*treb, 0.0, 1.0);
      float val = 0.40 + 0.40*waves + 0.30*bass + 0.15*abs(hf) + 0.20*spark;

      vec3 col = hsv2rgb(vec3(hue, sat, val));

      // Mild tone mapping for safety
      col = col / (1.0 + col);

      gl_FragColor = vec4(col, 1.0);
    }
