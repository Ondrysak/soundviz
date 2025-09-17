(function(){
  // Orbifold Folds (audio-reactive 3D fractal) – inspired by IFS/inversion fold scene
  // Mangled from a reference fold+inversion shader: different warp, palette and distance
  const frag = `
    precision highp float;
    uniform float time; uniform vec2 resolution;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;

    uniform float uScale;         // base scale parameter (anim multiplier)
    uniform float uWarp;          // sine warp strength
    uniform float uRot;           // per-iteration rotation factor
    uniform float uAA;            // antialias samples per axis (1 or 2)

    uniform float uHueBase;       // base hue [0..1]
    uniform float uHueRange;      // hue range [0..1]
    uniform float uSat;           // saturation [0..1]
    uniform float uVal;           // value [0..2]

    // Structure & warp controls
    uniform float uWarpFreq;       // sine warp frequency
    uniform float uWarpSpeed;      // sine warp time speed
    uniform float uAxisMix;        // 0: |y|, 1: length(xz)
    uniform float uDistCoeff;      // distance scaling

    // Camera and projection
    uniform float uCamRadius;      // base orbit radius
    uniform float uCamHeight;      // base camera height
    uniform float uFov;            // ray focal length (2.0 = default)

    // Lighting & shading
    uniform float uKey;            // key light strength
    uniform float uBack;           // back light strength
    uniform float uAmb;            // ambient strength
    uniform float uAOExp;          // AO exponent
    uniform float uFog;            // distance attenuation

    // Color dynamics
    uniform float uHueSpeed;       // hue scroll speed


    vec4 orb;

    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

    vec3 hsv2rgb(vec3 c){
      vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
      rgb = rgb*rgb*(3.0-2.0*rgb);
      return c.z * mix(vec3(1.0), rgb, c.y);
    }

    // Box fold + inversion with rotation and sine warp per iteration
    float map(vec3 p, float s){
      float scale = 1.0;
      orb = vec4(1000.0);
      for (int i=0;i<8;i++){
        // box fold
        p = -1.0 + 2.0*fract(0.5*p+0.5);
        // per-iter rotation in XZ and YZ planes, time-morphed
        float a = uRot*float(i) + 0.25*time;
        p.xz = rot(a)*p.xz;
        p.yz = rot(a*0.7)*p.yz;
        // sine warp for organic motion
        p += uWarp * 0.08 * sin(p.zxy*uWarpFreq + time*uWarpSpeed*vec3(0.8,1.1,1.7));

        float r2 = dot(p,p);
        orb = min(orb, vec4(abs(p), r2));
        float k = s/r2; // inversion
        p     *= k;
        scale *= k;
      }
      // distance flavor blend between |y| (pillars) and radial xz (rings)
      float baseD = mix(abs(p.y), length(p.xz), uAxisMix);
      return uDistCoeff * baseD / scale;
    }

    float trace(vec3 ro, vec3 rd, float s){
      float maxd = 30.0;
      float t = 0.01;
      for (int i=0;i<256;i++){
        float precis = 0.001 * t;
        float h = map(ro+rd*t, s);
        if (h<precis || t>maxd) break;
        t += h;
      }
      if (t>maxd) t=-1.0;
      return t;
    }

    vec3 calcNormal(vec3 pos, float t, float s){
      float precis = 0.001 * t;
      vec2 e = vec2(1.0,-1.0)*precis;
      return normalize( e.xyy*map(pos + e.xyy, s) +
                        e.yyx*map(pos + e.yyx, s) +
                        e.yxy*map(pos + e.yxy, s) +
                        e.xxx*map(pos + e.xxx, s) );
    }

    vec3 shade(vec3 ro, vec3 rd, float anim){
      vec3 col = vec3(0.0);
      float t = trace(ro, rd, anim);
      if (t>0.0){
        vec4 tra = orb;
        vec3 pos = ro + t*rd;
        vec3 nor = calcNormal(pos, t, anim);

        // two lights + ambient, audio-reactive ambient tilt
        vec3 l1 = normalize(vec3( 0.577, 0.577, -0.577));
        vec3 l2 = normalize(vec3(-0.707, 0.000,  0.707));
        float key = clamp(dot(l1,nor), 0.0, 1.0);
        float bac = clamp(0.2 + 0.8*dot(l2,nor), 0.0, 1.0);
        float amb = (0.6 + 0.4*nor.y) * (0.85 + 0.15*midLevel);
        float ao  = pow(clamp(tra.w*2.0, 0.0, 1.0), uAOExp);

        vec3 brdf = vec3(uAmb)*amb*ao + vec3(1.0)*key*uKey*ao + vec3(uBack)*bac*ao;

        // color palette: hue from normal and fold data, scroll with treble
        float h = fract(uHueBase + uHueRange*(0.25*nor.y + 0.75*clamp(6.0*tra.y,0.0,1.0)) + 0.15*trebleLevel + 0.05*sin(time*uHueSpeed));
        float s = clamp(uSat * (0.9 + 0.2*midLevel), 0.0, 1.0);
        float v = clamp(uVal * exp(-uFog*t) * (0.9 + 0.3*bassLevel), 0.0, 2.0);
        vec3 rgb = hsv2rgb(vec3(h, s, v));

        col = rgb * brdf;
        // soft tone map
        col = col / (1.0 + 0.8*col);
      }
      return sqrt(max(col, 0.0));
    }

    void main(){
      vec2 fragCoord = gl_FragCoord.xy;
      float aa = (uAA < 1.5) ? 1.0 : 2.0;
      vec3 tot = vec3(0.0);
      for (int jj=0;jj<2;jj++){
        for (int ii=0;ii<2;ii++){
          if (aa<2.0 && (ii+jj)>0) continue; // single sample
          vec2 q = fragCoord + vec2(float(ii), float(jj))/aa;
          vec2 p = (2.0*q - resolution.xy)/resolution.y;

          // audio-influenced camera path
          float t = time*0.25;
          float anim = (1.1 + 0.5*smoothstep(-0.3, 0.3, cos(0.1*time))) * (1.0 + 0.4*bassLevel);
          float rad = uCamRadius*(1.0 + 0.08*midLevel);
          vec3 ro = vec3( rad*cos(0.15+0.33*t), uCamHeight + 0.35*cos(0.37*t + 0.6*bassLevel), rad*cos(0.5+0.35*t) );
          vec3 ta = vec3( 2.0*cos(1.2+0.41*t), 0.4 + 0.15*cos(0.27*t), 2.0*cos(2.0+0.38*t) );
          float roll = 0.25*cos(0.1*t) + 0.2*trebleLevel;
          vec3 cw = normalize(ta - ro);
          vec3 cp = vec3(sin(roll), cos(roll), 0.0);
          vec3 cu = normalize(cross(cw, cp));
          vec3 cv = normalize(cross(cu, cw));
          vec3 rd = normalize( p.x*cu + p.y*cv + uFov*cw );

          // render sample
          tot += shade(ro, rd, uScale*anim);
        }
      }
      tot /= (aa*aa);
      gl_FragColor = vec4(tot, 1.0);
    }
  `;

  class OrbifoldFoldsVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = {
        // Structure
        scale: 1.2,
        warp: 0.8,
        rot: 1.0,
        warpFreq: 3.3,
        warpSpeed: 1.0,
        axisMix: 0.65,
        distCoeff: 0.22,
        // Antialias
        aa: 2,
        // Color
        hueBase: 0.62,
        hueRange: 0.45,
        hueSpeed: 0.6,
        sat: 0.9,
        val: 1.0,
        // Lighting & fog
        ambient: 0.45,
        key: 1.0,
        back: 0.35,
        aoExp: 1.2,
        fog: 0.22,
        // Camera
        camRadius: 2.8,
        camHeight: 0.5,
        fov: 2.0
      };
      this.geometry = new THREE.PlaneBufferGeometry(50,50,1,1);
      this.uniforms = {
        time:{value:0}, resolution:{value:new THREE.Vector2(1,1)},
        bassLevel:{value:0}, midLevel:{value:0}, trebleLevel:{value:0},
        // structure / fold
        uScale:{value:this.params.scale}, uWarp:{value:this.params.warp}, uRot:{value:this.params.rot},
        uWarpFreq:{value:this.params.warpFreq}, uWarpSpeed:{value:this.params.warpSpeed},
        uAxisMix:{value:this.params.axisMix}, uDistCoeff:{value:this.params.distCoeff},
        // camera / projection
        uCamRadius:{value:this.params.camRadius}, uCamHeight:{value:this.params.camHeight}, uFov:{value:this.params.fov},
        // AA
        uAA:{value:this.params.aa},
        // color
        uHueBase:{value:this.params.hueBase}, uHueRange:{value:this.params.hueRange}, uHueSpeed:{value:this.params.hueSpeed},
        uSat:{value:this.params.sat}, uVal:{value:this.params.val},
        // lighting & fog
        uAmb:{value:this.params.ambient}, uKey:{value:this.params.key}, uBack:{value:this.params.back},
        uAOExp:{value:this.params.aoExp}, uFog:{value:this.params.fog}
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
      // structure
      this.uniforms.uScale.value = p.scale;
      this.uniforms.uWarp.value = p.warp;
      this.uniforms.uRot.value = p.rot;
      this.uniforms.uWarpFreq.value = p.warpFreq;
      this.uniforms.uWarpSpeed.value = p.warpSpeed;
      this.uniforms.uAxisMix.value = p.axisMix;
      this.uniforms.uDistCoeff.value = p.distCoeff;
      // camera
      this.uniforms.uCamRadius.value = p.camRadius;
      this.uniforms.uCamHeight.value = p.camHeight;
      this.uniforms.uFov.value = p.fov;
      // AA
      this.uniforms.uAA.value = p.aa;
      // color
      this.uniforms.uHueBase.value = p.hueBase;
      this.uniforms.uHueRange.value = p.hueRange;
      this.uniforms.uHueSpeed.value = p.hueSpeed;
      this.uniforms.uSat.value = p.sat;
      this.uniforms.uVal.value = p.val;
      // lighting & fog
      this.uniforms.uAmb.value = p.ambient;
      this.uniforms.uKey.value = p.key;
      this.uniforms.uBack.value = p.back;
      this.uniforms.uAOExp.value = p.aoExp;
      this.uniforms.uFog.value = p.fog;
    }
    onResize(){ const d=this.renderer.domElement; if (this.uniforms) this.uniforms.resolution.value.set(d.width,d.height); }
    dispose(){ super.dispose(); this.geometry?.dispose?.(); this.material?.dispose?.(); }
  }
  window.OrbifoldFoldsVisualization = OrbifoldFoldsVisualization;
})();

