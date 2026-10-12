import { useCallback, useEffect, useRef, useState } from 'react'
import { createAudio, playSfx, setMuted } from './sfx'

// 게임 화면들이 공통으로 쓰는 것: 화면 단계(phase), 효과음/음소거, 최고 기록(높을수록 좋은 점수).
const readBest = (key) => {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

export function useGameBasics(bestKey) {
  const phaseRef = useRef('menu')
  const audioRef = useRef(null)
  const mutedRef = useRef(false)
  const bestRef = useRef(readBest(bestKey))

  const [phase, setPhaseState] = useState('menu')
  const [muted, setMutedState] = useState(false)
  const [best, setBest] = useState(bestRef.current)
  const [newRecord, setNewRecord] = useState(false)

  const setPhase = useCallback((p) => {
    phaseRef.current = p
    setPhaseState(p)
  }, [])

  // 오디오는 사용자 입력(시작 버튼/키) 뒤에 만들어야 한다.
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudio()
      setMuted(audioRef.current, mutedRef.current)
    }
    audioRef.current?.ctx.resume()
  }, [])

  const play = useCallback((name) => playSfx(audioRef.current, name), [])

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current
    setMuted(audioRef.current, mutedRef.current)
    setMutedState(mutedRef.current)
  }, [])

  const saveBest = useCallback(
    (score) => {
      if (score <= bestRef.current) return
      bestRef.current = score
      setBest(score)
      setNewRecord(true)
      try {
        localStorage.setItem(bestKey, String(score))
      } catch {
        // 저장 불가 환경(시크릿 모드 등)에서는 이번 접속 동안만 유지
      }
    },
    [bestKey],
  )

  useEffect(
    () => () => {
      audioRef.current?.ctx.close()
      audioRef.current = null
    },
    [],
  )

  return { phase, phaseRef, setPhase, muted, toggleMute, ensureAudio, play, best, newRecord, setNewRecord, saveBest }
}
