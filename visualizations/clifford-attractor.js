class CliffordAttractorVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Clifford attractor parameters
        this.a = -1.4;
        this.b = 1.6;
        this.c = 1.0;
        this.d = 0.7;
        
        // Base parameters for different attractor types
        this.attractorPresets = [
            { a: -1.4, b: 1.6, c: 1.0, d: 0.7, name: 'Classic' },
            { a: -1.7, b: 1.8, c: -1.9, d: -0.4, name: 'Spiral' },
            { a: -1.8, b: -2.0, c: -0.5, d: -0.9, name: 'Butterfly' },
            { a: 1.1, b: -1.0, c: 1.0, d: 1.5, name: 'Flower' },
            { a: -1.6, b: 1.6, c: 0.7, d: -1.0, name: 'Web' },
            { a: -1.3, b: 1.3, c: 1.3, d: 1.3, name: 'Symmetric' }
        ];
        this.currentPreset = 0;
        
        // Drawing state
        this.points = [];
        this.maxPoints = 30000;
        this.x = 0;
        this.y = 0;
        
        // Audio-reactive parameters
        this.parameterModulation = {
            a: 0, b: 0, c: 0, d: 0
        };
        this.colorShift = 0;
        this.energyHistory = [];
        this.maxHistoryLength = 100;
        
        // Visual parameters
        this.scale = 80;
        this.pointSize = 1;
        this.trailLength = 1000;
        
        // Beat detection
        this.lastBeatTime = 0;
        this.beatThreshold = 0.7;
        this.beatCooldown = 0;
        
        // Initialize with preset
        this.loadPreset(this.currentPreset);
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.scale = Math.min(width, height) * 0.15;
        this.initialize();
    }
    
    loadPreset(presetIndex) {
        const preset = this.attractorPresets[presetIndex];
        this.a = preset.a;
        this.b = preset.b;
        this.c = preset.c;
        this.d = preset.d;
        
        // Reset drawing state
        this.points = [];
        this.x = 0;
        this.y = 0;
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Store energy history
        this.storeEnergyHistory(audioMetrics, time);
        
        // Detect beats and change presets
        this.detectBeats(totalEnergy, bassEnergy, time);
        
        // Update parameters based on audio
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Generate attractor points
        this.generateAttractorPoints(totalEnergy, bassEnergy);
        
        // Draw the attractor
        this.drawCliffordAttractor(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    storeEnergyHistory(audioMetrics, time) {
        this.energyHistory.push({
            ...audioMetrics,
            time: time
        });
        
        if (this.energyHistory.length > this.maxHistoryLength) {
            this.energyHistory.shift();
        }
    }
    
    detectBeats(totalEnergy, bassEnergy, time) {
        this.beatCooldown = Math.max(0, this.beatCooldown - 1);
        
        if (bassEnergy > this.beatThreshold && this.beatCooldown === 0) {
            this.lastBeatTime = time;
            this.beatCooldown = 15;
            
            // Change preset on strong beats
            if (bassEnergy > 0.9) {
                this.currentPreset = (this.currentPreset + 1) % this.attractorPresets.length;
                this.loadPreset(this.currentPreset);
            }
        }
    }
    
    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const preset = this.attractorPresets[this.currentPreset];
        
        // Modulate parameters based on audio
        // Bass affects 'a' and 'c' parameters (overall shape)
        this.parameterModulation.a = Math.sin(time * 1.5) * bassEnergy * 0.5;
        this.parameterModulation.c = Math.cos(time * 1.2) * bassEnergy * 0.4;
        
        // Mid frequencies affect 'b' and 'd' parameters (fine details)
        this.parameterModulation.b = Math.sin(time * 2.0) * midEnergy * 0.3;
        this.parameterModulation.d = Math.cos(time * 1.8) * midEnergy * 0.3;
        
        // Apply modulation to base parameters
        this.a = preset.a + this.parameterModulation.a;
        this.b = preset.b + this.parameterModulation.b;
        this.c = preset.c + this.parameterModulation.c;
        this.d = preset.d + this.parameterModulation.d;
        
        // Treble affects visual parameters
        this.colorShift = trebleEnergy * 360;
        this.pointSize = 1 + trebleEnergy * 3;
        this.scale = Math.min(this.width, this.height) * 0.15 * (1 + totalEnergy * 0.3);
        
        // Trail length based on total energy
        this.trailLength = Math.floor(500 + totalEnergy * 1500);
    }
    
    generateAttractorPoints(totalEnergy, bassEnergy) {
        // Number of iterations based on energy
        const iterations = Math.floor(50 + totalEnergy * 200);
        
        for (let i = 0; i < iterations; i++) {
            // Clifford attractor equations:
            // x(n+1) = sin(a * y(n)) + c * cos(a * x(n))
            // y(n+1) = sin(b * x(n)) + d * cos(b * y(n))
            
            const newX = Math.sin(this.a * this.y) + this.c * Math.cos(this.a * this.x);
            const newY = Math.sin(this.b * this.x) + this.d * Math.cos(this.b * this.y);
            
            this.x = newX;
            this.y = newY;
            
            // Convert to screen coordinates
            const screenX = this.centerX + this.x * this.scale;
            const screenY = this.centerY + this.y * this.scale;
            
            // Only add points that are visible and not infinite
            if (isFinite(screenX) && isFinite(screenY) &&
                screenX >= -50 && screenX < this.width + 50 &&
                screenY >= -50 && screenY < this.height + 50) {
                
                this.points.push({
                    x: screenX,
                    y: screenY,
                    age: 0,
                    energy: totalEnergy,
                    paramA: this.a,
                    paramB: this.b
                });
            }
        }
        
        // Remove old points to maintain trail length
        if (this.points.length > this.trailLength) {
            this.points = this.points.slice(-this.trailLength);
        }
        
        // Age all points
        this.points.forEach(point => point.age++);
    }
    
    drawCliffordAttractor(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw points with varying styles based on age and energy
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const ageRatio = point.age / this.trailLength;
            const positionRatio = i / this.points.length;
            
            // Color based on position in attractor and audio
            let hue = (positionRatio * 180 + this.colorShift + time * 30) % 360;
            
            // Add parameter-based color variation
            hue += (point.paramA + point.paramB) * 50;
            hue = hue % 360;
            
            const saturation = 70 + point.energy * 30;
            const lightness = 30 + point.energy * 50 + (1 - ageRatio) * 30;
            
            // Alpha based on age and energy
            const alpha = Math.max(0, (1 - ageRatio) * (0.4 + point.energy * 0.6));
            
            if (alpha > 0.01) {
                // Different drawing styles based on energy
                if (totalEnergy > 0.8) {
                    // High energy: glowing particles with connections
                    this.drawGlowingParticle(point, hue, saturation, lightness, alpha, totalEnergy);
                    
                    // Draw connections to nearby points
                    if (i > 0 && i % 5 === 0) {
                        this.drawConnection(this.points[i - 1], point, hue, alpha * 0.3);
                    }
                    
                } else if (totalEnergy > 0.5) {
                    // Medium energy: colored dots with trails
                    this.drawTrailParticle(point, hue, saturation, lightness, alpha, midEnergy);
                    
                } else if (totalEnergy > 0.2) {
                    // Low energy: simple points
                    this.drawSimpleParticle(point, hue, saturation, lightness, alpha);
                    
                } else {
                    // Very low energy: minimal dots
                    this.drawMinimalParticle(point, hue, saturation * 0.7, lightness * 0.8, alpha * 0.7);
                }
            }
        }
        
        // Draw current position indicator
        if (this.points.length > 0) {
            const currentPoint = this.points[this.points.length - 1];
            this.drawCurrentPosition(currentPoint, time, totalEnergy);
        }
    }
    
    drawGlowingParticle(point, hue, saturation, lightness, alpha, energy) {
        const size = this.pointSize * (1 + energy * 2);
        
        // Outer glow
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, size * 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.2})`;
        this.ctx.fill();
        
        // Inner bright core
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${Math.min(100, lightness + 30)}%, ${alpha})`;
        this.ctx.fill();
    }
    
    drawTrailParticle(point, hue, saturation, lightness, alpha, midEnergy) {
        const size = this.pointSize * (1 + midEnergy);
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.fill();
    }
    
    drawSimpleParticle(point, hue, saturation, lightness, alpha) {
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.fillRect(point.x - this.pointSize/2, point.y - this.pointSize/2, this.pointSize, this.pointSize);
    }
    
    drawMinimalParticle(point, hue, saturation, lightness, alpha) {
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.fillRect(point.x, point.y, 1, 1);
    }
    
    drawConnection(point1, point2, hue, alpha) {
        this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(point1.x, point1.y);
        this.ctx.lineTo(point2.x, point2.y);
        this.ctx.stroke();
    }
    
    drawCurrentPosition(point, time, energy) {
        const pulseSize = 3 + Math.sin(time * 8) * 2 + energy * 3;
        
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, pulseSize, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(60, 100%, 80%, ${0.8 + energy * 0.2})`;
        this.ctx.fill();
        
        // Inner dot
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        const preset = this.attractorPresets[this.currentPreset];
        
        // Draw attractor info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(300, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Clifford Attractor: ${preset.name}`, 20, 30);
            this.ctx.fillText(`Points: ${this.points.length}`, 20, 50);
            this.ctx.fillText(`a: ${this.a.toFixed(3)}`, 20, 70);
            this.ctx.fillText(`b: ${this.b.toFixed(3)}`, 20, 90);
            this.ctx.fillText(`c: ${this.c.toFixed(3)}`, 20, 110);
            this.ctx.fillText(`d: ${this.d.toFixed(3)}`, 20, 130);
        }
        
        // Draw parameter space visualization
        if (totalEnergy > 0.5) {
            this.drawParameterSpace(time, totalEnergy);
        }
        
        // Draw beat indicator
        const timeSinceLastBeat = time - this.lastBeatTime;
        if (timeSinceLastBeat < 1) {
            const beatAlpha = Math.max(0, 1 - timeSinceLastBeat);
            this.ctx.fillStyle = `hsla(300, 100%, 70%, ${beatAlpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width - 50, 50, 10 + beatAlpha * 15, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw energy history
        if (totalEnergy > 0.6) {
            this.drawEnergyHistory(time, totalEnergy);
        }
    }
    
    drawParameterSpace(time, totalEnergy) {
        // Visualize parameter space as a 2D grid
        const gridSize = 60;
        const startX = this.width - gridSize - 20;
        const startY = this.height - gridSize - 60;
        
        // Draw parameter grid
        this.ctx.strokeStyle = `hsla(300, 50%, 50%, ${0.3 + totalEnergy * 0.2})`;
        this.ctx.lineWidth = 1;
        
        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const x = startX + (i / 4) * gridSize;
            const y = startY + (i / 4) * gridSize;
            
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, startY + gridSize);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(startX + gridSize, y);
            this.ctx.stroke();
        }
        
        // Current parameter position (simplified to 2D)
        const paramX = startX + ((this.a + 2) / 4) * gridSize;
        const paramY = startY + ((this.b + 2) / 4) * gridSize;
        
        this.ctx.beginPath();
        this.ctx.arc(paramX, paramY, 3 + totalEnergy * 3, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(300, 100%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.fill();
        
        // Labels
        this.ctx.fillStyle = `hsla(300, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Parameter Space', startX, startY - 5);
    }
    
    drawEnergyHistory(time, totalEnergy) {
        // Draw energy history as a waveform
        const historyWidth = 200;
        const historyHeight = 40;
        const startX = this.width - historyWidth - 20;
        const startY = this.height - historyHeight - 20;
        
        this.ctx.strokeStyle = `hsla(180, 70%, 60%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.lineWidth = 1;
        
        // Draw energy history
        this.ctx.beginPath();
        for (let i = 0; i < this.energyHistory.length; i++) {
            const x = startX + (i / this.energyHistory.length) * historyWidth;
            const y = startY + historyHeight - this.energyHistory[i].total * historyHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw bass history
        this.ctx.strokeStyle = `hsla(0, 70%, 60%, ${0.4 + totalEnergy * 0.3})`;
        this.ctx.beginPath();
        for (let i = 0; i < this.energyHistory.length; i++) {
            const x = startX + (i / this.energyHistory.length) * historyWidth;
            const y = startY + historyHeight - this.energyHistory[i].bass * historyHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw frame
        this.ctx.strokeStyle = `hsla(300, 50%, 50%, 0.5)`;
        this.ctx.strokeRect(startX, startY, historyWidth, historyHeight);
        
        // Label
        this.ctx.fillStyle = `hsla(300, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Energy History', startX, startY - 5);
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('cliffordAttractor', CliffordAttractorVisualization);
    }
});
