// 방문·추천·플레이 로그를 ARCADIA 로컬 API(Oracle DB)로 보낸다.
//
// - VITE_ARCADIA_LOG_URL 이 설정되어 있을 때만 동작한다. (예: .env.local 에 http://127.0.0.1:3001)
//   설정이 없으면(GitHub Pages 배포본) 모든 함수가 아무것도 하지 않는다.
// - 로그 전송은 화면 동작과 무관하다. 실패해도(서버 꺼짐, 시간 초과 등) 조용히 무시한다.
// - 사용자는 localStorage 의 익명 키로만 구분한다.
// - 입력 문장은 로컬 서버로 전달되지만, 서버는 해시와 글자 수만 저장한다.
//   동의 플래그(consentSaveText)를 보내지 않으므로 원문은 DB에 남지 않는다.

const BASE = import.meta.env.VITE_ARCADIA_LOG_URL
export const loggingEnabled = Boolean(BASE)

const ANON_KEY = 'arcadia_anon_key'
const PENDING_TTL_MS = 30 * 60 * 1000

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function anonKey() {
  try {
    let key = localStorage.getItem(ANON_KEY)
    if (!key) {
      key = randomKey()
      localStorage.setItem(ANON_KEY, key)
    }
    return key
  } catch {
    return randomKey() // 저장 불가 환경: 이번 접속 동안만 유지
  }
}

async function post(path, body, { keepalive = false } = {}) {
  if (!BASE) return null
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive,
      signal: AbortSignal.timeout(3000),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

// 접속 1회당 방문 세션 1개. 서버가 꺼져 있어 실패하면 다음 호출에서 다시 시도한다.
let sessionPromise = null
function getSession() {
  if (!BASE) return Promise.resolve(null)
  if (!sessionPromise) {
    const params = new URLSearchParams(window.location.search)
    sessionPromise = post('/api/session', {
      anonKey: anonKey(),
      referrer: document.referrer || null,
      utmSource: params.get('utm_source'),
      device: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'pc',
    }).then((r) => {
      if (!r?.sessionId) sessionPromise = null
      return r?.sessionId ?? null
    })
  }
  return sessionPromise
}

export function trackEvent(type, payload = null) {
  if (!BASE) return
  getSession().then((sessionId) => {
    if (sessionId) post('/api/events', { sessionId, type, payload })
  })
}

// 방금 화면에 보여준 추천 결과. 이 게임을 곧 플레이하면 "추천에서 시작된 플레이"로 연결한다.
let pending = null

// outcome: { mode, text?, answers?, game?, reason?, status: 'ok'|'invalid'|'fallback', latencyMs }
export function logRecommendation(outcome) {
  if (!BASE) return
  pending = null
  getSession().then(async (sessionId) => {
    if (!sessionId) return
    const { game, ...rest } = outcome
    const res = await post('/api/recommend/log', {
      sessionId,
      engine: 'rule',
      ...rest,
      gameSlug: game ? game.id : null,
    })
    if (res?.resultId && game) pending = { gameId: game.id, resultId: res.resultId, at: Date.now() }
  })
}

function takePending(gameId) {
  const p = pending
  if (p && p.gameId === gameId && Date.now() - p.at < PENDING_TTL_MS) {
    pending = null
    return p.resultId
  }
  return null
}

// 지금 진행 중인 플레이(게임 화면에 머무는 동안). 점수는 여기에 모은다.
let activePlay = null

// 게임이 끝났을 때 점수를 알린다. 한 번 방문 중에 여러 판을 하면 가장 높은 점수를 보낸다.
// 게임 화면(플레이 기록)이 없거나 로그가 꺼져 있으면 아무 일도 하지 않는다.
export function reportScore(score) {
  const n = Math.round(Number(score))
  if (!activePlay || !Number.isFinite(n) || n < 0) return
  if (activePlay.score == null || n > activePlay.score) activePlay.score = n
}

// 플레이 시작을 기록하고, 끝낼 때 호출할 end(초)를 돌려준다.
export function beginPlay(gameId) {
  if (!BASE) return null
  const fromResultId = takePending(gameId)
  const playId = getSession()
    .then((sessionId) => (sessionId ? post('/api/play', { sessionId, gameSlug: gameId, fromResultId }) : null))
    .then((r) => r?.playId ?? null)
  const handle = { score: null }
  activePlay = handle
  return {
    end(durationSec) {
      if (activePlay === handle) activePlay = null
      playId.then((id) => {
        if (!id) return
        const body = { playId: id, durationSec }
        if (handle.score != null) body.score = handle.score
        post('/api/play/end', body, { keepalive: true })
      })
    },
  }
}
