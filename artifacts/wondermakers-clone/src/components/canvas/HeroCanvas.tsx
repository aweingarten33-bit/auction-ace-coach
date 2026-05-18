import { useEffect, useRef, useState, Component, ReactNode } from "react";
import * as THREE from "three";
import { useTheme } from "@/hooks/use-theme";

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function HeroCanvasInner() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (!mountRef.current || webglFailed) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setWebglFailed(true);
      return;
    }

    if (!renderer.getContext()) {
      renderer.dispose();
      setWebglFailed(true);
      return;
    }

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const isDark = theme === "dark";
    const geometry = new THREE.TorusKnotGeometry(1.5, 0.4, 128, 64);
    const material = new THREE.MeshBasicMaterial({
      color: isDark ? 0x00D672 : 0x000000,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.3 : 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 15;
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: isDark ? 0x00D672 : 0x000000,
      transparent: true,
      opacity: isDark ? 0.5 : 0.2,
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mesh.rotation.y = t * 0.2;
      mesh.rotation.x = t * 0.1;
      particlesMesh.rotation.y = -t * 0.05;
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, [theme, webglFailed]);

  if (webglFailed) return <CSSFallbackCanvas />;
  return <div ref={mountRef} className="fixed inset-0 z-[-1] pointer-events-none" />;
}

function CSSFallbackCanvas() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,214,114,0.08) 0%, transparent 70%)",
          animation: "pulse-glow 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-[#00D672]/10 rounded-full"
        style={{ animation: "spin-slow 20s linear infinite" }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-[#00D672]/15 rounded-full"
        style={{ animation: "spin-slow 14s linear infinite reverse" }}
      />
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function HeroCanvas() {
  return (
    <WebGLErrorBoundary fallback={<CSSFallbackCanvas />}>
      <HeroCanvasInner />
    </WebGLErrorBoundary>
  );
}
