export const THREEJS_EXAMPLES = [
  // Basic Examples
  {
    name: "Hello World",
    category: "Basic Examples",
    fileName: "HelloWorld",
    description: "A heavily commented basic scene with sphere, cube, plane, skybox/fog options, lighting effects, mouse controls, and FPS stats. Perfect introduction to Three.js fundamentals.",
    tags: ["basic", "tutorial", "lighting", "camera", "controls"]
  },
  {
    name: "Template",
    category: "Basic Examples",
    fileName: "Template",
    description: "Clean starting template with essential Three.js setup code. Use this as a foundation for new projects.",
    tags: ["basic", "template", "starter"]
  },
  {
    name: "Info Box",
    category: "Basic Examples",
    fileName: "Infobox",
    description: "Template with jQuery integration for creating interactive information dialog boxes in your 3D scenes.",
    tags: ["basic", "ui", "jquery", "dialog"]
  },
  {
    name: "Materials - Solid",
    category: "Basic Examples",
    fileName: "Materials-Solid",
    description: "Comparison of Basic, Lambert, and Phong materials. Learn when to use each material type for different visual effects.",
    tags: ["materials", "basic", "lambert", "phong", "lighting"]
  },
  {
    name: "Color Explorer",
    category: "Basic Examples",
    fileName: "Color-Explorer",
    description: "Interactive exploration of color properties: diffuse color, ambient color, emissive color, specular color, shininess, and opacity.",
    tags: ["materials", "color", "interactive", "lighting"]
  },
  {
    name: "Wireframe",
    category: "Basic Examples",
    fileName: "Wireframe",
    description: "How to create and apply wireframe materials for debugging or stylized visual effects.",
    tags: ["wireframe", "materials", "debugging"]
  },
  {
    name: "Lines and Dashed Lines",
    category: "Basic Examples",
    fileName: "Dashed-Lines",
    description: "Creating solid and dashed lines, plus converting geometries into line-based objects for debugging or effects.",
    tags: ["lines", "dashed", "geometry", "debugging"]
  },
  {
    name: "Helpers",
    category: "Basic Examples",
    fileName: "Helpers",
    description: "Using AxisHelper, GridHelper, and ArrowHelper to create useful debugging visualizations.",
    tags: ["helpers", "debugging", "axes", "grid", "arrows"]
  },
  {
    name: "Outline Effect",
    category: "Basic Examples",
    fileName: "Outline",
    description: "Post-processing effect to display a solid outline around meshes for highlighting or cel-shading styles.",
    tags: ["outline", "post-processing", "effects", "cel-shading"]
  },
  {
    name: "Face/Vertex Colors",
    category: "Basic Examples",
    fileName: "Vertex-Colors",
    description: "Assigning colors to individual faces and vertices to create gradient effects without textures.",
    tags: ["colors", "vertices", "faces", "gradient"]
  },
  {
    name: "Shapes",
    category: "Basic Examples",
    fileName: "Shapes",
    description: "Built-in geometry constructors: cube, sphere, cylinder, cone, torus, icosahedron, and more. Complete shape reference.",
    tags: ["geometry", "shapes", "primitives", "3d"]
  },
  {
    name: "Extrusion",
    category: "Basic Examples",
    fileName: "Extrusion",
    description: "Create 3D shapes by extruding 2D shapes. Perfect for custom geometry creation from vector paths.",
    tags: ["extrusion", "geometry", "2d-to-3d", "custom-shapes"]
  },
  {
    name: "Text3D",
    category: "Basic Examples",
    fileName: "Text3D",
    description: "Create extruded 3D text objects with customizable fonts, depth, and bevel options.",
    tags: ["text", "3d-text", "typography", "extrusion"]
  },

  // Texture Examples
  {
    name: "Textures",
    category: "Texture Examples",
    fileName: "Textures",
    description: "Image-based materials with shading and coloring effects. Foundation for photorealistic rendering.",
    tags: ["textures", "materials", "images", "shading"]
  },
  {
    name: "Texture - Repeat",
    category: "Texture Examples",
    fileName: "Texture-Repeat",
    description: "Tiling textures across surfaces for seamless patterns. Control UV mapping and repeat settings.",
    tags: ["textures", "tiling", "uv-mapping", "repeat"]
  },
  {
    name: "Texture - Text3D",
    category: "Texture Examples",
    fileName: "Text3D-Textures",
    description: "Apply textures to 3D text with proper UV mapping for realistic text materials.",
    tags: ["textures", "3d-text", "uv-mapping"]
  },
  {
    name: "Translucence",
    category: "Texture Examples",
    fileName: "Translucence",
    description: "Translucent materials, alpha transparency, and additive blending for glow effects.",
    tags: ["transparency", "translucence", "alpha", "blending", "glow"]
  },
  {
    name: "Shadow",
    category: "Texture Examples",
    fileName: "Shadow",
    description: "Dynamic shadow casting using spotlights for realistic lighting and depth.",
    tags: ["shadows", "lighting", "spotlights", "dynamic"]
  },
  {
    name: "Subdivision Modifier - Cube",
    category: "Texture Examples",
    fileName: "Subdivision-Cube",
    description: "Geometry subdivision for smoothing effects. Creates spherical and beveled cubes from basic geometry.",
    tags: ["subdivision", "smoothing", "geometry", "modifiers"]
  },
  {
    name: "SkyBox",
    category: "Texture Examples",
    fileName: "Skybox",
    description: "Create immersive environments with 360-degree skybox backgrounds using cube textures.",
    tags: ["skybox", "environment", "cubemap", "background"]
  },
  {
    name: "Reflection",
    category: "Texture Examples",
    fileName: "Reflection",
    description: "Mirror-like materials using environment reflection mapping for realistic surfaces.",
    tags: ["reflection", "cubemap", "mirror", "environment"]
  },
  {
    name: "Refraction",
    category: "Texture Examples",
    fileName: "Refraction",
    description: "Glass-like materials with light refraction for realistic transparent objects.",
    tags: ["refraction", "glass", "transparency", "environment"]
  },
  {
    name: "Bubble",
    category: "Texture Examples",
    fileName: "Bubble",
    description: "Bubble materials combining reflection, refraction, and chromatic aberration using Fresnel shaders.",
    tags: ["bubble", "fresnel", "refraction", "chromatic-aberration"]
  },
  {
    name: "Texture from Canvas",
    category: "Texture Examples",
    fileName: "Texture-From-Canvas",
    description: "Generate textures dynamically using HTML5 Canvas. Draw text, shapes, or images and use as materials.",
    tags: ["canvas", "dynamic-textures", "procedural", "html5"]
  },
  {
    name: "Texture Animation",
    category: "Texture Examples",
    fileName: "Texture-Animation",
    description: "Animate sprite sheet textures for 2D animations on 3D surfaces.",
    tags: ["animation", "spritesheet", "textures", "2d-animation"]
  },

  // Sprite Examples
  {
    name: "Sprites",
    category: "Sprite Examples",
    fileName: "Sprites",
    description: "Billboard sprites that always face the camera. Perfect for particles, UI elements, and icons.",
    tags: ["sprites", "billboards", "2d-in-3d", "particles"]
  },
  {
    name: "Sprite Text Labels",
    category: "Sprite Examples",
    fileName: "Sprite-Text-Labels",
    description: "Create text labels using sprites for 3D scene annotations and UI.",
    tags: ["sprites", "text", "labels", "ui", "annotations"]
  },
  {
    name: "Labeled Geometry",
    category: "Sprite Examples",
    fileName: "Labeled-Geometry",
    description: "Attach sprite labels to 3D geometry for interactive object identification.",
    tags: ["sprites", "labels", "geometry", "interactive"]
  },

  // Mouse and Keyboard Examples
  {
    name: "Mouse Sprite",
    category: "Mouse and Keyboard",
    fileName: "Mouse-Sprite",
    description: "Interactive sprite that follows mouse cursor in 3D space.",
    tags: ["mouse", "input", "sprites", "interactive"]
  },
  {
    name: "Mouse Click",
    category: "Mouse and Keyboard",
    fileName: "Mouse-Click",
    description: "Raycasting for detecting mouse clicks on 3D objects. Essential for interactive scenes.",
    tags: ["mouse", "raycasting", "click", "selection", "interactive"]
  },
  {
    name: "Mouse Hovering",
    category: "Mouse and Keyboard",
    fileName: "Mouse-Hovering",
    description: "Detect mouse hover over 3D objects for tooltips and highlighting.",
    tags: ["mouse", "hover", "raycasting", "interactive"]
  },
  {
    name: "Mouse Tooltip",
    category: "Mouse and Keyboard",
    fileName: "Mouse-Tooltip",
    description: "Display tooltips when hovering over 3D objects. Great for interactive scenes and games.",
    tags: ["mouse", "tooltip", "ui", "interactive"]
  },
  {
    name: "Keyboard Events",
    category: "Mouse and Keyboard",
    fileName: "Keyboard-Events",
    description: "Handle keyboard input for controlling objects and camera movement.",
    tags: ["keyboard", "input", "controls", "interactive"]
  },

  // Camera/Renderer Examples
  {
    name: "Mesh Movement",
    category: "Camera and Renderer",
    fileName: "Mesh-Movement",
    description: "Control object movement with keyboard input. Foundation for character controllers.",
    tags: ["movement", "controls", "keyboard", "animation"]
  },
  {
    name: "Chase Camera",
    category: "Camera and Renderer",
    fileName: "Chase-Camera",
    description: "Third-person camera that follows a moving object. Perfect for games and simulations.",
    tags: ["camera", "chase", "third-person", "controls"]
  },
  {
    name: "Multiple Cameras",
    category: "Camera and Renderer",
    fileName: "Multiple-Cameras",
    description: "Switch between multiple camera perspectives in a scene.",
    tags: ["camera", "multiple-views", "perspective"]
  },
  {
    name: "Camera to Texture",
    category: "Camera and Renderer",
    fileName: "Camera-Texture",
    description: "Render camera view to texture for security monitors, mirrors, and portals.",
    tags: ["camera", "render-to-texture", "mirror", "portal"]
  },
  {
    name: "Viewports - Dual",
    category: "Camera and Renderer",
    fileName: "Viewports-Dual",
    description: "Split-screen rendering with two viewports side by side.",
    tags: ["viewport", "split-screen", "multi-view"]
  },
  {
    name: "Viewports - Quad",
    category: "Camera and Renderer",
    fileName: "Viewports-Quad",
    description: "Four-way split screen for multi-angle viewing.",
    tags: ["viewport", "split-screen", "quad-view", "multi-view"]
  },
  {
    name: "Embedded HTML",
    category: "Camera and Renderer",
    fileName: "CSS3D",
    description: "Embed HTML/CSS elements in 3D space using CSS3DRenderer for UI integration.",
    tags: ["css3d", "html", "ui", "integration"]
  },
  {
    name: "Red/Blue Anaglyph",
    category: "Camera and Renderer",
    fileName: "Anaglyph",
    description: "Stereoscopic 3D rendering for red/blue glasses viewing.",
    tags: ["anaglyph", "stereoscopic", "3d-glasses"]
  },

  // Shader Examples
  {
    name: "Shader - Simple",
    category: "Shader Examples",
    fileName: "Shader-Simple",
    description: "Introduction to custom GLSL shaders. Create custom vertex and fragment shaders.",
    tags: ["shaders", "glsl", "custom-materials", "webgl"]
  },
  {
    name: "Shader - Explorer",
    category: "Shader Examples",
    fileName: "Shader-Explorer",
    description: "Interactive shader parameter exploration for learning shader programming.",
    tags: ["shaders", "glsl", "interactive", "learning"]
  },
  {
    name: "Shader - Sphere Unwrapping",
    category: "Shader Examples",
    fileName: "Sphere-Unwrapping",
    description: "UV unwrapping visualization using shaders for texture mapping education.",
    tags: ["shaders", "uv-mapping", "textures", "educational"]
  },
  {
    name: "Shader - Attributes",
    category: "Shader Examples",
    fileName: "Shader-Attributes",
    description: "Pass custom per-vertex data to shaders for advanced effects.",
    tags: ["shaders", "attributes", "vertex-data", "custom"]
  },
  {
    name: "Shader - Animated Materials",
    category: "Shader Examples",
    fileName: "Shader-Animate",
    description: "Time-based animated shader effects for dynamic materials.",
    tags: ["shaders", "animation", "time", "dynamic"]
  },
  {
    name: "Shader - Animated Fireball",
    category: "Shader Examples",
    fileName: "Shader-Fireball",
    description: "Procedural animated fireball effect using noise and distortion shaders.",
    tags: ["shaders", "fire", "procedural", "vfx", "noise"]
  },
  {
    name: "Shader - Glow Effect",
    category: "Shader Examples",
    fileName: "Shader-Glow",
    description: "Custom glow effect using shaders for luminous objects.",
    tags: ["shaders", "glow", "post-processing", "effects"]
  },
  {
    name: "Simple Glow (non-shader)",
    category: "Shader Examples",
    fileName: "Simple-Glow",
    description: "Glow effect without custom shaders using material properties.",
    tags: ["glow", "materials", "effects", "simple"]
  },

  // Particle System Examples
  {
    name: "Particles",
    category: "Particle Systems",
    fileName: "Particles",
    description: "Basic particle system setup for snow, rain, dust, and atmospheric effects.",
    tags: ["particles", "effects", "atmosphere"]
  },
  {
    name: "Particle System - Static",
    category: "Particle Systems",
    fileName: "ParticleSystem-Static",
    description: "Static particle system with thousands of particles for backgrounds.",
    tags: ["particles", "static", "background", "effects"]
  },
  {
    name: "Particle System - Shader",
    category: "Particle Systems",
    fileName: "ParticleSystem-Shader",
    description: "GPU-accelerated particle system using custom shaders for performance.",
    tags: ["particles", "shaders", "gpu", "performance"]
  },
  {
    name: "Particle System - Attributes",
    category: "Particle Systems",
    fileName: "ParticleSystem-Attributes",
    description: "Per-particle custom attributes for varied colors, sizes, and behaviors.",
    tags: ["particles", "attributes", "custom", "variation"]
  },
  {
    name: "Particle System - Dynamic",
    category: "Particle Systems",
    fileName: "ParticleSystem-Dynamic",
    description: "Dynamic particle system with physics simulation for explosions and effects.",
    tags: ["particles", "physics", "dynamic", "simulation"]
  },
  {
    name: "Particle System - Path Movement",
    category: "Particle Systems",
    fileName: "ParticleSystem-PathMovement",
    description: "Particles following curved paths for trails and ribbons.",
    tags: ["particles", "paths", "trails", "motion"]
  },
  {
    name: "Particle Engine",
    category: "Particle Systems",
    fileName: "Particle-Engine",
    description: "Complete particle engine with emitters, lifetime management, and effects.",
    tags: ["particles", "engine", "emitters", "vfx"]
  },

  // Video/Webcam Examples
  {
    name: "Video to Texture",
    category: "Video and Webcam",
    fileName: "Video-Texture",
    description: "Use video files as animated textures on 3D objects.",
    tags: ["video", "textures", "animation", "media"]
  },
  {
    name: "Webcam Test",
    category: "Video and Webcam",
    fileName: "Webcam-Test",
    description: "Test webcam access and display in browser.",
    tags: ["webcam", "camera", "video", "input"]
  },
  {
    name: "Webcam to Texture",
    category: "Video and Webcam",
    fileName: "Webcam-Texture",
    description: "Use live webcam feed as texture for AR and mirror effects.",
    tags: ["webcam", "textures", "ar", "realtime"]
  },
  {
    name: "Motion Detection",
    category: "Video and Webcam",
    fileName: "Motion-Detection",
    description: "Computer vision motion detection using webcam for interactive experiences.",
    tags: ["webcam", "motion-detection", "cv", "interactive"]
  },
  {
    name: "Motion Detection and Scene",
    category: "Video and Webcam",
    fileName: "Motion-Detection-Texture",
    description: "Combine motion detection with 3D scene for gesture-controlled applications.",
    tags: ["webcam", "motion-detection", "gestures", "interactive"]
  },
  {
    name: "Many Cameras",
    category: "Video and Webcam",
    fileName: "Many-Cameras",
    description: "Multiple camera streams and viewports for surveillance or multi-user apps.",
    tags: ["webcam", "multiple-cameras", "surveillance", "multi-view"]
  },

  // GUI Examples
  {
    name: "GUI",
    category: "GUI Examples",
    fileName: "GUI",
    description: "dat.GUI integration for interactive parameter control panels.",
    tags: ["gui", "dat.gui", "controls", "ui"]
  },
  {
    name: "GUI Controller",
    category: "GUI Examples",
    fileName: "GUI-Controller",
    description: "Advanced dat.GUI controls for complex scene manipulation.",
    tags: ["gui", "dat.gui", "controls", "advanced"]
  },

  // Gamepad and Leapmotion Examples
  {
    name: "Gamepad Test",
    category: "Gamepad and Controllers",
    fileName: "Gamepad-Test",
    description: "Test gamepad/controller input in browser for game development.",
    tags: ["gamepad", "controller", "input", "testing"]
  },
  {
    name: "Mesh Movement - Gamepad",
    category: "Gamepad and Controllers",
    fileName: "Mesh-Movement-Gamepad",
    description: "Control 3D objects with gamepad for console-style games.",
    tags: ["gamepad", "controller", "movement", "games"]
  },
  {
    name: "LeapMotion Visualization",
    category: "Gamepad and Controllers",
    fileName: "LeapMotion-Visualization",
    description: "Visualize LeapMotion hand tracking data in 3D for gesture interfaces.",
    tags: ["leapmotion", "hand-tracking", "gestures", "vr"]
  },

  // Model Examples
  {
    name: "Model",
    category: "3D Model Loading",
    fileName: "Model",
    description: "Load external 3D models (OBJ, FBX, GLTF) into Three.js scenes.",
    tags: ["models", "loading", "obj", "fbx", "gltf"]
  },
  {
    name: "Animated Model",
    category: "3D Model Loading",
    fileName: "Model-Animation",
    description: "Load and play animated 3D models with skeletal animation.",
    tags: ["models", "animation", "skeletal", "characters"]
  },
  {
    name: "Animated Model with Controls",
    category: "3D Model Loading",
    fileName: "Model-Animation-Control",
    description: "Interactive animation playback control for character models.",
    tags: ["models", "animation", "controls", "interactive"]
  },

  // Collision Detection
  {
    name: "Collision Detection",
    category: "Physics and Collision",
    fileName: "Collision-Detection",
    description: "Raycasting-based collision detection for games and simulations.",
    tags: ["collision", "physics", "raycasting", "games"]
  },

  // Marching Cubes Examples
  {
    name: "Marching Cubes Algorithm",
    category: "Advanced Algorithms",
    fileName: "Marching-Cubes",
    description: "Marching cubes algorithm for isosurface extraction and procedural geometry.",
    tags: ["marching-cubes", "procedural", "algorithm", "isosurface"]
  },
  {
    name: "Metaballs",
    category: "Advanced Algorithms",
    fileName: "Metaballs",
    description: "Organic blob-like shapes using metaballs and marching cubes.",
    tags: ["metaballs", "marching-cubes", "organic", "procedural"]
  },
  {
    name: "Metabubbles",
    category: "Advanced Algorithms",
    fileName: "Metabubbles",
    description: "Bubble-like metaball surfaces with transparency effects.",
    tags: ["metaballs", "bubbles", "procedural", "organic"]
  },

  // Mathematical Examples
  {
    name: "Constructive Solid Geometry",
    category: "Mathematical Tools",
    fileName: "CSG",
    description: "Boolean operations on 3D meshes: union, subtract, intersect for CAD-like modeling.",
    tags: ["csg", "boolean", "modeling", "geometry"]
  },
  {
    name: "Sphere Projection",
    category: "Mathematical Tools",
    fileName: "Sphere-Project",
    description: "Project 2D data onto spheres for globe visualizations.",
    tags: ["projection", "sphere", "visualization", "globe"]
  },
  {
    name: "Topology Data",
    category: "Mathematical Tools",
    fileName: "Topology-Data",
    description: "Visualize topological data structures and graph networks in 3D.",
    tags: ["topology", "graph", "network", "visualization"]
  },
  {
    name: "Topology Data 2",
    category: "Mathematical Tools",
    fileName: "Topology-Data-2",
    description: "Advanced topological visualization with interactive graph networks.",
    tags: ["topology", "graph", "network", "interactive"]
  },
  {
    name: "Polyhedra Viewer",
    category: "Mathematical Tools",
    fileName: "Polyhedra-Viewer",
    description: "Interactive viewer for Platonic solids and polyhedra with wireframes.",
    tags: ["polyhedra", "geometry", "mathematics", "visualization"]
  },
  {
    name: "Function Grapher",
    category: "Mathematical Tools",
    fileName: "Graphulus-Function",
    description: "3D function plotter for mathematical visualization and education.",
    tags: ["math", "graphing", "functions", "education"]
  },
  {
    name: "Parametric Surface Grapher",
    category: "Mathematical Tools",
    fileName: "Graphulus-Surface",
    description: "Parametric surface plotting for advanced mathematical visualization.",
    tags: ["math", "parametric", "surfaces", "graphing"]
  },
  {
    name: "Parametric Curve Grapher",
    category: "Mathematical Tools",
    fileName: "Graphulus-Curve",
    description: "3D parametric curve visualization for mathematics and engineering.",
    tags: ["math", "parametric", "curves", "graphing"]
  },

  // Other Examples
  {
    name: "Voxel Painter",
    category: "Creative Tools",
    fileName: "Voxel-Painter",
    description: "Interactive voxel-based 3D painting and modeling tool. Build Minecraft-style creations.",
    tags: ["voxels", "painting", "creative", "interactive", "minecraft"]
  }
];

export const ASSET_TYPES = {
  SPRITE: "sprite",
  BACKGROUND: "background",
  SOUND: "sound",
  TILESET: "tileset",
  MODEL_3D: "3d-model",
  SHADER: "shader",
  TEXTURE: "texture",
  THREEJS_EXAMPLE: "threejs-example",
  PACKAGE: "package",
} as const;

export type AssetType = typeof ASSET_TYPES[keyof typeof ASSET_TYPES];
