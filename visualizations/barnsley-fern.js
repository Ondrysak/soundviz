class BarnsleyFernVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Fern parameters - Iterated Function System
        this.fernPoints = [];
        this.maxPoints = 50000;
        this.currentPoint = { x: 0, y: 0 };
        
        // Audio-reactive parameters
        this.growthRate = 100; // Points added per frame
        this.breathingAmplitude = 0;
        this.colorShift = 0;
        
        // Beat detection
        this.lastBeatTime = 0;
        this.beatThreshold = 0.7;
        this.beatCooldown = 0;
        
        // Multiple fern variations
        this.fernTypes = [
            // Classic Barnsley Fern
            {
                transforms: [
                    { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, prob: 0.01 },
                    { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, prob: 0.85 },
                    { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, prob: 0.07 },
                    { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, prob: 0.07 }
                ],
                scale: 50,
                offsetX: 0,
                offsetY: -200
            },
            // Tighter spiral fern
            {
                transforms: [
                    { a: 0, b: 0, c: 0, d: 0.25, e: 0, f: -0.4, prob: 0.02 },
                    { a: 0.95, b: 0.005, c: -0.005, d: 0.93, e: -0.002, f: 0.5, prob: 0.84 },
                    { a: 0.035, b: -0.2, c: 0.16, d: 0.04, e: -0.09, f: 0.02, prob: 0.07 },
                    { a: -0.04, b: 0.2, c: 0.16, d: 0.04, e: 0.083, f: 0.12, prob: 0.07 }
                ],
                scale: 60,
                offsetX: 0,
                offsetY: -150
            },
            // Wider, more organic fern
            {
                transforms: [
                    { a: 0, b: 0, c: 0, d: 0.2, e: 0, f: 0, prob: 0.01 },
                    { a: 0.8, b: 0.08, c: -0.08, d: 0.8, e: 0, f: 1.5, prob: 0.8 },
                    { a: 0.3, b: -0.3, c: 0.3, d: 0.3, e: 0, f: 1.2, prob: 0.095 },
                    { a: -0.3, b: 0.3, c: 0.3, d: 0.3, e: 0, f: 0.6, prob: 0.095 }
                ],
                scale: 45,
                offsetX: 0,
                offsetY: -180
            }
        ];
        
        this.currentFernType = 0;
        this.fernTransitionProgress = 0;
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initialize();
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Beat detection
        this.detectBeats(totalEnergy, bassEnergy, time);
        
        // Update fern parameters based on audio
        this.updateFernParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Generate new fern points
        this.generateFernPoints(totalEnergy, bassEnergy);
        
        // Draw the fern
        this.drawFern(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    detectBeats(totalEnergy, bassEnergy, time) {
        this.beatCooldown = Math.max(0, this.beatCooldown - 1);
        
        if (bassEnergy > this.beatThreshold && this.beatCooldown === 0) {
            this.lastBeatTime = time;
            this.beatCooldown = 10; // Prevent multiple beats in quick succession
            
            // Change fern type on strong beats
            if (bassEnergy > 0.9) {
                this.currentFernType = (this.currentFernType + 1) % this.fernTypes.length;
                this.fernTransitionProgress = 0;
                this.fernPoints = []; // Clear points for dramatic effect
            }
        }
    }
    
    updateFernParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Growth rate based on total energy
        this.growthRate = 50 + totalEnergy * 200;
        
        // Breathing effect based on mid frequencies
        this.breathingAmplitude = midEnergy * 0.3;
        
        // Color shift based on treble
        this.colorShift = trebleEnergy * 360;
        
        // Smooth fern transition
        this.fernTransitionProgress = Math.min(1, this.fernTransitionProgress + 0.02);
    }
    
    generateFernPoints(totalEnergy, bassEnergy) {
        const pointsToAdd = Math.floor(this.growthRate * (0.5 + totalEnergy));
        const currentFern = this.fernTypes[this.currentFernType];
        
        for (let i = 0; i < pointsToAdd; i++) {
            // Apply IFS transformation
            const rand = Math.random();
            let cumulativeProb = 0;
            let selectedTransform = currentFern.transforms[0];
            
            for (const transform of currentFern.transforms) {
                cumulativeProb += transform.prob;
                if (rand <= cumulativeProb) {
                    selectedTransform = transform;
                    break;
                }
            }
            
            // Apply transformation with audio modulation
            const { a, b, c, d, e, f } = selectedTransform;
            const audioMod = 1 + bassEnergy * 0.1; // Slight audio modulation
            
            const newX = (a * this.currentPoint.x + b * this.currentPoint.y + e) * audioMod;
            const newY = (c * this.currentPoint.x + d * this.currentPoint.y + f) * audioMod;
            
            this.currentPoint = { x: newX, y: newY };
            
            // Add breathing effect
            const breathingScale = 1 + Math.sin(Date.now() * 0.003) * this.breathingAmplitude;
            
            // Convert to screen coordinates
            const screenX = this.centerX + (this.currentPoint.x * currentFern.scale * breathingScale) + currentFern.offsetX;
            const screenY = this.centerY + (this.currentPoint.y * currentFern.scale * breathingScale) + currentFern.offsetY;
            
            // Store point with metadata
            this.fernPoints.push({
                x: screenX,
                y: screenY,
                age: 0,
                energy: totalEnergy,
                originalX: this.currentPoint.x,
                originalY: this.currentPoint.y
            });
        }
        
        // Remove old points to maintain performance
        if (this.fernPoints.length > this.maxPoints) {
            this.fernPoints = this.fernPoints.slice(-this.maxPoints);
        }
        
        // Age all points
        this.fernPoints.forEach(point => point.age++);
    }
    
    drawFern(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw points with varying styles based on audio
        for (let i = 0; i < this.fernPoints.length; i++) {
            const point = this.fernPoints[i];
            const ageRatio = point.age / 1000; // Fade over time
            
            // Color based on position, age, and audio
            let hue = (point.originalY * 100 + this.colorShift + time * 50) % 360;
            let saturation = 70 + trebleEnergy * 30;
            let lightness = 30 + point.energy * 50 + midEnergy * 30;
            
            // Fade old points
            const alpha = Math.max(0, 1 - ageRatio) * (0.6 + totalEnergy * 0.4);
            
            // Different drawing styles based on energy
            if (totalEnergy > 0.8) {
                // High energy: glowing particles
                const glowSize = 2 + trebleEnergy * 3;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, glowSize, 0, Math.PI * 2);
                
                // Outer glow
                this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.3})`;
                this.ctx.fill();
                
                // Inner bright core
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, glowSize * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${Math.min(100, lightness + 30)}%, ${alpha})`;
                this.ctx.fill();
                
            } else if (totalEnergy > 0.5) {
                // Medium energy: colored dots
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 1.5 + bassEnergy * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
                this.ctx.fill();
                
            } else if (totalEnergy > 0.2) {
                // Low energy: simple pixels
                this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
                this.ctx.fillRect(point.x, point.y, 1, 1);
                
            } else {
                // Very low energy: minimal dots
                this.ctx.fillStyle = `hsla(${hue}, ${saturation * 0.7}%, ${lightness * 0.8}%, ${alpha * 0.7})`;
                this.ctx.fillRect(point.x, point.y, 1, 1);
            }
        }
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw growth rings on beats
        const timeSinceLastBeat = time - this.lastBeatTime;
        if (timeSinceLastBeat < 2) {
            const ringRadius = timeSinceLastBeat * 100;
            const ringAlpha = Math.max(0, 1 - timeSinceLastBeat / 2);
            
            this.ctx.strokeStyle = `hsla(${(time * 100) % 360}, 100%, 70%, ${ringAlpha * 0.5})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY - 100, ringRadius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw fern type indicator
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(120, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Fern Type: ${this.currentFernType + 1}`, 20, 30);
            this.ctx.fillText(`Points: ${this.fernPoints.length}`, 20, 50);
        }
        
        // Add energy particles around the fern
        if (totalEnergy > 0.6) {
            this.drawEnergyParticles(time, totalEnergy, trebleEnergy);
        }
    }
    
    drawEnergyParticles(time, totalEnergy, trebleEnergy) {
        const particleCount = Math.floor(totalEnergy * 20);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time * 1.5;
            const radius = 150 + Math.sin(time * 2 + i * 0.3) * 50;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY - 100 + Math.sin(angle) * radius * 0.7; // Elliptical
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 1 + trebleEnergy * 2, 0, Math.PI * 2);
            
            const hue = (120 + i * 10 + time * 100) % 360; // Green-based palette
            this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${totalEnergy * 0.8})`;
            this.ctx.fill();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('barnsleyFern', BarnsleyFernVisualization);
    }
});
