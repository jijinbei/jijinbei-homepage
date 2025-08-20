import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { Fish, Star } from "../types";
import { initializeStars, drawStars } from "../star-animation";
import { loadFishModel, initializeFish, updateFishAnimation } from "../fish-animation";
import { initializeRenderer, setupScene } from "../renderer-setup";

const ThreeFishScene = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | undefined>(undefined);
  const rendererRef = useRef<THREE.WebGLRenderer | any | undefined>(undefined);
  const cameraRef = useRef<THREE.OrthographicCamera | undefined>(undefined);
  const animationRef = useRef<number | undefined>(undefined);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fishesRef = useRef<Fish[]>([]);
  const fishModelRef = useRef<THREE.Group | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);

  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    drawStars(canvasRef.current, starsRef.current);
    updateFishAnimation(fishesRef.current, mouseRef.current);

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const initializeComponents = useCallback(async () => {
    if (!mountRef.current) return;

    // シーンとカメラのセットアップ
    const { scene, camera } = setupScene();
    sceneRef.current = scene;
    cameraRef.current = camera;

    // レンダラー初期化
    const renderer = await initializeRenderer();
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // 星空キャンバスの作成
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

    // 星とモデルの初期化
    starsRef.current = initializeStars();
    
    const fishModel = await loadFishModel();
    if (fishModel) {
      fishModelRef.current = fishModel;
      fishesRef.current = initializeFish(fishModel, scene);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const setupEventListeners = useCallback(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (cameraRef.current) {
        cameraRef.current.left = width / -2;
        cameraRef.current.right = width / 2;
        cameraRef.current.top = height / 2;
        cameraRef.current.bottom = height / -2;
        cameraRef.current.updateProjectionMatrix();
      }

      if (rendererRef.current) {
        rendererRef.current.setSize(width, height);
      }

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

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const cleanup = setupEventListeners();
    initializeComponents();

    return () => {
      cleanup();

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      if (mountRef.current && canvasRef.current) {
        mountRef.current.removeChild(canvasRef.current);
      }

      rendererRef.current?.dispose();
    };
  }, [initializeComponents, setupEventListeners]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export default ThreeFishScene;