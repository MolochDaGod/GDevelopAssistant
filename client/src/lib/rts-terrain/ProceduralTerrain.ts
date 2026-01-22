import * as THREE from 'three';

export type TerrainType = 'grass' | 'dirt' | 'water' | 'sand' | 'rock' | 'snow';

export interface TerrainConfig {
  width: number;
  height: number;
  resolution: number;
  heightScale: number;
  noiseScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  waterLevel: number;
  sandLevel: number;
  grassLevel: number;
  rockLevel: number;
  snowLevel: number;
  seed: number;
}

export const TerrainPresets = {
  plains: (): Partial<TerrainConfig> => ({
    width: 100,
    height: 100,
    resolution: 128,
    heightScale: 5,
    noiseScale: 0.02,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    waterLevel: 0.2,
    sandLevel: 0.25,
    grassLevel: 0.7,
    rockLevel: 0.85,
    snowLevel: 0.95
  }),
  
  mountains: (): Partial<TerrainConfig> => ({
    width: 100,
    height: 100,
    resolution: 128,
    heightScale: 30,
    noiseScale: 0.015,
    octaves: 6,
    persistence: 0.55,
    lacunarity: 2.2,
    waterLevel: 0.15,
    sandLevel: 0.2,
    grassLevel: 0.5,
    rockLevel: 0.7,
    snowLevel: 0.85
  }),
  
  islands: (): Partial<TerrainConfig> => ({
    width: 100,
    height: 100,
    resolution: 128,
    heightScale: 15,
    noiseScale: 0.025,
    octaves: 5,
    persistence: 0.5,
    lacunarity: 2,
    waterLevel: 0.4,
    sandLevel: 0.45,
    grassLevel: 0.75,
    rockLevel: 0.9,
    snowLevel: 1.0
  }),
  
  desert: (): Partial<TerrainConfig> => ({
    width: 100,
    height: 100,
    resolution: 128,
    heightScale: 8,
    noiseScale: 0.03,
    octaves: 3,
    persistence: 0.4,
    lacunarity: 2,
    waterLevel: 0.05,
    sandLevel: 0.8,
    grassLevel: 0.85,
    rockLevel: 0.95,
    snowLevel: 1.0
  }),
  
  arena: (): Partial<TerrainConfig> => ({
    width: 60,
    height: 60,
    resolution: 64,
    heightScale: 2,
    noiseScale: 0.05,
    octaves: 2,
    persistence: 0.3,
    lacunarity: 2,
    waterLevel: 0,
    sandLevel: 0.3,
    grassLevel: 0.9,
    rockLevel: 0.95,
    snowLevel: 1.0
  })
};

class PerlinNoise {
  private permutation: number[] = [];
  
  constructor(seed: number = Math.random() * 10000) {
    this.initPermutation(seed);
  }
  
  private initPermutation(seed: number): void {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    let random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    this.permutation = [...p, ...p];
  }
  
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    
    return this.lerp(
      this.lerp(
        this.grad(this.permutation[A], x, y),
        this.grad(this.permutation[B], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[A + 1], x, y - 1),
        this.grad(this.permutation[B + 1], x - 1, y - 1),
        u
      ),
      v
    );
  }
  
  fractalNoise(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return (total / maxValue + 1) / 2;
  }
}

export class ProceduralTerrain {
  private config: TerrainConfig;
  private mesh: THREE.Mesh;
  private heightMap: Float32Array;
  private terrainTypes: TerrainType[][];
  private noise: PerlinNoise;

  constructor(config: Partial<TerrainConfig> = {}) {
    const defaultConfig: TerrainConfig = {
      width: 100,
      height: 100,
      resolution: 128,
      heightScale: 10,
      noiseScale: 0.02,
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
      waterLevel: 0.2,
      sandLevel: 0.25,
      grassLevel: 0.7,
      rockLevel: 0.85,
      snowLevel: 0.95,
      seed: Math.random() * 10000
    };
    
    this.config = { ...defaultConfig, ...config };
    this.noise = new PerlinNoise(this.config.seed);
    this.heightMap = new Float32Array(this.config.resolution * this.config.resolution);
    this.terrainTypes = [];
    
    this.mesh = this.generateTerrain();
  }

  private generateTerrain(): THREE.Mesh {
    const { width, height, resolution } = this.config;
    
    const geometry = new THREE.PlaneGeometry(
      width,
      height,
      resolution - 1,
      resolution - 1
    );
    
    geometry.rotateX(-Math.PI / 2);
    
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    
    for (let z = 0; z < resolution; z++) {
      this.terrainTypes[z] = [];
      
      for (let x = 0; x < resolution; x++) {
        const index = z * resolution + x;
        const vertexIndex = index * 3;
        
        const worldX = (x / (resolution - 1)) * width - width / 2;
        const worldZ = (z / (resolution - 1)) * height - height / 2;
        
        const noiseValue = this.noise.fractalNoise(
          x * this.config.noiseScale,
          z * this.config.noiseScale,
          this.config.octaves,
          this.config.persistence,
          this.config.lacunarity
        );
        
        const heightValue = noiseValue * this.config.heightScale;
        this.heightMap[index] = heightValue;
        
        positions.setY(index, heightValue);
        
        const terrainType = this.getTerrainType(noiseValue);
        this.terrainTypes[z][x] = terrainType;
        
        const color = this.getTerrainColor(terrainType, noiseValue);
        colors[vertexIndex] = color.r;
        colors[vertexIndex + 1] = color.g;
        colors[vertexIndex + 2] = color.b;
      }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    
    return mesh;
  }

  private getTerrainType(height: number): TerrainType {
    if (height < this.config.waterLevel) return 'water';
    if (height < this.config.sandLevel) return 'sand';
    if (height < this.config.grassLevel) return 'grass';
    if (height < this.config.rockLevel) return 'rock';
    if (height < this.config.snowLevel) return 'snow';
    return 'snow';
  }

  private getTerrainColor(type: TerrainType, height: number): THREE.Color {
    const variation = (Math.random() - 0.5) * 0.05;
    
    switch (type) {
      case 'water':
        return new THREE.Color(0.1 + variation, 0.3 + variation, 0.6 + height * 0.2);
      case 'sand':
        return new THREE.Color(0.76 + variation, 0.7 + variation, 0.5 + variation);
      case 'grass':
        const grassShade = 0.3 + height * 0.2;
        return new THREE.Color(0.2 + variation, grassShade + variation, 0.1 + variation);
      case 'dirt':
        return new THREE.Color(0.4 + variation, 0.3 + variation, 0.2 + variation);
      case 'rock':
        const rockShade = 0.4 + variation;
        return new THREE.Color(rockShade, rockShade * 0.95, rockShade * 0.9);
      case 'snow':
        return new THREE.Color(0.95 + variation, 0.95 + variation, 0.98 + variation);
      default:
        return new THREE.Color(0.5, 0.5, 0.5);
    }
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getHeightAt(x: number, z: number): number {
    const { width, height, resolution } = this.config;
    
    const gridX = Math.floor(((x + width / 2) / width) * (resolution - 1));
    const gridZ = Math.floor(((z + height / 2) / height) * (resolution - 1));
    
    if (gridX < 0 || gridX >= resolution || gridZ < 0 || gridZ >= resolution) {
      return 0;
    }
    
    const index = gridZ * resolution + gridX;
    return this.heightMap[index];
  }

  getTerrainTypeAt(x: number, z: number): TerrainType {
    const { width, height, resolution } = this.config;
    
    const gridX = Math.floor(((x + width / 2) / width) * (resolution - 1));
    const gridZ = Math.floor(((z + height / 2) / height) * (resolution - 1));
    
    if (gridX < 0 || gridX >= resolution || gridZ < 0 || gridZ >= resolution) {
      return 'grass';
    }
    
    return this.terrainTypes[gridZ]?.[gridX] ?? 'grass';
  }

  isWalkable(x: number, z: number): boolean {
    const terrainType = this.getTerrainTypeAt(x, z);
    return terrainType !== 'water';
  }

  getRandomWalkablePosition(): THREE.Vector3 {
    const { width, height } = this.config;
    let attempts = 0;
    
    while (attempts < 100) {
      const x = (Math.random() - 0.5) * width * 0.9;
      const z = (Math.random() - 0.5) * height * 0.9;
      
      if (this.isWalkable(x, z)) {
        const y = this.getHeightAt(x, z);
        return new THREE.Vector3(x, y, z);
      }
      
      attempts++;
    }
    
    return new THREE.Vector3(0, this.getHeightAt(0, 0), 0);
  }

  regenerate(newConfig?: Partial<TerrainConfig>): void {
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.noise = new PerlinNoise(this.config.seed);
    }
    
    const parent = this.mesh.parent;
    if (parent) {
      parent.remove(this.mesh);
    }
    
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
    
    this.mesh = this.generateTerrain();
    
    if (parent) {
      parent.add(this.mesh);
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }

  getConfig(): TerrainConfig {
    return { ...this.config };
  }

  getWidth(): number {
    return this.config.width;
  }

  getHeight(): number {
    return this.config.height;
  }

  getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    return {
      minX: -this.config.width / 2,
      maxX: this.config.width / 2,
      minZ: -this.config.height / 2,
      maxZ: this.config.height / 2
    };
  }
}

export function createWaterPlane(width: number, height: number, waterLevel: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width * 1.2, height * 1.2);
  geometry.rotateX(-Math.PI / 2);
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a5276,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.3
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = waterLevel * 0.3;
  mesh.receiveShadow = true;
  
  return mesh;
}
