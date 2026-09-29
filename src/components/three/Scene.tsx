"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { announceSceneReady } from "@/lib/loading";
import { isTouchDevice } from "@/lib/layout";
import { Person } from "./Person";
import { cameraAtRest, Rig } from "./Rig";
import { Workstation } from "./Workstation";

const BG = "#05070b";

if (typeof window !== "undefined") RectAreaLightUniformsLib.init();

/**
 * The scene only renders while something can change: once the camera has landed on the screen, the view is
 * completely still, so the GPU goes idle and the tabs slide on a quiet page.
 */
function RenderOnDemand() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!cameraAtRest()) invalidate();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

export default function Scene() {
  // resolution: start crisp, step down once if the frame rate cannot keep up
  // phones have dense screens but small GPUs: 1.25× looks sharp there at a fraction of the cost of 3×
  const touch = isTouchDevice();
  const max = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, touch ? 1.25 : 1.5);
  const [dpr, setDpr] = useState(max);
  return (
    <div className="scene">
      <Canvas
        frameloop="demand"
        onCreated={({ gl }) => {
          window.setTimeout(announceSceneReady, 400);
          if (process.env.NODE_ENV !== "production") (window as unknown as { __gl: unknown }).__gl = gl;
        }}
        dpr={dpr}
        // the canvas is fixed full-screen: no need to re-measure it on every scroll event
        resize={{ scroll: false }}
        camera={{ fov: 30, near: 0.03, far: 40, position: [1.9, 1.45, -0.6] }}
        // the composer renders off-screen, so canvas MSAA would only cost memory
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      >
        <RenderOnDemand />
        {/* one step down, at most once: switching resolution back and forth mid-animation flashes the canvas */}
        <PerformanceMonitor bounds={() => [45, 58]} flipflops={1} onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))} />
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 5, 14]} />

        <Rig />

        <ambientLight intensity={0.08} />
        <hemisphereLight args={["#2a3a55", "#000000", 0.25]} />
        {/* warm key from above, like a room light behind the viewer */}
        <spotLight position={[-2.5, 3.6, 2.4]} angle={0.55} penumbra={1} intensity={28} color="#ffd2ad" />
        {/* orange rim from behind the desk and a cool fill from the side */}
        <spotLight position={[-2.6, 2.2, -2.8]} angle={0.7} penumbra={1} intensity={40} color="#ff6a1a" />
        <spotLight position={[3, 2.4, -1.8]} angle={0.7} penumbra={1} intensity={26} color="#4f7dff" />
        {/* a soft key on the face from the first shot's side */}
        <pointLight position={[1.1, 1.75, -0.2]} intensity={1.6} distance={3} decay={2} color="#ffe2c8" />

        <Environment resolution={128} environmentIntensity={0.55}>
          <Lightformer form="rect" intensity={2} position={[0, 5, -2]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={3} color="#ff6a1a" position={[-5, 1.5, -1]} rotation-y={Math.PI / 2} scale={[6, 1.2, 1]} />
          <Lightformer form="rect" intensity={2} color="#5b8cff" position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[6, 1.2, 1]} />
        </Environment>

        <Workstation />
        <Person />

        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color="#07090d" metalness={0.6} roughness={0.42} />
        </mesh>
        {/* baked once: a soft contact shadow under the desk and chair */}
        <ContactShadows frames={1} position={[0, 0.004, 0.1]} opacity={0.75} scale={5} blur={2.4} far={1.2} resolution={256} />

        <EffectComposer multisampling={touch ? 0 : 2}>
          <Bloom intensity={0.7} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur levels={5} />
          <Vignette eskil={false} offset={0.25} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
