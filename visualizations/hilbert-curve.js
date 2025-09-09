class HilbertCurveVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Hilbert curve parameters
        this.maxOrder = 8;
        this.currentOrder = 5;
        this.animationSpeed = 0.025;
        
        // Audio-reactive parameters
        this.drawProgress = 0;
        this.colorMode = 0; // 0: spectrum, 1: energy, 2: frequency bands
        this.energyHistory = [];
        this.maxHistoryLength = 2048;
        
        // Pre-compute Hilbert curve points for different orders
        this.hilbertPoints = {};
        this.precomputeHilbertCurves();
        
        // Drawing state
        this.segmentColors = [];
        this.lastUpdateTime = 0;
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initialize();
    }
    
    precomputeHilbertCurves() {
        for (let order = 1; order <= this.maxOrder; order++) {
            this.hilbertPoints[order] = this.generateHilbertCurve(order);
        }
    }
    
    generateHilbertCurve(order) {
        const points = [];
        const n = Math.pow(2, order);
        
        for (let i = 0; i < n * n; i++) {
            const [x, y] = this.hilbertIndexToXY(i, order);
            points.push({ x, y, index: i });
        }
        
        return points;
    }
    
    hilbertIndexToXY(index, order) {
        // Convert Hilbert curve index to x,y coordinates
        const n = Math.pow(2, order);
        let x = 0, y = 0;
        let t = index;
        
        for (let s = 1; s < n; s *= 2) {
            const rx = 1 & (t / 2);
            const ry = 1 & (t ^ rx);
            [x, y] = this.rotateQuadrant(s, x, y, rx, ry);
            x += s * rx;
            y += s * ry;
            t /= 4;
        }
        
        return [x, y];
    }
    
    rotateQuadrant(n, x, y, rx, ry) {
        if (ry === 0) {
            if (rx === 1) {
                x = n - 1 - x;
                y = n - 1 - y;
            }
            // Swap x and y
            [x, y] = [y, x];
        }
        return [x, y];
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Store audio data for waveform mapping
        this.storeAudioHistory(frequencyData, bufferLength, audioMetrics, time);
        
        // Update parameters based on audio
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Draw the Hilbert curve
        this.drawHilbertCurve(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    storeAudioHistory(frequencyData, bufferLength, audioMetrics, time) {
        // Store detailed audio information for mapping to curve
        const audioFrame = {
            frequencyData: Array.from(frequencyData),
            metrics: audioMetrics,
            time: time
        };
        
        this.energyHistory.push(audioFrame);
        
        // Keep history within limits
        if (this.energyHistory.length > this.maxHistoryLength) {
            this.energyHistory.shift();
        }
    }
    
    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Order based on total energy (higher default for denser curves)
        this.currentOrder = Math.floor(4 + totalEnergy * 3);
        this.currentOrder = Math.min(this.maxOrder, this.currentOrder);

        // Animation speed based on mid frequencies (faster progression)
        this.animationSpeed = 0.015 + midEnergy * 0.04;
        
        // Color mode cycling based on treble
        if (trebleEnergy > 0.8 && Math.random() < 0.1) {
            this.colorMode = (this.colorMode + 1) % 3;
        }
        
        // Update draw progress (faster progression for better performance)
        this.drawProgress += this.animationSpeed + totalEnergy * 0.02;
        if (this.drawProgress > 1) {
            this.drawProgress = 0; // Reset for continuous animation
        }
    }
    
    drawHilbertCurve(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const points = this.hilbertPoints[this.currentOrder] || [];
        
        if (points.length === 0) return;
        
        // Calculate curve dimensions and scaling
        const n = Math.pow(2, this.currentOrder);
        const availableWidth = Math.min(this.width - 100, this.height - 100);
        const scale = availableWidth / n;
        const offsetX = (this.width - n * scale) / 2;
        const offsetY = (this.height - n * scale) / 2;
        
        // Calculate how many segments to draw
        const totalSegments = points.length - 1;
        const segmentsToDraw = Math.floor(totalSegments * this.drawProgress);
        
        // Batch drawing for better performance
        const batchSize = Math.max(1, Math.floor(segmentsToDraw / 20)); // Draw in batches

        // Draw the curve segments in batches
        for (let batch = 0; batch < segmentsToDraw; batch += batchSize) {
            const batchEnd = Math.min(batch + batchSize, segmentsToDraw);

            // Start a path for this batch
            this.ctx.beginPath();
            let lastColor = '';
            let lastWidth = 1;

            for (let i = batch; i < batchEnd; i++) {
                const currentPoint = points[i];
                const nextPoint = points[i + 1];

                if (!currentPoint || !nextPoint) continue;

                // Convert to screen coordinates
                const x1 = offsetX + currentPoint.x * scale + scale / 2;
                const y1 = offsetY + currentPoint.y * scale + scale / 2;
                const x2 = offsetX + nextPoint.x * scale + scale / 2;
                const y2 = offsetY + nextPoint.y * scale + scale / 2;

                // Get color for this segment
                const segmentColor = this.getSegmentColor(i, totalSegments, audioData, totalEnergy);
                const lineWidth = this.getSegmentWidth(i, totalSegments, audioData, totalEnergy);

                // If color or width changed, stroke previous batch and start new one
                if (segmentColor !== lastColor || lineWidth !== lastWidth) {
                    if (lastColor) {
                        this.ctx.strokeStyle = lastColor;
                        this.ctx.lineWidth = lastWidth;
                        this.ctx.stroke();
                        this.ctx.beginPath();
                    }
                    lastColor = segmentColor;
                    lastWidth = lineWidth;
                }

                // Add line to current path
                if (i === batch || segmentColor !== lastColor) {
                    this.ctx.moveTo(x1, y1);
                }
                this.ctx.lineTo(x2, y2);

                // Draw energy nodes at high energy points (less frequently for performance)
                const segmentEnergy = this.getSegmentEnergy(i, totalSegments);
                if (segmentEnergy > 0.8 && i % 5 === 0) {
                    this.drawEnergyNode(x1, y1, segmentEnergy, i, time);
                }
            }

            // Stroke the final batch
            if (lastColor) {
                this.ctx.strokeStyle = lastColor;
                this.ctx.lineWidth = lastWidth;
                this.ctx.shadowBlur = 0; // Disable shadow for performance
                this.ctx.stroke();
            }
        }
        
        // Draw current position indicator
        if (segmentsToDraw < totalSegments) {
            const currentPoint = points[segmentsToDraw];
            if (currentPoint) {
                const x = offsetX + currentPoint.x * scale + scale / 2;
                const y = offsetY + currentPoint.y * scale + scale / 2;
                this.drawPositionIndicator(x, y, totalEnergy, time);
            }
        }
    }
    
    getSegmentColor(segmentIndex, totalSegments, audioData, totalEnergy) {
        const { time } = audioData;
        const progress = segmentIndex / totalSegments;
        
        switch (this.colorMode) {
            case 0: // Spectrum mapping
                return this.getSpectrumColor(progress, time, totalEnergy);
            
            case 1: // Energy mapping
                return this.getEnergyColor(segmentIndex, totalSegments, totalEnergy);
            
            case 2: // Frequency bands
                return this.getFrequencyBandColor(segmentIndex, totalSegments, audioData, time);
            
            default:
                return this.getSpectrumColor(progress, time, totalEnergy);
        }
    }
    
    getSpectrumColor(progress, time, totalEnergy) {
        const hue = (progress * 360 + time * 30) % 360;
        const saturation = 70 + totalEnergy * 30;
        const lightness = 40 + totalEnergy * 40;
        
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.7 + totalEnergy * 0.3})`;
    }
    
    getEnergyColor(segmentIndex, totalSegments, totalEnergy) {
        const segmentEnergy = this.getSegmentEnergy(segmentIndex, totalSegments);
        
        // Map energy to color temperature
        const hue = segmentEnergy > 0.7 ? 0 : segmentEnergy > 0.4 ? 60 : 240; // Red, yellow, blue
        const saturation = 80 + segmentEnergy * 20;
        const lightness = 30 + segmentEnergy * 60;
        
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 + segmentEnergy * 0.4})`;
    }
    
    getFrequencyBandColor(segmentIndex, totalSegments, audioData, time) {
        const { frequencyData, bufferLength } = audioData;
        
        // Map segment position to frequency band
        const bandIndex = Math.floor((segmentIndex / totalSegments) * bufferLength);
        const frequency = frequencyData[bandIndex] / 255;
        
        const hue = (bandIndex / bufferLength) * 360;
        const saturation = 70 + frequency * 30;
        const lightness = 30 + frequency * 60;
        
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.6 + frequency * 0.4})`;
    }
    
    getSegmentEnergy(segmentIndex, totalSegments) {
        // Map segment to audio history
        if (this.energyHistory.length === 0) return 0.5;
        
        const historyIndex = Math.floor((this.energyHistory.length - 1) * (segmentIndex / totalSegments));
        const audioFrame = this.energyHistory[historyIndex];
        
        return audioFrame ? audioFrame.metrics.total : 0.5;
    }
    
    getSegmentWidth(segmentIndex, totalSegments, audioData, totalEnergy) {
        const segmentEnergy = this.getSegmentEnergy(segmentIndex, totalSegments);
        return 1 + segmentEnergy * 4 + totalEnergy * 2;
    }
    
    drawEnergyNode(x, y, energy, index, time) {
        const nodeSize = 2 + energy * 4;
        const pulseSize = Math.sin(time * 4 + index * 0.1) * energy * 2;
        
        // Outer glow
        this.ctx.beginPath();
        this.ctx.arc(x, y, nodeSize + pulseSize, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(index * 5 + time * 100) % 360}, 100%, 70%, ${energy * 0.4})`;
        this.ctx.fill();
        
        // Inner core
        this.ctx.beginPath();
        this.ctx.arc(x, y, nodeSize * 0.6, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(index * 5 + time * 100) % 360}, 100%, 90%, ${energy})`;
        this.ctx.fill();
    }
    
    drawPositionIndicator(x, y, energy, time) {
        const size = 5 + energy * 5;
        const pulse = Math.sin(time * 8) * 3;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, size + pulse, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(60, 100%, 80%, ${0.8 + energy * 0.2})`;
        this.ctx.fill();
        
        // Inner dot
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw curve info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(200, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Hilbert Curve Order: ${this.currentOrder}`, 20, 30);
            this.ctx.fillText(`Points: ${Math.pow(4, this.currentOrder)}`, 20, 50);
            this.ctx.fillText(`Progress: ${(this.drawProgress * 100).toFixed(1)}%`, 20, 70);
            
            const colorModes = ['Spectrum', 'Energy', 'Frequency'];
            this.ctx.fillText(`Color Mode: ${colorModes[this.colorMode]}`, 20, 90);
        }
        
        // Draw space-filling property visualization
        if (totalEnergy > 0.5) {
            this.drawSpaceFillingVisualization(time, totalEnergy);
        }
        
        // Draw audio waveform mapping
        if (totalEnergy > 0.6) {
            this.drawAudioMapping(time, totalEnergy, trebleEnergy);
        }
    }
    
    drawSpaceFillingVisualization(time, totalEnergy) {
        // Show how the curve fills space
        const gridSize = 8;
        const cellSize = 20;
        const startX = this.width - gridSize * cellSize - 20;
        const startY = 20;
        
        this.ctx.strokeStyle = `hsla(200, 50%, 50%, ${0.3 + totalEnergy * 0.2})`;
        this.ctx.lineWidth = 1;
        
        // Draw grid
        for (let i = 0; i <= gridSize; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(startX + i * cellSize, startY);
            this.ctx.lineTo(startX + i * cellSize, startY + gridSize * cellSize);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY + i * cellSize);
            this.ctx.lineTo(startX + gridSize * cellSize, startY + i * cellSize);
            this.ctx.stroke();
        }
        
        // Highlight filled cells based on progress
        const totalCells = gridSize * gridSize;
        const filledCells = Math.floor(totalCells * this.drawProgress);
        
        for (let i = 0; i < filledCells; i++) {
            const [x, y] = this.hilbertIndexToXY(i, Math.log2(gridSize));
            const cellX = startX + x * cellSize;
            const cellY = startY + y * cellSize;
            
            this.ctx.fillStyle = `hsla(${(i * 10 + time * 50) % 360}, 70%, 60%, ${0.4 + totalEnergy * 0.3})`;
            this.ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
        }
    }
    
    drawAudioMapping(time, totalEnergy, trebleEnergy) {
        // Show how audio maps to curve position
        const mappingY = this.height - 60;
        const mappingWidth = 300;
        const mappingHeight = 30;
        
        this.ctx.strokeStyle = `hsla(180, 70%, 60%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.lineWidth = 1;
        
        // Draw audio history as waveform
        this.ctx.beginPath();
        for (let i = 0; i < mappingWidth; i++) {
            const historyIndex = Math.floor((this.energyHistory.length - 1) * (i / mappingWidth));
            const audioFrame = this.energyHistory[historyIndex];
            const energy = audioFrame ? audioFrame.metrics.total : 0;
            
            const x = this.width - mappingWidth + i;
            const y = mappingY + (energy - 0.5) * mappingHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw current position indicator
        const currentX = this.width - mappingWidth + mappingWidth * this.drawProgress;
        this.ctx.strokeStyle = `hsla(60, 100%, 80%, ${0.8 + trebleEnergy * 0.2})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(currentX, mappingY - mappingHeight/2);
        this.ctx.lineTo(currentX, mappingY + mappingHeight/2);
        this.ctx.stroke();
        
        // Draw frame
        this.ctx.strokeStyle = `hsla(180, 50%, 50%, 0.5)`;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.width - mappingWidth, mappingY - mappingHeight/2, mappingWidth, mappingHeight);
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('hilbertCurve', HilbertCurveVisualization);
    }
});
