(function(){
  // Meta Pipes Lattice (audio-reactive) – heavily remixed from a cylinder-grid idea
  // Different mapping, colors, lighting and structure; uses cell rotation + swirl + banded radius
  const frag = `
    precision highp float;
    uniform float time; uniform vec2 resolution;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;

    // Structure
    uniform float uTile;        // cell size in XZ
    uniform float uPipeR;       // base pipe radius
    uniform float uSwirl;       // swirl strength around Y
    uniform float uSwirlFreq;   // swirl frequency along Y
    uniform float uSwirlSpeed;  // swirl speed over time
    uniform float uBandFreq;    // radius banding along Y
    uniform float uBandStr;     // banding strength

    // Camera
    uniform float uCamRadius;
    uniform float uCamHeight;
    uniform float uFov;

    // Shading & color
    uniform float uAmb;         // ambient
    uniform float uKey;         // key light
    uniform float uBack;        // back light
    uniform float uFog;         // fog factor
    uniform float uHueBase, uHueRange, uSat, uVal;

    // Quality
    uniform float uAA;          // 1 or 2

    // --- Utils ---
    mat2 r2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
    float h12(vec2 v){ return fract(sin(dot(v, vec2(41.31,289.13)))*43758.5453); }

    // periodic cell id and local coords
    vec2 cellId(vec2 x){ return floor(x/uTile + 0.5); }
    vec2 wrap(vec2 x){ return (fract(x/uTile + 0.5)-0.5)*uTile; }

    // distance to twisted pipe pair inside a rotated cell
    float dMeta(vec3 p){
      vec2 id = cellId(p.xz);
      float rnd = h12(id);
      float ang = 6.28318*rnd;

      vec3 q = p; q.xz = wrap(q.xz);
      // slowly rotate each cell by its random angle + time wobble
      q.xz = r2(ang + 0.3*sin(time*0.27 + rnd*5.7))*q.xz;
      // apply swirl around Y to break straightness
      float sA = uSwirl * sin(q.y*uSwirlFreq + time*uSwirlSpeed + rnd*3.1);
      q.xz = r2(sA)*q.xz;

      // banded radius along Y, with random per-cell phase (audio-linked)
      float bandStr = clamp(uBandStr * (0.6 + 1.2*bassLevel + 0.5*midLevel), 0.0, 2.0);
      float bandFreq = uBandFreq * (0.7 + 1.6*trebleLevel + 0.3*midLevel);
      float r = uPipeR * (1.0 + bandStr * sin(q.y*bandFreq + time*(0.7+0.4*bassLevel) + rnd*6.28318));

      // two perpendicular pipes (one rotated 45 degrees)
      float d1 = length(q.xz) - r;
      vec2 q2 = r2(0.785398)*q.xz;
      float d2 = length(q2) - r*0.9;

      // carve subtle helical grooves to mangle silhouette
      float carve = 0.02*sin(4.1*q.y + 1.7*q.x + 2.3*q.z + time*0.8);
      return min(d1, d2) + carve;
    }

    // raymarch
    float march(vec3 ro, vec3 rd){
      float t=0.02; const float MAXD=40.0; 
      for(int i=0;i<180;i++){
        vec3 pos = ro + t*rd;
        float h = dMeta(pos);
        if (h<0.001*t || t>MAXD) break;
        t += clamp(h, 0.01, 0.8);
      }
      return (t>MAXD) ? -1.0 : t;
    }

    vec3 normalAt(vec3 p, float t){
      float e = 0.001*t; vec2 k=vec2(1,-1)*e;
      return normalize( k.xyy*dMeta(p + k.xyy) +
                        k.yyx*dMeta(p + k.yyx) +
                        k.yxy*dMeta(p + k.yxy) +
                        k.xxx*dMeta(p + k.xxx) );
    }

    vec3 hsv2rgb(vec3 c){
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    vec3 shade(vec3 ro, vec3 rd){
      vec3 col = vec3(0.0);
      float t = march(ro, rd);
      if (t>0.0){
        vec3 pos = ro + t*rd;
        vec3 nor = normalAt(pos, t);

        // lights
        vec3 l1 = normalize(vec3( 0.6, 0.7,-0.5));
        vec3 l2 = normalize(vec3(-0.7, 0.0, 0.7));
        float key = max(dot(nor,l1),0.0);
        float back= max(dot(nor,l2),0.0);
        float amb = (0.6 + 0.4*nor.y) * (0.85 + 0.15*midLevel);

        // simple AO from curvature hint
        float ao = clamp(1.0 - 0.8*abs(dMeta(pos+nor*0.03)), 0.0, 1.0);

        vec3 brdf = vec3(uAmb)*amb*ao + vec3(1.0)*key*uKey*ao + vec3(uBack)*back*ao;

        // band color from folded y and distance to center-line
        float band = sin(0.5*pos.y + 4.0*trebleLevel + 0.6*time);
        float hue = fract(uHueBase + uHueRange*(0.5 + 0.5*band) + 0.15*midLevel);
        float val = uVal * exp(-uFog*t) * (0.9 + 0.3*bassLevel);
        vec3 rgb = hsv2rgb(vec3(hue, uSat, val));
        col = rgb * brdf;

        // gentle tone mapping
        col = col / (vec3(1.0) + 0.8*col);
      }
      return sqrt(max(col,0.0));
    }

    void main(){
      vec2 fragCoord = gl_FragCoord.xy;
      float aa = (uAA<1.5) ? 1.0 : 2.0;
      vec3 tot = vec3(0.0);
      for (int j=0;j<2;j++){
        for (int i=0;i<2;i++){
          if (aa<2.0 && (i+j)>0) continue;
          vec2 q = fragCoord + vec2(float(i),float(j))/aa;
          vec2 p = (2.0*q - resolution.xy)/resolution.y;

          // orbit camera
          float t = time*0.23;
          float rad = uCamRadius*(1.0 + 0.06*midLevel);
          vec3 ro = vec3(rad*cos(0.22+0.31*t), uCamHeight + 0.25*cos(0.41*t+0.7*bassLevel), rad*sin(0.17+0.29*t));
          vec3 ta = vec3(0.0, 0.0, 0.0);
          float roll = 0.18*cos(0.2*t) + 0.15*trebleLevel;
          vec3 cw = normalize(ta-ro);
          vec3 cp = vec3(sin(roll), cos(roll), 0.0);
          vec3 cu = normalize(cross(cw,cp));
          vec3 cv = normalize(cross(cu,cw));
          vec3 rd = normalize(p.x*cu + p.y*cv + uFov*cw);

          tot += shade(ro, rd);
        }
      }
      tot /= (aa*aa);
      gl_FragColor = vec4(tot, 1.0);
    }
  `;

  class MetaPipesVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = {
        // Structure
        tile: 2.2,
        pipeR: 0.22,
        swirl: 0.7,
        swirlFreq: 1.6,
        swirlSpeed: 1.0,
        bandFreq: 5.0,
        bandStr: 0.35,
        // Camera
        camRadius: 3.2,
        camHeight: 0.6,
        fov: 2.0,
        // Shading & color
        ambient: 0.45,
        key: 1.0,
        back: 0.35,
        fog: 0.22,
        hueBase: 0.05,
        hueRange: 0.55,
        sat: 0.95,
        val: 1.0,
        // Quality
        aa: 2
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        // structure
        uTile:{value:this.params.tile}, uPipeR:{value:this.params.pipeR},
        uSwirl:{value:this.params.swirl}, uSwirlFreq:{value:this.params.swirlFreq}, uSwirlSpeed:{value:this.params.swirlSpeed},
        uBandFreq:{value:this.params.bandFreq}, uBandStr:{value:this.params.bandStr},
        // camera
        uCamRadius:{value:this.params.camRadius}, uCamHeight:{value:this.params.camHeight}, uFov:{value:this.params.fov},
        // shading & color
        uAmb:{value:this.params.ambient}, uKey:{value:this.params.key}, uBack:{value:this.params.back}, uFog:{value:this.params.fog},
        uHueBase:{value:this.params.hueBase}, uHueRange:{value:this.params.hueRange}, uSat:{value:this.params.sat}, uVal:{value:this.params.val},
        // quality
        uAA:{value:this.params.aa}
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
      const p = this.params;
      this.uniforms.uTile.value = p.tile;
      this.uniforms.uPipeR.value = p.pipeR;
      this.uniforms.uSwirl.value = p.swirl;
      this.uniforms.uSwirlFreq.value = p.swirlFreq;
      this.uniforms.uSwirlSpeed.value = p.swirlSpeed;
      this.uniforms.uBandFreq.value = p.bandFreq;
      this.uniforms.uBandStr.value = p.bandStr;
      this.uniforms.uCamRadius.value = p.camRadius;
      this.uniforms.uCamHeight.value = p.camHeight;
      this.uniforms.uFov.value = p.fov;
      this.uniforms.uAmb.value = p.ambient;
      this.uniforms.uKey.value = p.key;
      this.uniforms.uBack.value = p.back;
      this.uniforms.uFog.value = p.fog;
      this.uniforms.uHueBase.value = p.hueBase;
      this.uniforms.uHueRange.value = p.hueRange;
      this.uniforms.uSat.value = p.sat;
      this.uniforms.uVal.value = p.val;
      this.uniforms.uAA.value = p.aa;
    }
    onResize(){ const d=this.renderer.domElement; if (this.uniforms) this.uniforms.resolution.value.set(d.width,d.height); }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.MetaPipesVisualization = MetaPipesVisualization;
})();

