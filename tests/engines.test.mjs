// 실행: node tests/engines.test.mjs
// 슈팅/리듬 게임 로직을 화면 없이 시뮬레이션해서 검증한다.
import assert from 'node:assert/strict'
import { ENEMY, H, W, createGame, step, waveParams } from '../src/lib/shooterEngine.js'
import {
  LAYOUTS,
  STAGES,
  WINDOWS,
  buildChart,
  createRun,
  getResult,
  press,
  scheduleMusic,
  update,
} from '../src/lib/rhythmEngine.js'

let count = 0
const test = (name, fn) => {
  fn()
  count++
  console.log('ok -', name)
}

// 같은 결과를 내는 난수 (테스트 재현용)
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}
const IDLE = { left: false, right: false, fire: false }
const run = (g, input, frames) => {
  for (let i = 0; i < frames; i++) step(g, input, 1000 / 60)
}

// ---------------- 슈팅 ----------------

test('슈팅: 웨이브가 올라갈수록 어려워진다', () => {
  const a = waveParams(1)
  const b = waveParams(8)
  assert.ok(b.rows >= a.rows && b.speed > a.speed && b.bulletSpeed > a.bulletSpeed && b.fireInterval < a.fireInterval)
  assert.ok(waveParams(99).rows <= 5 && waveParams(99).speed <= 2.6)
})

test('슈팅: 플레이어 탄이 적을 맞히면 점수가 오르고 적이 사라진다', () => {
  const g = createGame(seeded())
  const target = g.enemies[0]
  g.bullets.push({ x: target.x + 10, y: target.y + 4, w: 4, h: 12 })
  const before = g.enemies.length
  step(g, IDLE, 16)
  assert.equal(g.enemies.length, before - 1)
  assert.equal(g.score, target.points)
  assert.ok(g.events.includes('kill'))
})

test('슈팅: 적 탄에 맞으면 목숨이 줄고 잠깐 무적이 된다', () => {
  const g = createGame(seeded())
  const p = g.player
  g.enemyBullets.push({ x: p.x + 5, y: p.y, w: 4, h: 10, vy: 0 })
  step(g, IDLE, 16)
  assert.equal(g.lives, 2)
  assert.ok(p.invuln > 0 && g.events.includes('hit'))
  // 무적 중에는 또 맞아도 줄지 않는다
  g.enemyBullets.push({ x: p.x + 5, y: p.y, w: 4, h: 10, vy: 0 })
  step(g, IDLE, 16)
  assert.equal(g.lives, 2)
})

test('슈팅: 목숨이 0이 되면 게임 오버, 이후엔 더 진행되지 않는다', () => {
  const g = createGame(seeded())
  g.lives = 1
  g.enemyBullets.push({ x: g.player.x + 5, y: g.player.y, w: 4, h: 10, vy: 0 })
  step(g, IDLE, 16)
  assert.equal(g.phase, 'over')
  assert.ok(g.events.includes('gameover'))
  const t = g.time
  step(g, IDLE, 16)
  assert.equal(g.time, t)
})

test('슈팅: 편대가 벽에 닿으면 방향을 바꾸고 아래로 내려온다 (화면 밖으로 나가지 않음)', () => {
  const g = createGame(seeded())
  g.player.invuln = 1e9 // 이 테스트는 이동만 확인
  g.enemyFireTimer = 1e9
  const startY = Math.min(...g.enemies.map((e) => e.y))
  run(g, IDLE, 60 * 12)
  assert.ok(Math.min(...g.enemies.map((e) => e.y)) > startY)
  assert.ok(g.enemies.every((e) => e.x > -ENEMY.w && e.x < W))
})

test('슈팅: 적이 아래까지 내려오면 목숨이 줄고 편대가 처음 위치로 돌아간다', () => {
  const g = createGame(seeded())
  g.enemyFireTimer = 1e9
  g.enemies.forEach((e) => (e.y = g.player.y - e.h + 1))
  step(g, IDLE, 16)
  assert.equal(g.lives, 2)
  assert.ok(g.enemies.every((e) => e.y < 200))
})

test('슈팅: 전멸시키면 클리어 보너스 후 다음 웨이브가 시작된다', () => {
  const g = createGame(seeded())
  g.enemies = [g.enemies[0]]
  g.waveTotal = 1
  const e = g.enemies[0]
  g.bullets.push({ x: e.x + 10, y: e.y + 4, w: 4, h: 12 })
  g.enemyBullets.push({ x: 5, y: 300, w: 4, h: 10, vy: 2 })
  step(g, IDLE, 16)
  assert.equal(g.enemies.length, 0)
  assert.ok(g.events.includes('wave'))
  assert.equal(g.score, e.points + 100)
  assert.equal(g.enemyBullets.length, 0)
  run(g, IDLE, 120) // 대기 시간(1.4초) 경과
  assert.equal(g.wave, 2)
  assert.ok(g.enemies.length > 0)
})

test('슈팅: 발사는 쿨다운이 있고, 좌우 이동은 화면 안으로 제한된다', () => {
  const g = createGame(seeded())
  g.enemyFireTimer = 1e9
  run(g, { left: false, right: false, fire: true }, 30) // 0.5초
  assert.ok(g.bullets.length + (g.score > 0 ? 1 : 0) >= 1 && g.bullets.length <= 3)
  run(g, { left: true, right: false, fire: false }, 300)
  assert.equal(g.player.x, 0)
  run(g, { left: false, right: true, fire: false }, 300)
  assert.equal(g.player.x, W - g.player.w)
})

test('슈팅: 가만히 있어도(시뮬레이션) 적이 쏘는 탄이 생기고 오류 없이 오래 돈다', () => {
  const g = createGame(seeded(7))
  run(g, IDLE, 60 * 30)
  assert.ok(g.phase === 'over' || g.time > 29000)
  assert.ok(g.enemyBullets.every((b) => b.y < H + 20))
})

// ---------------- 리듬 ----------------

test('리듬: 같은 난이도는 항상 같은 채보가 나오고, 시간순 · 레인 범위가 올바르다', () => {
  for (const { id: d } of STAGES) {
    const a = buildChart(d)
    const b = buildChart(d)
    assert.deepEqual(a.notes, b.notes)
    assert.ok(a.notes.length > 40, `${d}: 노트가 너무 적음`)
    assert.ok(a.duration > 40 && a.duration < 90, `${d}: 곡 길이 ${a.duration}`)
    for (let i = 1; i < a.notes.length; i++) assert.ok(a.notes[i].time >= a.notes[i - 1].time)
    assert.ok(a.notes.every((n) => n.lane >= 0 && n.lane < a.lanes))
    // 같은 레인에 같은 시간 노트가 겹치지 않는다
    const keys = new Set(a.notes.map((n) => `${n.lane}@${n.time.toFixed(4)}`))
    assert.equal(keys.size, a.notes.length)
  }
})

test('리듬: 단계가 오를수록 노트가 많고, 1~3단계는 4레인 · 4~6단계는 6레인이다', () => {
  const n = (d) => buildChart(d).notes.length
  assert.ok(n('s1') < n('s2') && n('s2') < n('s3'))
  assert.ok(n('s4') < n('s5') && n('s5') < n('s6'))
  STAGES.forEach((st) => {
    const c = buildChart(st.id)
    assert.equal(c.lanes, st.stage <= 3 ? 4 : 6)
    assert.deepEqual(c.keys, LAYOUTS[c.lanes].keys)
    assert.equal(c.labels.length, c.lanes)
  })
  // 6레인 노트가 모든 레인에 골고루 나온다
  const used = new Set(buildChart('s5').notes.map((x) => x.lane))
  assert.equal(used.size, 6)
})

test('리듬: 4레인 키는 6레인 키의 S D … K L 이다 (손 위치가 이어진다)', () => {
  const four = LAYOUTS[4].labels.join('')
  const six = LAYOUTS[6].labels.join('')
  assert.equal(four, 'SDKL')
  assert.equal(six, 'SDFJKL')
  assert.ok(six.startsWith('SD') && six.endsWith('KL'))
})

test('리듬: 단계마다 곡이 다르게 들린다 (조·코드 진행·BPM 중 하나 이상이 다름)', () => {
  const sig = (id) => { const c = buildChart(id); return `${c.bpm}|${c.key}|${c.prog.join(',')}` }
  assert.equal(new Set(STAGES.map((s) => sig(s.id))).size, STAGES.length)
})

test('리듬: 판정 구간(PERFECT/GOOD/범위 밖)과 콤보', () => {
  const chart = buildChart('s1')
  const r = createRun(chart)
  const n = r.notes[0]
  assert.equal(press(r, n.lane, n.time + WINDOWS.good + 0.05), null)
  assert.equal(press(r, (n.lane + 1) % chart.lanes, n.time), null) // 다른 레인
  assert.equal(press(r, n.lane, n.time + 0.02).judge, 'perfect')
  const n2 = r.notes.find((x) => x.status === 'idle')
  assert.equal(press(r, n2.lane, n2.time - 0.09).judge, 'good')
  assert.equal(r.combo, 2)
  assert.ok(r.score > 0)
})

test('리듬: 놓친 노트는 MISS 가 되고 콤보가 끊긴다 (한 번만 처리)', () => {
  const r = createRun(buildChart('s1'))
  const n = r.notes[0]
  press(r, n.lane, n.time)
  assert.equal(r.combo, 1)
  const second = r.notes[1]
  const missed = update(r, second.time + WINDOWS.good + 0.01)
  assert.ok(missed.some((m) => m.id === second.id))
  assert.equal(r.combo, 0)
  assert.equal(update(r, second.time + WINDOWS.good + 0.02).length, 0)
  assert.equal(r.miss, 1)
})

test('리듬: 이미 친 노트는 다시 판정되지 않는다', () => {
  const r = createRun(buildChart('s2'))
  const n = r.notes[0]
  assert.ok(press(r, n.lane, n.time))
  assert.equal(press(r, n.lane, n.time), null)
})

test('리듬: 전부 PERFECT 면 S, 전부 놓치면 D, 콤보 배율은 최대 2배', () => {
  const chart = buildChart('s3')
  const perfect = createRun(chart)
  perfect.notes.forEach((n) => press(perfect, n.lane, n.time))
  const res = getResult(perfect)
  assert.equal(res.grade, 'S')
  assert.equal(res.maxCombo, perfect.notes.length)
  assert.equal(res.miss, 0)
  assert.ok(res.score <= perfect.notes.length * 200 && res.score > perfect.notes.length * 100)

  const none = createRun(chart)
  update(none, chart.duration)
  assert.equal(getResult(none).grade, 'D')
  assert.equal(none.miss, none.notes.length)
})

test('리듬: 음악 예약이 오류 없이 이뤄진다 (가짜 AudioContext)', () => {
  let nodes = 0
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 })
  const node = () => {
    nodes++
    return { connect() {}, start() {}, stop() {}, frequency: param(), gain: param(), type: '', buffer: null }
  }
  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    createOscillator: node,
    createGain: node,
    createBufferSource: node,
    createBiquadFilter: node,
    createBuffer: () => ({ getChannelData: () => new Float32Array(44100) }),
  }
  const chart = buildChart('s2')
  scheduleMusic({ ctx, master: node(), noiseBuf: null }, 2, chart)
  assert.ok(nodes > chart.notes.length)
})

console.log(`\n${count}개 테스트 통과`)
