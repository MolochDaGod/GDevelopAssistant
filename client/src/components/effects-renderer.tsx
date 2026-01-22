import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface EffectParams {
  bloom: { enabled: boolean; intensity: number; threshold: number; radius: number };
  vignette: { enabled: boolean; darkness: number; offset: number };
  chromaticAberration: { enabled: boolean; amount: number };
  glitch: { enabled: boolean; amount: number; speed: number };
  ascii: { enabled: boolean; cellSize: number; brightness: number };
  filmGrain: { enabled: boolean; amount: number };
  colorGrading: {
    enabled: boolean;
    temperature: number;
    tint: number;
    saturation: number;
    contrast: number;
  };
  depthOfField: { enabled: boolean; focus: number; aperture: number };
}

interface EffectsRendererProps {
  effects: EffectParams;
  isPlaying: boolean;
}

export function EffectsRenderer({ effects, isPlaying }: EffectsRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const effectsRef = useRef<EffectParams>(effects);
  
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const quadSceneRef = useRef<THREE.Scene | null>(null);
  const quadCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const quadMeshRef = useRef<THREE.Mesh | null>(null);
  const compositeMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  const [fps, setFps] = useState(60);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    effectsRef.current = effects;
    if (compositeMaterialRef.current) {
      updateCompositeMaterial(compositeMaterialRef.current, effects);
    }
  }, [effects]);

  const updateCompositeMaterial = useCallback((material: THREE.ShaderMaterial, params: EffectParams) => {
    material.uniforms.uBloomEnabled.value = params.bloom.enabled;
    material.uniforms.uBloomIntensity.value = params.bloom.intensity;
    material.uniforms.uBloomThreshold.value = params.bloom.threshold;
    
    material.uniforms.uVignetteEnabled.value = params.vignette.enabled;
    material.uniforms.uVignetteDarkness.value = params.vignette.darkness;
    material.uniforms.uVignetteOffset.value = params.vignette.offset;
    
    material.uniforms.uChromaticEnabled.value = params.chromaticAberration.enabled;
    material.uniforms.uChromaticAmount.value = params.chromaticAberration.amount;
    
    material.uniforms.uGlitchEnabled.value = params.glitch.enabled;
    material.uniforms.uGlitchAmount.value = params.glitch.amount;
    material.uniforms.uGlitchSpeed.value = params.glitch.speed;
    
    material.uniforms.uFilmGrainEnabled.value = params.filmGrain.enabled;
    material.uniforms.uFilmGrainAmount.value = params.filmGrain.amount;
    
    material.uniforms.uColorGradingEnabled.value = params.colorGrading.enabled;
    material.uniforms.uTemperature.value = params.colorGrading.temperature;
    material.uniforms.uTint.value = params.colorGrading.tint;
    material.uniforms.uSaturation.value = params.colorGrading.saturation;
    material.uniforms.uContrast.value = params.colorGrading.contrast;
    
    material.uniforms.uAsciiEnabled.value = params.ascii.enabled;
    material.uniforms.uAsciiCellSize.value = params.ascii.cellSize;
    material.uniforms.uAsciiBrightness.value = params.ascii.brightness;
    
    material.uniforms.uDofEnabled.value = params.depthOfField.enabled;
    material.uniforms.uDofFocus.value = params.depthOfField.focus;
    material.uniforms.uDofAperture.value = params.depthOfField.aperture;
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      rendererRef.current = renderer;
    } catch (err) {
      console.error('Failed to initialize WebGL renderer:', err);
      setError('WebGL is not supported in your browser.');
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 15, 60);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });
    renderTargetRef.current = renderTarget;

    createDemoScene(scene);

    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const compositeMaterial = createCompositeMaterial(width, height);
    const quadMesh = new THREE.Mesh(quadGeometry, compositeMaterial);
    quadScene.add(quadMesh);
    
    quadSceneRef.current = quadScene;
    quadCameraRef.current = quadCamera;
    quadMeshRef.current = quadMesh;
    compositeMaterialRef.current = compositeMaterial;

    updateCompositeMaterial(compositeMaterial, effectsRef.current);

    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      frameCount++;
      if (currentTime - lastFpsUpdate > 1000) {
        setFps(Math.round(frameCount * 1000 / (currentTime - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      if (isPlayingRef.current && sceneRef.current && cameraRef.current && rendererRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj.userData.rotationSpeed) {
            obj.rotation.y += obj.userData.rotationSpeed * deltaTime;
            obj.rotation.x += obj.userData.rotationSpeed * deltaTime * 0.3;
          }
          if (obj.userData.floatSpeed) {
            obj.position.y = obj.userData.baseY + Math.sin(currentTime * 0.001 * obj.userData.floatSpeed) * 0.5;
          }
          if (obj.userData.pulseSpeed) {
            const scale = 1 + Math.sin(currentTime * 0.002 * obj.userData.pulseSpeed) * 0.1;
            obj.scale.setScalar(scale * obj.userData.baseScale);
          }
        });

        rendererRef.current.setRenderTarget(renderTarget);
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        if (compositeMaterialRef.current) {
          compositeMaterialRef.current.uniforms.tDiffuse.value = renderTarget.texture;
          compositeMaterialRef.current.uniforms.uTime.value = currentTime / 1000;
        }

        rendererRef.current.setRenderTarget(null);
        if (quadSceneRef.current && quadCameraRef.current) {
          rendererRef.current.render(quadSceneRef.current, quadCameraRef.current);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      if (cameraRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
      }
      if (rendererRef.current) {
        rendererRef.current.setSize(w, h);
      }
      if (renderTargetRef.current) {
        renderTargetRef.current.setSize(w, h);
      }
      if (compositeMaterialRef.current) {
        compositeMaterialRef.current.uniforms.uResolution.value.set(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      rendererRef.current?.dispose();
      renderTargetRef.current?.dispose();
      compositeMaterialRef.current?.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [updateCompositeMaterial]);

  function createDemoScene(scene: THREE.Scene) {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xff0055, 3, 15);
    pointLight1.position.set(-4, 3, 2);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x0055ff, 3, 15);
    pointLight2.position.set(4, 3, -2);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x00ff88, 2, 12);
    pointLight3.position.set(0, 5, 0);
    scene.add(pointLight3);

    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.5,
      roughness: 0.6,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    scene.add(ground);

    const torusGeometry = new THREE.TorusGeometry(2, 0.6, 32, 100);
    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xff0033,
      emissiveIntensity: 0.8,
    });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.userData.rotationSpeed = 0.4;
    torus.userData.floatSpeed = 0.8;
    torus.userData.baseY = 0;
    scene.add(torus);

    const innerTorusGeometry = new THREE.TorusGeometry(1.2, 0.3, 24, 80);
    const innerTorusMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x00aaff,
      emissiveIntensity: 0.6,
    });
    const innerTorus = new THREE.Mesh(innerTorusGeometry, innerTorusMaterial);
    innerTorus.rotation.x = Math.PI / 2;
    innerTorus.userData.rotationSpeed = -0.6;
    innerTorus.userData.floatSpeed = 0.8;
    innerTorus.userData.baseY = 0;
    scene.add(innerTorus);

    for (let i = 0; i < 12; i++) {
      const size = 0.4 + Math.random() * 0.3;
      const geometry = i % 3 === 0 
        ? new THREE.OctahedronGeometry(size)
        : i % 3 === 1 
          ? new THREE.IcosahedronGeometry(size)
          : new THREE.TetrahedronGeometry(size);
      
      const hue = i / 12;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.8, 0.5),
        metalness: 0.6,
        roughness: 0.3,
        emissive: new THREE.Color().setHSL(hue, 0.8, 0.3),
        emissiveIntensity: 0.5,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 5 + Math.sin(i) * 1.5;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = 1 + Math.sin(i * 0.5) * 0.5;
      
      mesh.userData.rotationSpeed = 0.3 + Math.random() * 0.6;
      mesh.userData.floatSpeed = 0.4 + Math.random() * 0.6;
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.pulseSpeed = 0.5 + Math.random() * 0.5;
      mesh.userData.baseScale = 1;
      
      scene.add(mesh);
    }

    const sphereGeometry = new THREE.SphereGeometry(1.2, 64, 64);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const sphere = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    sphere.position.y = 3.5;
    sphere.userData.rotationSpeed = -0.5;
    sphere.userData.pulseSpeed = 1.2;
    sphere.userData.baseScale = 1;
    scene.add(sphere);

    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 1] = Math.random() * 15 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.rotationSpeed = 0.02;
    scene.add(particles);
  }

  function createCompositeMaterial(width: number, height: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        
        uBloomEnabled: { value: false },
        uBloomIntensity: { value: 1.0 },
        uBloomThreshold: { value: 0.8 },
        
        uVignetteEnabled: { value: false },
        uVignetteDarkness: { value: 1.0 },
        uVignetteOffset: { value: 1.0 },
        
        uChromaticEnabled: { value: false },
        uChromaticAmount: { value: 0.002 },
        
        uGlitchEnabled: { value: false },
        uGlitchAmount: { value: 0.3 },
        uGlitchSpeed: { value: 1.0 },
        
        uFilmGrainEnabled: { value: false },
        uFilmGrainAmount: { value: 0.3 },
        
        uColorGradingEnabled: { value: false },
        uTemperature: { value: 0.0 },
        uTint: { value: 0.0 },
        uSaturation: { value: 1.0 },
        uContrast: { value: 1.0 },
        
        uAsciiEnabled: { value: false },
        uAsciiCellSize: { value: 8.0 },
        uAsciiBrightness: { value: 1.0 },
        
        uDofEnabled: { value: false },
        uDofFocus: { value: 0.5 },
        uDofAperture: { value: 0.02 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform vec2 uResolution;
        
        uniform bool uBloomEnabled;
        uniform float uBloomIntensity;
        uniform float uBloomThreshold;
        
        uniform bool uVignetteEnabled;
        uniform float uVignetteDarkness;
        uniform float uVignetteOffset;
        
        uniform bool uChromaticEnabled;
        uniform float uChromaticAmount;
        
        uniform bool uGlitchEnabled;
        uniform float uGlitchAmount;
        uniform float uGlitchSpeed;
        
        uniform bool uFilmGrainEnabled;
        uniform float uFilmGrainAmount;
        
        uniform bool uColorGradingEnabled;
        uniform float uTemperature;
        uniform float uTint;
        uniform float uSaturation;
        uniform float uContrast;
        
        uniform bool uAsciiEnabled;
        uniform float uAsciiCellSize;
        uniform float uAsciiBrightness;
        
        uniform bool uDofEnabled;
        uniform float uDofFocus;
        uniform float uDofAperture;
        
        varying vec2 vUv;

        float random(vec2 st) {
          return fract(sin(dot(st.xy + uTime * 0.1, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
          vec4 color = vec4(0.0);
          vec2 off1 = vec2(1.3333333333333333) * direction;
          color += texture2D(image, uv) * 0.29411764705882354;
          color += texture2D(image, uv + (off1 / resolution)) * 0.35294117647058826;
          color += texture2D(image, uv - (off1 / resolution)) * 0.35294117647058826;
          return color;
        }

        void main() {
          vec2 uv = vUv;
          vec4 color;
          
          // Chromatic Aberration (applied first to base sample)
          if (uChromaticEnabled) {
            vec2 direction = uv - 0.5;
            float r = texture2D(tDiffuse, uv + direction * uChromaticAmount).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - direction * uChromaticAmount).b;
            color = vec4(r, g, b, 1.0);
          } else {
            color = texture2D(tDiffuse, uv);
          }
          
          // Glitch effect
          if (uGlitchEnabled) {
            float time = uTime * uGlitchSpeed;
            if (random(vec2(floor(time * 10.0), floor(uv.y * 20.0))) < 0.05 * uGlitchAmount) {
              float shift = (random(vec2(time, uv.y)) - 0.5) * uGlitchAmount * 0.2;
              vec2 shiftedUv = uv + vec2(shift, 0.0);
              color.r = texture2D(tDiffuse, shiftedUv + vec2(0.02 * uGlitchAmount, 0.0)).r;
              color.b = texture2D(tDiffuse, shiftedUv - vec2(0.02 * uGlitchAmount, 0.0)).b;
            }
          }
          
          // Depth of Field (simplified radial blur)
          if (uDofEnabled) {
            vec2 center = uv - 0.5;
            float dist = length(center);
            float blur = abs(dist - uDofFocus) * uDofAperture * 10.0;
            
            if (blur > 0.001) {
              vec4 blurred = vec4(0.0);
              float total = 0.0;
              for (float x = -2.0; x <= 2.0; x += 1.0) {
                for (float y = -2.0; y <= 2.0; y += 1.0) {
                  vec2 offset = vec2(x, y) * blur / uResolution * 3.0;
                  blurred += texture2D(tDiffuse, uv + offset);
                  total += 1.0;
                }
              }
              color = mix(color, blurred / total, min(blur * 5.0, 1.0));
            }
          }
          
          // Bloom effect
          if (uBloomEnabled) {
            float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
            if (brightness > uBloomThreshold) {
              vec4 blurH = blur5(tDiffuse, uv, uResolution, vec2(2.0, 0.0));
              vec4 blurV = blur5(tDiffuse, uv, uResolution, vec2(0.0, 2.0));
              vec4 bloom = (blurH + blurV) * 0.5;
              float bloomFactor = (brightness - uBloomThreshold) / (1.0 - uBloomThreshold);
              color.rgb += bloom.rgb * uBloomIntensity * bloomFactor;
            }
          }
          
          // Film Grain
          if (uFilmGrainEnabled) {
            float noise = (random(uv * uResolution) - 0.5) * uFilmGrainAmount;
            color.rgb += noise;
          }
          
          // Color Grading
          if (uColorGradingEnabled) {
            // Temperature (warm/cool)
            color.r += uTemperature * 0.1;
            color.b -= uTemperature * 0.1;
            
            // Tint (green/magenta)
            color.g += uTint * 0.1;
            
            // Saturation
            vec3 hsv = rgb2hsv(color.rgb);
            hsv.y *= uSaturation;
            color.rgb = hsv2rgb(hsv);
            
            // Contrast
            color.rgb = (color.rgb - 0.5) * uContrast + 0.5;
          }
          
          // ASCII effect
          if (uAsciiEnabled) {
            vec2 cellSize = vec2(uAsciiCellSize) / uResolution;
            vec2 cell = floor(uv / cellSize);
            vec2 cellCenter = cell * cellSize + cellSize * 0.5;
            
            vec4 cellColor = texture2D(tDiffuse, cellCenter);
            float luminance = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114)) * uAsciiBrightness;
            
            vec2 localUv = fract(uv / cellSize);
            float dist = length(localUv - 0.5);
            
            // Create dot pattern based on brightness
            float dotSize = luminance * 0.5;
            float pattern = step(dist, dotSize);
            
            color.rgb = vec3(luminance) * pattern + color.rgb * (1.0 - pattern) * 0.3;
          }
          
          // Vignette (applied last)
          if (uVignetteEnabled) {
            vec2 center = uv - 0.5;
            float vignette = 1.0 - dot(center, center) * uVignetteDarkness;
            vignette = smoothstep(0.0, uVignetteOffset, vignette);
            color.rgb *= vignette;
          }
          
          // Clamp final color
          color.rgb = clamp(color.rgb, 0.0, 1.0);
          
          gl_FragColor = color;
        }
      `,
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-background" data-testid="webgl-error">
        <div className="max-w-md p-6 text-center">
          <p className="text-lg text-foreground mb-2">WebGL Not Available</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" data-testid="canvas-effects" />
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-mono text-green-400" data-testid="text-fps">
        {fps} FPS
      </div>
    </div>
  );
}
