class AudioVisualizer {
    constructor() {
        this.canvas = document.getElementById('visualizer');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.visualMode = document.getElementById('visualMode');
        this.status = document.getElementById('status');
        
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.animationId = null;

        // Animation state for psychedelic effects
        this.time = 0;
        this.particles = [];
        this.hexGrid = [];

        this.setupEventListeners();
        this.resizeCanvas();
        this.initializeParticles();
        this.initializeHexGrid();
        
        // Resize canvas when window resizes
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.visualMode.addEventListener('change', () => {
            if (this.animationId) {
                this.draw(); // Redraw with new mode
            }
        });
    }
    
    resizeCanvas() {
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = Math.min(400, window.innerHeight * 0.4);

        // Reinitialize grid and particles after resize
        this.initializeHexGrid();
        this.initializeParticles();
    }
    
    async start() {
        try {
            this.updateStatus('Requesting microphone access...', 'waiting');
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Configure analyser
            this.analyser.fftSize = 2048;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            // Connect microphone to analyser
            this.microphone.connect(this.analyser);
            
            // Start visualization
            this.updateStatus('Visualization active', 'active');
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.draw();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.updateStatus('Error: Could not access microphone', 'error');
        }
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        this.dataArray = null;
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('Visualization stopped', 'waiting');
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }
    
    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        
        if (!this.analyser) return;
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const mode = this.visualMode.value;
        
        switch (mode) {
            case 'frequency':
                this.drawFrequencyBars();
                break;
            case 'waveform':
                this.drawWaveform();
                break;
            case 'circular':
                this.drawCircularSpectrum();
                break;
            case 'combined':
                this.drawCombined();
                break;
            case 'hexGrid':
                this.drawHexagonalGrid();
                break;
            case 'hexRotate':
                this.drawRotatingHexagons();
                break;
            case 'particles':
                this.drawPsychedelicParticles();
                break;
            case 'kaleidoscope':
                this.drawKaleidoscope();
                break;
            case 'fractalTree':
                this.drawFractalTree();
                break;
            case 'fractalSpiral':
                this.drawFractalSpiral();
                break;
            case 'fractalMandala':
                this.drawFractalMandala();
                break;
        }

        this.time += 0.02; // Increment time for animations
    }
    
    drawFrequencyBars() {
        const barWidth = this.canvas.width / this.bufferLength * 2.5;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;

            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, this.canvas.height - barHeight);
            gradient.addColorStop(0, `hsl(${i * 2}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${i * 2 + 60}, 100%, 70%)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    drawWaveform() {
        // Get time domain data for waveform
        const timeDataArray = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(timeDataArray);

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width / timeDataArray.length;
        let x = 0;

        for (let i = 0; i < timeDataArray.length; i++) {
            const v = timeDataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.stroke();

        // Add center line
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }

    drawCircularSpectrum() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;

        const angleStep = (Math.PI * 2) / this.bufferLength;

        for (let i = 0; i < this.bufferLength; i++) {
            const angle = i * angleStep;
            const barHeight = (this.dataArray[i] / 255) * radius * 0.5;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            this.ctx.strokeStyle = `hsl(${i * 2}, 100%, 60%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        // Draw center circle
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawCombined() {
        // Draw frequency bars in the bottom half
        this.ctx.save();
        this.ctx.translate(0, this.canvas.height / 2);
        this.ctx.scale(1, 0.5);
        this.drawFrequencyBars();
        this.ctx.restore();

        // Draw waveform in the top half
        this.ctx.save();
        this.ctx.translate(0, 0);
        this.ctx.scale(1, 0.5);
        this.drawWaveform();
        this.ctx.restore();

        // Draw separator line
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }

    // Helper function to draw a hexagon
    drawHexagon(x, y, size) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const hx = x + size * Math.cos(angle);
            const hy = y + size * Math.sin(angle);
            if (i === 0) {
                this.ctx.moveTo(hx, hy);
            } else {
                this.ctx.lineTo(hx, hy);
            }
        }
        this.ctx.closePath();
    }

    // Initialize hexagonal grid
    initializeHexGrid() {
        this.hexGrid = [];
        const hexSize = 25;
        const hexWidth = hexSize * 2;
        const hexHeight = hexSize * Math.sqrt(3);

        for (let row = 0; row < Math.ceil(this.canvas.height / hexHeight) + 1; row++) {
            for (let col = 0; col < Math.ceil(this.canvas.width / hexWidth) + 1; col++) {
                const x = col * hexWidth * 0.75;
                const y = row * hexHeight + (col % 2) * hexHeight * 0.5;

                this.hexGrid.push({
                    x: x,
                    y: y,
                    size: hexSize,
                    baseSize: hexSize,
                    freqIndex: (row * 10 + col) % (this.bufferLength || 1024)
                });
            }
        }
    }

    // Initialize particle system
    initializeParticles() {
        this.particles = [];
        const width = this.canvas.width || 800;
        const height = this.canvas.height || 400;

        for (let i = 0; i < 150; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                size: Math.random() * 4 + 2,
                baseSize: Math.random() * 4 + 2,
                hue: Math.random() * 360,
                life: Math.random() * 0.5 + 0.5,
                maxLife: Math.random() * 0.5 + 0.5,
                trail: []
            });
        }
    }

    // Hexagonal Grid Visualization
    drawHexagonalGrid() {
        if (!this.dataArray) return;

        for (let hex of this.hexGrid) {
            if (hex.x > -50 && hex.x < this.canvas.width + 50 &&
                hex.y > -50 && hex.y < this.canvas.height + 50) {

                const freqValue = this.dataArray[hex.freqIndex % this.bufferLength] / 255;
                const size = hex.baseSize * (0.3 + freqValue * 1.5);
                const hue = (hex.freqIndex * 3 + this.time * 50) % 360;
                const brightness = 30 + freqValue * 70;

                this.ctx.fillStyle = `hsl(${hue}, 100%, ${brightness}%)`;
                this.ctx.strokeStyle = `hsl(${hue}, 100%, ${Math.min(brightness + 20, 90)}%)`;
                this.ctx.lineWidth = 1;

                this.drawHexagon(hex.x, hex.y, size);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }

    // Rotating Hexagons Visualization
    drawRotatingHexagons() {
        if (!this.dataArray) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Calculate average amplitude for global effects
        let avgAmplitude = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            avgAmplitude += this.dataArray[i];
        }
        avgAmplitude /= this.bufferLength;
        avgAmplitude /= 255;

        // Draw multiple layers of rotating hexagons
        const layers = 5;
        for (let layer = 0; layer < layers; layer++) {
            const radius = 50 + layer * 40 + avgAmplitude * 50;
            const hexCount = 6 + layer * 2;
            const rotation = this.time * (0.5 + layer * 0.2) + layer * Math.PI / 6;

            for (let i = 0; i < hexCount; i++) {
                const angle = (i / hexCount) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;

                const freqIndex = Math.floor((i / hexCount) * this.bufferLength);
                const freqValue = this.dataArray[freqIndex] / 255;

                const size = 15 + freqValue * 25 + Math.sin(this.time * 3 + layer) * 5;
                const hue = (layer * 60 + i * 30 + this.time * 100) % 360;
                const brightness = 40 + freqValue * 60;
                const alpha = 0.7 + freqValue * 0.3;

                this.ctx.save();
                this.ctx.translate(x, y);
                this.ctx.rotate(this.time * (1 + layer * 0.5) + i * 0.5);

                this.ctx.fillStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${Math.min(brightness + 30, 90)}%, ${alpha})`;
                this.ctx.lineWidth = 2;

                this.drawHexagon(0, 0, size);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.restore();
            }
        }

        // Add central pulsing hexagon
        const centralSize = 30 + avgAmplitude * 40;
        const centralHue = (this.time * 200) % 360;
        this.ctx.fillStyle = `hsla(${centralHue}, 100%, 70%, 0.8)`;
        this.ctx.strokeStyle = `hsla(${centralHue}, 100%, 90%, 0.9)`;
        this.ctx.lineWidth = 3;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.time * 2);
        this.drawHexagon(0, 0, centralSize);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Psychedelic Particles Visualization
    drawPsychedelicParticles() {
        if (!this.dataArray || this.particles.length === 0) return;

        // Create trail effect with gradient overlay
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height)
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.02)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate audio energy for particle effects
        let totalEnergy = 0;
        let bassEnergy = 0;
        let midEnergy = 0;
        let trebleEnergy = 0;

        const bassRange = Math.floor(this.bufferLength * 0.15);
        const midRange = Math.floor(this.bufferLength * 0.6);

        for (let i = 0; i < this.bufferLength; i++) {
            const value = this.dataArray[i] / 255;
            totalEnergy += value;

            if (i < bassRange) bassEnergy += value;
            else if (i < midRange) midEnergy += value;
            else trebleEnergy += value;
        }

        totalEnergy /= this.bufferLength;
        bassEnergy /= bassRange;
        midEnergy /= (midRange - bassRange);
        trebleEnergy /= (this.bufferLength - midRange);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Update and draw particles
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];

            // Store previous position for trail
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > 8) {
                particle.trail.shift();
            }

            // Audio-influenced movement
            const audioForce = bassEnergy * 3;
            const angle = Math.atan2(particle.y - centerY, particle.x - centerX);

            if (totalEnergy > 0.4) {
                // Explosive outward movement on high energy
                particle.vx += Math.cos(angle) * audioForce;
                particle.vy += Math.sin(angle) * audioForce;
            } else if (totalEnergy > 0.1) {
                // Orbital movement
                const perpAngle = angle + Math.PI / 2;
                particle.vx += Math.cos(perpAngle) * midEnergy * 2;
                particle.vy += Math.sin(perpAngle) * midEnergy * 2;
            }

            // Add some randomness based on treble
            particle.vx += (Math.random() - 0.5) * trebleEnergy * 2;
            particle.vy += (Math.random() - 0.5) * trebleEnergy * 2;

            // Gentle attraction to center when energy is low
            if (totalEnergy < 0.2) {
                particle.vx += (centerX - particle.x) * 0.002;
                particle.vy += (centerY - particle.y) * 0.002;
            }

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Apply friction
            particle.vx *= 0.95;
            particle.vy *= 0.95;

            // Bounce off edges instead of wrapping
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.vx *= -0.8;
                particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.vy *= -0.8;
                particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            }

            // Update particle properties
            particle.hue = (particle.hue + trebleEnergy * 15 + 2) % 360;
            particle.size = particle.baseSize * (0.5 + totalEnergy * 2 + Math.sin(this.time * 3 + i * 0.1) * 0.5);
            particle.life = Math.min(particle.maxLife, particle.life + totalEnergy * 0.01);

            // Draw particle trail
            if (particle.trail.length > 1) {
                for (let t = 0; t < particle.trail.length - 1; t++) {
                    const trailAlpha = (t / particle.trail.length) * particle.life * 0.3;
                    const trailSize = particle.size * (t / particle.trail.length) * 0.5;

                    this.ctx.beginPath();
                    this.ctx.arc(particle.trail[t].x, particle.trail[t].y, trailSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = `hsla(${particle.hue}, 100%, 60%, ${trailAlpha})`;
                    this.ctx.fill();
                }
            }

            // Draw main particle with multiple layers
            const brightness = 40 + totalEnergy * 60;
            const alpha = particle.life * (0.6 + totalEnergy * 0.4);

            // Outer glow
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${particle.hue}, 100%, ${brightness}%, ${alpha * 0.05})`;
            this.ctx.fill();

            // Middle glow
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${particle.hue}, 100%, ${brightness + 10}%, ${alpha * 0.2})`;
            this.ctx.fill();

            // Inner core
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${particle.hue}, 100%, ${brightness + 30}%, ${alpha})`;
            this.ctx.fill();

            // Reset particle if needed
            if (particle.life < 0.1 || Math.random() < 0.001) {
                particle.x = centerX + (Math.random() - 0.5) * 100;
                particle.y = centerY + (Math.random() - 0.5) * 100;
                particle.vx = (Math.random() - 0.5) * 4;
                particle.vy = (Math.random() - 0.5) * 4;
                particle.life = particle.maxLife;
                particle.hue = Math.random() * 360;
                particle.trail = [];
            }
        }

        // Draw energy-based connecting web
        if (totalEnergy > 0.3) {
            this.ctx.strokeStyle = `hsla(${(this.time * 150) % 360}, 100%, 70%, ${totalEnergy * 0.4})`;
            this.ctx.lineWidth = 1;

            for (let i = 0; i < this.particles.length; i += 3) {
                for (let j = i + 3; j < this.particles.length; j += 3) {
                    const p1 = this.particles[i];
                    const p2 = this.particles[j];
                    const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

                    if (dist < 120) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(p1.x, p1.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                }
            }
        }
    }

    // Kaleidoscope Visualization
    drawKaleidoscope() {
        if (!this.dataArray) return;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const segments = 8; // Number of kaleidoscope segments

        // Calculate audio metrics
        let avgAmplitude = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            avgAmplitude += this.dataArray[i];
        }
        avgAmplitude /= this.bufferLength;
        avgAmplitude /= 255;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        // Draw kaleidoscope segments
        for (let segment = 0; segment < segments; segment++) {
            this.ctx.save();
            this.ctx.rotate((segment * Math.PI * 2) / segments);

            // Clip to segment
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, Math.max(this.canvas.width, this.canvas.height), 0, Math.PI / segments);
            this.ctx.closePath();
            this.ctx.clip();

            // Draw morphing shapes within segment
            const shapeCount = 5;
            for (let shape = 0; shape < shapeCount; shape++) {
                const freqIndex = Math.floor((shape / shapeCount) * this.bufferLength);
                const freqValue = this.dataArray[freqIndex] / 255;

                const radius = 50 + shape * 30 + freqValue * 100;
                const sides = 3 + Math.floor(freqValue * 5);
                const rotation = this.time * (1 + shape * 0.3) + segment * 0.5;
                const size = 10 + freqValue * 20 + Math.sin(this.time * 2 + shape) * 5;

                const hue = (segment * 45 + shape * 72 + this.time * 150) % 360;
                const brightness = 40 + freqValue * 60;
                const alpha = 0.3 + freqValue * 0.4;

                this.ctx.save();
                this.ctx.rotate(rotation);
                this.ctx.translate(radius, 0);

                // Draw morphing polygon
                this.ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    const x = Math.cos(angle) * size;
                    const y = Math.sin(angle) * size;

                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();

                // Fill with gradient
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                gradient.addColorStop(0, `hsla(${hue}, 100%, ${brightness + 20}%, ${alpha})`);
                gradient.addColorStop(1, `hsla(${hue + 60}, 100%, ${brightness}%, ${alpha * 0.5})`);

                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness + 30}%, ${alpha * 0.8})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                this.ctx.restore();
            }

            // Add fractal-like details
            for (let detail = 0; detail < 3; detail++) {
                const detailFreqIndex = Math.floor((detail / 3) * this.bufferLength);
                const detailFreqValue = this.dataArray[detailFreqIndex] / 255;

                const detailRadius = 20 + detail * 15 + detailFreqValue * 30;
                const detailRotation = this.time * (2 + detail * 0.5) + segment * 0.3;

                this.ctx.save();
                this.ctx.rotate(detailRotation);
                this.ctx.translate(detailRadius, 0);
                this.ctx.scale(0.5 + detailFreqValue * 0.5, 0.5 + detailFreqValue * 0.5);

                const detailHue = (segment * 30 + detail * 120 + this.time * 200) % 360;
                this.ctx.fillStyle = `hsla(${detailHue}, 100%, 70%, ${0.2 + detailFreqValue * 0.3})`;

                this.drawHexagon(0, 0, 8 + detailFreqValue * 12);
                this.ctx.fill();

                this.ctx.restore();
            }

            this.ctx.restore();
        }

        // Add central mandala
        const centralRadius = 20 + avgAmplitude * 30;
        const centralHue = (this.time * 100) % 360;

        this.ctx.strokeStyle = `hsla(${centralHue}, 100%, 80%, 0.8)`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, centralRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Add rotating spokes
        for (let spoke = 0; spoke < 12; spoke++) {
            const spokeAngle = (spoke / 12) * Math.PI * 2 + this.time;
            const spokeLength = centralRadius + avgAmplitude * 20;

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(spokeAngle) * spokeLength, Math.sin(spokeAngle) * spokeLength);
            this.ctx.strokeStyle = `hsla(${centralHue + spoke * 30}, 100%, 70%, 0.6)`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    // Fractal Tree Visualization
    drawFractalTree() {
        if (!this.dataArray) return;

        // Calculate audio energy
        let totalEnergy = 0;
        let bassEnergy = 0;
        let trebleEnergy = 0;

        const bassRange = Math.floor(this.bufferLength * 0.2);
        const trebleStart = Math.floor(this.bufferLength * 0.7);

        for (let i = 0; i < this.bufferLength; i++) {
            const value = this.dataArray[i] / 255;
            totalEnergy += value;

            if (i < bassRange) bassEnergy += value;
            else if (i > trebleStart) trebleEnergy += value;
        }

        totalEnergy /= this.bufferLength;
        bassEnergy /= bassRange;
        trebleEnergy /= (this.bufferLength - trebleStart);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw multiple fractal trees
        const treeCount = 3 + Math.floor(totalEnergy * 5);
        for (let t = 0; t < treeCount; t++) {
            const startX = (this.canvas.width / (treeCount + 1)) * (t + 1);
            const startY = this.canvas.height - 20;
            const initialLength = 60 + bassEnergy * 80;
            const initialAngle = -Math.PI / 2 + (Math.sin(this.time + t) * 0.3);
            const maxDepth = 8 + Math.floor(trebleEnergy * 4);

            this.drawBranch(startX, startY, initialLength, initialAngle, maxDepth, totalEnergy, t);
        }
    }

    // Recursive function to draw fractal branches
    drawBranch(x, y, length, angle, depth, energy, treeIndex) {
        if (depth <= 0 || length < 2) return;

        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        // Color based on depth and audio
        const hue = (depth * 30 + treeIndex * 120 + this.time * 100) % 360;
        const brightness = 30 + energy * 70 + (depth / 8) * 40;
        const alpha = 0.6 + energy * 0.4;

        this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
        this.ctx.lineWidth = Math.max(1, depth * 0.8 + energy * 2);

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Add glow effect for higher energy
        if (energy > 0.3) {
            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness + 20}%, ${alpha * 0.3})`;
            this.ctx.lineWidth = Math.max(2, depth * 1.5 + energy * 4);
            this.ctx.stroke();
        }

        // Calculate branch parameters
        const lengthReduction = 0.7 + energy * 0.2;
        const angleVariation = 0.4 + energy * 0.6;
        const branchCount = 2 + (energy > 0.5 ? 1 : 0);

        // Draw child branches
        for (let i = 0; i < branchCount; i++) {
            const newAngle = angle + (i === 0 ? -angleVariation : angleVariation) +
                           Math.sin(this.time * 2 + depth + treeIndex) * 0.2;
            const newLength = length * lengthReduction;

            this.drawBranch(endX, endY, newLength, newAngle, depth - 1, energy, treeIndex);
        }

        // Add leaves/flowers at branch tips
        if (depth <= 2 && energy > 0.2) {
            this.ctx.beginPath();
            this.ctx.arc(endX, endY, 3 + energy * 5, 0, Math.PI * 2);
            this.ctx.fillStyle = `hsla(${hue + 180}, 100%, 70%, ${alpha})`;
            this.ctx.fill();
        }
    }

    // Fractal Spiral Visualization
    drawFractalSpiral() {
        if (!this.dataArray) return;

        // Calculate audio metrics
        let totalEnergy = 0;
        let bassEnergy = 0;
        let midEnergy = 0;
        let trebleEnergy = 0;

        const bassRange = Math.floor(this.bufferLength * 0.15);
        const midRange = Math.floor(this.bufferLength * 0.6);

        for (let i = 0; i < this.bufferLength; i++) {
            const value = this.dataArray[i] / 255;
            totalEnergy += value;

            if (i < bassRange) bassEnergy += value;
            else if (i < midRange) midEnergy += value;
            else trebleEnergy += value;
        }

        totalEnergy /= this.bufferLength;
        bassEnergy /= bassRange;
        midEnergy /= (midRange - bassRange);
        trebleEnergy /= (this.bufferLength - midRange);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Draw multiple nested spirals
        const spiralCount = 5;
        for (let s = 0; s < spiralCount; s++) {
            const spiralOffset = s * Math.PI / spiralCount;
            const baseRadius = 10 + s * 15;
            const maxRadius = 150 + bassEnergy * 100;
            const turns = 8 + trebleEnergy * 12;
            const points = 500;

            this.ctx.beginPath();

            for (let i = 0; i <= points; i++) {
                const t = i / points;
                const angle = t * turns * Math.PI * 2 + spiralOffset + this.time * (0.5 + s * 0.2);

                // Fibonacci-like spiral with audio modulation
                const radius = baseRadius + t * maxRadius * (1 + Math.sin(angle * 0.5) * midEnergy * 0.5);

                // Add audio-based perturbations
                const perturbation = Math.sin(angle * 3 + this.time * 2) * totalEnergy * 20;
                const finalRadius = radius + perturbation;

                const x = centerX + Math.cos(angle) * finalRadius;
                const y = centerY + Math.sin(angle) * finalRadius;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }

                // Draw spiral nodes at regular intervals
                if (i % 20 === 0 && totalEnergy > 0.2) {
                    const nodeSize = 2 + totalEnergy * 6;
                    const hue = (angle * 50 + s * 72 + this.time * 200) % 360;

                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
                    this.ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${0.6 + totalEnergy * 0.4})`;
                    this.ctx.fill();

                    // Add glow
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, nodeSize * 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.1 + totalEnergy * 0.2})`;
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }

            // Style the spiral line
            const hue = (s * 60 + this.time * 100) % 360;
            const brightness = 40 + totalEnergy * 60;
            const alpha = 0.4 + totalEnergy * 0.4;

            this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness}%, ${alpha})`;
            this.ctx.lineWidth = 1 + totalEnergy * 3;
            this.ctx.stroke();

            // Add glow effect
            if (totalEnergy > 0.3) {
                this.ctx.strokeStyle = `hsla(${hue}, 100%, ${brightness + 20}%, ${alpha * 0.3})`;
                this.ctx.lineWidth = 3 + totalEnergy * 6;
                this.ctx.stroke();
            }
        }

        // Draw central mandala
        const centralRadius = 20 + bassEnergy * 30;
        const spokes = 12;

        for (let i = 0; i < spokes; i++) {
            const angle = (i / spokes) * Math.PI * 2 + this.time;
            const spokeLength = centralRadius + Math.sin(this.time * 3 + i) * 10;

            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + Math.cos(angle) * spokeLength,
                centerY + Math.sin(angle) * spokeLength
            );

            const hue = (i * 30 + this.time * 150) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.6 + totalEnergy * 0.4})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Central pulsing circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, centralRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${(this.time * 200) % 360}, 100%, 60%, ${0.3 + totalEnergy * 0.5})`;
        this.ctx.fill();
        this.ctx.strokeStyle = `hsla(${(this.time * 200) % 360}, 100%, 80%, ${0.8})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Fractal Mandala Visualization (Mandelbrot-inspired)
    drawFractalMandala() {
        if (!this.dataArray) return;

        // Calculate audio energy
        let totalEnergy = 0;
        let bassEnergy = 0;
        let trebleEnergy = 0;

        const bassRange = Math.floor(this.bufferLength * 0.2);
        const trebleStart = Math.floor(this.bufferLength * 0.7);

        for (let i = 0; i < this.bufferLength; i++) {
            const value = this.dataArray[i] / 255;
            totalEnergy += value;

            if (i < bassRange) bassEnergy += value;
            else if (i > trebleStart) trebleEnergy += value;
        }

        totalEnergy /= this.bufferLength;
        bassEnergy /= bassRange;
        trebleEnergy /= (this.bufferLength - trebleStart);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Create fractal mandala with audio-reactive parameters
        const maxIterations = 50 + Math.floor(trebleEnergy * 50);
        const zoom = 0.5 + bassEnergy * 2;
        const timeOffset = this.time * 0.1;

        // Draw fractal pattern
        const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let x = 0; x < this.canvas.width; x += 2) {
            for (let y = 0; y < this.canvas.height; y += 2) {
                // Map pixel to complex plane
                const zx = (x - centerX) / (100 * zoom);
                const zy = (y - centerY) / (100 * zoom);

                // Audio-modulated complex constant
                const cx = -0.7 + Math.sin(timeOffset) * 0.3 + bassEnergy * 0.2;
                const cy = 0.27015 + Math.cos(timeOffset * 1.3) * 0.2 + trebleEnergy * 0.1;

                const iterations = this.mandelbrotIteration(zx, zy, cx, cy, maxIterations);

                if (iterations < maxIterations) {
                    // Color based on iterations and audio
                    const hue = (iterations * 8 + this.time * 100 + totalEnergy * 200) % 360;
                    const saturation = 80 + totalEnergy * 20;
                    const lightness = 30 + (iterations / maxIterations) * 70;
                    const alpha = 0.6 + totalEnergy * 0.4;

                    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100);

                    const index = (y * this.canvas.width + x) * 4;
                    data[index] = rgb[0];     // Red
                    data[index + 1] = rgb[1]; // Green
                    data[index + 2] = rgb[2]; // Blue
                    data[index + 3] = alpha * 255; // Alpha

                    // Fill adjacent pixels for performance
                    if (x + 1 < this.canvas.width) {
                        const index2 = (y * this.canvas.width + (x + 1)) * 4;
                        data[index2] = rgb[0];
                        data[index2 + 1] = rgb[1];
                        data[index2 + 2] = rgb[2];
                        data[index2 + 3] = alpha * 255;
                    }
                    if (y + 1 < this.canvas.height) {
                        const index3 = ((y + 1) * this.canvas.width + x) * 4;
                        data[index3] = rgb[0];
                        data[index3 + 1] = rgb[1];
                        data[index3 + 2] = rgb[2];
                        data[index3 + 3] = alpha * 255;
                    }
                }
            }
        }

        this.ctx.putImageData(imageData, 0, 0);

        // Add overlay patterns for extra psychedelic effect
        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        // Rotating geometric overlay
        const overlayCount = 6 + Math.floor(totalEnergy * 6);
        for (let i = 0; i < overlayCount; i++) {
            this.ctx.save();
            this.ctx.rotate((i / overlayCount) * Math.PI * 2 + this.time * (0.5 + i * 0.1));

            const radius = 50 + i * 20 + bassEnergy * 50;
            const sides = 3 + i;

            this.ctx.beginPath();
            for (let s = 0; s < sides; s++) {
                const angle = (s / sides) * Math.PI * 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                if (s === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();

            const hue = (i * 60 + this.time * 200) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.3 + totalEnergy * 0.3})`;
            this.ctx.lineWidth = 1 + totalEnergy * 2;
            this.ctx.stroke();

            this.ctx.restore();
        }

        this.ctx.restore();
    }

    // Mandelbrot iteration function
    mandelbrotIteration(zx, zy, cx, cy, maxIterations) {
        let x = zx;
        let y = zy;
        let iteration = 0;

        while (x * x + y * y <= 4 && iteration < maxIterations) {
            const xtemp = x * x - y * y + cx;
            y = 2 * x * y + cy;
            x = xtemp;
            iteration++;
        }

        return iteration;
    }

    // HSL to RGB conversion
    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});
