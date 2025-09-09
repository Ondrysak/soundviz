class ParticleGalaxy3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.particleSystem = null;
        this.galaxyArms = [];
        this.time = 0;
    }
    
    initialize() {
        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        
        // Create WebGL renderer and append to canvas container
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0x000000, 0);
        
        // Replace canvas with Three.js canvas
        const container = this.ctx.canvas.parentNode;
        container.removeChild(this.ctx.canvas);
        container.appendChild(this.renderer.domElement);
        
        // Create particle galaxy
        this.createGalaxy();
        
        // Position camera
        this.camera.position.z = 50;
        this.camera.position.y = 20;
        this.camera.lookAt(0, 0, 0);
    }
    
    createGalaxy() {
        const particleCount = 5000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Create spiral galaxy arms
        const armCount = 4;
        const armSpread = 0.3;
        const galaxyRadius = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Determine which arm this particle belongs to
            const armIndex = i % armCount;
            const armAngle = (armIndex / armCount) * Math.PI * 2;
            
            // Distance from center (with some randomness)
            const radius = Math.random() * galaxyRadius;
            const spiralAngle = armAngle + (radius * 0.3) + (Math.random() - 0.5) * armSpread;
            
            // Position in spiral
            positions[i3] = Math.cos(spiralAngle) * radius + (Math.random() - 0.5) * 2;
            positions[i3 + 1] = (Math.random() - 0.5) * 4;
            positions[i3 + 2] = Math.sin(spiralAngle) * radius + (Math.random() - 0.5) * 2;
            
            // Color based on distance from center
            const colorIntensity = 1 - (radius / galaxyRadius);
            colors[i3] = 0.5 + colorIntensity * 0.5; // Red
            colors[i3 + 1] = 0.3 + colorIntensity * 0.7; // Green
            colors[i3 + 2] = 1.0; // Blue
            
            // Size based on distance
            sizes[i] = (1 - radius / galaxyRadius) * 3 + 0.5;
        }
        
        // Create geometry and material
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create shader material for particles
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioEnergy: { value: 0 },
                bassEnergy: { value: 0 },
                trebleEnergy: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vSize;
                uniform float time;
                uniform float audioEnergy;
                uniform float bassEnergy;
                
                void main() {
                    vColor = color;
                    vSize = size;
                    
                    vec3 pos = position;
                    
                    // Audio-reactive movement
                    float distance = length(pos.xz);
                    float wave = sin(time * 2.0 + distance * 0.1) * audioEnergy * 2.0;
                    pos.y += wave;
                    
                    // Spiral rotation based on bass
                    float angle = atan(pos.z, pos.x) + time * 0.5 + bassEnergy * 2.0;
                    float radius = length(pos.xz);
                    pos.x = cos(angle) * radius;
                    pos.z = sin(angle) * radius;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + audioEnergy);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                uniform float audioEnergy;
                uniform float trebleEnergy;
                
                void main() {
                    float distance = length(gl_PointCoord - vec2(0.5));
                    if (distance > 0.5) discard;
                    
                    float alpha = 1.0 - distance * 2.0;
                    alpha *= (0.5 + audioEnergy * 0.5);
                    
                    vec3 finalColor = vColor * (1.0 + trebleEnergy);
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        
        // Add central bright core
        const coreGeometry = new THREE.SphereGeometry(1, 16, 16);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        this.galaxyCore = new THREE.Mesh(coreGeometry, coreMaterial);
        this.scene.add(this.galaxyCore);
    }
    
    onResize(width, height) {
        super.onResize(width, height);
        if (this.renderer) {
            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }
    
    draw(audioData) {
        if (!this.renderer || !this.scene) return;
        
        const { frequencyData, bufferLength, time } = audioData;
        const audioMetrics = this.calculateAudioMetrics(frequencyData, bufferLength);
        const { total: totalEnergy, bass: bassEnergy, mid: midEnergy, treble: trebleEnergy } = audioMetrics;
        
        this.time = time;
        
        // Update shader uniforms
        if (this.particleSystem && this.particleSystem.material.uniforms) {
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.material.uniforms.audioEnergy.value = totalEnergy;
            this.particleSystem.material.uniforms.bassEnergy.value = bassEnergy;
            this.particleSystem.material.uniforms.trebleEnergy.value = trebleEnergy;
        }
        
        // Rotate galaxy based on audio
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.005 + bassEnergy * 0.02;
            this.particleSystem.rotation.x = Math.sin(time * 0.5) * 0.2 + midEnergy * 0.3;
        }
        
        // Animate galaxy core
        if (this.galaxyCore) {
            this.galaxyCore.scale.setScalar(1 + totalEnergy * 2);
            this.galaxyCore.material.opacity = 0.3 + totalEnergy * 0.7;
            
            // Color shift based on audio
            const hue = (time * 0.1 + totalEnergy * 2) % 1;
            this.galaxyCore.material.color.setHSL(hue, 1, 0.5 + totalEnergy * 0.5);
        }
        
        // Camera movement
        this.camera.position.x = Math.sin(time * 0.2) * 10 + Math.sin(time * 0.7 + bassEnergy * 5) * 5;
        this.camera.position.z = 50 + Math.cos(time * 0.3) * 20 + totalEnergy * 30;
        this.camera.position.y = 20 + Math.sin(time * 0.4) * 10 + midEnergy * 15;
        this.camera.lookAt(0, 0, 0);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    cleanup() {
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        if (this.particleSystem) {
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        if (this.galaxyCore) {
            this.galaxyCore.geometry.dispose();
            this.galaxyCore.material.dispose();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('particleGalaxy3d', ParticleGalaxy3DVisualization);
    }
});
