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
        
        this.setupEventListeners();
        this.resizeCanvas();
        
        // Resize canvas when window resizes
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.visualMode.addEventListener('change', () => {
            if (this.animationId) {
                this.draw(); // Redraw with new mode
            }
        });
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = Math.min(400, window.innerHeight * 0.4);
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
    
    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        
        if (!this.analyser) return;
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const mode = this.visualMode.value;
        
        switch (mode) {
            case 'frequency':
                this.drawFrequencyBars();
                break;
            case 'waveform':
                this.drawWaveform();
                break;
            case 'circular':
                this.drawCircularSpectrum();
                break;
            case 'combined':
                this.drawCombined();
                break;
        }
    }
    
    drawFrequencyBars() {
        const barWidth = this.canvas.width / this.bufferLength * 2.5;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;

            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, this.canvas.height - barHeight);
            gradient.addColorStop(0, `hsl(${i * 2}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${i * 2 + 60}, 100%, 70%)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    drawWaveform() {
        // Get time domain data for waveform
        const timeDataArray = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(timeDataArray);

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width / timeDataArray.length;
        let x = 0;

        for (let i = 0; i < timeDataArray.length; i++) {
            const v = timeDataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.stroke();

        // Add center line
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }

    drawCircularSpectrum() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;

        const angleStep = (Math.PI * 2) / this.bufferLength;

        for (let i = 0; i < this.bufferLength; i++) {
            const angle = i * angleStep;
            const barHeight = (this.dataArray[i] / 255) * radius * 0.5;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            this.ctx.strokeStyle = `hsl(${i * 2}, 100%, 60%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        // Draw center circle
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawCombined() {
        // Draw frequency bars in the bottom half
        this.ctx.save();
        this.ctx.translate(0, this.canvas.height / 2);
        this.ctx.scale(1, 0.5);
        this.drawFrequencyBars();
        this.ctx.restore();

        // Draw waveform in the top half
        this.ctx.save();
        this.ctx.translate(0, 0);
        this.ctx.scale(1, 0.5);
        this.drawWaveform();
        this.ctx.restore();

        // Draw separator line
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});
