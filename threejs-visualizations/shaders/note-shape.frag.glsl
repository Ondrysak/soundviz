    precision highp float;
    uniform float time; uniform vec2 resolution;
    uniform float bassLevel; uniform float midLevel; uniform float trebleLevel;
    uniform float uLineThickness;
    uniform float uLineCount;
    uniform float uLineSpacing;
    uniform float uSpacingMode; // 0=Linear,1=Exponential,2=Sinusoidal,3=Logarithmic
    uniform float uExpBase;
    uniform float uSinFreq;
    uniform float uSinAmp;
    uniform float uLogBase;
    uniform float uLineOffset;   // global offset (px)
    uniform float uLineJitterAmp; // per-line jitter (px)
    uniform float uLineJitterSpeed; // jitter speed
    uniform float uLineSoftness; // smoothing multiplier (1.0 = default)
    uniform float uLineBrightness; // multiplies line mask in mix
    uniform float uLineSide; // 0=Both,1=Inside,2=Outside

    // Shadertoy-style helpers adapted to WebGL1
    float patternFrac(float x){ return fract(1.5*x); }

    // Map degree index [0..6] to whole-note semitone offsets
    float degreeSemitone(float d){
      // d expected as 0..6 integer in float
      if (d < 0.5) return 0.0;      // C
      else if (d < 1.5) return 2.0; // D
      else if (d < 2.5) return 4.0; // E
      else if (d < 3.5) return 5.0; // F
      else if (d < 4.5) return 7.0; // G
      else if (d < 5.5) return 9.0; // A
      else return 11.0;             // B
    }

    float patternNote(float x){
      float noteID = floor(7.0 + 7.0 * sin(floor(1.5*x)));
      float deg = mod(noteID, 7.0);
      float oct = floor(noteID / 7.0);
      return degreeSemitone(deg) + 12.0*oct;
    }

    float patternFreq(float x){
      float f = patternNote(x);
      return 55.0 * pow(2.0, f/12.0);
    }

    // Signed distance-like shape as given, adapted to time
    float shape(vec2 p, float n, float w, float a){
      float r = length(p);
      float t = time;
      float h = 0.7 + (26.0-n)*0.005 *
                sin(atan(p.y,p.x) * (2.0 + floor(n/4.0)) + 2.0*t) *
                sin((w-50.0)*a*0.2);
      return h - r;
    }

    // Small swirl distortion for a trippy twist
    vec2 swirl(vec2 p, float k){
      float r = length(p);
      float ang = atan(p.y,p.x);
      float twist = k * r*r; // radial quadratic swirl
      ang += twist;
      return vec2(cos(ang), sin(ang)) * r;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy / resolution.xy) * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;
      float t = time;
      float bass = bassLevel, mid = midLevel, treb = trebleLevel;

      // Audio-reactive gentle zoom & swirl
      float zoom = 1.0 + 0.25*bass;
      vec2 p = uv / zoom;
      float swirlAmt = (0.4 + 0.8*mid + 0.4*treb) * 0.35;
      p = swirl(p, swirlAmt * (0.5 + 0.5*sin(t*0.6 + 5.0*treb)));

      // Musical parameters
      float n = patternNote(t);
      float w = patternFreq(t);
      float a = patternFrac(t);

      // Edge estimation and multi-contour generation
      float e = 2.0 / resolution.y;
      float f  = shape(p,n,w,a);
      float fx = shape(p+vec2(e,0.0),n,w,a);
      float fy = shape(p+vec2(0.0,e),n,w,a);
      float gradLen = max(1e-4, length(vec2(f-fx, f-fy)));
      float d = abs(f) / gradLen; // approximate distance to boundary

      // Base single-edge mask retained for inner shading
      float dScaled = d / max(0.001, uLineThickness);
      float q = smoothstep(1.0, 2.0, dScaled);
      q *= 0.8 + 0.2*smoothstep(0.0, 10.0, dScaled);

      // Multi-line contours: lines at distances k * uLineSpacing
      float lines = 0.0;
      float count = clamp(uLineCount, 1.0, 10.0);
      float wline = max(0.001, uLineThickness);
      for (int i=0; i<10; i++) {
        if (float(i) >= count) break;
        float idx = float(i);
        float target;
        if (abs(uSpacingMode - 0.0) < 0.5) {
          // Linear
          target = idx * max(0.0001, uLineSpacing);
        } else if (abs(uSpacingMode - 1.0) < 0.5) {
          // Exponential cumulative spacing
          float base = max(1.01, uExpBase);
          target = max(0.0, (pow(base, idx) - 1.0) / (base - 1.0)) * uLineSpacing;
        } else if (abs(uSpacingMode - 2.0) < 0.5) {
          // Sinusoidal offset on top of linear
          float freq = max(0.01, uSinFreq);
          float amp = uSinAmp;
          target = idx * uLineSpacing + amp * sin(idx * freq) * uLineSpacing;
          target = max(0.0, target);
        } else {
          // Logarithmic (decreasing gaps outward)
          float lb = max(1.01, uLogBase);
          float denom = log(1.0 + (count - 1.0) * lb);
          float norm = (denom > 0.0) ? log(1.0 + idx * lb) / denom : 0.0;
          target = norm * uLineSpacing * (count - 1.0);
        }
        // Global offset and per-line jitter
        target += uLineOffset;
        target += uLineJitterAmp * sin(idx * 2.399 + time * uLineJitterSpeed);
        target = max(0.0, target);
        float ad = abs(d - target);
        // Side mask: 0=both, 1=inside (f>=0), 2=outside (f<=0)
        float insideMask = step(0.0, f);
        float outsideMask = step(f, 0.0);
        float allow = 1.0;
        if (abs(uLineSide - 1.0) < 0.5) allow = insideMask;
        else if (abs(uLineSide - 2.0) < 0.5) allow = outsideMask;
        // Soft band for each ring with adjustable softness
        float t1 = wline;
        float t2 = wline * (1.0 + 0.5 * max(0.1, uLineSoftness));
        float ring = (1.0 - smoothstep(t1, t2, ad)) * allow;
        lines = max(lines, ring);
      }

      // Base color with subtle audio tint
      vec3 col = vec3(1.0, 0.8, 0.6);
      col.yz += 0.01*sin(p.x + sin(p.y + t));
      col *= 1.0 - 0.3*length(p);
      col *= 1.0 - 4.0*a*(1.0-a)*(1.0-q);

      // Trippy twist: subtle chroma shift by sampling gradient directions
      float xoff = 0.003 * (0.5 + treb);
      float yoff = 0.003 * (0.5 + mid);
      float fxR = shape(p + vec2(xoff, 0.0), n, w, a);
      float fyB = shape(p + vec2(0.0, yoff), n, w, a);
      col.r *= 0.9 + 0.1*smoothstep(0.0, 0.2, abs(fxR));
      col.b *= 0.9 + 0.1*smoothstep(0.0, 0.2, abs(fyB));

      // Subtle hue drift with time and treble
      col *= 0.85 + 0.35*(0.5 + 0.5*sin(t*0.15 + 5.0*treb + length(p)*2.0));

      // Apply multi-line contour overlay (brighten along lines)
      col = mix(col, vec3(1.0), clamp(lines * uLineBrightness, 0.0, 1.0));

      gl_FragColor = vec4(col, 1.0);
    }
