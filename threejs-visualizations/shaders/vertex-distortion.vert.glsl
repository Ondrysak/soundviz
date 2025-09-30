    uniform float time; uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    varying vec3 vPos; varying vec3 vNormal; varying float vDispl;
    float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7, 74.7))) * 43758.5453); }
    float noise(vec3 p){
      vec3 i = floor(p); vec3 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec3(1,0,0));
      float c = hash(i + vec3(0,1,0));
      float d = hash(i + vec3(1,1,0));
      float e = hash(i + vec3(0,0,1));
      float f2= hash(i + vec3(1,0,1));
      float g = hash(i + vec3(0,1,1));
      float h = hash(i + vec3(1,1,1));
      vec3 u = f*f*(3.0-2.0*f);
      float nxy = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      float nzw = mix(mix(e,f2,u.x), mix(g,h,u.x), u.y);
      return mix(nxy, nzw, u.z);
    }
    void main(){
      float t = time;
      vec3 p = position;
      float amp = 0.2 + bassLevel*0.8 + trebleLevel*0.5;
      float freq = 1.5 + midLevel*4.0;
      float d = noise(normalize(position)*freq + vec3(t*0.5, t*0.3, t*0.2));
      d += 0.5 * noise(normalize(position)*freq*2.0 - vec3(t*0.7, t*0.4, t*0.6));
      d = (d-0.5) * 2.0 * amp;
      vDispl = d;
      vec3 displaced = p + normal * d;
      vPos = displaced; vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
