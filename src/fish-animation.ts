import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Fish } from "./types";
import fishModelUrl from "./fish.glb";

export const loadFishModel = async (): Promise<THREE.Group | null> => {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(fishModelUrl);
    const fishModel = gltf.scene;
    fishModel.scale.set(100, 100, 100);
    return fishModel;
  } catch (error) {
    console.error("Error loading fish model:", error);
    return null;
  }
};

export const initializeFish = (fishModel: THREE.Group, scene: THREE.Scene): Fish[] => {
  if (!fishModel) return [];

  return Array.from({ length: 32 }, (_, i) => {
    const fishClone = fishModel.clone();
    const fish: Fish = {
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400,
        Math.random() * 100 - 50
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 1
      ),
      mesh: fishClone,
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
    };

    fishClone.position.copy(fish.position);
    scene.add(fishClone);
    return fish;
  });
};

export const applyBoidRules = (
  fish: Fish, 
  neighbors: Fish[], 
  mousePosition: { x: number; y: number }
): THREE.Vector3 => {
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
    const diff = new THREE.Vector3().subVectors(fish.position, neighbor.position);

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
    mousePosition.x - window.innerWidth / 2,
    -(mousePosition.y - window.innerHeight / 2),
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
};

export const updateFishAnimation = (fishes: Fish[], mousePosition: { x: number; y: number }): void => {
  fishes.forEach((fish) => {
    if (!fish.mesh) return;

    const boidForce = applyBoidRules(fish, fishes, mousePosition);

    fish.velocity.add(boidForce);

    // ランダムな動きを追加
    fish.velocity.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.005
      )
    );

    // 速度制限
    const maxSpeed = 5;
    if (fish.velocity.length() > maxSpeed) {
      fish.velocity.normalize().multiplyScalar(maxSpeed);
    }

    // 減衰
    fish.velocity.multiplyScalar(0.98);

    // 位置更新
    fish.position.add(fish.velocity);

    // 境界処理
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    if (fish.position.x < -halfWidth || fish.position.x > halfWidth) {
      fish.velocity.x *= -0.8;
      fish.position.x = Math.max(-halfWidth, Math.min(halfWidth, fish.position.x));
    }
    if (fish.position.y < -halfHeight || fish.position.y > halfHeight) {
      fish.velocity.y *= -0.8;
      fish.position.y = Math.max(-halfHeight, Math.min(halfHeight, fish.position.y));
    }
    if (fish.position.z < -100 || fish.position.z > 100) {
      fish.velocity.z *= -0.8;
      fish.position.z = Math.max(-100, Math.min(100, fish.position.z));
    }

    // メッシュ位置更新
    fish.mesh.position.copy(fish.position);

    // 魚の向き調整
    if (fish.velocity.length() > 0.01) {
      const direction = fish.velocity.clone().normalize();
      const targetPos = fish.position.clone().add(direction);
      fish.mesh.lookAt(targetPos);
      fish.mesh.rotateY(-Math.PI / 2);
    }
  });
};