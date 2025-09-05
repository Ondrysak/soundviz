class FractalSpiralVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Draw multiple nested spirals
        const spiralCount = 5;
        for (let s = 0; s < spiralCount; s++) {
            const spiralOffset = s * Math.PI / spiralCount;
            const baseRadius = 10 + s * 15;
            const maxRadius = 150 + bassEnergy * 100;
            const turns = 8 + trebleEnergy * 12;
            const points = 500;
            
            this.ctx.beginPath();
            
            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const angle = t * turns * Math.PI * 2 + spiralOffset + time * (0.5 + s * 0.2);
                
                // Fibonacci-like spiral with audio modulation
                const radius = baseRadius + t * maxRadius * (1 + Math.sin(angle * 0.5) * midEnergy * 0.5);
                
                // Add audio-based perturbations
                const perturbation = Math.sin(angle * 3 + time * 2) * totalEnergy * 20;
                const finalRadius = radius + perturbation;
                
                const x = this.centerX + Math.cos(angle) * finalRadius;
                const y = this.centerY + Math.sin(angle) * finalRadius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
                
                // Draw spiral nodes at regular intervals
                if (i % 20 === 0 && totalEnergy > 0.2) {
                    const nodeSize = 2 + totalEnergy * 6;
                    const hue = (angle * 50 + s * 72 + time * 200) % 360;
                    
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${0.6 + totalEnergy * 0.4})`;
                    this.ctx.fill();
                    
                    // Add glow
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, nodeSize * 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.1 + totalEnergy * 0.2})`;
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
            
            // Style the spiral line
            const hue = (s * 60 + time * 100) % 360;
            const brightness = 40 + totalEnergy * 60;
            const alpha = 0.4 + totalEnergy * 0.4;
            
            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
            this.ctx.lineWidth = 1 + totalEnergy * 3;
            this.ctx.stroke();
            
            // Add glow effect
            if (totalEnergy > 0.3) {
                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness + 20}%, ${alpha * 0.3})`;
                this.ctx.lineWidth = 3 + totalEnergy * 6;
                this.ctx.stroke();
            }
        }
        
        // Draw central mandala
        const centralRadius = 20 + bassEnergy * 30;
        const spokes = 12;
        
        for (let i = 0; i < spokes; i++) {
            const angle = (i / spokes) * Math.PI * 2 + time;
            const spokeLength = centralRadius + Math.sin(time * 3 + i) * 10;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(
                this.centerX + Math.cos(angle) * spokeLength,
                this.centerY + Math.sin(angle) * spokeLength
            );
            
            const hue = (i * 30 + time * 150) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.6 + totalEnergy * 0.4})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // Central pulsing circle
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, centralRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(time * 200) % 360}, 100%, 60%, ${0.3 + totalEnergy * 0.5})`;
        this.ctx.fill();
        this.ctx.strokeStyle = `hsla(${(time * 200) % 360}, 100%, 80%, ${0.8})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('fractalSpiral', FractalSpiralVisualization);
    }
});
