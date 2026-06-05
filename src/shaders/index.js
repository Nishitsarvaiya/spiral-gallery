export const vertexShader = /* glsl */ `
uniform float uVelocity;


varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;

  float angle = uVelocity * 0.12;
  float si    = sin(angle);
  float co    = cos(angle);

  vec2 p       = uv - 0.5;
  vec2 rotated = vec2(p.x * co - p.y * si, p.x * si + p.y * co);

  pos.x += (rotated.x - p.x) * 0.15;
  pos.y += (rotated.y - p.y) * 0.15;

  float d  = distance(uv, vec2(0.5));
  pos.z   -= abs((1.0 - d) * uVelocity * 0.24);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float     uOpacity;
uniform vec2      uImageSize;
uniform vec2      uPlaneSize;

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 plane, vec2 image) {
  float planeAspect = plane.x / plane.y;
  float imageAspect = image.x / image.y;
  vec2 scale = planeAspect > imageAspect
    ? vec2(1.0, imageAspect / planeAspect)
    : vec2(planeAspect / imageAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv    = coverUv(vUv, uPlaneSize, uImageSize);
  vec4 color = texture2D(uTexture, uv);
  color.a   *= uOpacity;
  gl_FragColor = color;
}
`;
