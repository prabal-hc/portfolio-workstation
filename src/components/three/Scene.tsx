"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { announceSceneReady } from "@/lib/loading";
import { jarvis } from "@/lib/jarvis";
import { state } from "@/lib/state";
import { Person } from "./Person";
import { Rig } from "./Rig";
import { Workstation } from "./Workstation";
import { ZoomBlur } from "./ZoomBlur";

const BG = "#04060a";

if (typeof window !== "undefined") RectAreaLightUniformsLib.init();

export default function Scene() {
  // Adaptive resolution: start crisp, step down the moment the frame rate dips, step back up when it recovers.
  const [dpr, setDpr] = useState(() => (typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.5)));
  const max = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 1.5);
  return (
    <div className="scene">
      <Canvas
        onCreated={({ gl }) => {
          window.setTimeout(announceSceneReady, 500);
          if (process.env.NODE_ENV !== "production") (window as unknown as { __gl: unknown }).__gl = gl;
        }}
        dpr={dpr}
        camera={{ fov: 30, near: 0.03, far: 40, position: [-1.4, 1.4, 0] }}
        // the composer renders off-screen, so canvas MSAA would only cost memory
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      >
        <PerformanceMonitor
          bounds={() => [50, 58]}
          flipflops={4}
          onDecline={() => setDpr((d) => Math.max(0.75, +(d - 0.25).toFixed(2)))}
          onIncline={() => setDpr((d) => Math.min(max, +(d + 0.25).toFixed(2)))}
        />
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 5, 14]} />

        <Rig />

        <ambientLight intensity={0.06} />
        <hemisphereLight args={["#2a3a55", "#000000", 0.25]} />
        {/* warm key from above-left, like a room light behind the viewer */}
        <spotLight position={[-2.5, 3.6, 2.4]} angle={0.55} penumbra={1} intensity={28} color="#ffd2ad" />
        {/* orange rim from behind the desk (brand accent) and a cool fill from the right */}
        <spotLight position={[-2.6, 2.2, -2.8]} angle={0.7} penumbra={1} intensity={45} color="#ff6a1a" />
        <spotLight position={[3, 2.4, -1.8]} angle={0.7} penumbra={1} intensity={30} color="#4f7dff" />
        {/* a soft key on the face from the hero camera's side, so it reads on the first shot */}
        <pointLight position={[1.1, 1.75, -0.2]} intensity={1.6} distance={3} decay={2} color="#ffe2c8" />

        <Environment resolution={256} environmentIntensity={0.55}>
          <Lightformer form="rect" intensity={2} position={[0, 5, -2]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={3} color="#ff6a1a" position={[-5, 1.5, -1]} rotation-y={Math.PI / 2} scale={[6, 1.2, 1]} />
          <Lightformer form="rect" intensity={2.5} color="#3ad7ff" position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[6, 1.2, 1]} />
        </Environment>

        <Workstation />
        <Person />
        <HoloFloor />
        <Dust />

        {/* satin floor: picks up the environment and the glows without re-rendering the scene as a mirror */}
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#07090d" metalness={0.6} roughness={0.42} />
        </mesh>
        {/* baked once: a soft contact shadow under the desk and chair (a live one re-renders the scene every frame) */}
        <ContactShadows frames={1} position={[0, 0.004, 0.1]} opacity={0.75} scale={5} blur={2.4} far={1.2} resolution={256} />

        <EffectComposer multisampling={2}>
          <Bloom intensity={0.85} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur levels={6} />
          <ZoomBlur />
          <Noise opacity={0.035} />
          <Vignette eskil={false} offset={0.22} darkness={0.88} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

/** Holographic rings on the floor: dim at rest, they light up and spin while JARVIS boots. */
function HoloFloor() {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#3ad7ff", transparent: true, opacity: 0.12, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }),
    [],
  );
  const rings = useMemo(
    () => [
      { r: 1.25, w: 0.006, len: Math.PI * 2, sp: 0.02 },
      { r: 1.35, w: 0.02, len: Math.PI * 0.6, sp: 0.12 },
      { r: 1.35, w: 0.02, len: Math.PI * 0.3, sp: 0.12, off: Math.PI },
      { r: 1.55, w: 0.004, len: Math.PI * 2, sp: 0 },
      { r: 1.7, w: 0.04, len: Math.PI * 0.12, sp: -0.2 },
      { r: 1.7, w: 0.04, len: Math.PI * 0.12, sp: -0.2, off: Math.PI * 0.66 },
      { r: 1.7, w: 0.04, len: Math.PI * 0.12, sp: -0.2, off: Math.PI * 1.33 },
      { r: 2.2, w: 0.003, len: Math.PI * 2, sp: 0 },
    ],
    [],
  );
  const glow = useRef(0);
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    const on = jarvis.speaking || (state.shown > 0.6 && state.shown < 1.4) ? 1 : 0;
    glow.current = THREE.MathUtils.damp(glow.current, on, 2, dt);
    mat.opacity = 0.1 + glow.current * 0.55;
    group.current?.children.forEach((c, i) => {
      c.rotation.z = (rings[i].off ?? 0) + t * rings[i].sp * (1 + glow.current * 4);
    });
  });
  return (
    <group ref={group} position={[0, 0.003, 0.25]} rotation-x={-Math.PI / 2}>
      {rings.map((r, i) => (
        <mesh key={i} material={mat}>
          <ringGeometry args={[r.r, r.r + r.w, 96, 1, 0, r.len]} />
        </mesh>
      ))}
    </group>
  );
}

/** Dust drifting through the monitor light. */
function Dust() {
  const count = 260;
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 3.6;
      p[i * 3 + 1] = 0.3 + Math.random() * 1.9;
      p[i * 3 + 2] = (Math.random() - 0.5) * 2.6;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.PointsMaterial({ size: 0.006, color: "#bfe9ff", transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }),
    [],
  );
  useFrame((st) => {
    if (!ref.current) return;
    const t = st.clock.elapsedTime;
    ref.current.rotation.y = t * 0.012;
    ref.current.position.y = Math.sin(t * 0.2) * 0.04;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}
