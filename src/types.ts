import * as THREE from "three";

export interface Fish {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Group | null;
  color: THREE.Color;
}

export interface Star {
  x: number;
  y: number;
  opacity: number;
  baseOpacity: number;
  twinklePhase: number;
}

export interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  mesh: THREE.Mesh | null;
}
