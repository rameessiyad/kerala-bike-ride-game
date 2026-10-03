import { create } from 'zustand'
export type Phase = 'menu' | 'loading' | 'playing' | 'paused' | 'completed'
export type Weather = 'clear' | 'cloudy' | 'rain'
interface GameState {
  phase: Phase; run: number; speed: number; fuel: number; checkpoint: number
  weather: Weather; clock: string; px: number; pz: number
  toast: string; muted: boolean; camDist: number
  result: { dist: number; time: number; top: number; best: number } | null
  set: (p: Partial<GameState>) => void
  start: () => void
}
export const useGame = create<GameState>((set, get) => ({
  phase: 'menu', run: 0, speed: 0, fuel: 100, checkpoint: 0, weather: 'clear', clock: 'Morning',
  px: 0, pz: 20, toast: '', muted: false, camDist: 7, result: null,
  set: (p) => set(p),
  start: () => {
    set({ phase: 'loading', run: get().run + 1, speed: 0, fuel: 100, checkpoint: 0, result: null })
    setTimeout(() => set({ phase: 'playing' }), 1400)
  },
}))
