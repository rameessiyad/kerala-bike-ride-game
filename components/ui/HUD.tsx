"use client";
import { useGame } from "@/store/gameStore";
import { CPS, rx } from "@/lib/game/world";

const Btn = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className="rounded bg-amber-400 px-6 py-3 font-bold tracking-widest text-black hover:bg-amber-300"
  >
    {children}
  </button>
);

export function MiniMap() {
  const { px, pz } = useGame();
  const pts = Array.from({ length: 47 }, (_, i) => {
    const z = 30 - i * 10;
    return `${60 + rx(z) * 1.6},${(30 - z) * 0.28 + 5}`;
  }).join(" ");
  return (
    <svg
      width="120"
      height="140"
      viewBox="0 0 120 140"
      className="rounded bg-black/50"
    >
      <polyline points={pts} fill="none" stroke="#999" strokeWidth="3" />
      {CPS.map((z, i) => (
        <circle
          key={i}
          cx={60 + rx(z) * 1.6}
          cy={(30 - z) * 0.28 + 5}
          r="3"
          fill={i === CPS.length - 1 ? "#f33" : "#fd0"}
        />
      ))}
      <circle cx={60 + px * 1.6} cy={(30 - pz) * 0.28 + 5} r="4" fill="#4af" />
    </svg>
  );
}

export function HUD() {
  const { phase, speed, fuel, checkpoint, toast, clock, weather, muted, set } =
    useGame();
  if (phase === "menu" || phase === "loading") return null;
  return (
    <div className="pointer-events-none absolute inset-0 text-white">
      <div className="absolute left-4 top-4 font-bold tracking-widest">
        CHECKPOINT {checkpoint}/{CPS.length}
        <div className="text-xs font-normal opacity-70">
          {clock} · {weather} · T weather · M sound {muted ? "OFF" : "ON"}
        </div>
      </div>
      {toast && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded bg-black/60 px-4 py-2">
          {toast}
        </div>
      )}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <MiniMap />
        <div className="text-right">
          <div className="text-xs opacity-70">SPEED</div>
          <div className="text-5xl font-black">{speed}</div>
          <div className="text-xs">KM/H</div>
        </div>
        <div className="w-40">
          <div className="text-xs opacity-70">FUEL</div>
          <div className="h-3 rounded bg-white/20">
            <div
              className="h-3 rounded bg-emerald-400"
              style={{
                width: `${fuel}%`,
                background: fuel < 20 ? "#f55" : undefined,
              }}
            />
          </div>
        </div>
      </div>
      {phase === "paused" && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <h2 className="mb-4 text-3xl font-black tracking-widest">
            KERALA BIKE RIDE
          </h2>
          <Btn onClick={() => set({ phase: "playing" })}>RESUME</Btn>
          <Btn onClick={() => useGame.getState().start()}>RESTART RIDE</Btn>
          <label className="mt-2 text-sm">
            Camera distance{" "}
            <input
              type="range"
              min={4}
              max={12}
              value={useGame.getState().camDist}
              onChange={(e) => set({ camDist: Number(e.target.value) })}
            />
          </label>
          <Btn onClick={() => set({ phase: "menu" })}>EXIT TO MENU</Btn>
        </div>
      )}
      {phase === "completed" && <Done />}
    </div>
  );
}

function Done() {
  const { result: r, start, set } = useGame();
  if (!r) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80">
      <h2 className="mb-3 text-4xl font-black tracking-widest">
        RIDE COMPLETE
      </h2>
      <div>Distance: {r.dist.toFixed(0)} m</div>
      <div>
        Time: {r.time.toFixed(1)} s (best {r.best.toFixed(1)} s)
      </div>
      <div>Average speed: {((r.dist / r.time) * 3.6).toFixed(0)} km/h</div>
      <div>Top speed: {r.top.toFixed(0)} km/h</div>
      <div>
        Checkpoints: {CPS.length}/{CPS.length}
      </div>
      <div className="mt-4 flex gap-3">
        <Btn onClick={start}>RIDE AGAIN</Btn>
        <Btn onClick={() => set({ phase: "menu" })}>MAIN MENU</Btn>
      </div>
    </div>
  );
}

export function MainMenu() {
  const { start } = useGame();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-emerald-900 via-teal-800 to-amber-700 text-white">
      <h1 className="text-6xl font-black tracking-[0.2em]">KERALA BIKE RIDE</h1>
      <p className="mb-6 text-xl italic opacity-90">
        Ride. Explore. Discover Kerala.
      </p>
      <Btn onClick={start}>START RIDE</Btn>
      <details className="max-w-sm text-center text-sm opacity-90">
        <summary className="cursor-pointer font-bold">How to Play</summary>
        W/↑ accelerate · S/↓ brake/reverse · A/D or ←/→ steer · Space handbrake
        · R reset to checkpoint · T weather · M sound · Esc pause. Cross the
        bridge, climb the hills, reach all 5 checkpoints.
      </details>
    </div>
  );
}

export function Loading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
      <h2 className="text-3xl font-black tracking-widest">KERALA BIKE RIDE</h2>
      <p>Loading world...</p>
      <div className="h-2 w-64 overflow-hidden rounded bg-white/20">
        <div
          className="h-2 animate-pulse bg-amber-400"
          style={{ width: "80%" }}
        />
      </div>
      <p className="text-sm opacity-70">Preparing your ride...</p>
    </div>
  );
}
