class RecursivePolygonVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Polygon parameters
        this.maxDepth = 6;
        this.currentDepth = 3;
        this.baseSides = 6; // Start with hexagon
        
        // Polygon types for different moods
        this.polygonTypes = [
            { sides: 3, name: 'Triangle', angle: 0 },
            { sides: 4, name: 'Square', angle: Math.PI / 4 },
            { sides: 5, name: 'Pentagon', angle: 0 },
            { sides: 6, name: 'Hexagon', angle: 0 },
            { sides: 8, name: 'Octagon', angle: 0 },
            { sides: 12, name: 'Dodecagon', angle: 0 }
        ];
        this.currentPolygonType = 3; // Start with hexagon
        
        // Beat detection
        this.lastBeatTime = 0;
        this.beatThreshold = 0.6;
        this.beatCooldown = 0;
        this.beatHistory = [];
        this.maxBeatHistory = 16;
        
        // Visual state
        this.activePolygons = new Set();
        this.subdivisionTriggers = new Map();
        this.polygonFlashTimes = new Map();
        
        // Subdivision patterns
        this.subdivisionPatterns = [
            'center', 'corners', 'edges', 'spiral', 'radial', 'grid'
        ];
        this.currentPattern = 0;
        
        // Color scheme for techno aesthetics
        this.colorSchemes = [
            { name: 'Neon', base: 300, accent: 60, bg: 240 },   // Purple/Yellow
            { name: 'Cyber', base: 180, accent: 0, bg: 200 },   // Cyan/Red
            { name: 'Matrix', base: 120, accent: 300, bg: 140 }, // Green/Purple
            { name: 'Synthwave', base: 320, accent: 180, bg: 280 }, // Magenta/Cyan
            { name: 'Minimal', base: 0, accent: 0, bg: 0 }      // Monochrome
        ];
        this.currentColorScheme = 0;
        
        // Pre-compute polygon hierarchy
        this.polygonHierarchy = [];
        this.computePolygonHierarchy();
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initialize();
    }
    
    computePolygonHierarchy() {
        this.polygonHierarchy = [];
        const polygonType = this.polygonTypes[this.currentPolygonType];
        
        // Base polygon
        const basePolygon = {
            depth: 0,
            x: this.centerX,
            y: this.centerY,
            size: Math.min(this.width, this.height) * 0.3,
            sides: polygonType.sides,
            rotation: polygonType.angle,
            id: '0',
            pattern: this.currentPattern
        };
        
        this.polygonHierarchy.push(basePolygon);
        this.computeSubPolygons(basePolygon, 1);
    }
    
    computeSubPolygons(parentPolygon, depth) {
        if (depth > this.maxDepth) return;
        
        const { x, y, size, sides, rotation, id, pattern } = parentPolygon;
        const newSize = size * 0.4; // Subdivision size ratio
        
        // Different subdivision patterns
        const subPolygons = this.generateSubdivisionPattern(
            x, y, size, newSize, sides, rotation, depth, id, pattern
        );
        
        for (const subPolygon of subPolygons) {
            this.polygonHierarchy.push(subPolygon);
            this.computeSubPolygons(subPolygon, depth + 1);
        }
    }
    
    generateSubdivisionPattern(x, y, size, newSize, sides, rotation, depth, parentId, pattern) {
        const subPolygons = [];
        
        switch (pattern) {
            case 0: // Center
                subPolygons.push({
                    depth, x, y, size: newSize, sides, rotation,
                    id: parentId + '0', pattern
                });
                break;
                
            case 1: // Corners
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2 + rotation;
                    const distance = size * 0.6;
                    const subX = x + Math.cos(angle) * distance;
                    const subY = y + Math.sin(angle) * distance;
                    
                    subPolygons.push({
                        depth, x: subX, y: subY, size: newSize, sides, 
                        rotation: rotation + angle, id: parentId + i, pattern
                    });
                }
                break;
                
            case 2: // Edges
                for (let i = 0; i < sides; i++) {
                    const angle1 = (i / sides) * Math.PI * 2 + rotation;
                    const angle2 = ((i + 1) / sides) * Math.PI * 2 + rotation;
                    const midAngle = (angle1 + angle2) / 2;
                    const distance = size * 0.7;
                    const subX = x + Math.cos(midAngle) * distance;
                    const subY = y + Math.sin(midAngle) * distance;
                    
                    subPolygons.push({
                        depth, x: subX, y: subY, size: newSize, sides,
                        rotation: rotation + midAngle, id: parentId + i, pattern
                    });
                }
                break;
                
            case 3: // Spiral
                const spiralCount = Math.min(8, sides * 2);
                for (let i = 0; i < spiralCount; i++) {
                    const angle = (i / spiralCount) * Math.PI * 4 + rotation;
                    const distance = (size * 0.3) + (i / spiralCount) * (size * 0.4);
                    const subX = x + Math.cos(angle) * distance;
                    const subY = y + Math.sin(angle) * distance;
                    
                    subPolygons.push({
                        depth, x: subX, y: subY, size: newSize * (1 - i / spiralCount * 0.5),
                        sides, rotation: rotation + angle, id: parentId + i, pattern
                    });
                }
                break;
                
            case 4: // Radial
                const radialRings = 2;
                const radialCount = sides;
                for (let ring = 1; ring <= radialRings; ring++) {
                    for (let i = 0; i < radialCount; i++) {
                        const angle = (i / radialCount) * Math.PI * 2 + rotation;
                        const distance = (size * 0.3) * ring;
                        const subX = x + Math.cos(angle) * distance;
                        const subY = y + Math.sin(angle) * distance;
                        
                        subPolygons.push({
                            depth, x: subX, y: subY, size: newSize / ring,
                            sides, rotation: rotation + angle, 
                            id: parentId + ring + i, pattern
                        });
                    }
                }
                break;
                
            case 5: // Grid
                const gridSize = 3;
                const spacing = size * 0.4;
                for (let i = 0; i < gridSize; i++) {
                    for (let j = 0; j < gridSize; j++) {
                        if (i === 1 && j === 1) continue; // Skip center
                        const subX = x + (i - 1) * spacing;
                        const subY = y + (j - 1) * spacing;
                        
                        subPolygons.push({
                            depth, x: subX, y: subY, size: newSize, sides,
                            rotation, id: parentId + i + j, pattern
                        });
                    }
                }
                break;
        }
        
        return subPolygons;
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        // Detect beats and trigger subdivisions
        this.detectBeats(audioData, bassEnergy, totalEnergy, time);
        
        // Update parameters based on audio
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Draw the recursive polygons
        this.drawRecursivePolygons(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);
        
        // Add overlay effects
        this.addOverlayEffects(audioData, totalEnergy, trebleEnergy);
    }
    
    detectBeats(audioData, bassEnergy, totalEnergy, time) {
        this.beatCooldown = Math.max(0, this.beatCooldown - 1);
        
        // Store beat history for rhythm analysis
        this.beatHistory.push(bassEnergy);
        if (this.beatHistory.length > this.maxBeatHistory) {
            this.beatHistory.shift();
        }
        
        if (bassEnergy > this.beatThreshold && this.beatCooldown === 0) {
            this.lastBeatTime = time;
            this.beatCooldown = 8; // Prevent multiple beats in quick succession
            
            // Trigger subdivision based on beat strength
            this.triggerSubdivision(bassEnergy, totalEnergy);
            
            // Change polygon type on very strong beats
            if (bassEnergy > 0.9) {
                this.currentPolygonType = (this.currentPolygonType + 1) % this.polygonTypes.length;
                this.computePolygonHierarchy();
            }
            
            // Change subdivision pattern on strong beats
            if (bassEnergy > 0.8) {
                this.currentPattern = (this.currentPattern + 1) % this.subdivisionPatterns.length;
            }
            
            // Change color scheme occasionally
            if (bassEnergy > 0.85 && Math.random() < 0.3) {
                this.currentColorScheme = (this.currentColorScheme + 1) % this.colorSchemes.length;
            }
        }
    }
    
    triggerSubdivision(beatStrength, totalEnergy) {
        // Determine subdivision depth based on beat strength
        const targetDepth = Math.floor(1 + beatStrength * (this.maxDepth - 1));
        
        // Find polygons at target depth
        const candidatePolygons = this.polygonHierarchy.filter(p => p.depth === targetDepth);
        
        if (candidatePolygons.length > 0) {
            // Select polygons to activate
            const numToActivate = Math.floor(beatStrength * candidatePolygons.length * 0.5);
            
            for (let i = 0; i < numToActivate; i++) {
                const randomPolygon = candidatePolygons[Math.floor(Math.random() * candidatePolygons.length)];
                this.activePolygons.add(randomPolygon.id);
                this.polygonFlashTimes.set(randomPolygon.id, Date.now());
            }
        }
    }
    
    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        // Depth based on total energy
        this.currentDepth = Math.floor(2 + totalEnergy * 4);
        this.currentDepth = Math.min(this.maxDepth, this.currentDepth);
        
        // Clean up old flash effects
        this.cleanupFlashEffects();
    }
    
    cleanupFlashEffects() {
        const currentTime = Date.now();
        const flashDuration = 2000; // 2 seconds
        
        for (const [polygonId, flashTime] of this.polygonFlashTimes.entries()) {
            if (currentTime - flashTime > flashDuration) {
                this.activePolygons.delete(polygonId);
                this.polygonFlashTimes.delete(polygonId);
            }
        }
    }
    
    drawRecursivePolygons(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;
        const colorScheme = this.colorSchemes[this.currentColorScheme];
        
        // Draw polygons by depth (back to front)
        for (let depth = this.currentDepth; depth >= 0; depth--) {
            const polygonsAtDepth = this.polygonHierarchy.filter(p => p.depth === depth);
            
            for (const polygon of polygonsAtDepth) {
                const isActive = this.activePolygons.has(polygon.id);
                this.drawPolygon(polygon, isActive, colorScheme, totalEnergy, time);
            }
        }
    }
    
    drawPolygon(polygon, isActive, colorScheme, totalEnergy, time) {
        const { x, y, size, sides, rotation, depth } = polygon;
        
        // Calculate color
        let hue, saturation, lightness, alpha;
        
        if (colorScheme.name === 'Minimal') {
            // Monochrome scheme
            hue = 0;
            saturation = 0;
            lightness = isActive ? 80 : 20 + (1 - depth / this.maxDepth) * 40;
            alpha = isActive ? 0.9 : 0.6;
        } else {
            // Color schemes
            if (isActive) {
                hue = colorScheme.accent;
                saturation = 90 + totalEnergy * 10;
                lightness = 70 + totalEnergy * 20;
                alpha = 0.8 + totalEnergy * 0.2;
            } else {
                hue = colorScheme.base + (depth / this.maxDepth) * 60;
                saturation = 60 + totalEnergy * 30;
                lightness = 30 + (1 - depth / this.maxDepth) * 30;
                alpha = 0.4 + totalEnergy * 0.3;
            }
        }
        
        // Audio-reactive pulsing
        const pulse = Math.sin(time * 4 + depth) * totalEnergy * 0.1;
        const adjustedSize = size * (1 + pulse);
        
        // Set drawing properties
        this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.lineWidth = isActive ? 2 + totalEnergy * 3 : 1 + totalEnergy;
        
        // Add glow effect for active polygons
        if (isActive) {
            this.ctx.shadowColor = `hsla(${hue}, 100%, 80%, ${alpha})`;
            this.ctx.shadowBlur = 5 + totalEnergy * 15;
        } else {
            this.ctx.shadowBlur = 0;
        }
        
        // Draw the polygon
        this.drawPolygonShape(x, y, adjustedSize, sides, rotation);
        
        // Fill for high energy or active polygons
        if (isActive || totalEnergy > 0.7) {
            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.3})`;
            this.ctx.fill();
        }
        
        this.ctx.stroke();
        
        // Draw center dot for active polygons
        if (isActive && depth > 2) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2 + totalEnergy * 3, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${alpha})`;
            this.ctx.fill();
        }
    }
    
    drawPolygonShape(x, y, size, sides, rotation) {
        this.ctx.beginPath();
        
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 + rotation;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        
        this.ctx.closePath();
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;
        const polygonType = this.polygonTypes[this.currentPolygonType];
        const colorScheme = this.colorSchemes[this.currentColorScheme];
        const pattern = this.subdivisionPatterns[this.currentPattern];
        
        // Draw visualization info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(${colorScheme.base}, 70%, 70%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`${polygonType.name} Subdivision`, 20, 30);
            this.ctx.fillText(`Pattern: ${pattern}`, 20, 50);
            this.ctx.fillText(`Depth: ${this.currentDepth}`, 20, 70);
            this.ctx.fillText(`Active: ${this.activePolygons.size}`, 20, 90);
            this.ctx.fillText(`Scheme: ${colorScheme.name}`, 20, 110);
        }
        
        // Draw beat indicator
        const timeSinceLastBeat = time - this.lastBeatTime;
        if (timeSinceLastBeat < 1) {
            const beatAlpha = Math.max(0, 1 - timeSinceLastBeat);
            this.ctx.fillStyle = `hsla(${colorScheme.accent}, 100%, 70%, ${beatAlpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(this.width - 50, 50, 8 + beatAlpha * 12, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw rhythm pattern visualization
        if (totalEnergy > 0.5) {
            this.drawRhythmPattern(time, totalEnergy, colorScheme);
        }
        
        // Draw subdivision pattern preview
        if (totalEnergy > 0.6) {
            this.drawPatternPreview(time, totalEnergy, colorScheme);
        }
    }
    
    drawRhythmPattern(time, totalEnergy, colorScheme) {
        // Visualize beat history as a rhythm pattern
        const patternWidth = 160;
        const patternHeight = 20;
        const startX = this.width - patternWidth - 20;
        const startY = this.height - 60;
        
        const beatWidth = patternWidth / this.maxBeatHistory;
        
        for (let i = 0; i < this.beatHistory.length; i++) {
            const beatStrength = this.beatHistory[i];
            const x = startX + i * beatWidth;
            const barHeight = beatStrength * patternHeight;
            
            this.ctx.fillStyle = `hsla(${colorScheme.accent}, 70%, 60%, ${0.5 + beatStrength * 0.5})`;
            this.ctx.fillRect(x, startY + patternHeight - barHeight, beatWidth - 1, barHeight);
        }
        
        // Draw frame
        this.ctx.strokeStyle = `hsla(${colorScheme.base}, 50%, 50%, 0.5)`;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(startX, startY, patternWidth, patternHeight);
        
        // Label
        this.ctx.fillStyle = `hsla(${colorScheme.base}, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Rhythm Pattern', startX, startY - 5);
    }
    
    drawPatternPreview(time, totalEnergy, colorScheme) {
        // Show subdivision pattern as a small preview
        const previewSize = 40;
        const startX = this.width - previewSize - 20;
        const startY = this.height - previewSize - 100;
        
        // Draw preview polygon
        this.ctx.strokeStyle = `hsla(${colorScheme.base}, 70%, 60%, ${0.6 + totalEnergy * 0.4})`;
        this.ctx.lineWidth = 1;
        
        const polygonType = this.polygonTypes[this.currentPolygonType];
        this.drawPolygonShape(
            startX + previewSize / 2,
            startY + previewSize / 2,
            previewSize * 0.4,
            polygonType.sides,
            polygonType.angle
        );
        this.ctx.stroke();
        
        // Draw subdivision points
        const subPolygons = this.generateSubdivisionPattern(
            startX + previewSize / 2,
            startY + previewSize / 2,
            previewSize * 0.4,
            previewSize * 0.15,
            polygonType.sides,
            polygonType.angle,
            1,
            '0',
            this.currentPattern
        );
        
        for (const subPoly of subPolygons) {
            this.ctx.beginPath();
            this.ctx.arc(subPoly.x, subPoly.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${colorScheme.accent}, 80%, 70%, ${0.8 + totalEnergy * 0.2})`;
            this.ctx.fill();
        }
        
        // Label
        this.ctx.fillStyle = `hsla(${colorScheme.base}, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Pattern', startX, startY - 5);
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('recursivePolygon', RecursivePolygonVisualization);
    }
});
