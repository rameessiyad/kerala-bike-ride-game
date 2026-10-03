"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGame, type Weather } from "@/store/gameStore";
import { h, rx, rdx, CPS, TREES, HOUSES, RIVER_Z, env } from "@/lib/game/world";
import {
  Terrain,
  River,
  Trees,
  Houses,
  Poles,
  Grass,
  SkyDome,
  BikeModel,
  VehicleModel,
  skyCol,
} from "./Visuals";
import { Environment, Lightformer } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { startAudio, setEngine, setMuted, beep } from "@/lib/audio/engine";

const KEYS = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
];

function Rain() {
  const weather = useGame((s) => s.weather);
  const ref = useRef<THREE.Points>(null!);
  const pos = useMemo(() => {
    const a = new Float32Array(1800 * 3);
    for (let i = 0; i < a.length; i += 3) {
      a[i] = (Math.random() - 0.5) * 60;
      a[i + 1] = Math.random() * 30;
      a[i + 2] = (Math.random() - 0.5) * 60;
    }
    return a;
  }, []);
  useFrame(({ camera }, d) => {
    if (weather !== "rain") return;
    const p = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - 35 * d;
      if (y < 0) y = 30;
      p.setY(i, y);
    }
    p.needsUpdate = true;
    ref.current.position.set(camera.position.x, 0, camera.position.z);
  });
  return (
    <points ref={ref} visible={weather === "rain"} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b8c7d6" size={0.12} transparent opacity={0.7} />
    </points>
  );
}

const CLOCKS = ["Morning", "Day", "Evening", "Night"];
function Sky() {
  const sun = useRef<THREE.DirectionalLight>(null!),
    amb = useRef<THREE.AmbientLight>(null!);
  const { scene } = useThree();
  const day = useMemo(() => new THREE.Color("#9fd0e8"), []),
    night = useMemo(() => new THREE.Color("#0a1020"), []),
    tmp = useMemo(() => new THREE.Color(), []);
  const target = useRef(new THREE.Object3D());
  useEffect(() => {
    scene.fog = new THREE.Fog("#9fd0e8", 30, 220);
    scene.add(target.current);
  }, [scene]);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime / 150 + 0.1) % 1,
      el = Math.sin(t * Math.PI * 2 - 0.4),
      dayAmt = THREE.MathUtils.clamp(el * 2 + 0.3, 0, 1);
    const wx: Weather = useGame.getState().weather,
      dim = wx === "clear" ? 1 : wx === "cloudy" ? 0.7 : 0.5;
    env.night = 1 - dayAmt;
    const label = CLOCKS[Math.floor(t * 4) % 4];
    if (label !== useGame.getState().clock)
      useGame.getState().set({ clock: label });
    const p = useGame.getState();
    sun.current.position.set(
      p.px + Math.cos(t * 6.28) * 80,
      20 + Math.abs(el) * 80,
      p.pz + 40,
    );
    target.current.position.set(p.px, 0, p.pz);
    sun.current.target = target.current;
    sun.current.intensity = Math.max(0, el) * 2.8 * dim;
    amb.current.intensity = (0.12 + 0.55 * dayAmt) * dim + 0.05;
    tmp.copy(night).lerp(day, dayAmt).multiplyScalar(dim);
    scene.background = null;
    const WARM = new THREE.Color("#ff9a5a");
    tmp.lerp(
      WARM,
      THREE.MathUtils.clamp(1 - Math.abs(el) * 3.5, 0, 1) * 0.55 * dim,
    );
    skyCol.hor.copy(tmp);
    skyCol.top
      .set("#02040a")
      .lerp(new THREE.Color("#3d7fc4"), dayAmt)
      .multiplyScalar(dim);
    scene.environmentIntensity = (0.12 + 0.8 * dayAmt) * dim;
    if (scene.fog) {
      scene.fog.color.copy(tmp);
      const f = scene.fog as THREE.Fog;
      f.far = wx === "rain" ? 110 : 220;
    }
  });
  return (
    <>
      <ambientLight ref={amb} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-bias={-0.0004}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-far={200}
      />
    </>
  );
}

type V = {
  z: number;
  v: number;
  lane: number;
  kind: "car" | "bus" | "bike";
  c: string;
};
function Traffic({ pl }: { pl: React.RefObject<THREE.Group | null> }) {
  const vs = useRef<V[]>(
    Array.from({ length: 7 }, (_, i) => ({
      z: -50 - i * 62,
      v: 8 + (i % 4) * 3,
      lane: i % 2 ? -2.3 : 2.3,
      kind: (["car", "bus", "bike"] as const)[i % 3],
      c: ["#c0392b", "#2e86c1", "#f1c40f", "#ecf0f1"][i % 4],
    })),
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, d) => {
    const dt = Math.min(d, 0.05),
      pp = pl.current?.position;
    vs.current.forEach((v, i) => {
      v.z += (v.lane < 0 ? v.v : -v.v) * dt;
      if (v.z > 40) v.z = -420;
      if (v.z < -430) v.z = 30;
      const g = refs.current[i];
      if (!g) return;
      const dz = v.lane < 0 ? 1 : -1;
      g.position.set(rx(v.z) + v.lane, 0.05, v.z);
      g.rotation.y = Math.atan2(rdx(v.z) * dz, dz);
      if (pp && Math.hypot(pp.x - g.position.x, pp.z - g.position.z) < 2)
        useGame.getState().set({ toast: "Crash!" });
    });
  });
  return (
    <>
      {vs.current.map((v, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <VehicleModel kind={v.kind} color={v.c} />
        </group>
      ))}
    </>
  );
}

function Rider({
  groupRef,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();
  const z0 = 20,
    st = useRef({
      x: rx(z0),
      z: z0,
      hd: Math.atan2(-rdx(z0), -1),
      v: 0,
      lean: 0,
      shake: 0,
      cp: 0,
      dist: 0,
      top: 0,
      fuel: 100,
      acc: 0,
      t0: performance.now(),
      last: { x: rx(z0), z: z0, hd: Math.atan2(-rdx(z0), -1) },
    });
  const keys = useRef<Record<string, boolean>>({}),
    light = useRef<THREE.SpotLight>(null!),
    tgt = useRef<THREE.Object3D>(null!);
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (KEYS.includes(e.code)) e.preventDefault();
      keys.current[e.code] = true;
      const g = useGame.getState();
      if (e.code === "Escape")
        g.set({
          phase:
            g.phase === "playing"
              ? "paused"
              : g.phase === "paused"
                ? "playing"
                : g.phase,
        });
      if (e.code === "KeyR") {
        const l = st.current.last;
        Object.assign(st.current, { x: l.x, z: l.z, hd: l.hd, v: 0 });
      }
      if (e.code === "KeyT")
        g.set({
          weather: (["clear", "cloudy", "rain"] as const)[
            (["clear", "cloudy", "rain"].indexOf(g.weather) + 1) % 3
          ],
        });
      if (e.code === "KeyM") {
        setMuted(!g.muted);
        g.set({ muted: !g.muted });
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    startAudio();
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);
  useFrame((_, d) => {
    const gs = useGame.getState();
    if (gs.phase !== "playing") return;
    const s = st.current,
      k = keys.current,
      dt = Math.min(d, 0.05),
      g = groupRef.current!;
    const thr = (k.KeyW || k.ArrowUp) && s.fuel > 0,
      brk = k.KeyS || k.ArrowDown;
    const steer =
      (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0);
    if (thr) s.v += 13 * (1 - s.v / 40) * dt;
    if (brk) s.v -= (s.v > 0.5 ? 24 : 7) * dt;
    if (k.Space) s.v -= Math.sign(s.v) * Math.min(Math.abs(s.v), 30 * dt);
    s.v = Math.max(-5, s.v) * (1 - 0.2 * dt);
    const off = Math.abs(s.x - rx(s.z)) > 5.2;
    if (off) s.v *= 1 - 1.4 * dt;
    s.hd +=
      ((steer * dt * 1.9 * Math.min(1, Math.abs(s.v) / 6)) /
        (1 + Math.abs(s.v) / 22)) *
      Math.sign(s.v || 1);
    s.x += Math.sin(s.hd) * s.v * dt;
    s.z += Math.cos(s.hd) * s.v * dt;
    s.dist += Math.abs(s.v) * dt;
    for (const t of TREES)
      if (Math.abs(t.x - s.x) < 1.3 && Math.abs(t.z - s.z) < 1.3) {
        s.v *= -0.2;
        s.shake = 1;
        s.x -= Math.sin(s.hd) * 0.5;
        s.z -= Math.cos(s.hd) * 0.5;
      }
    if (gs.toast === "Crash!") {
      s.v *= 0.5;
      s.shake = 1;
      gs.set({ toast: "" });
    }
    s.fuel = Math.max(0, s.fuel - (0.25 + Math.abs(s.v) * 0.03) * dt);
    s.top = Math.max(s.top, Math.abs(s.v) * 3.6);
    const y = h(s.x, s.z),
      f = [Math.sin(s.hd) * 0.8, Math.cos(s.hd) * 0.8],
      pitch = Math.atan2(
        h(s.x + f[0], s.z + f[1]) - h(s.x - f[0], s.z - f[1]),
        1.6,
      );
    if (y < -2.5)
      Object.assign(s, { x: s.last.x, z: s.last.z, hd: s.last.hd, v: 0 });
    s.lean = THREE.MathUtils.lerp(
      s.lean,
      steer * Math.min(1, Math.abs(s.v) / 18) * 0.5,
      1 - Math.exp(-6 * dt),
    );
    g.position.set(s.x, y, s.z);
    g.rotation.order = "YXZ";
    g.rotation.set(-pitch, s.hd, s.lean);
    if (s.cp < CPS.length && s.z < CPS[s.cp]) {
      s.cp++;
      s.fuel = Math.min(100, s.fuel + 40);
      s.last = { x: s.x, z: s.z, hd: s.hd };
      beep();
      gs.set({
        checkpoint: s.cp,
        toast: `Checkpoint ${s.cp}/${CPS.length} · fuel topped up`,
      });
      setTimeout(() => useGame.getState().set({ toast: "" }), 2000);
      if (s.cp === CPS.length) {
        const time = (performance.now() - s.t0) / 1000,
          best = Math.min(
            time,
            Number(localStorage.getItem("kbr-best") ?? Infinity),
          );
        localStorage.setItem("kbr-best", String(best));
        gs.set({
          phase: "completed",
          result: { dist: s.dist, time, top: s.top, best },
        });
      }
    }
    env.v = s.v;
    s.shake = Math.max(0, s.shake - 2 * dt);
    setEngine(Math.abs(s.v), !!thr);
    s.acc += dt;
    if (s.acc > 0.1) {
      s.acc = 0;
      gs.set({
        speed: Math.round(Math.abs(s.v) * 3.6),
        fuel: s.fuel,
        px: s.x,
        pz: s.z,
      });
    }
    light.current.intensity = env.night * 60;
    const cd = gs.camDist,
      want = new THREE.Vector3(
        s.x - Math.sin(s.hd) * cd,
        y + 3.2,
        s.z - Math.cos(s.hd) * cd,
      );
    camera.position.lerp(want, 1 - Math.exp(-5 * dt));
    const sh = s.shake * 0.4 + Math.max(0, Math.abs(s.v) - 28) * 0.01;
    camera.position.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * sh,
        (Math.random() - 0.5) * sh,
        0,
      ),
    );
    camera.lookAt(s.x + Math.sin(s.hd) * 4, y + 1.2, s.z + Math.cos(s.hd) * 4);
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = THREE.MathUtils.lerp(pc.fov, 60 + Math.abs(s.v) * 0.5, 0.05);
    pc.updateProjectionMatrix();
  });
  return (
    <group ref={groupRef}>
      <BikeModel />
      <spotLight
        ref={light}
        position={[0, 1, 0.9]}
        angle={0.5}
        penumbra={0.6}
        distance={50}
        target={tgt.current ?? undefined}
      />
      <object3D ref={tgt} position={[0, 0, 10]} />
    </group>
  );
}

function Scene() {
  const pl = useRef<THREE.Group>(null);
  return (
    <>
      <Sky />
      <SkyDome />
      <Terrain />
      <River />
      <Trees />
      <Houses />
      <Poles />
      <Grass />
      <Rain />
      {CPS.map((z, i) => (
        <mesh key={i} position={[rx(z), 2.5, z]}>
          <boxGeometry args={[10, 0.3, 0.3]} />
          <meshStandardMaterial
            color="#ffd400"
            emissive="#ffd400"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      <Rider groupRef={pl} />
      <Traffic pl={pl} />
    </>
  );
}

export default function GameCanvas() {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.5]}
      camera={{ fov: 60, near: 0.1, far: 500, position: [0, 4, 30] }}
      gl={{ antialias: false, toneMapping: THREE.NoToneMapping }}
    >
      <Scene />
      <Environment resolution={128}>
        <Lightformer
          form="rect"
          intensity={2.5}
          position={[0, 6, -6]}
          scale={[14, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          position={[-8, 3, 4]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[8, 3, 4]}
          scale={[6, 6, 1]}
        />
      </Environment>
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={0.85} intensity={0.6} />
        <Vignette offset={0.3} darkness={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
