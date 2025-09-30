    precision highp float;
    uniform float time; 
    uniform vec2 resolution; 
    uniform float bassLevel; 
    uniform float midLevel; 
    uniform float trebleLevel;

    // Hash/Noise
    float hash(vec2 p){return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);} 
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;

      float t = time;
      float bass = bassLevel; 
      float mid = midLevel; 
      float treb = trebleLevel;

      // Kaleidoscope effect
      float angle = atan(uv.y, uv.x);
      float radius = length(uv);
      float seg = 6.0 + floor(mid * 10.0);
      float a = mod(angle, 6.28318/seg);
      a = abs(a - 3.14159/seg);
      vec2 kUV = vec2(cos(a), sin(a)) * radius;

      // Tunnel distortion & waves
      float speed = 0.6 + mid * 2.0;
      float warp = sin(radius*8.0 - t*3.0*(1.0 + bass*1.5)) * (0.1 + bass*0.5);
      kUV += warp * kUV;

      // Color from polar coords and noise sparkles
      float hue = fract(0.6 + t*0.05*(1.0 + mid) + radius*0.3 + a*0.2);
      float n = noise(kUV*8.0 + t*0.5);
      float sparkle = smoothstep(0.95, 1.0, n + treb*0.3);

      // HSV to RGB
      float s = 0.8;
      float v = 0.4 + 0.6*smoothstep(0.0, 1.0, 1.0 - radius) + bass*0.4;
      vec3 rgb = clamp(abs(mod(hue*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      rgb = v * mix(vec3(1.0), rgb, s) + sparkle * vec3(1.0);

      gl_FragColor = vec4(rgb, 1.0);
    }
