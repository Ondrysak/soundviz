class SierpinskiTriangleVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Sierpinski triangle parameters
        this.maxDepth = 8;
        this.currentDepth = 5;
        this.triangleSize = 300;
        
        // Audio-reactive parameters
        this.kickThreshold = 0.7;
        this.hiHatThreshold = 0.5;
        this.lastKickTime = 0;
        this.lastHiHatTime = 0;
        this.beatCooldown = 0;
        
        // Visual state
        this.removedTriangles = new Set();
        this.brightTriangles = new Set();
        this.triangleFlashTimes = new Map();
        
        // Color schemes
        this.colorSchemes = [
            { name: 'Electric', base: 240, range: 60 }, // Blues to purples
            { name: 'Fire', base: 0, range: 60 },       // Reds to oranges
            { name: 'Nature', base: 120, range: 60 },   // Greens
            { name: 'Sunset', base: 300, range: 120 },  // Purples to reds
            { name: 'Ocean', base: 180, range: 60 }     // Cyans to blues
        ];
        this.currentColorScheme = 0;
        
        // Pre-compute triangle hierarchy
        this.triangleHierarchy = [];
        this.computeTriangleHierarchy();
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.triangleSize = Math.min(width, height) * 0.7;
        this.initialize();
    }
    
    computeTriangleHierarchy() {
        // Compute all triangles in the Sierpinski hierarchy
        this.triangleHierarchy = [];
        
        // Base triangle
        const baseTriangle = {
            depth: 0,
            x: this.centerX,
            y: this.centerY - this.triangleSize / 3,
            size: this.triangleSize,
            id: '0'
        };
        
        this.triangleHierarchy.push(baseTriangle);
        this.computeSubTriangles(baseTriangle, 1);
    }
    
    computeSubTriangles(parentTriangle, depth) {
        if (depth > this.maxDepth) return;
        
        const { x, y, size } = parentTriangle;
        const newSize = size / 2;
        const height = (Math.sqrt(3) / 2) * size;
        const newHeight = height / 2;
        
        // Three sub-triangles
        const subTriangles = [
            // Top triangle
            {
                depth: depth,
                x: x,
                y: y - newHeight / 2,
                size: newSize,
                id: parentTriangle.id + '0'
            },
            // Bottom left triangle
            {
                depth: depth,
                x: x - newSize / 2,
                y: y + newHeight / 2,
                size: newSize,
                id: parentTriangle.id + '1'
            },
            // Bottom right triangle
            {
                depth: depth,
                x: x + newSize / 2,
                y: y + newHeight / 2,
                size: newSize,
                id: parentTriangle.id + '2'
            }
        ];
        
        for (const triangle of subTriangles) {
            this.triangleHierarchy.push(triangle);
            this.computeSubTriangles(triangle, depth + 1);
        }
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Detect beats and update visual state
        this.detectBeats(audioData, bassEnergy, trebleEnergy, time);
        
        // Update parameters based on audio
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Draw the Sierpinski triangle
        this.drawSierpinskiTriangle(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    detectBeats(audioData, bassEnergy, trebleEnergy, time) {
        this.beatCooldown = Math.max(0, this.beatCooldown - 1);
        
        // Kick drum detection (bass frequencies)
        if (bassEnergy > this.kickThreshold && this.beatCooldown === 0) {
            this.lastKickTime = time;
            this.beatCooldown = 10;
            
            // Remove/brighten large triangles on kick
            this.handleKickBeat(bassEnergy);
            
            // Change color scheme on strong kicks
            if (bassEnergy > 0.9) {
                this.currentColorScheme = (this.currentColorScheme + 1) % this.colorSchemes.length;
            }
        }
        
        // Hi-hat detection (treble frequencies)
        if (trebleEnergy > this.hiHatThreshold) {
            this.lastHiHatTime = time;
            
            // Affect smaller subdivisions on hi-hats
            this.handleHiHatBeat(trebleEnergy);
        }
        
        // Clean up old flash effects
        this.cleanupFlashEffects(time);
    }
    
    handleKickBeat(bassEnergy) {
        // Target larger triangles (lower depth) for kick drums
        const targetDepth = Math.floor(2 + bassEnergy * 3);
        const trianglesAtDepth = this.triangleHierarchy.filter(t => t.depth === targetDepth);
        
        if (trianglesAtDepth.length > 0) {
            // Randomly select triangles to affect
            const numToAffect = Math.floor(bassEnergy * trianglesAtDepth.length * 0.3);
            
            for (let i = 0; i < numToAffect; i++) {
                const randomTriangle = trianglesAtDepth[Math.floor(Math.random() * trianglesAtDepth.length)];
                
                if (bassEnergy > 0.8) {
                    // Remove triangle for very strong kicks
                    this.removedTriangles.add(randomTriangle.id);
                    this.triangleFlashTimes.set(randomTriangle.id, Date.now());
                } else {
                    // Brighten triangle for moderate kicks
                    this.brightTriangles.add(randomTriangle.id);
                    this.triangleFlashTimes.set(randomTriangle.id, Date.now());
                }
            }
        }
    }
    
    handleHiHatBeat(trebleEnergy) {
        // Target smaller triangles (higher depth) for hi-hats
        const targetDepth = Math.floor(4 + trebleEnergy * 3);
        const trianglesAtDepth = this.triangleHierarchy.filter(t => t.depth === targetDepth);
        
        if (trianglesAtDepth.length > 0) {
            const numToAffect = Math.floor(trebleEnergy * trianglesAtDepth.length * 0.2);
            
            for (let i = 0; i < numToAffect; i++) {
                const randomTriangle = trianglesAtDepth[Math.floor(Math.random() * trianglesAtDepth.length)];
                this.brightTriangles.add(randomTriangle.id);
                this.triangleFlashTimes.set(randomTriangle.id, Date.now());
            }
        }
    }
    
    cleanupFlashEffects(time) {
        const currentTime = Date.now();
        const flashDuration = 2000; // 2 seconds
        
        // Remove expired effects
        for (const [triangleId, flashTime] of this.triangleFlashTimes.entries()) {
            if (currentTime - flashTime > flashDuration) {
                this.removedTriangles.delete(triangleId);
                this.brightTriangles.delete(triangleId);
                this.triangleFlashTimes.delete(triangleId);
            }
        }
    }
    
    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        // Depth based on total energy
        this.currentDepth = Math.floor(4 + totalEnergy * 4);
        this.currentDepth = Math.min(this.maxDepth, this.currentDepth);
        
        // Adjust thresholds based on overall energy
        this.kickThreshold = 0.6 + totalEnergy * 0.2;
        this.hiHatThreshold = 0.4 + totalEnergy * 0.3;
    }
    
    drawSierpinskiTriangle(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const colorScheme = this.colorSchemes[this.currentColorScheme];
        
        // Draw triangles by depth (back to front)
        for (let depth = this.currentDepth; depth >= 0; depth--) {
            const trianglesAtDepth = this.triangleHierarchy.filter(t => t.depth === depth);
            
            for (const triangle of trianglesAtDepth) {
                if (this.removedTriangles.has(triangle.id)) {
                    // Skip removed triangles or draw them with special effect
                    this.drawRemovedTriangle(triangle, time, totalEnergy);
                    continue;
                }
                
                // Calculate triangle color
                const color = this.getTriangleColor(triangle, colorScheme, totalEnergy, time);
                const isBright = this.brightTriangles.has(triangle.id);
                
                // Draw the triangle
                this.drawTriangle(triangle, color, isBright, totalEnergy, time);
            }
        }
    }
    
    getTriangleColor(triangle, colorScheme, totalEnergy, time) {
        const { depth, id } = triangle;
        
        // Base hue from color scheme
        let hue = colorScheme.base + (depth / this.maxDepth) * colorScheme.range;
        
        // Add time-based variation
        hue += Math.sin(time * 0.5 + depth) * 20;
        
        // Add triangle-specific variation
        const idHash = this.hashString(id);
        hue += (idHash % 30) - 15;
        
        hue = hue % 360;
        
        // Saturation and lightness based on depth and energy
        const saturation = 60 + totalEnergy * 30 + (depth / this.maxDepth) * 20;
        const lightness = 30 + totalEnergy * 40 + (1 - depth / this.maxDepth) * 30;
        
        return { hue, saturation, lightness };
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    drawTriangle(triangle, color, isBright, totalEnergy, time) {
        const { x, y, size } = triangle;
        const height = (Math.sqrt(3) / 2) * size;
        
        // Calculate triangle vertices
        const vertices = [
            { x: x, y: y - height / 2 },           // Top
            { x: x - size / 2, y: y + height / 2 }, // Bottom left
            { x: x + size / 2, y: y + height / 2 }  // Bottom right
        ];
        
        // Adjust color for brightness
        let { hue, saturation, lightness } = color;
        if (isBright) {
            lightness = Math.min(100, lightness + 40);
            saturation = Math.min(100, saturation + 20);
        }
        
        // Add audio-reactive pulsing
        const pulse = Math.sin(time * 4 + triangle.depth) * totalEnergy * 0.1;
        const adjustedVertices = vertices.map(v => ({
            x: x + (v.x - x) * (1 + pulse),
            y: y + (v.y - y) * (1 + pulse)
        }));
        
        // Set fill style
        const alpha = 0.7 + totalEnergy * 0.3;
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        
        // Add glow effect for bright triangles
        if (isBright) {
            this.ctx.shadowColor = `hsla(${hue}, 100%, 80%, ${alpha})`;
            this.ctx.shadowBlur = 10 + totalEnergy * 10;
        } else {
            this.ctx.shadowBlur = 0;
        }
        
        // Draw filled triangle
        this.ctx.beginPath();
        this.ctx.moveTo(adjustedVertices[0].x, adjustedVertices[0].y);
        this.ctx.lineTo(adjustedVertices[1].x, adjustedVertices[1].y);
        this.ctx.lineTo(adjustedVertices[2].x, adjustedVertices[2].y);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw outline for higher energy
        if (totalEnergy > 0.5) {
            this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${Math.min(100, lightness + 20)}%, ${alpha * 0.8})`;
            this.ctx.lineWidth = 1 + totalEnergy * 2;
            this.ctx.stroke();
        }
    }
    
    drawRemovedTriangle(triangle, time, totalEnergy) {
        // Draw ghost effect for removed triangles
        const { x, y, size } = triangle;
        const height = (Math.sqrt(3) / 2) * size;
        
        const flashTime = this.triangleFlashTimes.get(triangle.id) || Date.now();
        const timeSinceFlash = (Date.now() - flashTime) / 1000;
        const alpha = Math.max(0, 0.3 - timeSinceFlash * 0.15);
        
        if (alpha > 0) {
            this.ctx.strokeStyle = `hsla(0, 100%, 80%, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - height / 2);
            this.ctx.lineTo(x - size / 2, y + height / 2);
            this.ctx.lineTo(x + size / 2, y + height / 2);
            this.ctx.closePath();
            this.ctx.stroke();
            
            this.ctx.setLineDash([]);
        }
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        
        // Draw visualization info
        if (totalEnergy > 0.3) {
            const colorScheme = this.colorSchemes[this.currentColorScheme];
            this.ctx.fillStyle = `hsla(${colorScheme.base}, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Sierpinski Triangle - Depth: ${this.currentDepth}`, 20, 30);
            this.ctx.fillText(`Color Scheme: ${colorScheme.name}`, 20, 50);
            this.ctx.fillText(`Removed: ${this.removedTriangles.size}`, 20, 70);
            this.ctx.fillText(`Bright: ${this.brightTriangles.size}`, 20, 90);
        }
        
        // Draw beat indicators
        this.drawBeatIndicators(time, totalEnergy, trebleEnergy);
        
        // Draw fractal dimension info
        if (totalEnergy > 0.6) {
            this.drawFractalInfo(time, totalEnergy);
        }
    }
    
    drawBeatIndicators(time, totalEnergy, trebleEnergy) {
        // Kick indicator
        const timeSinceKick = time - this.lastKickTime;
        if (timeSinceKick < 1) {
            const kickAlpha = Math.max(0, 1 - timeSinceKick);
            this.ctx.fillStyle = `hsla(0, 100%, 70%, ${kickAlpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width - 80, 50, 15 + kickAlpha * 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = `hsla(0, 100%, 90%, ${kickAlpha})`;
            this.ctx.font = '12px monospace';
            this.ctx.fillText('KICK', this.width - 95, 58);
        }
        
        // Hi-hat indicator
        const timeSinceHiHat = time - this.lastHiHatTime;
        if (timeSinceHiHat < 0.5) {
            const hiHatAlpha = Math.max(0, 1 - timeSinceHiHat * 2);
            this.ctx.fillStyle = `hsla(60, 100%, 70%, ${hiHatAlpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width - 80, 90, 8 + hiHatAlpha * 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = `hsla(60, 100%, 90%, ${hiHatAlpha})`;
            this.ctx.font = '10px monospace';
            this.ctx.fillText('HI-HAT', this.width - 105, 95);
        }
    }
    
    drawFractalInfo(time, totalEnergy) {
        // Draw fractal properties
        const totalTriangles = Math.pow(3, this.currentDepth);
        const visibleTriangles = totalTriangles - this.removedTriangles.size;
        
        this.ctx.fillStyle = `hsla(280, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Total Triangles: ${totalTriangles}`, this.width - 200, this.height - 60);
        this.ctx.fillText(`Visible: ${visibleTriangles}`, this.width - 200, this.height - 45);
        this.ctx.fillText(`Fractal Dim: ~1.585`, this.width - 200, this.height - 30);
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('sierpinskiTriangle', SierpinskiTriangleVisualization);
    }
});
