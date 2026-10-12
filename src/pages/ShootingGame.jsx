import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ENEMY, H, W, createGame, step } from '../lib/shooterEngine'
import { createAudio, playShooterSfx, setMuted } from '../lib/sfx'

const BEST_KEY = 'arcadia_shooting_best'
const RESTART_LOCK_MS = 700 // 게임오버 직후 연타로 바로 재시작되는 것을 막는다

// 11x8 픽셀 침략자 (2프레임)
const SPRITES = [
  ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'],
  ['00100000100', '10010001001', '10111111101', '11101110111', '11111111111', '01111111110', '00100000100', '01000000010'],
]
const ROW_COLORS = ['#ff3d94', '#ffb703', '#ffb703', '#7cf5a0', '#7cf5a0']

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function makeStars() {
  return Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: Math.random() < 0.2 ? 2 : 1,
    v: 0.3 + Math.random() * 0.9,
    a: 0.25 + Math.random() * 0.6,
  }))
}

function draw(ctx, g, stars) {
  ctx.fillStyle = '#0c0818'
  ctx.fillRect(0, 0, W, H)

  stars.forEach((s) => {
    s.y += s.v
    if (s.y > H) {
      s.y = 0
      s.x = Math.random() * W
    }
    ctx.fillStyle = `rgba(255,255,255,${s.a})`
    ctx.fillRect(s.x, s.y, s.s, s.s)
  })
  if (!g) return

  // 적
  const px = ENEMY.w / 11
  const sprite = SPRITES[Math.floor(g.time / 450) % 2]
  g.enemies.forEach((e) => {
    ctx.fillStyle = ROW_COLORS[e.row % ROW_COLORS.length]
    sprite.forEach((line, r) => {
      for (let c = 0; c < 11; c++) {
        if (line[c] === '1') ctx.fillRect(Math.round(e.x + c * px), Math.round(e.y + r * px), Math.ceil(px), Math.ceil(px))
      }
    })
  })

  // 탄
  ctx.fillStyle = '#ffb703'
  g.bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h))
  ctx.fillStyle = '#ff3d94'
  g.enemyBullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h))

  // 파티클
  g.particles.forEach((q) => {
    ctx.globalAlpha = Math.max(0, q.life / q.max)
    ctx.fillStyle = q.color
    ctx.fillRect(q.x, q.y, 3, 3)
  })
  ctx.globalAlpha = 1

  // 플레이어 (무적 중에는 깜빡임)
  const p = g.player
  const visible = g.phase === 'playing' && (p.invuln === 0 || Math.floor(g.time / 100) % 2 === 0)
  if (visible) {
    ctx.fillStyle = '#4cd7e0'
    ctx.beginPath()
    ctx.moveTo(p.x + p.w / 2, p.y)
    ctx.lineTo(p.x + p.w, p.y + p.h)
    ctx.lineTo(p.x + p.w / 2, p.y + p.h - 5)
    ctx.lineTo(p.x, p.y + p.h)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(p.x + p.w / 2 - 2, p.y + 6, 4, 5)
  }

  // 웨이브 배너
  if (g.banner.t > 0 && g.phase === 'playing') {
    ctx.globalAlpha = Math.min(1, g.banner.t / 400)
    ctx.fillStyle = '#ffffff'
    ctx.font = '28px Jua, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(g.banner.text, W / 2, H * 0.42)
    ctx.globalAlpha = 1
  }
}

export default function ShootingGame() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const keysRef = useRef({ left: false, right: false, fire: false })
  const phaseRef = useRef('menu')
  const audioRef = useRef(null)
  const bestRef = useRef(readBest())
  const hudRef = useRef({ score: 0, lives: 3, wave: 1 })
  const overAtRef = useRef(0)
  const mutedRef = useRef(false)

  const [phase, setPhaseState] = useState('menu') // 'menu' | 'playing' | 'paused' | 'over'
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 })
  const [best, setBest] = useState(bestRef.current)
  const [muted, setMutedState] = useState(false)
  const [newRecord, setNewRecord] = useState(false)

  const setPhase = useCallback((p) => {
    phaseRef.current = p
    setPhaseState(p)
  }, [])

  const start = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudio()
      setMuted(audioRef.current, mutedRef.current)
    }
    audioRef.current?.ctx.resume()
    gameRef.current = createGame()
    hudRef.current = { score: 0, lives: 3, wave: 1 }
    setHud(hudRef.current)
    setNewRecord(false)
    setPhase('playing')
  }, [setPhase])

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'playing') setPhase('paused')
    else if (phaseRef.current === 'paused') setPhase('playing')
  }, [setPhase])

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current
    setMuted(audioRef.current, mutedRef.current)
    setMutedState(mutedRef.current)
  }, [])

  // 게임 루프
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    const stars = makeStars()
    let raf
    let last = performance.now()

    const finish = (g) => {
      overAtRef.current = performance.now()
      if (g.score > bestRef.current) {
        bestRef.current = g.score
        setBest(g.score)
        setNewRecord(true)
        try {
          localStorage.setItem(BEST_KEY, String(g.score))
        } catch {
          // 저장 불가 환경(시크릿 모드 등)에서는 이번 접속 동안만 유지
        }
      }
      setPhase('over')
    }

    const loop = (now) => {
      const dt = now - last
      last = now
      const g = gameRef.current

      if (g && phaseRef.current === 'playing') {
        step(g, keysRef.current, dt)
        g.events.forEach((ev) => {
          playShooterSfx(audioRef.current, ev)
          if (ev === 'gameover') finish(g)
        })

        const h = hudRef.current
        if (h.score !== g.score || h.lives !== g.lives || h.wave !== g.wave) {
          hudRef.current = { score: g.score, lives: g.lives, wave: g.wave }
          setHud(hudRef.current)
        }
      }

      draw(ctx, g, stars)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [setPhase])

  // 키보드 / 포커스
  useEffect(() => {
    const keys = keysRef.current
    const canStart = () =>
      phaseRef.current === 'menu' ||
      (phaseRef.current === 'over' && performance.now() - overAtRef.current > RESTART_LOCK_MS)

    const down = (e) => {
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault()
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true
      if (e.code === 'Space' || e.code === 'KeyZ') {
        keys.fire = true
        if (!e.repeat && canStart()) start()
      }
      if (e.code === 'Enter' && !e.repeat && canStart()) start()
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) togglePause()
      if (e.code === 'KeyM' && !e.repeat) toggleMute()
    }
    const up = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false
      if (e.code === 'Space' || e.code === 'KeyZ') keys.fire = false
    }
    const pauseIfPlaying = () => {
      keys.left = keys.right = keys.fire = false
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
  }, [start, togglePause, toggleMute, setPhase])

  // 화면을 나갈 때 오디오 정리
  useEffect(
    () => () => {
      audioRef.current?.ctx.close()
      audioRef.current = null
    },
    [],
  )

  // 터치/마우스용 버튼
  const hold = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault()
      keysRef.current[key] = true
    },
    onPointerUp: () => (keysRef.current[key] = false),
    onPointerLeave: () => (keysRef.current[key] = false),
    onPointerCancel: () => (keysRef.current[key] = false),
  })

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
            BEST <strong>{best}</strong>
          </span>
          <span>
            WAVE <strong>{hud.wave}</strong>
          </span>
          <span className="game-lives" aria-label={`목숨 ${hud.lives}개`}>
            {'♥'.repeat(hud.lives) || '–'}
          </span>
          <button className="game-icon-btn" onClick={toggleMute} aria-label="음소거 전환">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="game-canvas-wrap" style={{ maxWidth: W }}>
          <canvas ref={canvasRef} width={W} height={H} />

          {phase === 'menu' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">SPACE SHOOTER</h2>
              <p>몰려오는 적을 격추하고 웨이브를 이어가세요.</p>
              <p className="game-overlay-sub">웨이브가 오를수록 적이 빨라지고 더 많이 쏩니다.</p>
              <button className="game-btn" onClick={start}>
                시작하기
              </button>
              <p className="game-overlay-sub">Space 또는 Enter로도 시작</p>
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
                최종 점수 <strong>{hud.score}</strong> · WAVE {hud.wave}
              </p>
              {newRecord && <p className="game-record">★ 최고 기록 갱신!</p>}
              <button className="game-btn" onClick={start}>
                다시 시작
              </button>
            </div>
          )}
        </div>

        <div className="touch-controls">
          <button className="touch-btn" {...hold('left')} aria-label="왼쪽">
            ◀
          </button>
          <button className="touch-btn touch-fire" {...hold('fire')} aria-label="발사">
            발사
          </button>
          <button className="touch-btn" {...hold('right')} aria-label="오른쪽">
            ▶
          </button>
        </div>
        <p className="game-hint">← → 이동 · Space 발사 · P 일시정지 · M 음소거</p>
      </div>
    </div>
  )
}
