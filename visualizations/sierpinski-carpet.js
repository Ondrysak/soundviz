class SierpinskiCarpetVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Sierpinski carpet parameters
        this.maxDepth = 6;
        this.currentDepth = 4;
        this.carpetSize = 300;
        
        // Frequency band mapping
        this.frequencyBands = 8;
        this.bandActivation = new Array(this.frequencyBands).fill(0);
        this.bandHistory = [];
        this.maxHistoryLength = 60;
        
        // Visual state
        this.activeSquares = new Set();
        this.removedSquares = new Set();
        this.squareFlashTimes = new Map();
        this.squareColors = new Map();
        
        // Pre-compute square hierarchy
        this.squareHierarchy = [];
        this.computeSquareHierarchy();
        
        // Color mapping for frequency bands
        this.bandColors = [
            { hue: 0, name: 'Sub Bass' },      // Red
            { hue: 30, name: 'Bass' },         // Orange
            { hue: 60, name: 'Low Mid' },      // Yellow
            { hue: 120, name: 'Mid' },         // Green
            { hue: 180, name: 'High Mid' },    // Cyan
            { hue: 240, name: 'Presence' },    // Blue
            { hue: 280, name: 'Brilliance' },  // Purple
            { hue: 320, name: 'Air' }          // Magenta
        ];
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.carpetSize = Math.min(width, height) * 0.8;
        this.initialize();
    }
    
    computeSquareHierarchy() {
        this.squareHierarchy = [];
        
        // Base square
        const baseSquare = {
            depth: 0,
            x: this.centerX - this.carpetSize / 2,
            y: this.centerY - this.carpetSize / 2,
            size: this.carpetSize,
            id: '0',
            gridX: 0,
            gridY: 0,
            gridSize: 1
        };
        
        this.squareHierarchy.push(baseSquare);
        this.computeSubSquares(baseSquare, 1);
    }
    
    computeSubSquares(parentSquare, depth) {
        if (depth > this.maxDepth) return;
        
        const { x, y, size, id } = parentSquare;
        const newSize = size / 3;
        const gridSize = Math.pow(3, depth);
        
        // Create 3x3 grid, skip center square (that's the hole)
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (i === 1 && j === 1) continue; // Skip center square
                
                const newSquare = {
                    depth: depth,
                    x: x + i * newSize,
                    y: y + j * newSize,
                    size: newSize,
                    id: id + i + j,
                    gridX: parentSquare.gridX * 3 + i,
                    gridY: parentSquare.gridY * 3 + j,
                    gridSize: gridSize
                };
                
                this.squareHierarchy.push(newSquare);
                this.computeSubSquares(newSquare, depth + 1);
            }
        }
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Analyze frequency bands
        this.analyzeFrequencyBands(frequencyData, bufferLength);
        
        // Update visual state based on frequency analysis
        this.updateVisualState(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Draw the Sierpinski carpet
        this.drawSierpinskiCarpet(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    analyzeFrequencyBands(frequencyData, bufferLength) {
        const bandSize = Math.floor(bufferLength / this.frequencyBands);
        
        // Calculate energy for each frequency band
        for (let band = 0; band < this.frequencyBands; band++) {
            let bandEnergy = 0;
            const startIndex = band * bandSize;
            const endIndex = Math.min(startIndex + bandSize, bufferLength);
            
            for (let i = startIndex; i < endIndex; i++) {
                bandEnergy += frequencyData[i] / 255;
            }
            
            this.bandActivation[band] = bandEnergy / bandSize;
        }
        
        // Store band history
        this.bandHistory.push([...this.bandActivation]);
        if (this.bandHistory.length > this.maxHistoryLength) {
            this.bandHistory.shift();
        }
    }
    
    updateVisualState(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Update depth based on total energy
        this.currentDepth = Math.floor(3 + totalEnergy * 3);
        this.currentDepth = Math.min(this.maxDepth, this.currentDepth);
        
        // Map frequency bands to subdivision levels
        this.updateSquareActivation();
        
        // Clean up old effects
        this.cleanupEffects(time);
    }
    
    updateSquareActivation() {
        // Clear previous activations
        this.activeSquares.clear();
        
        // For each frequency band, activate squares at corresponding depth
        for (let band = 0; band < this.frequencyBands; band++) {
            const activation = this.bandActivation[band];
            
            if (activation > 0.3) { // Threshold for activation
                // Map band to depth (higher frequencies = deeper levels)
                const targetDepth = Math.floor(1 + (band / this.frequencyBands) * (this.currentDepth - 1));
                
                // Find squares at this depth
                const squaresAtDepth = this.squareHierarchy.filter(s => s.depth === targetDepth);
                
                // Activate a portion of squares based on energy
                const numToActivate = Math.floor(activation * squaresAtDepth.length * 0.5);
                
                // Select squares to activate (prefer those that correspond to the frequency band)
                const selectedSquares = this.selectSquaresForBand(squaresAtDepth, band, numToActivate);
                
                for (const square of selectedSquares) {
                    this.activeSquares.add(square.id);
                    this.squareColors.set(square.id, {
                        band: band,
                        energy: activation,
                        time: Date.now()
                    });
                }
            }
        }
    }
    
    selectSquaresForBand(squares, band, count) {
        // Select squares that spatially correspond to the frequency band
        const bandPosition = band / this.frequencyBands; // 0 to 1
        
        // Sort squares by their position relative to the band
        const sortedSquares = squares.sort((a, b) => {
            // Map square position to 0-1 range
            const aPos = (a.gridX + a.gridY * a.gridSize) / (a.gridSize * a.gridSize);
            const bPos = (b.gridX + b.gridY * b.gridSize) / (b.gridSize * b.gridSize);
            
            // Distance from band position
            const aDist = Math.abs(aPos - bandPosition);
            const bDist = Math.abs(bPos - bandPosition);
            
            return aDist - bDist;
        });
        
        return sortedSquares.slice(0, count);
    }
    
    cleanupEffects(time) {
        const currentTime = Date.now();
        const effectDuration = 1000; // 1 second
        
        // Remove expired effects
        for (const [squareId, flashTime] of this.squareFlashTimes.entries()) {
            if (currentTime - flashTime > effectDuration) {
                this.removedSquares.delete(squareId);
                this.squareFlashTimes.delete(squareId);
            }
        }
        
        // Clean up old color data
        for (const [squareId, colorData] of this.squareColors.entries()) {
            if (currentTime - colorData.time > effectDuration * 2) {
                this.squareColors.delete(squareId);
            }
        }
    }
    
    drawSierpinskiCarpet(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw squares by depth (back to front for proper layering)
        for (let depth = this.currentDepth; depth >= 0; depth--) {
            const squaresAtDepth = this.squareHierarchy.filter(s => s.depth === depth);
            
            for (const square of squaresAtDepth) {
                if (this.removedSquares.has(square.id)) {
                    continue; // Skip removed squares
                }
                
                const isActive = this.activeSquares.has(square.id);
                const colorData = this.squareColors.get(square.id);
                
                this.drawSquare(square, isActive, colorData, totalEnergy, time);
            }
        }
        
        // Draw the holes (center squares that create the fractal pattern)
        this.drawHoles(totalEnergy, time);
    }
    
    drawSquare(square, isActive, colorData, totalEnergy, time) {
        const { x, y, size, depth } = square;
        
        // Base color
        let hue = 240; // Default blue
        let saturation = 50;
        let lightness = 20 + (1 - depth / this.maxDepth) * 30;
        let alpha = 0.6;
        
        if (isActive && colorData) {
            // Use frequency band color
            const bandColor = this.bandColors[colorData.band];
            hue = bandColor.hue;
            saturation = 70 + colorData.energy * 30;
            lightness = 40 + colorData.energy * 50;
            alpha = 0.7 + colorData.energy * 0.3;
            
            // Add time-based variation
            hue += Math.sin(time * 2 + depth) * 20;
        }
        
        // Audio-reactive pulsing
        const pulse = Math.sin(time * 4 + square.gridX + square.gridY) * totalEnergy * 0.05;
        const adjustedSize = size * (1 + pulse);
        const offset = (size - adjustedSize) / 2;
        
        // Set fill style
        this.ctx.fillStyle = `hsla(${hue % 360}, ${saturation}%, ${lightness}%, ${alpha})`;
        
        // Add glow effect for active squares
        if (isActive && colorData && colorData.energy > 0.5) {
            this.ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${colorData.energy * 0.8})`;
            this.ctx.shadowBlur = 5 + colorData.energy * 10;
        } else {
            this.ctx.shadowBlur = 0;
        }
        
        // Draw the square
        this.ctx.fillRect(x + offset, y + offset, adjustedSize, adjustedSize);
        
        // Draw outline for high energy
        if (isActive && colorData && colorData.energy > 0.6) {
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha})`;
            this.ctx.lineWidth = 1 + colorData.energy * 2;
            this.ctx.strokeRect(x + offset, y + offset, adjustedSize, adjustedSize);
        }
    }
    
    drawHoles(totalEnergy, time) {
        // Draw the characteristic holes of the Sierpinski carpet
        // These are the removed center squares at each level
        
        for (let depth = 1; depth <= this.currentDepth; depth++) {
            const holeSize = this.carpetSize / Math.pow(3, depth);
            const gridSize = Math.pow(3, depth - 1);
            
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    // Calculate hole position
                    const holeX = this.centerX - this.carpetSize / 2 + 
                                 (i * 3 + 1) * holeSize;
                    const holeY = this.centerY - this.carpetSize / 2 + 
                                 (j * 3 + 1) * holeSize;
                    
                    // Draw hole outline for high energy
                    if (totalEnergy > 0.5) {
                        this.ctx.strokeStyle = `hsla(${(time * 50 + i * 30 + j * 30) % 360}, 70%, 60%, ${totalEnergy * 0.3})`;
                        this.ctx.lineWidth = 1;
                        this.ctx.strokeRect(holeX, holeY, holeSize, holeSize);
                    }
                }
            }
        }
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw frequency band visualization
        this.drawFrequencyBands(time, totalEnergy);
        
        // Draw carpet info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(240, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Sierpinski Carpet - Depth: ${this.currentDepth}`, 20, 30);
            this.ctx.fillText(`Active Squares: ${this.activeSquares.size}`, 20, 50);
            this.ctx.fillText(`Total Squares: ${this.squareHierarchy.length}`, 20, 70);
        }
        
        // Draw fractal dimension info
        if (totalEnergy > 0.6) {
            this.ctx.fillStyle = `hsla(280, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`Fractal Dimension: ~1.893`, 20, this.height - 30);
        }
    }
    
    drawFrequencyBands(time, totalEnergy) {
        // Draw frequency band indicators
        const bandWidth = 30;
        const bandHeight = 100;
        const startX = this.width - (this.frequencyBands * bandWidth + 20);
        const startY = 50;
        
        for (let band = 0; band < this.frequencyBands; band++) {
            const activation = this.bandActivation[band];
            const bandColor = this.bandColors[band];
            
            const x = startX + band * bandWidth;
            const barHeight = activation * bandHeight;
            
            // Draw band bar
            this.ctx.fillStyle = `hsla(${bandColor.hue}, 70%, 50%, ${0.6 + activation * 0.4})`;
            this.ctx.fillRect(x, startY + bandHeight - barHeight, bandWidth - 2, barHeight);
            
            // Draw band outline
            this.ctx.strokeStyle = `hsla(${bandColor.hue}, 70%, 70%, 0.8)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, startY, bandWidth - 2, bandHeight);
            
            // Draw band label
            if (totalEnergy > 0.4) {
                this.ctx.fillStyle = `hsla(${bandColor.hue}, 70%, 80%, ${0.8 + activation * 0.2})`;
                this.ctx.font = '10px monospace';
                this.ctx.save();
                this.ctx.translate(x + bandWidth / 2, startY + bandHeight + 15);
                this.ctx.rotate(-Math.PI / 4);
                this.ctx.fillText(bandColor.name, -20, 0);
                this.ctx.restore();
            }
        }
        
        // Draw frequency spectrum title
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(240, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Frequency Bands', startX, startY - 10);
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('sierpinskiCarpet', SierpinskiCarpetVisualization);
    }
});
