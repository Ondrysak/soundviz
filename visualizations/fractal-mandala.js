class FractalMandalaVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio energy
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Create fractal mandala with audio-reactive parameters
        const maxIterations = 50 + Math.floor(trebleEnergy * 50);
        const zoom = 0.5 + bassEnergy * 2;
        const timeOffset = time * 0.1;
        
        // Draw fractal pattern
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        
        for (let x = 0; x < this.width; x += 2) {
            for (let y = 0; y < this.height; y += 2) {
                // Map pixel to complex plane
                const zx = (x - this.centerX) / (100 * zoom);
                const zy = (y - this.centerY) / (100 * zoom);
                
                // Audio-modulated complex constant
                const cx = -0.7 + Math.sin(timeOffset) * 0.3 + bassEnergy * 0.2;
                const cy = 0.27015 + Math.cos(timeOffset * 1.3) * 0.2 + trebleEnergy * 0.1;
                
                const iterations = this.mandelbrotIteration(zx, zy, cx, cy, maxIterations);
                
                if (iterations < maxIterations) {
                    // Color based on iterations and audio
                    const hue = (iterations * 8 + time * 100 + totalEnergy * 200) % 360;
                    const saturation = 80 + totalEnergy * 20;
                    const lightness = 30 + (iterations / maxIterations) * 70;
                    const alpha = 0.6 + totalEnergy * 0.4;
                    
                    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
                    
                    const index = (y * this.width + x) * 4;
                    data[index] = rgb[0];     // Red
                    data[index + 1] = rgb[1]; // Green
                    data[index + 2] = rgb[2]; // Blue
                    data[index + 3] = alpha * 255; // Alpha
                    
                    // Fill adjacent pixels for performance
                    if (x + 1 < this.width) {
                        const index2 = (y * this.width + (x + 1)) * 4;
                        data[index2] = rgb[0];
                        data[index2 + 1] = rgb[1];
                        data[index2 + 2] = rgb[2];
                        data[index2 + 3] = alpha * 255;
                    }
                    if (y + 1 < this.height) {
                        const index3 = ((y + 1) * this.width + x) * 4;
                        data[index3] = rgb[0];
                        data[index3 + 1] = rgb[1];
                        data[index3 + 2] = rgb[2];
                        data[index3 + 3] = alpha * 255;
                    }
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        
        // Add overlay patterns for extra psychedelic effect
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        
        // Rotating geometric overlay
        const overlayCount = 6 + Math.floor(totalEnergy * 6);
        for (let i = 0; i < overlayCount; i++) {
            this.ctx.save();
            this.ctx.rotate((i / overlayCount) * Math.PI * 2 + time * (0.5 + i * 0.1));
            
            const radius = 50 + i * 20 + bassEnergy * 50;
            const sides = 3 + i;
            
            this.drawPolygon(0, 0, radius, sides);
            
            const hue = (i * 60 + time * 200) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.3 + totalEnergy * 0.3})`;
            this.ctx.lineWidth = 1 + totalEnergy * 2;
            this.ctx.stroke();
            
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }
    
    // Mandelbrot iteration function
    mandelbrotIteration(zx, zy, cx, cy, maxIterations) {
        let x = zx;
        let y = zy;
        let iteration = 0;
        
        while (x * x + y * y <= 4 && iteration < maxIterations) {
            const xtemp = x * x - y * y + cx;
            y = 2 * x * y + cy;
            x = xtemp;
            iteration++;
        }
        
        return iteration;
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('fractalMandala', FractalMandalaVisualization);
    }
});
