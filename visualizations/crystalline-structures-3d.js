class CrystallineStructures3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.crystals = [];
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
        
        // Create crystalline structures
        this.createCrystals();
        
        // Position camera
        this.camera.position.set(0, 10, 25);
        this.camera.lookAt(0, 0, 0);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0x00ffff, 1, 100);
        pointLight1.position.set(10, 10, 10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff00ff, 1, 100);
        pointLight2.position.set(-10, -10, 10);
        this.scene.add(pointLight2);
        
        this.lights = [pointLight1, pointLight2];
    }
    
    createCrystals() {
        const crystalCount = 12;
        
        for (let i = 0; i < crystalCount; i++) {
            const crystal = this.createSingleCrystal(i);
            this.crystals.push(crystal);
            this.scene.add(crystal.group);
        }
        
        // Create connecting energy beams
        this.createEnergyBeams();
    }
    
    createSingleCrystal(index) {
        const group = new THREE.Group();
        
        // Create main crystal body (octahedron-like shape)
        const mainGeometry = new THREE.OctahedronGeometry(2 + Math.random() * 2);
        const mainMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(index / 12, 0.8, 0.6),
            transparent: true,
            opacity: 0.7,
            shininess: 100
        });
        
        const mainCrystal = new THREE.Mesh(mainGeometry, mainMaterial);
        group.add(mainCrystal);
        
        // Create smaller crystal fragments around main crystal
        const fragmentCount = 3 + Math.floor(Math.random() * 4);
        const fragments = [];
        
        for (let j = 0; j < fragmentCount; j++) {
            const fragmentGeometry = new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.8);
            const fragmentMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL((index / 12 + j * 0.1) % 1, 0.9, 0.7),
                transparent: true,
                opacity: 0.6,
                shininess: 150
            });
            
            const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
            
            // Position fragments around main crystal
            const angle = (j / fragmentCount) * Math.PI * 2;
            const radius = 4 + Math.random() * 2;
            fragment.position.set(
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * 3,
                Math.sin(angle) * radius
            );
            
            fragment.userData = {
                originalPosition: fragment.position.clone(),
                rotationSpeed: (Math.random() - 0.5) * 0.05,
                floatPhase: Math.random() * Math.PI * 2
            };
            
            fragments.push(fragment);
            group.add(fragment);
        }
        
        // Position crystal group
        const groupAngle = (index / crystalCount) * Math.PI * 2;
        const groupRadius = 15;
        group.position.set(
            Math.cos(groupAngle) * groupRadius,
            (Math.random() - 0.5) * 8,
            Math.sin(groupAngle) * groupRadius
        );
        
        return {
            group: group,
            mainCrystal: mainCrystal,
            fragments: fragments,
            originalPosition: group.position.clone(),
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            pulsePhase: Math.random() * Math.PI * 2,
            energyLevel: 0
        };
    }
    
    createEnergyBeams() {
        const beamGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        // Create beams between crystals
        for (let i = 0; i < this.crystals.length; i++) {
            for (let j = i + 1; j < this.crystals.length; j++) {
                const crystal1 = this.crystals[i];
                const crystal2 = this.crystals[j];
                
                // Only connect nearby crystals
                const distance = crystal1.group.position.distanceTo(crystal2.group.position);
                if (distance < 25) {
                    positions.push(
                        crystal1.group.position.x, crystal1.group.position.y, crystal1.group.position.z,
                        crystal2.group.position.x, crystal2.group.position.y, crystal2.group.position.z
                    );
                    
                    // Color based on distance
                    const color = new THREE.Color().setHSL(distance / 25, 1, 0.5);
                    colors.push(color.r, color.g, color.b);
                    colors.push(color.r, color.g, color.b);
                }
            }
        }
        
        beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        beamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const beamMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        this.energyBeams = new THREE.LineSegments(beamGeometry, beamMaterial);
        this.scene.add(this.energyBeams);
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
        
        // Update each crystal
        this.crystals.forEach((crystal, index) => {
            // Calculate energy level for this crystal based on frequency range
            const freqStart = Math.floor((index / this.crystals.length) * bufferLength);
            const freqEnd = Math.floor(((index + 1) / this.crystals.length) * bufferLength);
            let crystalEnergy = 0;
            
            for (let i = freqStart; i < freqEnd && i < bufferLength; i++) {
                crystalEnergy += frequencyData[i];
            }
            crystalEnergy = (crystalEnergy / (freqEnd - freqStart)) / 255;
            
            crystal.energyLevel = crystalEnergy;
            
            // Update main crystal
            const mainCrystal = crystal.mainCrystal;
            
            // Scale based on energy
            const scale = 1 + crystalEnergy * 1.5;
            mainCrystal.scale.setScalar(scale);
            
            // Rotation
            mainCrystal.rotation.x += crystal.rotationSpeed + crystalEnergy * 0.1;
            mainCrystal.rotation.y += crystal.rotationSpeed * 0.7 + crystalEnergy * 0.05;
            
            // Color intensity based on energy
            mainCrystal.material.emissive.setHSL(
                (index / this.crystals.length + time * 0.1) % 1,
                0.8,
                crystalEnergy * 0.5
            );
            
            // Opacity pulsing
            mainCrystal.material.opacity = 0.5 + crystalEnergy * 0.4 + Math.sin(time * 3 + crystal.pulsePhase) * 0.1;
            
            // Update fragments
            crystal.fragments.forEach((fragment, fragIndex) => {
                // Floating motion
                const floatOffset = Math.sin(time * 2 + fragment.userData.floatPhase) * crystalEnergy * 2;
                fragment.position.y = fragment.userData.originalPosition.y + floatOffset;
                
                // Rotation
                fragment.rotation.x += fragment.userData.rotationSpeed + crystalEnergy * 0.08;
                fragment.rotation.y += fragment.userData.rotationSpeed * 1.2;
                
                // Scale
                fragment.scale.setScalar(0.8 + crystalEnergy * 0.7);
                
                // Emissive glow
                fragment.material.emissive.setHSL(
                    ((index + fragIndex * 0.1) / this.crystals.length + time * 0.15) % 1,
                    1,
                    crystalEnergy * 0.3
                );
            });
            
            // Group position oscillation
            const oscillation = Math.sin(time + index) * totalEnergy * 3;
            crystal.group.position.y = crystal.originalPosition.y + oscillation;
            
            // Group rotation
            crystal.group.rotation.y += 0.005 + bassEnergy * 0.02;
        });
        
        // Update energy beams
        if (this.energyBeams) {
            this.energyBeams.material.opacity = 0.2 + totalEnergy * 0.6;
            
            // Update beam colors based on audio
            const colors = this.energyBeams.geometry.attributes.color.array;
            for (let i = 0; i < colors.length; i += 6) {
                const hue = (time * 0.5 + i * 0.01) % 1;
                const color = new THREE.Color().setHSL(hue, 1, 0.5 + totalEnergy * 0.5);
                
                colors[i] = colors[i + 3] = color.r;
                colors[i + 1] = colors[i + 4] = color.g;
                colors[i + 2] = colors[i + 5] = color.b;
            }
            this.energyBeams.geometry.attributes.color.needsUpdate = true;
        }
        
        // Update lights
        this.lights.forEach((light, index) => {
            light.intensity = 0.5 + totalEnergy * 1.5;
            light.color.setHSL((time * 0.2 + index * 0.5) % 1, 1, 0.5);
            
            // Move lights in orbit
            const angle = time * 0.3 + index * Math.PI;
            const radius = 15 + Math.sin(time + index) * 5;
            light.position.x = Math.cos(angle) * radius;
            light.position.z = Math.sin(angle) * radius;
            light.position.y = 10 + Math.sin(time * 2 + index) * 8;
        });
        
        // Camera movement
        const cameraAngle = time * 0.1;
        const cameraRadius = 30 + Math.sin(time * 0.4) * 10 + totalEnergy * 15;
        this.camera.position.x = Math.sin(cameraAngle) * cameraRadius;
        this.camera.position.z = Math.cos(cameraAngle) * cameraRadius;
        this.camera.position.y = 10 + Math.sin(time * 0.3) * 8 + midEnergy * 12;
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
        
        this.crystals.forEach(crystal => {
            crystal.mainCrystal.geometry.dispose();
            crystal.mainCrystal.material.dispose();
            
            crystal.fragments.forEach(fragment => {
                fragment.geometry.dispose();
                fragment.material.dispose();
            });
        });
        
        if (this.energyBeams) {
            this.energyBeams.geometry.dispose();
            this.energyBeams.material.dispose();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('crystallineStructures3d', CrystallineStructures3DVisualization);
    }
});
