class MandelbrotSetVisualization extends BaseVisualization {
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
        
        // Mandelbrot set parameters
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.targetZoom = 1;
        this.targetPanX = 0;
        this.targetPanY = 0;
        
        // Interesting points to zoom into
        this.interestingPoints = [
            { x: -0.7269, y: 0.1889, zoom: 100 },
            { x: -0.8, y: 0.156, zoom: 200 },
            { x: -0.74529, y: 0.11307, zoom: 500 },
            { x: -1.25066, y: 0.02012, zoom: 1000 },
            { x: -0.235125, y: 0.827215, zoom: 300 }
        ];
        this.currentPointIndex = 0;
        this.pointChangeTimer = 0;
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
        
        // Update zoom and pan based on audio
        this.updateZoomAndPan(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Dynamic iteration count based on audio
        const iterations = Math.floor(50 + trebleEnergy * 100 + totalEnergy * 50);
        
        // Clear the image data
        for (let i = 0; i < this.data.length; i += 4) {
            this.data[i] = 0;     // Red
            this.data[i + 1] = 0; // Green
            this.data[i + 2] = 0; // Blue
            this.data[i + 3] = 255; // Alpha
        }
        
        // Generate Mandelbrot set
        for (let x = 0; x < this.width; x += this.pixelStep) {
            for (let y = 0; y < this.height; y += this.pixelStep) {
                // Map pixel to complex plane
                const cx = (x - this.centerX) / (100 * this.zoom) + this.panX;
                const cy = (y - this.centerY) / (100 * this.zoom) + this.panY;
                
                // Calculate Mandelbrot set iteration
                const iterCount = this.mandelbrotIteration(cx, cy, iterations);
                
                if (iterCount < iterations) {
                    // Color based on iteration count and audio
                    const t = iterCount / iterations;
                    
                    // Multiple color schemes based on audio energy
                    let hue, saturation, lightness;
                    
                    if (totalEnergy > 0.8) {
                        // Very high energy: rapid color cycling
                        hue = (iterCount * 15 + time * 300 + totalEnergy * 400) % 360;
                        saturation = 95 + totalEnergy * 5;
                        lightness = 40 + t * 50 + Math.sin(time * 5) * 20;
                    } else if (totalEnergy > 0.6) {
                        // High energy: psychedelic rainbow
                        hue = (iterCount * 10 + time * 200 + totalEnergy * 300) % 360;
                        saturation = 90 + totalEnergy * 10;
                        lightness = 30 + t * 60;
                    } else if (totalEnergy > 0.4) {
                        // Medium energy: electric blues and purples
                        hue = 240 + Math.sin(iterCount * 0.1 + time) * 60 + bassEnergy * 30;
                        saturation = 80 + totalEnergy * 20;
                        lightness = 20 + t * 70;
                    } else if (totalEnergy > 0.2) {
                        // Low-medium energy: warm oranges and reds
                        hue = 20 + Math.sin(iterCount * 0.05 + time * 0.5) * 40 + midEnergy * 40;
                        saturation = 70 + totalEnergy * 30;
                        lightness = 15 + t * 50;
                    } else {
                        // Very low energy: deep blues and purples
                        hue = 260 + Math.sin(iterCount * 0.02 + time * 0.3) * 20;
                        saturation = 60 + totalEnergy * 40;
                        lightness = 10 + t * 40;
                    }
                    
                    // Add frequency-specific modulation
                    hue += bassEnergy * 30 + midEnergy * 20 + trebleEnergy * 40;
                    lightness += Math.sin(time * 3 + iterCount * 0.2) * totalEnergy * 15;
                    
                    // Ensure values are in valid ranges
                    hue = hue % 360;
                    saturation = this.constrain(saturation, 0, 100);
                    lightness = this.constrain(lightness, 0, 100);
                    
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
        
        // Add overlay effects for extra visual impact
        this.addOverlayEffects(audioData, totalEnergy, bassEnergy, trebleEnergy);
    }
    
    updateZoomAndPan(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Change target point based on energy spikes
        this.pointChangeTimer += totalEnergy * 0.1;
        if (this.pointChangeTimer > 10 || (totalEnergy > 0.8 && Math.random() < 0.1)) {
            this.currentPointIndex = (this.currentPointIndex + 1) % this.interestingPoints.length;
            this.pointChangeTimer = 0;
        }
        
        const currentPoint = this.interestingPoints[this.currentPointIndex];
        
        // Set targets based on current interesting point and audio
        this.targetZoom = currentPoint.zoom * (1 + bassEnergy * 2);
        this.targetPanX = currentPoint.x + Math.sin(time * 0.1) * 0.1 * midEnergy;
        this.targetPanY = currentPoint.y + Math.cos(time * 0.15) * 0.1 * midEnergy;
        
        // Smooth interpolation to targets
        const lerpFactor = 0.02 + totalEnergy * 0.05;
        this.zoom += (this.targetZoom - this.zoom) * lerpFactor;
        this.panX += (this.targetPanX - this.panX) * lerpFactor;
        this.panY += (this.targetPanY - this.panY) * lerpFactor;
        
        // Add audio-reactive jitter
        this.panX += Math.sin(time * 2) * trebleEnergy * 0.01;
        this.panY += Math.cos(time * 2.5) * trebleEnergy * 0.01;
    }
    
    mandelbrotIteration(cx, cy, maxIterations) {
        let x = 0;
        let y = 0;
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
    
    addOverlayEffects(audioData, totalEnergy, bassEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw zoom indicator
        if (totalEnergy > 0.3) {
            this.drawZoomIndicator(time, totalEnergy);
        }
        
        // Add energy-based particle effects
        if (totalEnergy > 0.6) {
            this.drawEnergyParticles(time, totalEnergy, trebleEnergy);
        }
        
        // Draw coordinate system for high energy
        if (totalEnergy > 0.7) {
            this.drawCoordinateSystem(time, totalEnergy);
        }
    }
    
    drawZoomIndicator(time, energy) {
        const indicatorX = this.width - 80;
        const indicatorY = 30;
        
        this.ctx.fillStyle = `hsla(${(time * 100) % 360}, 100%, 70%, ${0.7 + energy * 0.3})`;
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Zoom: ${this.zoom.toFixed(1)}x`, indicatorX, indicatorY);
        this.ctx.fillText(`X: ${this.panX.toFixed(4)}`, indicatorX, indicatorY + 15);
        this.ctx.fillText(`Y: ${this.panY.toFixed(4)}`, indicatorX, indicatorY + 30);
    }
    
    drawEnergyParticles(time, totalEnergy, trebleEnergy) {
        const particleCount = Math.floor(totalEnergy * 30);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time * 2;
            const radius = 30 + Math.sin(time * 3 + i * 0.5) * 20;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 1 + trebleEnergy * 3, 0, Math.PI * 2);
            
            const hue = (i * 30 + time * 150) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${totalEnergy})`;
            this.ctx.fill();
        }
    }
    
    drawCoordinateSystem(time, energy) {
        this.ctx.strokeStyle = `hsla(0, 0%, 80%, ${0.3 + energy * 0.2})`;
        this.ctx.lineWidth = 1;
        
        // Draw center crosshairs
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - 20, this.centerY);
        this.ctx.lineTo(this.centerX + 20, this.centerY);
        this.ctx.moveTo(this.centerX, this.centerY - 20);
        this.ctx.lineTo(this.centerX, this.centerY + 20);
        this.ctx.stroke();
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('mandelbrotSet', MandelbrotSetVisualization);
    }
});
