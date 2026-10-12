// 벽돌깨기 로직. DOM/React 없음.
// 공은 작은 걸음(서브스텝)으로 나눠 움직여서 빠르게 움직여도 벽돌/패들을 뚫고 지나가지 않는다.

export const W = 480
export const H = 560

const FRAME_MS = 1000 / 60
const PADDLE = { w: 84, wide: 124, h: 12, y: H - 36, speed: 7 }
const BALL_R = 6
const COLS = 10
const BRICK = { w: 44, h: 18, gap: 3, top: 64 }
const WIDE_MS = 10000
const MAX_STEP = 3 // 서브스텝 최대 이동(px)
const ROW_COLORS = ['#ff3d94', '#ff7a45', '#ffb703', '#7cf5a0', '#4cd7e0', '#8c7cff', '#c77dff', '#ff9ecb']

export const brickColor = (row) => ROW_COLORS[row % ROW_COLORS.length]

export function levelParams(level) {
  return {
    rows: Math.min(4 + level, 8),
    speed: Math.min(5.9 + 0.45 * level, 10),
    toughRows: Math.min(Math.max(level - 2, 0), 3), // 3레벨부터 윗줄이 두 번 맞아야 깨진다
  }
}

function buildBricks(level) {
  const { rows, toughRows } = levelParams(level)
  const x0 = (W - (COLS * BRICK.w + (COLS - 1) * BRICK.gap)) / 2
  const bricks = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const hp = r < toughRows ? 2 : 1
      bricks.push({
        x: x0 + c * (BRICK.w + BRICK.gap),
        y: BRICK.top + r * (BRICK.h + BRICK.gap),
        w: BRICK.w,
        h: BRICK.h,
        row: r,
        hp,
        points: (rows - r) * 10 * hp,
      })
    }
  }
  return bricks
}

export function createGame(rng = Math.random) {
  const s = {
    rng,
    phase: 'playing', // 'playing' | 'over'
    time: 0,
    score: 0,
    lives: 3,
    level: 1,
    paddle: { x: W / 2 - PADDLE.w / 2, y: PADDLE.y, w: PADDLE.w, h: PADDLE.h, wideTimer: 0 },
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: BALL_R, stuck: true },
    speed: 0,
    bricks: [],
    items: [],
    particles: [],
    events: [],
  }
  startLevel(s)
  return s
}

function stickBall(s) {
  const p = s.paddle
  s.ball = { x: p.x + p.w / 2, y: p.y - BALL_R - 1, vx: 0, vy: 0, r: BALL_R, stuck: true }
}

function startLevel(s) {
  s.bricks = buildBricks(s.level)
  s.items = []
  s.speed = levelParams(s.level).speed
  stickBall(s)
}

function launch(s) {
  const angle = (s.rng() - 0.5) * 0.8
  s.ball.vx = Math.sin(angle) * s.speed
  s.ball.vy = -Math.cos(angle) * s.speed
  s.ball.stuck = false
}

function setSpeed(ball, speed) {
  const len = Math.hypot(ball.vx, ball.vy) || 1
  ball.vx = (ball.vx / len) * speed
  ball.vy = (ball.vy / len) * speed
}

function burst(s, x, y, color) {
  for (let i = 0; i < 8 && s.particles.length < 160; i++) {
    const a = s.rng() * Math.PI * 2
    const v = 0.6 + s.rng() * 1.6
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 360, max: 360, color })
  }
}

function loseLife(s) {
  s.lives -= 1
  s.events.push('lose')
  s.paddle.w = PADDLE.w
  s.paddle.wideTimer = 0
  s.items = []
  if (s.lives <= 0) {
    s.lives = 0
    s.phase = 'over'
    s.events.push('gameover')
  } else {
    stickBall(s)
  }
}

// 공과 벽돌 충돌: 부딪힌 방향으로 반사하고, 깨졌는지(true) 돌려준다.
function hitBrick(s, ball, brick) {
  const cx = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w))
  const cy = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h))
  const dx = ball.x - cx
  const dy = ball.y - cy
  if (dx * dx + dy * dy > ball.r * ball.r) return null

  if (dx === 0 && dy !== 0) {
    ball.vy = -ball.vy
    ball.y = dy > 0 ? brick.y + brick.h + ball.r + 0.01 : brick.y - ball.r - 0.01
  } else if (dy === 0 && dx !== 0) {
    ball.vx = -ball.vx
    ball.x = dx > 0 ? brick.x + brick.w + ball.r + 0.01 : brick.x - ball.r - 0.01
  } else if (Math.abs(dx) > Math.abs(dy)) {
    ball.vx = -ball.vx
  } else {
    ball.vy = -ball.vy
  }

  brick.hp -= 1
  return brick.hp <= 0
}

// input: { left, right, fire, targetX(마우스/터치로 정한 패들 중앙 x, 없으면 null) }
export function step(s, input, dtMs) {
  s.events.length = 0
  if (s.phase !== 'playing') return

  const dt = Math.min(dtMs, 50)
  const f = dt / FRAME_MS
  s.time += dt
  const p = s.paddle

  // 패들 이동 / 크기 효과 시간
  if (p.wideTimer > 0) {
    p.wideTimer = Math.max(0, p.wideTimer - dt)
    if (p.wideTimer === 0) {
      const center = p.x + p.w / 2
      p.w = PADDLE.w
      p.x = center - p.w / 2
    }
  }
  if (input.left) p.x -= PADDLE.speed * f
  if (input.right) p.x += PADDLE.speed * f
  if (input.targetX != null) p.x = input.targetX - p.w / 2
  p.x = Math.max(0, Math.min(W - p.w, p.x))

  const ball = s.ball
  if (ball.stuck) {
    ball.x = p.x + p.w / 2
    ball.y = p.y - ball.r - 1
    if (input.fire) {
      launch(s)
      s.events.push('bounce')
    }
  }

  // 파티클 / 아이템
  s.particles.forEach((q) => {
    q.x += q.vx * f
    q.y += q.vy * f
    q.life -= dt
  })
  s.particles = s.particles.filter((q) => q.life > 0)

  s.items.forEach((it) => (it.y += 2.2 * f))
  s.items = s.items.filter((it) => {
    const caught = it.y + 10 >= p.y && it.y <= p.y + p.h && it.x + 10 >= p.x && it.x - 10 <= p.x + p.w
    if (caught) {
      const center = p.x + p.w / 2
      p.w = PADDLE.wide
      p.x = Math.max(0, Math.min(W - p.w, center - p.w / 2))
      p.wideTimer = WIDE_MS
      s.events.push('item')
    }
    return !caught && it.y < H + 20
  })

  if (ball.stuck) return

  // 공 이동 (서브스텝)
  const dist = Math.hypot(ball.vx, ball.vy) * f
  const n = Math.max(1, Math.ceil(dist / MAX_STEP))
  for (let i = 0; i < n && s.phase === 'playing' && !s.ball.stuck; i++) {
    ball.x += (ball.vx * f) / n
    ball.y += (ball.vy * f) / n

    if (ball.x < ball.r) {
      ball.x = ball.r
      ball.vx = Math.abs(ball.vx)
      s.events.push('bounce')
    } else if (ball.x > W - ball.r) {
      ball.x = W - ball.r
      ball.vx = -Math.abs(ball.vx)
      s.events.push('bounce')
    }
    if (ball.y < ball.r) {
      ball.y = ball.r
      ball.vy = Math.abs(ball.vy)
      s.events.push('bounce')
    }

    // 패들: 맞은 위치에 따라 반사각이 달라진다 (가운데=수직, 가장자리=최대 60도)
    if (ball.vy > 0 && ball.y + ball.r >= p.y && ball.y - ball.r <= p.y + p.h && ball.x >= p.x - ball.r && ball.x <= p.x + p.w + ball.r) {
      const offset = Math.max(-1, Math.min(1, (ball.x - (p.x + p.w / 2)) / (p.w / 2)))
      const angle = offset * (Math.PI / 3)
      ball.vx = Math.sin(angle) * s.speed
      ball.vy = -Math.cos(angle) * s.speed
      ball.y = p.y - ball.r - 0.01
      s.events.push('bounce')
    }

    // 벽돌
    for (const brick of s.bricks) {
      const broken = hitBrick(s, ball, brick)
      if (broken === null) continue
      if (broken) {
        s.bricks = s.bricks.filter((b) => b !== brick)
        s.score += brick.points
        burst(s, brick.x + brick.w / 2, brick.y + brick.h / 2, brickColor(brick.row))
        if (s.rng() < 0.12) s.items.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h, type: 'wide' })
        s.speed = Math.min(s.speed + 0.03, 11)
        setSpeed(ball, s.speed)
      }
      s.events.push('brick')
      break
    }

    // 바닥으로 떨어짐
    if (ball.y - ball.r > H) {
      loseLife(s)
      break
    }
  }

  if (s.phase === 'playing' && s.bricks.length === 0) {
    s.level += 1
    s.score += 200
    s.events.push('level')
    startLevel(s)
  }
}
