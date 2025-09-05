class RotatingHexagonsVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate average amplitude for global effects
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const avgAmplitude = audioMetrics.total;
        
        // Draw multiple layers of rotating hexagons
        const layers = 5;
        for (let layer = 0; layer < layers; layer++) {
            const radius = 50 + layer * 40 + avgAmplitude * 50;
            const hexCount = 6 + layer * 2;
            const rotation = time * (0.5 + layer * 0.2) + layer * Math.PI / 6;
            
            for (let i = 0; i < hexCount; i++) {
                const angle = (i / hexCount) * Math.PI * 2 + rotation;
                const x = this.centerX + Math.cos(angle) * radius;
                const y = this.centerY + Math.sin(angle) * radius;
                
                const freqIndex = Math.floor((i / hexCount) * bufferLength);
                const freqValue = frequencyData[freqIndex] / 255;
                
                const size = 15 + freqValue * 25 + Math.sin(time * 3 + layer) * 5;
                const hue = (layer * 60 + i * 30 + time * 100) % 360;
                const brightness = 40 + freqValue * 60;
                const alpha = 0.7 + freqValue * 0.3;
                
                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(time * (1 + layer * 0.5) + i * 0.5);
                
                this.ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${Math.min(brightness + 30, 90)}%, ${alpha})`;
                this.ctx.lineWidth = 2;
                
                this.drawHexagon(0, 0, size);
                this.ctx.fill();
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }
        
        // Add central pulsing hexagon
        const centralSize = 30 + avgAmplitude * 40;
        const centralHue = (time * 200) % 360;
        this.ctx.fillStyle = `hsla(${centralHue}, 100%, 70%, 0.8)`;
        this.ctx.strokeStyle = `hsla(${centralHue}, 100%, 90%, 0.9)`;
        this.ctx.lineWidth = 3;
        
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(time * 2);
        this.drawHexagon(0, 0, centralSize);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('hexRotate', RotatingHexagonsVisualization);
    }
});
