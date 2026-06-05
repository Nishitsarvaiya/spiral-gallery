import * as THREE from 'three';

const loader = new THREE.TextureLoader();

export function loadTexture(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => { tex.colorSpace = THREE.NoColorSpace; resolve(tex); },
      undefined,
      () => resolve(makeFallback()),
    );
  });
}

export function loadTextures(urls) {
  return Promise.all(urls.map(loadTexture));
}

function makeFallback() {
  const data = new Uint8Array([30, 30, 30, 255]);
  const tex  = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
