// 산성비(타자 게임) 로직. DOM/React 없음.
// 한글 단어가 떨어지고, 같은 단어를 입력하고 Enter 를 누르면 사라진다.
// 바닥에 닿으면 목숨이 줄고, 가끔 나오는 황금 단어를 입력하면 화면의 모든 단어가 한꺼번에 사라진다.

export const W = 480
export const H = 560
export const GROUND = H - 52
export const WORD_H = 26

const FRAME_MS = 1000 / 60
const KILLS_PER_LEVEL = 8

const POOLS = {
  short: [
    '하늘', '바다', '나무', '구름', '사과', '바람', '노래', '친구', '학교', '우유', '여름', '겨울', '가을', '가방', '거울',
    '얼음', '호수', '아침', '저녁', '시간', '과자', '라면', '우산', '신발', '모자', '시계', '안경', '의자', '책상', '공원',
    '기차', '눈물', '웃음', '마음', '사랑', '별빛', '달빛', '햇살', '파도', '소풍',
  ],
  medium: [
    '고양이', '강아지', '놀이터', '도서관', '운동장', '자전거', '바나나', '무지개', '아파트', '선풍기', '냉장고', '세탁기',
    '비행기', '지하철', '소나기', '도깨비', '호랑이', '코끼리', '다람쥐', '햄버거', '떡볶이', '아이스', '딸기잼', '청바지',
    '운동화', '장난감', '자판기', '신호등', '횡단보도', '크레파스', '손수건', '플라스틱',
  ],
  long: [
    '컴퓨터', '키보드', '초콜릿', '아이스크림', '롤러코스터', '크리스마스', '대한민국', '자동판매기', '도깨비방망이',
    '숨바꼭질', '무궁화꽃', '놀이공원', '수학여행', '보물찾기', '스마트폰', '라디오체조', '단팥빵', '피아노학원',
    '아이돌가수', '메이플시럽', '샌드위치', '팝콘기계', '우주비행사', '열기구여행',
  ],
}

// 글자 수에 비례한 단어 상자 너비 (화면 쪽 그리기에서도 같은 값을 쓴다)
export const wordWidth = (text) => text.length * 20 + 20

export function levelParams(level) {
  return {
    spawnMs: Math.max(750, 2300 - level * 170),
    speed: Math.min(0.42 + 0.07 * level, 1.5),
  }
}

export function createGame(rng = Math.random) {
  return {
    rng,
    phase: 'playing', // 'playing' | 'over'
    time: 0,
    score: 0,
    lives: 5,
    level: 1,
    killed: 0,
    combo: 0,
    maxCombo: 0,
    words: [],
    spawnTimer: 700,
    nextId: 1,
    particles: [],
    events: [],
  }
}

function pickText(s) {
  const r = s.rng()
  const lv = s.level
  const pool =
    lv <= 2 ? POOLS.short
    : lv <= 4 ? (r < 0.65 ? POOLS.medium : POOLS.short)
    : lv <= 7 ? (r < 0.5 ? POOLS.medium : r < 0.85 ? POOLS.long : POOLS.short)
    : r < 0.7 ? POOLS.long : POOLS.medium

  for (let i = 0; i < 12; i++) {
    const text = pool[Math.floor(s.rng() * pool.length)]
    if (!s.words.some((w) => w.text === text)) return text
  }
  return pool[Math.floor(s.rng() * pool.length)]
}

function spawn(s) {
  const params = levelParams(s.level)
  const text = pickText(s)
  const width = wordWidth(text)
  const gold = s.killed >= 5 && !s.words.some((w) => w.gold) && s.rng() < 0.08
  s.words.push({
    id: s.nextId++,
    text,
    gold,
    x: 8 + s.rng() * (W - width - 16),
    y: -WORD_H,
    speed: params.speed * (0.85 + s.rng() * 0.4),
  })
}

function burst(s, x, y, color, n) {
  for (let i = 0; i < n && s.particles.length < 160; i++) {
    const a = s.rng() * Math.PI * 2
    const v = 0.6 + s.rng() * 1.8
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 420, max: 420, color })
  }
}

export function step(s, dtMs) {
  s.events.length = 0
  if (s.phase !== 'playing') return

  const dt = Math.min(dtMs, 50)
  const f = dt / FRAME_MS
  s.time += dt

  s.spawnTimer -= dt
  if (s.spawnTimer <= 0) {
    spawn(s)
    s.spawnTimer = levelParams(s.level).spawnMs * (0.7 + s.rng() * 0.6)
  }

  s.words.forEach((w) => (w.y += w.speed * f))

  const landed = s.words.filter((w) => w.y + WORD_H >= GROUND)
  if (landed.length) {
    s.words = s.words.filter((w) => !landed.includes(w))
    landed.forEach((w) => burst(s, w.x + wordWidth(w.text) / 2, GROUND, '#ff6b81', 10))
    s.lives = Math.max(0, s.lives - landed.length)
    s.combo = 0
    s.events.push('miss')
    if (s.lives === 0) {
      s.phase = 'over'
      s.events.push('gameover')
    }
  }

  s.particles.forEach((q) => {
    q.x += q.vx * f
    q.y += q.vy * f
    q.life -= dt
  })
  s.particles = s.particles.filter((q) => q.life > 0)
}

const pointsFor = (text, combo) => Math.round(text.length * 10 * (1 + Math.min(Math.floor(combo / 5), 4) * 0.25))

function levelUp(s) {
  const level = 1 + Math.floor(s.killed / KILLS_PER_LEVEL)
  if (level > s.level) {
    s.level = level
    s.events.push('level')
  }
}

// 입력한 문장을 제출. 결과: { ok, gold?, text? }
export function submit(s, raw) {
  if (s.phase !== 'playing') return { ok: false }
  s.events.length = 0
  const text = String(raw).trim()
  if (!text) return { ok: false }

  const hits = s.words.filter((w) => w.text === text)
  if (!hits.length) {
    s.combo = 0
    s.events.push('wrong')
    return { ok: false }
  }

  // 같은 단어가 둘이면 더 아래에 있는(위험한) 쪽부터
  const target = hits.reduce((a, b) => (b.y > a.y ? b : a))

  if (target.gold) {
    s.words.forEach((w) => {
      s.score += pointsFor(w.text, s.combo)
      s.killed += 1
      burst(s, w.x + wordWidth(w.text) / 2, w.y + WORD_H / 2, '#ffb703', 8)
    })
    s.words = []
    s.combo += 1
    s.maxCombo = Math.max(s.maxCombo, s.combo)
    s.events.push('bomb')
    levelUp(s)
    return { ok: true, gold: true, text }
  }

  s.words = s.words.filter((w) => w !== target)
  s.score += pointsFor(text, s.combo)
  s.combo += 1
  s.maxCombo = Math.max(s.maxCombo, s.combo)
  s.killed += 1
  burst(s, target.x + wordWidth(text) / 2, target.y + WORD_H / 2, '#7cf5a0', 10)
  s.events.push('type')
  levelUp(s)
  return { ok: true, gold: false, text }
}
