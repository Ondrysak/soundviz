(function(){
  class ThreeJSVisualization {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) throw new Error('ThreeJSVisualization: container not found');
      this.options = Object.assign({
        fov: 60,
        near: 0.1,
        far: 1000,
        clearColor: 0x000000,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        preserveDrawingBuffer: false
      }, options);

      this.clockStart = performance.now();
      this.running = false;
      this.onAnimationFrame = this.onAnimationFrame.bind(this);
      this.resizeObserver = null;

      this.audioContext = null;
      this.analyser = null;
      this.fftSize = 2048;
      this.frequencyData = null;
      this.sampleRate = 44100; // default until AudioContext available

      this._initThree();
      this._attachResize();

      if (this.initialize === ThreeJSVisualization.prototype.initialize) {
        throw new Error('ThreeJSVisualization: initialize() not implemented');
      }
      if (this.update === ThreeJSVisualization.prototype.update) {
        throw new Error('ThreeJSVisualization: update() not implemented');
      }

      this.initialize();
    }

    _initThree() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || window.innerHeight;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(this.options.fov, width / height, this.options.near, this.options.far);
      this.camera.position.set(0, 0, 6);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: this.options.preserveDrawingBuffer });
      this.renderer.setPixelRatio(this.options.pixelRatio);
      this.renderer.setSize(width, height);
      this.renderer.setClearColor(this.options.clearColor);
      this.container.appendChild(this.renderer.domElement);
    }

    _attachResize() {
      const onResize = () => {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (typeof this.onResize === 'function') this.onResize(w, h);
      };
      window.addEventListener('resize', onResize);
      this._resizeHandler = onResize;
    }

    setAnalyser(audioContext, analyser, fftSize = 2048) {
      this.audioContext = audioContext;
      this.analyser = analyser;
      if (fftSize) this.analyser.fftSize = fftSize;
      this.fftSize = this.analyser.fftSize;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.sampleRate = this.audioContext.sampleRate || this.sampleRate;
    }

    getTimeSeconds() {
      return (performance.now() - this.clockStart) / 1000;
    }

    _gatherAudioData() {
      if (!this.analyser || !this.frequencyData) {
        return { time: this.getTimeSeconds(), hasAudio: false };
      }
      this.analyser.getByteFrequencyData(this.frequencyData);
      const bands = this._computeBands(this.frequencyData, this.fftSize, this.sampleRate);
      return Object.assign({
        time: this.getTimeSeconds(),
        hasAudio: true,
        frequencyData: this.frequencyData,
        bufferLength: this.frequencyData.length
      }, bands);
    }

    _computeBands(freqData, fftSize, sampleRate) {
      // Frequency per bin
      const binCount = freqData.length; // fftSize/2
      const nyquist = sampleRate / 2;
      const hzPerBin = nyquist / binCount;

      const ranges = {
        bass: [20, 250],
        mid: [250, 2000],
        treble: [2000, 16000]
      };

      const accum = { bass: 0, mid: 0, treble: 0, total: 0 };
      const counts = { bass: 0, mid: 0, treble: 0 };

      for (let i = 0; i < binCount; i++) {
        const hz = i * hzPerBin;
        const v = freqData[i] / 255; // normalize 0..1
        accum.total += v;
        if (hz >= ranges.bass[0] && hz < ranges.bass[1]) { accum.bass += v; counts.bass++; }
        else if (hz >= ranges.mid[0] && hz < ranges.mid[1]) { accum.mid += v; counts.mid++; }
        else if (hz >= ranges.treble[0] && hz < ranges.treble[1]) { accum.treble += v; counts.treble++; }
      }

      const normalize = (sum, count) => (count > 0 ? sum / count : 0);
      const bass = normalize(accum.bass, counts.bass);
      const mid = normalize(accum.mid, counts.mid);
      const treble = normalize(accum.treble, counts.treble);
      const total = accum.total / binCount;
      return { bass, mid, treble, total };
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.clockStart = performance.now();
      this.onAnimationFrame();
    }

    stop() {
      this.running = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
    }

    onAnimationFrame() {
      if (!this.running) return;
      const audioData = this._gatherAudioData();
      this.update(audioData);
      this.renderer.render(this.scene, this.camera);
      this._rafId = requestAnimationFrame(this.onAnimationFrame);
    }

    // Optional override by subclasses
    onResize() {}

    // Dispose helpers
    dispose() {
      this.stop();
      window.removeEventListener('resize', this._resizeHandler);
      if (this.scene) {
        this.scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => this._disposeMaterial(m));
            else this._disposeMaterial(obj.material);
          }
          if (obj.texture) obj.texture.dispose?.();
        });
      }
      this.renderer?.dispose?.();
      if (this.renderer?.domElement && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    _disposeMaterial(mat) {
      if (!mat) return;
      for (const key in mat) {
        const val = mat[key];
        if (val && typeof val === 'object' && typeof val.dispose === 'function') {
          try { val.dispose(); } catch(e){}
        }
      }
      mat.dispose?.();
    }

    // Abstract methods
    initialize() { throw new Error('initialize() must be implemented by subclass'); }
    update(_audioData) { throw new Error('update(audioData) must be implemented by subclass'); }
  }

  window.ThreeJSVisualization = ThreeJSVisualization;
})();

