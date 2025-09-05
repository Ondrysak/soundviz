class CombinedViewVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        
        // Create instances of the visualizations we want to combine
        this.frequencyBars = new FrequencyBarsVisualization(ctx, width, height / 2);
        this.waveform = new WaveformVisualization(ctx, width, height / 2);
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        
        // Update the sub-visualizations
        this.frequencyBars.onResize(width, height / 2);
        this.waveform.onResize(width, height / 2);
    }
    
    draw(audioData) {
        // Draw frequency bars in the bottom half
        this.ctx.save();
        this.ctx.translate(0, this.height / 2);
        this.ctx.scale(1, 0.5);
        
        // Create modified audio data for the frequency bars
        const freqAudioData = {
            ...audioData,
            canvas: { width: this.width, height: this.height }
        };
        
        this.frequencyBars.draw(freqAudioData);
        this.ctx.restore();
        
        // Draw waveform in the top half
        this.ctx.save();
        this.ctx.translate(0, 0);
        this.ctx.scale(1, 0.5);
        
        // Create modified audio data for the waveform
        const waveAudioData = {
            ...audioData,
            canvas: { width: this.width, height: this.height }
        };
        
        this.waveform.draw(waveAudioData);
        this.ctx.restore();
        
        // Draw separator line
        this.ctx.strokeStyle = '#666';
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
        window.audioVisualizer.registerVisualization('combined', CombinedViewVisualization);
    }
});
