import { useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useTexture, shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

declare module "@react-three/fiber" {
  interface ThreeElements {
    heroMaterial: any;
  }
}

// ── Vertex shader ─────────────────────────────────────────────────────────────
const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ── Fragment shader ───────────────────────────────────────────────────────────
const FRAGMENT = `
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;
uniform float uProgress;
uniform float uImageAspect;
uniform sampler2D uHeroTexture;
uniform sampler2D uDepthTexture;
uniform sampler2D uNoiseTexture;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Object-fit: cover — keep image filling screen at any aspect ratio
  float screenAspect = uResolution.x / uResolution.y;
  vec2 uvCover = uv;
  if (screenAspect > uImageAspect) {
    float s = screenAspect / uImageAspect;
    uvCover.y = (uv.y - 0.5) / s + 0.5;
  } else {
    float s = uImageAspect / screenAspect;
    uvCover.x = (uv.x - 0.5) / s + 0.5;
  }

  // Faux-depth parallax driven by mouse
  float depth = texture2D(uDepthTexture, uv).r;
  vec2 parallax = uMouse * depth * 0.025;
  vec2 uvFinal = clamp(uvCover + parallax, 0.0, 1.0);

  // Sample hero image
  vec4 color = texture2D(uHeroTexture, uvFinal);

  // Noise-based reveal (uProgress 1→0 on load)
  float noise = texture2D(uNoiseTexture, uv).r;
  float reveal = smoothstep(uProgress - 0.1, uProgress + 0.1, noise);

  // Vignette — darken edges
  vec2 uvC = uv * 2.0 - 1.0;
  float vignette = 1.0 - dot(uvC * vec2(0.45, 0.65), uvC * vec2(0.45, 0.65));
  vignette = clamp(pow(vignette, 0.5), 0.0, 1.0);

  color.rgb *= vignette;

  gl_FragColor = vec4(color.rgb, reveal * vignette);
}
`;

// ── Material factory ──────────────────────────────────────────────────────────
const HeroMaterial = shaderMaterial(
  {
    uTime: 0,
    uResolution: new THREE.Vector2(1, 1),
    uMouse: new THREE.Vector2(0, 0),
    uProgress: 1.0,
    uImageAspect: 0.6,
    uHeroTexture: null,
    uDepthTexture: null,
    uNoiseTexture: null,
  },
  VERTEX,
  FRAGMENT
);
extend({ HeroMaterial });

// ── Procedural textures ───────────────────────────────────────────────────────
function makeDepthTexture() {
  const W = 512, H = 512;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const nx = x / W - 0.5;
      const ny = y / H - 0.52; // slightly above center (players lean forward)
      const dist = Math.sqrt(nx * nx + ny * ny * 1.4);
      const v = Math.round(Math.max(0, 1 - dist * 2.3) * 255);
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function makeNoiseTexture() {
  const W = 256, H = 256;
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const v = Math.round(Math.random() * 255);
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function HeroPlane() {
  const mat = useRef<any>(null);
  const progress = useRef(1.0);
  const smoothMouse = useRef(new THREE.Vector2());
  const rawMouse = useRef(new THREE.Vector2());
  const { viewport, size } = useThree();

  const heroTex = useTexture("/textures/hero.jpg");
  const depthTex = useMemo(makeDepthTexture, []);
  const noiseTex = useMemo(makeNoiseTexture, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawMouse.current.set(
        (e.clientX / window.innerWidth - 0.5) * 2,
        -(e.clientY / window.innerHeight - 0.5) * 2
      );
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((_, delta) => {
    if (!mat.current) return;
    mat.current.uTime += delta;
    smoothMouse.current.lerp(rawMouse.current, 0.05);
    mat.current.uMouse.copy(smoothMouse.current);
    mat.current.uResolution.set(size.width, size.height);
    progress.current = Math.max(0, progress.current - delta * 0.5);
    mat.current.uProgress = progress.current;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <heroMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uHeroTexture={heroTex}
        uDepthTexture={depthTex}
        uNoiseTexture={noiseTex}
        uImageAspect={0.6}
      />
    </mesh>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function HeroWebGL() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ alpha: true, antialias: false }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <HeroPlane />
      </Suspense>
    </Canvas>
  );
}
