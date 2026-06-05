import * as THREE from 'three';
import { GalleryItem } from './GalleryItem.js';
import { SpiralPath }  from './SpiralPath.js';

const POOL_SIZE        = 30;
const PIXELS_PER_CYCLE = 2400;

// Scale spiral radius + item sizes with viewport aspect ratio.
// At 1.6:1 (typical desktop) scale=1; narrows smoothly toward portrait.
function responsiveScale(aspect) {
  return Math.min(1, Math.max(0.38, aspect * 0.78));
}

export class Gallery {
  constructor(scene, camera, textures) {
    this._scene           = scene;
    this._camera          = camera;
    this._textures        = textures;
    this._path            = new SpiralPath();
    this._items           = [];
    this._responsiveScale = 1;

    this._camera.position.set(0, 0, this._path.camZ);
    this._camera.lookAt(0, 0, 0);

    this._init();
  }

  resize(width, height) {
    const scale = responsiveScale(width / height);
    this._responsiveScale = scale;
    this._path.radius  = 1.4 * scale;
    this._path.zOffset = 0.35 * scale;
  }

  _init() {
    const { yFar, yRange } = this._path;
    const ySpacing = yRange / POOL_SIZE;

    for (let i = 0; i < POOL_SIZE; i++) {
      const tex  = this._textures[i % this._textures.length];
      const item = new GalleryItem(tex, this._scene);
      item._y = yFar + i * ySpacing;
      this._items.push(item);
    }
  }

  update(scrollOffset, velocity = 0) {
    const { yFar, yRange } = this._path;
    const totalY = (scrollOffset / PIXELS_PER_CYCLE) * yRange;
    const rs = this._responsiveScale;

    this._items.forEach((item) => {
      const rawY    = item._y + totalY;
      const wrapped = ((rawY - yFar) % yRange + yRange) % yRange + yFar;

      item.mesh.position.copy(this._path.positionAt(wrapped));
      item.mesh.rotation.copy(this._path.rotationAt(wrapped));

      const proximity  = (wrapped - yFar) / yRange;
      const centerBias = 1 - Math.abs(proximity - 0.5) * 2;
      const bell       = THREE.MathUtils.smoothstep(Math.max(0, centerBias), 0, 1);

      item.mesh.scale.setScalar((0.01 + bell * 0.71) * rs);
      item.update(proximity, velocity);
    });
  }

  getSnapOffset(currentOffset) {
    const { yFar, yRange } = this._path;
    const totalY = (currentOffset / PIXELS_PER_CYCLE) * yRange;

    let bestDiff   = Infinity;
    let snapOffset = currentOffset;

    this._items.forEach((item) => {
      const offsetInCycle = ((item._y + totalY - yFar) % yRange + yRange) % yRange;
      const centerInCycle = 0.5 * yRange;

      let diff = centerInCycle - offsetInCycle;
      if (diff >  yRange / 2) diff -= yRange;
      if (diff < -yRange / 2) diff += yRange;

      if (Math.abs(diff) < Math.abs(bestDiff)) {
        bestDiff   = diff;
        snapOffset = currentOffset + (diff / yRange) * PIXELS_PER_CYCLE;
      }
    });

    return snapOffset;
  }

  dispose() {
    this._items.forEach((item) => item.dispose(this._scene));
    this._textures.forEach((tex) => tex.dispose());
  }
}
