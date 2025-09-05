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
        
        // Animation state for visualizations
        this.time = 0;
        
        // Registry for visualization modules
        this.visualizations = new Map();
        this.currentVisualization = null;
        
        this.setupEventListeners();
        this.resizeCanvas();
        
        // Resize canvas when window resizes
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.visualMode.addEventListener('change', () => {
            this.switchVisualization();
        });
    }
    
    resizeCanvas() {
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = Math.min(400, window.innerHeight * 0.4);
        
        // Notify current visualization of resize
        if (this.currentVisualization && this.currentVisualization.onResize) {
            this.currentVisualization.onResize(this.canvas.width, this.canvas.height);
        }
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
            
            // Initialize current visualization
            this.switchVisualization();
            
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
        
        if (this.currentVisualization && this.currentVisualization.cleanup) {
            this.currentVisualization.cleanup();
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
    
    registerVisualization(name, visualizationClass) {
        this.visualizations.set(name, visualizationClass);
    }
    
    switchVisualization() {
        const selectedMode = this.visualMode.value;
        
        // Cleanup current visualization
        if (this.currentVisualization && this.currentVisualization.cleanup) {
            this.currentVisualization.cleanup();
        }
        
        // Create new visualization instance
        const VisualizationClass = this.visualizations.get(selectedMode);
        if (VisualizationClass) {
            this.currentVisualization = new VisualizationClass(this.ctx, this.canvas.width, this.canvas.height);
        } else {
            console.warn(`Visualization '${selectedMode}' not found`);
            this.currentVisualization = null;
        }
    }
    
    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        
        if (!this.analyser || !this.currentVisualization) return;
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Get time domain data for waveform visualizations
        const timeDataArray = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(timeDataArray);
        
        // Prepare audio data object
        const audioData = {
            frequencyData: this.dataArray,
            timeData: timeDataArray,
            bufferLength: this.bufferLength,
            time: this.time,
            canvas: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw current visualization
        if (this.currentVisualization.draw) {
            this.currentVisualization.draw(audioData);
        }
        
        this.time += 0.02; // Increment time for animations
    }
    
    // Utility methods for visualizations
    static calculateAudioMetrics(frequencyData, bufferLength) {
        let totalEnergy = 0;
        let bassEnergy = 0;
        let midEnergy = 0;
        let trebleEnergy = 0;
        
        const bassRange = Math.floor(bufferLength * 0.15);
        const midRange = Math.floor(bufferLength * 0.6);
        
        for (let i = 0; i < bufferLength; i++) {
            const value = frequencyData[i] / 255;
            totalEnergy += value;
            
            if (i < bassRange) bassEnergy += value;
            else if (i < midRange) midEnergy += value;
            else trebleEnergy += value;
        }
        
        return {
            total: totalEnergy / bufferLength,
            bass: bassEnergy / bassRange,
            mid: midEnergy / (midRange - bassRange),
            treble: trebleEnergy / (bufferLength - midRange)
        };
    }
    
    static hslToRgb(h, s, l) {
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
    window.audioVisualizer = new AudioVisualizer();
});
