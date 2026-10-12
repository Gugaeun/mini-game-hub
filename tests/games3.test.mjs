// 실행: node tests/games3.test.mjs
// 오목 / 두더지잡기 로직을 화면 없이 시뮬레이션해서 검증한다.
import assert from 'node:assert/strict'
import * as go from '../src/lib/gomokuEngine.js'
import * as mole from '../src/lib/moleEngine.js'

let count = 0
const test = (name, fn) => {
  fn()
  count++
  console.log('ok -', name)
}
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

// 흑/백을 번갈아 두는 도우미: 한 쪽만 두고 싶을 때는 turn 을 직접 고정한다.
const put = (g, who, r, c) => {
  g.turn = who
  return go.placeStone(g, r, c)
}

// ---------------- 오목 ----------------

test('오목: 가로/세로/대각선/반대 대각선 5목이면 승리하고 승리 줄이 기록된다', () => {
  const dirs = { 가로: [0, 1], 세로: [1, 0], 대각선: [1, 1], 반대대각선: [1, -1] }
  for (const [name, [dr, dc]] of Object.entries(dirs)) {
    const g = go.createGame()
    const r0 = dr === 0 || dc > 0 ? 3 : 3
    const c0 = dc < 0 ? 10 : 3
    for (let k = 0; k < 4; k++) assert.equal(put(g, go.BLACK, r0 + dr * k, c0 + dc * k), 'ok', name)
    assert.equal(put(g, go.BLACK, r0 + dr * 4, c0 + dc * 4), 'win', name)
    assert.equal(g.phase, 'won')
    assert.equal(g.winner, go.BLACK)
    assert.equal(g.winLine.length, 5)
  }
})

test('오목: 4목은 승리가 아니고, 6목 이상도 승리로 인정한다', () => {
  const g = go.createGame()
  for (let c = 0; c < 4; c++) assert.equal(put(g, go.BLACK, 5, c), 'ok')
  assert.equal(g.phase, 'playing')
  const g2 = go.createGame()
  ;[0, 1, 2, 4, 5].forEach((c) => put(g2, go.BLACK, 7, c))
  assert.equal(put(g2, go.BLACK, 7, 3), 'win')
  assert.equal(g2.winLine.length, 6)
})

test('오목: 이미 돌이 있는 곳 / 판 밖 / 게임이 끝난 뒤에는 둘 수 없다', () => {
  const g = go.createGame()
  assert.equal(go.placeStone(g, 7, 7), 'ok')
  assert.equal(go.placeStone(g, 7, 7), 'invalid')
  assert.equal(go.placeStone(g, -1, 3), 'invalid')
  assert.equal(go.placeStone(g, 3, 15), 'invalid')
  const g2 = go.createGame()
  ;[0, 1, 2, 3, 4].forEach((c) => put(g2, go.BLACK, 0, c))
  assert.equal(go.placeStone(g2, 9, 9), 'invalid')
})

test('오목: 흑·백이 번갈아 두고, 판이 다 차면 무승부', () => {
  const g = go.createGame()
  go.placeStone(g, 7, 7)
  assert.equal(g.turn, go.WHITE)
  go.placeStone(g, 7, 8)
  assert.equal(g.turn, go.BLACK)

  // 5목이 안 생기는 배치로 작은 판을 가득 채운다 (4x4)
  const small = go.createGame(4)
  const pattern = ['BBWW', 'WWBB', 'BBWW', 'WWBB']
  let lastResult
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4)
    const c = i % 4
    lastResult = put(small, pattern[r][c] === 'B' ? go.BLACK : go.WHITE, r, c)
  }
  assert.equal(lastResult, 'draw')
  assert.equal(small.phase, 'draw')
})

test('오목: AI 는 첫 수로 판 중앙을 두고, 사용자의 첫 수 근처에 응수한다', () => {
  const g = go.createGame()
  assert.deepEqual(go.aiMove(g), [7, 7])
  go.placeStone(g, 7, 7)
  const [r, c] = go.aiMove(g)
  assert.ok(Math.abs(r - 7) <= 1 && Math.abs(c - 7) <= 1)
})

test('오목: AI 는 이길 수 있으면 이긴다', () => {
  const g = go.createGame()
  ;[3, 4, 5, 6].forEach((c) => put(g, go.WHITE, 8, c)) // 백 4목 (열린 4)
  put(g, go.BLACK, 0, 0)
  g.turn = go.WHITE
  const [r, c] = go.aiMove(g, 'normal')
  assert.equal(r, 8)
  assert.ok(c === 2 || c === 7)
})

test('오목: AI 는 사용자의 4목을 막는다 (보통), 쉬움도 대체로 막는다', () => {
  const g = go.createGame()
  ;[3, 4, 5, 6].forEach((c) => put(g, go.BLACK, 8, c))
  put(g, go.WHITE, 0, 0)
  g.turn = go.WHITE
  const [r, c] = go.aiMove(g, 'normal')
  assert.equal(r, 8)
  assert.ok(c === 2 || c === 7)

  let blocked = 0
  for (let seed = 1; seed <= 30; seed++) {
    const [er, ec] = go.aiMove(g, 'easy', seeded(seed))
    if (er === 8 && (ec === 2 || ec === 7)) blocked++
  }
  assert.ok(blocked >= 20, `쉬움이 너무 못 막음: ${blocked}/30`)
})

test('오목: AI 는 사용자의 열린 3을 방치하지 않는다', () => {
  const g = go.createGame()
  ;[5, 6, 7].forEach((c) => put(g, go.BLACK, 7, c))
  put(g, go.WHITE, 0, 0)
  put(g, go.WHITE, 14, 14)
  g.turn = go.WHITE
  const [r, c] = go.aiMove(g, 'normal')
  assert.equal(r, 7)
  assert.ok(c === 4 || c === 8, `열린 3 양끝(4,8)을 막아야 함: ${r},${c}`)
})

test('오목: 무르기는 내 수와 AI 수를 함께 되돌리고, 게임 종료 상태도 풀어준다', () => {
  const g = go.createGame()
  go.placeStone(g, 7, 7)
  go.placeStone(g, 7, 8)
  go.placeStone(g, 8, 8)
  go.placeStone(g, 9, 9)
  assert.equal(go.undo(g), true)
  assert.equal(g.moves.length, 2)
  assert.equal(g.board[8 * 15 + 8], go.EMPTY)
  assert.equal(g.turn, go.BLACK)

  const w = go.createGame()
  ;[0, 1, 2, 3].forEach((c) => {
    put(w, go.BLACK, 2, c)
    put(w, go.WHITE, 12, c)
  })
  assert.equal(put(w, go.BLACK, 2, 4), 'win')
  assert.equal(go.undo(w), true)
  assert.equal(w.phase, 'playing')
  assert.equal(go.undo(go.createGame()), false)
})

test('오목: AI 대 AI 로 끝까지 둬도 오류 없이 승부가 나거나 계속된다 (성능 포함)', () => {
  const g = go.createGame()
  const t0 = Date.now()
  let moves = 0
  while (g.phase === 'playing' && moves < 80) {
    const probe = go.cloneGame(g)
    probe.turn = go.WHITE
    // 사용자 자리는 같은 평가로 대신 둔다: 색을 바꿔 보드를 뒤집어 계산
    const flipped = go.cloneGame(g)
    flipped.board = flipped.board.map((v) => (v === 1 ? 2 : v === 2 ? 1 : 0))
    flipped.moves = flipped.moves.map((m) => ({ ...m, who: m.who === 1 ? 2 : 1 }))
    const [r, c] = g.turn === go.WHITE ? go.aiMove(g, 'normal', seeded(moves + 1)) : go.aiMove(flipped, 'normal', seeded(moves + 1))
    assert.notEqual(go.placeStone(g, r, c), 'invalid')
    moves++
  }
  assert.ok(Date.now() - t0 < 5000, '수 계산이 너무 느림')
  assert.ok(g.phase === 'won' || moves === 80)
})

// ---------------- 두더지잡기 ----------------

const hole = (kind, ttl = 1000) => ({ kind, ttl, hit: false, hitTimer: 0 })

test('두더지: 두더지를 잡으면 점수와 콤보가 오르고, 같은 구멍은 한 번만 잡힌다', () => {
  const s = mole.createGame(seeded(1))
  s.holes[4] = hole('mole')
  assert.equal(mole.whack(s, 4), 'mole')
  assert.equal(s.score, 10)
  assert.equal(s.combo, 1)
  assert.equal(mole.whack(s, 4), 'whiff')
  assert.equal(s.combo, 0)
})

test('두더지: 금빛은 30점, 콤보 5마다 +25% (최대 2배)', () => {
  const s = mole.createGame(seeded(1))
  s.holes[0] = hole('gold')
  mole.whack(s, 0)
  assert.equal(s.score, 30)
  const t = mole.createGame(seeded(1))
  t.combo = 5
  t.holes[1] = hole('mole')
  mole.whack(t, 1)
  assert.equal(t.score, 13) // 10 * 1.25 = 12.5 → 13
  const u = mole.createGame(seeded(1))
  u.combo = 99
  u.holes[1] = hole('mole')
  mole.whack(u, 1)
  assert.equal(u.score, 20)
})

test('두더지: 판다(마스코트)를 잡으면 -20점(0 미만 없음)이고 콤보가 끊긴다', () => {
  const s = mole.createGame(seeded(1))
  s.score = 50
  s.combo = 7
  s.holes[2] = hole('panda')
  assert.equal(mole.whack(s, 2), 'panda')
  assert.equal(s.score, 30)
  assert.equal(s.combo, 0)
  assert.equal(s.oops, 1)
  s.score = 5
  s.holes[3] = hole('panda')
  mole.whack(s, 3)
  assert.equal(s.score, 0)
})

test('두더지: 빈 구멍을 누르면 콤보가 끊긴다 / 놓친 두더지도 콤보가 끊긴다 (판다는 놓쳐도 무방)', () => {
  const s = mole.createGame(seeded(1))
  s.combo = 3
  assert.equal(mole.whack(s, 5), 'whiff')
  assert.equal(s.combo, 0)
  s.spawnTimer = 1e9
  s.combo = 4
  s.holes[6] = hole('mole', 30)
  mole.step(s, 50)
  assert.equal(s.holes[6], null)
  assert.equal(s.combo, 0)
  assert.equal(s.escapes, 1)
  s.combo = 4
  s.holes[7] = hole('panda', 30)
  mole.step(s, 50)
  assert.equal(s.combo, 4)
  assert.equal(s.escapes, 1)
})

test('두더지: 30초가 지나면 끝나고, 끝난 뒤에는 잡히지 않는다', () => {
  const s = mole.createGame(seeded(3))
  for (let i = 0; i < 700 && s.phase === 'playing'; i++) mole.step(s, 50)
  assert.equal(s.phase, 'over')
  assert.equal(s.timeLeft, 0)
  s.holes[0] = hole('mole')
  assert.equal(mole.whack(s, 0), null)
})

test('두더지: 시간이 갈수록 더 빨리 사라지고 더 많이 나온다', () => {
  const a = mole.params(0)
  const b = mole.params(29000)
  assert.ok(b.upTime < a.upTime && b.spawnEvery < a.spawnEvery && b.maxUp > a.maxUp)
  assert.ok(b.upTime >= 520 && b.spawnEvery >= 380)
})

test('두더지: 동시에 나오는 수가 maxUp 을 넘지 않고, 오래 돌려도 오류가 없다', () => {
  const s = mole.createGame(seeded(9))
  let seenKinds = new Set()
  for (let i = 0; i < 600 && s.phase === 'playing'; i++) {
    mole.step(s, 50)
    const up = s.holes.filter((h) => h && !h.hit)
    assert.ok(up.length <= mole.params(s.elapsed).maxUp, `동시 출현 ${up.length}`)
    up.forEach((h) => seenKinds.add(h.kind))
  }
  assert.ok(seenKinds.has('mole'))
  assert.ok(s.holes.length === mole.HOLES)
})

test('두더지: 잡힌 두더지는 짧은 연출 뒤 구멍이 비워진다', () => {
  const s = mole.createGame(seeded(1))
  s.spawnTimer = 1e9
  s.holes[1] = hole('mole')
  mole.whack(s, 1)
  assert.equal(s.holes[1].hit, true)
  for (let i = 0; i < 3; i++) mole.step(s, 100) // 한 프레임은 최대 100ms 만 반영된다
  assert.equal(s.holes[1], null)
})

console.log(`\n${count}개 테스트 통과`)
