// 실행: node tests/games2.test.mjs
// 산성비 / 벽돌깨기 / 지뢰찾기 로직을 화면 없이 시뮬레이션해서 검증한다.
import assert from 'node:assert/strict'
import * as rain from '../src/lib/acidRainEngine.js'
import * as brk from '../src/lib/breakoutEngine.js'
import * as ms from '../src/lib/minesweeperEngine.js'

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

// ---------------- 산성비 ----------------

test('산성비: 단어가 떨어지고 같은 단어를 입력하면 점수와 콤보가 오른다', () => {
  const g = rain.createGame(seeded(3))
  for (let i = 0; i < 80 && g.words.length === 0; i++) rain.step(g, 16)
  assert.ok(g.words.length > 0)
  const w = g.words[0]
  assert.ok(w.x >= 0 && w.x + rain.wordWidth(w.text) <= rain.W)
  const res = rain.submit(g, `  ${w.text}  `)
  assert.equal(res.ok, true)
  assert.ok(g.score >= w.text.length * 10 && g.combo === 1 && g.killed === 1)
  assert.ok(!g.words.some((x) => x.id === w.id))
})

test('산성비: 틀린 입력은 콤보를 끊고, 빈 입력은 무시된다', () => {
  const g = rain.createGame(seeded(3))
  g.combo = 4
  g.words.push({ id: 99, text: '하늘', gold: false, x: 10, y: 10, speed: 0.5 })
  assert.equal(rain.submit(g, '바다').ok, false)
  assert.equal(g.combo, 0)
  assert.ok(g.events.includes('wrong'))
  assert.equal(rain.submit(g, '   ').ok, false)
  assert.equal(g.words.length, 1)
})

test('산성비: 바닥에 닿으면 목숨이 줄고, 0이 되면 게임 오버', () => {
  const g = rain.createGame(seeded(3))
  g.spawnTimer = 1e9
  g.words.push({ id: 1, text: '하늘', gold: false, x: 10, y: rain.GROUND, speed: 0 })
  rain.step(g, 16)
  assert.equal(g.lives, 4)
  assert.ok(g.events.includes('miss'))
  g.lives = 1
  g.words.push({ id: 2, text: '바다', gold: false, x: 10, y: rain.GROUND, speed: 0 })
  rain.step(g, 16)
  assert.equal(g.phase, 'over')
  assert.ok(g.events.includes('gameover'))
})

test('산성비: 황금 단어를 입력하면 화면의 모든 단어가 사라진다', () => {
  const g = rain.createGame(seeded(3))
  g.words.push(
    { id: 1, text: '하늘', gold: true, x: 10, y: 100, speed: 0 },
    { id: 2, text: '바다', gold: false, x: 100, y: 50, speed: 0 },
    { id: 3, text: '나무', gold: false, x: 200, y: 80, speed: 0 },
  )
  const res = rain.submit(g, '하늘')
  assert.equal(res.gold, true)
  assert.equal(g.words.length, 0)
  assert.equal(g.killed, 3)
  assert.ok(g.events.includes('bomb'))
})

test('산성비: 같은 단어가 둘이면 더 아래 것부터 지운다', () => {
  const g = rain.createGame(seeded(3))
  g.words.push({ id: 1, text: '하늘', gold: false, x: 10, y: 20, speed: 0 }, { id: 2, text: '하늘', gold: false, x: 200, y: 300, speed: 0 })
  rain.submit(g, '하늘')
  assert.deepEqual(g.words.map((w) => w.id), [1])
})

test('산성비: 8개 처치마다 레벨이 오르고 더 빨라지며, 오래 돌려도 오류가 없다', () => {
  const g = rain.createGame(seeded(5))
  for (let i = 0; i < 8; i++) g.words.push({ id: 100 + i, text: `단어${i}`, gold: false, x: 10, y: 10, speed: 0 })
  g.spawnTimer = 1e9
  for (let i = 0; i < 8; i++) rain.submit(g, `단어${i}`)
  assert.equal(g.level, 2)
  assert.ok(rain.levelParams(10).speed > rain.levelParams(1).speed && rain.levelParams(10).spawnMs < rain.levelParams(1).spawnMs)

  const g2 = rain.createGame(seeded(9))
  for (let i = 0; i < 60 * 40; i++) rain.step(g2, 16.7)
  assert.ok(g2.phase === 'over' || g2.words.length > 0)
  assert.ok(g2.words.every((w) => w.x >= 0 && w.x + rain.wordWidth(w.text) <= rain.W))
})

// ---------------- 벽돌깨기 ----------------

const IDLE = { left: false, right: false, fire: false, targetX: null }
const free = (g) => {
  g.ball.stuck = false
}

test('벽돌깨기: 공이 벽(좌/우/위)에서 튕긴다', () => {
  const g = brk.createGame(seeded())
  g.bricks = [{ x: 0, y: 300, w: 10, h: 10, row: 0, hp: 1, points: 10 }] // 비어 있지 않게 (레벨 클리어 방지)
  free(g)
  Object.assign(g.ball, { x: 10, y: 200, vx: -6, vy: 0.01 })
  brk.step(g, IDLE, 16.7 * 3)
  assert.ok(g.ball.vx > 0)
  Object.assign(g.ball, { x: 470, y: 200, vx: 6, vy: 0.01 })
  brk.step(g, IDLE, 16.7 * 3)
  assert.ok(g.ball.vx < 0)
  Object.assign(g.ball, { x: 240, y: 8, vx: 0.01, vy: -6 })
  brk.step(g, IDLE, 16.7 * 2)
  assert.ok(g.ball.vy > 0)
})

test('벽돌깨기: 패들 가운데는 수직, 가장자리는 비스듬히 튕긴다', () => {
  const g = brk.createGame(seeded())
  g.bricks = [{ x: 0, y: 100, w: 10, h: 10, row: 0, hp: 1, points: 10 }]
  free(g)
  const p = g.paddle
  Object.assign(g.ball, { x: p.x + p.w / 2, y: p.y - 8, vx: 0, vy: 5 })
  brk.step(g, IDLE, 16.7)
  assert.ok(Math.abs(g.ball.vx) < 0.01 && g.ball.vy < 0)
  Object.assign(g.ball, { x: p.x + p.w - 2, y: p.y - 8, vx: 0, vy: 5 })
  brk.step(g, IDLE, 16.7)
  assert.ok(g.ball.vx > 2 && g.ball.vy < 0)
})

test('벽돌깨기: 벽돌을 맞히면 점수가 오르고 벽돌이 사라지며 공이 반사된다', () => {
  const g = brk.createGame(seeded())
  const target = g.bricks[g.bricks.length - 1] // 맨 아랫줄
  const before = g.bricks.length
  free(g)
  Object.assign(g.ball, { x: target.x + target.w / 2, y: target.y + target.h + 10, vx: 0, vy: -5 })
  g.speed = 5
  for (let i = 0; i < 6; i++) brk.step(g, IDLE, 16.7)
  assert.equal(g.bricks.length, before - 1)
  assert.equal(g.score, target.points)
  assert.ok(g.ball.vy > 0)
})

test('벽돌깨기: 아주 빠른 공도 벽돌을 뚫고 지나가지 않는다', () => {
  const g = brk.createGame(seeded())
  g.bricks = [{ x: 200, y: 250, w: 44, h: 4, row: 0, hp: 1, points: 10 }, { x: 0, y: 40, w: 10, h: 10, row: 0, hp: 1, points: 10 }]
  free(g)
  g.speed = 14
  Object.assign(g.ball, { x: 222, y: 300, vx: 0, vy: -14 })
  for (let i = 0; i < 4; i++) brk.step(g, IDLE, 16.7)
  assert.ok(!g.bricks.some((b) => b.y === 250), '얇은 벽돌이 깨져야 함')
  assert.ok(g.ball.y > 240, '공이 벽돌 위로 넘어가면 안 됨')
})

test('벽돌깨기: 단단한 벽돌은 두 번 맞아야 깨진다', () => {
  const g = brk.createGame(seeded())
  const brick = { x: 200, y: 250, w: 44, h: 18, row: 0, hp: 2, points: 40 }
  g.bricks = [brick, { x: 0, y: 40, w: 10, h: 10, row: 0, hp: 1, points: 10 }]
  free(g)
  g.speed = 5
  Object.assign(g.ball, { x: 222, y: 285, vx: 0, vy: -5 })
  for (let i = 0; i < 4; i++) brk.step(g, IDLE, 16.7)
  assert.equal(brick.hp, 1)
  assert.ok(g.bricks.includes(brick))
  Object.assign(g.ball, { x: 222, y: 285, vx: 0, vy: -5 })
  for (let i = 0; i < 4; i++) brk.step(g, IDLE, 16.7)
  assert.ok(!g.bricks.includes(brick))
})

test('벽돌깨기: 공을 놓치면 목숨이 줄고 공이 패들에 붙으며, 0이면 게임 오버', () => {
  const g = brk.createGame(seeded())
  free(g)
  Object.assign(g.ball, { x: 5, y: brk.H + 5, vx: 0, vy: 5 })
  brk.step(g, IDLE, 16.7)
  assert.equal(g.lives, 2)
  assert.equal(g.ball.stuck, true)
  g.lives = 1
  free(g)
  Object.assign(g.ball, { x: 5, y: brk.H + 5, vx: 0, vy: 5 })
  brk.step(g, IDLE, 16.7)
  assert.equal(g.phase, 'over')
})

test('벽돌깨기: 붙어 있던 공은 발사 입력으로 올라가고, 패들은 화면 안에서만 움직인다', () => {
  const g = brk.createGame(seeded())
  brk.step(g, { ...IDLE, fire: true }, 16.7)
  assert.equal(g.ball.stuck, false)
  assert.ok(g.ball.vy < 0)
  for (let i = 0; i < 200; i++) brk.step(g, { ...IDLE, left: true }, 16.7)
  assert.equal(g.paddle.x, 0)
  brk.step(g, { ...IDLE, targetX: 9999 }, 16.7)
  assert.equal(g.paddle.x, brk.W - g.paddle.w)
})

test('벽돌깨기: 모두 깨면 다음 레벨(더 많은 줄 · 더 빠른 공)이 시작된다', () => {
  const g = brk.createGame(seeded())
  g.bricks = [{ x: 200, y: 250, w: 44, h: 18, row: 0, hp: 1, points: 10 }]
  free(g)
  g.speed = 5
  Object.assign(g.ball, { x: 222, y: 285, vx: 0, vy: -5 })
  for (let i = 0; i < 6; i++) brk.step(g, IDLE, 16.7)
  assert.equal(g.level, 2)
  assert.ok(g.bricks.length > 40 && g.ball.stuck)
  assert.ok(brk.levelParams(5).speed > brk.levelParams(1).speed && brk.levelParams(5).toughRows > 0)
})

test('벽돌깨기: 아이템을 받으면 패들이 넓어졌다가 시간이 지나면 돌아온다', () => {
  const g = brk.createGame(seeded())
  g.bricks = [{ x: 0, y: 100, w: 10, h: 10, row: 0, hp: 1, points: 10 }]
  const base = g.paddle.w
  g.items.push({ x: g.paddle.x + 10, y: g.paddle.y - 4, type: 'wide' })
  brk.step(g, IDLE, 16.7)
  assert.ok(g.paddle.w > base && g.events.includes('item'))
  for (let i = 0; i < 700; i++) brk.step(g, IDLE, 16.7)
  assert.equal(g.paddle.w, base)
})

test('벽돌깨기: 가만히 두고 오래 돌려도 오류 없이 끝난다', () => {
  const g = brk.createGame(seeded(4))
  brk.step(g, { ...IDLE, fire: true }, 16.7)
  for (let i = 0; i < 60 * 60; i++) brk.step(g, IDLE, 16.7)
  assert.ok(g.phase === 'over' || g.lives >= 1)
  assert.ok(Number.isFinite(g.ball.x) && Number.isFinite(g.ball.y))
})

// ---------------- 지뢰찾기 ----------------

const openCount = (g) => g.cells.filter((c) => c.state === 'open').length
const mineCount = (g) => g.cells.filter((c) => c.mine).length

test('지뢰찾기: 첫 클릭과 주변에는 지뢰가 없고, 지뢰 수가 정확하다', () => {
  for (const key of Object.keys(ms.LEVELS)) {
    for (let seed = 1; seed <= 20; seed++) {
      const g = ms.createGame(key)
      const r = (seed * 3) % g.rows
      const c = (seed * 7) % g.cols
      const res = ms.reveal(g, r, c, seeded(seed))
      assert.notEqual(res, 'boom')
      assert.equal(mineCount(g), g.mines)
      assert.ok(!g.cells[r * g.cols + c].mine)
      ms.neighbors(g, r, c).forEach(([nr, nc]) => assert.ok(!g.cells[nr * g.cols + nc].mine))
    }
  }
})

test('지뢰찾기: 숫자(주변 지뢰 수)가 정확하다', () => {
  const g = ms.createGame('normal')
  ms.reveal(g, 8, 8, seeded(5))
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const expected = ms.neighbors(g, r, c).filter(([nr, nc]) => g.cells[nr * g.cols + nc].mine).length
      assert.equal(g.cells[r * g.cols + c].adj, expected)
    }
  }
})

test('지뢰찾기: 0인 칸을 열면 연쇄로 열리고, 숫자 칸은 하나만 열린다', () => {
  const g = ms.createGame('easy')
  ms.reveal(g, 4, 4, seeded(2))
  assert.ok(openCount(g) > 9, '첫 클릭 주변은 0 이라 연쇄로 열려야 함')
  assert.equal(g.opened, openCount(g))

  const g2 = ms.createGame('easy')
  g2.phase = 'playing'
  g2.cells.forEach((c) => (c.adj = 0))
  g2.cells[0].mine = true
  g2.cells[1].adj = 1
  g2.cells[9].adj = 1
  g2.cells[10].adj = 1
  g2.mines = 1
  ms.reveal(g2, 0, 1)
  assert.equal(openCount(g2), 1)
})

test('지뢰찾기: 깃발 표시/해제와 지뢰 남은 수, 깃발 칸은 열리지 않는다', () => {
  const g = ms.createGame('easy')
  assert.equal(ms.toggleFlag(g, 0, 0), true)
  assert.equal(ms.minesLeft(g), 9)
  assert.equal(ms.reveal(g, 0, 0, seeded()), 'ignored')
  assert.equal(g.cells[0].state, 'flag')
  ms.toggleFlag(g, 0, 0)
  assert.equal(ms.minesLeft(g), 10)
})

test('지뢰찾기: 지뢰를 열면 패배하고 모든 지뢰가 드러난다', () => {
  const g = ms.createGame('easy')
  ms.reveal(g, 4, 4, seeded(2))
  const mine = g.cells.findIndex((c) => c.mine)
  const res = ms.reveal(g, Math.floor(mine / g.cols), mine % g.cols)
  assert.equal(res, 'boom')
  assert.equal(g.phase, 'lost')
  assert.ok(g.cells[mine].exploded)
  assert.ok(g.cells.filter((c) => c.mine).every((c) => c.state === 'open' || c.state === 'flag'))
  assert.equal(ms.reveal(g, 0, 0), 'ignored')
})

test('지뢰찾기: 지뢰 아닌 칸을 모두 열면 승리하고 지뢰에 깃발이 꽂힌다', () => {
  const g = ms.createGame('normal')
  ms.reveal(g, 8, 8, seeded(11))
  let last
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      if (!g.cells[r * g.cols + c].mine) last = ms.reveal(g, r, c) === 'won' ? 'won' : last
    }
  }
  assert.equal(g.phase, 'won')
  assert.equal(last, 'won')
  assert.equal(ms.minesLeft(g), 0)
})

test('지뢰찾기: 숫자 칸 주변 깃발이 숫자와 같을 때만 chord 로 주변을 연다', () => {
  const g = ms.createGame('easy')
  ms.reveal(g, 4, 4, seeded(21))
  // 숫자가 있는 열린 칸 중 주변에 '지뢰가 아닌 숨은 칸'이 있는 것을 찾는다
  let target
  for (let r = 0; r < g.rows && !target; r++) {
    for (let c = 0; c < g.cols; c++) {
      const cell = g.cells[r * g.cols + c]
      if (cell.state === 'open' && cell.adj > 0 && ms.neighbors(g, r, c).some(([nr, nc]) => { const n = g.cells[nr * g.cols + nc]; return n.state === 'hidden' && !n.mine })) {
        target = [r, c]
        break
      }
    }
  }
  assert.ok(target)
  const [tr, tc] = target
  assert.equal(ms.chord(g, tr, tc), 'ignored') // 깃발이 부족
  ms.neighbors(g, tr, tc).forEach(([nr, nc]) => {
    if (g.cells[nr * g.cols + nc].mine) ms.toggleFlag(g, nr, nc)
  })
  const res = ms.chord(g, tr, tc)
  assert.ok(res === 'opened' || res === 'won')
  assert.notEqual(g.phase, 'lost')
})

test('지뢰찾기: cloneGame 은 원본을 바꾸지 않는다', () => {
  const g = ms.createGame('easy')
  const copy = ms.cloneGame(g)
  ms.reveal(copy, 4, 4, seeded(3))
  assert.equal(g.phase, 'ready')
  assert.equal(openCount(g), 0)
})

console.log(`\n${count}개 테스트 통과`)
