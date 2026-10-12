import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GROUND, H, W, WORD_H, createGame, step, submit, wordWidth } from '../lib/acidRainEngine'
import { useGameBasics } from '../lib/useGameBasics'

const drops = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 1.5 + Math.random() * 2.5 }))

function draw(ctx, g, typed) {
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#0c0818')
  sky.addColorStop(1, '#1a1440')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // 배경 빗줄기
  ctx.strokeStyle = 'rgba(140,160,255,0.22)'
  ctx.lineWidth = 1
  drops.forEach((d) => {
    d.y += d.v
    if (d.y > GROUND) {
      d.y = -10
      d.x = Math.random() * W
    }
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x - 1, d.y + 8)
    ctx.stroke()
  })

  // 바닥(물)
  ctx.fillStyle = '#233a8c'
  ctx.fillRect(0, GROUND, W, H - GROUND)
  ctx.fillStyle = '#4cd7e0'
  ctx.fillRect(0, GROUND, W, 2)

  if (!g) return

  ctx.font = '20px Jua, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const text = typed.trim()
  g.words.forEach((w) => {
    const width = wordWidth(w.text)
    const progress = text && w.text.startsWith(text)
    ctx.fillStyle = w.gold ? 'rgba(255,183,3,0.95)' : progress ? 'rgba(124,245,160,0.95)' : 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(w.x, w.y, width, WORD_H, 8)
    else ctx.rect(w.x, w.y, width, WORD_H)
    ctx.fill()
    ctx.fillStyle = w.gold || progress ? '#0c0818' : '#ffffff'
    ctx.fillText(w.text, w.x + width / 2, w.y + WORD_H / 2 + 1)
  })

  g.particles.forEach((q) => {
    ctx.globalAlpha = Math.max(0, q.life / q.max)
    ctx.fillStyle = q.color
    ctx.fillRect(q.x, q.y, 3, 3)
  })
  ctx.globalAlpha = 1
}

export default function AcidRain() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const inputRef = useRef(null)
  const typedRef = useRef('')
  const hudRef = useRef({ score: 0, lives: 5, level: 1, combo: 0 })
  const base = useGameBasics('arcadia_acidrain_best')
  const { phase, phaseRef, setPhase, play, saveBest, ensureAudio, setNewRecord } = base

  const [value, setValue] = useState('')
  const [inputKey, setInputKey] = useState(0) // 바꾸면 입력창이 새로 만들어져 한글 조합 상태가 초기화된다
  const [hud, setHud] = useState(hudRef.current)

  const clearInput = useCallback(() => {
    typedRef.current = ''
    setValue('')
    setInputKey((k) => k + 1)
  }, [])

  const start = useCallback(() => {
    ensureAudio()
    gameRef.current = createGame()
    hudRef.current = { score: 0, lives: 5, level: 1, combo: 0 }
    setHud(hudRef.current)
    setNewRecord(false)
    clearInput()
    setPhase('playing')
  }, [ensureAudio, clearInput, setPhase, setNewRecord])

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused')
    else if (phaseRef.current === 'paused') setPhase('playing')
  }, [phaseRef, setPhase])

  const flush = useCallback(
    (g) => {
      g.events.forEach((ev) => {
        play(ev)
        if (ev === 'gameover') {
          saveBest(g.score)
          setPhase('over')
        }
      })
    },
    [play, saveBest, setPhase],
  )

  const sync = useCallback((g) => {
    const h = hudRef.current
    if (h.score !== g.score || h.lives !== g.lives || h.level !== g.level || h.combo !== g.combo) {
      hudRef.current = { score: g.score, lives: g.lives, level: g.level, combo: g.combo }
      setHud(hudRef.current)
    }
  }, [])

  // 게임 루프
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = now - last
      last = now
      const g = gameRef.current
      if (g && phaseRef.current === 'playing') {
        step(g, dt)
        flush(g)
        sync(g)
      }
      draw(ctx, g, typedRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [flush, sync, phaseRef])

  // 입력창에 포커스 유지 / 시작·재시작 키 / 탭 이탈 시 일시정지
  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase, inputKey])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape' && !e.repeat) togglePause()
      if (e.code === 'Enter' && !e.repeat && phaseRef.current === 'menu') start()
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
  }, [togglePause, start, phaseRef, setPhase])

  // 화면에 있는 단어와 정확히 같아지면 Enter 없이 바로 제출 (한글 조합 중에도 동작)
  const onChange = (e) => {
    const v = e.target.value
    const g = gameRef.current
    if (g && phaseRef.current === 'playing' && g.words.some((w) => w.text === v.trim())) {
      submit(g, v)
      flush(g)
      sync(g)
      clearInput()
      return
    }
    typedRef.current = v
    setValue(v)
  }

  // Enter: 일치하는 단어가 없으면 오답 처리(콤보 끊김)
  const onSubmit = (e) => {
    e.preventDefault()
    const g = gameRef.current
    if (!g || phaseRef.current !== 'playing' || !value.trim()) return
    submit(g, value)
    flush(g)
    sync(g)
    clearInput()
  }

  return (
    <div className="game-page">
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">
        <div className="game-hud">
          <span>
            SCORE <strong>{hud.score}</strong>
          </span>
          <span>
            BEST <strong>{base.best}</strong>
          </span>
          <span>
            LEVEL <strong>{hud.level}</strong>
          </span>
          <span>
            COMBO <strong>{hud.combo}</strong>
          </span>
          <span className="game-lives" aria-label={`목숨 ${hud.lives}개`}>
            {'♥'.repeat(hud.lives) || '–'}
          </span>
          <button className="game-icon-btn" onClick={base.toggleMute} aria-label="음소거 전환">
            {base.muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="game-canvas-wrap" style={{ maxWidth: W }} onClick={() => inputRef.current?.focus()}>
          <canvas ref={canvasRef} width={W} height={H} />

          {phase === 'menu' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">산성비</h2>
              <p>떨어지는 단어를 똑같이 입력해서 지우세요.</p>
              <p className="game-overlay-sub">바닥에 닿으면 목숨이 줄어요. 노란 단어를 지우면 화면 전체가 사라져요!</p>
              <button className="game-btn" onClick={start}>
                시작하기
              </button>
              <p className="game-overlay-sub">Enter로도 시작 · 한글 입력 상태로 플레이하세요</p>
            </div>
          )}
          {phase === 'paused' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">일시정지</h2>
              <button className="game-btn" onClick={togglePause}>
                계속하기
              </button>
              <p className="game-overlay-sub">Esc</p>
            </div>
          )}
          {phase === 'over' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">GAME OVER</h2>
              <p>
                최종 점수 <strong>{hud.score}</strong> · LEVEL {hud.level}
              </p>
              {base.newRecord && <p className="game-record">★ 최고 기록 갱신!</p>}
              <button className="game-btn" onClick={start}>
                다시 시작
              </button>
            </div>
          )}
        </div>

        <form className="rain-form" onSubmit={onSubmit}>
          <input
            key={inputKey}
            ref={inputRef}
            className="rain-input"
            value={value}
            onChange={onChange}
            disabled={phase !== 'playing'}
            placeholder={phase === 'playing' ? '단어를 입력하세요 (Enter)' : '시작하면 입력할 수 있어요'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="단어 입력"
          />
        </form>
        <p className="game-hint">단어와 같아지면 자동으로 지워져요 · Esc 일시정지 · 오타 후 Enter는 콤보가 끊겨요</p>
      </div>
    </div>
  )
}
