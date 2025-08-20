import * as THREE from "three";
import { Particle } from "./types";

let particleIdCounter = 0;

export const createParticleGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.SphereGeometry(2, 8, 8);
  return geometry;
};

export const createParticleMaterial = (): THREE.MeshBasicMaterial => {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.8,
    color: 0xffffff,
  });
};

export const createParticle = (
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  color: THREE.Color,
  scene: THREE.Scene,
  geometry: THREE.BufferGeometry,
  material: THREE.MeshBasicMaterial,
): Particle => {
  const particleMaterial = material.clone();
  particleMaterial.color = color.clone();

  const mesh = new THREE.Mesh(geometry, particleMaterial);
  mesh.position.copy(position);
  scene.add(mesh);

  return {
    id: particleIdCounter++,
    position: position.clone(),
    velocity: velocity.clone(),
    life: 1.0,
    maxLife: 1.0,
    size: Math.random() * 1.5 + 1.0,
    color: color.clone(),
    mesh,
  };
};

export const spawnParticlesFromFish = (
  fishPosition: THREE.Vector3,
  fishVelocity: THREE.Vector3,
  fishColor: THREE.Color,
  scene: THREE.Scene,
  geometry: THREE.BufferGeometry,
  material: THREE.MeshBasicMaterial,
  particles: Particle[],
): void => {
  // 魚の速度が十分にある場合のみパーティクルを生成
  if (fishVelocity.length() < 0.5) return;

  const particleCount = Math.floor(Math.random() * 2) + 1; // 1-2個のパーティクル

  for (let i = 0; i < particleCount; i++) {
    // 魚の後ろの位置を計算
    const backwardDirection = fishVelocity
      .clone()
      .normalize()
      .multiplyScalar(-10);
    const particlePosition = fishPosition.clone().add(backwardDirection);

    // ランダムな散らばりを追加
    particlePosition.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4,
      ),
    );

    // パーティクルの初期速度（魚の速度の逆方向 + ランダム）
    const particleVelocity = new THREE.Vector3(
      fishVelocity.x * -0.3 + (Math.random() - 0.5) * 0.5,
      fishVelocity.y * -0.3 + (Math.random() - 0.5) * 0.5,
      fishVelocity.z * -0.3 + (Math.random() - 0.5) * 0.2,
    );

    // 色に少しバリエーションを追加（明るくする）
    const particleColor = fishColor.clone();
    particleColor.offsetHSL(0, 0.2, 0.3); // 彩度と明度を上げる

    const particle = createParticle(
      particlePosition,
      particleVelocity,
      particleColor,
      scene,
      geometry,
      material,
    );

    particles.push(particle);
  }
};

export const updateParticles = (
  particles: Particle[],
  scene: THREE.Scene,
): void => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    // 寿命を減らす（より早く消える）
    particle.life -= 0.03;

    if (particle.life <= 0) {
      // パーティクルを削除
      if (particle.mesh) {
        scene.remove(particle.mesh);
        if (particle.mesh.material instanceof THREE.Material) {
          particle.mesh.material.dispose();
        }
      }
      particles.splice(i, 1);
      continue;
    }

    // 位置を更新
    particle.position.add(particle.velocity);

    // 速度に減衰を適用
    particle.velocity.multiplyScalar(0.97);

    // 重力効果を追加
    particle.velocity.y -= 0.01;

    // メッシュの位置とスケールを更新
    if (particle.mesh) {
      particle.mesh.position.copy(particle.position);

      // 寿命に基づいてサイズと透明度を調整
      const lifeRatio = particle.life / particle.maxLife;
      const scale = particle.size * lifeRatio;
      particle.mesh.scale.set(scale, scale, scale);

      if (particle.mesh.material instanceof THREE.MeshBasicMaterial) {
        particle.mesh.material.opacity = 0.9 * lifeRatio;
      }
    }
  }
};
