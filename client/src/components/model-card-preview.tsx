import { useEffect, useRef, useState, memo } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Loader2, AlertCircle } from "lucide-react";

interface ModelCardPreviewProps {
  modelUrl?: string;
  className?: string;
  autoRotate?: boolean;
  showFallbackIcon?: boolean;
  playAnimations?: boolean;
}

function ModelCardPreviewComponent({
  modelUrl,
  className = "",
  autoRotate = true,
  showFallbackIcon = true,
  playAnimations = true,
}: ModelCardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationFrameRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimation, setHasAnimation] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 200;
    const height = container.clientHeight || 200;

    // Check for WebGL support first
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setError("WebGL not supported");
      setLoading(false);
      return;
    }

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#0a0a0a");

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(2, 1.5, 3);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ 
          antialias: true, 
          alpha: true, 
          powerPreference: "low-power", 
          failIfMajorPerformanceCaveat: false 
        });
      } catch {
        try {
          renderer = new THREE.WebGLRenderer({ 
            antialias: false, 
            alpha: true, 
            failIfMajorPerformanceCaveat: false 
          });
        } catch {
          setError("WebGL context creation failed");
          setLoading(false);
          return;
        }
      }

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 3;
      controls.enableZoom = true;
      controls.zoomSpeed = 1.2;
      controls.minDistance = 0.5;
      controls.maxDistance = 10;
      controls.enablePan = false;

      // Enhanced studio lighting setup for better model visibility
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);

      // Key light (main light source)
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
      keyLight.position.set(5, 10, 7);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      // Fill light (softens shadows)
      const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
      fillLight.position.set(-5, 5, -3);
      scene.add(fillLight);

      // Back light (creates depth/separation)
      const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
      backLight.position.set(0, 8, -8);
      scene.add(backLight);

      // Rim/accent light (crimson theme accent)
      const rimLight = new THREE.DirectionalLight(0xdc2626, 0.6);
      rimLight.position.set(-3, 3, -5);
      scene.add(rimLight);

      // Bottom bounce light
      const bounceLight = new THREE.PointLight(0x666666, 0.5, 10);
      bounceLight.position.set(0, -2, 0);
      scene.add(bounceLight);

      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(10, 10);
      const groundMat = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a, 
        depthWrite: false 
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Clock for animations
      const clock = clockRef.current;
      clock.start();

      const getFileExtension = (path: string): string => {
        const parts = path.split(".");
        return parts[parts.length - 1].toLowerCase();
      };

      const centerAndScaleModel = (object: THREE.Object3D) => {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        object.scale.multiplyScalar(scale);
        
        // Position model with feet on ground
        object.position.x = -center.x * scale;
        object.position.z = -center.z * scale;
        object.position.y = -box.min.y * scale;
        
        camera.position.set(2, 1.2, 2.5);
        camera.lookAt(0, size.y * scale * 0.4, 0);
        controls.target.set(0, size.y * scale * 0.4, 0);
        controls.update();
      };

      const setupAnimations = (gltf: GLTF, object: THREE.Object3D) => {
        if (gltf.animations && gltf.animations.length > 0 && playAnimations) {
          const mixer = new THREE.AnimationMixer(object);
          mixerRef.current = mixer;
          
          // Play first animation (typically idle or default)
          const clip = gltf.animations[0];
          const action = mixer.clipAction(clip);
          action.play();
          setHasAnimation(true);
        }
      };

      const loadModel = () => {
        if (!modelUrl) {
          createPlaceholderModel();
          return;
        }

        const extension = getFileExtension(modelUrl);
        const fullPath = modelUrl.startsWith("/") || modelUrl.startsWith("http") 
          ? modelUrl 
          : `/${modelUrl}`;

        const onLoadComplete = (object: THREE.Object3D, gltf?: GLTF) => {
          object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(object);
          centerAndScaleModel(object);
          
          if (gltf) {
            setupAnimations(gltf, object);
          }
          
          setLoading(false);
        };

        const onLoadError = (err: unknown) => {
          console.error("Model load error:", err);
          setError("Failed to load model");
          createPlaceholderModel();
          setLoading(false);
        };

        if (extension === "gltf" || extension === "glb") {
          const loader = new GLTFLoader();
          loader.load(
            fullPath,
            (gltf) => onLoadComplete(gltf.scene, gltf),
            undefined,
            onLoadError
          );
        } else if (extension === "fbx") {
          const loader = new FBXLoader();
          loader.load(
            fullPath, 
            (fbx) => {
              // Handle FBX animations
              if (fbx.animations && fbx.animations.length > 0 && playAnimations) {
                const mixer = new THREE.AnimationMixer(fbx);
                mixerRef.current = mixer;
                const action = mixer.clipAction(fbx.animations[0]);
                action.play();
                setHasAnimation(true);
              }
              onLoadComplete(fbx);
            }, 
            undefined, 
            onLoadError
          );
        } else {
          createPlaceholderModel();
        }
      };

      const createPlaceholderModel = () => {
        const group = new THREE.Group();

        // Animated cube placeholder
        const cubeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const cubeMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xdc2626,
          metalness: 0.4,
          roughness: 0.5
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(0, 0.6, 0);
        cube.castShadow = true;
        group.add(cube);

        const edges = new THREE.EdgesGeometry(cubeGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xff6666 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        cube.add(wireframe);

        const pyramidGeometry = new THREE.ConeGeometry(0.4, 0.6, 4);
        const pyramidMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x444444,
          metalness: 0.3,
          roughness: 0.7
        });
        const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
        pyramid.position.set(0.6, 0.3, 0.6);
        pyramid.rotation.y = Math.PI / 4;
        pyramid.castShadow = true;
        group.add(pyramid);

        const sphereGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x666666,
          metalness: 0.6,
          roughness: 0.3
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(-0.5, 0.25, 0.5);
        sphere.castShadow = true;
        group.add(sphere);

        scene.add(group);
        setLoading(false);
      };

      loadModel();

      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Update animation mixer
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }
        
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

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
      console.error("WebGL error:", err);
      setError("WebGL not available");
      setLoading(false);
    }
  }, [modelUrl, autoRotate, playAnimations]);

  if (error && showFallbackIcon) {
    return (
      <div 
        className={`${className} flex items-center justify-center bg-muted`}
        data-testid="model-preview-error"
      >
        <div className="text-center p-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${className} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="model-card-preview"
    >
      <div 
        ref={containerRef} 
        className="w-full h-full"
        data-testid="model-preview-canvas"
      />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}

      {isHovered && !loading && (
        <div className="absolute bottom-1 left-1 right-1 text-center">
          <span className="text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded">
            {hasAnimation ? "Animated • Drag to rotate • Scroll to zoom" : "Drag to rotate • Scroll to zoom"}
          </span>
        </div>
      )}
    </div>
  );
}

export const ModelCardPreview = memo(ModelCardPreviewComponent);
