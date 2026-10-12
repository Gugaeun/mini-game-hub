// Cloudflare Worker: 게임 추천 중계 함수.
// 브라우저는 이 함수만 호출하고, LLM API 키는 이 함수의 시크릿(LLM_API_KEY)에만 둔다.
//
//   POST { text, games } → 200 { gameId, reason }   (gameId 가 null 이면 "판단 어려움")
//   그 외 상태 코드는 클라이언트가 "전체 게임 목록 안내"로 처리한다.

import {
  buildPrompt,
  callLLM,
  createRateLimiter,
  parseModelOutput,
  parseRequest,
} from './lib.js'

const MAX_BODY_BYTES = 4000
const allow = createRateLimiter(10, 60_000)

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!allowed.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin') || '', env)
    const reply = (status, body) =>
      new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
      })

    if (request.method === 'OPTIONS') return reply(204, null)
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' })
    if (!cors['Access-Control-Allow-Origin']) return reply(403, { error: 'origin_not_allowed' })

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    if (!allow(ip)) return reply(429, { error: 'too_many_requests' })

    const raw = await request.text()
    if (raw.length > MAX_BODY_BYTES) return reply(413, { error: 'payload_too_large' })

    let body
    try {
      body = JSON.parse(raw)
    } catch {
      return reply(400, { error: 'invalid_json' })
    }

    const parsed = parseRequest(body)
    if (!parsed) return reply(400, { error: 'invalid_request' })

    if (!env.LLM_API_KEY || !env.LLM_PROVIDER || !env.LLM_MODEL) {
      return reply(503, { error: 'not_configured' })
    }

    try {
      const output = await callLLM(env, buildPrompt(parsed.text, parsed.games))
      return reply(200, parseModelOutput(output, parsed.games))
    } catch {
      return reply(502, { error: 'llm_failed' })
    }
  },
}
