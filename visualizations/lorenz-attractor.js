class LorenzAttractorVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Lorenz system parameters
        this.sigma = 10;
        this.rho = 28;
        this.beta = 8/3;
        
        // Initial conditions
        this.x = 1;
        this.y = 1;
        this.z = 1;
        
        // Trail system
        this.trail = [];
        this.maxTrailLength = 2000;
        
        // Multiple attractors for more complex visuals
        this.attractors = [];
        const attractorCount = 5;
        
        for (let i = 0; i < attractorCount; i++) {
            this.attractors.push({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                z: Math.random() * 2 - 1,
                trail: [],
                hueOffset: i * 72,
                sigma: 10 + Math.random() * 5,
                rho: 28 + Math.random() * 10,
                beta: 8/3 + Math.random() * 2
            });
        }
        
        // 3D rotation parameters
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
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
        
        // Create trail effect
        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.02 + totalEnergy * 0.05})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Audio-reactive parameters
        const dt = 0.01 + totalEnergy * 0.005; // Time step
        const scale = 8 + bassEnergy * 12; // Scale factor for projection
        
        // Audio-reactive 3D rotation
        this.rotationX += (0.01 + midEnergy * 0.02);
        this.rotationY += (0.008 + trebleEnergy * 0.015);
        this.rotationZ += (0.005 + totalEnergy * 0.01);
        
        // Update and draw each attractor
        for (let attractorIndex = 0; attractorIndex < this.attractors.length; attractorIndex++) {
            const attractor = this.attractors[attractorIndex];
            
            // Audio-modulated Lorenz parameters
            const sigma = attractor.sigma + Math.sin(time + attractorIndex) * bassEnergy * 5;
            const rho = attractor.rho + Math.cos(time * 1.3 + attractorIndex) * midEnergy * 15;
            const beta = attractor.beta + Math.sin(time * 0.7 + attractorIndex) * trebleEnergy * 2;
            
            // Integrate Lorenz equations
            const dx = sigma * (attractor.y - attractor.x) * dt;
            const dy = (attractor.x * (rho - attractor.z) - attractor.y) * dt;
            const dz = (attractor.x * attractor.y - beta * attractor.z) * dt;
            
            attractor.x += dx;
            attractor.y += dy;
            attractor.z += dz;
            
            // Add to trail
            attractor.trail.push({
                x: attractor.x,
                y: attractor.y,
                z: attractor.z,
                energy: totalEnergy
            });
            
            // Limit trail length
            if (attractor.trail.length > this.maxTrailLength) {
                attractor.trail.shift();
            }
            
            // Draw the trail
            this.drawAttractorTrail(attractor, attractorIndex, time, scale, totalEnergy);
        }
        
        // Draw connecting lines between attractors for high energy
        if (totalEnergy > 0.5) {
            this.drawAttractorConnections(time, scale, totalEnergy);
        }
        
        // Draw 3D coordinate system for reference
        if (totalEnergy > 0.3) {
            this.draw3DCoordinateSystem(scale, totalEnergy);
        }
    }
    
    drawAttractorTrail(attractor, attractorIndex, time, scale, totalEnergy) {
        if (attractor.trail.length < 2) return;
        
        this.ctx.lineWidth = 1 + totalEnergy * 2;
        
        // Draw trail segments
        for (let i = 1; i < attractor.trail.length; i++) {
            const point1 = attractor.trail[i - 1];
            const point2 = attractor.trail[i];
            
            // 3D rotation and projection
            const proj1 = this.project3D(point1.x, point1.y, point1.z, scale);
            const proj2 = this.project3D(point2.x, point2.y, point2.z, scale);
            
            // Skip if points are off-screen
            if (!this.isOnScreen(proj1) && !this.isOnScreen(proj2)) continue;
            
            // Color based on position in trail and audio
            const trailProgress = i / attractor.trail.length;
            const hue = (attractor.hueOffset + time * 50 + trailProgress * 60) % 360;
            const saturation = 70 + totalEnergy * 30;
            const lightness = 20 + trailProgress * 60 + point2.energy * 40;
            const alpha = trailProgress * (0.3 + totalEnergy * 0.5);
            
            this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            
            this.ctx.beginPath();
            this.ctx.moveTo(proj1.x, proj1.y);
            this.ctx.lineTo(proj2.x, proj2.y);
            this.ctx.stroke();
            
            // Add glow effect for recent points
            if (trailProgress > 0.8) {
                this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.5})`;
                this.ctx.lineWidth = 3 + totalEnergy * 4;
                this.ctx.stroke();
                this.ctx.lineWidth = 1 + totalEnergy * 2; // Reset line width
            }
        }
        
        // Draw current position as a bright point
        if (attractor.trail.length > 0) {
            const currentPoint = attractor.trail[attractor.trail.length - 1];
            const proj = this.project3D(currentPoint.x, currentPoint.y, currentPoint.z, scale);
            
            if (this.isOnScreen(proj)) {
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, 3 + totalEnergy * 5, 0, Math.PI * 2);
                
                const hue = (attractor.hueOffset + time * 100) % 360;
                this.ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${0.8 + totalEnergy * 0.2})`;
                this.ctx.fill();
                
                // Outer glow
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, 8 + totalEnergy * 10, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.2 + totalEnergy * 0.3})`;
                this.ctx.fill();
            }
        }
    }
    
    drawAttractorConnections(time, scale, totalEnergy) {
        this.ctx.strokeStyle = `hsla(${(time * 100) % 360}, 100%, 60%, ${totalEnergy * 0.3})`;
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < this.attractors.length; i++) {
            for (let j = i + 1; j < this.attractors.length; j++) {
                const attractor1 = this.attractors[i];
                const attractor2 = this.attractors[j];
                
                if (attractor1.trail.length === 0 || attractor2.trail.length === 0) continue;
                
                const point1 = attractor1.trail[attractor1.trail.length - 1];
                const point2 = attractor2.trail[attractor2.trail.length - 1];
                
                const proj1 = this.project3D(point1.x, point1.y, point1.z, scale);
                const proj2 = this.project3D(point2.x, point2.y, point2.z, scale);
                
                // Only draw if both points are on screen
                if (this.isOnScreen(proj1) && this.isOnScreen(proj2)) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(proj1.x, proj1.y);
                    this.ctx.lineTo(proj2.x, proj2.y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    draw3DCoordinateSystem(scale, totalEnergy) {
        const axisLength = 20;
        const origin = this.project3D(0, 0, 0, scale);
        
        // X axis (red)
        const xAxis = this.project3D(axisLength, 0, 0, scale);
        this.ctx.strokeStyle = `hsla(0, 100%, 60%, ${0.5 + totalEnergy * 0.3})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(origin.x, origin.y);
        this.ctx.lineTo(xAxis.x, xAxis.y);
        this.ctx.stroke();
        
        // Y axis (green)
        const yAxis = this.project3D(0, axisLength, 0, scale);
        this.ctx.strokeStyle = `hsla(120, 100%, 60%, ${0.5 + totalEnergy * 0.3})`;
        this.ctx.beginPath();
        this.ctx.moveTo(origin.x, origin.y);
        this.ctx.lineTo(yAxis.x, yAxis.y);
        this.ctx.stroke();
        
        // Z axis (blue)
        const zAxis = this.project3D(0, 0, axisLength, scale);
        this.ctx.strokeStyle = `hsla(240, 100%, 60%, ${0.5 + totalEnergy * 0.3})`;
        this.ctx.beginPath();
        this.ctx.moveTo(origin.x, origin.y);
        this.ctx.lineTo(zAxis.x, zAxis.y);
        this.ctx.stroke();
    }
    
    project3D(x, y, z, scale) {
        // Apply 3D rotation
        const cosX = Math.cos(this.rotationX);
        const sinX = Math.sin(this.rotationX);
        const cosY = Math.cos(this.rotationY);
        const sinY = Math.sin(this.rotationY);
        const cosZ = Math.cos(this.rotationZ);
        const sinZ = Math.sin(this.rotationZ);
        
        // Rotate around X axis
        let y1 = y * cosX - z * sinX;
        let z1 = y * sinX + z * cosX;
        
        // Rotate around Y axis
        let x2 = x * cosY + z1 * sinY;
        let z2 = -x * sinY + z1 * cosY;
        
        // Rotate around Z axis
        let x3 = x2 * cosZ - y1 * sinZ;
        let y3 = x2 * sinZ + y1 * cosZ;
        
        // Perspective projection
        const distance = 100;
        const perspective = distance / (distance + z2);
        
        return {
            x: this.centerX + x3 * scale * perspective,
            y: this.centerY + y3 * scale * perspective,
            z: z2
        };
    }
    
    isOnScreen(point) {
        return point.x >= 0 && point.x <= this.width && 
               point.y >= 0 && point.y <= this.height;
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('lorenzAttractor', LorenzAttractorVisualization);
    }
});
