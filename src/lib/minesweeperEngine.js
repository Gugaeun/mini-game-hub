// 지뢰찾기 로직. DOM/React 없음.
// 화면(React)은 상태를 복사해서 다시 그리므로, 동작 함수들은 복사본(clone)에 적용한다.
//   첫 번째로 연 칸과 그 주변 8칸에는 지뢰가 없다(첫 클릭이 바로 터지지 않게).

export const LEVELS = {
  easy: { label: '초급', rows: 9, cols: 9, mines: 10 },
  normal: { label: '중급', rows: 16, cols: 16, mines: 40 },
  hard: { label: '고급', rows: 16, cols: 30, mines: 99 },
}

export function createGame(levelKey) {
  const { rows, cols, mines } = LEVELS[levelKey]
  return {
    levelKey,
    rows,
    cols,
    mines,
    phase: 'ready', // 'ready'(첫 클릭 전) | 'playing' | 'won' | 'lost'
    cells: Array.from({ length: rows * cols }, () => ({ mine: false, adj: 0, state: 'hidden', exploded: false })),
    flags: 0,
    opened: 0,
  }
}

export function cloneGame(g) {
  return { ...g, cells: g.cells.map((c) => ({ ...c })) }
}

const idx = (g, r, c) => r * g.cols + c

export function neighbors(g, r, c) {
  const out = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < g.rows && nc >= 0 && nc < g.cols) out.push([nr, nc])
    }
  }
  return out
}

function placeMines(g, safeR, safeC, rng) {
  const banned = new Set([idx(g, safeR, safeC), ...neighbors(g, safeR, safeC).map(([r, c]) => idx(g, r, c))])
  const candidates = []
  for (let i = 0; i < g.cells.length; i++) if (!banned.has(i)) candidates.push(i)

  // Fisher-Yates 로 앞에서 mines 개만 뽑는다
  for (let i = 0; i < g.mines; i++) {
    const j = i + Math.floor(rng() * (candidates.length - i))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    g.cells[candidates[i]].mine = true
  }

  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      g.cells[idx(g, r, c)].adj = neighbors(g, r, c).filter(([nr, nc]) => g.cells[idx(g, nr, nc)].mine).length
    }
  }
}

function checkWin(g) {
  if (g.phase === 'playing' && g.opened === g.rows * g.cols - g.mines) {
    g.phase = 'won'
    g.cells.forEach((cell) => {
      if (cell.mine) cell.state = 'flag'
    })
    g.flags = g.mines
  }
}

function lose(g, r, c) {
  g.phase = 'lost'
  g.cells[idx(g, r, c)].exploded = true
  g.cells.forEach((cell) => {
    if (cell.mine && cell.state !== 'flag') cell.state = 'open'
  })
}

function openFrom(g, r, c) {
  const stack = [[r, c]]
  while (stack.length) {
    const [cr, cc] = stack.pop()
    const cell = g.cells[idx(g, cr, cc)]
    if (cell.state !== 'hidden') continue
    cell.state = 'open'
    g.opened += 1
    if (cell.adj === 0) neighbors(g, cr, cc).forEach(([nr, nc]) => stack.push([nr, nc]))
  }
}

// 칸 열기. 결과 'ignored' | 'opened' | 'boom' | 'won'
export function reveal(g, r, c, rng = Math.random) {
  if (g.phase === 'won' || g.phase === 'lost') return 'ignored'
  const cell = g.cells[idx(g, r, c)]
  if (cell.state !== 'hidden') return 'ignored'

  if (g.phase === 'ready') {
    placeMines(g, r, c, rng)
    g.phase = 'playing'
  }

  if (cell.mine) {
    lose(g, r, c)
    return 'boom'
  }
  openFrom(g, r, c)
  checkWin(g)
  return g.phase === 'won' ? 'won' : 'opened'
}

export function toggleFlag(g, r, c) {
  if (g.phase === 'won' || g.phase === 'lost') return false
  const cell = g.cells[idx(g, r, c)]
  if (cell.state === 'open') return false
  if (cell.state === 'flag') {
    cell.state = 'hidden'
    g.flags -= 1
  } else {
    cell.state = 'flag'
    g.flags += 1
  }
  return true
}

// 숫자 칸 주변 깃발 수가 숫자와 같으면 나머지 칸을 한꺼번에 연다. 결과는 reveal 과 같다.
export function chord(g, r, c, rng = Math.random) {
  if (g.phase !== 'playing') return 'ignored'
  const cell = g.cells[idx(g, r, c)]
  if (cell.state !== 'open' || cell.adj === 0) return 'ignored'

  const around = neighbors(g, r, c)
  const flagged = around.filter(([nr, nc]) => g.cells[idx(g, nr, nc)].state === 'flag').length
  if (flagged !== cell.adj) return 'ignored'

  let result = 'ignored'
  for (const [nr, nc] of around) {
    if (g.cells[idx(g, nr, nc)].state !== 'hidden') continue
    const res = reveal(g, nr, nc, rng)
    if (res === 'boom') return 'boom'
    if (res !== 'ignored') result = res
  }
  return result
}

export const minesLeft = (g) => g.mines - g.flags
