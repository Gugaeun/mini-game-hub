// 오목(컴퓨터 대전) 로직. DOM/React 없음.
// 15×15 판, 사용자가 흑(선공), AI가 백. 가로·세로·대각선으로 5개 이상을 이으면 승리(장목 허용).
// AI 는 "내 공격 점수 + 상대 방어 점수"를 가장 크게 하는 자리를 고르는 단순 평가 방식이다.

export const SIZE = 15
export const EMPTY = 0
export const BLACK = 1 // 사용자
export const WHITE = 2 // AI

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

export function createGame(size = SIZE) {
  return { size, board: new Array(size * size).fill(EMPTY), turn: BLACK, phase: 'playing', winner: 0, winLine: [], moves: [] }
}

export function cloneGame(g) {
  return { ...g, board: [...g.board], winLine: g.winLine.map((p) => [...p]), moves: g.moves.map((m) => ({ ...m })) }
}

const inside = (g, r, c) => r >= 0 && r < g.size && c >= 0 && c < g.size
const at = (g, r, c) => (inside(g, r, c) ? g.board[r * g.size + c] : -1) // -1: 판 밖

// (r,c) 에 who 의 돌이 있다고 가정했을 때 방향별 { 연속 개수, 열린 끝 수 }
function lines(g, r, c, who) {
  return DIRS.map(([dr, dc]) => {
    let count = 1
    let open = 0
    for (const sign of [1, -1]) {
      let k = 1
      while (at(g, r + dr * k * sign, c + dc * k * sign) === who) {
        count += 1
        k += 1
      }
      if (at(g, r + dr * k * sign, c + dc * k * sign) === EMPTY) open += 1
    }
    return { count, open }
  })
}

const PATTERN = {
  five: 100000,
  open4: 10000,
  closed4: 1500,
  open3: 1200,
  closed3: 150,
  open2: 120,
  closed2: 12,
  open1: 8,
  closed1: 1,
}

function patternScore({ count, open }) {
  if (count >= 5) return PATTERN.five
  if (open === 0) return 0
  if (count === 4) return open === 2 ? PATTERN.open4 : PATTERN.closed4
  if (count === 3) return open === 2 ? PATTERN.open3 : PATTERN.closed3
  if (count === 2) return open === 2 ? PATTERN.open2 : PATTERN.closed2
  return open === 2 ? PATTERN.open1 : PATTERN.closed1
}

const pointScore = (g, r, c, who) => lines(g, r, c, who).reduce((sum, l) => sum + patternScore(l), 0)

// 돌을 놓는다. 결과: 'invalid' | 'ok' | 'win' | 'draw'
export function placeStone(g, r, c) {
  if (g.phase !== 'playing' || !inside(g, r, c) || g.board[r * g.size + c] !== EMPTY) return 'invalid'

  const who = g.turn
  g.board[r * g.size + c] = who
  g.moves.push({ r, c, who })

  // 승리 검사: 방금 놓은 돌을 지나는 줄 중 5개 이상
  for (const [dr, dc] of DIRS) {
    const cells = [[r, c]]
    for (const sign of [1, -1]) {
      let k = 1
      while (at(g, r + dr * k * sign, c + dc * k * sign) === who) {
        cells.push([r + dr * k * sign, c + dc * k * sign])
        k += 1
      }
    }
    if (cells.length >= 5) {
      g.phase = 'won'
      g.winner = who
      g.winLine = cells
      return 'win'
    }
  }

  if (g.moves.length === g.size * g.size) {
    g.phase = 'draw'
    return 'draw'
  }
  g.turn = who === BLACK ? WHITE : BLACK
  return 'ok'
}

// 무르기: 내 마지막 수(와 그에 대한 AI 수)를 되돌린다.
export function undo(g) {
  if (!g.moves.length) return false
  const popOne = () => {
    const m = g.moves.pop()
    g.board[m.r * g.size + m.c] = EMPTY
    return m
  }
  if (g.moves[g.moves.length - 1].who === WHITE) popOne()
  if (g.moves.length && g.moves[g.moves.length - 1].who === BLACK) popOne()
  g.phase = 'playing'
  g.winner = 0
  g.winLine = []
  g.turn = BLACK
  return true
}

// AI(백)의 다음 수. level: 'easy' | 'normal'
export function aiMove(g, level = 'normal', rng = Math.random) {
  const center = Math.floor(g.size / 2)
  const stones = g.moves.length
  if (!stones) return [center, center]

  // 후보: 이미 놓인 돌 주변 2칸 이내의 빈 칸
  const near = new Set()
  for (let r = 0; r < g.size; r++) {
    for (let c = 0; c < g.size; c++) {
      if (g.board[r * g.size + c] === EMPTY) continue
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (inside(g, nr, nc) && g.board[nr * g.size + nc] === EMPTY) near.add(nr * g.size + nc)
        }
      }
    }
  }

  const defenseWeight = level === 'easy' ? 0.55 : 1
  let best = null
  let bestValue = -Infinity
  for (const key of near) {
    const r = Math.floor(key / g.size)
    const c = key % g.size
    const attack = pointScore(g, r, c, WHITE)
    const defense = pointScore(g, r, c, BLACK)
    let value = attack + defense * defenseWeight - (Math.abs(r - center) + Math.abs(c - center)) * 0.5

    if (level === 'easy') {
      const mustWin = attack >= PATTERN.five
      const mustBlock = defense >= PATTERN.five && rng() > 0.2 // 쉬움은 가끔 막는 걸 놓친다
      if (!mustWin && !mustBlock) value *= 0.7 + rng() * 0.6
    }
    if (value > bestValue) {
      bestValue = value
      best = [r, c]
    }
  }
  return best
}
