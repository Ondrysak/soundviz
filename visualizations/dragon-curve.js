class DragonCurveVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Dragon curve parameters
        this.maxIterations = 16;
        this.currentIteration = 10;
        this.segmentLength = 6;
        this.animationSpeed = 0.03;
        
        // Audio-reactive parameters
        this.drawProgress = 0;
        this.colorShift = 0;
        this.energyHistory = [];
        
        // Pre-compute dragon curve sequences for different iterations
        this.dragonSequences = {};
        this.precomputeSequences();
        
        // Drawing state
        this.currentPath = [];
        this.pathIndex = 0;
        this.lastUpdateTime = 0;
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        // Scale segment length based on canvas size
        this.segmentLength = Math.max(4, Math.min(width, height) * 0.008);
        this.initialize();
    }
    
    precomputeSequences() {
        // Generate dragon curve sequences using the recursive definition
        for (let iter = 1; iter <= this.maxIterations; iter++) {
            this.dragonSequences[iter] = this.generateDragonSequence(iter);
        }
    }
    
    generateDragonSequence(iterations) {
        // Dragon curve generation: start with "R", then for each iteration,
        // replace each turn with "R" + previous sequence + "L" + reversed previous sequence
        let sequence = [];
        
        if (iterations === 1) {
            return ['R']; // Right turn
        }
        
        const prevSequence = this.generateDragonSequence(iterations - 1);
        const reversedSequence = [...prevSequence].reverse().map(turn => turn === 'R' ? 'L' : 'R');
        
        return [...prevSequence, 'R', ...reversedSequence];
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Store energy history for waveform mapping
        this.energyHistory.push({
            total: totalEnergy,
            bass: bassEnergy,
            mid: midEnergy,
            treble: trebleEnergy,
            time: time
        });
        
        // Keep only recent history
        if (this.energyHistory.length > 1000) {
            this.energyHistory.shift();
        }
        
        // Update parameters based on audio
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Generate and draw the dragon curve
        this.drawDragonCurve(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Iteration count based on total energy
        this.currentIteration = Math.floor(8 + totalEnergy * 6);
        this.currentIteration = Math.min(this.maxIterations, this.currentIteration);

        // Segment length based on bass and canvas size
        const baseLength = Math.max(4, Math.min(this.width, this.height) * 0.008);
        this.segmentLength = baseLength + bassEnergy * 4;

        // Animation speed based on mid frequencies
        this.animationSpeed = 0.02 + midEnergy * 0.06;
        
        // Color shift based on treble
        this.colorShift = trebleEnergy * 360;
        
        // Update draw progress
        this.drawProgress += this.animationSpeed + totalEnergy * 0.02;
        if (this.drawProgress > 1) {
            this.drawProgress = 0; // Reset for continuous animation
        }
    }
    
    drawDragonCurve(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const sequence = this.dragonSequences[this.currentIteration] || [];
        
        if (sequence.length === 0) return;
        
        // Starting position and direction
        let x = this.centerX - 100;
        let y = this.centerY;
        let direction = 0; // 0 = right, 1 = down, 2 = left, 3 = up
        
        // Calculate how many segments to draw based on progress
        const totalSegments = sequence.length + 1; // +1 for initial segment
        const segmentsToDraw = Math.floor(totalSegments * this.drawProgress);
        
        // Draw initial segment
        this.ctx.strokeStyle = this.getSegmentColor(0, totalEnergy, time);
        this.ctx.lineWidth = 1 + totalEnergy * 3;
        
        // Add glow effect for high energy
        if (totalEnergy > 0.5) {
            this.ctx.shadowColor = this.getSegmentColor(0, totalEnergy, time);
            this.ctx.shadowBlur = 5 + totalEnergy * 10;
        } else {
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        // Draw the first segment
        const dx = this.getDirectionX(direction) * this.segmentLength;
        const dy = this.getDirectionY(direction) * this.segmentLength;
        x += dx;
        y += dy;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        
        // Draw subsequent segments based on the dragon sequence
        for (let i = 0; i < Math.min(segmentsToDraw - 1, sequence.length); i++) {
            const turn = sequence[i];
            
            // Apply turn
            if (turn === 'R') {
                direction = (direction + 1) % 4; // Turn right
            } else {
                direction = (direction + 3) % 4; // Turn left (same as +3 mod 4)
            }
            
            // Calculate segment properties based on audio and position
            const segmentProgress = i / sequence.length;
            const audioInfluence = this.getAudioInfluenceAtPosition(segmentProgress);
            
            // Modify segment length based on audio history
            let actualLength = this.segmentLength;
            if (this.energyHistory.length > i) {
                const historyIndex = Math.floor((this.energyHistory.length - 1) * segmentProgress);
                const energyAtPosition = this.energyHistory[historyIndex];
                if (energyAtPosition) {
                    actualLength *= (0.5 + energyAtPosition.total * 1.5);
                }
            }
            
            // Add audio-reactive jitter
            const jitterX = Math.sin(time * 3 + i * 0.1) * trebleEnergy * 2;
            const jitterY = Math.cos(time * 3 + i * 0.1) * trebleEnergy * 2;
            
            // Calculate next position
            const nextDx = this.getDirectionX(direction) * actualLength + jitterX;
            const nextDy = this.getDirectionY(direction) * actualLength + jitterY;
            
            // Set color for this segment
            this.ctx.strokeStyle = this.getSegmentColor(i, audioInfluence, time);
            this.ctx.lineWidth = 1 + audioInfluence * 4;
            
            // Update glow
            if (audioInfluence > 0.5) {
                this.ctx.shadowColor = this.getSegmentColor(i, audioInfluence, time);
                this.ctx.shadowBlur = 3 + audioInfluence * 8;
            } else {
                this.ctx.shadowBlur = 0;
            }
            
            // Draw segment
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            x += nextDx;
            y += nextDy;
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            // Draw energy nodes at high energy points
            if (audioInfluence > 0.7) {
                this.drawEnergyNode(x, y, audioInfluence, i, time);
            }
        }
    }
    
    getDirectionX(direction) {
        const directions = [1, 0, -1, 0]; // right, down, left, up
        return directions[direction];
    }
    
    getDirectionY(direction) {
        const directions = [0, 1, 0, -1]; // right, down, left, up
        return directions[direction];
    }
    
    getAudioInfluenceAtPosition(position) {
        // Map position along curve to audio history
        if (this.energyHistory.length === 0) return 0.5;
        
        const historyIndex = Math.floor((this.energyHistory.length - 1) * position);
        const energyData = this.energyHistory[historyIndex];
        
        return energyData ? energyData.total : 0.5;
    }
    
    getSegmentColor(segmentIndex, energy, time) {
        // Color based on position along curve and audio energy
        const baseHue = (segmentIndex * 5 + this.colorShift + time * 50) % 360;
        const saturation = 70 + energy * 30;
        const lightness = 40 + energy * 50;
        
        return `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${0.7 + energy * 0.3})`;
    }
    
    drawEnergyNode(x, y, energy, index, time) {
        const nodeSize = 3 + energy * 5;
        const pulseSize = Math.sin(time * 5 + index * 0.5) * energy * 3;
        
        // Outer glow
        this.ctx.beginPath();
        this.ctx.arc(x, y, nodeSize + pulseSize, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(index * 10 + time * 100) % 360}, 100%, 70%, ${energy * 0.3})`;
        this.ctx.fill();
        
        // Inner core
        this.ctx.beginPath();
        this.ctx.arc(x, y, nodeSize * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(index * 10 + time * 100) % 360}, 100%, 90%, ${energy})`;
        this.ctx.fill();
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw iteration info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(280, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Dragon Curve Iteration: ${this.currentIteration}`, 20, 30);
            this.ctx.fillText(`Progress: ${(this.drawProgress * 100).toFixed(1)}%`, 20, 50);
            this.ctx.fillText(`Segments: ${this.dragonSequences[this.currentIteration]?.length || 0}`, 20, 70);
        }
        
        // Draw waveform representation
        if (totalEnergy > 0.5) {
            this.drawWaveformMapping(time, totalEnergy, trebleEnergy);
        }
        
        // Draw fractal dimension indicator
        if (totalEnergy > 0.6) {
            this.drawFractalDimension(time, totalEnergy);
        }
    }
    
    drawWaveformMapping(time, totalEnergy, trebleEnergy) {
        // Show how audio waveform maps to curve generation
        const waveformY = this.height - 80;
        const waveformWidth = 200;
        const waveformHeight = 40;
        
        this.ctx.strokeStyle = `hsla(180, 70%, 60%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        for (let i = 0; i < waveformWidth; i++) {
            const historyIndex = Math.floor((this.energyHistory.length - 1) * (i / waveformWidth));
            const energy = this.energyHistory[historyIndex]?.total || 0;
            
            const x = this.width - waveformWidth + i;
            const y = waveformY + (energy - 0.5) * waveformHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw waveform frame
        this.ctx.strokeRect(this.width - waveformWidth, waveformY - waveformHeight/2, waveformWidth, waveformHeight);
    }
    
    drawFractalDimension(time, totalEnergy) {
        // Approximate fractal dimension visualization
        const dimension = 1 + totalEnergy * 0.5; // Simplified calculation
        
        this.ctx.fillStyle = `hsla(300, 80%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Fractal Dimension: ${dimension.toFixed(3)}`, this.width - 200, 30);
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('dragonCurve', DragonCurveVisualization);
    }
});
