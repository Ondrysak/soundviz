class KaleidoscopeVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        const segments = 8; // Number of kaleidoscope segments
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const avgAmplitude = audioMetrics.total;
        
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        
        // Draw kaleidoscope segments
        for (let segment = 0; segment < segments; segment++) {
            this.ctx.save();
            this.ctx.rotate((segment * Math.PI * 2) / segments);
            
            // Clip to segment
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, Math.max(this.width, this.height), 0, Math.PI / segments);
            this.ctx.closePath();
            this.ctx.clip();
            
            // Draw morphing shapes within segment
            const shapeCount = 5;
            for (let shape = 0; shape < shapeCount; shape++) {
                const freqIndex = Math.floor((shape / shapeCount) * bufferLength);
                const freqValue = frequencyData[freqIndex] / 255;
                
                const radius = 50 + shape * 30 + freqValue * 100;
                const sides = 3 + Math.floor(freqValue * 5);
                const rotation = time * (1 + shape * 0.3) + segment * 0.5;
                const size = 10 + freqValue * 20 + Math.sin(time * 2 + shape) * 5;
                
                const hue = (segment * 45 + shape * 72 + time * 150) % 360;
                const brightness = 40 + freqValue * 60;
                const alpha = 0.3 + freqValue * 0.4;
                
                this.ctx.save();
                this.ctx.rotate(rotation);
                this.ctx.translate(radius, 0);
                
                // Draw morphing polygon
                this.drawPolygon(0, 0, size, sides);
                
                // Fill with gradient
                const gradient = this.createRadialGradient(0, 0, 0, 0, size, [
                    { offset: 0, color: `hsla(${hue}, 100%, ${brightness + 20}%, ${alpha})` },
                    { offset: 1, color: `hsla(${hue + 60}, 100%, ${brightness}%, ${alpha * 0.5})` }
                ]);
                
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
                
                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness + 30}%, ${alpha * 0.8})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
            
            // Add fractal-like details
            for (let detail = 0; detail < 3; detail++) {
                const detailFreqIndex = Math.floor((detail / 3) * bufferLength);
                const detailFreqValue = frequencyData[detailFreqIndex] / 255;
                
                const detailRadius = 20 + detail * 15 + detailFreqValue * 30;
                const detailRotation = time * (2 + detail * 0.5) + segment * 0.3;
                
                this.ctx.save();
                this.ctx.rotate(detailRotation);
                this.ctx.translate(detailRadius, 0);
                this.ctx.scale(0.5 + detailFreqValue * 0.5, 0.5 + detailFreqValue * 0.5);
                
                const detailHue = (segment * 30 + detail * 120 + time * 200) % 360;
                this.ctx.fillStyle = `hsla(${detailHue}, 100%, 70%, ${0.2 + detailFreqValue * 0.3})`;
                
                this.drawHexagon(0, 0, 8 + detailFreqValue * 12);
                this.ctx.fill();
                
                this.ctx.restore();
            }
            
            this.ctx.restore();
        }
        
        // Add central mandala
        const centralRadius = 20 + avgAmplitude * 30;
        const centralHue = (time * 100) % 360;
        
        this.ctx.strokeStyle = `hsla(${centralHue}, 100%, 80%, 0.8)`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, centralRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Add rotating spokes
        for (let spoke = 0; spoke < 12; spoke++) {
            const spokeAngle = (spoke / 12) * Math.PI * 2 + time;
            const spokeLength = centralRadius + avgAmplitude * 20;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(spokeAngle) * spokeLength, Math.sin(spokeAngle) * spokeLength);
            this.ctx.strokeStyle = `hsla(${centralHue + spoke * 30}, 100%, 70%, 0.6)`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('kaleidoscope', KaleidoscopeVisualization);
    }
});
