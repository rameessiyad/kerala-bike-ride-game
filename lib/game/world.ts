export const rx = (z: number) => 18 * Math.sin(z / 70)
export const rdx = (z: number) => (18 / 70) * Math.cos(z / 70)
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
export const RIVER_Z = -100
export const CPS = [-60, -140, -220, -300, -380]
export function h(x: number, z: number) {
  const d = Math.abs(x - rx(z))
  const w = ss(5, 12, d)
  const amp = 1.5 + 9 * ss(-220, -320, z)
  const hills = (Math.sin(x * 0.05 + 1) + Math.cos(z * 0.04) + 1.2) * amp * 0.5 + d * 0.12 * ss(-220, -320, z)
  const river = -3 * Math.exp(-(((z - RIVER_Z) / 9) ** 2))
  return w * (hills * 0.6 + river)
}
let s = 7
const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
export const TREES = Array.from({ length: 280 }, () => {
  const z = -r() * 430 + 25, side = r() < 0.5 ? -1 : 1, x = rx(z) + side * (9 + r() * 45)
  return { x, z, y: h(x, z), s: 0.8 + r() * 0.6 }
}).filter((t) => Math.abs(t.z - RIVER_Z) > 10)
export const HOUSES = Array.from({ length: 16 }, (_, i) => {
  const z = i < 9 ? 10 - i * 11 : -150 - (i - 9) * 14, side = i % 2 ? 1 : -1, x = rx(z) + side * (11 + r() * 3)
  return { x, z, side, c: ['#e8d8b0', '#d98c6a', '#9ec1a3', '#e6c35c', '#c9d6df'][i % 5], big: i % 5 === 0 }
})
export const env = { night: 0, v: 0 }
