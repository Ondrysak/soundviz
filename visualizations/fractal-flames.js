class FractalFlamesVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Fractal flame parameters
        this.numIterations = 100000;
        this.numFunctions = 4;
        this.points = [];
        this.maxPoints = 50000;
        
        // Flame functions (variations)
        this.variations = [
            'linear', 'sinusoidal', 'spherical', 'swirl', 
            'horseshoe', 'polar', 'handkerchief', 'heart',
            'disc', 'spiral', 'hyperbolic', 'diamond'
        ];
        
        // Current flame system
        this.flameSystem = this.generateFlameSystem();
        
        // Audio-reactive parameters
        this.harmonicInfluence = 0;
        this.overtoneModulation = 0;
        this.energyHistory = [];
        this.maxHistoryLength = 200;
        
        // Color palette
        this.colorPalette = this.generateColorPalette();
        this.paletteIndex = 0;
        
        // Rendering parameters
        this.brightness = 1;
        this.contrast = 1;
        this.gamma = 2.2;
        
        // Animation state
        this.animationPhase = 0;
        this.lastSystemChange = 0;
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initialize();
    }
    
    generateFlameSystem() {
        const system = {
            functions: [],
            finalTransform: null,
            colorSpeed: 0.5
        };
        
        // Generate affine transformations
        for (let i = 0; i < this.numFunctions; i++) {
            const func = {
                // Affine transformation coefficients
                a: (Math.random() - 0.5) * 2,
                b: (Math.random() - 0.5) * 2,
                c: (Math.random() - 0.5) * 2,
                d: (Math.random() - 0.5) * 2,
                e: (Math.random() - 0.5) * 2,
                f: (Math.random() - 0.5) * 2,
                
                // Variation weights
                variations: {},
                
                // Color and probability
                color: Math.random(),
                probability: 1 / this.numFunctions
            };
            
            // Assign random variations
            const numVariations = 1 + Math.floor(Math.random() * 3);
            for (let j = 0; j < numVariations; j++) {
                const variation = this.variations[Math.floor(Math.random() * this.variations.length)];
                func.variations[variation] = Math.random();
            }
            
            system.functions.push(func);
        }
        
        return system;
    }
    
    generateColorPalette() {
        const palette = [];
        const paletteSize = 256;
        
        // Generate smooth color transitions
        for (let i = 0; i < paletteSize; i++) {
            const t = i / paletteSize;
            
            // Multiple color schemes
            let hue, saturation, lightness;
            
            if (this.paletteIndex === 0) {
                // Fire palette
                hue = t * 60; // Red to yellow
                saturation = 90 + t * 10;
                lightness = 20 + t * 60;
            } else if (this.paletteIndex === 1) {
                // Electric palette
                hue = 240 + t * 120; // Blue to magenta
                saturation = 80 + t * 20;
                lightness = 30 + t * 50;
            } else if (this.paletteIndex === 2) {
                // Psychedelic palette
                hue = t * 360; // Full spectrum
                saturation = 90 + Math.sin(t * Math.PI * 4) * 10;
                lightness = 40 + Math.sin(t * Math.PI * 6) * 30;
            } else {
                // Ocean palette
                hue = 180 + t * 60; // Cyan to blue
                saturation = 70 + t * 30;
                lightness = 25 + t * 55;
            }
            
            palette.push({ hue: hue % 360, saturation, lightness });
        }
        
        return palette;
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Analyze harmonic content
        this.analyzeHarmonics(frequencyData, bufferLength);
        
        // Update flame system based on audio
        this.updateFlameSystem(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Generate flame points
        this.generateFlamePoints(totalEnergy, bassEnergy);
        
        // Render the fractal flame
        this.renderFractalFlame(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    analyzeHarmonics(frequencyData, bufferLength) {
        // Analyze harmonic content and overtones
        let harmonicEnergy = 0;
        let overtoneComplexity = 0;
        
        // Look for harmonic relationships in the spectrum
        for (let fundamental = 1; fundamental < bufferLength / 8; fundamental++) {
            let harmonicSum = 0;
            let harmonicCount = 0;
            
            // Check harmonics (2f, 3f, 4f, etc.)
            for (let harmonic = 2; harmonic <= 8; harmonic++) {
                const harmonicIndex = fundamental * harmonic;
                if (harmonicIndex < bufferLength) {
                    harmonicSum += frequencyData[harmonicIndex] / 255;
                    harmonicCount++;
                }
            }
            
            if (harmonicCount > 0) {
                const harmonicStrength = harmonicSum / harmonicCount;
                harmonicEnergy += harmonicStrength;
                
                // Measure complexity by looking at harmonic distribution
                overtoneComplexity += harmonicStrength * harmonicCount;
            }
        }
        
        this.harmonicInfluence = harmonicEnergy / (bufferLength / 8);
        this.overtoneModulation = overtoneComplexity / (bufferLength / 4);
        
        // Store in history
        this.energyHistory.push({
            harmonic: this.harmonicInfluence,
            overtone: this.overtoneModulation,
            time: Date.now()
        });
        
        if (this.energyHistory.length > this.maxHistoryLength) {
            this.energyHistory.shift();
        }
    }
    
    updateFlameSystem(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Change flame system on strong harmonic content
        if (this.harmonicInfluence > 0.7 && time - this.lastSystemChange > 5) {
            this.flameSystem = this.generateFlameSystem();
            this.lastSystemChange = time;
            
            // Change color palette
            this.paletteIndex = (this.paletteIndex + 1) % 4;
            this.colorPalette = this.generateColorPalette();
        }
        
        // Modulate flame parameters based on audio
        this.modulateFlameParameters(totalEnergy, bassEnergy, midEnergy, trebleEnergy, time);
        
        // Update rendering parameters
        this.brightness = 0.8 + totalEnergy * 0.4;
        this.contrast = 0.9 + this.harmonicInfluence * 0.3;
        this.gamma = 2.0 + this.overtoneModulation * 0.5;
        
        this.animationPhase += 0.02 + totalEnergy * 0.03;
    }
    
    modulateFlameParameters(totalEnergy, bassEnergy, midEnergy, trebleEnergy, time) {
        // Modulate affine transformation coefficients
        for (let i = 0; i < this.flameSystem.functions.length; i++) {
            const func = this.flameSystem.functions[i];
            const baseFunc = { ...func }; // Store original
            
            // Bass affects scale and translation
            const bassModulation = Math.sin(time * 2 + i) * bassEnergy * 0.3;
            func.a += bassModulation * 0.1;
            func.d += bassModulation * 0.1;
            func.e += bassModulation * 0.2;
            func.f += bassModulation * 0.2;
            
            // Mid frequencies affect rotation and shear
            const midModulation = Math.sin(time * 3 + i * 1.5) * midEnergy * 0.2;
            func.b += midModulation * 0.15;
            func.c += midModulation * 0.15;
            
            // Treble affects variation weights
            for (const variation in func.variations) {
                const trebleModulation = Math.sin(time * 4 + i * 2) * trebleEnergy * 0.1;
                func.variations[variation] = Math.max(0, func.variations[variation] + trebleModulation);
            }
            
            // Harmonic content affects color
            func.color = (func.color + this.harmonicInfluence * 0.1) % 1;
        }
        
        // Modulate color speed
        this.flameSystem.colorSpeed = 0.3 + this.overtoneModulation * 0.4;
    }
    
    generateFlamePoints(totalEnergy, bassEnergy) {
        const pointsToGenerate = Math.floor(500 + totalEnergy * 1500);
        
        // Start with random point
        let x = (Math.random() - 0.5) * 4;
        let y = (Math.random() - 0.5) * 4;
        let color = Math.random();
        
        // Skip initial iterations to avoid transient behavior
        for (let i = 0; i < 20; i++) {
            const result = this.iterateFlameSystem(x, y, color);
            x = result.x;
            y = result.y;
            color = result.color;
        }
        
        // Generate visible points
        for (let i = 0; i < pointsToGenerate; i++) {
            const result = this.iterateFlameSystem(x, y, color);
            x = result.x;
            y = result.y;
            color = result.color;
            
            // Convert to screen coordinates
            const screenX = this.centerX + x * 80;
            const screenY = this.centerY + y * 80;
            
            // Only add points that are visible
            if (screenX >= 0 && screenX < this.width && screenY >= 0 && screenY < this.height) {
                this.points.push({
                    x: screenX,
                    y: screenY,
                    color: color,
                    energy: totalEnergy,
                    age: 0
                });
            }
        }
        
        // Remove old points
        if (this.points.length > this.maxPoints) {
            this.points = this.points.slice(-this.maxPoints);
        }
        
        // Age all points
        this.points.forEach(point => point.age++);
    }
    
    iterateFlameSystem(x, y, color) {
        // Select random function based on probabilities
        let rand = Math.random();
        let selectedFunc = this.flameSystem.functions[0];
        
        for (const func of this.flameSystem.functions) {
            if (rand < func.probability) {
                selectedFunc = func;
                break;
            }
            rand -= func.probability;
        }
        
        // Apply affine transformation
        const newX = selectedFunc.a * x + selectedFunc.b * y + selectedFunc.e;
        const newY = selectedFunc.c * x + selectedFunc.d * y + selectedFunc.f;
        
        // Apply variations
        let finalX = 0;
        let finalY = 0;
        
        for (const [variation, weight] of Object.entries(selectedFunc.variations)) {
            const result = this.applyVariation(variation, newX, newY);
            finalX += result.x * weight;
            finalY += result.y * weight;
        }
        
        // Update color
        const newColor = (color + selectedFunc.color * this.flameSystem.colorSpeed) % 1;
        
        return { x: finalX, y: finalY, color: newColor };
    }
    
    applyVariation(variation, x, y) {
        const r = Math.sqrt(x * x + y * y);
        const theta = Math.atan2(y, x);
        
        switch (variation) {
            case 'linear':
                return { x, y };
                
            case 'sinusoidal':
                return { x: Math.sin(x), y: Math.sin(y) };
                
            case 'spherical':
                const rSq = r * r;
                return { x: x / rSq, y: y / rSq };
                
            case 'swirl':
                const sinR = Math.sin(r * r);
                const cosR = Math.cos(r * r);
                return { x: x * sinR - y * cosR, y: x * cosR + y * sinR };
                
            case 'horseshoe':
                return { x: (x - y) * (x + y) / r, y: 2 * x * y / r };
                
            case 'polar':
                return { x: theta / Math.PI, y: r - 1 };
                
            case 'handkerchief':
                return { x: r * Math.sin(theta + r), y: r * Math.cos(theta - r) };
                
            case 'heart':
                return { x: r * Math.sin(theta * r), y: -r * Math.cos(theta * r) };
                
            case 'disc':
                return { x: theta / Math.PI * Math.sin(Math.PI * r), y: theta / Math.PI * Math.cos(Math.PI * r) };
                
            case 'spiral':
                return { x: (Math.cos(theta) + Math.sin(r)) / r, y: (Math.sin(theta) - Math.cos(r)) / r };
                
            case 'hyperbolic':
                return { x: Math.sin(theta) / r, y: r * Math.cos(theta) };
                
            case 'diamond':
                return { x: Math.sin(theta) * Math.cos(r), y: Math.cos(theta) * Math.sin(r) };
                
            default:
                return { x, y };
        }
    }
    
    renderFractalFlame(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Create density map for better rendering
        const densityMap = new Map();
        
        // Count point density
        for (const point of this.points) {
            const key = `${Math.floor(point.x)},${Math.floor(point.y)}`;
            densityMap.set(key, (densityMap.get(key) || 0) + 1);
        }
        
        // Render points with density-based coloring
        for (const point of this.points) {
            const densityKey = `${Math.floor(point.x)},${Math.floor(point.y)}`;
            const density = densityMap.get(densityKey) || 1;
            
            // Get color from palette
            const paletteIndex = Math.floor(point.color * (this.colorPalette.length - 1));
            const paletteColor = this.colorPalette[paletteIndex];
            
            // Adjust color based on density and audio
            let { hue, saturation, lightness } = paletteColor;
            
            // Density affects brightness
            lightness = Math.min(100, lightness + Math.log(density) * 10);
            
            // Audio affects color properties
            hue = (hue + this.harmonicInfluence * 60 + time * 10) % 360;
            saturation = Math.min(100, saturation + this.overtoneModulation * 20);
            
            // Age affects alpha
            const ageAlpha = Math.max(0, 1 - point.age / 100);
            const energyAlpha = 0.3 + point.energy * 0.7;
            const alpha = ageAlpha * energyAlpha * this.brightness;
            
            // Apply gamma correction
            const correctedLightness = Math.pow(lightness / 100, 1 / this.gamma) * 100;
            
            // Draw point
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${correctedLightness}%, ${alpha})`;
            
            // Point size based on density and energy
            const pointSize = Math.max(0.5, Math.log(density) * 0.5 + totalEnergy * 2);
            
            if (pointSize > 1) {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, pointSize, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(point.x, point.y, 1, 1);
            }
        }
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw flame system info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(30, 80%, 70%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Fractal Flames`, 20, 30);
            this.ctx.fillText(`Points: ${this.points.length}`, 20, 50);
            this.ctx.fillText(`Functions: ${this.flameSystem.functions.length}`, 20, 70);
            this.ctx.fillText(`Harmonic: ${(this.harmonicInfluence * 100).toFixed(1)}%`, 20, 90);
            this.ctx.fillText(`Overtone: ${(this.overtoneModulation * 100).toFixed(1)}%`, 20, 110);
        }
        
        // Draw color palette indicator
        if (totalEnergy > 0.5) {
            this.drawColorPalette(time, totalEnergy);
        }
        
        // Draw harmonic analysis
        if (totalEnergy > 0.6) {
            this.drawHarmonicAnalysis(time, totalEnergy);
        }
    }
    
    drawColorPalette(time, totalEnergy) {
        const paletteWidth = 200;
        const paletteHeight = 20;
        const startX = this.width - paletteWidth - 20;
        const startY = 20;
        
        // Draw palette
        for (let i = 0; i < paletteWidth; i++) {
            const t = i / paletteWidth;
            const paletteIndex = Math.floor(t * (this.colorPalette.length - 1));
            const color = this.colorPalette[paletteIndex];
            
            this.ctx.fillStyle = `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`;
            this.ctx.fillRect(startX + i, startY, 1, paletteHeight);
        }
        
        // Draw palette frame
        this.ctx.strokeStyle = `hsla(0, 0%, 80%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(startX, startY, paletteWidth, paletteHeight);
        
        // Draw palette label
        this.ctx.fillStyle = `hsla(30, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Color Palette', startX, startY - 5);
    }
    
    drawHarmonicAnalysis(time, totalEnergy) {
        // Draw harmonic content over time
        const graphWidth = 150;
        const graphHeight = 60;
        const startX = this.width - graphWidth - 20;
        const startY = this.height - graphHeight - 40;
        
        this.ctx.strokeStyle = `hsla(120, 70%, 60%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.lineWidth = 1;
        
        // Draw harmonic history
        this.ctx.beginPath();
        for (let i = 0; i < this.energyHistory.length; i++) {
            const x = startX + (i / this.energyHistory.length) * graphWidth;
            const y = startY + graphHeight - this.energyHistory[i].harmonic * graphHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw overtone history
        this.ctx.strokeStyle = `hsla(300, 70%, 60%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.beginPath();
        for (let i = 0; i < this.energyHistory.length; i++) {
            const x = startX + (i / this.energyHistory.length) * graphWidth;
            const y = startY + graphHeight - this.energyHistory[i].overtone * graphHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw graph frame
        this.ctx.strokeStyle = `hsla(0, 0%, 60%, 0.5)`;
        this.ctx.strokeRect(startX, startY, graphWidth, graphHeight);
        
        // Draw labels
        this.ctx.fillStyle = `hsla(30, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Harmonic Analysis', startX, startY - 5);
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('fractalFlames', FractalFlamesVisualization);
    }
});
