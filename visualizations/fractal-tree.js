class FractalTreeVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio energy
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Draw multiple fractal trees
        const treeCount = 3 + Math.floor(totalEnergy * 5);
        for (let t = 0; t < treeCount; t++) {
            const startX = (this.width / (treeCount + 1)) * (t + 1);
            const startY = this.height - 20;
            const initialLength = 60 + bassEnergy * 80;
            const initialAngle = -Math.PI / 2 + (Math.sin(time + t) * 0.3);
            const maxDepth = 8 + Math.floor(trebleEnergy * 4);
            
            this.drawBranch(startX, startY, initialLength, initialAngle, maxDepth, totalEnergy, t, time);
        }
    }
    
    // Recursive function to draw fractal branches
    drawBranch(x, y, length, angle, depth, energy, treeIndex, time) {
        if (depth <= 0 || length < 2) return;
        
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        // Color based on depth and audio
        const hue = (depth * 30 + treeIndex * 120 + time * 100) % 360;
        const brightness = 30 + energy * 70 + (depth / 8) * 40;
        const alpha = 0.6 + energy * 0.4;
        
        this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
        this.ctx.lineWidth = Math.max(1, depth * 0.8 + energy * 2);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
        
        // Add glow effect for higher energy
        if (energy > 0.3) {
            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness + 20}%, ${alpha * 0.3})`;
            this.ctx.lineWidth = Math.max(2, depth * 1.5 + energy * 4);
            this.ctx.stroke();
        }
        
        // Calculate branch parameters
        const lengthReduction = 0.7 + energy * 0.2;
        const angleVariation = 0.4 + energy * 0.6;
        const branchCount = 2 + (energy > 0.5 ? 1 : 0);
        
        // Draw child branches
        for (let i = 0; i < branchCount; i++) {
            const newAngle = angle + (i === 0 ? -angleVariation : angleVariation) + 
                           Math.sin(time * 2 + depth + treeIndex) * 0.2;
            const newLength = length * lengthReduction;
            
            this.drawBranch(endX, endY, newLength, newAngle, depth - 1, energy, treeIndex, time);
        }
        
        // Add leaves/flowers at branch tips
        if (depth <= 2 && energy > 0.2) {
            this.ctx.beginPath();
            this.ctx.arc(endX, endY, 3 + energy * 5, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue + 180}, 100%, 70%, ${alpha})`;
            this.ctx.fill();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('fractalTree', FractalTreeVisualization);
    }
});
