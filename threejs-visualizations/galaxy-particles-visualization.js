(function(){
  const vert = `
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
  `;
  const frag = `
    precision highp float; varying float vNoise; varying vec3 vPos;
    uniform float time; uniform float trebleLevel;
    void main(){
      vec2 uv = gl_PointCoord*2.0 - 1.0; float r = dot(uv,uv); if (r>1.0) discard;
      float falloff = smoothstep(1.0, 0.0, r);
      float hue = fract(0.6 + time*0.06 + vNoise*0.5 + trebleLevel*0.3);
      vec3 rgb = clamp(abs(mod(hue*6.0 + vec3(0,4,2), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      gl_FragColor = vec4(rgb * falloff, falloff);
    }
  `;

  class GalaxyParticlesVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { count: 8000, radius: 4.0 };
      const g = new THREE.BufferGeometry();
      const N = this.params.count; const R = this.params.radius;
      const positions = new Float32Array(N*3); const sizes = new Float32Array(N);
      for (let i=0;i<N;i++){
        const r = Math.pow(Math.random(), 0.5) * R; // denser center
        const theta = Math.random()*Math.PI*2; const phi = Math.acos(2*Math.random()-1);
        const x = r*Math.sin(phi)*Math.cos(theta);
        const y = r*Math.cos(phi);
        const z = r*Math.sin(phi)*Math.sin(theta);
        positions[i*3]=x; positions[i*3+1]=y; positions[i*3+2]=z; sizes[i] = 2.0 + Math.random()*3.0;
      }
      g.setAttribute('position', new THREE.BufferAttribute(positions,3));
      g.setAttribute('aSize', new THREE.BufferAttribute(sizes,1));
      this.uniforms = { time:{value:0}, bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0} };
      this.material = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag, uniforms:this.uniforms, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true });
      this.points = new THREE.Points(g, this.material);
      this.scene.add(this.points);
      this.camera.position.set(0,0,8);
    }
    update(audio){
      const t = audio.time||0; this.uniforms.time.value=t; this.uniforms.bassLevel.value=audio.bass||0; this.uniforms.midLevel.value=audio.mid||0; this.uniforms.trebleLevel.value=audio.treble||0;
      this.points.rotation.y += 0.002 + (audio.mid||0)*0.01; this.points.rotation.x += 0.001 + (audio.treble||0)*0.008;
    }
    dispose(){ super.dispose(); this.points?.geometry?.dispose?.(); this.material?.dispose?.(); }
    getStats(){ return { particles: this.params.count }; }
  }
  window.GalaxyParticlesVisualization = GalaxyParticlesVisualization;
})();

