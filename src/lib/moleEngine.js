// 두더지잡기 로직. DOM/React 없음.
// 30초 동안 구멍에서 튀어나오는 두더지를 잡는다. 금빛 두더지는 보너스, 레서판다(마스코트)는 잡으면 감점!

export const HOLES = 9
export const DURATION = 30000

const HIT_ANIM_MS = 220
const PANDA_RATE = 0.25 // 레서판다(잡으면 감점)가 나올 확률
const GOLD_RATE = 0.08 // 금빛 두더지(보너스)가 나올 확률

// 시간이 갈수록 오래 안 머물고, 더 자주, 더 많이 나온다.
export function params(elapsed) {
  return {
    upTime: Math.max(520, 1150 - elapsed * 0.018),
    spawnEvery: Math.max(380, 850 - elapsed * 0.016),
    maxUp: 1 + (elapsed > 10000 ? 1 : 0) + (elapsed > 20000 ? 1 : 0),
  }
}

export function createGame(rng = Math.random) {
  return {
    rng,
    phase: 'playing', // 'playing' | 'over'
    timeLeft: DURATION,
    elapsed: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    whiffs: 0, // 빈 구멍을 눌렀다
    escapes: 0, // 놓친 두더지
    oops: 0, // 판다를 잡았다
    holes: new Array(HOLES).fill(null), // { kind: 'mole'|'gold'|'panda', ttl, hit, hitTimer }
    spawnTimer: 500,
    events: [],
  }
}

const multiplier = (combo) => 1 + Math.min(Math.floor(combo / 5), 4) * 0.25

function spawn(s) {
  const p = params(s.elapsed)
  const upCount = s.holes.filter((h) => h && !h.hit).length
  if (upCount >= p.maxUp) return

  const empty = s.holes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0)
  if (!empty.length) return

  const index = empty[Math.floor(s.rng() * empty.length)]
  const roll = s.rng()
  const kind = roll < PANDA_RATE ? 'panda' : roll < PANDA_RATE + GOLD_RATE ? 'gold' : 'mole'
  const base = p.upTime * (0.85 + s.rng() * 0.3)
  s.holes[index] = { kind, ttl: kind === 'gold' ? base * 0.8 : base, hit: false, hitTimer: 0 }
}

export function step(s, dtMs) {
  s.events.length = 0
  if (s.phase !== 'playing') return

  const dt = Math.min(dtMs, 100)
  s.elapsed += dt
  s.timeLeft = Math.max(0, s.timeLeft - dt)

  s.holes.forEach((h, i) => {
    if (!h) return
    if (h.hit) {
      h.hitTimer -= dt
      if (h.hitTimer <= 0) s.holes[i] = null
      return
    }
    h.ttl -= dt
    if (h.ttl <= 0) {
      if (h.kind !== 'panda') {
        s.escapes += 1
        s.combo = 0
        s.events.push('escape')
      }
      s.holes[i] = null
    }
  })

  s.spawnTimer -= dt
  if (s.spawnTimer <= 0 && s.timeLeft > 0) {
    spawn(s)
    s.spawnTimer = params(s.elapsed).spawnEvery * (0.7 + s.rng() * 0.6)
  }

  if (s.timeLeft === 0) {
    s.phase = 'over'
    s.events.push('gameover')
  }
}

// 구멍 index 를 내리친다. 결과: 'mole' | 'gold' | 'panda' | 'whiff' | null(무시)
export function whack(s, index) {
  if (s.phase !== 'playing' || index < 0 || index >= HOLES) return null
  s.events.length = 0
  const h = s.holes[index]

  if (!h || h.hit) {
    s.combo = 0
    s.whiffs += 1
    s.events.push('whiff')
    return 'whiff'
  }

  h.hit = true
  h.hitTimer = HIT_ANIM_MS

  if (h.kind === 'panda') {
    s.score = Math.max(0, s.score - 20)
    s.combo = 0
    s.oops += 1
    s.events.push('oops')
    return 'panda'
  }

  const points = Math.round((h.kind === 'gold' ? 30 : 10) * multiplier(s.combo))
  s.score += points
  s.combo += 1
  s.maxCombo = Math.max(s.maxCombo, s.combo)
  s.hits += 1
  s.events.push(h.kind === 'gold' ? 'gold' : 'hit')
  return h.kind
}
