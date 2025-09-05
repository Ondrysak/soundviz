class BaseVisualization {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.centerX = width / 2;
        this.centerY = height / 2;
        
        this.initialize();
    }
    
    // Override this method in subclasses to set up initial state
    initialize() {
        // Default implementation - do nothing
    }
    
    // Override this method in subclasses to handle canvas resize
    onResize(width, height) {
        this.width = width;
        this.height = height;
        this.centerX = width / 2;
        this.centerY = height / 2;
        
        // Re-initialize if needed
        this.initialize();
    }
    
    // Override this method in subclasses to clean up resources
    cleanup() {
        // Default implementation - do nothing
    }
    
    // Main draw method - must be implemented by subclasses
    draw(audioData) {
        throw new Error('draw() method must be implemented by subclass');
    }
    
    // Utility methods available to all visualizations
    calculateAudioMetrics(frequencyData, bufferLength) {
        return AudioVisualizer.calculateAudioMetrics(frequencyData, bufferLength);
    }
    
    hslToRgb(h, s, l) {
        return AudioVisualizer.hslToRgb(h, s, l);
    }
    
    // Helper method to draw a hexagon
    drawHexagon(x, y, size) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const hx = x + size * Math.cos(angle);
            const hy = y + size * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(hx, hy);
            } else {
                this.ctx.lineTo(hx, hy);
            }
        }
        this.ctx.closePath();
    }
    
    // Helper method to draw a polygon
    drawPolygon(x, y, size, sides, rotation = 0) {
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 + rotation;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.closePath();
    }
    
    // Helper method for gradient creation
    createRadialGradient(x, y, r1, r2, colorStops) {
        const gradient = this.ctx.createRadialGradient(x, y, r1, x, y, r2);
        colorStops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        return gradient;
    }
    
    // Helper method for linear gradient creation
    createLinearGradient(x1, y1, x2, y2, colorStops) {
        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        colorStops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        return gradient;
    }
    
    // Helper method to map a value from one range to another
    map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
    
    // Helper method to constrain a value between min and max
    constrain(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Helper method to get a color based on frequency index and time
    getFrequencyColor(freqIndex, time, energy = 1) {
        const hue = (freqIndex * 2 + time * 50) % 360;
        const saturation = 80 + energy * 20;
        const lightness = 40 + energy * 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // Helper method to get a psychedelic color
    getPsychedelicColor(index, time, energy = 1, alpha = 1) {
        const hue = (index * 30 + time * 100) % 360;
        const saturation = 90 + energy * 10;
        const lightness = 50 + energy * 30;
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    }
}
