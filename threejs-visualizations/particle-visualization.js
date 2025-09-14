(function(){
  function lerp(a,b,t){ return a + (b-a)*t; }

  class ParticleVisualization extends ThreeJSVisualization {
    initialize(){
      this.params = {
        count: 3000,
        maxCount: 10000,
        pattern: 'sphere', // sphere | cube | cloud
        size: 0.05,
        amplitude: 1.0,
        orbitSpeed: 0.2,
        attraction: 0.0,
        avoidance: 0.5,
        sensitivity: { bass: 1.5, mid: 1.0, treble: 1.2 }
      };
      this.group = new THREE.Group();
      this.scene.add(this.group);

      this._rebuild(this.params.count);
    }

    _rebuild(count){
      // cleanup
      if (this.inst) { this.group.remove(this.inst); this.inst.geometry.dispose(); this.inst.material.dispose(); }
      this.count = Math.min(count, this.params.maxCount);
      const geo = new THREE.SphereGeometry(this.params.size, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
      this.inst = new THREE.InstancedMesh(geo, mat, this.count);
      this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(this.inst);

      // lights
      if (!this.lit){
        const amb = new THREE.AmbientLight(0x404040, 0.6);
        const p = new THREE.PointLight(0xffffff, 1, 0, 2);
        p.position.set(4,6,8);
        this.scene.add(amb,p); this.lit=true;
      }

      this.base = [];
      const rand = () => (Math.random()*2-1);
      for (let i=0;i<this.count;i++){
        let pos;
        if (this.params.pattern === 'sphere'){
          // random point on sphere radius 2
          const u = Math.random();
          const v = Math.random();
          const theta = 2*Math.PI*u; const phi = Math.acos(2*v-1);
          const r = 2.0;
          pos = new THREE.Vector3(
            r*Math.sin(phi)*Math.cos(theta),
            r*Math.sin(phi)*Math.sin(theta),
            r*Math.cos(phi)
          );
        } else if (this.params.pattern === 'cube'){
          pos = new THREE.Vector3(rand()*2, rand()*2, rand()*2);
        } else {
          pos = new THREE.Vector3(rand()*3, rand()*2, rand()*3);
        }
        this.base.push({ pos, offset: Math.random()*100 });
      }
      this._mat4 = new THREE.Matrix4();
    }

    _maybeRepattern(midLevel){
      // Adjust particle count with mid frequencies
      const target = Math.round(1000 + midLevel * 9000);
      if (Math.abs(target - this.count) > 300) this._rebuild(target);
    }

    update(audio){
      const t = audio.time || 0;
      const bass = (audio.bass || 0) * this.params.sensitivity.bass;
      const mid = (audio.mid || 0) * this.params.sensitivity.mid;
      const treble = (audio.treble || 0) * this.params.sensitivity.treble;

      this._maybeRepattern(mid);

      // Amplitude influenced by bass
      const amp = 0.2 + bass * 1.2 * this.params.amplitude;
      const orbit = this.params.orbitSpeed * (0.5 + mid);

      // Color influenced by treble
      const hue = (t*0.05*(1+mid) + treble*0.2) % 1.0;
      this.inst.material.color.setHSL(hue, 0.8, 0.6);
      this.inst.material.opacity = THREE.MathUtils.clamp(0.6 + treble*0.4, 0.4, 1.0);
      this.inst.material.transparent = true;

      // Update instanced matrices
      const m = this._mat4;
      for (let i=0;i<this.count;i++){
        const b = this.base[i];
        // orbital motion around Y
        const angle = t*orbit + b.offset*0.01;
        const radius = b.pos.length();
        const x = Math.cos(angle)*b.pos.x - Math.sin(angle)*b.pos.z;
        const z = Math.sin(angle)*b.pos.x + Math.cos(angle)*b.pos.z;
        const y = b.pos.y;

        // audio wobble and avoidance
        const wobble = Math.sin(t*2 + i*0.013) * amp;
        const avoid = (this.params.avoidance * 0.2) / (0.2 + radius);

        const px = x * (1+avoid) + wobble;
        const py = y * (1+avoid) + wobble*0.5;
        const pz = z * (1+avoid) + wobble;

        const s = 1.0 + bass*0.8 + Math.sin(t*3 + i*0.021)*0.1*treble;
        m.makeScale(s,s,s).setPosition(px, py, pz);
        this.inst.setMatrixAt(i, m);
      }
      this.inst.instanceMatrix.needsUpdate = true;

      // gentle camera motion
      this.camera.position.x = Math.cos(t*0.2)*6;
      this.camera.position.y = Math.sin(t*0.15)*2;
      this.camera.lookAt(0,0,0);
    }

    dispose(){
      super.dispose();
      this.inst?.geometry?.dispose?.();
      this.inst?.material?.dispose?.();
    }

    getStats(){
      return { particles: this.count };
    }
  }
  window.ParticleVisualization = ParticleVisualization;
})();

