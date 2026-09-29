"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { DESK, KEYBOARD, MONITORS, MOUSE, SCREEN_H, SCREEN_W, SCREEN_Y, type Monitor } from "@/lib/scene";
import { ScreenFeed } from "./screenFeeds";

const RGB_SPEED = 0.05;

export function Workstation() {
  const feeds = useMemo(() => {
    if (typeof document === "undefined") return null;
    return { left: new ScreenFeed("left"), center: new ScreenFeed("center"), right: new ScreenFeed("right") };
  }, []);
  useEffect(
    () => () => {
      if (feeds) Object.values(feeds).forEach((f) => f.texture.dispose());
    },
    [feeds],
  );

  const mats = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ color: "#16110d", roughness: 0.45, metalness: 0.05 }),
      frame: new THREE.MeshStandardMaterial({ color: "#0d0e11", roughness: 0.35, metalness: 0.8 }),
      plastic: new THREE.MeshStandardMaterial({ color: "#0c0d10", roughness: 0.4, metalness: 0.3 }),
      bezel: new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.25, metalness: 0.4 }),
      mat: new THREE.MeshStandardMaterial({ color: "#0b0c10", roughness: 0.95 }),
      key: new THREE.MeshStandardMaterial({ color: "#121318", roughness: 0.5 }),
      rgb: new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ff2a6d", emissiveIntensity: 2.2, toneMapped: false }),
      rgb2: new THREE.MeshStandardMaterial({ color: "#000", emissive: "#3ad7ff", emissiveIntensity: 2.2, toneMapped: false }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#8fa6c0", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, envMapIntensity: 2 }),
      ceramic: new THREE.MeshStandardMaterial({ color: "#e8e4dc", roughness: 0.35 }),
      coffee: new THREE.MeshStandardMaterial({ color: "#2b1509", roughness: 0.15 }),
    }),
    [],
  );

  const pcLight = useRef<THREE.PointLight>(null);
  const fans = useRef<THREE.Group[]>([]);
  const color = useMemo(() => new THREE.Color(), []);
  const color2 = useMemo(() => new THREE.Color(), []);

  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (feeds) for (const f of Object.values(feeds)) f.draw(t);
    // a slow RGB drift on the PC, keyboard and desk strip
    color.setHSL((t * RGB_SPEED) % 1, 1, 0.55);
    color2.setHSL((t * RGB_SPEED + 0.5) % 1, 1, 0.55);
    mats.rgb.emissive.copy(color);
    mats.rgb2.emissive.copy(color2);
    if (pcLight.current) pcLight.current.color.copy(color);
    fans.current.forEach((f, i) => f && (f.rotation.z = t * (6 + i)));
  });

  return (
    <group>
      <Desk mats={mats} />

      {(Object.values(MONITORS) as Monitor[]).map((m) => (
        <MonitorRig key={m.id} m={m} mats={mats} feed={feeds?.[m.id]} />
      ))}
      {/* the glow of all three screens on the person and the desk */}
      <rectAreaLight width={1.7} height={SCREEN_H} intensity={5} color="#d9b8ff" position={[0, SCREEN_Y, 0.02]} rotation-y={Math.PI} />

      <Keyboard mats={mats} />
      {/* mouse */}
      <group position={[MOUSE.x, DESK.top + 0.004, MOUSE.z]}>
        <mesh scale={[0.034, 0.02, 0.058]} position={[0, 0.016, 0]} material={mats.plastic}>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
        <mesh position={[0, 0.03, -0.02]} material={mats.rgb2}>
          <boxGeometry args={[0.004, 0.004, 0.03]} />
        </mesh>
      </group>

      {/* coffee */}
      <group position={[-0.44, DESK.top, 0.22]}>
        <mesh position={[0, 0.05, 0]} material={mats.ceramic}>
          <cylinderGeometry args={[0.04, 0.036, 0.1, 24]} />
        </mesh>
        <mesh position={[0, 0.094, 0]} rotation-x={-Math.PI / 2} material={mats.coffee}>
          <circleGeometry args={[0.036, 24]} />
        </mesh>
        <mesh position={[0.045, 0.05, 0]} material={mats.ceramic}>
          <torusGeometry args={[0.022, 0.007, 8, 16]} />
        </mesh>
      </group>

      <GamingPC mats={mats} fans={fans} lightRef={pcLight} />
    </group>
  );
}

type Mats = Record<string, THREE.Material>;

function Desk({ mats }: { mats: Mats }) {
  const y = DESK.top;
  return (
    <group position={[0, 0, DESK.z]}>
      <RoundedBox args={[DESK.width, 0.04, DESK.depth]} radius={0.012} position={[0, y - 0.02, 0]} material={mats.wood} />
      {/* RGB strip along the back edge, underneath */}
      <mesh position={[0, y - 0.045, -DESK.depth / 2 + 0.02]} material={mats.rgb}>
        <boxGeometry args={[DESK.width - 0.1, 0.008, 0.008]} />
      </mesh>
      {/* T-frame legs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[(DESK.width / 2 - 0.12) * s, 0, 0]}>
          <mesh position={[0, (y - 0.04) / 2, 0]} material={mats.frame}>
            <boxGeometry args={[0.06, y - 0.04, 0.08]} />
          </mesh>
          <mesh position={[0, 0.015, 0]} material={mats.frame}>
            <boxGeometry args={[0.07, 0.03, DESK.depth - 0.08]} />
          </mesh>
          <mesh position={[0, y - 0.06, 0]} material={mats.frame}>
            <boxGeometry args={[0.07, 0.03, DESK.depth - 0.1]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, y - 0.07, -0.25]} material={mats.frame}>
        <boxGeometry args={[DESK.width - 0.3, 0.05, 0.03]} />
      </mesh>
      {/* desk mat with a lit edge */}
      <RoundedBox args={[1.1, 0.004, 0.42]} radius={0.002} position={[0.08, y + 0.002, 0.17]} material={mats.mat} />
      <RoundedBox args={[1.114, 0.002, 0.434]} radius={0.001} position={[0.08, y + 0.0005, 0.17]} material={mats.rgb2} />
    </group>
  );
}

function MonitorRig({ m, mats, feed }: { m: Monitor; mats: Mats; feed?: ScreenFeed }) {
  const screenMat = useMemo(
    () => (feed ? new THREE.MeshBasicMaterial({ map: feed.texture, toneMapped: false }) : new THREE.MeshBasicMaterial({ color: "#000" })),
    [feed],
  );
  const bw = SCREEN_W + 0.018;
  const bh = SCREEN_H + 0.018;
  return (
    <group position={[m.x, 0, m.z]} rotation-y={m.rotY}>
      <group position={[0, SCREEN_Y, 0]}>
        <RoundedBox args={[bw, bh, 0.022]} radius={0.006} material={mats.bezel} />
        <mesh position={[0, 0, 0.0115]} material={screenMat}>
          <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        </mesh>
        {/* back housing + ambient light ring (seen on the hero shot) */}
        <RoundedBox args={[0.42, 0.24, 0.05]} radius={0.02} position={[0, -0.01, -0.03]} material={mats.plastic} />
        <mesh position={[0, -0.01, -0.056]} rotation-y={Math.PI} material={mats.rgb2}>
          <ringGeometry args={[0.07, 0.078, 40]} />
        </mesh>
      </group>
      {/* stand */}
      <mesh position={[0, (SCREEN_Y - 0.02 + DESK.top) / 2, -0.07]} material={mats.frame}>
        <boxGeometry args={[0.05, SCREEN_Y - DESK.top - 0.02, 0.02]} />
      </mesh>
      <RoundedBox args={[0.26, 0.012, 0.18]} radius={0.005} position={[0, DESK.top + 0.006, -0.05]} material={mats.frame} />
    </group>
  );
}

function Keyboard({ mats }: { mats: Mats }) {
  const keys = useMemo(() => {
    const out: [number, number, number][] = [];
    const rows = 5;
    const cols = 15;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (r === 4 && c > 3 && c < 11) continue; // spacebar gap
        out.push([-0.195 + c * 0.028, 0, -0.052 + r * 0.026]);
      }
    return out;
  }, []);
  const inst = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = inst.current;
    if (!m) return;
    const o = new THREE.Object3D();
    keys.forEach((k, i) => {
      o.position.set(k[0], k[1], k[2]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [keys]);
  return (
    <group position={[KEYBOARD.x, DESK.top + 0.004, KEYBOARD.z]} rotation-y={0.04}>
      <RoundedBox args={[0.45, 0.022, 0.15]} radius={0.008} position={[0, 0.011, 0]} material={mats.plastic} />
      <mesh position={[0, 0.023, 0]} rotation-x={-Math.PI / 2} material={mats.rgb}>
        <planeGeometry args={[0.43, 0.135]} />
      </mesh>
      <instancedMesh ref={inst} args={[undefined, undefined, keys.length]} position={[0, 0.031, 0]} material={mats.key}>
        <boxGeometry args={[0.023, 0.012, 0.021]} />
      </instancedMesh>
      <RoundedBox args={[0.19, 0.012, 0.021]} radius={0.003} position={[-0.005, 0.031, 0.052]} material={mats.key} />
    </group>
  );
}

function GamingPC({ mats, fans, lightRef }: { mats: Mats; fans: React.RefObject<THREE.Group[]>; lightRef: React.RefObject<THREE.PointLight | null> }) {
  // case: 0.46 long (x), 0.5 tall, 0.23 deep (z); tempered glass faces +z (toward the chair side / camera)
  const L = 0.46;
  const Hh = 0.5;
  const D = 0.23;
  return (
    <group position={[-1.12, DESK.top, -0.08]} scale-x={-1}>
      {/* frame */}
      <RoundedBox args={[L, 0.02, D]} radius={0.006} position={[0, 0.01, 0]} material={mats.frame} />
      <RoundedBox args={[L, 0.02, D]} radius={0.006} position={[0, Hh - 0.01, 0]} material={mats.frame} />
      <mesh position={[0, Hh / 2, -D / 2 + 0.005]} material={mats.frame}>
        <boxGeometry args={[L, Hh, 0.01]} />
      </mesh>
      <mesh position={[L / 2 - 0.005, Hh / 2, 0]} material={mats.frame}>
        <boxGeometry args={[0.01, Hh, D]} />
      </mesh>
      <mesh position={[-L / 2 + 0.005, Hh / 2, 0]} material={mats.frame}>
        <boxGeometry args={[0.01, Hh, D]} />
      </mesh>
      {/* motherboard */}
      <mesh position={[0.02, Hh / 2, -D / 2 + 0.014]} material={mats.plastic}>
        <boxGeometry args={[0.3, 0.32, 0.006]} />
      </mesh>
      {/* CPU AIO pump */}
      <group position={[0.04, Hh * 0.62, -D / 2 + 0.035]}>
        <mesh rotation-x={Math.PI / 2} material={mats.frame}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 32]} />
        </mesh>
        <mesh position={[0, 0, 0.016]} material={mats.rgb2}>
          <ringGeometry args={[0.022, 0.03, 32]} />
        </mesh>
      </group>
      {/* RAM sticks */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0.12 + i * 0.014, Hh * 0.62, -D / 2 + 0.035]}>
          <mesh material={mats.frame}>
            <boxGeometry args={[0.006, 0.12, 0.03]} />
          </mesh>
          <mesh position={[0, 0.062, 0]} material={mats.rgb}>
            <boxGeometry args={[0.006, 0.008, 0.03]} />
          </mesh>
        </group>
      ))}
      {/* GPU */}
      <group position={[0.0, Hh * 0.34, -0.01]}>
        <RoundedBox args={[0.3, 0.05, 0.13]} radius={0.01} material={mats.bezel} />
        <mesh position={[0, 0.026, 0.066]} material={mats.rgb2}>
          <boxGeometry args={[0.26, 0.004, 0.004]} />
        </mesh>
      </group>
      {/* front intake fans (on the −X end, facing the desk centre) */}
      {[0.12, 0.26, 0.4].map((y, i) => (
        <group key={i} position={[-L / 2 + 0.03, y, 0]} rotation-y={Math.PI / 2}>
          <mesh material={mats.rgb}>
            <torusGeometry args={[0.055, 0.004, 8, 40]} />
          </mesh>
          <group ref={(g) => void (g && (fans.current[i] = g))}>
            {Array.from({ length: 7 }, (_, k) => (
              <mesh key={k} rotation-z={(k / 7) * Math.PI * 2} position={[0, 0, 0]} material={mats.plastic}>
                <boxGeometry args={[0.012, 0.1, 0.003]} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {/* tempered glass */}
      <mesh position={[0, Hh / 2, D / 2]} material={mats.glass}>
        <boxGeometry args={[L - 0.01, Hh - 0.02, 0.006]} />
      </mesh>
      <pointLight ref={lightRef} position={[0, Hh / 2, D / 2 + 0.05]} intensity={1.4} distance={1.4} decay={2} />
      {/* feet */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.18 * s, -0.005, 0]} material={mats.frame}>
          <boxGeometry args={[0.04, 0.01, D - 0.02]} />
        </mesh>
      ))}
    </group>
  );
}
