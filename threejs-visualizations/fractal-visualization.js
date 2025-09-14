(function(){
  class FractalVisualization extends ThreeJSVisualization {
    initialize() {
      this.params = {
        maxDepth: 6,
        hueSpeed: 0.1,
        rotationSpeed: 0.6,
        scalePulse: 0.1,
        sensitivity: { bass: 1.5, mid: 1.0, treble: 1.2 }
      };
      this.group = new THREE.Group();
      this.scene.add(this.group);

      // Lights
      const ambient = new THREE.AmbientLight(0x404040, 0.6);
      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(10, 10, 8);
      this.scene.add(ambient, dir);

      this.currentDepth = 3;
      this._hue = 0.0;

      // Geometry/Material for instancing
      this.geo = new THREE.TetrahedronGeometry(0.3);
      this.mat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });

      this._buildFractal(this.currentDepth);
    }

    _buildFractal(depth) {
      if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); }
      const count = Math.pow(4, depth);
      // safety cap for performance
      this.instanceCount = Math.min(count, 8192);
      this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.instanceCount);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(this.mesh);

      this._positions = [];
      const baseVerts = [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-0.866, -0.5, 0.5),
        new THREE.Vector3(0.866, -0.5, 0.5),
        new THREE.Vector3(0, -0.5, -1)
      ];
      let idx = 0;

      const recurse = (verts, d, size) => {
        if (idx >= this.instanceCount) return;
        if (d === 0) {
          const center = new THREE.Vector3();
          for (let v of verts) center.add(v);
          center.multiplyScalar(0.25);
          this._positions.push({ pos: center.clone(), size });
          idx++;
          return;
        }
        // midpoints
        const m = [];
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            m.push(new THREE.Vector3().addVectors(verts[i], verts[j]).multiplyScalar(0.5));
          }
        }
        const next = [
          [verts[0], m[0], m[1], m[2]],
          [verts[1], m[0], m[3], m[4]],
          [verts[2], m[1], m[3], m[5]],
          [verts[3], m[2], m[4], m[5]]
        ];
        for (const nv of next) recurse(nv, d - 1, size * 0.5);
      };

      recurse(baseVerts, depth, 1.0);

      // Initialize matrices
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < this._positions.length; i++) {
        const p = this._positions[i];
        m4.makeScale(p.size, p.size, p.size).setPosition(p.pos);
        this.mesh.setMatrixAt(i, m4);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }

    update(audio) {
      const t = audio.time || 0;
      const bass = (audio.bass || 0) * this.params.sensitivity.bass;
      const mid = (audio.mid || 0) * this.params.sensitivity.mid;
      const treble = (audio.treble || 0) * this.params.sensitivity.treble;

      // Depth reacts to bass 1..8
      const targetDepth = Math.max(1, Math.min(8, Math.round(1 + bass * 7)));
      if (targetDepth !== this.currentDepth) {
        this.currentDepth = Math.min(targetDepth, this.params.maxDepth);
        this._buildFractal(this.currentDepth);
      }

      // Group rotation and global pulse
      const rotSpeed = 0.1 + mid * this.params.rotationSpeed;
      this.group.rotation.x += rotSpeed * 0.5 * 0.016;
      this.group.rotation.y += rotSpeed * 0.8 * 0.016;

      const pulse = 1 + Math.sin(t * (1.5 + mid * 2.0)) * (this.params.scalePulse * (0.5 + bass));

      // Update per-instance transform with slight wobble
      const tmp = new THREE.Matrix4();
      for (let i = 0; i < this._positions.length; i++) {
        const p = this._positions[i];
        const wobble = 1 + Math.sin(t * 2 + i * 0.13) * 0.03 * (0.5 + treble);
        const s = p.size * pulse * wobble;
        tmp.makeScale(s, s, s).setPosition(p.pos);
        this.mesh.setMatrixAt(i, tmp);
      }
      this.mesh.instanceMatrix.needsUpdate = true;

      // Color cycling from treble
      this._hue = (this._hue + (this.params.hueSpeed * (0.5 + treble)) * 0.016) % 1.0;
      this.mat.color.setHSL(this._hue, 0.8, 0.6);
    }

    onResize() {
      // no-op specific handling needed; base adjusts camera & renderer
    }

    dispose() {
      super.dispose();
      this.geo?.dispose?.();
      this.mat?.dispose?.();
    }
  }
  window.FractalVisualization = FractalVisualization;
})();

