import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BLACK, EMPTY, SIZE, WHITE, aiMove, cloneGame, createGame, placeStone, undo } from '../lib/gomokuEngine'
import { useGameBasics } from '../lib/useGameBasics'

const CANVAS = 540
const PAD = 30
const STEP = (CANVAS - PAD * 2) / (SIZE - 1)
const STARS = [
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
  [7, 7],
]
const LEVELS = { easy: '쉬움', normal: '보통' }
const AI_DELAY_MS = 450

const winsKey = (level) => `arcadia_gomoku_wins_${level}`
const readWins = (level) => {
  try {
    return Number(localStorage.getItem(winsKey(level))) || 0
  } catch {
    return 0
  }
}

const px = (i) => PAD + i * STEP

function drawStone(ctx, x, y, who, alpha = 1) {
  const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, STEP * 0.46)
  if (who === BLACK) {
    grad.addColorStop(0, '#6b6b6b')
    grad.addColorStop(1, '#111111')
  } else {
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(1, '#cfcfcf')
  }
  ctx.globalAlpha = alpha
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, STEP * 0.44, 0, Math.PI * 2)
  ctx.fill()
  if (who === WHITE) {
    ctx.strokeStyle = '#9a9a9a'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function draw(ctx, g, hover) {
  ctx.fillStyle = '#e8c27a'
  ctx.fillRect(0, 0, CANVAS, CANVAS)

  ctx.strokeStyle = '#6b4a1e'
  ctx.lineWidth = 1
  for (let i = 0; i < SIZE; i++) {
    ctx.beginPath()
    ctx.moveTo(px(0), px(i))
    ctx.lineTo(px(SIZE - 1), px(i))
    ctx.moveTo(px(i), px(0))
    ctx.lineTo(px(i), px(SIZE - 1))
    ctx.stroke()
  }
  ctx.fillStyle = '#6b4a1e'
  STARS.forEach(([r, c]) => {
    ctx.beginPath()
    ctx.arc(px(c), px(r), 3.5, 0, Math.PI * 2)
    ctx.fill()
  })

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const who = g.board[r * SIZE + c]
      if (who !== EMPTY) drawStone(ctx, px(c), px(r), who)
    }
  }

  // 마지막으로 둔 수 표시
  const last = g.moves[g.moves.length - 1]
  if (last) {
    ctx.fillStyle = '#ef2d8c'
    ctx.beginPath()
    ctx.arc(px(last.c), px(last.r), 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // 승리한 줄 강조
  if (g.winLine.length) {
    const sorted = [...g.winLine].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const a = sorted[0]
    const b = sorted[sorted.length - 1]
    ctx.strokeStyle = '#ef2d8c'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(px(a[1]), px(a[0]))
    ctx.lineTo(px(b[1]), px(b[0]))
    ctx.stroke()
  }

  // 마우스를 올린 자리 미리보기
  if (hover && g.phase === 'playing' && g.board[hover[0] * SIZE + hover[1]] === EMPTY) {
    drawStone(ctx, px(hover[1]), px(hover[0]), BLACK, 0.35)
  }
}

export default function Gomoku() {
  const canvasRef = useRef(null)
  const timerRef = useRef(null)
  const base = useGameBasics('arcadia_gomoku_unused')
  const { ensureAudio, play } = base

  const [game, setGame] = useState(() => createGame())
  const [level, setLevel] = useState('normal')
  const [thinking, setThinking] = useState(false)
  const [hover, setHover] = useState(null)
  const [wins, setWins] = useState(() => readWins('normal'))

  useEffect(() => {
    draw(canvasRef.current.getContext('2d'), game, hover)
  }, [game, hover])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const reset = useCallback(
    (nextLevel = level) => {
      clearTimeout(timerRef.current)
      setThinking(false)
      setHover(null)
      setGame(createGame())
      setLevel(nextLevel)
      setWins(readWins(nextLevel))
    },
    [level],
  )

  const recordWin = useCallback(() => {
    const next = readWins(level) + 1
    try {
      localStorage.setItem(winsKey(level), String(next))
    } catch {
      // 저장 불가 환경에서는 이번 접속 동안만 유지
    }
    setWins(next)
  }, [level])

  const finish = useCallback(
    (result, who) => {
      if (result === 'win' && who === BLACK) {
        play('win')
        recordWin()
      } else if (result === 'win') play('lose')
    },
    [play, recordWin],
  )

  const cellFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) * CANVAS) / rect.width
    const y = ((e.clientY - rect.top) * CANVAS) / rect.height
    const c = Math.round((x - PAD) / STEP)
    const r = Math.round((y - PAD) / STEP)
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null
    if (Math.hypot(x - px(c), y - px(r)) > STEP * 0.55) return null
    return [r, c]
  }

  const onClick = (e) => {
    if (thinking || game.phase !== 'playing') return
    const cell = cellFromEvent(e)
    if (!cell) return
    ensureAudio()

    const next = cloneGame(game)
    const result = placeStone(next, cell[0], cell[1])
    if (result === 'invalid') return
    play('open')
    setGame(next)
    setHover(null)
    if (result !== 'ok') {
      finish(result, BLACK)
      return
    }

    // AI(백)의 차례
    setThinking(true)
    timerRef.current = setTimeout(() => {
      const after = cloneGame(next)
      const [r, c] = aiMove(after, level, Math.random)
      const aiResult = placeStone(after, r, c)
      play('open')
      setGame(after)
      setThinking(false)
      finish(aiResult, WHITE)
    }, AI_DELAY_MS)
  }

  const onMove = (e) => {
    if (thinking || game.phase !== 'playing') return
    const cell = cellFromEvent(e)
    setHover((prev) => (prev && cell && prev[0] === cell[0] && prev[1] === cell[1] ? prev : cell))
  }

  const onUndo = () => {
    if (thinking || !game.moves.length) return
    clearTimeout(timerRef.current)
    const next = cloneGame(game)
    if (undo(next)) {
      setGame(next)
      play('flag')
    }
  }

  let status = '당신(흑) 차례예요. 교차점을 눌러 돌을 놓으세요.'
  if (thinking) status = 'AI(백)가 생각 중…'
  if (game.phase === 'won') status = game.winner === BLACK ? '🎉 당신이 이겼어요!' : 'AI가 이겼어요. RESET으로 다시 도전해보세요.'
  if (game.phase === 'draw') status = '무승부예요.'

  return (
    <div className="game-page">
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">

        <div className="ms-levels">
          {Object.entries(LEVELS).map(([key, label]) => (
            <button key={key} className={`ms-level${key === level ? ' active' : ''}`} onClick={() => reset(key)}>
              {label}
              <span>AI 난이도</span>
            </button>
          ))}
        </div>

        <div className="game-hud">
          <span>
            수 <strong>{game.moves.length}</strong>
          </span>
          <span>
            {LEVELS[level]} 승 <strong>{wins}</strong>
          </span>
          <button className="ms-reset" onClick={onUndo} disabled={thinking || !game.moves.length}>
            무르기
          </button>
          <button className="ms-reset" onClick={() => reset()}>
            RESET
          </button>
          <button className="game-icon-btn" onClick={base.toggleMute} aria-label="음소거 전환">
            {base.muted ? '🔇' : '🔊'}
          </button>
        </div>

        <p className="gomoku-status" aria-live="polite">
          {status}
        </p>

        <div className="game-canvas-wrap" style={{ maxWidth: CANVAS }}>
          <canvas
            ref={canvasRef}
            width={CANVAS}
            height={CANVAS}
            className="gomoku-canvas"
            onClick={onClick}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </div>
        <p className="game-hint">흑(당신)이 먼저 둬요 · 가로·세로·대각선으로 5개를 이으면 승리 · 무르기는 내 수와 AI의 수를 함께 되돌려요</p>
      </div>
    </div>
  )
}
