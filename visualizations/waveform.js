class WaveformVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { timeData } = audioData;
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.beginPath();
        
        const sliceWidth = this.width / timeData.length;
        let x = 0;
        
        for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
            const y = v * this.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
        
        // Add center line
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('waveform', WaveformVisualization);
    }
});
