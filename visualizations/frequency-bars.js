class FrequencyBarsVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength } = audioData;
        
        const barWidth = this.width / bufferLength * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (frequencyData[i] / 255) * this.height * 0.8;
            
            // Create gradient for each bar
            const gradient = this.createLinearGradient(
                0, this.height, 
                0, this.height - barHeight,
                [
                    { offset: 0, color: `hsl(${i * 2}, 100%, 50%)` },
                    { offset: 1, color: `hsl(${i * 2 + 60}, 100%, 70%)` }
                ]
            );
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, this.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('frequency', FrequencyBarsVisualization);
    }
});
