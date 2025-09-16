# 🎵 Soundviz – Canvas 2D and Three.js visualizers

Real‑time, audio‑reactive visualizations implemented in two stacks:
- Canvas 2D (root) – modular, lightweight visualizations
- Three.js (threejs-visualizations/) – shader‑driven 3D/GL visuals

## 🔭 What’s inside

- Root Canvas 2D app (index.html)
  - Managed by audio-visualizer.js and the visualizations/ directory
  - Dozens of modes (spectrum bars, kaleidoscope, fractals, tunnels, etc.)
- Three.js showcase (threejs-visualizations/index.html)
  - GPU shader visualizations and 3D scenes (hex cells, plasma, Mandelbrot DE, Note Shape Shader, particles, etc.)

## 🚀 Quick start

- Canvas 2D suite (root):
  1) Open index.html in a modern browser
  2) Click “Start Visualization” and allow microphone access
  3) Pick a mode in the dropdown

- Three.js suite:
  1) Open threejs-visualizations/index.html
  2) Pick a visualization in the dropdown; use the GUI panel to tweak parameters

Tip: On Chrome, ensure microphone permissions are granted; use HTTPS or localhost to avoid permission issues.

## 🏗️ Architecture

### Canvas 2D (root)
- Core files
  - audio-visualizer.js – audio input, analysis, and mode switching
  - visualizations/base-visualization.js – common helpers/utilities
- Add a new Canvas 2D visualization
  1) Create visualizations/my-visual.js
  2) Extend BaseVisualization and implement draw()
  3) Add a <script> tag in index.html and add a dropdown entry

### Three.js (shader/3D)
- Each visualization is a small JS module creating a Three.js scene with dat.GUI controls
- Notable modes: Hexagon Shader (with active‑cell texturing), Plasma, Mandelbrot DE, Vertex Distortion, Note Shape Shader (multi‑contour spacing modes, thickness, spacing, exponential/sinusoidal/logarithmic distributions, jitter/offset/inside‑outside/brightness)
- Add a new Three.js visualization
  1) Create threejs-visualizations/my-three-viz.js extending the provided base pattern
  2) Include it in threejs-visualizations/index.html
  3) Add to the dropdown and wire up params/uniforms

## 🎮 Audio data contract (Canvas 2D)

The draw(audioData) method receives:

```javascript
{
  frequencyData: Uint8Array,
  timeData: Uint8Array,
  bufferLength: number,
  time: number,
  canvas: { width: number, height: number }
}
```

Helpers in BaseVisualization include color utilities, geometry helpers (polygons/hexagons), gradients, map/constrain, and audio metric calculators (bass/mid/treble/energy).

## 📁 Repository layout

```
soundviz/
├─ index.html                      # Canvas 2D launcher (with mode dropdown)
├─ audio-visualizer.js             # Core Canvas 2D app & audio plumbing
├─ visualizations/                 # Canvas 2D visualization modules
│  ├─ base-visualization.js
│  ├─ frequency-bars.js, waveform.js, circular-spectrum.js, ...
│  ├─ kaleidoscope.js, psychedelic-particles.js
│  ├─ fractal-tree.js, mandelbrot-set.js, julia-set.js, ...
│  └─ tunnel-3d.js, warp-shader.js, etc.
├─ threejs-visualizations/         # Three.js + shaders showcase
│  ├─ index.html                   # Three.js UI & dat.GUI wiring
│  ├─ base-threejs-visualization.js
│  ├─ hexagon-shader-visualization.js, plasma-shader-visualization.js, ...
│  ├─ note-shape-shader-visualization.js (multi‑contour lines)
│  └─ gummo.png (example texture)
├─ d3-visualizations.html          # Standalone D3.js gallery (optional)
├─ D3_README.md                    # Docs for the D3 page
└─ README.md                       # This file
```

## 🔧 Browser requirements
- Web Audio API, getUserMedia
- Canvas 2D for root visualizations
- WebGL for Three.js (with standard extensions)

## 🧩 Adding more visualizations
- Prefer small, focused modules
- Expose parameters via GUI (Canvas: HTML controls; Three.js: dat.GUI)
- Keep brightness balanced; avoid hard additive blending unless clamped

## ✨ Highlights
- Multi‑contour Note Shape Shader (Three.js): adjustable line count, pixel spacing, thickness, spacing modes (linear/exp/sinusoidal/log), side selection (inside/outside/both), softness, brightness, jitter, offset; audio‑reactive swirl and tint
- Hex Cells with texture‑only on active cells, default texture & mix
- Variety of Canvas 2D fractals and patterns

Enjoy exploring both stacks! 🌈🎚️