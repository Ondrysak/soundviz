class NeuralNetwork3DVisualization extends BaseVisualization {
    constructor(ctx, width, height) {
        super(ctx, width, height);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.nodes = [];
        this.connections = [];
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
        
        // Create neural network
        this.createNeuralNetwork();
        
        // Position camera
        this.camera.position.set(0, 0, 40);
        this.camera.lookAt(0, 0, 0);
    }
    
    createNeuralNetwork() {
        // Network structure: input layer, hidden layers, output layer
        const layers = [8, 12, 16, 12, 6]; // Number of nodes per layer
        const layerSpacing = 12;
        const nodeSpacing = 4;
        
        // Create nodes for each layer
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            const nodesInLayer = layers[layerIndex];
            const layerNodes = [];
            
            for (let nodeIndex = 0; nodeIndex < nodesInLayer; nodeIndex++) {
                const node = this.createNode(layerIndex, nodeIndex, nodesInLayer, layerSpacing, nodeSpacing);
                layerNodes.push(node);
                this.nodes.push(node);
                this.scene.add(node.mesh);
            }
            
            // Create connections to next layer
            if (layerIndex < layers.length - 1) {
                const nextLayerNodes = layers[layerIndex + 1];
                this.createLayerConnections(layerNodes, layerIndex + 1, nextLayerNodes, layerSpacing, nodeSpacing);
            }
        }
        
        // Create connection visualization
        this.createConnectionLines();
    }
    
    createNode(layerIndex, nodeIndex, nodesInLayer, layerSpacing, nodeSpacing) {
        // Create node geometry
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        
        // Create node material with shader
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                activation: { value: 0 },
                energy: { value: 0 },
                nodeColor: { value: new THREE.Vector3(0.5, 0.8, 1.0) }
            },
            vertexShader: `
                uniform float time;
                uniform float activation;
                uniform float energy;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    vPosition = position;
                    vNormal = normal;
                    
                    vec3 pos = position;
                    
                    // Pulsing effect based on activation
                    pos *= (1.0 + activation * 0.5 + sin(time * 4.0) * energy * 0.2);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float activation;
                uniform float energy;
                uniform vec3 nodeColor;
                varying vec3 vPosition;
                varying vec3 vNormal;
                
                void main() {
                    // Base color
                    vec3 color = nodeColor;
                    
                    // Activation glow
                    color += vec3(activation * 2.0, activation * 1.5, activation);
                    
                    // Energy pulse
                    float pulse = sin(time * 6.0) * 0.5 + 0.5;
                    color += vec3(energy * pulse * 0.5);
                    
                    // Fresnel effect for rim lighting
                    float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
                    color += fresnel * activation * 0.5;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            transparent: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position node
        const x = (layerIndex - (layers.length - 1) / 2) * layerSpacing;
        const y = (nodeIndex - (nodesInLayer - 1) / 2) * nodeSpacing;
        const z = (Math.random() - 0.5) * 4; // Add some depth variation
        
        mesh.position.set(x, y, z);
        
        return {
            mesh: mesh,
            layerIndex: layerIndex,
            nodeIndex: nodeIndex,
            activation: 0,
            connections: [],
            originalPosition: mesh.position.clone(),
            pulsePhase: Math.random() * Math.PI * 2
        };
    }
    
    createLayerConnections(currentLayerNodes, nextLayerIndex, nextLayerNodeCount, layerSpacing, nodeSpacing) {
        // Create connections between current layer and next layer
        currentLayerNodes.forEach(node => {
            // Connect to random nodes in next layer (not all-to-all for visual clarity)
            const connectionCount = Math.min(nextLayerNodeCount, 3 + Math.floor(Math.random() * 4));
            const connectedIndices = new Set();
            
            for (let i = 0; i < connectionCount; i++) {
                let targetIndex;
                do {
                    targetIndex = Math.floor(Math.random() * nextLayerNodeCount);
                } while (connectedIndices.has(targetIndex));
                
                connectedIndices.add(targetIndex);
                
                const connection = {
                    fromLayer: node.layerIndex,
                    fromNode: node.nodeIndex,
                    toLayer: nextLayerIndex,
                    toNode: targetIndex,
                    weight: (Math.random() - 0.5) * 2, // Random weight between -1 and 1
                    activity: 0
                };
                
                node.connections.push(connection);
                this.connections.push(connection);
            }
        });
    }
    
    createConnectionLines() {
        const lineGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        this.connections.forEach(connection => {
            const fromNode = this.nodes.find(n => n.layerIndex === connection.fromLayer && n.nodeIndex === connection.fromNode);
            const toNode = this.nodes.find(n => n.layerIndex === connection.toLayer && n.nodeIndex === connection.toNode);
            
            if (fromNode && toNode) {
                positions.push(
                    fromNode.mesh.position.x, fromNode.mesh.position.y, fromNode.mesh.position.z,
                    toNode.mesh.position.x, toNode.mesh.position.y, toNode.mesh.position.z
                );
                
                // Color based on connection weight
                const weight = Math.abs(connection.weight);
                const color = connection.weight > 0 ? 
                    new THREE.Color(0, weight, 1 - weight) : 
                    new THREE.Color(weight, 0, 1 - weight);
                
                colors.push(color.r, color.g, color.b);
                colors.push(color.r, color.g, color.b);
            }
        });
        
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        this.connectionLines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(this.connectionLines);
    }
    
    simulateNeuralActivity(audioData) {
        const { frequencyData, bufferLength } = audioData;
        
        // Use frequency data as input to first layer
        const inputLayer = this.nodes.filter(n => n.layerIndex === 0);
        inputLayer.forEach((node, index) => {
            const freqIndex = Math.floor((index / inputLayer.length) * bufferLength);
            node.activation = (frequencyData[freqIndex] || 0) / 255;
        });
        
        // Propagate activation through network layers
        for (let layerIndex = 1; layerIndex < 5; layerIndex++) {
            const currentLayer = this.nodes.filter(n => n.layerIndex === layerIndex);
            
            currentLayer.forEach(node => {
                let totalInput = 0;
                let connectionCount = 0;
                
                // Sum inputs from previous layer
                this.connections.forEach(connection => {
                    if (connection.toLayer === layerIndex && connection.toNode === node.nodeIndex) {
                        const fromNode = this.nodes.find(n => 
                            n.layerIndex === connection.fromLayer && n.nodeIndex === connection.fromNode
                        );
                        if (fromNode) {
                            totalInput += fromNode.activation * connection.weight;
                            connectionCount++;
                            connection.activity = fromNode.activation * Math.abs(connection.weight);
                        }
                    }
                });
                
                // Apply activation function (sigmoid-like)
                if (connectionCount > 0) {
                    const avgInput = totalInput / connectionCount;
                    node.activation = 1 / (1 + Math.exp(-avgInput * 4)); // Sigmoid activation
                }
            });
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
        
        // Simulate neural network activity
        this.simulateNeuralActivity(audioData);
        
        // Update node visualizations
        this.nodes.forEach((node, index) => {
            // Update shader uniforms
            node.mesh.material.uniforms.time.value = time;
            node.mesh.material.uniforms.activation.value = node.activation;
            node.mesh.material.uniforms.energy.value = totalEnergy;
            
            // Color based on layer and activation
            const layerHue = node.layerIndex / 5;
            const activationIntensity = node.activation;
            node.mesh.material.uniforms.nodeColor.value.set(
                0.3 + layerHue * 0.7,
                0.5 + activationIntensity * 0.5,
                1.0 - layerHue * 0.3
            );
            
            // Position oscillation based on activation
            const oscillation = Math.sin(time * 3 + node.pulsePhase) * node.activation * 2;
            node.mesh.position.y = node.originalPosition.y + oscillation;
            
            // Scale based on activation
            const scale = 1 + node.activation * 1.5;
            node.mesh.scale.setScalar(scale);
        });
        
        // Update connection lines
        if (this.connectionLines) {
            const colors = this.connectionLines.geometry.attributes.color.array;
            let colorIndex = 0;
            
            this.connections.forEach(connection => {
                const activity = connection.activity || 0;
                const intensity = activity * 2;
                
                // Update line colors based on activity
                const baseColor = connection.weight > 0 ? 
                    new THREE.Color(0, intensity, 1 - intensity * 0.5) : 
                    new THREE.Color(intensity, 0, 1 - intensity * 0.5);
                
                colors[colorIndex] = colors[colorIndex + 3] = baseColor.r;
                colors[colorIndex + 1] = colors[colorIndex + 4] = baseColor.g;
                colors[colorIndex + 2] = colors[colorIndex + 5] = baseColor.b;
                
                colorIndex += 6;
            });
            
            this.connectionLines.geometry.attributes.color.needsUpdate = true;
            this.connectionLines.material.opacity = 0.2 + totalEnergy * 0.5;
        }
        
        // Camera movement
        const cameraAngle = time * 0.1;
        const cameraRadius = 45 + Math.sin(time * 0.3) * 10 + totalEnergy * 15;
        this.camera.position.x = Math.sin(cameraAngle) * cameraRadius;
        this.camera.position.z = Math.cos(cameraAngle) * cameraRadius;
        this.camera.position.y = Math.sin(time * 0.2) * 15 + midEnergy * 10;
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
        
        this.nodes.forEach(node => {
            node.mesh.geometry.dispose();
            node.mesh.material.dispose();
        });
        
        if (this.connectionLines) {
            this.connectionLines.geometry.dispose();
            this.connectionLines.material.dispose();
        }
    }
}

// Register this visualization
document.addEventListener('DOMContentLoaded', () => {
    if (window.audioVisualizer) {
        window.audioVisualizer.registerVisualization('neuralNetwork3d', NeuralNetwork3DVisualization);
    }
});
