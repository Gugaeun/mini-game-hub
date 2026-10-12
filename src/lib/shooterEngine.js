// 슈팅 게임 로직 (DOM/React 없음). 화면 코드(pages/ShootingGame.jsx)는 상태를 그리기만 한다.
// step() 이 한 프레임을 진행하고, 소리/효과가 필요한 사건은 state.events 에 담긴다.

export const W = 480
export const H = 600

const FRAME_MS = 1000 / 60
const PLAYER_SPEED = 5
const PLAYER_BULLET_SPEED = 8
const SHOT_COOLDOWN_MS = 260
const INVULN_MS = 1600
const WAVE_DELAY_MS = 1400
const MAX_PARTICLES = 220

export const ENEMY = { w: 33, h: 24, cols: 7, gapX: 52, gapY: 38, topY: 56 }
const ROW_POINTS = [30, 20, 20, 10, 10]

const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// 웨이브가 올라갈수록 줄 수 · 속도 · 적 탄 속도가 늘고 발사 간격이 짧아진다.
export function waveParams(wave) {
  return {
    rows: Math.min(3 + Math.floor((wave - 1) / 2), 5),
    speed: Math.min(0.6 + 0.15 * wave, 2.6),
    fireInterval: Math.max(450, 1600 - wave * 120),
    bulletSpeed: Math.min(2.6 + 0.2 * wave, 5.5),
  }
}

export function createGame(rng = Math.random) {
  const s = {
    rng,
    phase: 'playing', // 'playing' | 'over'
    time: 0,
    score: 0,
    lives: 3,
    wave: 0,
    player: { x: W / 2 - 15, y: H - 46, w: 30, h: 18, invuln: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    waveTotal: 0,
    dir: 1,
    particles: [],
    lastShot: -1e9,
    enemyFireTimer: 1200,
    waveDelay: 0,
    banner: { text: '', t: 0 },
    events: [],
  }
  startWave(s)
  return s
}

function spawnEnemies(s) {
  const { rows } = waveParams(s.wave)
  const startX = (W - ((ENEMY.cols - 1) * ENEMY.gapX + ENEMY.w)) / 2
  s.enemies = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < ENEMY.cols; c++) {
      s.enemies.push({
        x: startX + c * ENEMY.gapX,
        y: ENEMY.topY + r * ENEMY.gapY,
        w: ENEMY.w,
        h: ENEMY.h,
        row: r,
        col: c,
        points: ROW_POINTS[r] ?? 10,
      })
    }
  }
  s.waveTotal = s.enemies.length
  s.dir = 1
  s.enemyBullets = []
}

function startWave(s) {
  s.wave += 1
  spawnEnemies(s)
  s.enemyFireTimer = 1200
  s.banner = { text: `WAVE ${s.wave}`, t: 1400 }
}

function burst(s, x, y, color, n) {
  for (let i = 0; i < n && s.particles.length < MAX_PARTICLES; i++) {
    const angle = s.rng() * Math.PI * 2
    const speed = 0.8 + s.rng() * 2.4
    s.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 380 + s.rng() * 280,
      max: 660,
      color,
    })
  }
}

function loseLife(s, resetFormation) {
  const p = s.player
  s.lives -= 1
  s.events.push('hit')
  burst(s, p.x + p.w / 2, p.y + p.h / 2, '#4cd7e0', 22)
  p.invuln = INVULN_MS
  s.enemyBullets = []
  if (resetFormation) spawnEnemies(s)
  if (s.lives <= 0) {
    s.lives = 0
    s.phase = 'over'
    s.events.push('gameover')
  }
}

// input: { left, right, fire } / dtMs: 이전 프레임과의 시간 차(ms)
export function step(s, input, dtMs) {
  s.events.length = 0
  if (s.phase !== 'playing') return

  const dt = Math.min(dtMs, 50)
  const f = dt / FRAME_MS
  s.time += dt
  const p = s.player

  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt)
  if (s.banner.t > 0) s.banner.t = Math.max(0, s.banner.t - dt)

  // 플레이어 이동 / 발사
  if (input.left) p.x -= PLAYER_SPEED * f
  if (input.right) p.x += PLAYER_SPEED * f
  p.x = Math.max(0, Math.min(W - p.w, p.x))

  if (input.fire && s.time - s.lastShot >= SHOT_COOLDOWN_MS) {
    s.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 8, w: 4, h: 12 })
    s.lastShot = s.time
    s.events.push('shoot')
  }

  s.bullets.forEach((b) => (b.y -= PLAYER_BULLET_SPEED * f))
  s.bullets = s.bullets.filter((b) => b.y > -20)

  // 파티클
  s.particles.forEach((q) => {
    q.x += q.vx * f
    q.y += q.vy * f
    q.life -= dt
  })
  s.particles = s.particles.filter((q) => q.life > 0)

  // 웨이브 사이 대기
  if (s.enemies.length === 0) {
    s.waveDelay -= dt
    if (s.waveDelay <= 0) startWave(s)
  } else {
    const params = waveParams(s.wave)

    // 적 편대 이동: 남은 적이 적을수록 빨라지고, 벽에 닿으면 방향을 바꾸며 내려온다.
    const speed = params.speed * (1 + (1 - s.enemies.length / s.waveTotal) * 1.2)
    s.enemies.forEach((e) => (e.x += s.dir * speed * f))
    if (s.enemies.some((e) => e.x <= 8 || e.x + e.w >= W - 8)) {
      s.dir *= -1
      s.enemies.forEach((e) => {
        e.y += 14
        e.x += s.dir * speed * f * 2
      })
    }

    // 적 발사: 각 열의 맨 아래 적 중 하나가 쏜다.
    s.enemyFireTimer -= dt
    if (s.enemyFireTimer <= 0) {
      const bottoms = new Map()
      s.enemies.forEach((e) => {
        const cur = bottoms.get(e.col)
        if (!cur || e.y > cur.y) bottoms.set(e.col, e)
      })
      const shooters = [...bottoms.values()]
      const shooter = shooters[Math.floor(s.rng() * shooters.length)]
      s.enemyBullets.push({ x: shooter.x + shooter.w / 2 - 2, y: shooter.y + shooter.h, w: 4, h: 10, vy: params.bulletSpeed })
      s.enemyFireTimer = params.fireInterval * (0.6 + s.rng() * 0.8)
    }
  }

  s.enemyBullets.forEach((b) => (b.y += b.vy * f))
  s.enemyBullets = s.enemyBullets.filter((b) => b.y < H + 20)

  // 내 탄 ↔ 적
  for (const b of s.bullets) {
    const target = s.enemies.find((e) => hit(b, e))
    if (!target) continue
    s.enemies = s.enemies.filter((e) => e !== target)
    b.y = -999
    s.score += target.points
    s.events.push('kill')
    burst(s, target.x + target.w / 2, target.y + target.h / 2, ['#ff3d94', '#ffb703', '#7cf5a0'][target.row % 3], 12)
  }
  s.bullets = s.bullets.filter((b) => b.y > -900)

  // 적 탄 ↔ 플레이어 / 적이 아래까지 내려옴
  if (p.invuln === 0) {
    const bullet = s.enemyBullets.find((b) => hit(b, p))
    if (bullet) loseLife(s, false)
    else if (s.enemies.some((e) => e.y + e.h >= p.y)) loseLife(s, true)
  }

  // 웨이브 클리어
  if (s.phase === 'playing' && s.enemies.length === 0 && s.waveDelay <= 0) {
    s.waveDelay = WAVE_DELAY_MS
    s.enemyBullets = [] // 클리어 직후 남은 적 탄에 억울하게 맞지 않도록
    s.score += s.wave * 100
    s.events.push('wave')
    s.banner = { text: 'WAVE CLEAR!', t: WAVE_DELAY_MS }
  }
}
