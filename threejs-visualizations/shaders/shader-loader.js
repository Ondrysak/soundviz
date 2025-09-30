// Shader loader utility
// Loads GLSL shader files and caches them
class ShaderLoader {
  constructor() {
    this.cache = new Map();
  }

  async load(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load shader: ${path}`);
      }
      const source = await response.text();
      this.cache.set(path, source);
      return source;
    } catch (error) {
      console.error(`Error loading shader ${path}:`, error);
      throw error;
    }
  }

  async loadPair(vertPath, fragPath) {
    const [vertexShader, fragmentShader] = await Promise.all([
      this.load(vertPath),
      this.load(fragPath)
    ]);
    return { vertexShader, fragmentShader };
  }
}

// Global shader loader instance
window.shaderLoader = new ShaderLoader();

