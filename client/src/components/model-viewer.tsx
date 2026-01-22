import { useEffect, useRef, useState } from "react";
import { lazy, Suspense } from "react";

interface ModelViewerProps {
  className?: string;
}

export function ModelViewer({ className }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    let animationFrameId: number;

    // Dynamic import for THREE.js to reduce initial bundle size
    (async () => {
      try {
        const THREE = await import("three");
        
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        // Renderer - try to create with fallback
        let renderer: THREE.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true });
        } catch (e) {
          // WebGL not available, try without antialiasing
          renderer = new THREE.WebGLRenderer({ antialias: false });
        }
        
        renderer.setSize(width, height);
        rendererRef.current = renderer;
        if (containerRef.current) {
          containerRef.current.appendChild(renderer.domElement);
        }

        // Create a simple 3D model (cube as placeholder)
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
          color: 0x6366f1,
          shininess: 100,
          specular: 0x444444,
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // Add edges to make it more visible
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x8b8bf1 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        cube.add(wireframe);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Animation
        const animate = () => {
          animationFrameId = requestAnimationFrame(animate);

          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;

          renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current) return;
          const newWidth = containerRef.current.clientWidth;
          const newHeight = containerRef.current.clientHeight;

          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        };

        window.addEventListener("resize", handleResize);

        // Cleanup
        return () => {
          window.removeEventListener("resize", handleResize);
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          renderer.dispose();
          if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };
      } catch (error) {
        console.error("Failed to initialize 3D viewer:", error);
        setError("3D preview is not available in this environment. WebGL is required.");
      }
    })();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-lg`}>
        <div className="text-center p-6">
          <p className="text-sm text-muted-foreground mb-2">3D Preview Unavailable</p>
          <p className="text-xs text-muted-foreground">
            WebGL is not supported in your browser
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} data-testid="canvas-3d-viewer" />;
}
