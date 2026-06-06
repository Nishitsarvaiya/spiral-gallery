import gsap from 'gsap';
import { GsapGallery }  from './GsapGallery.js';
import { ScrollManager } from '../scroll/ScrollManager.js';
import { createLoader }  from '../utils/loader.js';

const PIXELS_PER_CYCLE = 2400;
const NUM_TEXTURES     = 12;
const POOL_SIZE        = 30;
const IMAGE_URLS = Array.from({ length: NUM_TEXTURES }, (_, i) => `/images/img-${i + 1}.jpg`);

// ── DOM ──────────────────────────────────────────────────────────
const counterEl  = document.getElementById('js-counter');
const minimapEl  = document.getElementById('js-minimap');
const mmCursorEl = document.getElementById('js-minimap-cursor');
const mmCtx      = minimapEl.getContext('2d');
const MM_W       = minimapEl.width;
const MM_H       = minimapEl.height;

const scene    = document.getElementById('js-scene');
const scrollEl = document.querySelector('.scroll-container');

// ── Preload images with progress ─────────────────────────────────
const { onProgress, dismiss } = createLoader(NUM_TEXTURES);

function preloadImages(urls) {
	let loaded = 0;
	return Promise.all(
		urls.map(
			(url) =>
				new Promise((resolve) => {
					const img = new Image();
					img.onload = img.onerror = () => {
						loaded += 1;
						onProgress(loaded);
						resolve(img);
					};
					img.src = url;
				}),
		),
	);
}

// ── Init after images ready ───────────────────────────────────────
preloadImages(IMAGE_URLS).then((preloadedImgs) => {
	const gallery = new GsapGallery(scene, IMAGE_URLS, preloadedImgs);
	const scroll  = new ScrollManager(scrollEl);

	gallery.resize(window.innerWidth, window.innerHeight);
	scroll.setSnapFn((offset) => gallery.getSnapOffset(offset));

	window.addEventListener('resize', () => {
		gallery.resize(window.innerWidth, window.innerHeight);
	});

	gsap.ticker.fps(60);

	// ── Film-strip minimap ────────────────────────────────────────
	const THUMB_W    = MM_W - 12;
	const THUMB_H    = Math.round(THUMB_W * (4 / 3));
	const THUMB_X    = (MM_W - THUMB_W) / 2;
	const THUMB_GAP  = 10;
	const THUMB_STEP = THUMB_H + THUMB_GAP;
	const BORDER_PAD = 5;

	mmCursorEl.style.height = `${THUMB_H + BORDER_PAD * 2}px`;
	mmCursorEl.style.width  = `${THUMB_W + BORDER_PAD * 2}px`;
	mmCursorEl.style.left   = `${THUMB_X - BORDER_PAD}px`;

	function drawImageCover(ctx, img, dx, dy, dw, dh) {
		const imgAspect = img.naturalWidth / img.naturalHeight;
		const dstAspect = dw / dh;
		let sx, sy, sw, sh;
		if (imgAspect > dstAspect) {
			sh = img.naturalHeight;
			sw = sh * dstAspect;
			sx = (img.naturalWidth - sw) / 2;
			sy = 0;
		} else {
			sw = img.naturalWidth;
			sh = sw / dstAspect;
			sx = 0;
			sy = (img.naturalHeight - sh) / 2;
		}
		ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
	}

	function drawFilmStrip() {
		const imgEls = gallery._imgEls;
		if (!imgEls?.length) return;

		mmCtx.clearRect(0, 0, MM_W, MM_H);

		const centerIdx    = POOL_SIZE * (0.5 - scroll.smoothOffset / PIXELS_PER_CYCLE);
		const mmStripPx    = centerIdx * THUMB_STEP - (MM_H - THUMB_H) / 2;
		const visibleCount = Math.ceil(MM_H / THUMB_STEP) + 2;
		const firstSlot    = Math.floor(mmStripPx / THUMB_STEP) - 1;

		for (let s = firstSlot; s < firstSlot + visibleCount + 3; s++) {
			const y = s * THUMB_STEP - mmStripPx;
			if (y + THUMB_H < -1 || y > MM_H + 1) continue;

			const texIdx = (((s % POOL_SIZE) + POOL_SIZE) % POOL_SIZE) % NUM_TEXTURES;
			const img    = imgEls[texIdx];

			const distFromActive = Math.abs(s - centerIdx);
			const alpha = Math.max(0.08, 1 - distFromActive * 0.3);
			mmCtx.globalAlpha = alpha;

			if (img && img.complete && img.naturalWidth > 0) {
				drawImageCover(mmCtx, img, THUMB_X, y, THUMB_W, THUMB_H);
			} else {
				mmCtx.fillStyle = 'rgba(180,175,165,1)';
				mmCtx.fillRect(THUMB_X, y, THUMB_W, THUMB_H);
			}
		}

		mmCtx.globalAlpha = 1;
	}

	// ── Ticker ───────────────────────────────────────────────────
	gsap.ticker.add(() => {
		const offset = scroll.smoothOffset;
		const totalY = (offset / PIXELS_PER_CYCLE) * 5.6;
		const yFar   = -2.8;
		const yRange =  5.6;

		gallery.update(offset, scroll.velocity);

		let bestDist = Infinity, bestIdx = 0;
		gallery._items.forEach((item, i) => {
			const wrapped   = ((((item._y + totalY - yFar) % yRange) + yRange) % yRange) + yFar;
			const proximity = (wrapped - yFar) / yRange;
			const dist      = Math.abs(proximity - 0.5);
			if (dist < bestDist) { bestDist = dist; bestIdx = i; }
		});

		const texIdx = bestIdx % NUM_TEXTURES;
		if (texIdx !== activeIdx) {
			activeIdx = texIdx;
			counterEl.textContent = String(texIdx + 1).padStart(2, '0');
		}

		drawFilmStrip();
	});

	dismiss();
});

let activeIdx = -1;
