class PsychedelicParticlesVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        this.particles = [];
        this.initializeParticles();
    }
    
    initializeParticles() {
        this.particles = [];
        const width = this.width || 800;
        const height = this.height || 400;
        
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
    
    onResize(width, height) {
        super.onResize(width, height);
        this.initializeParticles();
    }
    
    draw(audioData) {
        const { frequencyData, bufferLength, time } = audioData;
        
        if (this.particles.length === 0) return;
        
        // Create trail effect with gradient overlay
        const gradient = this.createRadialGradient(
            this.centerX, this.centerY, 0,
            Math.max(this.width, this.height),
            [
                { offset: 0, color: 'rgba(0, 0, 0, 0.02)' },
                { offset: 1, color: 'rgba(0, 0, 0, 0.08)' }
            ]
        );
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Calculate audio energy for particle effects
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
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
            const angle = Math.atan2(particle.y - this.centerY, particle.x - this.centerX);
            
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
                particle.vx += (this.centerX - particle.x) * 0.002;
                particle.vy += (this.centerY - particle.y) * 0.002;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Apply friction
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            
            // Bounce off edges instead of wrapping
            if (particle.x < 0 || particle.x > this.width) {
                particle.vx *= -0.8;
                particle.x = Math.max(0, Math.min(this.width, particle.x));
            }
            if (particle.y < 0 || particle.y > this.height) {
                particle.vy *= -0.8;
                particle.y = Math.max(0, Math.min(this.height, particle.y));
            }
            
            // Update particle properties
            particle.hue = (particle.hue + trebleEnergy * 15 + 2) % 360;
            particle.size = particle.baseSize * (0.5 + totalEnergy * 2 + Math.sin(time * 3 + i * 0.1) * 0.5);
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
                particle.x = this.centerX + (Math.random() - 0.5) * 100;
                particle.y = this.centerY + (Math.random() - 0.5) * 100;
                particle.vx = (Math.random() - 0.5) * 4;
                particle.vy = (Math.random() - 0.5) * 4;
                particle.life = particle.maxLife;
                particle.hue = Math.random() * 360;
                particle.trail = [];
            }
        }
        
        // Draw energy-based connecting web
        if (totalEnergy > 0.3) {
            this.ctx.strokeStyle = `hsla(${(time * 150) % 360}, 100%, 70%, ${totalEnergy * 0.4})`;
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
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('particles', PsychedelicParticlesVisualization);
    }
});
