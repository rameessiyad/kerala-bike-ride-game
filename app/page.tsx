'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useGame } from '@/store/gameStore'
import { HUD, MainMenu, Loading } from '@/components/ui/HUD'

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false })

export default function Page() {
  const { phase, run } = useGame()
  const [gl, setGl] = useState(true)
  useEffect(() => { try { const c = document.createElement('canvas'); setGl(!!(c.getContext('webgl2') || c.getContext('webgl'))) } catch { setGl(false) } }, [])
  if (!gl) return <div className="flex h-full items-center justify-center p-8 text-center text-white">Your browser does not support the graphics required for this game. Please try a modern Chrome, Edge, Firefox, or Safari browser.</div>
  const inGame = phase !== 'menu'
  return (
    <main className="relative h-screen w-screen" onClick={() => undefined}>
      {inGame && <GameCanvas key={run} />}
      {phase === 'menu' && <MainMenu />}
      {phase === 'loading' && <Loading />}
      <HUD />
    </main>
  )
}
