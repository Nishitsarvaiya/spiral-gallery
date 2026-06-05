import gsap from 'gsap';

const POOL_SIZE        = 30;
const NUM_TEXTURES     = 12;
const PIXELS_PER_CYCLE = 2400;

// Spiral constants — identical to Three.js version
const Y_FAR    = -2.8;
const Y_RANGE  =  5.6;
const TURNS    =  2.5;
const RADIUS   =  1.4;
const Z_OFFSET =  0.35;

// Plane proportions matching Three.js: PLANE_W=0.9, PLANE_H=1.2
const PLANE_W = 0.9;
const PLANE_H = 1.2;

function smoothstep(x, edge0, edge1) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function responsiveScale(aspect) {
  return Math.min(1, Math.max(0.38, aspect * 0.78));
}

export class GsapGallery {
  constructor(scene, imageUrls) {
    this._scene     = scene;
    this._imageUrls = imageUrls;
    this._items     = [];
    this._imgEls    = [];
    this._scalePx   = window.innerHeight / 3;
    this._rScale    = 1;

    this._init();
  }

  _init() {
    const ySpacing = Y_RANGE / POOL_SIZE;
    const w = Math.round(PLANE_W * this._scalePx);
    const h = Math.round(PLANE_H * this._scalePx);

    for (let i = 0; i < POOL_SIZE; i++) {
      const texIdx = i % NUM_TEXTURES;

      const el = document.createElement('div');
      el.className    = 'gsap-item';
      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;

      const img = document.createElement('img');
      img.src       = this._imageUrls[texIdx];
      img.alt       = '';
      img.draggable = false;
      el.appendChild(img);

      if (i < NUM_TEXTURES) this._imgEls.push(img);

      this._scene.appendChild(el);
      this._items.push({ el, _y: Y_FAR + i * ySpacing });
    }
  }

  resize(width, height) {
    this._rScale  = responsiveScale(width / height);
    this._scalePx = height / 3;

    // Mild perspective — large value keeps it near-orthographic like Three.js
    this._scene.style.perspective = `${height * 1.4}px`;

    const w = Math.round(PLANE_W * this._scalePx);
    const h = Math.round(PLANE_H * this._scalePx);
    this._items.forEach(({ el }) => {
      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;
    });
  }

  update(scrollOffset, velocity) {
    const totalY = (scrollOffset / PIXELS_PER_CYCLE) * Y_RANGE;
    const sp     = this._scalePx;
    const rs     = this._rScale;
    const radius = RADIUS   * rs;
    const zOff   = Z_OFFSET * rs;

    this._items.forEach((item) => {
      const rawY    = item._y + totalY;
      const wrapped = ((rawY - Y_FAR) % Y_RANGE + Y_RANGE) % Y_RANGE + Y_FAR;

      const frac  = (wrapped - Y_FAR) / Y_RANGE;
      const angle = frac * TURNS * Math.PI * 2;

      const wx = radius * Math.cos(angle);
      const wz = zOff   * Math.sin(angle);

      const rotY = -Math.cos(angle) * 25;
      const rotX =  Math.sin(angle) * 10;

      const centerBias = 1 - Math.abs(frac - 0.5) * 2;
      const bell       = smoothstep(Math.max(0, centerBias), 0, 1);
      const scale      = (0.01 + bell * 0.71) * rs;

      const fadeIn  = smoothstep(frac, 0.04, 0.18);
      const fadeOut = 1 - smoothstep(frac, 0.88, 0.98);
      const opacity = fadeIn * fadeOut;

      gsap.set(item.el, {
        xPercent: -50,
        yPercent: -50,
        x:        wx * sp,
        y:       -wrapped * sp,
        z:        wz * sp,
        rotateX:  0,
        rotateY:  0,
        scale,
        opacity,
        zIndex:   Math.round(wz * 100 + 200),
        force3D:  true,
      });
    });
  }

  getSnapOffset(currentOffset) {
    const totalY = (currentOffset / PIXELS_PER_CYCLE) * Y_RANGE;
    let bestDiff   = Infinity;
    let snapOffset = currentOffset;

    this._items.forEach((item) => {
      const offsetInCycle = ((item._y + totalY - Y_FAR) % Y_RANGE + Y_RANGE) % Y_RANGE;
      const centerInCycle = 0.5 * Y_RANGE;

      let diff = centerInCycle - offsetInCycle;
      if (diff >  Y_RANGE / 2) diff -= Y_RANGE;
      if (diff < -Y_RANGE / 2) diff += Y_RANGE;

      if (Math.abs(diff) < Math.abs(bestDiff)) {
        bestDiff   = diff;
        snapOffset = currentOffset + (diff / Y_RANGE) * PIXELS_PER_CYCLE;
      }
    });

    return snapOffset;
  }
}
