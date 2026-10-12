// WebAudio 로 만드는 간단한 합성 효과음/음악 도구. 외부 오디오 파일이 필요 없다.
// AudioContext 는 사용자 입력(키 입력/버튼 클릭) 이후에 만들어야 하므로 createAudio() 는
// 게임 시작 핸들러에서 호출한다.

export function createAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0.5
  master.connect(ctx.destination)
  return { ctx, master, noiseBuf: null, muted: false }
}

export function setMuted(audio, muted) {
  if (!audio) return
  audio.muted = muted
  audio.master.gain.value = muted ? 0 : 0.5
}

// 단음. at 은 AudioContext 기준 절대 시간(초).
export function tone(audio, { freq, to, type = 'square', at, dur = 0.1, gain = 0.2 }) {
  if (!audio) return
  const { ctx, master } = audio
  const start = at ?? ctx.currentTime
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur)
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(amp)
  amp.connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

// 잡음(폭발음, 하이햇, 스네어). hp 는 하이패스 필터 주파수.
export function noise(audio, { at, dur = 0.1, gain = 0.2, hp = 0 }) {
  if (!audio) return
  const { ctx, master } = audio
  const start = at ?? ctx.currentTime
  if (!audio.noiseBuf) {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    audio.noiseBuf = buf
  }
  const src = ctx.createBufferSource()
  src.buffer = audio.noiseBuf
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur)

  let node = src
  if (hp > 0) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = hp
    src.connect(filter)
    node = filter
  }
  node.connect(amp)
  amp.connect(master)
  src.start(start, 0, dur + 0.02)
}

// 게임 효과음 (슈팅 · 산성비 · 벽돌깨기 · 지뢰찾기 공용)
export function playSfx(audio, name) {
  if (!audio) return
  switch (name) {
    case 'shoot':
      tone(audio, { freq: 900, to: 380, type: 'square', dur: 0.08, gain: 0.07 })
      break
    case 'kill':
      noise(audio, { dur: 0.16, gain: 0.18, hp: 400 })
      tone(audio, { freq: 220, to: 60, type: 'sawtooth', dur: 0.16, gain: 0.12 })
      break
    case 'hit':
      noise(audio, { dur: 0.35, gain: 0.3 })
      tone(audio, { freq: 300, to: 50, type: 'sawtooth', dur: 0.35, gain: 0.2 })
      break
    case 'wave': {
      const t = audio.ctx.currentTime
      ;[523, 659, 784].forEach((f, i) => tone(audio, { freq: f, type: 'square', at: t + i * 0.09, dur: 0.12, gain: 0.1 }))
      break
    }
    case 'gameover': {
      const t = audio.ctx.currentTime
      ;[392, 330, 262, 196].forEach((f, i) => tone(audio, { freq: f, type: 'triangle', at: t + i * 0.18, dur: 0.22, gain: 0.18 }))
      break
    }
    case 'bounce':
      tone(audio, { freq: 420, to: 520, type: 'square', dur: 0.05, gain: 0.07 })
      break
    case 'brick':
      tone(audio, { freq: 700, to: 1000, type: 'square', dur: 0.07, gain: 0.08 })
      break
    case 'item':
      tone(audio, { freq: 600, to: 1400, type: 'triangle', dur: 0.18, gain: 0.12 })
      break
    case 'lose':
      tone(audio, { freq: 330, to: 90, type: 'sawtooth', dur: 0.4, gain: 0.15 })
      break
    case 'type':
      tone(audio, { freq: 880, to: 1320, type: 'triangle', dur: 0.08, gain: 0.1 })
      break
    case 'wrong':
      tone(audio, { freq: 160, type: 'square', dur: 0.1, gain: 0.08 })
      break
    case 'miss':
      noise(audio, { dur: 0.2, gain: 0.2 })
      tone(audio, { freq: 200, to: 70, type: 'sawtooth', dur: 0.2, gain: 0.12 })
      break
    case 'bomb':
      noise(audio, { dur: 0.45, gain: 0.3 })
      tone(audio, { freq: 120, to: 40, type: 'sawtooth', dur: 0.4, gain: 0.2 })
      break
    case 'level': {
      const t = audio.ctx.currentTime
      ;[392, 523, 659, 784].forEach((f, i) => tone(audio, { freq: f, type: 'square', at: t + i * 0.08, dur: 0.1, gain: 0.09 }))
      break
    }
    case 'flag':
      tone(audio, { freq: 520, type: 'triangle', dur: 0.05, gain: 0.1 })
      break
    case 'open':
      tone(audio, { freq: 300, type: 'triangle', dur: 0.03, gain: 0.07 })
      break
    case 'boom':
      noise(audio, { dur: 0.6, gain: 0.35 })
      tone(audio, { freq: 90, to: 30, type: 'sawtooth', dur: 0.5, gain: 0.25 })
      break
    case 'win': {
      const t = audio.ctx.currentTime
      ;[523, 659, 784, 1047].forEach((f, i) => tone(audio, { freq: f, type: 'triangle', at: t + i * 0.12, dur: 0.18, gain: 0.15 }))
      break
    }
    default:
  }
}

export const playShooterSfx = playSfx
