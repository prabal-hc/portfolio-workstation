"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
  siCss,
  siGit,
  siGithub,
  siHtml5,
  siJavascript,
  siNextdotjs,
  siPostgresql,
  siReact,
  siRedux,
  siSupabase,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVuedotjs,
  type SimpleIcon,
} from "simple-icons";
import { state } from "@/lib/state";
import { TABS } from "@/lib/timeline";
import { isSideLayout } from "@/lib/layout";
import { COUNT, place, rand, SECTION_FORMATIONS, TILT } from "@/lib/formations";

/**
 * The tech stack, as 3D logos floating inside the monitor. Scrolling through the sections regroups them:
 * a loose cluster, an orbit, a gallery grid, a rising helix, and finally one tight core. Each logo leaves a
 * little after the one before it, flips once on the way, and always turns back to face you so it stays readable.
 *
 * Logos: Simple Icons (CC0), extruded into solid badges in each brand's colour.
 */
const LOGOS: SimpleIcon[] = [
  siReact,
  siNextdotjs,
  siTypescript,
  siJavascript,
  siHtml5,
  siCss,
  siTailwindcss,
  siThreedotjs,
  siVuedotjs,
  siRedux,
  siSupabase,
  siPostgresql,
  siGit,
  siGithub,
];

/** Size of a logo's longest side, in scene units. */
const LOGO_SIZE = 0.44;

/** Black brand marks (Next.js, Three.js, GitHub) would vanish on the dark screen: render those as bright chrome. */
const colourOf = (icon: SimpleIcon) => {
  const c = new THREE.Color(`#${icon.hex}`);
  return c.getHSL({ h: 0, s: 0, l: 0 }).l < 0.2 ? new THREE.Color("#e9edf2") : c;
};

const svgLoader = new SVGLoader();

/** Extrude a 24×24 Simple Icons path into a centred, bevelled solid, LOGO_SIZE across. */
function logoGeometry(icon: SimpleIcon): THREE.BufferGeometry {
  const data = svgLoader.parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${icon.path}"/></svg>`);
  const shapes = data.paths.flatMap((p) => p.toShapes());
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth: 2.6,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.3,
    bevelSegments: 3,
    curveSegments: 6,
  });
  // SVG is y-down: turn it the right way up (a rotation, so the faces keep pointing outwards)
  geo.rotateX(Math.PI);
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  geo.translate(-centre.x, -centre.y, -centre.z);
  const s = LOGO_SIZE / Math.max(size.x, size.y);
  geo.scale(s, s, s);
  geo.computeVertexNormals();
  return geo;
}

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

function Constellation() {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const { viewport, camera } = useThree();

  const items = useMemo(
    () =>
      LOGOS.slice(0, COUNT).map((icon, i) => {
        const colour = colourOf(icon);
        return {
          geometry: logoGeometry(icon),
          material: new THREE.MeshPhysicalMaterial({
            color: colour,
            emissive: colour,
            emissiveIntensity: 0.12,
            roughness: 0.28,
            metalness: colour.getHSL({ h: 0, s: 0, l: 0 }).s < 0.1 ? 0.85 : 0.1,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            iridescence: 0.25,
          }),
          scale: 0.92 + rand(i, 7) * 0.16,
          phase: rand(i, 8) * Math.PI * 2,
        };
      }),
    [],
  );
  useEffect(
    () => () =>
      items.forEach((it) => {
        it.geometry.dispose();
        it.material.dispose();
      }),
    [items],
  );

  const from = useMemo(() => new THREE.Vector3(), []);
  const to = useMemo(() => new THREE.Vector3(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const qa = useMemo(() => new THREE.Quaternion(), []);
  const qb = useMemo(() => new THREE.Quaternion(), []);
  const facing = useMemo(() => new THREE.Quaternion(), []);
  const sway = useMemo(() => new THREE.Quaternion(), []);

  useFrame((st) => {
    const g = group.current;
    if (!g) return;
    const time = st.clock.elapsedTime;
    const t = THREE.MathUtils.clamp(state.tab, 0, TABS.length - 1);
    const i = Math.min(Math.floor(t), TABS.length - 2);
    const f = t - i;
    const A = SECTION_FORMATIONS[i];
    const B = SECTION_FORMATIONS[i + 1];

    // the formation sits in the half of the screen the text leaves free
    const half = viewport.getCurrentViewport(camera, [0, 0, 0]).width / 2;
    const side = (s: "left" | "right") => (s === "left" ? 0.54 : -0.54) * half;
    const k = ease(f);
    g.position.x = THREE.MathUtils.lerp(side(A.side), side(B.side), k);
    g.position.y = Math.sin(time * 0.6) * 0.04;
    // each formation lands at its own angle; between two, the whole constellation makes one full turn
    qa.setFromEuler(euler.set(...TILT[A.formation]));
    qb.setFromEuler(euler.set(...TILT[B.formation]));
    g.quaternion.slerpQuaternions(qa, qb, k);
    g.rotateY(k * Math.PI * 2 + Math.sin(time * 0.3) * 0.12);
    g.scale.setScalar(Math.min(1, half / 2.6));
    // every logo undoes the group's turn, so it keeps facing the viewer wherever the formation carries it
    facing.copy(g.quaternion).invert();

    items.forEach((it, n) => {
      const m = meshes.current[n];
      if (!m) return;
      // staggered: logo n leaves a little after logo n−1, and they all land by the end of the move
      const u = ease(clamp01((f - n * 0.025) / (1 - (COUNT - 1) * 0.025)));
      place(A.formation, n, from);
      place(B.formation, n, to);
      m.position.lerpVectors(from, to, u);
      // an arc between formations: logos swing outward mid-flight
      m.position.multiplyScalar(1 + Math.sin(Math.PI * u) * 0.35);
      // a gentle sway at rest, and one flip on the way to the next formation
      sway.setFromEuler(
        euler.set(Math.sin(time * 0.5 + it.phase) * 0.14, Math.sin(time * 0.6 + it.phase * 1.7) * 0.32 + u * Math.PI * 2, Math.sin(time * 0.4 + it.phase) * 0.05),
      );
      m.quaternion.copy(facing).multiply(sway);
      const core = B.formation === "core" ? u : A.formation === "core" ? 1 - u : 0;
      m.scale.setScalar(it.scale * (1 - core * 0.3));
    });
  });

  return (
    <group ref={group}>
      {items.map((it, n) => (
        <mesh key={n} ref={(el) => void (meshes.current[n] = el)} geometry={it.geometry} material={it.material} />
      ))}
    </group>
  );
}

/**
 * Renders only while the screen panel is showing; otherwise the canvas sits idle.
 * It also renders a few frames straight after loading, while the page is still behind the loader: that is
 * when the GPU compiles the logos' materials, instead of mid-way through the camera's move onto the screen.
 */
function WhileVisible() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    // the rig writes the screen's visibility onto the overlay; reading the inline value costs nothing
    const layer = document.querySelector<HTMLElement>(".overlay");
    let warmup = 12;
    let raf = 0;
    const loop = () => {
      if (warmup > 0) {
        warmup--;
        invalidate();
      } else if (layer && +(layer.style.getPropertyValue("--v-screen") || 0) > 0.01) invalidate();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

export default function ScreenShapes() {
  // the stacked (phone) layout has no room for the logos beside the text: don't even start the canvas there
  const [side, setSide] = useState(() => typeof window !== "undefined" && isSideLayout(window.innerWidth, window.innerHeight));
  useEffect(() => {
    const onResize = () => setSide(isSideLayout(window.innerWidth, window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (!side) return null;
  return (
    <div className="screen-art3d" aria-hidden>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ fov: 30, position: [0, 0, 6.5], near: 0.1, far: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        // The screen panel is perspective-transformed every frame while the camera moves in. Measured with
        // getBoundingClientRect, this canvas would "change size" (and be rebuilt, blank) on every one of those
        // frames: that was the flicker. Its layout size (offsetWidth/Height) never changes, so measure that.
        resize={{ offsetSize: true, scroll: false }}
      >
        <WhileVisible />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.8} color="#fff1e6" />
        <pointLight position={[-4, -1, 3]} intensity={14} color="#ff6a1a" />
        <pointLight position={[4, 2, -2]} intensity={12} color="#5b8cff" />
        <Environment resolution={128} environmentIntensity={0.9}>
          <Lightformer form="rect" intensity={2.5} position={[0, 5, 0]} scale={[8, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={2} color="#ff6a1a" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 1.2, 1]} />
          <Lightformer form="rect" intensity={2} color="#7b5cff" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[6, 1.2, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[0, 0, 6]} scale={[6, 3, 1]} />
        </Environment>
        <Constellation />
      </Canvas>
    </div>
  );
}
