import { AXES, emptyScore } from '../data/quiz'

// 자유 입력(한두 문장) 기반 게임 추천.
//
// - VITE_RECOMMEND_API_URL 이 설정되어 있으면 그 서버리스 중계 함수(LLM 호출)에
//   POST { text, games } 를 보내고 { gameId, reason } 을 받는다.
//   (API 키는 브라우저가 아니라 중계 함수에만 둔다.)
// - 설정되어 있지 않으면 아래 키워드 매칭(규칙 기반)으로 동작한다.
//
// recommend() 의 반환값
//   { game, reason } : 추천 성공
//   null             : 게임과 무관하거나 판단하기 어려운 입력
//   (throw)          : AI 호출 실패 → 화면에서 전체 게임 목록으로 안내

export const MAX_LENGTH = 100

const API_URL = import.meta.env.VITE_RECOMMEND_API_URL
export const usesRemoteAI = Boolean(API_URL)

const KEYWORDS = {
  logic: ['퍼즐', '지뢰', '논리적', '추론', '머리', '생각', '논리', '숫자', '계산', '전략', '두뇌', '차분', '조용', '천천히', '고민'],
  memory: ['기억', '암기', '카드', '짝', '집중', '외우'],
  story: ['이야기', '스토리', '탈출', '추리', '미스터리', '단서', '분위기', '공포', '무서', '어두', '탐험', '몰입', '수수께끼'],
  reflex: ['벽돌', '튕', '부수', '빠른', '빠르게', '반응', '슈팅', '액션', '신나', '스트레스', '짜릿', '긴장', '반사', '우주'],
  rhythm: ['리듬', '음악', '노래', '박자', '춤', '비트', '연주', '타이밍'],
  strategy: ['전략', '대결', '대전', '한 수', '수읽기', '상대', '컴퓨터'],
  typing: ['타자', '타이핑', '키보드', '단어', '글자', '자판', '손가락', '산성비', '입력'],
}

const LIGHT_KEYWORDS = ['가볍', '심심', '잠깐', '짧', '쉬는', '간단', '5분']

const AXIS_LABEL = {
  logic: '머리를 쓰는 퍼즐',
  memory: '기억력을 쓰는',
  story: '이야기에 빠져드는',
  reflex: '빠른 반응이 필요한',
  rhythm: '박자를 맞추는',
  typing: '타자를 치는',
  strategy: '수읽기가 필요한',
  light: '가볍게 즐길 수 있는',
}

export function validate(raw) {
  const text = raw.trim()
  if (!text) {
    return { ok: false, message: '취향을 한두 문장으로 적어주세요. (예: 머리 쓰는 퍼즐이 좋아요)' }
  }
  if (text.length > MAX_LENGTH) {
    return { ok: false, message: `${MAX_LENGTH}자까지만 입력할 수 있어요. 조금만 줄여주세요.` }
  }
  return { ok: true, text }
}

function localRecommend(text, games) {
  const score = emptyScore()
  const hits = {}

  AXES.forEach((axis) => {
    KEYWORDS[axis].forEach((kw) => {
      if (text.includes(kw)) {
        score[axis] += 2
        ;(hits[axis] ||= []).push(kw)
      }
    })
  })

  const lightHits = LIGHT_KEYWORDS.filter((kw) => text.includes(kw))
  if (lightHits.length) {
    // 짧게 즐기기 좋은 성향(반응·박자·기억)에 가산점
    ;['reflex', 'rhythm', 'memory'].forEach((k) => (score[k] += 1))
  }

  // 게임 이름/핵심 단어를 직접 말하면 그 게임을 우선한다 (성향 점수가 같을 때의 동점도 가른다)
  const keywordHits = (g) => (g.keywords || []).filter((kw) => text.includes(kw))

  let best = null
  let bestValue = 0
  games.forEach((g) => {
    const byTaste = AXES.reduce((sum, k) => sum + score[k] * (g.tags?.[k] ?? 0), 0)
    const value = byTaste + keywordHits(g).length * 6
    if (value > bestValue) {
      bestValue = value
      best = g
    }
  })
  if (!best) return null

  const direct = keywordHits(best)
  if (direct.length) {
    const quoted = direct.slice(0, 2).map((kw) => `'${kw}'`).join(', ')
    return { game: best, reason: `${quoted} 같은 표현이 있어서 이 게임을 추천해요.` }
  }

  // 추천 이유: 이 게임에 가장 크게 기여한 성향과, 그걸 불러온 표현
  let topAxis = null
  let topValue = 0
  AXES.forEach((k) => {
    const value = score[k] * (best.tags?.[k] ?? 0)
    if (value > topValue) {
      topValue = value
      topAxis = k
    }
  })

  const matched = topAxis && hits[topAxis] ? hits[topAxis] : lightHits
  const label = topAxis && hits[topAxis] ? AXIS_LABEL[topAxis] : AXIS_LABEL.light
  const quoted = matched.slice(0, 2).map((kw) => `'${kw}'`).join(', ')
  return { game: best, reason: `${quoted} 같은 표현을 보니 ${label} 게임이 잘 맞을 것 같아요.` }
}

async function remoteRecommend(text, games) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      games: games.map(({ id, title, genre, description, difficulty, playTime }) => ({
        id,
        title,
        genre,
        description,
        difficulty,
        playTime,
      })),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`recommend api ${res.status}`)

  const data = await res.json()
  const game = games.find((g) => g.id === data.gameId)
  if (!game) return null
  return { game, reason: String(data.reason || '').slice(0, 120) }
}

export async function recommend(text, games) {
  return usesRemoteAI ? remoteRecommend(text, games) : localRecommend(text, games)
}
