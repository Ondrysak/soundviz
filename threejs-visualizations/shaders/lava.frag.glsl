precision highp float;

uniform float time;
uniform vec2 resolution;
uniform float bassLevel;
uniform float midLevel;
uniform float trebleLevel;

// Control uniforms
uniform float uFlowSpeed;
uniform float uFlowIntensity;
uniform float uSpaceWarp;
uniform float uRotation;
uniform float uJitter;
uniform float uEdgeIntensity;
uniform float uColorSpeed;

const mat2 m = mat2(0.80, 0.60, -0.60, 0.80);

float hash(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7));
  return -1.0 + 2.0 * fract(sin(h) * 43758.5453123);
}

float noise(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(hash(i + vec2(0.0, 0.0)), 
                 hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), 
                 hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * noise(p); p = m * p * 2.02;
  f += 0.2500 * noise(p); p = m * p * 2.03;
  f += 0.1250 * noise(p); p = m * p * 2.01;
  f += 0.0625 * noise(p);
  return f / 0.9375;
}

vec2 fbm2(in vec2 p) {
  return vec2(fbm(p.xy), fbm(p.yx));
}

vec3 map(vec2 p, float t, float bass, float mid, float treb) {
  // Polar coordinate warping for circular patterns
  float radius = length(p);
  float angle = atan(p.y, p.x);

  // Bass creates pulsing radial waves
  radius += sin(radius * 4.0 - t * 2.0 * uFlowSpeed) * 0.15 * bass * uSpaceWarp;
  radius *= 0.7 + 0.4 * bass * uSpaceWarp;

  // Mid frequencies create spiral distortion
  angle += radius * 0.8 * mid * uRotation + t * 0.3 * uFlowSpeed;
  angle += sin(t * 1.5 + radius * 3.0) * 0.5 * mid * uRotation;

  // Reconstruct coordinates with warped polar
  vec2 polarP = vec2(cos(angle), sin(angle)) * radius;

  // Add kaleidoscope effect - mirror across multiple axes
  float segments = 6.0 + floor(bass * 6.0);
  float segAngle = 6.28318 / segments;
  float a = mod(atan(polarP.y, polarP.x), segAngle);
  a = abs(a - segAngle * 0.5);
  polarP = vec2(cos(a), sin(a)) * length(polarP);

  // Treble creates crystalline fracturing
  vec2 fracture = vec2(
    sin(polarP.x * 8.0 + t * 3.0) * cos(polarP.y * 6.0),
    cos(polarP.x * 6.0) * sin(polarP.y * 8.0 + t * 2.5)
  ) * treb * 0.2 * uJitter;

  polarP += fracture;

  // Audio-reactive time modulation
  float timeScale = 0.05 * t * uFlowSpeed * (1.0 + 2.0 * mid + 1.5 * bass);

  // Flow intensity with layered noise
  float flowIntensity = uFlowIntensity * (1.0 + 3.0 * bass + 1.0 * treb);

  // Create flowing organic patterns with domain warping
  vec2 q = fbm2(polarP * 2.0 + timeScale);
  vec2 r = fbm2(polarP * 3.0 + q * 1.5 - timeScale * 0.5);

  float f = fbm(polarP + r * flowIntensity);

  // Add secondary layer for more complexity
  float f2 = fbm(polarP * 1.5 - r * 0.8 + timeScale * 0.3);
  f = mix(f, f2, 0.5 + 0.3 * sin(t * 0.5));

  // Create sharp transitions with audio modulation
  float bl = smoothstep(-0.4 - 0.5 * bass, 0.4 + 0.5 * bass, f);
  bl = pow(bl, 1.0 + bass * 0.5);

  // Texture mixing
  float ti = smoothstep(-0.8, 0.8, f2);
  ti = mix(ti, fbm(polarP * 0.5 + vec2(t * 0.1)), 0.3);

  // Psychedelic color cycling
  float hue1 = fract(t * 0.05 * uColorSpeed + f * 0.3 + mid * 0.5);
  float hue2 = fract(t * 0.08 * uColorSpeed + f2 * 0.4 + bass * 0.3);

  // Multi-layered colors
  vec3 color1 = vec3(
    0.5 + 0.5 * sin(hue1 * 6.28318),
    0.5 + 0.5 * sin(hue1 * 6.28318 + 2.094),
    0.5 + 0.5 * sin(hue1 * 6.28318 + 4.189)
  );

  vec3 color2 = vec3(
    0.5 + 0.5 * cos(hue2 * 6.28318),
    0.5 + 0.5 * cos(hue2 * 6.28318 + 2.094),
    0.5 + 0.5 * cos(hue2 * 6.28318 + 4.189)
  );

  vec3 color3 = vec3(
    0.3 * bass,
    0.2 * mid,
    0.4 * treb
  );

  // Mix colors based on pattern
  vec3 col = mix(color1, color2, ti);
  col = mix(col, color3, bl * 0.5);

  // Add some brightness variation
  col *= 0.7 + 0.5 * f + 0.3 * bass;

  return col;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 p = (-resolution.xy + 2.0 * fragCoord.xy) / resolution.y;

  float bass = bassLevel;
  float mid = midLevel;
  float treb = trebleLevel;

  // Multi-sample edge detection for sharper details
  float e = 0.003 * (1.0 + 0.5 * treb);

  vec3 colc = map(p, time, bass, mid, treb);
  float gc = dot(colc, vec3(0.333));

  // Sample in multiple directions for better edge detection
  vec3 cola = map(p + vec2(e, 0.0), time, bass, mid, treb);
  float ga = dot(cola, vec3(0.333));
  vec3 colb = map(p + vec2(0.0, e), time, bass, mid, treb);
  float gb = dot(colb, vec3(0.333));
  vec3 colc2 = map(p + vec2(-e, 0.0), time, bass, mid, treb);
  float gc2 = dot(colc2, vec3(0.333));
  vec3 cold = map(p + vec2(0.0, -e), time, bass, mid, treb);
  float gd = dot(cold, vec3(0.333));

  // Calculate gradient
  vec2 grad = vec2(ga - gc2, gb - gd);
  float gradMag = length(grad);

  vec3 col = colc;

  // Crystalline edge highlights
  float edgeIntensity = pow(gradMag * 20.0, 1.5);

  // Rainbow edge colors that shift with audio
  float edgeHue = fract(time * 0.2 + gradMag * 2.0 + bass * 0.5);
  vec3 edgeColor = vec3(
    0.5 + 0.5 * sin(edgeHue * 6.28318),
    0.5 + 0.5 * sin(edgeHue * 6.28318 + 2.094),
    0.5 + 0.5 * sin(edgeHue * 6.28318 + 4.189)
  );

  col += edgeColor * edgeIntensity * (8.0 + 12.0 * treb) * uEdgeIntensity;

  // Add glow based on pattern density
  float glow = smoothstep(0.3, 0.7, gc);
  col += vec3(0.1, 0.15, 0.2) * glow * (1.0 + bass) * mid;

  // Subtle chromatic aberration on edges
  if (edgeIntensity > 0.1) {
    vec3 colR = map(p + vec2(e * 0.5, 0.0), time, bass, mid, treb);
    vec3 colB = map(p - vec2(e * 0.5, 0.0), time, bass, mid, treb);
    col.r = mix(col.r, colR.r, 0.3 * treb);
    col.b = mix(col.b, colB.b, 0.3 * treb);
  }

  // Overall brightness pulse
  col *= 0.85 + 0.35 * bass + 0.15 * sin(time * 2.0);

  // Radial vignette for focus
  vec2 q = fragCoord.xy / resolution.xy;
  vec2 center = q - 0.5;
  float vignette = 1.0 - dot(center, center) * 1.2;
  vignette = pow(vignette, 0.8);
  col *= vignette;

  gl_FragColor = vec4(col, 1.0);
}

