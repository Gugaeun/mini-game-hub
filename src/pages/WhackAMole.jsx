import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Mascot from '../components/Mascot'
import { DURATION, HOLES, createGame, step, whack } from '../lib/moleEngine'
import { useGameBasics } from '../lib/useGameBasics'

const TICK_MS = 40
// 구멍 번호 → 키 (QWE / ASD / ZXC)
const HOLE_KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC']
const KEY_LABELS = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C']

export default function WhackAMole() {
  const gameRef = useRef(null)
  const base = useGameBasics('arcadia_mole_best')
  const { phase, phaseRef, setPhase, play, saveBest, ensureAudio, setNewRecord } = base
  const [, setTick] = useState(0) // 엔진이 그때그때 바뀌므로 주기적으로 다시 그린다
  const [flash, setFlash] = useState(null) // 마지막 타격 결과(애니메이션용)

  const start = useCallback(() => {
    ensureAudio()
    gameRef.current = createGame()
    setNewRecord(false)
    setFlash(null)
    setPhase('playing')
  }, [ensureAudio, setNewRecord, setPhase])

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused')
    else if (phaseRef.current === 'paused') setPhase('playing')
  }, [phaseRef, setPhase])

  // 게임 진행: setInterval 로 일정 간격마다 엔진을 진행한다
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const dt = now - last
      last = now
      const g = gameRef.current
      if (g && phaseRef.current === 'playing') {
        step(g, dt)
        g.events.forEach((ev) => {
          if (ev === 'escape') play('miss')
          if (ev === 'gameover') {
            play('win')
            saveBest(g.score)
            setPhase('over')
          }
        })
      }
      setTick((t) => (t + 1) % 1000000)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [play, saveBest, setPhase, phaseRef])

  const hit = useCallback(
    (i) => {
      const g = gameRef.current
      if (!g || phaseRef.current !== 'playing') return
      const result = whack(g, i)
      if (!result) return
      setFlash({ i, result, at: performance.now() })
      play({ mole: 'brick', gold: 'item', panda: 'lose', whiff: 'wrong' }[result])
    },
    [play, phaseRef],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      const i = HOLE_KEYS.indexOf(e.code)
      if (i !== -1) hit(i)
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
      if (e.code === 'Enter' && (phaseRef.current === 'menu' || phaseRef.current === 'over')) start()
      if (e.code === 'KeyM') base.toggleMute()
    }
    const pauseIfPlaying = () => phaseRef.current === 'playing' && setPhase('paused')
    const onVisibility = () => document.hidden && pauseIfPlaying()
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', pauseIfPlaying)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', pauseIfPlaying)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [hit, start, togglePause, phaseRef, setPhase, base.toggleMute]) // eslint-disable-line react-hooks/exhaustive-deps

  const g = gameRef.current
  const timeLeft = g ? g.timeLeft : DURATION
  const seconds = Math.ceil(timeLeft / 1000)

  return (
    <div className="game-page">
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">
        <Mascot pose="idle" size={70} />
        <div className="game-hud">
          <span>
            SCORE <strong>{g ? g.score : 0}</strong>
          </span>
          <span>
            BEST <strong>{base.best}</strong>
          </span>
          <span>
            COMBO <strong>{g ? g.combo : 0}</strong>
          </span>
          <span>
            TIME <strong>{seconds}s</strong>
          </span>
          <button className="game-icon-btn" onClick={base.toggleMute} aria-label="음소거 전환">
            {base.muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="mole-timebar" aria-hidden="true">
          <div className="mole-timebar-fill" style={{ width: `${(timeLeft / DURATION) * 100}%` }} />
        </div>

        <div className="mole-board-wrap">
          <div className="mole-board">
            {Array.from({ length: HOLES }, (_, i) => {
              const h = g?.holes[i]
              const state = !h ? 'empty' : h.hit ? 'hit' : 'up'
              const kind = h?.kind ?? ''
              const justFlashed = flash && flash.i === i && flash.result === 'whiff'
              return (
                <button
                  key={i}
                  className={`mole-hole ${state} ${kind}${justFlashed ? ' whiff' : ''}`}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    hit(i)
                  }}
                  aria-label={`${i + 1}번 구멍`}
                >
                  <span className="mole-dirt" />
                  <span className="mole-actor">
                    {kind === 'panda' ? <Mascot pose="idle" size={64} /> : kind ? '🐹' : ''}
                    {kind === 'gold' && <span className="mole-sparkle">✨</span>}
                    {state === 'hit' && <span className="mole-hit">{kind === 'panda' ? '💦' : '💥'}</span>}
                  </span>
                  <span className="mole-key">{KEY_LABELS[i]}</span>
                </button>
              )
            })}
          </div>

          {phase === 'menu' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">두더지잡기</h2>
              <p>30초 동안 튀어나오는 두더지를 잡으세요.</p>
              <p className="game-overlay-sub">✨금빛 두더지는 보너스! 레서판다는 친구예요 — 잡으면 감점이에요.</p>
              <button className="game-btn" onClick={start}>
                시작하기
              </button>
              <p className="game-overlay-sub">클릭/터치 또는 Q W E · A S D · Z X C 키</p>
            </div>
          )}
          {phase === 'paused' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">일시정지</h2>
              <button className="game-btn" onClick={togglePause}>
                계속하기
              </button>
              <p className="game-overlay-sub">P 또는 Esc</p>
            </div>
          )}
          {phase === 'over' && g && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">TIME UP!</h2>
              <p>
                점수 <strong>{g.score}</strong>
              </p>
              {base.newRecord && <p className="game-record">★ 최고 기록 갱신!</p>}
              <p className="game-overlay-sub">
                잡은 수 {g.hits} · 놓친 수 {g.escapes} · 헛손질 {g.whiffs} · 판다 {g.oops} · 최대 콤보 {g.maxCombo}
              </p>
              <button className="game-btn" onClick={start}>
                다시 하기
              </button>
            </div>
          )}
        </div>
        <p className="game-hint">두더지 +10 · 금빛 +30 · 판다 −20 · 콤보가 쌓이면 점수 배율이 올라가요 · P 일시정지 · M 음소거</p>
      </div>
    </div>
  )
}
