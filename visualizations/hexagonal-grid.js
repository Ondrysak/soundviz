class HexagonalGridVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        this.hexGrid = [];
        this.initializeHexGrid();
    }
    
    initializeHexGrid() {
        this.hexGrid = [];
        const hexSize = 25;
        const hexWidth = hexSize * 2;
        const hexHeight = hexSize * Math.sqrt(3);
        
        for (let row = 0; row < Math.ceil(this.height / hexHeight) + 1; row++) {
            for (let col = 0; col < Math.ceil(this.width / hexWidth) + 1; col++) {
                const x = col * hexWidth * 0.75;
                const y = row * hexHeight + (col % 2) * hexHeight * 0.5;
                
                this.hexGrid.push({
                    x: x,
                    y: y,
                    size: hexSize,
                    baseSize: hexSize,
                    freqIndex: (row * 10 + col) % 1024 // Default buffer length
                });
            }
        }
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initializeHexGrid();
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        for (let hex of this.hexGrid) {
            if (hex.x > -50 && hex.x < this.width + 50 && 
                hex.y > -50 && hex.y < this.height + 50) {
                
                const freqValue = frequencyData[hex.freqIndex % bufferLength] / 255;
                const size = hex.baseSize * (0.3 + freqValue * 1.5);
                const hue = (hex.freqIndex * 3 + time * 50) % 360;
                const brightness = 30 + freqValue * 70;
                
                this.ctx.fillStyle = `hsl(${hue}, 100%, ${brightness}%)`;
                this.ctx.strokeStyle = `hsl(${hue}, 100%, ${Math.min(brightness + 20, 90)}%)`;
                this.ctx.lineWidth = 1;
                
                this.drawHexagon(hex.x, hex.y, size);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('hexGrid', HexagonalGridVisualization);
    }
});
