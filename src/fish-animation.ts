import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Fish } from "./types";
import fishModelUrl from "./fish.glb";
import { WebGPUParticleSystem } from "./webgpu-particle-system";

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

export const initializeFish = (
  fishModel: THREE.Group,
  scene: THREE.Scene,
): Fish[] => {
  if (!fishModel) return [];

  return Array.from({ length: 16 }, (_, i) => {
    const fishClone = fishModel.clone();

    // 3つの小さなクラスターに分散
    const clusterId = Math.floor(i / 6); // 0, 1, 2
    const clusterCenters = [
      { x: -150, y: -100, z: 0 }, // 左下クラスター
      { x: 100, y: 50, z: 20 }, // 右上クラスター
      { x: 0, y: -150, z: -30 }, // 中央下クラスター
    ];

    const center = clusterCenters[clusterId] || clusterCenters[0];

    const fish: Fish = {
      id: i,
      position: new THREE.Vector3(
        center.x + (Math.random() - 0.5) * 120,
        center.y + (Math.random() - 0.5) * 120,
        center.z + (Math.random() - 0.5) * 40,
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2 + (clusterId * 0.5 - 0.5), // クラスター別の傾向
        (Math.random() - 0.5) * 2 + Math.sin(clusterId) * 0.5,
        (Math.random() - 0.5) * 0.5,
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
  mousePosition: { x: number; y: number },
): THREE.Vector3 => {
  const separation = new THREE.Vector3();
  const alignment = new THREE.Vector3();
  const cohesion = new THREE.Vector3();
  const mouseAttraction = new THREE.Vector3();

  const separationRadius = 30; // より近くで分離
  const alignmentRadius = 60; // 中距離で方向を合わせる
  const cohesionRadius = 80; // やや遠くで集まる
  const mouseAttractionRadius = 150;

  // 距離の二乗で比較（平方根計算を避ける）
  const separationRadiusSq = separationRadius * separationRadius;
  const alignmentRadiusSq = alignmentRadius * alignmentRadius;
  const cohesionRadiusSq = cohesionRadius * cohesionRadius;

  let separationCount = 0;
  let alignmentCount = 0;
  let cohesionCount = 0;

  neighbors.forEach((neighbor) => {
    if (neighbor.id === fish.id) return;

    const diff = new THREE.Vector3().subVectors(
      fish.position,
      neighbor.position,
    );
    const distanceSquared = diff.lengthSq(); // 平方根計算を避ける

    if (distanceSquared < separationRadiusSq && distanceSquared > 0) {
      const distance = Math.sqrt(distanceSquared);
      diff.normalize().divideScalar(distance);
      separation.add(diff);
      separationCount++;
    }

    if (distanceSquared < alignmentRadiusSq) {
      alignment.add(neighbor.velocity);
      alignmentCount++;
    }

    if (distanceSquared < cohesionRadiusSq) {
      cohesion.add(neighbor.position);
      cohesionCount++;
    }
  });

  const mousePos = new THREE.Vector3(
    mousePosition.x - window.innerWidth / 2,
    -(mousePosition.y - window.innerHeight / 2),
    0,
  );
  const mouseDistance = fish.position.distanceTo(mousePos);

  if (mouseDistance < mouseAttractionRadius && mouseDistance > 0) {
    mouseAttraction
      .subVectors(mousePos, fish.position)
      .normalize()
      .multiplyScalar(0.3);
  }

  if (separationCount > 0) {
    separation.divideScalar(separationCount).normalize().multiplyScalar(1.2); // 分離をさらに強化
  }

  if (alignmentCount > 0) {
    alignment.divideScalar(alignmentCount).normalize().multiplyScalar(0.15); // 整列を弱める
  }

  if (cohesionCount > 0) {
    cohesion
      .divideScalar(cohesionCount)
      .sub(fish.position)
      .normalize()
      .multiplyScalar(0.03); // 結束を弱める
  }

  return new THREE.Vector3()
    .add(separation)
    .add(alignment)
    .add(cohesion)
    .add(mouseAttraction);
};

export const updateFishAnimation = (
  fishes: Fish[],
  mousePosition: { x: number; y: number },
  particleSystem: WebGPUParticleSystem,
): void => {
  fishes.forEach((fish) => {
    if (!fish.mesh) return;

    const boidForce = applyBoidRules(fish, fishes, mousePosition);

    fish.velocity.add(boidForce);

    // ランダムな動きを追加（群れを分散させるため）
    fish.velocity.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.008,
      ),
    );

    // 速度制限
    const maxSpeed = 5;
    const minSpeed = 0.8;

    if (fish.velocity.length() > maxSpeed) {
      fish.velocity.normalize().multiplyScalar(maxSpeed);
    } else if (fish.velocity.length() < minSpeed) {
      // 最低速度を保つ
      fish.velocity.normalize().multiplyScalar(minSpeed);
    }

    // 減衰
    fish.velocity.multiplyScalar(0.999);

    // 位置更新
    const oldPosition = fish.position.clone();
    fish.position.add(fish.velocity);

    // パーティクル生成（確率的に）
    if (Math.random() < 0.4 && fish.velocity.length() > 1.0) {
      particleSystem.spawnParticlesFromFish(
        oldPosition,
        fish.velocity,
        fish.color,
      );
    }

    // 境界処理
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    if (fish.position.x < -halfWidth || fish.position.x > halfWidth) {
      fish.velocity.x *= -0.8;
      fish.position.x = Math.max(
        -halfWidth,
        Math.min(halfWidth, fish.position.x),
      );
    }
    if (fish.position.y < -halfHeight || fish.position.y > halfHeight) {
      fish.velocity.y *= -0.8;
      fish.position.y = Math.max(
        -halfHeight,
        Math.min(halfHeight, fish.position.y),
      );
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
