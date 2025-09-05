class CircularSpectrumVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength } = audioData;
        
        const radius = Math.min(this.centerX, this.centerY) * 0.8;
        const angleStep = (Math.PI * 2) / bufferLength;
        
        for (let i = 0; i < bufferLength; i++) {
            const angle = i * angleStep;
            const barHeight = (frequencyData[i] / 255) * radius * 0.5;
            
            const x1 = this.centerX + Math.cos(angle) * radius;
            const y1 = this.centerY + Math.sin(angle) * radius;
            const x2 = this.centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = this.centerY + Math.sin(angle) * (radius + barHeight);
            
            this.ctx.strokeStyle = `hsl(${i * 2}, 100%, 60%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Draw center circle
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('circular', CircularSpectrumVisualization);
    }
});
