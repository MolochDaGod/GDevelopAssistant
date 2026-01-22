// Three.js Material Reference Data for AI Assistant
// Source: https://threejs.org/manual/#en/material-table

export const THREEJS_MATERIALS_REFERENCE = {
  overview: `Three.js provides several mesh materials for 3D rendering. Each material type has different features and performance characteristics.`,
  
  materials: {
    MeshBasicMaterial: {
      description: "A material for drawing geometries in a simple shaded (flat or wireframe) way. Not affected by lights.",
      useCase: "Use for simple, unlit objects like backgrounds, wireframes, or performance-critical scenes",
      performance: "Fastest - no lighting calculations",
      docUrl: "https://threejs.org/docs/#api/materials/MeshBasicMaterial"
    },
    MeshLambertMaterial: {
      description: "A material for non-shiny surfaces, using Lambertian reflectance model. Calculates lighting per-vertex.",
      useCase: "Use for matte surfaces like wood, stone, or fabric",
      performance: "Fast - simple per-vertex lighting",
      docUrl: "https://threejs.org/docs/#api/materials/MeshLambertMaterial"
    },
    MeshPhongMaterial: {
      description: "A material for shiny surfaces with specular highlights. Uses Blinn-Phong shading model.",
      useCase: "Use for shiny surfaces like plastic, metal, or polished surfaces",
      performance: "Medium - per-fragment lighting with specular",
      docUrl: "https://threejs.org/docs/#api/materials/MeshPhongMaterial"
    },
    MeshStandardMaterial: {
      description: "A physically based material using Metallic-Roughness workflow. Standard for realistic rendering.",
      useCase: "Use for realistic materials - the go-to choice for most 3D scenes",
      performance: "Slower - full PBR calculations",
      docUrl: "https://threejs.org/docs/#api/materials/MeshStandardMaterial"
    },
    MeshPhysicalMaterial: {
      description: "Extension of MeshStandardMaterial with advanced physically-based features like clearcoat, transmission, and more.",
      useCase: "Use for complex materials like car paint, glass, gems, or materials with subsurface scattering",
      performance: "Slowest - most advanced PBR features",
      docUrl: "https://threejs.org/docs/#api/materials/MeshPhysicalMaterial"
    }
  },
  
  featureTable: {
    // Common features supported by all materials
    universal: [
      { name: "alphaMap", description: "Grayscale texture controlling transparency" },
      { name: "aoMap", description: "Ambient occlusion map for soft shadows" },
      { name: "aoMapIntensity", description: "Intensity of the ambient occlusion effect" },
      { name: "color", description: "Base color of the material" },
      { name: "envMap", description: "Environment map for reflections" },
      { name: "envMapRotation", description: "Rotation of the environment map" },
      { name: "fog", description: "Whether the material is affected by fog" },
      { name: "lightMap", description: "Pre-baked lighting texture" },
      { name: "lightMapIntensity", description: "Intensity of the light map" },
      { name: "map", description: "Color/diffuse texture" }
    ],
    
    // Features for lit materials (Lambert, Phong, Standard, Physical)
    litMaterials: [
      { name: "bumpMap", description: "Texture for simulating bumps without geometry" },
      { name: "bumpScale", description: "Intensity of the bump effect" },
      { name: "displacementMap", description: "Texture that actually displaces vertices" },
      { name: "displacementScale", description: "How much the displacement affects vertices" },
      { name: "displacementBias", description: "Offset for displacement" },
      { name: "emissive", description: "Color the material emits (glows)" },
      { name: "emissiveIntensity", description: "Brightness of emission" },
      { name: "emissiveMap", description: "Texture for emission" },
      { name: "flatShading", description: "Whether to use flat shading vs smooth" },
      { name: "normalMap", description: "Texture for detailed surface normals" },
      { name: "normalScale", description: "Intensity of normal map effect" }
    ],
    
    // PBR-specific features (Standard and Physical only)
    pbrMaterials: [
      { name: "metalness", description: "How metallic the surface appears (0-1)" },
      { name: "metalnessMap", description: "Texture controlling metalness" },
      { name: "roughness", description: "How rough/smooth the surface is (0-1)" },
      { name: "roughnessMap", description: "Texture controlling roughness" },
      { name: "envMapIntensity", description: "Strength of environment reflections" }
    ],
    
    // Physical material exclusive features
    physicalOnly: [
      { name: "clearcoat", description: "Clear lacquer layer intensity (0-1)" },
      { name: "clearcoatMap", description: "Texture for clearcoat intensity" },
      { name: "clearcoatRoughness", description: "Roughness of the clearcoat layer" },
      { name: "clearcoatRoughnessMap", description: "Texture for clearcoat roughness" },
      { name: "clearcoatNormalMap", description: "Normal map for clearcoat layer" },
      { name: "ior", description: "Index of refraction (1.0-2.333)" },
      { name: "transmission", description: "Degree of transmission/transparency for glass" },
      { name: "transmissionMap", description: "Texture controlling transmission" },
      { name: "thickness", description: "Thickness of the transparent volume" },
      { name: "thicknessMap", description: "Texture for thickness variation" },
      { name: "attenuationColor", description: "Color that light tints as it passes through" },
      { name: "attenuationDistance", description: "Distance light travels before full attenuation" },
      { name: "sheen", description: "Sheen/velvet-like effect intensity" },
      { name: "sheenColor", description: "Color of the sheen effect" },
      { name: "sheenColorMap", description: "Texture for sheen color" },
      { name: "sheenRoughness", description: "Roughness of the sheen" },
      { name: "sheenRoughnessMap", description: "Texture for sheen roughness" },
      { name: "iridescence", description: "Iridescence/rainbow effect intensity" },
      { name: "iridescenceIOR", description: "IOR of iridescent layer" },
      { name: "iridescenceMap", description: "Texture for iridescence" },
      { name: "iridescenceThicknessRange", description: "Min/max thickness of iridescent layer" },
      { name: "anisotropy", description: "Anisotropic reflection intensity" },
      { name: "anisotropyMap", description: "Texture for anisotropy direction" },
      { name: "anisotropyRotation", description: "Rotation of anisotropy direction" }
    ]
  },
  
  recommendations: {
    performance: [
      "Use MeshBasicMaterial for unlit objects or when performance is critical",
      "Use MeshLambertMaterial for simple lit scenes with matte surfaces",
      "Use MeshStandardMaterial as your default choice for realistic rendering",
      "Only use MeshPhysicalMaterial when you need advanced features like glass or clearcoat"
    ],
    quality: [
      "Always use normal maps for detailed surfaces without extra geometry",
      "Use roughness/metalness maps for realistic material variation",
      "Enable environment maps for realistic reflections",
      "Use emissive maps for glowing parts like screens or lights"
    ],
    gamedev: [
      "For mobile games: prefer Lambert or Basic materials",
      "For stylized games: Basic or Lambert with color maps work well",
      "For realistic games: Standard material with full texture sets",
      "For special effects: Physical material for glass, water, gems"
    ]
  },
  
  codeExamples: {
    basic: `// Simple unlit material
const material = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  map: colorTexture
});`,
    
    standard: `// PBR material for realistic rendering
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: colorTexture,
  normalMap: normalTexture,
  roughness: 0.5,
  metalness: 0.5,
  roughnessMap: roughnessTexture,
  metalnessMap: metalnessTexture
});`,
    
    glass: `// Glass material using Physical
const material = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 1.0,
  thickness: 0.5,
  roughness: 0,
  ior: 1.5,
  clearcoat: 1.0
});`,
    
    carPaint: `// Car paint with clearcoat
const material = new THREE.MeshPhysicalMaterial({
  color: 0x0000ff,
  metalness: 0.9,
  roughness: 0.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1
});`
  }
};

export const getMaterialRecommendation = (useCase: string): string => {
  const lowerCase = useCase.toLowerCase();
  
  if (lowerCase.includes('glass') || lowerCase.includes('transparent') || lowerCase.includes('water')) {
    return 'MeshPhysicalMaterial with transmission';
  }
  if (lowerCase.includes('metal') || lowerCase.includes('realistic') || lowerCase.includes('pbr')) {
    return 'MeshStandardMaterial';
  }
  if (lowerCase.includes('shiny') || lowerCase.includes('plastic') || lowerCase.includes('specular')) {
    return 'MeshPhongMaterial';
  }
  if (lowerCase.includes('matte') || lowerCase.includes('simple') || lowerCase.includes('performance')) {
    return 'MeshLambertMaterial';
  }
  if (lowerCase.includes('unlit') || lowerCase.includes('wireframe') || lowerCase.includes('fastest')) {
    return 'MeshBasicMaterial';
  }
  
  return 'MeshStandardMaterial (recommended default)';
};
