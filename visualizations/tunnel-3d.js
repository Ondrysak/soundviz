class Tunnel3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
    }
    
    initialize() {
        // Create tunnel geometry
        this.tunnelSegments = 50;
        this.tunnelRadius = 100;
        this.tunnelDepth = 200;
        this.tunnelPoints = [];
        
        // Initialize tunnel points
        for (let segment = 0; segment < this.tunnelSegments; segment++) {
            const z = (segment / this.tunnelSegments) * this.tunnelDepth;
            const segmentPoints = [];
            
            const sides = 16; // Number of sides for each tunnel ring
            for (let side = 0; side < sides; side++) {
                const angle = (side / sides) * Math.PI * 2;
                segmentPoints.push({
                    angle: angle,
                    z: z,
                    originalRadius: this.tunnelRadius
                });
            }
            this.tunnelPoints.push(segmentPoints);
        }
        
        // Feedback buffer for trail effects
        this.feedbackCanvas = document.createElement('canvas');
        this.feedbackCanvas.width = this.width;
        this.feedbackCanvas.height = this.height;
        this.feedbackCtx = this.feedbackCanvas.getContext('2d');
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
        
        // Create feedback/trail effect
        this.ctx.save();
        this.ctx.globalAlpha = 0.85 - totalEnergy * 0.2; // More energy = less trails
        this.ctx.drawImage(this.feedbackCanvas, 0, 0);
        this.ctx.restore();
        
        // Copy current frame to feedback buffer
        this.feedbackCtx.drawImage(this.canvas, 0, 0);
        
        // 3D transformation parameters
        const cameraZ = -50 - bassEnergy * 100;
        const tunnelSpeed = time * (20 + totalEnergy * 50);
        const warpAmount = totalEnergy * 2;
        
        // Draw tunnel segments
        for (let segmentIndex = 0; segmentIndex < this.tunnelSegments; segmentIndex++) {
            const segment = this.tunnelPoints[segmentIndex];
            const segmentZ = segment[0].z + tunnelSpeed;
            
            // Skip segments that are behind the camera or too far away
            const adjustedZ = segmentZ % this.tunnelDepth;
            if (adjustedZ < 1) continue;
            
            // Calculate perspective and audio-reactive radius
            const perspective = 300 / (adjustedZ - cameraZ);
            const audioRadius = segment[0].originalRadius * (1 + Math.sin(time * 3 + segmentIndex * 0.5) * midEnergy * 0.5);
            
            // Audio-reactive warping
            const warpX = Math.sin(time * 2 + segmentIndex * 0.3) * warpAmount * 20;
            const warpY = Math.cos(time * 1.5 + segmentIndex * 0.4) * warpAmount * 15;
            
            // Draw tunnel ring
            this.ctx.beginPath();
            let firstPoint = true;
            
            for (let pointIndex = 0; pointIndex <= segment.length; pointIndex++) {
                const point = segment[pointIndex % segment.length];
                
                // 3D to 2D projection with audio modulation
                const radius = audioRadius + Math.sin(point.angle * 4 + time * 5) * trebleEnergy * 20;
                const x3d = Math.cos(point.angle) * radius + warpX;
                const y3d = Math.sin(point.angle) * radius + warpY;
                
                // Perspective projection
                const x2d = this.centerX + x3d * perspective;
                const y2d = this.centerY + y3d * perspective;
                
                if (firstPoint) {
                    this.ctx.moveTo(x2d, y2d);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(x2d, y2d);
                }
            }
            
            // Color based on depth and audio
            const depthFactor = 1 - (adjustedZ / this.tunnelDepth);
            const hue = (time * 100 + segmentIndex * 10 + totalEnergy * 200) % 360;
            const saturation = 80 + totalEnergy * 20;
            const lightness = 20 + depthFactor * 60 + totalEnergy * 30;
            const alpha = depthFactor * (0.3 + totalEnergy * 0.5);
            
            // Draw ring with gradient
            const gradient = this.ctx.createRadialGradient(
                this.centerX + warpX * perspective, 
                this.centerY + warpY * perspective, 
                0,
                this.centerX + warpX * perspective, 
                this.centerY + warpY * perspective, 
                audioRadius * perspective
            );
            gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${alpha})`);
            gradient.addColorStop(1, `hsla(${hue + 60}, ${saturation}%, ${lightness}%, ${alpha * 0.5})`);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2 + totalEnergy * 4;
            this.ctx.stroke();
            
            // Add glow effect for high energy
            if (totalEnergy > 0.4) {
                this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha * 0.3})`;
                this.ctx.lineWidth = 6 + totalEnergy * 8;
                this.ctx.stroke();
            }
        }
        
        // Draw connecting lines between rings for extra 3D effect
        if (totalEnergy > 0.3) {
            const connectionStep = 4; // Connect every 4th segment
            for (let segmentIndex = 0; segmentIndex < this.tunnelSegments - connectionStep; segmentIndex += connectionStep) {
                const segment1 = this.tunnelPoints[segmentIndex];
                const segment2 = this.tunnelPoints[segmentIndex + connectionStep];
                
                const z1 = (segment1[0].z + tunnelSpeed) % this.tunnelDepth;
                const z2 = (segment2[0].z + tunnelSpeed) % this.tunnelDepth;
                
                if (z1 < 1 || z2 < 1) continue;
                
                const perspective1 = 300 / (z1 - cameraZ);
                const perspective2 = 300 / (z2 - cameraZ);
                
                // Connect corresponding points
                const pointStep = 4; // Connect every 4th point
                for (let pointIndex = 0; pointIndex < segment1.length; pointIndex += pointStep) {
                    const point1 = segment1[pointIndex];
                    const point2 = segment2[pointIndex];
                    
                    const radius1 = this.tunnelRadius + Math.sin(point1.angle * 4 + time * 5) * trebleEnergy * 20;
                    const radius2 = this.tunnelRadius + Math.sin(point2.angle * 4 + time * 5) * trebleEnergy * 20;
                    
                    const x1 = this.centerX + Math.cos(point1.angle) * radius1 * perspective1;
                    const y1 = this.centerY + Math.sin(point1.angle) * radius1 * perspective1;
                    const x2 = this.centerX + Math.cos(point2.angle) * radius2 * perspective2;
                    const y2 = this.centerY + Math.sin(point2.angle) * radius2 * perspective2;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    
                    const hue = (time * 150 + pointIndex * 20) % 360;
                    const alpha = totalEnergy * 0.3;
                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
        
        // Add central vortex effect
        const vortexRadius = 30 + bassEnergy * 50;
        const vortexSpokes = 12;
        
        for (let spoke = 0; spoke < vortexSpokes; spoke++) {
            const angle = (spoke / vortexSpokes) * Math.PI * 2 + time * 2;
            const spokeLength = vortexRadius + Math.sin(time * 4 + spoke) * 20;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(
                this.centerX + Math.cos(angle) * spokeLength,
                this.centerY + Math.sin(angle) * spokeLength
            );
            
            const hue = (spoke * 30 + time * 200) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.6 + totalEnergy * 0.4})`;
            this.ctx.lineWidth = 2 + totalEnergy * 3;
            this.ctx.stroke();
        }
        
        // Central pulsing core
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, vortexRadius * 0.3, 0, Math.PI * 2);
        
        const coreGradient = this.createRadialGradient(
            this.centerX, this.centerY, 0,
            vortexRadius * 0.3,
            [
                { offset: 0, color: `hsla(${(time * 300) % 360}, 100%, 90%, ${0.8 + totalEnergy * 0.2})` },
                { offset: 1, color: `hsla(${(time * 300 + 180) % 360}, 100%, 50%, 0)` }
            ]
        );
        
        this.ctx.fillStyle = coreGradient;
        this.ctx.fill();
    }
    
    cleanup() {
        if (this.feedbackCanvas) {
            this.feedbackCanvas = null;
            this.feedbackCtx = null;
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('tunnel3d', Tunnel3DVisualization);
    }
});
