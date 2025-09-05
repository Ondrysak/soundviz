# 🎵 Sound Visualizer - Modular Architecture

A browser-based real-time audio visualizer with a modular architecture that supports multiple psychedelic and fractal visualization modes.

## 🏗️ Architecture

The visualizer is now built with a modular architecture that makes it easy to add new visualizations:

### Core Files
- **`audio-visualizer.js`** - Main application class that handles audio input and visualization management
- **`visualizations/base-visualization.js`** - Base class that all visualizations extend

### Visualization Modules
Each visualization is in its own file in the `visualizations/` directory:

- **`frequency-bars.js`** - Classic frequency spectrum bars
- **`waveform.js`** - Time-domain waveform display
- **`circular-spectrum.js`** - Radial frequency spectrum
- **`combined-view.js`** - Split view with frequency bars and waveform
- **`hexagonal-grid.js`** - Hexagonal grid pattern responsive to frequencies
- **`rotating-hexagons.js`** - Multi-layered rotating hexagonal patterns
- **`psychedelic-particles.js`** - Particle system with trails and energy webs
- **`kaleidoscope.js`** - Symmetrical kaleidoscope patterns
- **`fractal-tree.js`** - Recursive fractal tree structures
- **`fractal-spiral.js`** - Fibonacci-like spiral patterns
- **`fractal-mandala.js`** - Mandelbrot-inspired fractal patterns

## 🎨 Creating New Visualizations

To add a new visualization:

1. **Create a new file** in the `visualizations/` directory
2. **Extend BaseVisualization** class:

```javascript
class MyVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    // Optional: Initialize state
    initialize() {
        // Setup code here
    }
    
    // Optional: Handle canvas resize
    onResize(width, height) {
        super.onResize(width, height);
        // Resize handling code here
    }
    
    // Required: Main drawing method
    draw(audioData) {
        const { frequencyData, timeData, bufferLength, time } = audioData;
        
        // Your visualization code here
        // Use this.ctx for canvas drawing
        // Use this.width, this.height for dimensions
        // Use this.centerX, this.centerY for center point
    }
    
    // Optional: Cleanup resources
    cleanup() {
        // Cleanup code here
    }
}

// Register the visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('myViz', MyVisualization);
    }
});
```

3. **Add the script tag** to `index.html`
4. **Add option** to the dropdown in `index.html`

## 🛠️ Available Helper Methods

The `BaseVisualization` class provides useful helper methods:

### Audio Analysis
- `calculateAudioMetrics(frequencyData, bufferLength)` - Returns bass, mid, treble, and total energy
- `getFrequencyColor(freqIndex, time, energy)` - Get color based on frequency
- `getPsychedelicColor(index, time, energy, alpha)` - Get psychedelic color

### Drawing Helpers
- `drawHexagon(x, y, size)` - Draw a hexagon
- `drawPolygon(x, y, size, sides, rotation)` - Draw any polygon
- `createRadialGradient(x, y, r1, r2, colorStops)` - Create radial gradient
- `createLinearGradient(x1, y1, x2, y2, colorStops)` - Create linear gradient

### Utility Functions
- `map(value, inMin, inMax, outMin, outMax)` - Map value between ranges
- `constrain(value, min, max)` - Constrain value to range
- `hslToRgb(h, s, l)` - Convert HSL to RGB

## 🎵 Audio Data Structure

The `audioData` object passed to `draw()` contains:

```javascript
{
    frequencyData: Uint8Array,  // FFT frequency data (0-255)
    timeData: Uint8Array,       // Time domain data (0-255)
    bufferLength: number,       // Length of frequency data
    time: number,               // Animation time counter
    canvas: {
        width: number,
        height: number
    }
}
```

## 🚀 Features

- **Real-time microphone input** using Web Audio API
- **Modular architecture** for easy extension
- **Multiple visualization modes** with smooth transitions
- **Audio-reactive parameters** (bass, mid, treble response)
- **Psychedelic effects** with color cycling and trails
- **Fractal mathematics** with real-time computation
- **Responsive design** that adapts to screen size
- **Performance optimized** for smooth 60fps rendering

## 🎮 Usage

1. Open `index.html` in a modern web browser
2. Click "Start Visualization" and allow microphone access
3. Select different visualization modes from the dropdown
4. Make sounds, play music, or speak to see the visualizations react!

## 🔧 Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari (with some limitations)
- Edge

Requires a browser that supports:
- Web Audio API
- Canvas 2D
- ES6 Classes
- getUserMedia API

## 📁 File Structure

```
soundviz/
├── index.html                          # Main HTML file
├── audio-visualizer.js                 # Core application
├── visualizations/
│   ├── base-visualization.js           # Base class
│   ├── frequency-bars.js               # Frequency bars
│   ├── waveform.js                     # Waveform display
│   ├── circular-spectrum.js            # Circular spectrum
│   ├── combined-view.js                # Combined view
│   ├── hexagonal-grid.js               # Hexagonal grid
│   ├── rotating-hexagons.js            # Rotating hexagons
│   ├── psychedelic-particles.js        # Particle system
│   ├── kaleidoscope.js                 # Kaleidoscope
│   ├── fractal-tree.js                 # Fractal trees
│   ├── fractal-spiral.js               # Fractal spirals
│   └── fractal-mandala.js              # Fractal mandala
└── README.md                           # This file
```

Ready to add more trippy visualizations! 🌈✨
