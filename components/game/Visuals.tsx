'use client'
import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useGame } from '@/store/gameStore'
import { h, rx, rdx, TREES, HOUSES, RIVER_Z, env } from '@/lib/game/world'

export const skyCol = { top: new THREE.Color('#3d7fc4'), hor: new THREE.Color('#9fd0e8') }
const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } }
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

function canvasTex(w: number, hh: number, draw: (c: CanvasRenderingContext2D, r: () => number) => void, repeat: [number, number] = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh
  draw(c.getContext('2d')!, rnd(3))
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}
const speckle = (x: CanvasRenderingContext2D, w: number, hh: number, r: () => number, n: number, light: string, dark: string) => {
  for (let i = 0; i < n; i++) { x.fillStyle = r() < 0.5 ? light : dark; x.globalAlpha = 0.08 + r() * 0.2; const s = 1 + r() * 2; x.fillRect(r() * w, r() * hh, s, s) }
  x.globalAlpha = 1
}

function strip(half: number, y: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  for (let z = 30, i = 0; z >= -430; z -= 2, i++) {
    const c = rx(z), t = Math.atan2(rdx(z), 1), nx = Math.cos(t), nz = -Math.sin(t)
    pos.push(c - nx * half, y, z - nz * half, c + nx * half, y, z + nz * half); uv.push(0, (30 - z) / 8, 1, (30 - z) / 8)
    if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals()
  return g
}

export function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyCol.top }, hor: { value: skyCol.hor } },
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying float vY; void main(){ gl_FragColor = vec4(mix(hor, top, pow(clamp(vY,0.,1.),0.55)),1.); }',
  }), [])
  const stars = useRef<THREE.Group>(null!), sky = useRef<THREE.Mesh>(null!)
  useFrame(({ camera }) => { sky.current.position.copy(camera.position); stars.current.visible = env.night > 0.6; stars.current.position.copy(camera.position) })
  return <><mesh ref={sky} material={mat} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[400, 24, 16]} /></mesh><group ref={stars}><Stars radius={300} depth={20} count={1500} factor={5} fade /></group></>
}

export function Terrain() {
  const road = useRef<THREE.MeshStandardMaterial>(null!)
  const grass = useMemo(() => canvasTex(512, 512, (c, r) => {
    c.fillStyle = '#c4c4c4'; c.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 70; i++) { c.fillStyle = r() < 0.5 ? '#ffffff' : '#7a7a7a'; c.globalAlpha = 0.1; c.beginPath(); c.arc(r() * 512, r() * 512, 20 + r() * 50, 0, 7); c.fill() }
    c.globalAlpha = 1; speckle(c, 512, 512, r, 12000, '#fff', '#444')
  }, [70, 130]), [])
  const asphalt = useMemo(() => canvasTex(256, 512, (c, r) => {
    c.fillStyle = '#3a3b40'; c.fillRect(0, 0, 256, 512); speckle(c, 256, 512, r, 9000, '#8a8a8a', '#111')
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(70, 0, 28, 512); c.fillRect(158, 0, 28, 512)
    c.fillStyle = '#e8e8e0'; c.fillRect(14, 0, 5, 512); c.fillRect(237, 0, 5, 512); c.fillRect(125, 0, 6, 256)
  }), [])
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(260, 480, 130, 240); g.rotateX(-Math.PI / 2)
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color('#4c8a2e'), b = new THREE.Color('#2f6320'), dirt = new THREE.Color('#8a7650'), sand = new THREE.Color('#9d8d68')
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) - 200, y = h(x, z); p.setXYZ(i, x, y, z)
      c.copy(a).lerp(b, Math.sin(x * 0.21) * Math.sin(z * 0.17) * 0.5 + 0.5)
      c.lerp(dirt, 1 - ss(5, 9, Math.abs(x - rx(z)))).lerp(sand, ss(-0.8, -2, y))
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g
  }, [])
  const roadGeo = useMemo(() => strip(4.5, 0.04), [])
  useFrame(() => { const w = useGame.getState().weather === 'rain' ? 1 : 0; road.current.roughness = THREE.MathUtils.lerp(road.current.roughness, 0.92 - 0.6 * w, 0.02) })
  return (
    <group>
      <mesh geometry={geo} receiveShadow><meshStandardMaterial map={grass} vertexColors roughness={1} /></mesh>
      <mesh geometry={roadGeo} receiveShadow><meshStandardMaterial ref={road} map={asphalt} roughness={0.9} envMapIntensity={1.2} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

export function River() {
  const m = useRef<THREE.MeshStandardMaterial>(null!)
  const nmap = useMemo(() => {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!, im = x.createImageData(N, N), k = (2 * Math.PI) / N
    const W = [[3, 1, 0.8], [2, 5, 0.6], [7, 3, 0.4], [1, 9, 0.3]]
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let fx = 0, fy = 0; for (const [a, b, amp] of W) { const d = amp * Math.cos(k * (a * i + b * j)); fx += d * a * k; fy += d * b * k }
      const l = Math.hypot(fx * 6, fy * 6, 1), o = (j * N + i) * 4
      im.data[o] = (-fx * 6 / l * 0.5 + 0.5) * 255; im.data[o + 1] = (-fy * 6 / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255
    }
    x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 5); return t
  }, [])
  useFrame(({ clock }) => { nmap.offset.set(clock.elapsedTime * 0.02, clock.elapsedTime * 0.05) })
  const concrete = <meshStandardMaterial color="#a8a69c" roughness={0.9} />
  return (
    <group>
      <mesh position={[0, -1.3, RIVER_Z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[260, 24]} />
        <meshStandardMaterial ref={m} color="#2e7d86" normalMap={nmap} normalScale={new THREE.Vector2(0.7, 0.7)} roughness={0.05} metalness={0.1} transparent opacity={0.88} envMapIntensity={1.5} /></mesh>
      <group position={[rx(RIVER_Z), 0, RIVER_Z]}>
        <mesh position={[0, -0.2, 0]} castShadow receiveShadow><boxGeometry args={[9.4, 0.4, 26]} />{concrete}</mesh>
        {[-4.6, 4.6].map((x) => <mesh key={x} position={[x, 0.45, 0]} castShadow><boxGeometry args={[0.3, 0.9, 26]} />{concrete}</mesh>)}
        {[-9, 0, 9].flatMap((z) => [-3.2, 3.2].map((x) => <mesh key={`${x}${z}`} position={[x, -2, z]} castShadow><cylinderGeometry args={[0.45, 0.55, 3.6, 10]} />{concrete}</mesh>))}
      </group>
    </group>
  )
}

export function Trees() {
  const trunk = useRef<THREE.InstancedMesh>(null!), crown = useRef<THREE.InstancedMesh>(null!)
  const bark = useMemo(() => canvasTex(64, 256, (c, r) => { c.fillStyle = '#8a7358'; c.fillRect(0, 0, 64, 256); for (let y = 0; y < 256; y += 10) { c.fillStyle = 'rgba(40,28,15,.5)'; c.fillRect(0, y, 64, 2 + r() * 2) } speckle(c, 64, 256, r, 800, '#cbb894', '#2b1d0e') }, [1, 4]), [])
  const leaf = useMemo(() => canvasTex(64, 128, (c) => {
    for (let k = 0; k < 14; k++) { const y = 120 - k * 8, len = 30 * (1 - k / 18); c.fillStyle = `hsl(${105 + k * 1.5},55%,${24 + k * 1.6}%)`
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(32, y); c.lineTo(32 + s * len, y - 11); c.lineTo(32 + s * len * 0.9, y - 7); c.lineTo(32, y - 3); c.fill() } }
    c.fillStyle = '#3f6b2a'; c.fillRect(31, 4, 2, 120)
  }), [])
  const tg = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.13, 0.27, 8, 8, 10, true); g.translate(0, 4, 0); const p = g.attributes.position
    for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 8; p.setX(i, p.getX(i) + 1.1 * t * t) }
    g.computeVertexNormals(); return g
  }, [])
  const fg = useMemo(() => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [], r = rnd(11); let n = 0
    for (let f = 0; f < 11; f++) {
      const a = (f / 11) * Math.PI * 2 + r() * 0.3, L = 3.4 * (0.85 + 0.3 * r()), dx = Math.cos(a), dz = Math.sin(a), up = 0.5 + r() * 0.7
      for (let j = 0; j <= 6; j++) {
        const t = j / 6, w = 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04)), y = 8 + up * Math.sin(t * 2) - 1.5 * t * t * (1 + up * 0.3), d = L * t
        for (const s of [-1, 1]) { pos.push(1.1 + dx * d - dz * w * s, y - w * 0.3, dz * d + dx * w * s); uv.push(s < 0 ? 0 : 1, t) }
        if (j > 0) { const q = n + (j - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2) }
      }
      n += 14
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [])
  useEffect(() => {
    const d = new THREE.Object3D()
    TREES.forEach((t, i) => { d.position.set(t.x, t.y, t.z); d.scale.setScalar(t.s); d.rotation.set(0, i * 2.4, 0); d.updateMatrix(); trunk.current.setMatrixAt(i, d.matrix); crown.current.setMatrixAt(i, d.matrix) })
    trunk.current.instanceMatrix.needsUpdate = crown.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      <instancedMesh ref={trunk} args={[tg, undefined, TREES.length]} castShadow><meshStandardMaterial map={bark} roughness={1} /></instancedMesh>
      <instancedMesh ref={crown} args={[fg, undefined, TREES.length]} frustumCulled={false}><meshStandardMaterial map={leaf} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.7} /></instancedMesh>
    </group>
  )
}

export function Grass() {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const geo = useMemo(() => {
    const pos: number[] = [], col: number[] = []
    for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3, c = Math.cos(a) * 0.07, s = Math.sin(a) * 0.07; pos.push(-c, 0, -s, c, 0, s, 0, 0.5, 0); col.push(0.16, 0.3, 0.1, 0.16, 0.3, 0.1, 0.5, 0.72, 0.3) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g
  }, [])
  const N = 3500
  useEffect(() => {
    const r = rnd(5), d = new THREE.Object3D()
    for (let i = 0; i < N; i++) {
      const z = 25 - r() * 450, side = r() < 0.5 ? -1 : 1, x = rx(z) + side * (5.6 + r() * r() * 24), y = h(x, z)
      d.position.set(x, y < -0.8 ? -50 : y, z); d.scale.set(1, 0.7 + r() * 1.2, 1); d.rotation.y = r() * 6; d.updateMatrix(); ref.current.setMatrixAt(i, d.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={ref} args={[geo, undefined, N]} frustumCulled={false}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={1} /></instancedMesh>
}

export function Poles() {
  const up = useRef<THREE.InstancedMesh>(null!), arm = useRef<THREE.InstancedMesh>(null!), lp = useRef<THREE.InstancedMesh>(null!), bulb = useRef<THREE.InstancedMesh>(null!)
  const bm = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffd08a', emissiveIntensity: 0 }), [])
  const zs = useMemo(() => Array.from({ length: 15 }, (_, i) => 20 - i * 30).filter((z) => Math.abs(z - RIVER_Z) > 16), [])
  const lz = useMemo(() => zs.filter((_, i) => i % 2 === 0), [zs])
  const wires = useMemo(() => {
    const p: number[] = []
    for (let i = 0; i < zs.length - 1; i++) { const a = zs[i], b = zs[i + 1]; if (Math.abs(a - b) > 40) continue
      for (const o of [-0.8, 0, 0.8]) for (let k = 0; k < 8; k++) for (const t of [k / 8, (k + 1) / 8]) { const z = a + (b - a) * t; p.push(rx(z) + 7 + o, 7.4 - 0.8 * 4 * t * (1 - t), z) } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g
  }, [zs])
  useEffect(() => {
    const d = new THREE.Object3D()
    zs.forEach((z, i) => { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(rx(z) + 7, 3.7, z); d.updateMatrix(); up.current.setMatrixAt(i, d.matrix); d.position.set(rx(z) + 7, 7.4, z); d.updateMatrix(); arm.current.setMatrixAt(i, d.matrix) })
    lz.forEach((z, i) => { d.position.set(rx(z) - 6.6, 3.5, z); d.updateMatrix(); lp.current.setMatrixAt(i, d.matrix); d.position.set(rx(z) - 5.4, 7.1, z); d.updateMatrix(); bulb.current.setMatrixAt(i, d.matrix) })
    for (const m of [up, arm, lp, bulb]) m.current.instanceMatrix.needsUpdate = true
  }, [zs, lz])
  useFrame(() => { bm.emissiveIntensity = env.night * 6 })
  const dark = <meshStandardMaterial color="#5b5648" roughness={0.9} />
  return (
    <group>
      <instancedMesh ref={up} args={[undefined, undefined, zs.length]} castShadow><cylinderGeometry args={[0.1, 0.14, 7.4, 8]} />{dark}</instancedMesh>
      <instancedMesh ref={arm} args={[undefined, undefined, zs.length]}><boxGeometry args={[2, 0.1, 0.1]} />{dark}</instancedMesh>
      <instancedMesh ref={lp} args={[undefined, undefined, lz.length]} castShadow><cylinderGeometry args={[0.07, 0.1, 7, 8]} /><meshStandardMaterial color="#6b6f73" metalness={0.6} roughness={0.5} /></instancedMesh>
      <instancedMesh ref={bulb} args={[undefined, undefined, lz.length]} material={bm}><sphereGeometry args={[0.25, 10, 8]} /></instancedMesh>
      <lineSegments geometry={wires}><lineBasicMaterial color="#111" /></lineSegments>
    </group>
  )
}

export function Houses() {
  const plaster = useMemo(() => canvasTex(128, 128, (c, r) => { c.fillStyle = '#e8e8e8'; c.fillRect(0, 0, 128, 128); speckle(c, 128, 128, r, 2500, '#fff', '#777') }), [])
  const tile = useMemo(() => canvasTex(128, 128, (c, r) => {
    c.fillStyle = '#b4573a'; c.fillRect(0, 0, 128, 128); speckle(c, 128, 128, r, 1500, '#e08a60', '#4a1f10')
    for (let y = 0; y < 128; y += 16) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y, 128, 2); for (let x = (y / 16 % 2) * 16; x < 128; x += 32) c.fillRect(x, y, 2, 16) }
  }, [0.5, 0.5]), [])
  const win = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c2b34', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: 0.2, metalness: 0.6 }), [])
  useFrame(() => { win.emissiveIntensity = env.night * 1.8 })
  const roofs = useMemo(() => [6, 9].map((W) => {
    const s = new THREE.Shape(); s.moveTo(-3.7, 0); s.lineTo(3.7, 0); s.lineTo(0, 2.1); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: W + 1.2, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-(W + 1.2) / 2, 0, 0); return g
  }), [])
  return (
    <group>
      {HOUSES.map((o, i) => { const W = o.big ? 9 : 6
        return (
          <group key={i} position={[o.x, h(o.x, o.z), o.z]} rotation={[0, o.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <mesh position={[0, 1.6, 0]} castShadow receiveShadow><boxGeometry args={[W, 3.2, 6]} /><meshStandardMaterial map={plaster} color={o.c} roughness={0.95} /></mesh>
            <mesh position={[0, 3.2, 0]} geometry={roofs[o.big ? 1 : 0]} castShadow><meshStandardMaterial map={tile} roughness={0.8} /></mesh>
            <mesh position={[-W / 4, 1.1, 3.02]} material={win}><boxGeometry args={[0.9, 1.2, 0.05]} /></mesh>
            <mesh position={[W / 4, 1.1, 3.02]} material={win}><boxGeometry args={[0.9, 1.2, 0.05]} /></mesh>
            <mesh position={[0, 1.0, 3.02]}><boxGeometry args={[1, 2, 0.06]} /><meshStandardMaterial color="#5a3a22" roughness={0.7} /></mesh>
            <mesh position={[0, 3.0, 3.8]} castShadow><boxGeometry args={[W, 0.12, 1.6]} /><meshStandardMaterial color="#d8d3c6" /></mesh>
            {[-W / 2 + 0.2, W / 2 - 0.2].map((x) => <mesh key={x} position={[x, 1.5, 4.5]} castShadow><cylinderGeometry args={[0.12, 0.12, 3, 8]} /><meshStandardMaterial color="#e9e4d6" /></mesh>)}
            <mesh position={[0, 0.45, 7]} castShadow><boxGeometry args={[W + 3, 0.9, 0.25]} /><meshStandardMaterial map={plaster} color="#d9d2c0" /></mesh>
          </group>)
      })}
    </group>
  )
}

function Wheel({ z, spin, r = 0.33 }: { z: number; spin: React.RefObject<THREE.Group | null>; r?: number }) {
  return (
    <group position={[0, r, z]} ref={spin}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[r - 0.04, 0.085, 10, 24]} /><meshStandardMaterial color="#111" roughness={0.9} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[r * 0.68, 0.02, 6, 20]} /><meshStandardMaterial color="#cfd3d6" metalness={1} roughness={0.2} /></mesh>
      {[0, 1.05, 2.1].map((a) => <mesh key={a} rotation={[a, 0, 0]}><boxGeometry args={[0.03, r * 1.4, 0.03]} /><meshStandardMaterial color="#cfd3d6" metalness={1} roughness={0.25} /></mesh>)}
    </group>
  )
}

export function BikeModel({ color = '#b3202a', rider = true, scale = 1 }: { color?: string; rider?: boolean; scale?: number }) {
  const fw = useRef<THREE.Group>(null), rw = useRef<THREE.Group>(null)
  useFrame((_, d) => { const a = (env.v * Math.min(d, 0.05)) / 0.33; if (fw.current) fw.current.rotation.x += a; if (rw.current) rw.current.rotation.x += a })
  const metal = <meshStandardMaterial color="#d0d4d8" metalness={1} roughness={0.15} />
  const paint = <meshPhysicalMaterial color={color} metalness={0.4} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
  const dk = <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
  const jacket = <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
  return (
    <group scale={scale}>
      <Wheel z={0.7} spin={fw} /><Wheel z={-0.7} spin={rw} />
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.28, 0.35, 0.5]} /><meshStandardMaterial color="#3a3d40" metalness={0.8} roughness={0.4} /></mesh>
      <mesh position={[0, 0.93, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow><capsuleGeometry args={[0.16, 0.42, 6, 14]} />{paint}</mesh>
      <mesh position={[0, 0.88, -0.35]} castShadow><boxGeometry args={[0.3, 0.1, 0.7]} />{dk}</mesh>
      <mesh position={[0, 0.9, -0.78]} rotation={[0.2, 0, 0]} castShadow><boxGeometry args={[0.22, 0.14, 0.5]} />{paint}</mesh>
      <mesh position={[0, 0.7, -0.88]}><boxGeometry args={[0.16, 0.04, 0.5]} />{dk}</mesh>
      {[-0.12, 0.12].map((x) => <mesh key={x} position={[x, 0.4, -0.4]}><boxGeometry args={[0.05, 0.06, 0.7]} />{dk}</mesh>)}
      {[-0.1, 0.1].map((x) => <mesh key={x} position={[x, 0.7, 0.62]} rotation={[-0.35, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />{metal}</mesh>)}
      <mesh position={[0, 1.1, 0.5]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />{metal}</mesh>
      <mesh position={[0, 1.0, 0.72]} scale={[1, 1, 0.8]}><sphereGeometry args={[0.11, 14, 12]} /><meshStandardMaterial color="#fff2c0" emissive="#fff2c0" emissiveIntensity={2.5} /></mesh>
      <mesh position={[0, 0.82, -1.04]}><boxGeometry args={[0.12, 0.05, 0.04]} /><meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={2} /></mesh>
      <mesh position={[0.17, 0.38, -0.4]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.06, 0.8, 10]} />{metal}</mesh>
      {rider && <group>
        <mesh position={[0, 1.38, -0.25]} rotation={[0.5, 0, 0]} castShadow><capsuleGeometry args={[0.17, 0.4, 6, 12]} />{jacket}</mesh>
        <mesh position={[0, 1.85, -0.05]} castShadow><sphereGeometry args={[0.17, 16, 14]} /><meshPhysicalMaterial color="#f4f4f4" clearcoat={1} roughness={0.2} /></mesh>
        <mesh position={[0, 1.84, 0.1]}><boxGeometry args={[0.22, 0.07, 0.1]} /><meshStandardMaterial color="#111" metalness={1} roughness={0.1} /></mesh>
        {[-1, 1].map((s) => <group key={s}>
          <mesh position={[s * 0.25, 1.33, 0.2]} rotation={[-0.93, 0, 0]}><capsuleGeometry args={[0.055, 0.45, 4, 8]} />{jacket}</mesh>
          <mesh position={[s * 0.18, 0.88, -0.1]} rotation={[-1.27, 0, 0]}><capsuleGeometry args={[0.075, 0.4, 4, 8]} /><meshStandardMaterial color="#2b3a55" roughness={0.9} /></mesh>
          <mesh position={[s * 0.21, 0.62, 0.05]} rotation={[0.52, 0, 0]}><capsuleGeometry args={[0.06, 0.38, 4, 8]} /><meshStandardMaterial color="#2b3a55" roughness={0.9} /></mesh>
        </group>)}
      </group>}
    </group>
  )
}

export function VehicleModel({ kind, color }: { kind: 'car' | 'bus' | 'bike'; color: string }) {
  if (kind === 'bike') return <BikeModel color={color} scale={0.95} />
  const bus = kind === 'bus', L = bus ? 9.2 : 4, Wd = bus ? 2.5 : 1.8, wr = bus ? 0.5 : 0.33
  const paint = <meshPhysicalMaterial color={bus ? '#d8571b' : color} metalness={0.5} roughness={0.25} clearcoat={1} />
  const glass = <meshStandardMaterial color="#0f1d2b" metalness={0.9} roughness={0.05} />
  return (
    <group>
      <mesh position={[0, bus ? 1.7 : 0.6, 0]} castShadow><boxGeometry args={[Wd, bus ? 2.6 : 0.6, L]} />{paint}</mesh>
      {bus ? <mesh position={[0, 2.2, 0]}><boxGeometry args={[Wd + 0.03, 0.9, L - 0.8]} />{glass}</mesh>
        : <mesh position={[0, 1.1, -0.2]} castShadow><boxGeometry args={[Wd - 0.1, 0.55, 2]} />{glass}</mesh>}
      {[-1, 1].flatMap((sx) => (bus ? [-3, 3] : [-1.25, 1.25]).map((z) => (
        <mesh key={`${sx}${z}`} position={[sx * (Wd / 2), wr, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[wr, wr, 0.25, 16]} /><meshStandardMaterial color="#141414" roughness={0.9} /></mesh>)))}
      {[-1, 1].map((s) => <mesh key={s} position={[s * (Wd / 2 - 0.3), bus ? 0.9 : 0.65, L / 2]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#fff" emissive="#fff3c8" emissiveIntensity={2} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={s} position={[s * (Wd / 2 - 0.3), bus ? 0.9 : 0.65, -L / 2]}><boxGeometry args={[0.3, 0.12, 0.05]} /><meshStandardMaterial color="#e00" emissive="#e00" emissiveIntensity={1.5} /></mesh>)}
    </group>
  )
}
