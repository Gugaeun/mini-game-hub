import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { H, W, brickColor, createGame, step } from '../lib/breakoutEngine'
import { useGameBasics } from '../lib/useGameBasics'

function draw(ctx, g, now) {
  ctx.fillStyle = '#0c0818'
  ctx.fillRect(0, 0, W, H)
  if (!g) return

  // 벽돌 (단단한 벽돌은 흰 테두리)
  g.bricks.forEach((b) => {
    ctx.fillStyle = brickColor(b.row)
    ctx.fillRect(b.x, b.y, b.w, b.h)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(b.x, b.y, b.w, 4)
    if (b.hp > 1) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2)
    }
  })

  // 아이템
  g.items.forEach((it) => {
    ctx.fillStyle = '#7cf5a0'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(it.x - 12, it.y - 8, 24, 16, 8)
    else ctx.rect(it.x - 12, it.y - 8, 24, 16)
    ctx.fill()
    ctx.fillStyle = '#0c0818'
    ctx.font = '12px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('W', it.x, it.y + 1)
  })

  g.particles.forEach((q) => {
    ctx.globalAlpha = Math.max(0, q.life / q.max)
    ctx.fillStyle = q.color
    ctx.fillRect(q.x, q.y, 3, 3)
  })
  ctx.globalAlpha = 1

  // 패들
  const p = g.paddle
  ctx.fillStyle = p.wideTimer > 0 ? '#7cf5a0' : '#4cd7e0'
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(p.x, p.y, p.w, p.h, 6)
  else ctx.rect(p.x, p.y, p.w, p.h)
  ctx.fill()

  // 공
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(g.ball.x, g.ball.y, g.ball.r, 0, Math.PI * 2)
  ctx.fill()

  if (g.ball.stuck && g.phase === 'playing') {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 250)
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Jua, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Space 또는 클릭으로 발사', W / 2, H * 0.6)
    ctx.globalAlpha = 1
  }
}

export default function Breakout() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const inputRef = useRef({ left: false, right: false, fire: false, firePulse: false, targetX: null })
  const hudRef = useRef({ score: 0, lives: 3, level: 1 })
  const base = useGameBasics('arcadia_breakout_best')
  const { phase, phaseRef, setPhase, play, saveBest, ensureAudio, setNewRecord } = base
  const [hud, setHud] = useState(hudRef.current)

  const start = useCallback(() => {
    ensureAudio()
    gameRef.current = createGame()
    hudRef.current = { score: 0, lives: 3, level: 1 }
    setHud(hudRef.current)
    setNewRecord(false)
    setPhase('playing')
  }, [ensureAudio, setNewRecord, setPhase])

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused')
    else if (phaseRef.current === 'paused') setPhase('playing')
  }, [phaseRef, setPhase])

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
        const inp = inputRef.current
        // 아주 짧게 눌렀다 뗀 발사 입력도 한 프레임은 인식되도록 firePulse 를 쓴다
        step(g, { ...inp, fire: inp.fire || inp.firePulse }, dt)
        inp.firePulse = false
        g.events.forEach((ev) => {
          play(ev)
          if (ev === 'gameover') {
            saveBest(g.score)
            setPhase('over')
          }
        })
        const h = hudRef.current
        if (h.score !== g.score || h.lives !== g.lives || h.level !== g.level) {
          hudRef.current = { score: g.score, lives: g.lives, level: g.level }
          setHud(hudRef.current)
        }
      }
      draw(ctx, g, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [play, saveBest, setPhase, phaseRef])

  // 키보드 / 포커스
  useEffect(() => {
    const input = inputRef.current
    const canStart = () => phaseRef.current === 'menu' || phaseRef.current === 'over'
    const down = (e) => {
      if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        input.left = true
        input.targetX = null
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        input.right = true
        input.targetX = null
      }
      if (e.code === 'Space') {
        input.fire = true
        input.firePulse = true
        if (!e.repeat && canStart()) start()
      }
      if (e.code === 'Enter' && !e.repeat && canStart()) start()
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) togglePause()
      if (e.code === 'KeyM' && !e.repeat) base.toggleMute()
    }
    const up = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false
      if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false
      if (e.code === 'Space') input.fire = false
    }
    const pauseIfPlaying = () => {
      input.left = input.right = input.fire = false
      if (phaseRef.current === 'playing') setPhase('paused')
    }
    const onVisibility = () => document.hidden && pauseIfPlaying()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', pauseIfPlaying)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', pauseIfPlaying)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [start, togglePause, phaseRef, setPhase, base.toggleMute]) // eslint-disable-line react-hooks/exhaustive-deps

  // 마우스/터치: 패들을 손가락 위치로, 누르면 발사
  const pointToCanvasX = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return ((e.clientX - rect.left) / rect.width) * W
  }
  const onPointerMove = (e) => {
    inputRef.current.targetX = pointToCanvasX(e)
  }
  const onPointerDown = (e) => {
    inputRef.current.targetX = pointToCanvasX(e)
    inputRef.current.fire = true
    inputRef.current.firePulse = true
  }
  const onPointerUp = () => {
    inputRef.current.fire = false
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
          <span className="game-lives" aria-label={`목숨 ${hud.lives}개`}>
            {'♥'.repeat(hud.lives) || '–'}
          </span>
          <button className="game-icon-btn" onClick={base.toggleMute} aria-label="음소거 전환">
            {base.muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="game-canvas-wrap" style={{ maxWidth: W }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ touchAction: 'none' }}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />

          {phase === 'menu' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">벽돌깨기</h2>
              <p>공을 튕겨 벽돌을 모두 부수세요.</p>
              <p className="game-overlay-sub">패들 가장자리에 맞힐수록 공이 비스듬히 튕겨요. 초록 W 아이템은 패들을 넓혀줘요.</p>
              <button className="game-btn" onClick={start}>
                시작하기
              </button>
              <p className="game-overlay-sub">← → 또는 마우스로 이동 · Space/클릭으로 발사</p>
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
        <p className="game-hint">← → / 마우스 이동 · Space/클릭 발사 · P 일시정지 · M 음소거</p>
      </div>
    </div>
  )
}
