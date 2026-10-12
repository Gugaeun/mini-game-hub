import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LEVELS, chord, cloneGame, createGame, minesLeft, reveal, toggleFlag } from '../lib/minesweeperEngine'
import { useGameBasics } from '../lib/useGameBasics'

const NUMBER_COLORS = ['', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#b45309', '#0891b2', '#111827', '#6b7280']
const bestKey = (level) => `arcadia_minesweeper_best_${level}` // 가장 빠른 클리어 시간(초)

const readBest = (level) => {
  try {
    return Number(localStorage.getItem(bestKey(level))) || 0
  } catch {
    return 0
  }
}

export default function Minesweeper() {
  const [levelKey, setLevelKey] = useState('easy')
  const [game, setGame] = useState(() => createGame('easy'))
  const [flagMode, setFlagMode] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [bestTime, setBestTime] = useState(() => readBest('easy'))
  const [newRecord, setNewRecord] = useState(false)
  const startRef = useRef(0)
  const base = useGameBasics('arcadia_minesweeper_unused')
  const { ensureAudio, play } = base

  const newGame = useCallback((key) => {
    setLevelKey(key)
    setGame(createGame(key))
    setSeconds(0)
    setNewRecord(false)
    setBestTime(readBest(key))
  }, [])

  // 타이머: 첫 칸을 연 순간부터 승/패까지
  useEffect(() => {
    if (game.phase !== 'playing') return undefined
    startRef.current = startRef.current || Date.now()
    const id = setInterval(() => setSeconds(Math.min(999, Math.floor((Date.now() - startRef.current) / 1000))), 250)
    return () => clearInterval(id)
  }, [game.phase])

  useEffect(() => {
    if (game.phase === 'ready') startRef.current = 0
  }, [game.phase])

  const apply = useCallback(
    (action) => {
      ensureAudio()
      const next = cloneGame(game)
      const result = action(next)
      if (result === 'ignored' || result === false) return
      setGame(next)

      if (result === 'boom') play('boom')
      else if (result === 'won') {
        play('win')
        const elapsed = startRef.current ? Math.max(1, Math.round((Date.now() - startRef.current) / 1000)) : 1
        setSeconds(elapsed)
        const prev = readBest(levelKey)
        if (!prev || elapsed < prev) {
          try {
            localStorage.setItem(bestKey(levelKey), String(elapsed))
          } catch {
            // 저장 불가 환경에서는 이번 접속 동안만 유지
          }
          setBestTime(elapsed)
          setNewRecord(true)
        }
      } else if (result === true) play('flag')
      else play('open')
    },
    [game, ensureAudio, play, levelKey],
  )

  const onCellClick = (r, c) => {
    const cell = game.cells[r * game.cols + c]
    if (flagMode && cell.state !== 'open') apply((g) => toggleFlag(g, r, c))
    else if (cell.state === 'open') apply((g) => chord(g, r, c))
    else apply((g) => reveal(g, r, c))
  }

  const onContextMenu = (e, r, c) => {
    e.preventDefault()
    apply((g) => toggleFlag(g, r, c))
  }

  const cellSize = game.cols > 20 ? 24 : 30

  return (
    <div className="game-page">
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">

        <div className="ms-levels">
          {Object.entries(LEVELS).map(([key, cfg]) => (
            <button key={key} className={`ms-level${key === levelKey ? ' active' : ''}`} onClick={() => newGame(key)}>
              {cfg.label}
              <span>
                {cfg.cols}×{cfg.rows} · 💣{cfg.mines}
              </span>
            </button>
          ))}
        </div>

        <div className="game-hud">
          <span>
            💣 <strong>{minesLeft(game)}</strong>
          </span>
          <button className="ms-reset" onClick={() => newGame(levelKey)} aria-label="새 게임">
            RESET
          </button>
          <span>
            ⏱ <strong>{seconds}s</strong>
          </span>
          <span>
            BEST <strong>{bestTime ? `${bestTime}s` : '-'}</strong>
          </span>
          <button className="game-icon-btn" onClick={base.toggleMute} aria-label="음소거 전환">
            {base.muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="ms-scroll">
          <div
            className="ms-board"
            style={{ gridTemplateColumns: `repeat(${game.cols}, ${cellSize}px)`, '--cell': `${cellSize}px` }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {game.cells.map((cell, i) => {
              const r = Math.floor(i / game.cols)
              const c = i % game.cols
              const open = cell.state === 'open'
              const cls = ['ms-cell', open ? 'open' : 'hidden', cell.exploded ? 'boom' : ''].join(' ')
              let content = ''
              if (cell.state === 'flag') content = '🚩'
              else if (open && cell.mine) content = '💣'
              else if (open && cell.adj > 0) content = cell.adj

              return (
                <button
                  key={i}
                  className={cls}
                  style={open && cell.adj > 0 && !cell.mine ? { color: NUMBER_COLORS[cell.adj] } : undefined}
                  onClick={() => onCellClick(r, c)}
                  onContextMenu={(e) => onContextMenu(e, r, c)}
                  aria-label={`${r + 1}행 ${c + 1}열`}
                >
                  {content}
                </button>
              )
            })}
          </div>
        </div>

        {game.phase === 'won' && (
          <p className="game-record">
            클리어! {seconds}초 {newRecord ? '— ★ 최고 기록 갱신!' : ''}
          </p>
        )}
        {game.phase === 'lost' && <p className="game-lost">지뢰를 밟았어요. RESET을 눌러 다시 시작하세요.</p>}

        <label className="ms-flagmode">
          <input type="checkbox" checked={flagMode} onChange={(e) => setFlagMode(e.target.checked)} /> 깃발 모드 (터치용)
        </label>
        <p className="game-hint">
          클릭: 열기 · 우클릭: 깃발 · 숫자 칸 클릭: 주변 깃발이 숫자와 같으면 한꺼번에 열기 · 첫 클릭은 항상 안전해요
        </p>
      </div>
    </div>
  )
}
