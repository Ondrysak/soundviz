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
