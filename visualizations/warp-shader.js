class WarpShaderVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Create multiple canvas layers for complex effects
        this.layers = [];
        const layerCount = 3;
        
        for (let i = 0; i < layerCount; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;
            const ctx = canvas.getContext('2d');
            
            this.layers.push({
                canvas: canvas,
                ctx: ctx,
                imageData: ctx.createImageData(this.width, this.height),
                data: ctx.createImageData(this.width, this.height).data
            });
        }
        
        // Feedback buffer for temporal effects
        this.feedbackCanvas = document.createElement('canvas');
        this.feedbackCanvas.width = this.width;
        this.feedbackCanvas.height = this.height;
        this.feedbackCtx = this.feedbackCanvas.getContext('2d');
        
        // Initialize with noise pattern
        this.initializeNoise();
        
        // Warp parameters
        this.warpTime = 0;
        this.warpStrength = 1;
    }
    
    initializeNoise() {
        const layer = this.layers[0];
        const imageData = layer.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        
        // Generate initial noise pattern
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random();
            data[i] = noise * 255;     // Red
            data[i + 1] = noise * 255; // Green
            data[i + 2] = noise * 255; // Blue
            data[i + 3] = 255;         // Alpha
        }
        
        layer.ctx.putImageData(imageData, 0, 0);
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
        
        this.warpTime = time;
        this.warpStrength = 0.5 + totalEnergy * 2;
        
        // Apply complex warp transformations
        this.applyWarpEffects(audioData, audioMetrics);
        
        // Composite layers with different blend modes
        this.compositeLayers(audioMetrics);
        
        // Add feedback effect
        this.applyFeedback(totalEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, audioMetrics);
    }
    
    applyWarpEffects(audioData, audioMetrics) {
        const { time } = audioData;
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Get source layer
        const sourceLayer = this.layers[0];
        const targetLayer = this.layers[1];
        
        const sourceImageData = sourceLayer.ctx.getImageData(0, 0, this.width, this.height);
        const targetImageData = targetLayer.ctx.createImageData(this.width, this.height);
        
        const sourceData = sourceImageData.data;
        const targetData = targetImageData.data;
        
        // Complex UV transformations inspired by Milkdrop
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Normalize coordinates to [-1, 1]
                const u = (x / this.width) * 2 - 1;
                const v = (y / this.height) * 2 - 1;
                
                // Convert to polar coordinates
                const r = Math.sqrt(u * u + v * v);
                const theta = Math.atan2(v, u);
                
                // Apply multiple warp effects
                let newU = u;
                let newV = v;
                
                // Spiral warp
                const spiralStrength = bassEnergy * 2;
                const spiralFreq = 3 + midEnergy * 5;
                const spiralPhase = time * 2;
                const spiralWarp = Math.sin(r * spiralFreq + spiralPhase) * spiralStrength * 0.1;
                newU += Math.cos(theta + spiralWarp) * spiralWarp * 0.1;
                newV += Math.sin(theta + spiralWarp) * spiralWarp * 0.1;
                
                // Ripple effect
                const rippleStrength = trebleEnergy * 1.5;
                const rippleFreq = 8 + totalEnergy * 10;
                const ripplePhase = time * 3;
                const ripple = Math.sin(r * rippleFreq + ripplePhase) * rippleStrength * 0.05;
                newU += u * ripple;
                newV += v * ripple;
                
                // Twist effect
                const twistStrength = midEnergy * Math.PI;
                const twistRadius = 0.5 + bassEnergy * 0.5;
                if (r < twistRadius) {
                    const twistAmount = (1 - r / twistRadius) * twistStrength;
                    const newTheta = theta + twistAmount;
                    newU = r * Math.cos(newTheta);
                    newV = r * Math.sin(newTheta);
                }
                
                // Zoom and rotation
                const zoom = 1 + Math.sin(time * 0.5) * totalEnergy * 0.3;
                const rotation = time * totalEnergy * 0.5;
                const cosRot = Math.cos(rotation);
                const sinRot = Math.sin(rotation);
                
                const rotU = newU * cosRot - newV * sinRot;
                const rotV = newU * sinRot + newV * cosRot;
                
                newU = rotU * zoom;
                newV = rotV * zoom;
                
                // Convert back to screen coordinates
                const sourceX = Math.floor(((newU + 1) * 0.5) * this.width);
                const sourceY = Math.floor(((newV + 1) * 0.5) * this.height);
                
                // Sample from source with bounds checking
                const targetIndex = (y * this.width + x) * 4;
                
                if (sourceX >= 0 && sourceX < this.width && sourceY >= 0 && sourceY < this.height) {
                    const sourceIndex = (sourceY * this.width + sourceX) * 4;
                    
                    // Copy pixel with color modulation
                    const colorMod = 1 + Math.sin(time * 2 + r * 5) * totalEnergy * 0.3;
                    targetData[targetIndex] = Math.min(255, sourceData[sourceIndex] * colorMod);
                    targetData[targetIndex + 1] = Math.min(255, sourceData[sourceIndex + 1] * colorMod);
                    targetData[targetIndex + 2] = Math.min(255, sourceData[sourceIndex + 2] * colorMod);
                    targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
                } else {
                    // Fill with background color
                    const bgHue = (time * 50 + r * 100) % 360;
                    const rgb = this.hslToRgb(bgHue / 360, 0.5, 0.1);
                    targetData[targetIndex] = rgb[0];
                    targetData[targetIndex + 1] = rgb[1];
                    targetData[targetIndex + 2] = rgb[2];
                    targetData[targetIndex + 3] = 255;
                }
            }
        }
        
        targetLayer.ctx.putImageData(targetImageData, 0, 0);
        
        // Swap layers for next frame
        const temp = this.layers[0];
        this.layers[0] = this.layers[1];
        this.layers[1] = temp;
    }
    
    compositeLayers(audioMetrics) {
        const { total: totalEnergy, bass: bassEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Clear main canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw base layer
        this.ctx.globalAlpha = 0.8 + totalEnergy * 0.2;
        this.ctx.drawImage(this.layers[0].canvas, 0, 0);
        
        // Add second layer with blend mode
        this.ctx.globalAlpha = 0.3 + bassEnergy * 0.4;
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.drawImage(this.layers[1].canvas, 0, 0);
        
        // Add third layer for highlights
        if (this.layers[2]) {
            this.ctx.globalAlpha = 0.2 + trebleEnergy * 0.3;
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.drawImage(this.layers[2].canvas, 0, 0);
        }
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
    }
    
    applyFeedback(totalEnergy) {
        // Copy current frame to feedback buffer
        this.feedbackCtx.drawImage(this.canvas, 0, 0);
        
        // Apply feedback with decay
        this.ctx.globalAlpha = 0.95 - totalEnergy * 0.1;
        this.ctx.drawImage(this.feedbackCanvas, 0, 0);
        this.ctx.globalAlpha = 1;
    }
    
    addOverlayEffects(audioData, audioMetrics) {
        const { time } = audioData;
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Add energy-based particle effects
        if (totalEnergy > 0.4) {
            const particleCount = Math.floor(totalEnergy * 30);
            
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2 + time * 2;
                const radius = 50 + Math.sin(time * 3 + i * 0.5) * 30;
                const x = this.centerX + Math.cos(angle) * radius;
                const y = this.centerY + Math.sin(angle) * radius;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2 + trebleEnergy * 4, 0, Math.PI * 2);
                
                const hue = (i * 20 + time * 150) % 360;
                this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${totalEnergy * 0.8})`;
                this.ctx.fill();
            }
        }
        
        // Add frequency-based grid overlay
        if (midEnergy > 0.3) {
            this.ctx.strokeStyle = `hsla(${(time * 100) % 360}, 100%, 50%, ${midEnergy * 0.3})`;
            this.ctx.lineWidth = 1;
            
            const gridSize = 50 - midEnergy * 20;
            
            for (let x = 0; x < this.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }
            
            for (let y = 0; y < this.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.width, y);
                this.ctx.stroke();
            }
        }
        
        // Add bass-reactive center vortex
        if (bassEnergy > 0.3) {
            const vortexRadius = 30 + bassEnergy * 50;
            const spokes = 8;
            
            for (let spoke = 0; spoke < spokes; spoke++) {
                const angle = (spoke / spokes) * Math.PI * 2 + time * 2;
                const spokeLength = vortexRadius;
                
                this.ctx.beginPath();
                this.ctx.moveTo(this.centerX, this.centerY);
                this.ctx.lineTo(
                    this.centerX + Math.cos(angle) * spokeLength,
                    this.centerY + Math.sin(angle) * spokeLength
                );
                
                const hue = (spoke * 45 + time * 200) % 360;
                this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${bassEnergy})`;
                this.ctx.lineWidth = 2 + bassEnergy * 3;
                this.ctx.stroke();
            }
        }
    }
    
    cleanup() {
        this.layers.forEach(layer => {
            layer.canvas = null;
            layer.ctx = null;
        });
        this.layers = [];
        
        if (this.feedbackCanvas) {
            this.feedbackCanvas = null;
            this.feedbackCtx = null;
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('warpShader', WarpShaderVisualization);
    }
});
