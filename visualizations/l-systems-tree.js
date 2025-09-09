class LSystemsTreeVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // L-System rules and parameters
        this.lSystems = [
            // Classic tree
            {
                axiom: 'F',
                rules: { 'F': 'F[+F]F[-F]F' },
                angle: 25.7,
                iterations: 4,
                name: 'Classic Tree'
            },
            // Bushy tree
            {
                axiom: 'F',
                rules: { 'F': 'FF+[+F-F-F]-[-F+F+F]' },
                angle: 22.5,
                iterations: 3,
                name: 'Bushy Tree'
            },
            // Plant-like fractal
            {
                axiom: 'F',
                rules: { 'F': 'F[+F]F[-F]F' },
                angle: 25,
                iterations: 4,
                name: 'Plant Fractal'
            },
            // Asymmetric tree
            {
                axiom: 'F',
                rules: { 'F': 'F[++F][--F]F[+F][-F]' },
                angle: 30,
                iterations: 3,
                name: 'Asymmetric Tree'
            },
            // Fern-like
            {
                axiom: 'X',
                rules: { 'X': 'F[+X]F[-X]+X', 'F': 'FF' },
                angle: 25,
                iterations: 5,
                name: 'Fern-like'
            }
        ];
        
        this.currentSystemIndex = 0;
        this.currentString = '';
        this.generationProgress = 0;
        
        // Beat detection
        this.lastBeatTime = 0;
        this.beatThreshold = 0.6;
        this.beatCooldown = 0;
        this.beatHistory = [];
        
        // Drawing parameters
        this.baseLength = 80;
        this.lengthReduction = 0.7;
        this.angleVariation = 0;
        
        // Animation state
        this.growthProgress = 0;
        this.branchColors = [];
        
        this.generateCurrentSystem();
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initialize();
    }
    
    generateCurrentSystem() {
        const system = this.lSystems[this.currentSystemIndex];
        let result = system.axiom;
        
        for (let i = 0; i < system.iterations; i++) {
            let newResult = '';
            for (const char of result) {
                newResult += system.rules[char] || char;
            }
            result = newResult;
        }
        
        this.currentString = result;
        this.growthProgress = 0;
        this.branchColors = [];
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Beat detection and system switching
        this.detectBeats(totalEnergy, bassEnergy, time);
        
        // Update parameters based on audio
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Draw the L-System tree
        this.drawLSystemTree(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    detectBeats(totalEnergy, bassEnergy, time) {
        this.beatCooldown = Math.max(0, this.beatCooldown - 1);
        
        // Store beat history for rhythm analysis
        this.beatHistory.push(bassEnergy);
        if (this.beatHistory.length > 60) { // Keep last 60 frames
            this.beatHistory.shift();
        }
        
        if (bassEnergy > this.beatThreshold && this.beatCooldown === 0) {
            this.lastBeatTime = time;
            this.beatCooldown = 15; // Prevent multiple beats in quick succession
            
            // Trigger new branch growth
            this.growthProgress = Math.min(1, this.growthProgress + 0.2);
            
            // Change system on strong beats
            if (bassEnergy > 0.85) {
                this.currentSystemIndex = (this.currentSystemIndex + 1) % this.lSystems.length;
                this.generateCurrentSystem();
            }
        }
        
        // Gradual growth based on energy
        this.growthProgress = Math.min(1, this.growthProgress + totalEnergy * 0.01);
    }
    
    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const system = this.lSystems[this.currentSystemIndex];
        
        // Base length responds to bass
        this.baseLength = 60 + bassEnergy * 60;
        
        // Length reduction responds to mid frequencies
        this.lengthReduction = 0.6 + midEnergy * 0.3;
        
        // Angle variation responds to treble
        this.angleVariation = trebleEnergy * 15;
        
        // Update branch colors based on frequency analysis
        this.updateBranchColors(frequencyData, bufferLength, time);
    }
    
    updateBranchColors(frequencyData, bufferLength, time) {
        // Analyze frequency spectrum for color mapping
        const bands = 8;
        const bandSize = Math.floor(bufferLength / bands);
        
        this.branchColors = [];
        for (let i = 0; i < bands; i++) {
            let bandEnergy = 0;
            for (let j = i * bandSize; j < (i + 1) * bandSize; j++) {
                bandEnergy += frequencyData[j] / 255;
            }
            bandEnergy /= bandSize;
            
            // Map band to color
            const hue = (i * 45 + time * 30) % 360;
            const saturation = 70 + bandEnergy * 30;
            const lightness = 40 + bandEnergy * 50;
            
            this.branchColors.push({
                hue,
                saturation,
                lightness,
                energy: bandEnergy
            });
        }
    }
    
    drawLSystemTree(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const system = this.lSystems[this.currentSystemIndex];
        
        // Set up drawing state
        this.ctx.save();
        this.ctx.translate(this.centerX, this.height - 50);
        this.ctx.rotate(0); // Start pointing up
        
        // Drawing state stack for L-System interpretation
        const stateStack = [];
        let currentLength = this.baseLength;
        let currentAngle = 0;
        let branchDepth = 0;
        let drawnCharacters = 0;
        
        // Calculate how many characters to draw based on growth progress
        const totalCharacters = this.currentString.length;
        const charactersToShow = Math.floor(totalCharacters * this.growthProgress);
        
        for (let i = 0; i < Math.min(charactersToShow, totalCharacters); i++) {
            const char = this.currentString[i];
            drawnCharacters++;
            
            switch (char) {
                case 'F':
                case 'X':
                    if (char === 'F') {
                        // Draw forward
                        const endX = currentLength * Math.sin(currentAngle);
                        const endY = -currentLength * Math.cos(currentAngle);
                        
                        // Color based on branch depth and audio
                        const colorIndex = branchDepth % this.branchColors.length;
                        const color = this.branchColors[colorIndex] || { hue: 120, saturation: 70, lightness: 50, energy: 0.5 };
                        
                        // Line width based on depth and energy
                        const lineWidth = Math.max(0.5, (8 - branchDepth) * 0.8 + totalEnergy * 2);
                        
                        // Add audio-reactive effects
                        const audioMod = 1 + Math.sin(time * 5 + branchDepth) * totalEnergy * 0.2;
                        const actualLength = currentLength * audioMod;
                        
                        this.ctx.strokeStyle = `hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, ${0.7 + color.energy * 0.3})`;
                        this.ctx.lineWidth = lineWidth;
                        
                        // Add glow effect for high energy
                        if (totalEnergy > 0.6) {
                            this.ctx.shadowColor = `hsla(${color.hue}, 100%, 70%, ${totalEnergy * 0.5})`;
                            this.ctx.shadowBlur = 5 + totalEnergy * 10;
                        } else {
                            this.ctx.shadowBlur = 0;
                        }
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, 0);
                        this.ctx.lineTo(actualLength * Math.sin(currentAngle), -actualLength * Math.cos(currentAngle));
                        this.ctx.stroke();
                        
                        // Move to end of line
                        this.ctx.translate(actualLength * Math.sin(currentAngle), -actualLength * Math.cos(currentAngle));
                        
                        // Reduce length for next iteration
                        currentLength *= this.lengthReduction;
                    }
                    break;
                    
                case '+':
                    // Turn right
                    const rightAngle = (system.angle + this.angleVariation * (Math.random() - 0.5)) * Math.PI / 180;
                    currentAngle += rightAngle + Math.sin(time * 3) * trebleEnergy * 0.2;
                    break;
                    
                case '-':
                    // Turn left
                    const leftAngle = (system.angle + this.angleVariation * (Math.random() - 0.5)) * Math.PI / 180;
                    currentAngle -= leftAngle + Math.sin(time * 3) * trebleEnergy * 0.2;
                    break;
                    
                case '[':
                    // Push state
                    stateStack.push({
                        transform: this.ctx.getTransform(),
                        length: currentLength,
                        angle: currentAngle,
                        depth: branchDepth
                    });
                    branchDepth++;
                    break;

                case ']':
                    // Pop state
                    if (stateStack.length > 0) {
                        const state = stateStack.pop();
                        this.ctx.setTransform(state.transform);
                        currentLength = state.length;
                        currentAngle = state.angle;
                        branchDepth = Math.max(0, state.depth);
                    }
                    break;
            }
        }
        
        this.ctx.restore();
        
        // Draw leaves/flowers at branch tips for high energy
        if (totalEnergy > 0.5) {
            this.drawLeaves(audioData, totalEnergy, trebleEnergy);
        }
    }
    
    drawLeaves(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Simulate leaf positions (simplified)
        const leafCount = Math.floor(totalEnergy * 20);
        
        for (let i = 0; i < leafCount; i++) {
            const angle = (i / leafCount) * Math.PI * 2 + time;
            const radius = 100 + Math.sin(time * 2 + i) * 50;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.height - 150 + Math.sin(angle) * radius * 0.5;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2 + trebleEnergy * 3, 0, Math.PI * 2);
            
            const hue = (120 + i * 20 + time * 100) % 360;
            this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${totalEnergy})`;
            this.ctx.fill();
        }
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        const system = this.lSystems[this.currentSystemIndex];
        
        // Draw system info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(120, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`L-System: ${system.name}`, 20, 30);
            this.ctx.fillText(`Growth: ${(this.growthProgress * 100).toFixed(1)}%`, 20, 50);
            this.ctx.fillText(`Angle: ${system.angle.toFixed(1)}°`, 20, 70);
        }
        
        // Draw beat indicator
        const timeSinceLastBeat = time - this.lastBeatTime;
        if (timeSinceLastBeat < 1) {
            const beatAlpha = Math.max(0, 1 - timeSinceLastBeat);
            this.ctx.fillStyle = `hsla(60, 100%, 80%, ${beatAlpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width - 50, 50, 10 + beatAlpha * 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw growth rings
        if (totalEnergy > 0.6) {
            this.drawGrowthRings(time, totalEnergy);
        }
    }
    
    drawGrowthRings(time, totalEnergy) {
        const ringCount = 3;
        
        for (let i = 0; i < ringCount; i++) {
            const radius = 50 + i * 30 + Math.sin(time * 2 + i) * 20;
            const alpha = (totalEnergy * 0.3) / (i + 1);
            
            this.ctx.strokeStyle = `hsla(120, 70%, 60%, ${alpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.height - 50, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('lSystemsTree', LSystemsTreeVisualization);
    }
});
