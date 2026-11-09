import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { games } from '../data/games'
import { beginPlay } from '../lib/telemetry'

// 게임 화면에 들어오면 플레이 시작, 나가거나 탭을 닫으면 플레이 종료(걸린 시간)를 기록한다.
// 화면에는 아무것도 그리지 않는다. 로그 API가 설정되지 않으면 아무 일도 하지 않는다.
export default function PlayTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    const game = games.find((g) => g.route === pathname)
    if (!game) return undefined

    const startedAt = Date.now()
    let play = null
    // StrictMode(개발)의 mount→unmount→mount 에서 시작이 두 번 기록되지 않도록 잠시 뒤에 시작한다.
    const timer = setTimeout(() => {
      play = beginPlay(game.id)
    }, 300)

    const finish = () => {
      clearTimeout(timer)
      if (play) {
        play.end(Math.round((Date.now() - startedAt) / 1000))
        play = null
      }
    }
    window.addEventListener('pagehide', finish)
    return () => {
      window.removeEventListener('pagehide', finish)
      finish()
    }
  }, [pathname])

  return null
}
