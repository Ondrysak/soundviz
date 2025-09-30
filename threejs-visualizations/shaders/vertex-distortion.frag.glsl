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
