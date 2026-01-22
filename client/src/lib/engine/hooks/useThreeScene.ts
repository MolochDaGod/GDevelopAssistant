import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import * as THREE from 'three';
import type { SceneConfig, CameraConfig, LightConfig } from '../core/types';
import { DEFAULT_SCENE_CONFIG, DEFAULT_CAMERA_CONFIG, DEFAULT_LIGHT_CONFIG } from '../core/constants';

export interface UseThreeSceneOptions {
  sceneConfig?: Partial<SceneConfig>;
  cameraConfig?: Partial<CameraConfig>;
  lightConfig?: Partial<LightConfig>;
  onInit?: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => void;
  onResize?: (width: number, height: number) => void;
}

export interface UseThreeSceneReturn {
  containerRef: RefObject<HTMLDivElement>;
  sceneRef: RefObject<THREE.Scene | null>;
  cameraRef: RefObject<THREE.Camera | null>;
  rendererRef: RefObject<THREE.WebGLRenderer | null>;
  isInitialized: boolean;
  error: string | null;
  getSize: () => { width: number; height: number };
}

export function useThreeScene(options: UseThreeSceneOptions = {}): UseThreeSceneReturn {
  const { sceneConfig, cameraConfig, lightConfig, onInit, onResize } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSize = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    return {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = { ...DEFAULT_SCENE_CONFIG, ...sceneConfig };
    const camConfig = { ...DEFAULT_CAMERA_CONFIG, ...cameraConfig };
    const lightCfg = { ...DEFAULT_LIGHT_CONFIG, ...lightConfig };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor);
    
    if (config.fogType === 'linear') {
      scene.fog = new THREE.Fog(config.fogColor!, config.fogNear || 50, config.fogFar || 200);
    } else if (config.fogDensity) {
      scene.fog = new THREE.FogExp2(config.fogColor!, config.fogDensity);
    }
    sceneRef.current = scene;

    const { width, height } = getSize();
    let camera: THREE.Camera;
    
    if (camConfig.type === 'orthographic') {
      const size = camConfig.orthoSize || 50;
      const aspect = width / height;
      camera = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, camConfig.near, camConfig.far);
    } else {
      camera = new THREE.PerspectiveCamera(camConfig.fov, width / height, camConfig.near, camConfig.far);
    }

    const pos = camConfig.position;
    if (Array.isArray(pos)) {
      camera.position.set(pos[0], pos[1], pos[2]);
    } else if (pos) {
      camera.position.copy(pos);
    }

    const lookAt = camConfig.lookAt;
    if (Array.isArray(lookAt)) {
      camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    } else if (lookAt) {
      camera.lookAt(lookAt);
    }
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: config.antialias, 
        failIfMajorPerformanceCaveat: false 
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      if (config.shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      
      if (config.toneMapping) {
        renderer.toneMapping = config.toneMapping;
      }
      if (config.toneMappingExposure) {
        renderer.toneMappingExposure = config.toneMappingExposure;
      }
      
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (err) {
      console.error('WebGL initialization failed:', err);
      setError('WebGL is not available. Please use a browser with WebGL support.');
      return;
    }

    if (lightCfg.ambient) {
      const ambientLight = new THREE.AmbientLight(lightCfg.ambient.color, lightCfg.ambient.intensity);
      scene.add(ambientLight);
    }

    if (lightCfg.directional) {
      const dirLight = new THREE.DirectionalLight(lightCfg.directional.color, lightCfg.directional.intensity);
      dirLight.position.set(...lightCfg.directional.position);
      if (lightCfg.directional.castShadow) {
        dirLight.castShadow = true;
        const size = lightCfg.directional.shadowMapSize || 2048;
        dirLight.shadow.mapSize.width = size;
        dirLight.shadow.mapSize.height = size;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;
      }
      scene.add(dirLight);
    }

    if (lightCfg.hemisphere) {
      const hemiLight = new THREE.HemisphereLight(
        lightCfg.hemisphere.skyColor,
        lightCfg.hemisphere.groundColor,
        lightCfg.hemisphere.intensity
      );
      scene.add(hemiLight);
    }

    if (lightCfg.points) {
      for (const point of lightCfg.points) {
        const pointLight = new THREE.PointLight(point.color, point.intensity, point.distance);
        pointLight.position.set(...point.position);
        scene.add(pointLight);
      }
    }

    onInit?.(scene, camera, renderer);
    setIsInitialized(true);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const { width, height } = getSize();
      
      if (cameraRef.current instanceof THREE.PerspectiveCamera) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      } else if (cameraRef.current instanceof THREE.OrthographicCamera) {
        const size = camConfig.orthoSize || 50;
        const aspect = width / height;
        cameraRef.current.left = -size * aspect;
        cameraRef.current.right = size * aspect;
        cameraRef.current.updateProjectionMatrix();
      }
      
      rendererRef.current.setSize(width, height);
      onResize?.(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement.remove();
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
        sceneRef.current = null;
      }
      
      cameraRef.current = null;
      setIsInitialized(false);
    };
  }, [sceneConfig, cameraConfig, lightConfig, onInit, onResize, getSize]);

  return {
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    sceneRef,
    cameraRef,
    rendererRef,
    isInitialized,
    error,
    getSize,
  };
}
