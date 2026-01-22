import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { Link } from "wouter";
import * as THREE from "three";

export default function FlightSimulatorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [altitude, setAltitude] = useState(0);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (!isPlaying || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 50, 100);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    const waterGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x001e0f,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    water.receiveShadow = true;
    scene.add(water);

    const helipadGeometry = new THREE.BoxGeometry(10, 1, 10);
    const helipadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const helipads: THREE.Mesh[] = [];
    
    for (let i = 0; i < 8; i++) {
      const helipad = new THREE.Mesh(helipadGeometry, helipadMaterial);
      helipad.position.set(
        (Math.random() - 0.5) * 400,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 400
      );
      helipad.receiveShadow = true;
      helipad.castShadow = true;
      scene.add(helipad);
      helipads.push(helipad);

      const markerGeometry = new THREE.RingGeometry(2, 3, 32);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.51;
      helipad.add(marker);
    }

    const heliGroup = new THREE.Group();
    heliGroup.position.set(0, 20, 0);
    scene.add(heliGroup);

    const bodyGeometry = new THREE.SphereGeometry(1.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    heliGroup.add(body);

    const tailGeometry = new THREE.BoxGeometry(0.3, 0.3, 4);
    const tailMesh = new THREE.Mesh(tailGeometry, bodyMaterial);
    tailMesh.position.z = 2.5;
    tailMesh.castShadow = true;
    heliGroup.add(tailMesh);

    const tailFinGeometry = new THREE.BoxGeometry(1, 0.8, 0.1);
    const tailFin = new THREE.Mesh(tailFinGeometry, bodyMaterial);
    tailFin.position.z = 4.5;
    tailFin.castShadow = true;
    heliGroup.add(tailFin);

    const skidGeometry = new THREE.BoxGeometry(0.15, 0.1, 2.5);
    const skidMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const leftSkid = new THREE.Mesh(skidGeometry, skidMaterial);
    leftSkid.position.set(-1, -1.2, 0);
    leftSkid.castShadow = true;
    heliGroup.add(leftSkid);

    const rightSkid = new THREE.Mesh(skidGeometry, skidMaterial);
    rightSkid.position.set(1, -1.2, 0);
    rightSkid.castShadow = true;
    heliGroup.add(rightSkid);

    const rotorGeometry = new THREE.BoxGeometry(8, 0.05, 0.3);
    const rotorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const mainRotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
    mainRotor.position.y = 1.6;
    mainRotor.castShadow = true;
    heliGroup.add(mainRotor);

    const rotor2 = new THREE.Mesh(rotorGeometry, rotorMaterial);
    rotor2.rotation.y = Math.PI / 2;
    mainRotor.add(rotor2);

    const tailRotorGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.15);
    const tailRotor = new THREE.Mesh(tailRotorGeometry, rotorMaterial);
    tailRotor.position.set(0.5, 0.4, 4.5);
    tailRotor.rotation.z = Math.PI / 2;
    tailRotor.castShadow = true;
    heliGroup.add(tailRotor);

    const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff, 
      transparent: true, 
      opacity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.3, -0.8);
    cockpit.rotation.x = Math.PI / 4;
    heliGroup.add(cockpit);

    const velocity = new THREE.Vector3(0, 0, 0);
    const angularVelocity = new THREE.Vector3(0, 0, 0);
    let thrust = 0;
    const gravity = -9.8;
    const liftFactor = 2.0;
    const dragFactor = 0.98;
    const angularDrag = 0.95;

    const keyState: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keyState[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyState[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const chaseCamOffset = new THREE.Vector3(0, 8, 25);
    const chaseCamLookOffset = new THREE.Vector3(0, 0, -10);

    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      if (keyState["KeyW"] || keyState["ArrowUp"]) {
        thrust = Math.min(thrust + 15 * delta, 25);
      } else if (keyState["KeyS"] || keyState["ArrowDown"]) {
        thrust = Math.max(thrust - 15 * delta, 0);
      } else {
        thrust *= 0.99;
      }

      if (keyState["KeyA"]) {
        angularVelocity.y += 2 * delta;
      }
      if (keyState["KeyD"]) {
        angularVelocity.y -= 2 * delta;
      }

      if (keyState["Numpad8"] || keyState["KeyI"]) {
        angularVelocity.x -= 1.5 * delta;
      }
      if (keyState["Numpad5"] || keyState["KeyK"]) {
        angularVelocity.x += 1.5 * delta;
      }

      if (keyState["Numpad4"] || keyState["KeyJ"]) {
        angularVelocity.z += 1.5 * delta;
      }
      if (keyState["Numpad6"] || keyState["KeyL"]) {
        angularVelocity.z -= 1.5 * delta;
      }

      angularVelocity.multiplyScalar(angularDrag);
      heliGroup.rotation.x += angularVelocity.x * delta;
      heliGroup.rotation.y += angularVelocity.y * delta;
      heliGroup.rotation.z += angularVelocity.z * delta;

      heliGroup.rotation.x = Math.max(-0.5, Math.min(0.5, heliGroup.rotation.x));
      heliGroup.rotation.z = Math.max(-0.5, Math.min(0.5, heliGroup.rotation.z));

      const lift = thrust * liftFactor;
      const liftForce = new THREE.Vector3(0, lift, 0);
      liftForce.applyQuaternion(heliGroup.quaternion);

      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(heliGroup.quaternion);
      const tiltForce = forward.multiplyScalar(-heliGroup.rotation.x * thrust * 0.5);

      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(heliGroup.quaternion);
      const bankForce = right.multiplyScalar(heliGroup.rotation.z * thrust * 0.5);

      velocity.add(liftForce.multiplyScalar(delta));
      velocity.add(tiltForce.multiplyScalar(delta));
      velocity.add(bankForce.multiplyScalar(delta));
      velocity.y += gravity * delta;

      velocity.multiplyScalar(dragFactor);

      heliGroup.position.add(velocity.clone().multiplyScalar(delta * 10));

      if (heliGroup.position.y < 2) {
        heliGroup.position.y = 2;
        velocity.y = Math.max(0, velocity.y);
        velocity.multiplyScalar(0.8);
      }

      if (heliGroup.position.y > 300) {
        heliGroup.position.y = 300;
        velocity.y = Math.min(0, velocity.y);
      }

      mainRotor.rotation.y += (thrust * 2 + 5) * delta;
      tailRotor.rotation.x += (thrust * 3 + 8) * delta;

      const idealOffset = chaseCamOffset.clone();
      idealOffset.applyQuaternion(heliGroup.quaternion);
      idealOffset.add(heliGroup.position);

      camera.position.lerp(idealOffset, 0.05);

      const lookTarget = heliGroup.position.clone();
      const lookOffset = chaseCamLookOffset.clone();
      lookOffset.applyQuaternion(heliGroup.quaternion);
      lookTarget.add(lookOffset);
      camera.lookAt(lookTarget);

      directionalLight.position.copy(heliGroup.position).add(new THREE.Vector3(50, 50, 25));
      directionalLight.target.position.copy(heliGroup.position);

      const time = clock.elapsedTime;
      const positions = waterGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const y = Math.sin(x * 0.05 + time) * 0.5 + 
                  Math.sin(z * 0.05 + time * 0.8) * 0.5 +
                  Math.sin((x + z) * 0.03 + time * 1.2) * 0.3;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      waterGeometry.computeVertexNormals();

      setAltitude(Math.round(heliGroup.position.y));
      setSpeed(Math.round(velocity.length() * 10));

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isPlaying]);

  if (!webglSupported) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md">
          <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">WebGL Not Supported</h2>
          <p className="text-muted-foreground mb-4">
            Your browser doesn't support WebGL which is required for 3D graphics.
          </p>
          <Button asChild>
            <Link href="/">Go Back</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4 bg-[#171312]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Helicopter Flight Simulator
              </h1>
              <p className="text-sm text-muted-foreground">
                3D helicopter physics with water simulation
              </p>
            </div>
          </div>
          {isPlaying && (
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="game-hud">
                ALT: {altitude}m
              </Badge>
              <Badge variant="outline" className="game-hud">
                SPD: {speed} km/h
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative" ref={containerRef}>
        {!isPlaying ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]">
            <Card className="p-8 text-center max-w-lg bg-background/90 backdrop-blur">
              <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Helicopter Flight Simulator</h2>
              <p className="text-muted-foreground mb-6">
                Fly a helicopter over the ocean! Land on the floating helipads to score points.
              </p>
              <div className="grid grid-cols-2 gap-4 text-left mb-6 text-sm">
                <div>
                  <p className="font-semibold mb-1">Throttle</p>
                  <p className="text-muted-foreground">W/S or Arrow Up/Down</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Yaw (Turn)</p>
                  <p className="text-muted-foreground">A/D keys</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Pitch</p>
                  <p className="text-muted-foreground">I/K or Numpad 8/5</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Bank (Roll)</p>
                  <p className="text-muted-foreground">J/L or Numpad 4/6</p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => setIsPlaying(true)}
                data-testid="button-start-flight"
              >
                Start Flying
              </Button>
            </Card>
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <Card className="p-3 game-container backdrop-blur text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 game-text">
                <span className="text-muted-foreground">Throttle:</span>
                <span>W/S</span>
                <span className="text-muted-foreground">Yaw:</span>
                <span>A/D</span>
                <span className="text-muted-foreground">Pitch:</span>
                <span>I/K</span>
                <span className="text-muted-foreground">Bank:</span>
                <span>J/L</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
