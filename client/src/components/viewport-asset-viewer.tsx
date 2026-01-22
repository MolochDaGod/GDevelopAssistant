import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Loader2, AlertCircle, RotateCcw, ZoomIn, ZoomOut, Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ViewportConfig {
  cameraPosition?: { x: number; y: number; z: number };
  targetPosition?: { x: number; y: number; z: number };
  fov?: number;
  backgroundColor?: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showGround?: boolean;
  showGrid?: boolean;
  showFog?: boolean;
}

interface AnimationState {
  name: string;
  action: THREE.AnimationAction;
  isLooping: boolean;
}

interface MorphTarget {
  name: string;
  index: number;
  influence: number;
}

interface ViewportAssetViewerProps {
  filePath: string;
  className?: string;
  viewportConfig?: ViewportConfig;
  showControls?: boolean;
  showAnimationPanel?: boolean;
  autoRotate?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function ViewportAssetViewer({
  filePath,
  className = "",
  viewportConfig = {},
  showControls = true,
  showAnimationPanel = true,
  autoRotate = false,
  onLoad,
  onError,
}: ViewportAssetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationFrameRef = useRef<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Animation state
  const [animations, setAnimations] = useState<AnimationState[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  
  // Morph targets / expressions
  const [morphTargets, setMorphTargets] = useState<MorphTarget[]>([]);
  
  // States and emotes categorization
  const [states, setStates] = useState<string[]>([]);
  const [emotes, setEmotes] = useState<string[]>([]);

  const getFileExtension = (path: string): string => {
    const parts = path.split(".");
    return parts[parts.length - 1].toLowerCase();
  };

  const categorizeAnimations = (clipNames: string[]) => {
    const stateKeywords = ['idle', 'walk', 'run', 'stand', 'sit', 'death', 'die', 'dead'];
    const emoteKeywords = ['jump', 'wave', 'punch', 'kick', 'attack', 'dance', 'emote', 'gesture', 'thumbs', 'yes', 'no', 'bow'];
    
    const foundStates: string[] = [];
    const foundEmotes: string[] = [];
    
    clipNames.forEach(name => {
      const lowerName = name.toLowerCase();
      if (stateKeywords.some(k => lowerName.includes(k))) {
        foundStates.push(name);
      } else if (emoteKeywords.some(k => lowerName.includes(k))) {
        foundEmotes.push(name);
      } else {
        // Default to states for unrecognized animations
        foundStates.push(name);
      }
    });
    
    setStates(foundStates);
    setEmotes(foundEmotes);
  };

  const fadeToAction = useCallback((name: string, duration: number = 0.5) => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    
    const newAction = animations.find(a => a.name === name)?.action;
    const prevAction = animations.find(a => a.name === activeAnimation)?.action;
    
    if (!newAction) return;
    
    if (prevAction && prevAction !== newAction) {
      prevAction.fadeOut(duration);
    }
    
    newAction
      .reset()
      .setEffectiveTimeScale(animationSpeed)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();
    
    setActiveAnimation(name);
  }, [animations, activeAnimation, animationSpeed]);

  const playEmote = useCallback((name: string) => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    
    const emoteAction = animations.find(a => a.name === name)?.action;
    if (!emoteAction) return;
    
    // Store current state
    const currentState = activeAnimation;
    
    // Fade to emote
    fadeToAction(name, 0.2);
    
    // Return to previous state when emote finishes
    const onFinished = () => {
      mixer.removeEventListener('finished', onFinished);
      if (currentState && states.includes(currentState)) {
        fadeToAction(currentState, 0.2);
      }
    };
    
    mixer.addEventListener('finished', onFinished);
  }, [animations, activeAnimation, fadeToAction, states]);

  const updateMorphTarget = useCallback((index: number, value: number) => {
    const model = modelRef.current;
    if (!model) return;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
        if (index < child.morphTargetInfluences.length) {
          child.morphTargetInfluences[index] = value;
        }
      }
    });
    
    setMorphTargets(prev => 
      prev.map((mt, i) => i === index ? { ...mt, influence: value } : mt)
    );
  }, []);

  const centerAndScaleModel = useCallback((object: THREE.Object3D, camera: THREE.PerspectiveCamera, controls: OrbitControls) => {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2.5;
    
    // Position model at origin but keep feet on ground
    object.position.x = -center.x;
    object.position.z = -center.z;
    object.position.y = -box.min.y;
    
    // Position camera like the reference example
    camera.position.set(-cameraZ * 0.5, cameraZ * 0.3, cameraZ);
    camera.lookAt(0, size.y * 0.4, 0);
    
    controls.target.set(0, size.y * 0.4, 0);
    controls.update();
    
    camera.near = cameraZ / 100;
    camera.far = cameraZ * 100;
    camera.updateProjectionMatrix();
  }, []);

  const resetCamera = useCallback(() => {
    if (modelRef.current && cameraRef.current && controlsRef.current) {
      centerAndScaleModel(modelRef.current, cameraRef.current, controlsRef.current);
    }
  }, [centerAndScaleModel]);

  const zoomIn = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(0.8);
      controlsRef.current?.update();
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(1.25);
      controlsRef.current?.update();
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    
    setIsPlaying(prev => {
      const newState = !prev;
      animations.forEach(anim => {
        anim.action.paused = !newState;
      });
      return newState;
    });
  }, [animations]);

  const handleSpeedChange = useCallback((value: number[]) => {
    const speed = value[0];
    setAnimationSpeed(speed);
    animations.forEach(anim => {
      anim.action.setEffectiveTimeScale(speed);
    });
  }, [animations]);

  useEffect(() => {
    if (!containerRef.current || !filePath) return;

    setLoading(true);
    setError(null);
    setLoadProgress(0);
    setAnimations([]);
    setMorphTargets([]);
    setStates([]);
    setEmotes([]);
    setActiveAnimation(null);

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Check for WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      setError("WebGL is not supported in this browser");
      setLoading(false);
      onError?.("WebGL not supported");
      return;
    }

    try {
      // Scene setup
      const scene = new THREE.Scene();
      const bgColor = viewportConfig.backgroundColor || "#1a1a1a";
      scene.background = new THREE.Color(bgColor);
      
      // Add fog like the reference
      if (viewportConfig.showFog !== false) {
        scene.fog = new THREE.Fog(bgColor, 20, 100);
      }
      sceneRef.current = scene;

      // Camera setup - similar to reference
      const camera = new THREE.PerspectiveCamera(
        viewportConfig.fov || 45,
        width / height,
        0.25,
        100
      );
      const camPos = viewportConfig.cameraPosition || { x: -5, y: 3, z: 10 };
      camera.position.set(camPos.x, camPos.y, camPos.z);
      camera.lookAt(0, 2, 0);
      cameraRef.current = camera;

      // Renderer setup
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false });
      } catch {
        try {
          renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, failIfMajorPerformanceCaveat: false });
        } catch {
          setError("Failed to create WebGL context");
          setLoading(false);
          onError?.("WebGL context creation failed");
          return;
        }
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = viewportConfig.autoRotateSpeed || 2;
      controls.minDistance = 2;
      controls.maxDistance = 50;
      controlsRef.current = controls;

      // Lighting - enhanced like reference example
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 3);
      dirLight.position.set(0, 20, 10);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.1;
      dirLight.shadow.camera.far = 50;
      dirLight.shadow.camera.left = -10;
      dirLight.shadow.camera.right = 10;
      dirLight.shadow.camera.top = 10;
      dirLight.shadow.camera.bottom = -10;
      scene.add(dirLight);

      // Rim light for dramatic effect
      const rimLight = new THREE.DirectionalLight(0xdc2626, 0.5);
      rimLight.position.set(-5, 5, -5);
      scene.add(rimLight);

      // Ground plane
      if (viewportConfig.showGround !== false) {
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshPhongMaterial({ 
          color: 0x1a1a1a, 
          depthWrite: false,
          transparent: true,
          opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
      }

      // Grid
      if (viewportConfig.showGrid !== false) {
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        gridHelper.position.y = 0.01;
        scene.add(gridHelper);
      }

      // Clock for animations
      const clock = clockRef.current;
      clock.start();

      const extension = getFileExtension(filePath);
      const fullPath = filePath.startsWith("/") ? filePath : `/${filePath}`;

      const onProgress = (xhr: ProgressEvent) => {
        if (xhr.lengthComputable) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(percent);
        }
      };

      const setupAnimations = (gltf: GLTF, object: THREE.Object3D) => {
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(object);
          mixerRef.current = mixer;
          
          const animStates: AnimationState[] = [];
          const stateNames = ['Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing'];
          const emoteNames = ['Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp'];
          
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            
            // Check if it should loop
            const isEmote = emoteNames.some(e => clip.name.toLowerCase().includes(e.toLowerCase()));
            const isDeathLike = ['death', 'die', 'dead', 'sitting', 'standing'].some(s => 
              clip.name.toLowerCase().includes(s)
            );
            
            if (isEmote || isDeathLike) {
              action.clampWhenFinished = true;
              action.loop = THREE.LoopOnce;
            }
            
            animStates.push({
              name: clip.name,
              action,
              isLooping: !isEmote && !isDeathLike
            });
          });
          
          setAnimations(animStates);
          categorizeAnimations(gltf.animations.map(a => a.name));
          
          // Play first animation by default
          if (animStates.length > 0) {
            const firstAnim = animStates[0];
            firstAnim.action.play();
            setActiveAnimation(firstAnim.name);
          }
        }
      };

      const extractMorphTargets = (object: THREE.Object3D) => {
        const targets: MorphTarget[] = [];
        
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
            const dict = child.morphTargetDictionary;
            Object.entries(dict).forEach(([name, index]) => {
              // Avoid duplicates
              if (!targets.some(t => t.name === name)) {
                targets.push({
                  name,
                  index: index as number,
                  influence: child.morphTargetInfluences?.[index as number] || 0
                });
              }
            });
          }
        });
        
        setMorphTargets(targets);
      };

      const onLoadComplete = (object: THREE.Object3D, gltf?: GLTF) => {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(object);
        modelRef.current = object;
        centerAndScaleModel(object, camera, controls);
        
        // Extract morph targets
        extractMorphTargets(object);
        
        // Setup animations if available
        if (gltf) {
          setupAnimations(gltf, object);
        }
        
        setLoading(false);
        setLoadProgress(100);
        onLoad?.();
      };

      const onLoadError = (err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : "Failed to load model";
        console.error("Model load error:", errorMsg);
        setError(`Failed to load: ${errorMsg}`);
        setLoading(false);
        onError?.(errorMsg);
      };

      // Load model based on extension
      if (extension === "gltf" || extension === "glb") {
        const loader = new GLTFLoader();
        loader.load(
          fullPath,
          (gltf) => onLoadComplete(gltf.scene, gltf),
          onProgress,
          onLoadError
        );
      } else if (extension === "fbx") {
        const loader = new FBXLoader();
        loader.load(
          fullPath,
          (fbx) => {
            // Convert FBX materials to properly lit materials
            fbx.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                const newMaterials = materials.map((mat) => {
                  // Convert to MeshStandardMaterial for proper lighting
                  if (mat instanceof THREE.MeshBasicMaterial || 
                      !(mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial)) {
                    const newMat = new THREE.MeshStandardMaterial({
                      color: mat.color || new THREE.Color(0x888888),
                      map: mat.map || null,
                      roughness: 0.6,
                      metalness: 0.2,
                      side: mat.side || THREE.FrontSide,
                      transparent: mat.transparent || false,
                      opacity: mat.opacity !== undefined ? mat.opacity : 1,
                    });
                    mat.dispose();
                    return newMat;
                  }
                  // Ensure existing materials have proper settings
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.roughness = mat.roughness || 0.6;
                    mat.metalness = mat.metalness || 0.2;
                  }
                  return mat;
                });
                child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
              }
            });
            
            // FBX models might have animations embedded
            if (fbx.animations && fbx.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(fbx);
              mixerRef.current = mixer;
              
              const animStates: AnimationState[] = fbx.animations.map((clip) => {
                const action = mixer.clipAction(clip);
                return { name: clip.name, action, isLooping: true };
              });
              
              setAnimations(animStates);
              if (animStates.length > 0) {
                animStates[0].action.play();
                setActiveAnimation(animStates[0].name);
              }
            }
            onLoadComplete(fbx);
          },
          onProgress,
          onLoadError
        );
      } else {
        // Create placeholder geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xdc2626,
          metalness: 0.3,
          roughness: 0.6
        });
        const cube = new THREE.Mesh(geometry, material);
        onLoadComplete(cube);
      }

      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Update animation mixer
        if (mixerRef.current && isPlaying) {
          mixerRef.current.update(delta);
        }
        
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Resize handling
      const handleResize = () => {
        if (!container) return;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (mixerRef.current) {
          mixerRef.current.stopAllAction();
        }
        controls.dispose();
        renderer.dispose();
        if (container && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "WebGL initialization failed";
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
    }
  }, [filePath, autoRotate, viewportConfig, centerAndScaleModel, onLoad, onError, isPlaying]);

  if (error) {
    return (
      <div 
        className={`${className} flex items-center justify-center bg-black/50 rounded-lg border border-red-900/50`}
        data-testid="viewport-error"
      >
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-400 mb-1">3D Preview Unavailable</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const hasAnimationData = animations.length > 0 || morphTargets.length > 0;

  return (
    <div className={`${className} relative flex flex-col`} data-testid="viewport-container">
      <div 
        ref={containerRef} 
        className="w-full flex-1 min-h-[300px] rounded-lg overflow-hidden"
        data-testid="viewport-canvas"
      />
      
      {loading && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg"
          data-testid="viewport-loading"
        >
          <Loader2 className="h-8 w-8 text-red-500 animate-spin mb-2" />
          <p className="text-sm text-white">Loading model...</p>
          {loadProgress > 0 && loadProgress < 100 && (
            <div className="w-32 h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Camera controls */}
      {showControls && !loading && !error && (
        <div className="absolute top-2 right-2 flex gap-1" data-testid="viewport-controls">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 bg-black/50 hover:bg-black/70"
            onClick={zoomIn}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 bg-black/50 hover:bg-black/70"
            onClick={zoomOut}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 bg-black/50 hover:bg-black/70"
            onClick={resetCamera}
            data-testid="button-reset-camera"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Animation panel */}
      {showAnimationPanel && hasAnimationData && !loading && !error && (
        <div className="mt-2 bg-black/80 rounded-lg p-3 border border-gray-800" data-testid="animation-panel">
          <Tabs defaultValue="states" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8 bg-gray-900">
              <TabsTrigger value="states" className="text-xs" data-testid="tab-states">
                States {states.length > 0 && `(${states.length})`}
              </TabsTrigger>
              <TabsTrigger value="emotes" className="text-xs" data-testid="tab-emotes">
                Emotes {emotes.length > 0 && `(${emotes.length})`}
              </TabsTrigger>
              <TabsTrigger value="expressions" className="text-xs" data-testid="tab-expressions">
                Expressions {morphTargets.length > 0 && `(${morphTargets.length})`}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="states" className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={togglePlayPause}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                
                <Select
                  value={activeAnimation || undefined}
                  onValueChange={(value) => fadeToAction(value)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1" data-testid="select-animation">
                    <SelectValue placeholder="Select animation" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state} className="text-xs">
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">Speed:</span>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={handleSpeedChange}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="flex-1"
                  data-testid="slider-speed"
                />
                <span className="text-xs text-gray-400 w-8">{animationSpeed.toFixed(1)}x</span>
              </div>
            </TabsContent>
            
            <TabsContent value="emotes" className="mt-2">
              {emotes.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {emotes.map((emote) => (
                    <Button
                      key={emote}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => playEmote(emote)}
                      data-testid={`button-emote-${emote}`}
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      {emote}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No emotes available</p>
              )}
            </TabsContent>
            
            <TabsContent value="expressions" className="mt-2">
              {morphTargets.length > 0 ? (
                <ScrollArea className="h-32">
                  <div className="space-y-2 pr-4">
                    {morphTargets.map((target, index) => (
                      <div key={target.name} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-24 truncate" title={target.name}>
                          {target.name}
                        </span>
                        <Slider
                          value={[target.influence]}
                          onValueChange={(v) => updateMorphTarget(index, v[0])}
                          min={0}
                          max={1}
                          step={0.01}
                          className="flex-1"
                          data-testid={`slider-morph-${target.name}`}
                        />
                        <span className="text-xs text-gray-400 w-8">
                          {(target.influence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-xs text-gray-500">No morph targets available</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

interface ImageViewportProps {
  src: string;
  alt?: string;
  className?: string;
}

export function ImageViewport({ src, alt = "Asset preview", className = "" }: ImageViewportProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullSrc = src.startsWith("/") ? src : `/${src}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px", threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`${className} relative bg-black/50 rounded-lg overflow-hidden flex items-center justify-center`}
      data-testid="image-viewport"
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
        </div>
      )}
      
      {error ? (
        <div className="flex flex-col items-center justify-center p-4">
          <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
          <p className="text-xs text-muted-foreground">Failed to load image</p>
        </div>
      ) : isInView ? (
        <img
          src={fullSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          data-testid="img-asset-preview"
        />
      ) : null}
    </div>
  );
}

interface CanvasViewportProps {
  src: string;
  width?: number;
  height?: number;
  className?: string;
}

export function CanvasViewport({ src, width = 256, height = 256, className = "" }: CanvasViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const fullSrc = src.startsWith("/") ? src : `/${src}`;
    
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);
      
      const scale = Math.min(width / img.width, height / img.height) * 0.9;
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;
      
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, drawWidth + 4, drawHeight + 4);
      
      setLoaded(true);
    };

    img.onerror = () => {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#dc2626";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Failed to load", width / 2, height / 2);
      setError(true);
    };

    img.src = fullSrc;
  }, [src, width, height]);

  return (
    <div 
      className={`${className} relative rounded-lg overflow-hidden`}
      data-testid="canvas-viewport"
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
        data-testid="canvas-asset"
      />
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
