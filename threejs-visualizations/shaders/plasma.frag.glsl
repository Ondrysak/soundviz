    precision highp float; uniform float time; uniform vec2 resolution; uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f); float a=hash(i); float b=hash(i+vec2(1,0)); float c=hash(i+vec2(0,1)); float d=hash(i+vec2(1,1)); return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }
    vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
    void main(){
      vec2 uv = (gl_FragCoord.xy/resolution.xy)*2.0-1.0; uv.x *= resolution.x/resolution.y;
      float t = time; float bass=bassLevel, mid=midLevel, treb=trebleLevel;
      float z = 1.0 + bass*1.5; vec2 p = uv * z;
      float n = 0.0, amp = 0.5 + bass*0.6, freq = 1.5 + mid*3.0;
      for(int i=0;i<5;i++){ n += noise(p*freq + float(i)*1.7 + t*0.4) * amp; amp *= 0.55; freq *= 1.7; }
      float hue = fract(0.5 + t*0.07*(1.0+mid) + n*0.2);
      vec3 col = pal(hue, vec3(0.5), vec3(0.5), vec3(1.0,0.8,0.6), vec3(0.0,0.33,0.67));
      col *= 0.6 + 0.6*n + 0.3*bass + 0.2*treb;
      gl_FragColor = vec4(col, 1.0);
    }
