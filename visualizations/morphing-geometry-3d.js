class MorphingGeometry3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.geometries = [];
        this.meshes = [];
        this.time = 0;
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
        
        // Create morphing geometries
        this.createMorphingShapes();
        
        // Position camera
        this.camera.position.z = 30;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
    }
    
    createMorphingShapes() {
        // Create multiple morphing objects
        const shapeCount = 8;
        
        for (let i = 0; i < shapeCount; i++) {
            // Create base geometries for morphing
            const sphere = new THREE.SphereGeometry(2, 32, 32);
            const cube = new THREE.BoxGeometry(3, 3, 3);
            const torus = new THREE.TorusGeometry(2, 0.8, 16, 32);
            const octahedron = new THREE.OctahedronGeometry(2.5);
            
            // Store original positions for morphing
            const spherePositions = sphere.attributes.position.array.slice();
            const cubePositions = cube.attributes.position.array.slice();
            const torusPositions = torus.attributes.position.array.slice();
            const octahedronPositions = octahedron.attributes.position.array.slice();
            
            // Create shader material with morphing capabilities
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    audioEnergy: { value: 0 },
                    bassEnergy: { value: 0 },
                    midEnergy: { value: 0 },
                    trebleEnergy: { value: 0 },
                    morphFactor: { value: 0 },
                    colorShift: { value: 0 }
                },
                vertexShader: `
                    uniform float time;
                    uniform float audioEnergy;
                    uniform float bassEnergy;
                    uniform float morphFactor;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    
                    void main() {
                        vPosition = position;
                        vNormal = normal;
                        
                        vec3 pos = position;
                        
                        // Audio-reactive vertex displacement
                        float noise = sin(pos.x * 2.0 + time) * cos(pos.y * 2.0 + time) * sin(pos.z * 2.0 + time);
                        pos += normal * noise * audioEnergy * 2.0;
                        
                        // Morphing effect
                        float morphWave = sin(time * 2.0 + length(pos) * 0.5) * morphFactor;
                        pos += normal * morphWave * bassEnergy;
                        
                        // Pulsing effect
                        pos *= (1.0 + sin(time * 4.0) * audioEnergy * 0.3);
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float audioEnergy;
                    uniform float trebleEnergy;
                    uniform float colorShift;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    
                    void main() {
                        // Dynamic color based on position and audio
                        float hue = colorShift + length(vPosition) * 0.1 + time * 0.5;
                        float saturation = 0.8 + audioEnergy * 0.2;
                        float lightness = 0.5 + trebleEnergy * 0.4;
                        
                        // Convert HSL to RGB (simplified)
                        vec3 color = vec3(
                            0.5 + 0.5 * sin(hue),
                            0.5 + 0.5 * sin(hue + 2.094),
                            0.5 + 0.5 * sin(hue + 4.188)
                        );
                        
                        // Lighting calculation
                        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                        float diff = max(dot(vNormal, lightDir), 0.0);
                        
                        vec3 finalColor = color * (0.3 + diff * 0.7) * (1.0 + audioEnergy);
                        
                        // Add glow effect
                        float glow = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                        finalColor += glow * trebleEnergy * 0.5;
                        
                        gl_FragColor = vec4(finalColor, 0.9);
                    }
                `,
                transparent: true,
                side: THREE.DoubleSide
            });
            
            // Create mesh
            const mesh = new THREE.Mesh(sphere, material);
            
            // Position meshes in a circle
            const angle = (i / shapeCount) * Math.PI * 2;
            const radius = 12;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.position.y = (Math.random() - 0.5) * 8;
            
            // Store reference data
            mesh.userData = {
                originalPosition: mesh.position.clone(),
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                morphPhase: Math.random() * Math.PI * 2,
                colorPhase: Math.random() * Math.PI * 2,
                geometries: {
                    sphere: spherePositions,
                    cube: cubePositions,
                    torus: torusPositions,
                    octahedron: octahedronPositions
                }
            };
            
            this.scene.add(mesh);
            this.meshes.push(mesh);
        }
        
        // Add central connecting structure
        this.createConnectingLines();
    }
    
    createConnectingLines() {
        const lineGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        // Create connections between shapes
        for (let i = 0; i < this.meshes.length; i++) {
            for (let j = i + 1; j < this.meshes.length; j++) {
                const mesh1 = this.meshes[i];
                const mesh2 = this.meshes[j];
                
                positions.push(
                    mesh1.position.x, mesh1.position.y, mesh1.position.z,
                    mesh2.position.x, mesh2.position.y, mesh2.position.z
                );
                
                // Random colors for lines
                const color = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);
            }
        }
        
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.3
        });
        
        this.connectingLines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(this.connectingLines);
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
        
        // Update each mesh
        this.meshes.forEach((mesh, index) => {
            const userData = mesh.userData;
            
            // Update shader uniforms
            mesh.material.uniforms.time.value = time;
            mesh.material.uniforms.audioEnergy.value = totalEnergy;
            mesh.material.uniforms.bassEnergy.value = bassEnergy;
            mesh.material.uniforms.midEnergy.value = midEnergy;
            mesh.material.uniforms.trebleEnergy.value = trebleEnergy;
            mesh.material.uniforms.morphFactor.value = Math.sin(time + userData.morphPhase) * 0.5 + 0.5;
            mesh.material.uniforms.colorShift.value = time * 0.5 + userData.colorPhase;
            
            // Rotation based on audio
            mesh.rotation.x += userData.rotationSpeed + bassEnergy * 0.05;
            mesh.rotation.y += userData.rotationSpeed * 0.7 + midEnergy * 0.03;
            mesh.rotation.z += userData.rotationSpeed * 0.3 + trebleEnergy * 0.02;
            
            // Position oscillation
            const oscillation = Math.sin(time * 2 + index) * totalEnergy * 3;
            mesh.position.y = userData.originalPosition.y + oscillation;
            
            // Scale based on audio
            const scale = 1 + totalEnergy * 0.5;
            mesh.scale.setScalar(scale);
        });
        
        // Update connecting lines opacity
        if (this.connectingLines) {
            this.connectingLines.material.opacity = 0.1 + totalEnergy * 0.4;
        }
        
        // Camera movement
        this.camera.position.x = Math.sin(time * 0.3) * 5;
        this.camera.position.y = Math.cos(time * 0.2) * 8 + totalEnergy * 10;
        this.camera.position.z = 30 + Math.sin(time * 0.4) * 10 + bassEnergy * 20;
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
        
        this.meshes.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        
        if (this.connectingLines) {
            this.connectingLines.geometry.dispose();
            this.connectingLines.material.dispose();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('morphingGeometry3d', MorphingGeometry3DVisualization);
    }
});
