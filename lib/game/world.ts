export const rx = (z: number) => 18 * Math.sin(z / 70);
export const rdx = (z: number) => (18 / 70) * Math.cos(z / 70);
export const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const LANE = 2.3; // traffic keeps LEFT, as in Kerala/India
export const forest = (z: number) => ss(235, 260, -z);
export const RIVER_Z = -100;
export const CPS = [-60, -140, -220, -300, -380];
export function h(x: number, z: number) {
  const d = Math.abs(x - rx(z));
  const w = ss(5, 12, d);
  const amp = 1.5 + 9 * ss(-220, -320, z);
  const hills =
    (Math.sin(x * 0.05 + 1) + Math.cos(z * 0.04) + 1.2) * amp * 0.5 +
    d * 0.12 * ss(-220, -320, z);
  const river = -3 * Math.exp(-(((z - RIVER_Z) / 9) ** 2));
  return w * (hills * 0.6 + river);
}
let s = 7;
const r = () => {
  s = (s * 16807) % 2147483647;
  return s / 2147483647;
};
// Village: z 25..-95 | Town: -130..-240 | Forest: below -235
export const HOUSES = Array.from({ length: 10 }, (_, i) => {
  const z = 10 - i * 9,
    side = i % 2 ? 1 : -1,
    x = rx(z) + side * (11 + r() * 3);
  return {
    x,
    z,
    side,
    c: ["#e8d8b0", "#d98c6a", "#9ec1a3", "#e6c35c", "#c9d6df"][i % 5],
    big: i % 5 === 0,
  };
});
export const BUILDINGS = Array.from({ length: 14 }, (_, i) => {
  const z = -132 - Math.floor(i / 2) * 15,
    side = i % 2 ? 1 : -1,
    floors = 2 + Math.floor(r() * 2),
    w = 10 + Math.floor(r() * 3),
    x = rx(z) + side * 15.5;
  return {
    x,
    z,
    side,
    floors,
    w,
    c: ["#e9e1cf", "#d8c9a8", "#cfd9d6", "#e7c9b5"][i % 4],
    sign: ["#d62828", "#1d7a46", "#1565c0", "#f77f00", "#7b2cbf"][i % 5],
  };
});
export const OBST = [
  ...HOUSES.map((o) => ({ x: o.x, z: o.z, r: o.big ? 5.5 : 4.5 })),
  ...BUILDINGS.map((o) => ({ x: o.x, z: o.z, r: 7 })),
];
const free = (x: number, z: number, m: number) =>
  Math.abs(z - RIVER_Z) > 10 &&
  !OBST.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + m);
export const TREES: { x: number; z: number; y: number; s: number }[] = [];
for (let n = 0; TREES.length < 420 && n < 5000; n++) {
  const z = 25 - r() * 455,
    f = forest(z),
    town = z < -125 && z > -235;
  if (r() > (f > 0.5 ? 0.95 : town ? 0.12 : 0.4)) continue;
  const x = rx(z) + (r() < 0.5 ? -1 : 1) * (8.5 + r() * (f > 0.5 ? 50 : 40));
  if (free(x, z, 2)) TREES.push({ x, z, y: h(x, z), s: 0.8 + r() * 0.7 });
}
export const BUSHES: { x: number; z: number; y: number; s: number }[] = [];
for (let n = 0; BUSHES.length < 450 && n < 5000; n++) {
  const z = 25 - r() * 455;
  if (r() > (forest(z) > 0.5 ? 1 : 0.2)) continue;
  const x = rx(z) + (r() < 0.5 ? -1 : 1) * (6.5 + r() * 40);
  if (free(x, z, 1)) BUSHES.push({ x, z, y: h(x, z), s: 0.6 + r() * 1.1 });
}
export const PEOPLE = Array.from({ length: 18 }, (_, i) => {
  const vil = i < 9,
    zmax = vil ? 20 : -128,
    zmin = vil ? -95 : -240;
  return {
    zmin,
    zmax,
    z: zmin + r() * (zmax - zmin),
    dir: r() < 0.5 ? -1 : 1,
    sp: 1 + r() * 0.6,
    side: i % 2 ? 1 : -1,
    c: ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#ecf0f1"][
      i % 6
    ],
    skirt: i % 3 === 0,
    skin: ["#8d5a3b", "#a56b46", "#6f4429"][i % 3],
  };
});
export const env = { night: 0, v: 0 };
