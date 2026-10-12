// 리듬 게임 로직 (DOM/React 없음).
//  - buildChart(): 단계별 곡(약 1분)의 노트 배치를 항상 같은 결과로 생성한다.
//  - scheduleMusic(): 같은 곡을 WebAudio 로 합성해 AudioContext 시계에 맞춰 예약한다.
//  - createRun/press/update/getResult: 판정 · 점수 · 콤보 · 등급.
// 노트 시간은 곡 시작(0초) 기준 초 단위이고, 화면은 같은 시계(곡 시간)로 노트 위치를 계산한다.
// 1~3단계는 4레인, 4~6단계는 6레인이다. 4레인 키는 6레인 키의 부분(S D … K L)이라 손 위치가 이어진다.

import { noise, tone } from './sfx.js'

export const LAYOUTS = {
  4: { keys: ['KeyS', 'KeyD', 'KeyK', 'KeyL'], labels: ['S', 'D', 'K', 'L'] },
  6: { keys: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'], labels: ['S', 'D', 'F', 'J', 'K', 'L'] },
}
export const WINDOWS = { perfect: 0.05, good: 0.11 } // 초
export const LEAD_IN = 2 // 곡 시작 전 대기(초)

// key: 곡 전체를 옮기는 반음 수, prog: 코드 진행(마디마다 근음, A 기준 반음)
export const STAGES = [
  { id: 's1', stage: 1, lanes: 4, bpm: 100, bars: 24, density: 0.45, speed: 360, seed: 11, key: 0, prog: [0, -4, 3, -2] },
  { id: 's2', stage: 2, lanes: 4, bpm: 120, bars: 28, density: 0.65, speed: 440, seed: 23, key: 2, prog: [0, -4, 3, -2] },
  { id: 's3', stage: 3, lanes: 4, bpm: 140, bars: 32, density: 0.85, speed: 520, seed: 37, key: -3, prog: [0, -2, -4, -5] },
  { id: 's4', stage: 4, lanes: 6, bpm: 100, bars: 24, density: 0.45, speed: 380, seed: 41, key: 0, prog: [0, 3, -4, -2] },
  { id: 's5', stage: 5, lanes: 6, bpm: 120, bars: 28, density: 0.65, speed: 460, seed: 53, key: 5, prog: [0, -4, -2, -5] },
  { id: 's6', stage: 6, lanes: 6, bpm: 140, bars: 32, density: 0.85, speed: 540, seed: 67, key: -2, prog: [0, -4, 3, -2] },
]
export const getStage = (id) => STAGES.find((s) => s.id === id)

const SCALE = [0, 3, 5, 7, 10] // A 마이너 펜타토닉 (반음)
const A2 = 110
const A4 = 440

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const semitone = (base, n) => base * Math.pow(2, n / 12)

export function buildChart(stageId) {
  const cfg = getStage(stageId)
  const { lanes } = cfg
  const rng = mulberry32(cfg.seed)
  const stepDur = 60 / cfg.bpm / 4 // 16분음표 길이(초)
  const notes = []
  const pitchMax = lanes === 6 ? 14 : 9 // SCALE 인덱스 범위(레인 수에 맞춰 넓힘)
  const leadBase = lanes === 6 ? A4 / 2 : A4
  let pitch = Math.floor(pitchMax / 2)
  let id = 0

  for (let bar = 1; bar < cfg.bars - 1; bar++) {
    for (let step = 0; step < 16; step++) {
      const onBeat = step % 4 === 0
      const eighth = step % 2 === 0
      const chance = onBeat ? Math.min(1, cfg.density + 0.3) : eighth ? cfg.density * 0.6 : cfg.density > 0.8 ? 0.22 : 0
      if (rng() >= chance) continue

      pitch = Math.max(0, Math.min(pitchMax, pitch + Math.round((rng() - 0.5) * 4)))
      const lane = pitch % lanes
      const time = (bar * 16 + step) * stepDur
      const freq = semitone(leadBase, cfg.key + SCALE[pitch % 5] + 12 * Math.floor(pitch / 5))
      notes.push({ id: id++, time, lane, freq })

      // 가장 어려운 곡: 4마디마다 첫 박에 동시 노트
      if (cfg.density > 0.8 && step === 0 && bar % 4 === 0) {
        notes.push({ id: id++, time, lane: (lane + lanes / 2) % lanes, freq: freq * 1.5 })
      }
    }
  }

  notes.sort((a, b) => a.time - b.time || a.lane - b.lane)
  return {
    stageId: cfg.id,
    stage: cfg.stage,
    lanes,
    keys: LAYOUTS[lanes].keys,
    labels: LAYOUTS[lanes].labels,
    bpm: cfg.bpm,
    bars: cfg.bars,
    stepDur,
    speed: cfg.speed,
    key: cfg.key,
    prog: cfg.prog,
    notes,
    duration: cfg.bars * 16 * stepDur + 1.2,
  }
}

// 배경 음악(킥/스네어/하이햇/베이스) + 리드(=노트) 를 한꺼번에 예약한다. startAt 은 AudioContext 시간.
export function scheduleMusic(audio, startAt, chart) {
  if (!audio) return
  const { stepDur, bars, prog, key } = chart

  for (let bar = 0; bar < bars; bar++) {
    const root = prog[bar % 4]
    for (let step = 0; step < 16; step++) {
      const at = startAt + (bar * 16 + step) * stepDur
      if (step % 4 === 0) tone(audio, { freq: 150, to: 42, type: 'sine', at, dur: 0.16, gain: 0.5 })
      if (step === 4 || step === 12) noise(audio, { at, dur: 0.12, gain: 0.22, hp: 900 })
      if (step % 2 === 0) noise(audio, { at, dur: 0.04, gain: 0.07, hp: 6000 })
      if (bar > 0 && (step === 0 || step === 6 || step === 8 || step === 14)) {
        tone(audio, { freq: semitone(A2, key + root), type: 'triangle', at, dur: stepDur * 3, gain: 0.3 })
      }
    }
  }

  chart.notes.forEach((n) => {
    tone(audio, { freq: n.freq, type: 'square', at: startAt + n.time, dur: stepDur * 1.8, gain: 0.07 })
  })
}

export function hitSound(audio, judge) {
  tone(audio, { freq: judge === 'perfect' ? 1320 : 990, type: 'triangle', dur: 0.06, gain: 0.12 })
}

// ---- 판정 ----

export function createRun(chart) {
  return {
    chart,
    notes: chart.notes.map((n) => ({ ...n, status: 'idle' })), // 'idle' | 'perfect' | 'good' | 'miss'
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
  }
}

// lane 키를 곡 시간 t(초)에 눌렀을 때. 판정 결과 { judge, note } 또는 null(해당 노트 없음).
export function press(run, lane, t) {
  let best = null
  let bestDist = Infinity
  for (const n of run.notes) {
    if (n.time > t + WINDOWS.good) break
    if (n.lane !== lane || n.status !== 'idle') continue
    const dist = Math.abs(n.time - t)
    if (dist < bestDist) {
      best = n
      bestDist = dist
    }
  }
  if (!best || bestDist > WINDOWS.good) return null

  const judge = bestDist <= WINDOWS.perfect ? 'perfect' : 'good'
  best.status = judge
  run[judge] += 1
  run.combo += 1
  run.maxCombo = Math.max(run.maxCombo, run.combo)
  const multiplier = 1 + Math.min(Math.floor(run.combo / 10), 10) * 0.1 // 콤보 100에서 최대 2배
  run.score += Math.round((judge === 'perfect' ? 100 : 60) * multiplier)
  return { judge, note: best }
}

// 시간이 지나 놓친 노트를 MISS 처리. 새로 놓친 노트 배열을 돌려준다.
export function update(run, t) {
  const missed = []
  for (const n of run.notes) {
    if (n.time > t) break
    if (n.status === 'idle' && t - n.time > WINDOWS.good) {
      n.status = 'miss'
      run.miss += 1
      run.combo = 0
      missed.push(n)
    }
  }
  return missed
}

export function getResult(run) {
  const total = run.notes.length
  const accuracy = total ? (run.perfect + run.good * 0.6) / total : 0
  const grade = accuracy >= 0.95 ? 'S' : accuracy >= 0.85 ? 'A' : accuracy >= 0.7 ? 'B' : accuracy >= 0.5 ? 'C' : 'D'
  return { total, accuracy, grade, score: run.score, maxCombo: run.maxCombo, perfect: run.perfect, good: run.good, miss: run.miss }
}
