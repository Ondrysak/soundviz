class AudioTerrain3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.time = 0;
        this.terrainSize = 64;
    }
    
    initialize() {
        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0x000000, 0);
        
        // Replace canvas with Three.js canvas
        const container = this.ctx.canvas.parentNode;
        container.removeChild(this.ctx.canvas);
        container.appendChild(this.renderer.domElement);
        
        // Create terrain
        this.createTerrain();
        
        // Position camera
        this.camera.position.set(0, 20, 30);
        this.camera.lookAt(0, 0, 0);
        
        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x000000, 30, 100);
    }
    
    createTerrain() {
        // Create plane geometry for terrain
        const geometry = new THREE.PlaneGeometry(40, 40, this.terrainSize - 1, this.terrainSize - 1);
        geometry.rotateX(-Math.PI / 2);
        
        // Store original positions
        this.originalPositions = geometry.attributes.position.array.slice();
        
        // Create shader material for terrain
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioData: { value: new Array(this.terrainSize).fill(0) },
                bassEnergy: { value: 0 },
                midEnergy: { value: 0 },
                trebleEnergy: { value: 0 },
                totalEnergy: { value: 0 }
            },
            vertexShader: `
                uniform float time;
                uniform float audioData[${this.terrainSize}];
                uniform float bassEnergy;
                uniform float totalEnergy;
                varying vec3 vPosition;
                varying float vHeight;
                
                void main() {
                    vPosition = position;
                    
                    vec3 pos = position;
                    
                    // Calculate grid position
                    float gridX = (pos.x + 20.0) / 40.0 * ${this.terrainSize - 1}.0;
                    float gridZ = (pos.z + 20.0) / 40.0 * ${this.terrainSize - 1}.0;
                    
                    int indexX = int(gridX);
                    int indexZ = int(gridZ);
                    
                    // Sample audio data for height
                    float audioHeight = 0.0;
                    if (indexX >= 0 && indexX < ${this.terrainSize} && indexZ >= 0 && indexZ < ${this.terrainSize}) {
                        int index = indexZ * ${this.terrainSize} + indexX;
                        if (index < ${this.terrainSize * this.terrainSize}) {
                            audioHeight = audioData[min(index, ${this.terrainSize - 1})] * 10.0;
                        }
                    }
                    
                    // Add wave motion
                    float wave1 = sin(pos.x * 0.3 + time * 2.0) * cos(pos.z * 0.3 + time * 1.5);
                    float wave2 = sin(pos.x * 0.1 + time * 0.8) * sin(pos.z * 0.1 + time * 1.2);
                    
                    // Combine audio and wave data
                    pos.y = audioHeight + wave1 * bassEnergy * 3.0 + wave2 * totalEnergy * 2.0;
                    
                    vHeight = pos.y;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float trebleEnergy;
                uniform float totalEnergy;
                varying vec3 vPosition;
                varying float vHeight;
                
                void main() {
                    // Color based on height and position
                    float heightFactor = clamp(vHeight / 15.0, 0.0, 1.0);
                    
                    // Create color gradient based on height
                    vec3 lowColor = vec3(0.1, 0.1, 0.8);  // Deep blue
                    vec3 midColor = vec3(0.8, 0.4, 0.1);  // Orange
                    vec3 highColor = vec3(1.0, 0.8, 0.2); // Yellow
                    
                    vec3 color;
                    if (heightFactor < 0.5) {
                        color = mix(lowColor, midColor, heightFactor * 2.0);
                    } else {
                        color = mix(midColor, highColor, (heightFactor - 0.5) * 2.0);
                    }
                    
                    // Add audio-reactive glow
                    color += vec3(trebleEnergy * 0.5, totalEnergy * 0.3, 0.0);
                    
                    // Add time-based color shift
                    color.r += sin(time * 2.0 + vPosition.x * 0.1) * 0.2;
                    color.g += cos(time * 1.5 + vPosition.z * 0.1) * 0.2;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            wireframe: false,
            side: THREE.DoubleSide
        });
        
        this.terrain = new THREE.Mesh(geometry, material);
        this.scene.add(this.terrain);
        
        // Create wireframe overlay
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        
        this.wireframeTerrain = new THREE.Mesh(geometry.clone(), wireframeMaterial);
        this.wireframeTerrain.position.y = 0.1; // Slightly above main terrain
        this.scene.add(this.wireframeTerrain);
        
        // Add particle effects above terrain
        this.createTerrainParticles();
    }
    
    createTerrainParticles() {
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions above terrain
            positions[i3] = (Math.random() - 0.5) * 50;
            positions[i3 + 1] = Math.random() * 30 + 5;
            positions[i3 + 2] = (Math.random() - 0.5) * 50;
            
            // Random colors
            colors[i3] = Math.random();
            colors[i3 + 1] = Math.random();
            colors[i3 + 2] = Math.random();
        }
        
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
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
        
        // Process frequency data for terrain
        const terrainAudioData = new Array(this.terrainSize);
        const step = Math.floor(bufferLength / this.terrainSize);
        
        for (let i = 0; i < this.terrainSize; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) {
                const index = i * step + j;
                if (index < bufferLength) {
                    sum += frequencyData[index];
                }
            }
            terrainAudioData[i] = (sum / step) / 255.0; // Normalize to 0-1
        }
        
        // Update terrain shader uniforms
        if (this.terrain && this.terrain.material.uniforms) {
            this.terrain.material.uniforms.time.value = time;
            this.terrain.material.uniforms.audioData.value = terrainAudioData;
            this.terrain.material.uniforms.bassEnergy.value = bassEnergy;
            this.terrain.material.uniforms.midEnergy.value = midEnergy;
            this.terrain.material.uniforms.trebleEnergy.value = trebleEnergy;
            this.terrain.material.uniforms.totalEnergy.value = totalEnergy;
        }
        
        // Update wireframe opacity based on audio
        if (this.wireframeTerrain) {
            this.wireframeTerrain.material.opacity = 0.2 + totalEnergy * 0.5;
            this.wireframeTerrain.material.color.setHSL((time * 0.1) % 1, 1, 0.5);
        }
        
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            const colors = this.particles.geometry.attributes.color.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Float particles up and reset when they get too high
                positions[i + 1] += 0.1 + totalEnergy * 0.3;
                if (positions[i + 1] > 40) {
                    positions[i + 1] = 5;
                    positions[i] = (Math.random() - 0.5) * 50;
                    positions[i + 2] = (Math.random() - 0.5) * 50;
                }
                
                // Update colors based on audio
                const colorIndex = i;
                colors[colorIndex] = 0.5 + Math.sin(time + i * 0.1) * 0.5;
                colors[colorIndex + 1] = 0.5 + Math.cos(time + i * 0.1) * 0.5;
                colors[colorIndex + 2] = 0.5 + Math.sin(time * 2 + i * 0.1) * 0.5;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.geometry.attributes.color.needsUpdate = true;
            
            // Rotate particle system
            this.particles.rotation.y += 0.005 + bassEnergy * 0.02;
        }
        
        // Camera movement
        const cameraRadius = 35 + totalEnergy * 15;
        this.camera.position.x = Math.sin(time * 0.2) * cameraRadius;
        this.camera.position.z = Math.cos(time * 0.2) * cameraRadius;
        this.camera.position.y = 15 + Math.sin(time * 0.3) * 10 + midEnergy * 20;
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
        
        if (this.terrain) {
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }
        
        if (this.wireframeTerrain) {
            this.wireframeTerrain.geometry.dispose();
            this.wireframeTerrain.material.dispose();
        }
        
        if (this.particles) {
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('audioTerrain3d', AudioTerrain3DVisualization);
    }
});
