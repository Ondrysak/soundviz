(function(){
  const vert = `
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
  `;
  const frag = `
    precision highp float; varying vec3 vPos; varying vec3 vNormal; varying float vDispl;
    uniform float time; uniform float trebleLevel;
    void main(){
      vec3 n = normalize(vNormal);
      float rim = pow(1.0 - max(dot(n, vec3(0.0,0.0,1.0)), 0.0), 2.0);
      float hue = fract(0.6 + time*0.05 + vDispl*0.8 + trebleLevel*0.4);
      vec3 rgb = clamp(abs(mod(hue*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      vec3 col = mix(vec3(0.1,0.15,0.3), rgb, 0.9) + rim*0.6;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  class VertexDistortionVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { detail: 3 };
      this.geometry = new THREE.SphereBufferGeometry(1.6, 96, 64);
      this.uniforms = { time:{value:0}, bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0} };
      this.material = new THREE.ShaderMaterial({ vertexShader:vert, fragmentShader:frag, uniforms:this.uniforms, flatShading:false });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
      const amb = new THREE.AmbientLight(0x404040, 0.8); const dir = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(5,6,8);
      this.scene.add(amb, dir);
      this.camera.position.set(0,0,5);
    }
    update(audio){
      const t = audio.time||0; this.uniforms.time.value=t; this.uniforms.bassLevel.value=audio.bass||0; this.uniforms.midLevel.value=audio.mid||0; this.uniforms.trebleLevel.value=audio.treble||0;
      this.mesh.rotation.y += 0.01 + (audio.mid||0)*0.03; this.mesh.rotation.x += 0.008 + (audio.treble||0)*0.02;
    }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.VertexDistortionVisualization = VertexDistortionVisualization;
})();

