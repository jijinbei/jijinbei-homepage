import * as THREE from "three";
import { Particle } from "./types";

interface ParticleData {
  position: Float32Array;
  velocity: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  size: Float32Array;
  color: Float32Array;
}

export class WebGPUParticleSystem {
  private renderer: any;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private particleData: ParticleData;
  private maxParticles: number = 500;
  private activeParticles: number = 0;
  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshBasicMaterial;

  constructor(renderer: any) {
    this.renderer = renderer;

    // パーティクルデータの初期化
    this.particleData = {
      position: new Float32Array(this.maxParticles * 3),
      velocity: new Float32Array(this.maxParticles * 3),
      life: new Float32Array(this.maxParticles),
      maxLife: new Float32Array(this.maxParticles),
      size: new Float32Array(this.maxParticles),
      color: new Float32Array(this.maxParticles * 3),
    };

    // ジオメトリとマテリアルを作成
    this.geometry = new THREE.SphereGeometry(1, 6, 4);
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      color: 0xffffff,
    });
  }

  initialize(scene: THREE.Scene): void {
    // インスタンシングメッシュを作成
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.maxParticles,
    );

    // 色の設定を有効にする
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.maxParticles * 3),
      3,
    );

    // 初期状態では全て非表示
    for (let i = 0; i < this.maxParticles; i++) {
      const matrix = new THREE.Matrix4();
      matrix.makeScale(0, 0, 0); // サイズ0で非表示
      this.instancedMesh.setMatrixAt(i, matrix);

      // 初期色も設定
      this.instancedMesh.setColorAt(i, new THREE.Color(1, 1, 1));
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    scene.add(this.instancedMesh);
  }

  spawnParticle(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: THREE.Color,
  ): void {
    if (this.activeParticles >= this.maxParticles) return;

    const index = this.activeParticles;

    // 位置
    this.particleData.position[index * 3] = position.x;
    this.particleData.position[index * 3 + 1] = position.y;
    this.particleData.position[index * 3 + 2] = position.z;

    // 速度
    this.particleData.velocity[index * 3] = velocity.x;
    this.particleData.velocity[index * 3 + 1] = velocity.y;
    this.particleData.velocity[index * 3 + 2] = velocity.z;

    // ライフ
    this.particleData.life[index] = 1.0;
    this.particleData.maxLife[index] = 1.0;

    // サイズ
    this.particleData.size[index] = Math.random() * 1.2 + 0.8;

    // 色
    this.particleData.color[index * 3] = color.r;
    this.particleData.color[index * 3 + 1] = color.g;
    this.particleData.color[index * 3 + 2] = color.b;

    this.activeParticles++;
  }

  spawnParticlesFromFish(
    fishPosition: THREE.Vector3,
    fishVelocity: THREE.Vector3,
    fishColor: THREE.Color,
  ): void {
    if (fishVelocity.length() < 0.8) return;

    const particleCount = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < particleCount; i++) {
      // 魚の後ろの位置を計算
      const backwardDirection = fishVelocity
        .clone()
        .normalize()
        .multiplyScalar(-15);
      const particlePosition = fishPosition.clone().add(backwardDirection);

      // ランダムな散らばりを追加
      particlePosition.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 5,
        ),
      );

      // パーティクルの初期速度
      const particleVelocity = new THREE.Vector3(
        fishVelocity.x * -0.2 + (Math.random() - 0.5) * 0.3,
        fishVelocity.y * -0.2 + (Math.random() - 0.5) * 0.3,
        fishVelocity.z * -0.2 + (Math.random() - 0.5) * 0.1,
      );

      // カラフルな金砂の色
      const goldColors = [
        new THREE.Color(1.0, 0.8, 0.2), // ゴールド
        new THREE.Color(1.0, 0.6, 0.1), // オレンジゴールド
        new THREE.Color(0.9, 0.7, 0.3), // 薄いゴールド
        new THREE.Color(1.0, 0.9, 0.4), // 明るいゴールド
        new THREE.Color(0.8, 0.5, 0.2), // 銅色
        new THREE.Color(1.0, 0.7, 0.5), // ピーチゴールド
      ];
      const particleColor =
        goldColors[Math.floor(Math.random() * goldColors.length)];

      this.spawnParticle(particlePosition, particleVelocity, particleColor);
    }
  }

  update(): void {
    if (!this.instancedMesh) return;

    let writeIndex = 0;

    // アクティブなパーティクルを更新
    for (let i = 0; i < this.activeParticles; i++) {
      // ライフを減らす
      this.particleData.life[i] -= 0.025;

      if (this.particleData.life[i] > 0) {
        // 生きているパーティクル - 位置を更新
        this.particleData.position[i * 3] += this.particleData.velocity[i * 3];
        this.particleData.position[i * 3 + 1] +=
          this.particleData.velocity[i * 3 + 1];
        this.particleData.position[i * 3 + 2] +=
          this.particleData.velocity[i * 3 + 2];

        // 速度に減衰を適用
        this.particleData.velocity[i * 3] *= 0.96;
        this.particleData.velocity[i * 3 + 1] *= 0.96;
        this.particleData.velocity[i * 3 + 2] *= 0.96;

        // 重力（金砂が落ちる感じ）
        this.particleData.velocity[i * 3 + 1] -= 0.04;

        // データを前に詰める（生きているパーティクル）
        if (writeIndex !== i) {
          this.copyParticleData(i, writeIndex);
        }

        // マトリックスを更新
        const lifeRatio =
          this.particleData.life[writeIndex] /
          this.particleData.maxLife[writeIndex];
        const scale = this.particleData.size[writeIndex] * lifeRatio;

        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(
          this.particleData.position[writeIndex * 3],
          this.particleData.position[writeIndex * 3 + 1],
          this.particleData.position[writeIndex * 3 + 2],
        );
        matrix.scale(new THREE.Vector3(scale, scale, scale));

        this.instancedMesh.setMatrixAt(writeIndex, matrix);
        this.instancedMesh.setColorAt(
          writeIndex,
          new THREE.Color(
            this.particleData.color[writeIndex * 3],
            this.particleData.color[writeIndex * 3 + 1],
            this.particleData.color[writeIndex * 3 + 2],
          ),
        );

        writeIndex++;
      }
    }

    // 残りのインスタンスを非表示に
    for (let i = writeIndex; i < this.activeParticles; i++) {
      const matrix = new THREE.Matrix4();
      matrix.makeScale(0, 0, 0);
      this.instancedMesh.setMatrixAt(i, matrix);
    }

    this.activeParticles = writeIndex;
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private copyParticleData(from: number, to: number): void {
    // 位置
    this.particleData.position[to * 3] = this.particleData.position[from * 3];
    this.particleData.position[to * 3 + 1] =
      this.particleData.position[from * 3 + 1];
    this.particleData.position[to * 3 + 2] =
      this.particleData.position[from * 3 + 2];

    // 速度
    this.particleData.velocity[to * 3] = this.particleData.velocity[from * 3];
    this.particleData.velocity[to * 3 + 1] =
      this.particleData.velocity[from * 3 + 1];
    this.particleData.velocity[to * 3 + 2] =
      this.particleData.velocity[from * 3 + 2];

    // その他
    this.particleData.life[to] = this.particleData.life[from];
    this.particleData.maxLife[to] = this.particleData.maxLife[from];
    this.particleData.size[to] = this.particleData.size[from];

    // 色
    this.particleData.color[to * 3] = this.particleData.color[from * 3];
    this.particleData.color[to * 3 + 1] = this.particleData.color[from * 3 + 1];
    this.particleData.color[to * 3 + 2] = this.particleData.color[from * 3 + 2];
  }

  getActiveParticleCount(): number {
    return this.activeParticles;
  }

  dispose(): void {
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      if (Array.isArray(this.instancedMesh.material)) {
        this.instancedMesh.material.forEach((material) => material.dispose());
      } else {
        this.instancedMesh.material.dispose();
      }
    }
  }
}
