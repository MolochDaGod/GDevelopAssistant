import * as THREE from 'three';
import { HEALTH_BAR_CONFIG } from '../core/constants';

export interface HealthBarConfig {
  width?: number;
  height?: number;
  offsetY?: number;
  backgroundColor?: number;
  fillColor?: number;
  borderColor?: number;
  showBorder?: boolean;
}

export interface HealthBar {
  group: THREE.Group;
  background: THREE.Mesh;
  fill: THREE.Mesh;
  border?: THREE.LineSegments;
  update: (currentHealth: number, maxHealth: number) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

export function createHealthBar(config: HealthBarConfig = {}): HealthBar {
  const {
    width = HEALTH_BAR_CONFIG.width,
    height = HEALTH_BAR_CONFIG.height,
    offsetY = HEALTH_BAR_CONFIG.offsetY,
    backgroundColor = HEALTH_BAR_CONFIG.backgroundColor,
    fillColor = HEALTH_BAR_CONFIG.fillColorAlly,
    showBorder = false,
  } = config;

  const group = new THREE.Group();
  group.position.y = offsetY;

  const bgGeometry = new THREE.PlaneGeometry(width, height);
  const bgMaterial = new THREE.MeshBasicMaterial({ 
    color: backgroundColor,
    side: THREE.DoubleSide,
  });
  const background = new THREE.Mesh(bgGeometry, bgMaterial);
  background.name = 'healthBg';
  group.add(background);

  const fillGeometry = new THREE.PlaneGeometry(width - 0.02, height - 0.02);
  const fillMaterial = new THREE.MeshBasicMaterial({ 
    color: fillColor,
    side: THREE.DoubleSide,
  });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.position.z = 0.01;
  fill.name = 'healthFill';
  group.add(fill);

  let border: THREE.LineSegments | undefined;
  if (showBorder) {
    const borderGeometry = new THREE.EdgesGeometry(bgGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.position.z = 0.02;
    group.add(border);
  }

  const update = (currentHealth: number, maxHealth: number) => {
    const percent = Math.max(0, Math.min(1, currentHealth / maxHealth));
    fill.scale.x = percent;
    fill.position.x = -(1 - percent) * (width - 0.02) * 0.5;

    if (percent > 0.5) {
      (fill.material as THREE.MeshBasicMaterial).color.setHex(0x44ff44);
    } else if (percent > 0.25) {
      (fill.material as THREE.MeshBasicMaterial).color.setHex(0xffff44);
    } else {
      (fill.material as THREE.MeshBasicMaterial).color.setHex(0xff4444);
    }
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
  };

  const dispose = () => {
    bgGeometry.dispose();
    bgMaterial.dispose();
    fillGeometry.dispose();
    fillMaterial.dispose();
    if (border) {
      border.geometry.dispose();
      (border.material as THREE.LineBasicMaterial).dispose();
    }
  };

  return {
    group,
    background,
    fill,
    border,
    update,
    setVisible,
    dispose,
  };
}

export function updateEntityHealthBar(entity: THREE.Object3D, health: number, maxHealth: number): void {
  const healthFill = entity.getObjectByName('healthFill') as THREE.Mesh;
  if (!healthFill) return;

  const width = 1.2;
  const percent = Math.max(0, Math.min(1, health / maxHealth));
  healthFill.scale.x = percent;
  healthFill.position.x = -(1 - percent) * (width - 0.02) * 0.5;

  const material = healthFill.material as THREE.MeshBasicMaterial;
  if (percent > 0.5) {
    material.color.setHex(0x44ff44);
  } else if (percent > 0.25) {
    material.color.setHex(0xffff44);
  } else {
    material.color.setHex(0xff4444);
  }
}
