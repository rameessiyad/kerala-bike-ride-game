let ctx: AudioContext | null = null
let osc!: OscillatorNode, gain!: GainNode
let on = true
export function startAudio() {
  if (ctx) return
  ctx = new AudioContext()
  osc = ctx.createOscillator(); osc.type = 'sawtooth'
  gain = ctx.createGain(); gain.gain.value = 0.02
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500
  osc.connect(f); f.connect(gain); gain.connect(ctx.destination); osc.start()
}
export function setEngine(speed: number, thr: boolean) {
  if (!ctx) return
  osc.frequency.setTargetAtTime(45 + speed * 3 + (thr ? 15 : 0), ctx.currentTime, 0.05)
  gain.gain.setTargetAtTime(on ? 0.02 + Math.min(speed, 40) / 1500 : 0, ctx.currentTime, 0.1)
}
export function setMuted(m: boolean) { on = !m }
export function beep() {
  if (!ctx || !on) return
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.frequency.value = 880; g.gain.setValueAtTime(0.08, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
  o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4)
}
