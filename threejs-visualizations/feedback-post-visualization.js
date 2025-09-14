(function(){
  // Simple ping-pong feedback full-screen shader visualization
  const quadVS = `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
  const quadFS = `
    precision highp float; uniform float time; uniform vec2 resolution; uniform sampler2D prevTex;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    vec2 kalei(vec2 uv, float seg){
      float a = atan(uv.y, uv.x); float r = length(uv);
      float m = 6.28318/seg; a = mod(a, m); a = abs(a - m*0.5);
      return vec2(cos(a), sin(a)) * r;
    }
    void main(){
      vec2 uv = (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0; uv.x *= resolution.x/resolution.y;
      float seg = 6.0 + floor( midLevel*10.0 );
      vec2 k = kalei(uv, seg);
      float swirl = 0.3 + bassLevel*1.2; float ang = time*0.5*(1.0+midLevel) + length(k)*2.0;
      mat2 rot = mat2(cos(ang),-sin(ang), sin(ang),cos(ang));
      vec2 samp = (rot * k) * (0.98 - bassLevel*0.1) * (1.0 + 0.1*sin(time+length(k)*4.0*trebleLevel));
      vec2 texUV = samp*0.5 + 0.5;
      vec3 prev = texture2D(prevTex, texUV).rgb * 0.985;
      float hue = fract(0.55 + time*0.05 + length(uv)*0.2 + trebleLevel*0.3);
      vec3 rgb = clamp(abs(mod(hue*6.0 + vec3(0,4,2), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      vec3 outc = mix(rgb*0.3, prev, 0.9) + 0.05*rgb;
      gl_FragColor = vec4(outc, 1.0);
    }
  `;
  class FeedbackPostVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = { intensity: 1.0 };
      const d = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.rtA = new THREE.WebGLRenderTarget(d.x, d.y, { depthBuffer:false, stencilBuffer:false });
      this.rtB = new THREE.WebGLRenderTarget(d.x, d.y, { depthBuffer:false, stencilBuffer:false });
      this.quadGeo = new THREE.PlaneBufferGeometry(2,2);
      this.uniforms = { time:{value:0}, resolution:{value:new THREE.Vector2(d.x, d.y)}, prevTex:{value:this.rtB.texture}, bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0} };
      this.quadMat = new THREE.ShaderMaterial({ vertexShader:quadVS, fragmentShader:quadFS, uniforms:this.uniforms, depthTest:false, depthWrite:false });
      this.quad = new THREE.Mesh(this.quadGeo, this.quadMat);
      // A separate scene/camera for full-screen quad
      this.screenScene = new THREE.Scene(); this.screenCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
      this.screenScene.add(this.quad);
    }
    onResize(){ const d=this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.rtA.setSize(d.x,d.y); this.rtB.setSize(d.x,d.y); this.uniforms.resolution.value.set(d.x,d.y); }
    update(audio){
      const t = audio.time||0; this.uniforms.time.value=t; this.uniforms.bassLevel.value=audio.bass||0; this.uniforms.midLevel.value=audio.mid||0; this.uniforms.trebleLevel.value=audio.treble||0;
      // render pass: draw last frame with feedback into rtA, then present to screen
      this.uniforms.prevTex.value = this.rtB.texture;
      this.renderer.setRenderTarget(this.rtA); this.renderer.render(this.screenScene, this.screenCamera);
      this.renderer.setRenderTarget(null); this.renderer.render(this.screenScene, this.screenCamera);
      // ping-pong
      const tmp = this.rtA; this.rtA = this.rtB; this.rtB = tmp;
    }
    dispose(){ super.dispose(); this.rtA?.dispose?.(); this.rtB?.dispose?.(); this.quadGeo?.dispose?.(); this.quadMat?.dispose?.(); }
  }
  window.FeedbackPostVisualization = FeedbackPostVisualization;
})();

