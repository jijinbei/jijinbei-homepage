import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import fishModelUrl from "./fish.glb";

interface Fish {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Group | null;
  color: THREE.Color;
}

interface Star {
  x: number;
  y: number;
  opacity: number;
  baseOpacity: number;
  twinklePhase: number;
}

const ThreeFishScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const cameraRef = useRef<THREE.OrthographicCamera | undefined>(undefined);
  const animationRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fishesRef = useRef<Fish[]>([]);
  const fishModelRef = useRef<THREE.Group | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);

  const initializeStars = useCallback(() => {
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      opacity: 0.2 + Math.random() * 0.3,
      baseOpacity: 0.2 + Math.random() * 0.3,
      twinklePhase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const drawStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    starsRef.current.forEach((star) => {
      star.twinklePhase += 0.02;
      star.opacity = star.baseOpacity + Math.sin(star.twinklePhase) * 0.1;
      ctx.globalAlpha = star.opacity;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(star.x, star.y, 1, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const loadFishModel = useCallback(async () => {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(fishModelUrl);
      fishModelRef.current = gltf.scene;

      fishModelRef.current.scale.set(100, 100, 100);

      initializeFish();
    } catch (error) {
      console.error("Error loading fish model:", error);
    }
  }, []);

  const initializeFish = useCallback(() => {
    if (!fishModelRef.current || !sceneRef.current) return;

    fishesRef.current = Array.from({ length: 32 }, (_, i) => {
      const fishClone = fishModelRef.current!.clone();
      const fish: Fish = {
        id: i,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 400,
          (Math.random() - 0.5) * 400,
          Math.random() * 100 - 50
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5
        ),
        mesh: fishClone,
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      };

      fishClone.position.copy(fish.position);

      sceneRef.current!.add(fishClone);
      return fish;
    });
  }, []);

  const applyBoidRules = useCallback((fish: Fish, neighbors: Fish[]) => {
    const separation = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    const mouseAttraction = new THREE.Vector3();

    const separationRadius = 50;
    const alignmentRadius = 80;
    const cohesionRadius = 120;
    const mouseAttractionRadius = 200;

    let separationCount = 0;
    let alignmentCount = 0;
    let cohesionCount = 0;

    neighbors.forEach((neighbor) => {
      if (neighbor.id === fish.id) return;

      const distance = fish.position.distanceTo(neighbor.position);
      const diff = new THREE.Vector3().subVectors(
        fish.position,
        neighbor.position
      );

      if (distance < separationRadius && distance > 0) {
        diff.normalize().divideScalar(distance);
        separation.add(diff);
        separationCount++;
      }

      if (distance < alignmentRadius) {
        alignment.add(neighbor.velocity);
        alignmentCount++;
      }

      if (distance < cohesionRadius) {
        cohesion.add(neighbor.position);
        cohesionCount++;
      }
    });

    const mousePos = new THREE.Vector3(
      mouseRef.current.x - window.innerWidth / 2,
      -(mouseRef.current.y - window.innerHeight / 2),
      0
    );
    const mouseDistance = fish.position.distanceTo(mousePos);

    if (mouseDistance < mouseAttractionRadius && mouseDistance > 0) {
      mouseAttraction
        .subVectors(mousePos, fish.position)
        .normalize()
        .multiplyScalar(0.3);
    }

    if (separationCount > 0) {
      separation.divideScalar(separationCount).normalize().multiplyScalar(0.5);
    }

    if (alignmentCount > 0) {
      alignment.divideScalar(alignmentCount).normalize().multiplyScalar(0.1);
    }

    if (cohesionCount > 0) {
      cohesion
        .divideScalar(cohesionCount)
        .sub(fish.position)
        .normalize()
        .multiplyScalar(0.05);
    }

    return new THREE.Vector3()
      .add(separation)
      .add(alignment)
      .add(cohesion)
      .add(mouseAttraction);
  }, []);

  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    drawStars();

    fishesRef.current.forEach((fish) => {
      if (!fish.mesh) return;

      const boidForce = applyBoidRules(fish, fishesRef.current);

      fish.velocity.add(boidForce);

      fish.velocity.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.005
        )
      );

      const maxSpeed = 3;
      if (fish.velocity.length() > maxSpeed) {
        fish.velocity.normalize().multiplyScalar(maxSpeed);
      }

      fish.velocity.multiplyScalar(0.99);

      fish.position.add(fish.velocity);

      const halfWidth = window.innerWidth / 2;
      const halfHeight = window.innerHeight / 2;

      if (fish.position.x < -halfWidth || fish.position.x > halfWidth) {
        fish.velocity.x *= -0.8;
        fish.position.x = Math.max(
          -halfWidth,
          Math.min(halfWidth, fish.position.x)
        );
      }
      if (fish.position.y < -halfHeight || fish.position.y > halfHeight) {
        fish.velocity.y *= -0.8;
        fish.position.y = Math.max(
          -halfHeight,
          Math.min(halfHeight, fish.position.y)
        );
      }
      if (fish.position.z < -100 || fish.position.z > 100) {
        fish.velocity.z *= -0.8;
        fish.position.z = Math.max(-100, Math.min(100, fish.position.z));
      }

      fish.mesh.position.copy(fish.position);

      if (fish.velocity.length() > 0.01) {
        const direction = fish.velocity.clone().normalize();
        const targetPos = fish.position.clone().add(direction);
        fish.mesh.lookAt(targetPos);
        fish.mesh.rotateY(-Math.PI / 2);
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, [drawStars, applyBoidRules]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      -200,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    mountRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    camera.position.z = 100;

    // 照明を追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.left = width / -2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = height / -2;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);

      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousemove", handleMouseMove);

    initializeStars();
    loadFishModel();

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (mountRef.current && canvasRef.current) {
        mountRef.current.removeChild(canvasRef.current);
      }

      renderer.dispose();
    };
  }, [animate, loadFishModel, initializeStars]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

function App() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <ThreeFishScene />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            JIJINBEI
          </h1>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <a
              href="https://discord.com/users/00027322902642809"
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 border border-gray-600 hover:border-gray-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.120.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discord
            </a>

            <a
              href="https://github.com/jijinbei"
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 border border-gray-600 hover:border-gray-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>

            <a
              href="https://x.com/Hallucigeni"
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 border border-gray-600 hover:border-gray-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              X (Twitter)
            </a>

            <a
              href="https://www.quark.hiroshima-u.ac.jp/member/24nishizaki.html"
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 border border-gray-600 hover:border-gray-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9l-11-6zM18.82 9L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
              </svg>
              Lab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
