class CliffordAttractorVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.setupControls();
    }

    initialize() {
        // Multiple attractor instances
        this.attractors = [];
        this.numAttractors = 3; // Start with 3 overlapping attractors

        // Base parameters for different attractor types
        this.attractorPresets = [
            { a: -1.4, b: 1.6, c: 1.0, d: 0.7, name: 'Classic' },
            { a: -1.7, b: 1.8, c: -1.9, d: -0.4, name: 'Spiral' },
            { a: -1.8, b: -2.0, c: -0.5, d: -0.9, name: 'Butterfly' },
            { a: 1.1, b: -1.0, c: 1.0, d: 1.5, name: 'Flower' },
            { a: -1.6, b: 1.6, c: 0.7, d: -1.0, name: 'Web' },
            { a: -1.3, b: 1.3, c: 1.3, d: 1.3, name: 'Symmetric' }
        ];

        // Interactive parameter controls
        this.interactiveParams = {
            a: -1.4,
            b: 1.6,
            c: 1.0,
            d: 0.7,
            scale: 80,
            trailLength: 1000,
            numAttractors: 3
        };

        // Initialize multiple attractors
        this.initializeAttractors();

        // Audio-reactive parameters
        this.colorShift = 0;
        this.energyHistory = [];
        this.maxHistoryLength = 100;

        // Beat detection
        this.lastBeatTime = 0;
        this.beatThreshold = 0.7;
        this.beatCooldown = 0;
        this.beatBurst = 0;

        // Update controls with current values
        this.updateControlValues();
    }

    initializeAttractors() {
        this.attractors = [];

        for (let i = 0; i < this.numAttractors; i++) {
            // Create variations of the base parameters for each attractor
            const variation = i * 0.3;
            const attractor = {
                // Base parameters with slight variations
                baseParams: {
                    a: this.interactiveParams.a + Math.sin(variation) * 0.2,
                    b: this.interactiveParams.b + Math.cos(variation) * 0.2,
                    c: this.interactiveParams.c + Math.sin(variation + 1) * 0.15,
                    d: this.interactiveParams.d + Math.cos(variation + 1) * 0.15
                },
                // Current parameters (will be modulated)
                params: { a: 0, b: 0, c: 0, d: 0 },
                // Drawing state
                points: [],
                x: Math.random() * 0.1 - 0.05, // Small random starting position
                y: Math.random() * 0.1 - 0.05,
                // Visual properties
                hueOffset: (i / this.numAttractors) * 360,
                alpha: 0.6 - (i * 0.1), // Decreasing alpha for depth effect
                pointSize: 1 + (i * 0.3)
            };

            this.attractors.push(attractor);
        }
    }

    setupControls() {
        // Create control panel if it doesn't exist
        if (!document.getElementById('clifford-controls')) {
            this.createControlPanel();
        }
        this.bindControlEvents();
    }

    createControlPanel() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'clifford-controls';
        controlPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 1000;
            min-width: 200px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;

        controlPanel.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4ecdc4;">Clifford Attractor Controls</h3>

            <div style="margin-bottom: 10px;">
                <label>Parameter A: <span id="a-value">-1.4</span></label>
                <input type="range" id="param-a" min="-3" max="3" step="0.1" value="-1.4" style="width: 100%;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>Parameter B: <span id="b-value">1.6</span></label>
                <input type="range" id="param-b" min="-3" max="3" step="0.1" value="1.6" style="width: 100%;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>Parameter C: <span id="c-value">1.0</span></label>
                <input type="range" id="param-c" min="-3" max="3" step="0.1" value="1.0" style="width: 100%;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>Parameter D: <span id="d-value">0.7</span></label>
                <input type="range" id="param-d" min="-3" max="3" step="0.1" value="0.7" style="width: 100%;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>Attractors: <span id="num-attractors-value">3</span></label>
                <input type="range" id="num-attractors" min="1" max="6" step="1" value="3" style="width: 100%;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>Scale: <span id="scale-value">80</span></label>
                <input type="range" id="scale" min="20" max="200" step="5" value="80" style="width: 100%;">
            </div>

            <div style="margin-bottom: 10px;">
                <label>Trail Length: <span id="trail-value">1000</span></label>
                <input type="range" id="trail-length" min="100" max="3000" step="100" value="1000" style="width: 100%;">
            </div>

            <div style="margin-top: 15px;">
                <button id="reset-params" style="background: #667eea; border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; width: 100%;">Reset to Classic</button>
            </div>
        `;

        document.body.appendChild(controlPanel);
    }

    bindControlEvents() {
        const controls = {
            'param-a': (value) => { this.interactiveParams.a = parseFloat(value); this.updateAttractorParams(); },
            'param-b': (value) => { this.interactiveParams.b = parseFloat(value); this.updateAttractorParams(); },
            'param-c': (value) => { this.interactiveParams.c = parseFloat(value); this.updateAttractorParams(); },
            'param-d': (value) => { this.interactiveParams.d = parseFloat(value); this.updateAttractorParams(); },
            'num-attractors': (value) => { this.updateNumAttractors(parseInt(value)); },
            'scale': (value) => { this.interactiveParams.scale = parseFloat(value); },
            'trail-length': (value) => { this.interactiveParams.trailLength = parseInt(value); }
        };

        Object.keys(controls).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    controls[id](e.target.value);
                    this.updateControlDisplay(id, e.target.value);
                });
            }
        });

        const resetBtn = document.getElementById('reset-params');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToClassic());
        }
    }

    updateControlDisplay(controlId, value) {
        const displayMap = {
            'param-a': 'a-value',
            'param-b': 'b-value',
            'param-c': 'c-value',
            'param-d': 'd-value',
            'num-attractors': 'num-attractors-value',
            'scale': 'scale-value',
            'trail-length': 'trail-value'
        };

        const displayElement = document.getElementById(displayMap[controlId]);
        if (displayElement) {
            displayElement.textContent = value;
        }
    }

    updateControlValues() {
        const updates = [
            ['param-a', this.interactiveParams.a],
            ['param-b', this.interactiveParams.b],
            ['param-c', this.interactiveParams.c],
            ['param-d', this.interactiveParams.d],
            ['num-attractors', this.interactiveParams.numAttractors],
            ['scale', this.interactiveParams.scale],
            ['trail-length', this.interactiveParams.trailLength]
        ];

        updates.forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                this.updateControlDisplay(id, value);
            }
        });
    }

    updateAttractorParams() {
        // Update base parameters for all attractors
        this.attractors.forEach((attractor, i) => {
            const variation = i * 0.3;
            attractor.baseParams = {
                a: this.interactiveParams.a + Math.sin(variation) * 0.2,
                b: this.interactiveParams.b + Math.cos(variation) * 0.2,
                c: this.interactiveParams.c + Math.sin(variation + 1) * 0.15,
                d: this.interactiveParams.d + Math.cos(variation + 1) * 0.15
            };
        });
    }

    updateNumAttractors(newNum) {
        this.numAttractors = newNum;
        this.interactiveParams.numAttractors = newNum;
        this.initializeAttractors();
    }

    resetToClassic() {
        const classic = this.attractorPresets[0];
        this.interactiveParams.a = classic.a;
        this.interactiveParams.b = classic.b;
        this.interactiveParams.c = classic.c;
        this.interactiveParams.d = classic.d;
        this.updateControlValues();
        this.updateAttractorParams();
    }

    onResize(width, height) {
        super.onResize(width, height);
        this.interactiveParams.scale = Math.min(width, height) * 0.15;
        this.updateControlValues();
    }

    cleanup() {
        // Remove control panel when visualization is changed
        const controlPanel = document.getElementById('clifford-controls');
        if (controlPanel) {
            controlPanel.remove();
        }
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;

        // Calculate audio metrics
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;

        // Store energy history
        this.storeEnergyHistory(audioMetrics, time);

        // Detect beats for visual effects
        this.detectBeats(totalEnergy, bassEnergy, time);

        // Update parameters based on audio and interactive controls
        this.updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);

        // Generate points for all attractors
        this.generateMultipleAttractorPoints(totalEnergy, bassEnergy);

        // Draw all attractors with overlapping effect
        this.drawMultipleCliffordAttractors(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy);

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

            // On strong beats, add visual effects but don't change presets
            // since we now have interactive controls
            if (bassEnergy > 0.9) {
                // Create a burst effect by temporarily increasing point generation
                this.beatBurst = 30;
            }
        }
    }

    updateParameters(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;

        // Update each attractor's parameters with audio modulation
        this.attractors.forEach((attractor, index) => {
            const phaseOffset = index * Math.PI / 3; // Different phase for each attractor

            // Audio modulation (smaller effect than before to preserve interactive control)
            const audioModulation = {
                a: Math.sin(time * 1.5 + phaseOffset) * bassEnergy * 0.2,
                b: Math.sin(time * 2.0 + phaseOffset) * midEnergy * 0.15,
                c: Math.cos(time * 1.2 + phaseOffset) * bassEnergy * 0.2,
                d: Math.cos(time * 1.8 + phaseOffset) * midEnergy * 0.15
            };

            // Combine base parameters with audio modulation
            attractor.params.a = attractor.baseParams.a + audioModulation.a;
            attractor.params.b = attractor.baseParams.b + audioModulation.b;
            attractor.params.c = attractor.baseParams.c + audioModulation.c;
            attractor.params.d = attractor.baseParams.d + audioModulation.d;
        });

        // Global visual parameters
        this.colorShift = trebleEnergy * 360;
        this.scale = this.interactiveParams.scale * (1 + totalEnergy * 0.3);
        this.trailLength = Math.floor(this.interactiveParams.trailLength * (0.5 + totalEnergy * 1.5));

        // Beat burst effect
        if (this.beatBurst > 0) {
            this.beatBurst--;
        }
    }

    generateMultipleAttractorPoints(totalEnergy, bassEnergy) {
        // Number of iterations based on energy and beat burst
        const baseIterations = Math.floor(30 + totalEnergy * 100);
        const burstIterations = this.beatBurst ? this.beatBurst * 5 : 0;
        const iterations = baseIterations + burstIterations;

        // Generate points for each attractor
        this.attractors.forEach((attractor, index) => {
            this.generateAttractorPoints(attractor, iterations, totalEnergy, index);
        });
    }

    generateAttractorPoints(attractor, iterations, totalEnergy, attractorIndex) {
        for (let i = 0; i < iterations; i++) {
            // Clifford attractor equations:
            // x(n+1) = sin(a * y(n)) + c * cos(a * x(n))
            // y(n+1) = sin(b * x(n)) + d * cos(b * y(n))

            const newX = Math.sin(attractor.params.a * attractor.y) +
                        attractor.params.c * Math.cos(attractor.params.a * attractor.x);
            const newY = Math.sin(attractor.params.b * attractor.x) +
                        attractor.params.d * Math.cos(attractor.params.b * attractor.y);

            attractor.x = newX;
            attractor.y = newY;

            // Convert to screen coordinates
            const screenX = this.centerX + attractor.x * this.scale;
            const screenY = this.centerY + attractor.y * this.scale;

            // Only add points that are visible and not infinite
            if (isFinite(screenX) && isFinite(screenY) &&
                screenX >= -50 && screenX < this.width + 50 &&
                screenY >= -50 && screenY < this.height + 50) {

                attractor.points.push({
                    x: screenX,
                    y: screenY,
                    age: 0,
                    energy: totalEnergy,
                    attractorIndex: attractorIndex
                });
            }
        }

        // Remove old points to maintain trail length
        if (attractor.points.length > this.trailLength) {
            attractor.points = attractor.points.slice(-this.trailLength);
        }

        // Age all points
        attractor.points.forEach(point => point.age++);
    }
    
    drawMultipleCliffordAttractors(audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy) {
        const { time } = audioData;

        // Draw each attractor with different visual properties
        this.attractors.forEach((attractor, attractorIndex) => {
            this.drawSingleAttractor(attractor, audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy, attractorIndex);
        });

        // Draw current position indicators for all attractors
        this.attractors.forEach((attractor, index) => {
            if (attractor.points.length > 0) {
                const currentPoint = attractor.points[attractor.points.length - 1];
                this.drawCurrentPosition(currentPoint, time, totalEnergy, attractor.hueOffset, index);
            }
        });
    }

    drawSingleAttractor(attractor, audioData, totalEnergy, bassEnergy, midEnergy, trebleEnergy, attractorIndex) {
        const { time } = audioData;

        // Draw points with varying styles based on age and energy
        for (let i = 0; i < attractor.points.length; i++) {
            const point = attractor.points[i];
            const ageRatio = point.age / this.trailLength;
            const positionRatio = i / attractor.points.length;

            // Color based on attractor index, position, and audio
            let hue = (attractor.hueOffset + positionRatio * 120 + this.colorShift + time * 20) % 360;

            const saturation = 60 + point.energy * 40;
            const lightness = 25 + point.energy * 45 + (1 - ageRatio) * 35;

            // Alpha based on age, energy, and attractor depth
            const baseAlpha = attractor.alpha * (1 - ageRatio) * (0.3 + point.energy * 0.7);
            const alpha = Math.max(0, baseAlpha);

            if (alpha > 0.01) {
                // Different drawing styles based on energy and attractor index
                if (totalEnergy > 0.8) {
                    // High energy: glowing particles with connections
                    this.drawGlowingParticle(point, hue, saturation, lightness, alpha, totalEnergy, attractor.pointSize);

                    // Draw connections between points in the same attractor
                    if (i > 0 && i % 8 === 0) {
                        this.drawConnection(attractor.points[i - 1], point, hue, alpha * 0.2);
                    }

                } else if (totalEnergy > 0.5) {
                    // Medium energy: colored dots with trails
                    this.drawTrailParticle(point, hue, saturation, lightness, alpha, midEnergy, attractor.pointSize);

                } else if (totalEnergy > 0.2) {
                    // Low energy: simple points
                    this.drawSimpleParticle(point, hue, saturation, lightness, alpha, attractor.pointSize);

                } else {
                    // Very low energy: minimal dots
                    this.drawMinimalParticle(point, hue, saturation * 0.7, lightness * 0.8, alpha * 0.7);
                }
            }
        }
    }
    
    drawGlowingParticle(point, hue, saturation, lightness, alpha, energy, pointSize = 1) {
        const size = pointSize * (1 + energy * 2);

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

    drawTrailParticle(point, hue, saturation, lightness, alpha, midEnergy, pointSize = 1) {
        const size = pointSize * (1 + midEnergy);

        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.fill();
    }

    drawSimpleParticle(point, hue, saturation, lightness, alpha, pointSize = 1) {
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.fillRect(point.x - pointSize/2, point.y - pointSize/2, pointSize, pointSize);
    }

    drawMinimalParticle(point, hue, saturation, lightness, alpha) {
        this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        this.ctx.fillRect(point.x, point.y, 1, 1);
    }

    drawConnection(point1, point2, hue, alpha) {
        this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(point1.x, point1.y);
        this.ctx.lineTo(point2.x, point2.y);
        this.ctx.stroke();
    }

    drawCurrentPosition(point, time, energy, hueOffset = 0, attractorIndex = 0) {
        const pulseSize = 2 + Math.sin(time * 8 + attractorIndex) * 1.5 + energy * 2;
        const hue = (60 + hueOffset + time * 50) % 360;

        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, pulseSize, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${0.6 + energy * 0.3})`;
        this.ctx.fill();

        // Inner dot
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }
    
    addOverlayEffects(audioData, totalEnergy, trebleEnergy) {
        const { time } = audioData;

        // Draw attractor info
        if (totalEnergy > 0.3) {
            this.ctx.fillStyle = `hsla(300, 70%, 60%, ${0.7 + totalEnergy * 0.3})`;
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`Multi-Clifford Attractors: ${this.numAttractors}`, 20, 30);

            const totalPoints = this.attractors.reduce((sum, attractor) => sum + attractor.points.length, 0);
            this.ctx.fillText(`Total Points: ${totalPoints}`, 20, 50);
            this.ctx.fillText(`Base Params: a=${this.interactiveParams.a.toFixed(2)}, b=${this.interactiveParams.b.toFixed(2)}`, 20, 70);
            this.ctx.fillText(`             c=${this.interactiveParams.c.toFixed(2)}, d=${this.interactiveParams.d.toFixed(2)}`, 20, 90);
            this.ctx.fillText(`Scale: ${this.scale.toFixed(0)}, Trail: ${this.trailLength}`, 20, 110);
        }

        // Draw attractor indicators
        if (totalEnergy > 0.4) {
            this.drawAttractorIndicators(time, totalEnergy);
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

    drawAttractorIndicators(time, totalEnergy) {
        // Draw small indicators for each attractor
        const indicatorSize = 8;
        const spacing = 20;
        const startX = this.width - 150;
        const startY = 30;

        this.ctx.font = '10px monospace';
        this.ctx.fillStyle = `hsla(300, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.fillText('Attractors:', startX, startY);

        this.attractors.forEach((attractor, index) => {
            const x = startX + (index % 3) * spacing;
            const y = startY + 20 + Math.floor(index / 3) * spacing;

            // Draw indicator circle with attractor's color
            const hue = (attractor.hueOffset + time * 20) % 360;
            this.ctx.beginPath();
            this.ctx.arc(x, y, indicatorSize, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${attractor.alpha + totalEnergy * 0.3})`;
            this.ctx.fill();

            // Draw border
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 80%, 0.8)`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Show point count
            this.ctx.fillStyle = 'white';
            this.ctx.font = '8px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(attractor.points.length.toString(), x, y + 3);
            this.ctx.textAlign = 'left';
        });
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

        // Draw parameter positions for each attractor
        this.attractors.forEach((attractor, index) => {
            const paramX = startX + ((attractor.params.a + 2) / 4) * gridSize;
            const paramY = startY + ((attractor.params.b + 2) / 4) * gridSize;

            // Ensure parameters are within grid bounds
            if (paramX >= startX && paramX <= startX + gridSize &&
                paramY >= startY && paramY <= startY + gridSize) {

                const hue = (attractor.hueOffset + time * 20) % 360;
                const size = 2 + totalEnergy * 2 + (index === 0 ? 1 : 0); // Main attractor slightly larger

                this.ctx.beginPath();
                this.ctx.arc(paramX, paramY, size, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${0.7 + totalEnergy * 0.3})`;
                this.ctx.fill();

                // Add a subtle outline
                this.ctx.strokeStyle = `hsla(${hue}, 80%, 90%, 0.8)`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        });

        // Labels
        this.ctx.fillStyle = `hsla(300, 70%, 70%, ${0.8 + totalEnergy * 0.2})`;
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Parameter Space (a,b)', startX, startY - 5);
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
