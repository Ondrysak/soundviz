class DNAHelix3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.helixGroup = null;
        this.basePairs = [];
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
        
        // Create DNA helix
        this.createDNAHelix();
        
        // Position camera
        this.camera.position.set(0, 0, 30);
        this.camera.lookAt(0, 0, 0);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0x00ff88, 1, 100);
        pointLight1.position.set(10, 10, 10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff0088, 1, 100);
        pointLight2.position.set(-10, -10, 10);
        this.scene.add(pointLight2);
        
        this.lights = [pointLight1, pointLight2];
    }
    
    createDNAHelix() {
        this.helixGroup = new THREE.Group();
        
        // DNA parameters
        const helixHeight = 40;
        const helixRadius = 8;
        const basePairCount = 60;
        const basePairSpacing = helixHeight / basePairCount;
        
        // Create the two DNA strands
        this.createDNAStrands(helixHeight, helixRadius, basePairCount);
        
        // Create base pairs
        this.createBasePairs(helixHeight, helixRadius, basePairCount, basePairSpacing);
        
        // Create connecting bonds
        this.createPhosphateBonds(helixHeight, helixRadius, basePairCount, basePairSpacing);
        
        this.scene.add(this.helixGroup);
    }
    
    createDNAStrands(helixHeight, helixRadius, basePairCount) {
        // Create geometry for DNA strands
        const strandPoints1 = [];
        const strandPoints2 = [];
        
        for (let i = 0; i <= basePairCount * 2; i++) {
            const t = i / (basePairCount * 2);
            const y = (t - 0.5) * helixHeight;
            const angle = t * Math.PI * 4; // Two full rotations
            
            // First strand
            strandPoints1.push(new THREE.Vector3(
                Math.cos(angle) * helixRadius,
                y,
                Math.sin(angle) * helixRadius
            ));
            
            // Second strand (opposite phase)
            strandPoints2.push(new THREE.Vector3(
                Math.cos(angle + Math.PI) * helixRadius,
                y,
                Math.sin(angle + Math.PI) * helixRadius
            ));
        }
        
        // Create tube geometries for strands
        const curve1 = new THREE.CatmullRomCurve3(strandPoints1);
        const curve2 = new THREE.CatmullRomCurve3(strandPoints2);
        
        const tubeGeometry1 = new THREE.TubeGeometry(curve1, 100, 0.3, 8, false);
        const tubeGeometry2 = new THREE.TubeGeometry(curve2, 100, 0.3, 8, false);
        
        // Create materials with shaders
        const strandMaterial1 = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                energy: { value: 0 },
                color1: { value: new THREE.Vector3(0.2, 0.8, 1.0) },
                color2: { value: new THREE.Vector3(0.8, 0.2, 1.0) }
            },
            vertexShader: `
                uniform float time;
                uniform float energy;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    
                    vec3 pos = position;
                    
                    // Audio-reactive pulsing
                    pos += normal * sin(pos.y * 0.2 + time * 3.0) * energy * 0.5;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float energy;
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    // Gradient along the helix
                    float gradient = (vPosition.y + 20.0) / 40.0;
                    vec3 color = mix(color1, color2, gradient);
                    
                    // Add energy glow
                    color += vec3(energy * 0.5);
                    
                    // Fresnel effect
                    float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                    color += fresnel * 0.3;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
        
        const strandMaterial2 = strandMaterial1.clone();
        strandMaterial2.uniforms.color1.value.set(1.0, 0.8, 0.2);
        strandMaterial2.uniforms.color2.value.set(1.0, 0.2, 0.8);
        
        this.strand1 = new THREE.Mesh(tubeGeometry1, strandMaterial1);
        this.strand2 = new THREE.Mesh(tubeGeometry2, strandMaterial2);
        
        this.helixGroup.add(this.strand1);
        this.helixGroup.add(this.strand2);
    }
    
    createBasePairs(helixHeight, helixRadius, basePairCount, basePairSpacing) {
        // Base pair types (A-T, G-C)
        const baseTypes = ['A', 'T', 'G', 'C'];
        const basePairTypes = [['A', 'T'], ['T', 'A'], ['G', 'C'], ['C', 'G']];
        
        for (let i = 0; i < basePairCount; i++) {
            const y = (i / basePairCount - 0.5) * helixHeight;
            const angle = (i / basePairCount) * Math.PI * 4;
            
            // Positions on the two strands
            const pos1 = new THREE.Vector3(
                Math.cos(angle) * helixRadius,
                y,
                Math.sin(angle) * helixRadius
            );
            
            const pos2 = new THREE.Vector3(
                Math.cos(angle + Math.PI) * helixRadius,
                y,
                Math.sin(angle + Math.PI) * helixRadius
            );
            
            // Create base pair
            const basePairType = basePairTypes[i % basePairTypes.length];
            const basePair = this.createBasePair(pos1, pos2, basePairType, i);
            this.basePairs.push(basePair);
            this.helixGroup.add(basePair.group);
        }
    }
    
    createBasePair(pos1, pos2, basePairType, index) {
        const group = new THREE.Group();
        
        // Create base geometries
        const baseGeometry = new THREE.SphereGeometry(0.8, 12, 12);
        
        // Base colors
        const baseColors = {
            'A': new THREE.Color(1.0, 0.3, 0.3), // Red
            'T': new THREE.Color(0.3, 1.0, 0.3), // Green
            'G': new THREE.Color(0.3, 0.3, 1.0), // Blue
            'C': new THREE.Color(1.0, 1.0, 0.3)  // Yellow
        };
        
        // Create first base
        const baseMaterial1 = new THREE.MeshPhongMaterial({
            color: baseColors[basePairType[0]],
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        const base1 = new THREE.Mesh(baseGeometry, baseMaterial1);
        base1.position.copy(pos1);
        group.add(base1);
        
        // Create second base
        const baseMaterial2 = new THREE.MeshPhongMaterial({
            color: baseColors[basePairType[1]],
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        const base2 = new THREE.Mesh(baseGeometry, baseMaterial2);
        base2.position.copy(pos2);
        group.add(base2);
        
        // Create hydrogen bond between bases
        const bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, pos1.distanceTo(pos2));
        const bondMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        
        const bond = new THREE.Mesh(bondGeometry, bondMaterial);
        bond.position.copy(pos1).lerp(pos2, 0.5);
        bond.lookAt(pos2);
        bond.rotateX(Math.PI / 2);
        group.add(bond);
        
        return {
            group: group,
            base1: base1,
            base2: base2,
            bond: bond,
            basePairType: basePairType,
            index: index,
            originalPos1: pos1.clone(),
            originalPos2: pos2.clone(),
            energy: 0
        };
    }
    
    createPhosphateBonds(helixHeight, helixRadius, basePairCount, basePairSpacing) {
        // Create bonds between consecutive bases on each strand
        const bondGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1);
        const bondMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.4
        });
        
        this.phosphateBonds = [];
        
        for (let i = 0; i < basePairCount - 1; i++) {
            const basePair1 = this.basePairs[i];
            const basePair2 = this.basePairs[i + 1];
            
            // Bond on first strand
            const bond1 = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            const pos1 = basePair1.originalPos1;
            const pos2 = basePair2.originalPos1;
            
            bond1.position.copy(pos1).lerp(pos2, 0.5);
            bond1.scale.y = pos1.distanceTo(pos2);
            bond1.lookAt(pos2);
            bond1.rotateX(Math.PI / 2);
            
            // Bond on second strand
            const bond2 = new THREE.Mesh(bondGeometry, bondMaterial.clone());
            const pos3 = basePair1.originalPos2;
            const pos4 = basePair2.originalPos2;
            
            bond2.position.copy(pos3).lerp(pos4, 0.5);
            bond2.scale.y = pos3.distanceTo(pos4);
            bond2.lookAt(pos4);
            bond2.rotateX(Math.PI / 2);
            
            this.phosphateBonds.push(bond1, bond2);
            this.helixGroup.add(bond1);
            this.helixGroup.add(bond2);
        }
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
        
        // Update DNA strand materials
        if (this.strand1 && this.strand2) {
            this.strand1.material.uniforms.time.value = time;
            this.strand1.material.uniforms.energy.value = totalEnergy;
            
            this.strand2.material.uniforms.time.value = time;
            this.strand2.material.uniforms.energy.value = totalEnergy;
        }
        
        // Update base pairs based on frequency data
        this.basePairs.forEach((basePair, index) => {
            // Map frequency data to base pairs
            const freqIndex = Math.floor((index / this.basePairs.length) * bufferLength);
            const energy = (frequencyData[freqIndex] || 0) / 255;
            basePair.energy = energy;
            
            // Scale bases based on energy
            const scale = 1 + energy * 0.8;
            basePair.base1.scale.setScalar(scale);
            basePair.base2.scale.setScalar(scale);
            
            // Glow effect
            basePair.base1.material.emissive.copy(basePair.base1.material.color).multiplyScalar(energy * 0.3);
            basePair.base2.material.emissive.copy(basePair.base2.material.color).multiplyScalar(energy * 0.3);
            
            // Oscillate bond opacity
            basePair.bond.material.opacity = 0.4 + energy * 0.4 + Math.sin(time * 4 + index * 0.5) * 0.2;
            
            // Slight position oscillation
            const oscillation = Math.sin(time * 3 + index * 0.3) * energy * 0.5;
            basePair.base1.position.copy(basePair.originalPos1).multiplyScalar(1 + oscillation * 0.1);
            basePair.base2.position.copy(basePair.originalPos2).multiplyScalar(1 + oscillation * 0.1);
        });
        
        // Update phosphate bonds
        this.phosphateBonds.forEach((bond, index) => {
            bond.material.opacity = 0.3 + totalEnergy * 0.4;
            bond.material.color.setHSL((time * 0.2 + index * 0.1) % 1, 0.5, 0.5);
        });
        
        // Rotate entire helix
        this.helixGroup.rotation.y += 0.01 + bassEnergy * 0.05;
        this.helixGroup.rotation.x = Math.sin(time * 0.5) * 0.2 + midEnergy * 0.3;
        
        // Scale helix based on audio
        const helixScale = 1 + totalEnergy * 0.3;
        this.helixGroup.scale.setScalar(helixScale);
        
        // Update lights
        this.lights.forEach((light, index) => {
            light.intensity = 0.8 + totalEnergy * 1.2;
            light.color.setHSL((time * 0.3 + index * 0.5) % 1, 1, 0.6);
            
            // Orbit lights around helix
            const angle = time * 0.4 + index * Math.PI;
            const radius = 20 + Math.sin(time + index) * 5;
            light.position.x = Math.cos(angle) * radius;
            light.position.z = Math.sin(angle) * radius;
            light.position.y = Math.sin(time * 0.6 + index) * 15;
        });
        
        // Camera movement
        const cameraAngle = time * 0.15;
        const cameraRadius = 35 + Math.sin(time * 0.4) * 8 + totalEnergy * 12;
        this.camera.position.x = Math.sin(cameraAngle) * cameraRadius;
        this.camera.position.z = Math.cos(cameraAngle) * cameraRadius;
        this.camera.position.y = Math.sin(time * 0.25) * 12 + midEnergy * 8;
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
        
        if (this.strand1) {
            this.strand1.geometry.dispose();
            this.strand1.material.dispose();
        }
        
        if (this.strand2) {
            this.strand2.geometry.dispose();
            this.strand2.material.dispose();
        }
        
        this.basePairs.forEach(basePair => {
            basePair.base1.geometry.dispose();
            basePair.base1.material.dispose();
            basePair.base2.geometry.dispose();
            basePair.base2.material.dispose();
            basePair.bond.geometry.dispose();
            basePair.bond.material.dispose();
        });
        
        this.phosphateBonds.forEach(bond => {
            bond.geometry.dispose();
            bond.material.dispose();
        });
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('dnaHelix3d', DNAHelix3DVisualization);
    }
});
