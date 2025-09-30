    attribute float aSize; varying float vNoise; varying vec3 vPos;
    uniform float time; uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
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
      vPos = position;
      float t = time;
      float displ = noise(normalize(position)* (1.0 + midLevel*5.0) + vec3(t*0.2)) * (0.6 + bassLevel*1.5);
      vec3 p = position + normalize(position) * displ;
      vNoise = displ;
      vec4 mv = modelViewMatrix * vec4(p,1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * (1.0 + bassLevel*1.5) * (300.0 / -mv.z);
    }
