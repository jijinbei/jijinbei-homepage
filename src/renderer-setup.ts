import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { checkWebGPUSupport, logWebGPUCapabilities } from "./webgpu-utils";

export const initializeRenderer = async (): Promise<THREE.WebGLRenderer | any> => {
  const webgpuSupport = await checkWebGPUSupport();
  let renderer: any;

  if (webgpuSupport.supported && webgpuSupport.device) {
    console.log('🚀 WebGPU is supported! Using WebGPU renderer');
    logWebGPUCapabilities(webgpuSupport.adapter!, webgpuSupport.device);
    
    renderer = new WebGPURenderer({ 
      antialias: true,
      alpha: true 
    });
    
    await renderer.init();
  } else {
    console.log('⚠️ WebGPU not supported, falling back to WebGL:', webgpuSupport.reason);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  
  if (renderer instanceof THREE.WebGLRenderer) {
    renderer.setClearColor(0x000000, 0);
  } else {
    renderer.setClearColor(0x000000, 0);
  }

  return renderer;
};

export const setupScene = (): { 
  scene: THREE.Scene; 
  camera: THREE.OrthographicCamera;
} => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    -200,
    1000
  );

  camera.position.z = 100;

  // 照明を追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 3.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  return { scene, camera };
};