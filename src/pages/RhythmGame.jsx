import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Mascot from '../components/Mascot'
import {
  LAYOUTS,
  LEAD_IN,
  STAGES,
  buildChart,
  createRun,
  getResult,
  getStage,
  hitSound,
  press,
  scheduleMusic,
  update,
} from '../lib/rhythmEngine'
import { createAudio, setMuted } from '../lib/sfx'

const WIDTH = 400
const HEIGHT = 600
const JUDGE_Y = HEIGHT - 90
const LANE_COLORS = ['#4cd7e0', '#ff3d94', '#ffb703', '#7cf5a0', '#8c7cff', '#ff7a45']
const NO_FLASH = () => new Array(6).fill(-1e9)
const JUDGE_STYLE = {
  perfect: { text: 'PERFECT', color: '#ffb703' },
  good: { text: 'GOOD', color: '#4cd7e0' },
  miss: { text: 'MISS', color: '#ff6b81' },
}

const bestKey = (d) => `arcadia_rhythm_best_${d}`
const readBest = (d) => {
  try {
    return Number(localStorage.getItem(bestKey(d))) || 0
  } catch {
    return 0
  }
}

// 마스코트가 박자(BPM)에 맞춰 통통 튀고, 판정에 따라 반응한다.
//  - 박마다 한 번 위로 튀어오른다 (정수 픽셀 단위로만 움직여 도트가 뭉개지지 않게)
//  - PERFECT: 폴짝 더 높이 / MISS: 좌우로 잠깐 흔들림
//  - 일시정지·결과·메뉴에서는 가만히 있고, '동작 줄이기' 설정을 켠 사용자에게는 움직이지 않는다.
const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function moveMascot(el, state, t, now, playing) {
  if (!el) return
  if (REDUCED_MOTION || !playing || !state.run || t < 0) {
    el.style.transform = ''
    return
  }
  const beat = 60 / state.run.chart.bpm
  const phase = (((t % beat) + beat) % beat) / beat // 0~1
  let dy = -Math.abs(Math.sin(Math.PI * phase)) * 6
  let dx = 0

  const j = state.judge
  const age = j ? now - j.at : 1e9
  if (age < 220) {
    if (j.text === 'MISS') dx = Math.sin(age / 22) * 4
    else if (j.text === 'PERFECT') dy -= Math.sin((age / 220) * Math.PI) * 8
  }
  el.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`
}

function draw(ctx, state, t, now) {
  const LANES = state.lanes
  const LANE_W = WIDTH / LANES
  ctx.fillStyle = '#0c0818'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // 레인
  for (let i = 0; i < LANES; i++) {
    const pressed = now - state.flashes[i] < 140
    if (pressed) {
      const grad = ctx.createLinearGradient(0, JUDGE_Y - 160, 0, JUDGE_Y)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(1, LANE_COLORS[i] + '55')
      ctx.fillStyle = grad
      ctx.fillRect(i * LANE_W, JUDGE_Y - 160, LANE_W, 160)
    }
    ctx.strokeStyle = '#382c5c'
    ctx.beginPath()
    ctx.moveTo(i * LANE_W, 0)
    ctx.lineTo(i * LANE_W, HEIGHT)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(WIDTH, 0)
  ctx.lineTo(WIDTH, HEIGHT)
  ctx.stroke()

  // 판정선 + 키 패드
  ctx.strokeStyle = '#ff3d94'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, JUDGE_Y)
  ctx.lineTo(WIDTH, JUDGE_Y)
  ctx.stroke()
  ctx.lineWidth = 1
  for (let i = 0; i < LANES; i++) {
    const pressed = now - state.flashes[i] < 140
    ctx.fillStyle = pressed ? LANE_COLORS[i] : 'rgba(255,255,255,0.07)'
    ctx.fillRect(i * LANE_W + 6, JUDGE_Y + 14, LANE_W - 12, 46)
    ctx.fillStyle = pressed ? '#0c0818' : '#a89bc4'
    ctx.font = '18px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(state.labels[i], i * LANE_W + LANE_W / 2, JUDGE_Y + 44)
  }

  // 노트
  const run = state.run
  if (run) {
    const speed = run.chart.speed
    run.notes.forEach((n) => {
      if (n.status !== 'idle') return
      const y = JUDGE_Y - (n.time - t) * speed
      if (y < -30 || y > HEIGHT + 30) return
      ctx.fillStyle = LANE_COLORS[n.lane]
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(n.lane * LANE_W + 8, y - 8, LANE_W - 16, 16, 5)
      else ctx.rect(n.lane * LANE_W + 8, y - 8, LANE_W - 16, 16)
      ctx.fill()
    })

    // 히트 이펙트
    state.effects = state.effects.filter((e) => now - e.at < 260)
    state.effects.forEach((e) => {
      const k = (now - e.at) / 260
      ctx.globalAlpha = 1 - k
      ctx.strokeStyle = e.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(e.lane * LANE_W + LANE_W / 2, JUDGE_Y, 10 + k * 26, 0, Math.PI * 2)
      ctx.stroke()
    })
    ctx.globalAlpha = 1
    ctx.lineWidth = 1

    // 진행 막대
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, 0, WIDTH, 4)
    ctx.fillStyle = '#ff3d94'
    ctx.fillRect(0, 0, WIDTH * Math.max(0, Math.min(1, t / run.chart.duration)), 4)

    // 콤보
    if (run.combo >= 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '44px Jua, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(run.combo), WIDTH / 2, 200)
      ctx.font = '14px "JetBrains Mono", monospace'
      ctx.fillText('COMBO', WIDTH / 2, 222)
    }

    // 판정 글자
    if (state.judge && now - state.judge.at < 520) {
      ctx.globalAlpha = 1 - (now - state.judge.at) / 520
      ctx.fillStyle = state.judge.color
      ctx.font = '26px Jua, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(state.judge.text, WIDTH / 2, 290 - (now - state.judge.at) * 0.02)
      ctx.globalAlpha = 1
    }

    // 시작 카운트다운
    if (t < 0) {
      ctx.fillStyle = '#ffffff'
      ctx.font = '40px Jua, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(t > -1 ? 'GO!' : String(Math.ceil(-t)), WIDTH / 2, 300)
    }
  }
}

export default function RhythmGame() {
  const canvasRef = useRef(null)
  const phaseRef = useRef('menu')
  const audioRef = useRef(null)
  const mutedRef = useRef(false)
  const difficultyRef = useRef('s1')
  const clockRef = useRef({ startAt: 0, t0: 0, paused: 0, pausedAt: 0 })
  const mascotRef = useRef(null)
  const stateRef = useRef({ run: null, lanes: 4, labels: LAYOUTS[4].labels, flashes: NO_FLASH(), effects: [], judge: null })
  const hudRef = useRef({ score: 0, combo: 0 })

  const [phase, setPhaseState] = useState('menu') // 'menu' | 'playing' | 'paused' | 'result'
  const [difficulty, setDifficulty] = useState('s1')
  const [labels, setLabels] = useState(LAYOUTS[4].labels)
  const [hud, setHud] = useState({ score: 0, combo: 0 })
  const [result, setResult] = useState(null)
  const [best, setBest] = useState(0)
  const [newRecord, setNewRecord] = useState(false)
  const [muted, setMutedState] = useState(false)

  const charts = useMemo(
    () => Object.fromEntries(STAGES.map((st) => [st.id, buildChart(st.id)])),
    [],
  )

  const setPhase = useCallback((p) => {
    phaseRef.current = p
    setPhaseState(p)
  }, [])

  const songTime = useCallback(() => {
    const c = clockRef.current
    const a = audioRef.current
    if (a) return a.ctx.currentTime - c.startAt
    return (performance.now() - c.t0 - c.paused) / 1000 - LEAD_IN
  }, [])

  const start = useCallback(
    (d) => {
      // 곡마다 새 AudioContext 를 써서, 이전 곡의 예약된 소리가 남지 않게 한다.
      audioRef.current?.ctx.close()
      const audio = createAudio()
      audioRef.current = audio
      setMuted(audio, mutedRef.current)

      const chart = charts[d]
      difficultyRef.current = d
      setDifficulty(d)
      setLabels(chart.labels)
      stateRef.current = {
        run: createRun(chart),
        lanes: chart.lanes,
        labels: chart.labels,
        flashes: NO_FLASH(),
        effects: [],
        judge: null,
      }
      if (audio) {
        audio.ctx.resume()
        clockRef.current.startAt = audio.ctx.currentTime + LEAD_IN
        scheduleMusic(audio, clockRef.current.startAt, chart)
      } else {
        clockRef.current = { startAt: 0, t0: performance.now(), paused: 0, pausedAt: 0 }
      }
      hudRef.current = { score: 0, combo: 0 }
      setHud(hudRef.current)
      setResult(null)
      setNewRecord(false)
      setBest(readBest(d))
      setPhase('playing')
    },
    [charts, setPhase],
  )

  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    if (audioRef.current) audioRef.current.ctx.suspend()
    else clockRef.current.pausedAt = performance.now()
    setPhase('paused')
  }, [setPhase])

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return
    if (audioRef.current) audioRef.current.ctx.resume()
    else clockRef.current.paused += performance.now() - clockRef.current.pausedAt
    setPhase('playing')
  }, [setPhase])

  const backToMenu = useCallback(() => {
    audioRef.current?.ctx.close()
    audioRef.current = null
    stateRef.current.run = null
    setPhase('menu')
  }, [setPhase])

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current
    setMuted(audioRef.current, mutedRef.current)
    setMutedState(mutedRef.current)
  }, [])

  const pressLane = useCallback((lane) => {
    if (phaseRef.current !== 'playing') return
    const st = stateRef.current
    const now = performance.now()
    st.flashes[lane] = now
    const res = press(st.run, lane, songTime())
    if (!res) return
    const style = JUDGE_STYLE[res.judge]
    st.judge = { ...style, at: now }
    st.effects.push({ lane, at: now, color: style.color })
    hitSound(audioRef.current, res.judge)
  }, [songTime])

  // 게임 루프
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const finish = () => {
      const st = stateRef.current
      const res = getResult(st.run)
      const d = difficultyRef.current
      const prev = readBest(d)
      if (res.score > prev) {
        try {
          localStorage.setItem(bestKey(d), String(res.score))
        } catch {
          // 저장 불가 환경에서는 이번 접속 동안만 유지
        }
        setNewRecord(true)
        setBest(res.score)
      }
      setResult(res)
      setPhase('result')
    }

    const loop = (now) => {
      const st = stateRef.current
      let t = -LEAD_IN
      if (st.run) {
        t = songTime()
        if (phaseRef.current === 'playing') {
          const missed = update(st.run, t)
          if (missed.length) st.judge = { ...JUDGE_STYLE.miss, at: now }
          if (t >= st.run.chart.duration) finish()

          const h = hudRef.current
          if (h.score !== st.run.score || h.combo !== st.run.combo) {
            hudRef.current = { score: st.run.score, combo: st.run.combo }
            setHud(hudRef.current)
          }
        }
      }
      draw(ctx, st, t, now)
      moveMascot(mascotRef.current, st, t, now, phaseRef.current === 'playing')
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [songTime, setPhase])

  // 키보드 / 포커스
  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return
      const keys = stateRef.current.run?.chart.keys
      const lane = keys ? keys.indexOf(e.code) : -1
      if (lane !== -1) pressLane(lane)
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (phaseRef.current === 'playing') pause()
        else if (phaseRef.current === 'paused') resume()
      }
      if (e.code === 'KeyM') toggleMute()
    }
    const onVisibility = () => document.hidden && pause()
    window.addEventListener('keydown', down)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pressLane, pause, resume, toggleMute])

  useEffect(
    () => () => {
      audioRef.current?.ctx.close()
      audioRef.current = null
    },
    [],
  )

  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

  return (
    <div className="game-page">
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">
        <div ref={mascotRef} className="rhythm-mascot">
          <Mascot pose="rhythm" size={70} />
        </div>
        <div className="game-hud">
          <span>
            SCORE <strong>{hud.score}</strong>
          </span>
          <span>
            COMBO <strong>{hud.combo}</strong>
          </span>
          <span>
            <strong>
              {getStage(difficulty).stage}단계 · {getStage(difficulty).lanes}레인
            </strong>
          </span>
          <button className="game-icon-btn" onClick={toggleMute} aria-label="음소거 전환">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="game-canvas-wrap" style={{ maxWidth: WIDTH }}>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />

          {phase === 'menu' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">RHYTHM</h2>
              <p>박자에 맞춰 키를 누르세요.</p>
              <p className="game-overlay-sub">
                1~3단계 {LAYOUTS[4].labels.join(' ')} · 4~6단계 {LAYOUTS[6].labels.join(' ')}
              </p>
              <div className="rhythm-stages">
                {STAGES.map((st) => (
                  <button key={st.id} className="rhythm-level" onClick={() => start(st.id)}>
                    <strong>{st.stage}단계</strong>
                    <span>
                      {st.lanes}레인 · BPM {st.bpm}
                    </span>
                    <span>
                      노트 {charts[st.id].notes.length} · {mmss(charts[st.id].duration)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="game-overlay-sub">단계를 누르면 2초 뒤 시작해요. 순서 상관없이 고를 수 있어요 🔊</p>
            </div>
          )}
          {phase === 'paused' && (
            <div className="game-overlay">
              <h2 className="game-overlay-title">일시정지</h2>
              <button className="game-btn" onClick={resume}>
                계속하기
              </button>
              <button className="game-link" onClick={backToMenu}>
                곡 선택으로
              </button>
              <p className="game-overlay-sub">P 또는 Esc</p>
            </div>
          )}
          {phase === 'result' && result && (
            <div className="game-overlay">
              <div className={`rhythm-grade grade-${result.grade}`}>{result.grade}</div>
              <p>
                SCORE <strong>{result.score}</strong> · 정확도 {(result.accuracy * 100).toFixed(1)}%
              </p>
              <p className="game-overlay-sub">
                PERFECT {result.perfect} · GOOD {result.good} · MISS {result.miss} · 최대 콤보 {result.maxCombo}
              </p>
              {newRecord ? <p className="game-record">★ 최고 기록 갱신!</p> : <p className="game-overlay-sub">최고 {best}</p>}
              <button className="game-btn" onClick={() => start(difficulty)}>
                다시 하기
              </button>
              <button className="game-link" onClick={backToMenu}>
                곡 선택으로
              </button>
            </div>
          )}
        </div>

        <div className="touch-controls">
          {labels.map((label, i) => (
            <button
              key={label}
              className="touch-btn"
              style={{ borderColor: LANE_COLORS[i] }}
              onPointerDown={(e) => {
                e.preventDefault()
                pressLane(i)
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="game-hint">{labels.join(' ')} 키 · P 일시정지 · M 음소거</p>
      </div>
    </div>
  )
}
