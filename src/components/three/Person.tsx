"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { CHAIR, KEYBOARD, MOUSE } from "@/lib/scene";
import { state } from "@/lib/state";

/**
 * A stylised person at the desk, built from primitives (vinyl-toy style) so it can be posed live:
 * the arms are solved with two-bone IK every frame, the head tracks the camera on the hero shot and
 * the centre monitor afterwards, and the chair swivels round to face the viewer at the start.
 *
 * Local frame: origin on the floor under the chair, the person faces −Z.
 */

const SKIN = "#a8704b";
const HOODIE = "#171c26";
const PANTS = "#1c2433";
const HAIR = "#0d0a09";

/** How far the chair turns toward the lens on the hero shot (radians). */
const SWIVEL = -0.95;

const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();

/** Two-bone IK: the elbow/knee for a root, an end target, bone lengths and a pole direction. */
function solve(root: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3, outMid: THREE.Vector3, outEnd: THREE.Vector3) {
  _dir.copy(target).sub(root);
  const d = THREE.MathUtils.clamp(_dir.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  _dir.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  _perp.copy(pole).addScaledVector(_dir, -pole.dot(_dir)).normalize();
  outMid.copy(root).addScaledVector(_dir, a).addScaledVector(_perp, h);
  outEnd.copy(root).addScaledVector(_dir, d);
}

/** Place a Y-aligned mesh so it spans a → b. */
function span(m: THREE.Object3D | null, a: THREE.Vector3, b: THREE.Vector3) {
  if (!m) return;
  m.position.copy(a).add(b).multiplyScalar(0.5);
  _dir.copy(b).sub(a).normalize();
  m.quaternion.copy(_q.setFromUnitVectors(_up, _dir));
}

const toLocal = (wx: number, wy: number, wz: number) => v(wx - CHAIR.x, wy, wz - CHAIR.z);

export function Person() {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const lids = useRef<THREE.Group>(null);
  const pupils = useRef<THREE.Group>(null);
  const limbs = useRef<Record<string, THREE.Mesh | null>>({});
  const hands = useRef<Record<string, THREE.Mesh | null>>({});
  const joints = useRef<Record<string, THREE.Mesh | null>>({});

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.55 }),
      hoodie: new THREE.MeshStandardMaterial({ color: HOODIE, roughness: 0.9 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.85 }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.7 }),
      white: new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: "#0a0b0d", roughness: 0.4 }),
      iris: new THREE.MeshStandardMaterial({ color: "#1a0f08", roughness: 0.1 }),
      lip: new THREE.MeshStandardMaterial({ color: "#6b3a2a", roughness: 0.6 }),
      headset: new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.35, metalness: 0.6 }),
      rgb: new THREE.MeshStandardMaterial({ color: "#000", emissive: "#3ad7ff", emissiveIntensity: 3, toneMapped: false }),
      chair: new THREE.MeshStandardMaterial({ color: "#101114", roughness: 0.55 }),
      accent: new THREE.MeshStandardMaterial({ color: "#ff6a1a", roughness: 0.5 }),
      metal: new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.3, metalness: 0.9 }),
      sole: new THREE.MeshStandardMaterial({ color: "#e9e9e6", roughness: 0.6 }),
    }),
    [],
  );

  // rig points (local)
  const P = useMemo(
    () => ({
      shoulderL: v(-0.19, 1.05, -0.07),
      shoulderR: v(0.19, 1.05, -0.07),
      elbowL: v(),
      elbowR: v(),
      handL: v(),
      handR: v(),
      tgtL: v(),
      tgtR: v(),
      // typing / mouse targets, from the desk layout
      keysL: toLocal(KEYBOARD.x - 0.09, 0.805, KEYBOARD.z + 0.02),
      mouseR: toLocal(MOUSE.x, 0.8, MOUSE.z + 0.01),
      // relaxed, swivelled toward the viewer
      restL: v(-0.14, 0.64, -0.3),
      restR: v(0.27, 0.71, -0.08),
      poleL: v(-1, -0.7, 0.5),
      poleR: v(1, -0.7, 0.5),
    }),
    [],
  );

  // static legs
  const legs = useMemo(() => {
    const out: { a: THREE.Vector3; b: THREE.Vector3; r: number; mat: "pants" }[] = [];
    for (const s of [-1, 1]) {
      const hip = v(0.1 * s, 0.57, 0.0);
      const knee = v(0.12 * s, 0.58, -0.4);
      const ankle = v(0.13 * s, 0.11, -0.45);
      out.push({ a: hip, b: knee, r: 0.078, mat: "pants" }, { a: knee, b: ankle, r: 0.062, mat: "pants" });
    }
    return out;
  }, []);

  const L1 = 0.29;
  const L2 = 0.27;
  const _cam = useMemo(() => new THREE.Vector3(), []);
  const blink = useRef({ next: 2, t: 0 });
  const look = useRef({ yaw: 0, pitch: 0, swivel: SWIVEL, pose: 0 });

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    const shown = state.shown;
    const hero = THREE.MathUtils.smoothstep(1 - shown, 0, 1); // 1 on the hero shot, 0 once behind the desk
    const L = look.current;

    // chair swivel (eases a little behind the camera so it reads as a reaction)
    L.swivel = THREE.MathUtils.damp(L.swivel, SWIVEL * Math.pow(hero, 1.4), 3, dt);
    L.pose = THREE.MathUtils.damp(L.pose, Math.pow(hero, 0.8), 4, dt);
    if (root.current) root.current.rotation.y = L.swivel;

    // where to look: the camera on the hero, the centre monitor after
    let yaw = 0;
    let pitch = -0.08;
    if (root.current && head.current) {
      _cam.copy(st.camera.position);
      root.current.worldToLocal(_cam);
      _cam.y -= 1.28;
      const camYaw = Math.atan2(-_cam.x, -_cam.z);
      const camPitch = Math.atan2(_cam.y, Math.hypot(_cam.x, _cam.z));
      // straight ahead at the centre monitor once the chair has swung back
      yaw = THREE.MathUtils.lerp(0, THREE.MathUtils.clamp(camYaw, -0.9, 0.9), hero);
      pitch = THREE.MathUtils.lerp(-0.1, THREE.MathUtils.clamp(camPitch, -0.35, 0.35), hero);
      // a lazy idle drift
      yaw += Math.sin(t * 0.37) * 0.03;
      pitch += Math.sin(t * 0.53) * 0.02;
      L.yaw = THREE.MathUtils.damp(L.yaw, yaw, 4, dt);
      L.pitch = THREE.MathUtils.damp(L.pitch, pitch, 4, dt);
      head.current.rotation.set(-L.pitch, L.yaw, Math.sin(t * 0.41) * 0.02, "YXZ");
      if (pupils.current) {
        pupils.current.position.x = THREE.MathUtils.clamp(Math.sin(yaw - L.yaw) * 0.02, -0.006, 0.006);
      }
    }

    // breathing
    if (torso.current) torso.current.scale.set(1 + Math.sin(t * 1.7) * 0.008, 1 + Math.sin(t * 1.7) * 0.012, 1);

    // blink
    const b = blink.current;
    b.t += dt;
    if (b.t > b.next) {
      b.t = 0;
      b.next = 2 + Math.random() * 3.5;
    }
    if (lids.current) {
      const k = b.t < 0.14 ? Math.sin((b.t / 0.14) * Math.PI) : 0;
      lids.current.scale.y = 0.05 + k * 0.95;
    }

    // arms: blend typing ↔ relaxed, with a typing jitter
    const w = L.pose;
    const typeL = Math.max(0, Math.sin(t * 17)) * 0.012 * (1 - w);
    P.tgtL.lerpVectors(P.keysL, P.restL, w);
    P.tgtL.y += typeL + Math.sin(t * 9.3) * 0.004 * (1 - w);
    P.tgtL.x += Math.sin(t * 2.1) * 0.02 * (1 - w);
    P.tgtR.lerpVectors(P.mouseR, P.restR, w);
    P.tgtR.x += Math.sin(t * 1.3) * 0.012 * (1 - w);
    P.tgtR.z += Math.cos(t * 1.7) * 0.01 * (1 - w);

    solve(P.shoulderL, P.tgtL, L1, L2, P.poleL, P.elbowL, P.handL);
    solve(P.shoulderR, P.tgtR, L1, L2, P.poleR, P.elbowR, P.handR);
    const Lm = limbs.current;
    span(Lm.upperL, P.shoulderL, P.elbowL);
    span(Lm.foreL, P.elbowL, P.handL);
    span(Lm.upperR, P.shoulderR, P.elbowR);
    span(Lm.foreR, P.elbowR, P.handR);
    joints.current.elbowL?.position.copy(P.elbowL);
    joints.current.elbowR?.position.copy(P.elbowR);
    for (const side of ["L", "R"] as const) {
      const hnd = hands.current[side];
      if (!hnd) continue;
      const elbow = side === "L" ? P.elbowL : P.elbowR;
      const end = side === "L" ? P.handL : P.handR;
      _dir.copy(end).sub(elbow).normalize();
      hnd.position.copy(end).addScaledVector(_dir, 0.035);
      // palm down, fingers along the forearm
      hnd.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), _dir.setY(_dir.y * 0.3).normalize());
    }
  });

  const limb = (key: string, r: number, len: number, mat: THREE.Material) => (
    <mesh ref={(m) => void (limbs.current[key] = m)} material={mat}>
      <capsuleGeometry args={[r, len, 6, 14]} />
    </mesh>
  );

  return (
    <group position={[CHAIR.x, 0, CHAIR.z]}>
      <group ref={root}>
        <Chair mats={mats} />

        {/* legs */}
        {legs.map((l, i) => {
          const len = l.a.distanceTo(l.b);
          const m = new THREE.Object3D();
          span(m, l.a, l.b);
          return (
            <mesh key={i} position={m.position} quaternion={m.quaternion} material={mats.pants}>
              <capsuleGeometry args={[l.r, len, 6, 14]} />
            </mesh>
          );
        })}
        {[-1, 1].map((s) => (
          <group key={s} position={[0.13 * s, 0.05, -0.5]}>
            <RoundedBox args={[0.105, 0.08, 0.26]} radius={0.035} material={mats.sole} />
            <RoundedBox args={[0.1, 0.05, 0.16]} radius={0.02} position={[0, 0.04, 0.04]} material={mats.dark} />
          </group>
        ))}

        {/* torso (hoodie) */}
        <group ref={torso} position={[0, 0.6, 0.02]} rotation-x={-0.12}>
          <mesh position={[0, 0.24, 0]} scale={[1.22, 1, 0.78]} material={mats.hoodie}>
            <capsuleGeometry args={[0.15, 0.26, 8, 24]} />
          </mesh>
          {/* hood bunched behind the neck */}
          <mesh position={[0, 0.47, 0.055]} rotation-x={Math.PI / 2 + 0.35} material={mats.hoodie}>
            <torusGeometry args={[0.085, 0.035, 10, 24]} />
          </mesh>
          {/* drawstrings */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.035 * s, 0.37, -0.108]} rotation-x={0.12} material={mats.accent}>
              <cylinderGeometry args={[0.005, 0.005, 0.12, 6]} />
            </mesh>
          ))}
          {/* pocket */}
          <RoundedBox args={[0.2, 0.08, 0.02]} radius={0.01} position={[0, 0.08, -0.115]} material={mats.hoodie} />
        </group>

        {/* arms */}
        {limb("upperL", 0.052, 0.29 - 0.1, mats.hoodie)}
        {limb("foreL", 0.045, 0.27 - 0.09, mats.hoodie)}
        {limb("upperR", 0.052, 0.29 - 0.1, mats.hoodie)}
        {limb("foreR", 0.045, 0.27 - 0.09, mats.hoodie)}
        {(["elbowL", "elbowR"] as const).map((k) => (
          <mesh key={k} ref={(m) => void (joints.current[k] = m)} material={mats.hoodie}>
            <sphereGeometry args={[0.05, 14, 10]} />
          </mesh>
        ))}
        {(["L", "R"] as const).map((k) => (
          <mesh key={k} ref={(m) => void (hands.current[k] = m)} material={mats.skin} scale={[1.05, 0.55, 1.35]}>
            <sphereGeometry args={[0.036, 16, 12]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.19 * s, 1.05, -0.07]} material={mats.hoodie}>
            <sphereGeometry args={[0.062, 16, 12]} />
          </mesh>
        ))}

        {/* neck */}
        <mesh position={[0, 1.13, -0.06]} material={mats.skin}>
          <cylinderGeometry args={[0.045, 0.05, 0.1, 16]} />
        </mesh>

        {/* head, pivoting at the top of the neck */}
        <group ref={head} position={[0, 1.16, -0.065]}>
          <group position={[0, 0.0, -0.01]}>
            <mesh position={[0, 0.11, 0]} scale={[0.9, 1.08, 1]} material={mats.skin}>
              <sphereGeometry args={[0.104, 32, 24]} />
            </mesh>
            {/* jaw / chin */}
            <mesh position={[0, 0.055, -0.03]} scale={[0.82, 0.72, 0.9]} material={mats.skin}>
              <sphereGeometry args={[0.085, 24, 16]} />
            </mesh>
            {/* ears */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.093 * s, 0.1, 0.01]} scale={[0.4, 1, 0.75]} material={mats.skin}>
                <sphereGeometry args={[0.028, 12, 10]} />
              </mesh>
            ))}
            {/* nose */}
            <mesh position={[0, 0.09, -0.103]} scale={[0.8, 1.25, 1]} material={mats.skin}>
              <sphereGeometry args={[0.017, 12, 10]} />
            </mesh>
            {/* eyes */}
            {[-1, 1].map((s) => (
              <group key={s} position={[0.036 * s, 0.118, -0.083]}>
                <mesh material={mats.white} scale={[1, 0.85, 0.6]}>
                  <sphereGeometry args={[0.017, 16, 12]} />
                </mesh>
              </group>
            ))}
            <group ref={pupils}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[0.036 * s, 0.117, -0.093]} material={mats.iris}>
                  <sphereGeometry args={[0.0095, 12, 10]} />
                </mesh>
              ))}
            </group>
            {/* eyelids (blink) */}
            <group ref={lids} position={[0, 0.128, 0]}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[0.036 * s, -0.004, -0.086]} scale={[1.1, 1, 0.7]} material={mats.skin}>
                  <sphereGeometry args={[0.019, 14, 10]} />
                </mesh>
              ))}
            </group>
            {/* brows */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.037 * s, 0.148, -0.092]} rotation={[0.2, 0, -0.12 * s]} material={mats.hair}>
                <boxGeometry args={[0.036, 0.007, 0.01]} />
              </mesh>
            ))}
            {/* mouth: a soft half-smile */}
            <mesh position={[0, 0.058, -0.098]} rotation={[0.15, 0, Math.PI]} material={mats.lip}>
              <torusGeometry args={[0.018, 0.0035, 6, 16, Math.PI * 0.8]} />
            </mesh>
            {/* hair: a cap plus a swept fringe */}
            <mesh position={[0, 0.125, 0.006]} rotation-x={0.42} scale={[0.95, 1.05, 1.06]} material={mats.hair}>
              <sphereGeometry args={[0.108, 32, 16, 0, Math.PI * 2, 0, 1.45]} />
            </mesh>
            <mesh position={[0.012, 0.208, -0.045]} rotation={[0.5, 0, -0.25]} scale={[1.2, 0.45, 0.9]} material={mats.hair}>
              <sphereGeometry args={[0.06, 20, 12]} />
            </mesh>

            {/* gaming headset */}
            <mesh position={[0, 0.115, 0.012]} rotation-y={0} material={mats.headset}>
              <torusGeometry args={[0.122, 0.011, 10, 40, Math.PI]} />
            </mesh>
            {[-1, 1].map((s) => (
              <group key={s} position={[0.118 * s, 0.098, 0.012]} rotation-z={Math.PI / 2}>
                <mesh material={mats.headset}>
                  <cylinderGeometry args={[0.048, 0.048, 0.036, 24]} />
                </mesh>
                <mesh position={[0, 0.019 * s, 0]} rotation-x={Math.PI / 2} material={mats.rgb}>
                  <torusGeometry args={[0.036, 0.004, 8, 32]} />
                </mesh>
              </group>
            ))}
            <Mic material={mats.headset} tip={mats.rgb} />
          </group>
        </group>
      </group>
    </group>
  );
}

function Mic({ material, tip }: { material: THREE.Material; tip: THREE.Material }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([v(-0.135, 0.085, 0.0), v(-0.13, 0.05, -0.06), v(-0.08, 0.04, -0.105), v(-0.04, 0.05, -0.115)]);
    return new THREE.TubeGeometry(curve, 24, 0.005, 8, false);
  }, []);
  return (
    <group>
      <mesh geometry={geo} material={material} />
      <mesh position={[-0.04, 0.05, -0.115]} material={tip}>
        <sphereGeometry args={[0.009, 10, 8]} />
      </mesh>
    </group>
  );
}

function Chair({ mats }: { mats: Record<string, THREE.Material> }) {
  return (
    <group>
      {/* seat */}
      <RoundedBox args={[0.52, 0.09, 0.5]} radius={0.04} position={[0, 0.47, 0.03]} material={mats.chair} />
      {/* backrest with bolsters and an orange racing stripe */}
      <group position={[0, 0.84, 0.3]} rotation-x={0.14}>
        <RoundedBox args={[0.5, 0.64, 0.09]} radius={0.04} material={mats.chair} />
        {[-1, 1].map((s) => (
          <RoundedBox key={s} args={[0.08, 0.6, 0.12]} radius={0.035} position={[0.22 * s, -0.02, -0.01]} material={mats.chair} />
        ))}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.13 * s, 0, -0.047]} material={mats.accent}>
            <boxGeometry args={[0.02, 0.58, 0.004]} />
          </mesh>
        ))}
        <RoundedBox args={[0.24, 0.1, 0.06]} radius={0.03} position={[0, 0.22, -0.06]} material={mats.chair} />
      </group>
      {/* armrests */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0.3 * s, 0, 0.08]}>
          <mesh position={[0, 0.58, 0]} material={mats.metal}>
            <boxGeometry args={[0.03, 0.2, 0.04]} />
          </mesh>
          <RoundedBox args={[0.07, 0.03, 0.24]} radius={0.012} position={[0, 0.69, -0.02]} material={mats.chair} />
        </group>
      ))}
      {/* gas lift + star base */}
      <mesh position={[0, 0.27, 0.03]} material={mats.metal}>
        <cylinderGeometry args={[0.028, 0.034, 0.36, 16]} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[0, 0.07, 0.03]} rotation-y={a}>
            <mesh position={[0, 0, 0.17]} rotation-x={0.08} material={mats.chair}>
              <boxGeometry args={[0.05, 0.035, 0.34]} />
            </mesh>
            <mesh position={[0, -0.035, 0.33]} material={mats.dark}>
              <sphereGeometry args={[0.03, 12, 10]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
