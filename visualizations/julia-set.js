class JuliaSetVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Create image data for pixel manipulation
        this.imageData = this.ctx.createImageData(this.width, this.height);
        this.data = this.imageData.data;
        
        // Optimization: reduce resolution for performance
        this.pixelStep = 2; // Skip every other pixel for performance
        this.maxIterations = 100;
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initialize();
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Audio-reactive Julia set parameters
        const cx = -0.7 + Math.sin(time * 0.3) * 0.3 + bassEnergy * 0.2;
        const cy = 0.27015 + Math.cos(time * 0.4) * 0.2 + midEnergy * 0.15;
        
        // Zoom and pan parameters
        const zoom = 0.5 + bassEnergy * 1.5 + Math.sin(time * 0.2) * 0.3;
        const panX = Math.sin(time * 0.1) * 0.5 + trebleEnergy * 0.3;
        const panY = Math.cos(time * 0.15) * 0.5 + midEnergy * 0.2;
        
        // Dynamic iteration count based on audio
        const iterations = Math.floor(50 + trebleEnergy * 80);
        
        // Clear the image data
        for (let i = 0; i < this.data.length; i += 4) {
            this.data[i] = 0;     // Red
            this.data[i + 1] = 0; // Green
            this.data[i + 2] = 0; // Blue
            this.data[i + 3] = 255; // Alpha
        }
        
        // Generate Julia set
        for (let x = 0; x < this.width; x += this.pixelStep) {
            for (let y = 0; y < this.height; y += this.pixelStep) {
                // Map pixel to complex plane
                const zx = (x - this.centerX) / (100 * zoom) + panX;
                const zy = (y - this.centerY) / (100 * zoom) + panY;
                
                // Calculate Julia set iteration
                const iterCount = this.juliaIteration(zx, zy, cx, cy, iterations);
                
                if (iterCount < iterations) {
                    // Color based on iteration count and audio
                    const t = iterCount / iterations;
                    
                    // Multiple color schemes based on audio energy
                    let hue, saturation, lightness;
                    
                    if (totalEnergy > 0.7) {
                        // High energy: psychedelic rainbow
                        hue = (iterCount * 8 + time * 200 + totalEnergy * 300) % 360;
                        saturation = 90 + totalEnergy * 10;
                        lightness = 30 + t * 60;
                    } else if (totalEnergy > 0.4) {
                        // Medium energy: electric blues and purples
                        hue = 240 + Math.sin(iterCount * 0.1 + time) * 60;
                        saturation = 80 + totalEnergy * 20;
                        lightness = 20 + t * 70;
                    } else {
                        // Low energy: warm oranges and reds
                        hue = 20 + Math.sin(iterCount * 0.05 + time * 0.5) * 40;
                        saturation = 70 + totalEnergy * 30;
                        lightness = 15 + t * 50;
                    }
                    
                    // Add audio-reactive brightness modulation
                    lightness += Math.sin(time * 3 + iterCount * 0.2) * totalEnergy * 20;
                    
                    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);
                    
                    // Fill pixel and adjacent pixels for performance
                    for (let dx = 0; dx < this.pixelStep && x + dx < this.width; dx++) {
                        for (let dy = 0; dy < this.pixelStep && y + dy < this.height; dy++) {
                            const index = ((y + dy) * this.width + (x + dx)) * 4;
                            this.data[index] = rgb[0];     // Red
                            this.data[index + 1] = rgb[1]; // Green
                            this.data[index + 2] = rgb[2]; // Blue
                            this.data[index + 3] = 255;    // Alpha
                        }
                    }
                }
            }
        }
        
        // Draw the fractal
        this.ctx.putImageData(this.imageData, 0, 0);
        
        // Add overlay effects for extra psychedelic impact
        this.addOverlayEffects(audioData, cx, cy, zoom, panX, panY);
    }
    
    juliaIteration(zx, zy, cx, cy, maxIterations) {
        let x = zx;
        let y = zy;
        let iteration = 0;
        
        while (x * x + y * y <= 4 && iteration < maxIterations) {
            const xtemp = x * x - y * y + cx;
            y = 2 * x * y + cy;
            x = xtemp;
            iteration++;
        }
        
        // Smooth coloring
        if (iteration < maxIterations) {
            const log_zn = Math.log(x * x + y * y) / 2;
            const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
            iteration = iteration + 1 - nu;
        }
        
        return iteration;
    }
    
    addOverlayEffects(audioData, cx, cy, zoom, panX, panY) {
        const { time } = audioData;
        const audioMetrics = this.calculateAudioMetrics(audioData.frequencyData, audioData.bufferLength);
        const { total: totalEnergy, bass: bassEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Draw critical points and orbits
        if (totalEnergy > 0.3) {
            this.drawCriticalPoints(cx, cy, zoom, panX, panY, time, totalEnergy);
        }
        
        // Draw parameter space indicator
        if (totalEnergy > 0.5) {
            this.drawParameterSpace(cx, cy, time, totalEnergy);
        }
        
        // Add energy-based particle effects
        if (totalEnergy > 0.6) {
            this.drawEnergyParticles(time, totalEnergy, trebleEnergy);
        }
    }
    
    drawCriticalPoints(cx, cy, zoom, panX, panY, time, energy) {
        // Draw the critical point (0,0) and its orbit
        let x = 0;
        let y = 0;
        
        this.ctx.strokeStyle = `hsla(${(time * 100) % 360}, 100%, 70%, ${energy})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < 20; i++) {
            // Map complex plane to screen coordinates
            const screenX = this.centerX + (x - panX) * 100 * zoom;
            const screenY = this.centerY + (y - panY) * 100 * zoom;
            
            if (i === 0) {
                this.ctx.moveTo(screenX, screenY);
            } else {
                this.ctx.lineTo(screenX, screenY);
            }
            
            // Iterate the critical point
            const xtemp = x * x - y * y + cx;
            y = 2 * x * y + cy;
            x = xtemp;
            
            // Break if orbit escapes
            if (x * x + y * y > 4) break;
        }
        
        this.ctx.stroke();
    }
    
    drawParameterSpace(cx, cy, time, energy) {
        // Draw a small indicator showing current c parameter
        const indicatorX = this.width - 100;
        const indicatorY = 50;
        const scale = 30;
        
        this.ctx.beginPath();
        this.ctx.arc(
            indicatorX + cx * scale, 
            indicatorY + cy * scale, 
            3 + energy * 5, 
            0, 
            Math.PI * 2
        );
        
        this.ctx.fillStyle = `hsla(${(time * 200) % 360}, 100%, 80%, ${0.8 + energy * 0.2})`;
        this.ctx.fill();
        
        // Draw parameter space grid
        this.ctx.strokeStyle = `hsla(0, 0%, 50%, ${0.3 + energy * 0.2})`;
        this.ctx.lineWidth = 1;
        
        for (let i = -2; i <= 2; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(indicatorX + i * scale, indicatorY - 2 * scale);
            this.ctx.lineTo(indicatorX + i * scale, indicatorY + 2 * scale);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(indicatorX - 2 * scale, indicatorY + i * scale);
            this.ctx.lineTo(indicatorX + 2 * scale, indicatorY + i * scale);
            this.ctx.stroke();
        }
    }
    
    drawEnergyParticles(time, totalEnergy, trebleEnergy) {
        const particleCount = Math.floor(totalEnergy * 50);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time * 2;
            const radius = 50 + Math.sin(time * 3 + i * 0.5) * 30;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2 + trebleEnergy * 4, 0, Math.PI * 2);
            
            const hue = (i * 20 + time * 150) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${totalEnergy})`;
            this.ctx.fill();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('juliaSet', JuliaSetVisualization);
    }
});
