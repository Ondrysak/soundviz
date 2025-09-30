# Soundviz

Audio-reactive visualizations built with Three.js and WebGL shaders.

## How to run

1. Start the development server:
   ```bash
   uv run server.py
   ```
   This will:
   - Start a local server at http://localhost:8000/
   - Automatically open your browser
   - Watch for file changes and auto-reload the browser

2. Allow microphone access when prompted
3. Select a visualization from the dropdown
4. Adjust parameters using the GUI panel

## Development

The server watches for changes in:
- HTML files
- JavaScript files
- GLSL shader files

When you save any file, the browser will automatically reload. Perfect for tweaking shaders!

**Note**: A local server is required because the shaders are loaded via fetch(), which doesn't work with the `file://` protocol.

Requires a modern browser with WebGL support and microphone permissions.

## What's included

20+ shader-based visualizations including:
- Shader effects (hexagon cells, plasma, vertex distortion)
- Particle systems (galaxy, rings, instanced grids)
- Fractals (Mandelbrot, orbifold folds)
- 3D geometry (deforming meshes, torus knots, ribbons)
- Post-processing effects (feedback, lens flares, spotlights)

All visualizations react to audio input in real-time.

