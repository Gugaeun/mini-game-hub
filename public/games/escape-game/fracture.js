/* fracture.js — FRACTURE 시간의 균열 */

// ═══════════════════════════════════════════════════════════
//  HINT JOURNAL
// ═══════════════════════════════════════════════════════════
const HintJournal = (() => {
  const STAGE_LABELS = ['신전','우주선','저택','사무소'];
  const STAGE_COLORS = ['#c8a84b','#40d4d4','#a060f0','#d4a060'];
  const MAX_NATURAL = [7, 4, 4, 6]; // 스테이지별 자연 단서 최대 수
  let entries = [];
  let isOpen = false;
  let naturalCounts = [0, 0, 0, 0];

  function add(text, stageIdx, isHint = false) {
    if (entries.some(e => e.text === text)) return;
    entries.push({ text, stageIdx, ts: Date.now(), isHint });
    if (!isHint) {
      naturalCounts[stageIdx] = (naturalCounts[stageIdx] || 0) + 1;
    }
    _render();
    // 새 힌트 들어오면 잠깐 열기
    if (!isOpen) {
      _setOpen(true);
      setTimeout(() => { if (isOpen) _setOpen(false); }, 2200);
    }
  }

  function allNaturalFound(stageIdx) {
    return (naturalCounts[stageIdx] || 0) >= MAX_NATURAL[stageIdx];
  }

  function clear() {
    entries = [];
    _render();
  }

  function toggle() {
    _setOpen(!isOpen);
  }

  function _setOpen(v) {
    isOpen = v;
    const panel = document.getElementById('hint-panel');
    const tog = document.getElementById('hint-toggle');
    panel.classList.toggle('open', isOpen);
    tog.classList.toggle('panel-open', isOpen);
    if (isOpen) {
      document.querySelectorAll('.ix-active').forEach(m => m.classList.add('ix-paused'));
    } else {
      const anyModal = document.querySelectorAll('.modal-overlay.open').length > 0;
      const noteOpen = document.getElementById('note-popup-overlay')?.classList.contains('open');
      const logVisible = document.getElementById('log-overlay')?.classList.contains('visible');
      if (!anyModal && !noteOpen && !logVisible) {
        document.querySelectorAll('.ix-active').forEach(m => m.classList.remove('ix-paused'));
      }
    }
  }

  function _render() {
    const container = document.getElementById('hint-entries');
    if (!container) return;
    container.innerHTML = '';
    [...entries].reverse().forEach(e => {
      const div = document.createElement('div');
      div.className = 'hint-entry' + (e.isHint ? ' hint-entry-hinted' : '');
      div.innerHTML = `
        <div class="hint-entry-stage" style="color:${STAGE_COLORS[e.stageIdx]}">[${STAGE_LABELS[e.stageIdx]}]</div>
        <div class="hint-entry-text">${e.text}</div>`;
      container.appendChild(div);
    });
    // 카운트 배지
    const cnt = document.getElementById('hint-count');
    if (cnt) {
      cnt.textContent = entries.length;
      cnt.classList.toggle('has-hints', entries.length > 0);
    }
  }

  return { add, toggle, clear, allNaturalFound };
})();


// ═══════════════════════════════════════════════════════════
//  NOTE POPUP
// ═══════════════════════════════════════════════════════════
const NotePopup = (() => {
  const STYLES = {
    temple:   { bg:'#e8d8a0', border:'#c8a060', text:'#1a0e00', accent:'#5a3000', tape:'rgba(200,168,75,0.5)', rotate:'rotate(-1.5deg)' },
    space:    { bg:'#ffffc8', border:'#d0d050', text:'#1a1a00', accent:'#4a4a00', tape:'rgba(180,180,60,0.4)', rotate:'rotate(1deg)' },
    mansion:  { bg:'#d8c8f0', border:'#8040c0', text:'#1a0030', accent:'#5a1a90', tape:'rgba(160,80,255,0.3)', rotate:'rotate(-2deg)' },
    detective:{ bg:'#f0e8d0', border:'#c8a878', text:'#1a1000', accent:'#5a3810', tape:'rgba(180,140,80,0.4)', rotate:'rotate(1.5deg)' },
    secret:   { bg:'#0a0814', border:'#6020c0', text:'#d0b0ff', accent:'#c060ff', tape:'rgba(120,40,220,0.4)', rotate:'rotate(-0.5deg)' },
    newspaper:{ bg:'#d8d0b8', border:'#a09870', text:'#0a0a00', accent:'#303020', tape:'rgba(160,150,100,0.3)', rotate:'rotate(-0.5deg)' },
  };
  function show(title, body, type='temple') {
    const st = STYLES[type] || STYLES.temple;
    const box = document.getElementById('note-popup-box');
    box.style.setProperty('--np-bg',     st.bg);
    box.style.setProperty('--np-border', st.border);
    box.style.setProperty('--np-text',   st.text);
    box.style.setProperty('--np-accent', st.accent);
    box.style.setProperty('--np-tape',   st.tape);
    box.style.setProperty('--np-rotate', st.rotate);
    box.style.color = st.text;
    document.getElementById('note-popup-title').textContent = title;
    document.getElementById('note-popup-body').textContent  = body;
    document.getElementById('note-popup-overlay').classList.add('open');
    // 마커 숨김
    document.querySelectorAll('.ix-active').forEach(m => m.classList.add('ix-paused'));
  }
  function close() {
    document.getElementById('note-popup-overlay').classList.remove('open');
    // 다른 모달도 없으면 마커 복원
    const anyModal = document.querySelectorAll('.modal-overlay.open').length > 0;
    if (!anyModal) {
      document.querySelectorAll('.ix-active').forEach(m => m.classList.remove('ix-paused'));
    }
  }
  return { show, close };
})();

// ═══════════════════════════════════════════════════════════
//  AUDIO
// ═══════════════════════════════════════════════════════════
const Audio = (() => {
  let ctx;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, type, dur, vol=0.15) {
    const c = getCtx();
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.start(); osc.stop(c.currentTime + dur);
  }
  return {
    click:   () => tone(800, 'sine', 0.07, 0.08),
    error:   () => { tone(120, 'sawtooth', 0.3, 0.2); setTimeout(()=>tone(100,'sawtooth',0.3,0.15),100); },
    success: () => { tone(440,'sine',0.15,0.2); setTimeout(()=>tone(554,'sine',0.15,0.2),120); setTimeout(()=>tone(660,'sine',0.3,0.2),240); },
    unlock:  () => { [300,400,500,660].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.2,0.15),i*80)); },
    hover:   () => tone(1400, 'sine', 0.03, 0.022),
    getCtx,
  };
})();

// ═══════════════════════════════════════════════════════════
//  AMBIENT
// ═══════════════════════════════════════════════════════════
const Ambient = (() => {
  let _stage = -1;
  let _oscNodes = [];

  function _ctx() { return Audio.getCtx(); }

  function _noise(ctx, vol) {
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(ctx.destination);
    src.start();
    return src;
  }

  function _osc(ctx, freq, type, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain(); g.gain.value = vol;
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    return o;
  }

  function _filteredNoise(ctx, type, freq, q, vol) {
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
    return src;
  }

  function _impulseTick(ctx, decay, vol, dest) {
    const dur = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < dur; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(dest ?? ctx.destination);
    src.start();
  }

  function stop() {
    _stage = -1;
    _oscNodes.forEach(n => { try { n.stop(); } catch(e){} });
    _oscNodes = [];
  }

  function play(stageIdx) {
    if (_stage === stageIdx) return;
    stop();
    _stage = stageIdx;
    const ctx = _ctx();
    const starters = [_temple, _space, _mansion, _detective];
    starters[stageIdx]?.(ctx);
  }

  function _temple(ctx) {
    // 고대 드론: 55Hz + 배음
    _oscNodes.push(_osc(ctx, 55,   'sine',     0.055));
    _oscNodes.push(_osc(ctx, 110,  'sine',     0.022));
    _oscNodes.push(_osc(ctx, 82.5, 'triangle', 0.018));
    // 저역 필터로 어둡게
    // 이미 osc→destination이라 여기선 vol로 제어
    // LFO tremolo (55Hz osc)
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.018;
    lfo.frequency.value = 0.14; lfo.type = 'sine';
    lfo.connect(lfoG); lfoG.connect(_oscNodes[0].frequency);
    lfo.start(); _oscNodes.push(lfo);

    // 금속 종소리 (랜덤 간격)
    const myStage = _stage;
    function ting() {
      if (_stage !== myStage) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1320, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 1.8);
      g.gain.setValueAtTime(0.055, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 2.8);
      setTimeout(ting, 7000 + Math.random() * 11000);
    }
    setTimeout(ting, 4000 + Math.random() * 6000);
  }

  function _space(ctx) {
    // 엔진 저음 허밍
    _oscNodes.push(_filteredNoise(ctx, 'bandpass', 90,  4, 0.032));
    _oscNodes.push(_osc(ctx, 80, 'sawtooth', 0.012));
    // 고주파 전자 노이즈
    _oscNodes.push(_filteredNoise(ctx, 'highpass', 7500, 1, 0.006));

    const myStage = _stage;
    function beep() {
      if (_stage !== myStage) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = Math.random() > 0.5 ? 880 : 1320;
      g.gain.setValueAtTime(0.038, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.15);
      setTimeout(beep, 5000 + Math.random() * 9000);
    }
    setTimeout(beep, 2500);
  }

  function _mansion(ctx) {
    // 빗소리
    _oscNodes.push(_filteredNoise(ctx, 'highpass', 4500, 0.4, 0.022));
    // 저역 바람
    _oscNodes.push(_filteredNoise(ctx, 'bandpass', 180,  0.5, 0.015));

    // 시계 째깍 (1.9초 간격)
    const myStage = _stage;
    function tick() {
      if (_stage !== myStage) return;
      _impulseTick(ctx, 0.004, 0.28);
      setTimeout(tick, 1900);
    }
    setTimeout(tick, 900);
  }

  function _detective(ctx) {
    // 밤비 / 도시 비
    _oscNodes.push(_filteredNoise(ctx, 'bandpass', 2800, 0.35, 0.016));
    // 저음 시가 허밍
    _oscNodes.push(_filteredNoise(ctx, 'lowpass', 75, 1, 0.028));

    const myStage = _stage;
    function typeClick() {
      if (_stage !== myStage) return;
      const count = Math.random() > 0.55 ? Math.floor(Math.random() * 5) + 2 : 1;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (_stage !== myStage) return;
          _impulseTick(ctx, 0.002, 0.22);
        }, i * (55 + Math.random() * 45));
      }
      setTimeout(typeClick, 3500 + Math.random() * 8000);
    }
    setTimeout(typeClick, 1800);
  }

  return { play, stop };
})();

// ═══════════════════════════════════════════════════════════
//  PENALTY
// ═══════════════════════════════════════════════════════════
const Penalty = (() => {
  let _active = false;

  function trigger() {
    Audio.error();
    if (_active) return;
    _active = true;

    // 시간 패널티 (난이도별)
    const secs = { easy: 0, normal: 15, hard: 30 }[Difficulty.get()] ?? 15;
    if (secs > 0) Game.addTime(secs);

    // 화면 흔들기 + 붉은 플래시
    const root = document.getElementById('game-root');
    root.classList.add('penalty-shake');

    const flash = document.getElementById('penalty-flash');
    if (flash) { flash.style.animation = 'none'; void flash.offsetWidth; flash.style.animation = ''; }

    // HUD 패널티 표시
    if (secs > 0) {
      const ind = document.getElementById('penalty-indicator');
      if (ind) {
        ind.textContent = `⚠ +${secs}초 패널티`;
        ind.classList.add('show');
        setTimeout(() => ind.classList.remove('show'), 2400);
      }
    }

    setTimeout(() => { root.classList.remove('penalty-shake'); _active = false; }, 520);
  }

  return { trigger };
})();

// ═══════════════════════════════════════════════════════════
//  STORE
// ═══════════════════════════════════════════════════════════
const Store = (() => {
  const s = {
    stage: 0,           // 0=temple, 1=space, 2=mansion, 3=detective
    inventory: [],
    selectedItem: null,
    flags: {
      temple: { muralRead:false, skullRead:false, dialSolved:false, gearUsed:false, floorRead:false, noteRead:false },
      space:  { sparkRead:false, lockerOpen:false, wireFixed:false, hacked:false, stickerRead:false, floorStickerRead:false },
      mansion:{ mirrorRead:false, cipherSolved:false, crystalTaken:false, doorOpen:false, scrollRead:false },
      detective: { boardRead:false, typewriterRead:false, phoneUsed:false, safeSolved:false, newspaperRead:false, floorNoteRead:false }
    }
  };
  const listeners = [];
  function notify(key, val) { listeners.forEach(fn => fn(key, val, s)); }
  return {
    state: s,
    on: fn => listeners.push(fn),
    setFlag: (stage, key, val) => { s.flags[stage][key] = val; notify('flag', {stage,key,val}); },
    addItem: item => { if (!s.inventory.find(i=>i.id===item.id)) { s.inventory.push(item); notify('inventory', s.inventory); } },
    removeItem: id => { s.inventory = s.inventory.filter(i=>i.id!==id); notify('inventory', s.inventory); },
    clearInventory: () => { s.inventory = []; s.selectedItem = null; notify('inventory', s.inventory); },
    selectItem: id => { s.selectedItem = s.selectedItem===id ? null : id; notify('selected', id); }
  };
})();

// ═══════════════════════════════════════════════════════════
//  EASTER EGG
// ═══════════════════════════════════════════════════════════
const EasterEgg = (() => {
  const _found = new Set();

  const EGGS = {
    konami: {
      title: '[ 균열 이전의 기록 ]',
      text:
        '이 기록은 존재하지 않는다.\n\n' +
        '시간의 균열은 사고가 아니었다.\n' +
        '누군가 의도적으로 문을 열었다.\n\n' +
        '그 사람의 이름은 — 지워졌다.\n\n' +
        '균열을 닫으러 온 자가\n' +
        '균열을 만든 자와\n' +
        '같은 사람인지 확인하라.\n\n\n' +
        '— 시간 감시자 제0호',
      stage: 'secret',
    },
    terminal: {
      title: '[ 기밀 파일 ZERO-POINT ]',
      text:
        '분류: 최고 기밀  /  열람 권한: 없음\n\n' +
        '기록 일자: [삭제됨]\n' +
        '사건명: FRACTURE EVENT\n\n' +
        '원인: 제4공간 실험 중\n' +
        '      시간 좌표 [██████] 충돌\n\n' +
        '사상자: [데이터 손상]\n' +
        '균열 수: 특정 불가\n\n' +
        '경고 —\n' +
        '균열을 봉합하는 자는\n' +
        '균열을 일으킨 자와\n' +
        '동일인일 가능성이 있음.\n\n' +
        '파일 자동 삭제 중 ...',
      stage: 'secret',
    },
    temple_seq: {
      title: '[ 제단 아래 새겨진 문자 ]',
      text:
        '"균열을 처음 연 자는\n' +
        ' 신이 아니었다.\n\n' +
        ' 열쇠를 찾는 자에게 묻노라 —\n\n' +
        ' 너는 닫으러 왔는가,\n' +
        ' 아니면 더 열러 왔는가?"\n\n\n' +
        '— 기원전 ???년, 작자 미상',
      stage: 'temple',
    },
    space_seq: {
      title: '[ 승무원 개인 기록 — 암호화 해제 ]',
      text:
        '날짜: [판독 불가]\n' +
        '작성자: 수석 엔지니어 K\n\n' +
        '오늘 세 번째 균열이 선내에\n' +
        '나타났다. 처음에는 작았다.\n' +
        '지금은 ... 나를 보고 있는 것 같다.\n\n' +
        '통신은 끊겼다.\n' +
        '지구는 응답하지 않는다.\n' +
        '어쩌면 지구도 이미 —',
      stage: 'space',
    },
    mansion_seq: {
      title: '[ 초상화 뒷면의 메모 ]',
      text:
        '이 집의 첫 번째 주인은\n' +
        '균열을 "문"이라 불렀다.\n\n' +
        '그는 매일 밤 거울 앞에 서서\n' +
        '"반대편에는 무엇이 있는가"\n' +
        '라고 물었다고 한다.\n\n' +
        '어느 날 아침,\n' +
        '그는 사라졌다.\n' +
        '거울만 남겨두고.',
      stage: 'mansion',
    },
    detective_seq: {
      title: '[ 미완성 수사 보고서 ]',
      text:
        '사건번호: ████-FRACTURE\n' +
        '담당: [이름 불명]  /  상태: 미제\n\n' +
        '단서 1: 균열은 장소를 선택한다.\n' +
        '단서 2: 균열은 사람을 선택한다.\n' +
        '단서 3: 이 보고서를 쓰는 나도\n' +
        '         이미 선택받았다.\n\n' +
        '결론: 탈출하라.\n' +
        '      이 사건을 닫아라.\n\n' +
        '— 마지막 페이지는 찢겨 있다',
      stage: 'detective',
    },
  };

  function _reveal(id) {
    if (_found.has(id)) return;
    _found.add(id);
    const egg = EGGS[id];
    if (!egg) return;
    Audio.unlock();
    NotePopup.show(egg.title, egg.text, egg.stage);
    log('??? 숨겨진 기록이 발견됐다.', '#c060ff');
  }

  // ── 1. 코나미 코드 (↑↑↓↓←→←→BA)
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let _ki = 0;
  document.addEventListener('keydown', e => {
    _ki = (e.key === KONAMI[_ki]) ? _ki + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (_ki === KONAMI.length) { _ki = 0; _reveal('konami'); }
  });

  // ── 2. 스테이지별 오브젝트 순서 클릭
  const SEQS = {
    0: { ids: ['obj-skull',    'obj-mural',      'obj-stone-tablet'], egg: 'temple_seq'    },
    1: { ids: ['obj-sparks',   'obj-console',    'obj-locker'],       egg: 'space_seq'     },
    2: { ids: ['obj-portrait', 'obj-mirror',     'obj-crystals'],     egg: 'mansion_seq'   },
    3: { ids: ['obj-corkboard','obj-typewriter', 'obj-phone'],        egg: 'detective_seq' },
  };
  const _si = { 0: 0, 1: 0, 2: 0, 3: 0 };

  document.addEventListener('click', e => {
    const el = e.target.closest('[id^="obj-"]');
    if (!el) return;
    const stage = Store.state.stage;
    const seq = SEQS[stage];
    if (!seq) return;
    if (el.id === seq.ids[_si[stage]]) {
      _si[stage]++;
      if (_si[stage] === seq.ids.length) { _si[stage] = 0; _reveal(seq.egg); }
    } else {
      _si[stage] = (el.id === seq.ids[0]) ? 1 : 0;
    }
  }, true);

  // ── 3. 터미널 커맨드 (우주선 스테이지)
  function checkTerminal(cmd) {
    if (cmd.toLowerCase() === 'fracture') { _reveal('terminal'); return true; }
    return false;
  }

  return { checkTerminal };
})();

// ═══════════════════════════════════════════════════════════
//  GAME CONTROLLER
// ═══════════════════════════════════════════════════════════
const Game = (() => {
  // ── timer
  let timerInterval, elapsedSeconds = 0;
  let _hoverListenerAdded = false;
  function startTimer() {
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      const m = String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
      const s = String(elapsedSeconds%60).padStart(2,'0');
      document.getElementById('hud-timer').textContent = `${m}:${s}`;
    }, 1000);
  }

  // ── log
  let logTimer;
  function log(msg, color='#ccc') {
    clearTimeout(logTimer);
    const el = document.getElementById('log-overlay');
    el.style.color = color;
    el.style.borderColor = color==='#ccc' ? '#333' : color;
    el.classList.add('visible');
    document.querySelectorAll('.ix-active').forEach(m => m.classList.add('ix-paused'));
    // typewriter
    el.textContent = '';
    let i = 0;
    function type() {
      if (i < msg.length) { el.textContent += msg[i++]; logTimer = setTimeout(type, 18); }
      else {
        logTimer = setTimeout(() => {
          el.classList.remove('visible');
          const anyOpen = document.querySelectorAll('.modal-overlay.open').length > 0;
          const noteOpen = document.getElementById('note-popup-overlay')?.classList.contains('open');
          if (!anyOpen && !noteOpen) {
            document.querySelectorAll('.ix-active').forEach(m => m.classList.remove('ix-paused'));
          }
        }, 4500);
      }
    }
    type();
  }

  // ── inventory render
  function renderInv() {
    const el = document.getElementById('inv-slots');
    el.innerHTML = '';
    Store.state.inventory.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (Store.state.selectedItem===item.id ? ' selected' : '');
      slot.title = item.name;
      slot.textContent = item.icon;
      const lbl = document.createElement('div');
      lbl.className = 'inv-slot-label';
      lbl.textContent = item.name;
      slot.appendChild(lbl);
      slot.onclick = () => { Audio.click(); Store.selectItem(item.id); renderInv(); };
      el.appendChild(slot);
    });
  }

  // ── HUD
  function updateHud(stageIdx) {
    const stages = ['STAGE I','STAGE II','STAGE III','STAGE IV'];
    const names  = ['고대 신전 — 봉인의 방','우주 정거장 — 제어실','마법사 저택 — 서재','탐정 사무소 — 수사실'];
    document.getElementById('hud-stage').textContent = stages[stageIdx];
    document.getElementById('hud-title').textContent  = names[stageIdx];
  }

  // ── scene switch
  function switchScene(id) {
    document.querySelectorAll('.scene').forEach(s=>s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // ── modal helpers
  function openModal(id) {
    document.getElementById(id).classList.add('open');
    // 모달 열리면 마커 숨김 (비밀번호 입력 시 깜빡임 방지)
    document.querySelectorAll('.ix-active').forEach(m => m.classList.add('ix-paused'));
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    // 열린 모달이 없으면 마커 복원
    const anyOpen = document.querySelectorAll('.modal-overlay.open').length > 0;
    if (!anyOpen) {
      document.querySelectorAll('.ix-active').forEach(m => m.classList.remove('ix-paused'));
    }
  }

  // ── 아이템 사용 가드: 선택된 아이템을 받지 않는 오브젝트에 메시지 표시
  function _wrapObjsWithItemGuard(ids, skipSet) {
    ids.forEach(id => {
      if (skipSet && skipSet[id]) return;
      const el = document.getElementById(id);
      if (!el) return;
      const orig = el.onclick;
      el.onclick = function(ev) {
        if (Store.state.selectedItem) {
          log('여기에 사용하는 것이 아닌거 같다.', '#888');
          Audio.error();
          return;
        }
        if (orig) orig.call(this, ev);
      };
    });
  }

  // ═══════════════════════════
  //  STAGE 1: TEMPLE
  // ═══════════════════════════
  function initTemple() {
    // 마커 부착
    clearMarkers();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ['obj-mural', 'obj-skull', 'obj-pedestal', 'obj-door-temple', 'obj-floor-stone', 'obj-explorer-note', 'obj-hanzi-note', 'obj-stone-tablet'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) addMarker(el);
      });
    }));
    updateHud(0);

    // 매 게임마다 랜덤 정답 생성 (dial 빌드 전에 먼저 생성)
    if (!window._dialAnswer) {
      const _d = () => Math.floor(Math.random()*9)+1;
      let _nums = [];
      while(_nums.length < 4){ const n=_d(); if(!_nums.includes(n)) _nums.push(n); }
      window._dialAnswer = _nums.join('');
      window._dialHints = _nums;
      window._muralHintText = `벽화에 네 가지 상형문자가 새겨져 있다. 🌅 태양(시작)=${_nums[0]}, 💀 해골(죽음)=${_nums[1]}, 🌙 달(쌍둥이)=${_nums[2]}, ∞ 무한(고리)=${_nums[3]}. 순서대로 조합하라.`;
      window._skullHintText = `해골의 빈 눈구멍에 숫자가 새겨져 있다: ${_nums[0]}, ${_nums[1]}, ${_nums[2]}, ${_nums[3]}. 벽화의 문자 순서와 일치한다.`;
    }

    // 벽화 이모지 채우기
    const muralGlyphs = ['🌅', '💀', '🌙', '∞'];
    muralGlyphs.forEach((g, i) => {
      const el = document.getElementById(`mural-g${i}`);
      if (el) el.textContent = g;
    });

    document.getElementById('obj-hanzi-note').onclick = () => {
      Audio.click();
      const easy   = `수 체계 해독 메모:\n\n壹 = 하나 = 1\n貳 = 둘   = 2\n參 = 셋   = 3\n肆 = 넷   = 4\n\n석판의 숫자 순서대로\n다이얼을 돌려라.`;
      const normal = `낡은 메모 — 고대 수 체계:\n\n壹 · 貳 · 參 · 肆\n\n이 문자들은 순서를 나타낸다.\n하나, 둘, 셋, 넷에 해당하는\n고대 한자 수 표기다.`;
      const hard   = `마모된 메모:\n\n壹 · 貳 · 參 · 肆\n\n(해독 불가 — 일부 훼손)`;
      NotePopup.show('고대 수 체계 메모', getDiffText(easy, normal, hard), 'temple');
      HintJournal.add(getDiffText(
        '壹=1, 貳=2, 參=3, 肆=4 (고대 한자 수 표기). 석판의 순서대로 다이얼에 입력하라.',
        '석판의 壹·貳·參·肆는 고대 한자로 첫째·둘째·셋째·넷째를 뜻한다.',
        '壹貳參肆 — 고대 수 체계. 그 이상은 스스로.'
      ), 0);
    };

    document.getElementById('obj-mural').onclick = () => {
      Audio.click();
      Store.setFlag('temple','muralRead',true);
      const msg = getDiffText(
        '벽화에 기호 순서: 🌅태양, 💀해골, 🌙달, ∞무한. 각 기호에 해당하는 숫자를 해골에서, 입력 순서를 석판에서 확인하라.',
        '벽화에 네 가지 상형문자가 새겨져 있다. 🌅 태양, 💀 해골, 🌙 달, ∞ 무한의 고리. 각 문자 아래 희미하게 숫자가 있지만... 바닥의 석판이 더 많은 것을 알고 있을지도.',
        '빛바랜 벽화다. 네 가지 기호가 새겨져 있다.'
      );
      log(msg, '#c8a84b');
      HintJournal.add(getDiffText(
        '벽화: 🌅태양·💀해골·🌙달·∞무한 — 기호 순서대로 다이얼을 맞춰라.',
        '벽화: 🌅태양 · 💀해골 · 🌙달 · ∞무한. 기호 순서대로 제단의 다이얼을 맞춰야 한다.',
        '벽화에 네 가지 기호가 있다.'
      ), 0);
    };

    document.getElementById('obj-skull').onclick = () => {
      Audio.click();
      Store.setFlag('temple','skullRead',true);
      if (!Store.state.inventory.find(i=>i.id==='bone_fragment')) {
        Store.addItem({id:'bone_fragment', icon:'🦴', name:'뼛조각'});
        const n = window._dialHints;
        if (Difficulty.get() === 'easy') {
          log(`해골 아래에서 뼛조각이 굴러 나왔다. 횃불에 비춰보니 눈구멍에 숫자가 선명하게 새겨져 있다: ${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}.`, '#c8a84b');
          HintJournal.add(`해골 각인: ${n[0]}, ${n[1]}, ${n[2]}, ${n[3]} — 석판의 기호 순서대로 다이얼에 입력하라.`, 0);
        } else {
          log('해골 아래에서 뼛조각이 굴러 나왔다. 텅 빈 눈구멍 안쪽에 희미한 각인이 보인다. 숫자 네 개가 새겨져 있는 것 같은데... 빛이 부족해 제대로 읽기 어렵다.', '#c8a84b');
          HintJournal.add('해골: 눈구멍 안에 숫자가 새겨져 있다. 빛이 있어야 읽을 수 있을 것 같다.', 0);
        }
      } else {
        const n = window._dialHints;
        const needBoth = Difficulty.get() === 'hard';
        const canRead  = needBoth
          ? (Store.state.flags.temple.floorRead && Store.state.flags.temple.noteRead)
          : (Store.state.flags.temple.floorRead || Store.state.flags.temple.noteRead);
        if (canRead || Difficulty.get() === 'easy') {
          log(`횃불 빛에 비춰보니 눈구멍에 새겨진 숫자가 보인다: ${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}. 어떤 순서로 써야 할지는... 석판과 벽화를 보라.`, '#c8a84b');
          HintJournal.add(`해골 각인: ${n[0]}, ${n[1]}, ${n[2]}, ${n[3]} — 석판의 기호 순서와 조합하라.`, 0);
        } else {
          log(getDiffText(
            `눈구멍에 숫자가 보인다: ${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}.`,
            '눈구멍에 뭔가 새겨져 있다. 주변에 횃불이 있는데... 다른 단서를 먼저 찾아봐야 할 것 같다.',
            '눈구멍에 각인이 있다. 하지만 아직 읽을 수 없다. 모든 단서를 먼저 찾아라.'
          ), '#888');
        }
      }
    };

    // ★ 바닥 석판 — 순서만 암시, 기호 이름은 벽화에서 확인해야
    document.getElementById('obj-floor-stone').onclick = () => {
      Audio.click();
      Store.setFlag('temple','floorRead',true);
      const stoneBody = getDiffText(
        `석판에 새겨진 순서표:\n\n  1(壹)  ☉  태양\n  2(貳)  骨  해골\n  3(參)  ☽  달\n  4(肆)  ∞  무한\n\n이 순서대로 다이얼을 돌려라.\n숫자는 해골에서 찾아라.`,
        `마모된 석판에 새겨진 문자:\n\n  壹  ☉\n  貳  骨\n  參  ☽\n  肆  ∞\n\n"하늘의 것이 먼저,\n 땅의 것이 나중이니라."`,
        `마모된 석판:\n\n  壹  ☉\n  貳  骨\n  參  ☽\n  肆  ∞`
      );
      NotePopup.show('고대 석판', stoneBody, 'temple');
      HintJournal.add(getDiffText(
        '석판: 1(壹)☉ · 2(貳)骨 · 3(參)☽ · 4(肆)∞ — 이 순서대로 다이얼에 입력하라.',
        '석판: 壹(1)☉ 貳(2)骨 參(3)☽ 肆(4)∞ — 벽화의 기호 이름과 대조하라.',
        '석판: 壹·貳·參·肆 — 기호의 순서.'
      ), 0);
    };

    // ★ 탐험가 메모 — 숫자 직접 노출 없이, 해골+벽화+석판 조합을 유도
    document.getElementById('obj-explorer-note').onclick = () => {
      Audio.click();
      Store.setFlag('temple','noteRead',true);
      const title = '탐험가 노트 — E.V.';
      const body = getDiffText(
        `이 사원을 탐험한 지 사흘째.\n\n세 가지 단서가 답을 완성한다:\n\n① 해골 눈구멍 → 숫자 4개\n② 벽화 → 기호의 이름\n   (태양·해골·달·무한)\n③ 석판 → 기호의 순서\n   (壹=1번째, 貳=2번째...)\n\n세 단서를 합쳐\n다이얼을 열어라.\n                — E.V.`,
        `이 사원을 탐험한 지 사흘째.\n\n제단의 봉인을 풀려면\n네 기호의 수를 알아야 한다.\n\n해골이 모든 수를 품고 있다.\n벽화가 기호의 이름을 말한다.\n석판이 기호의 순서를 새긴다.\n\n셋을 합쳐야 비로소\n문이 열리리라.\n                — E.V.`,
        `사흘째.\n\n셋을 합쳐야 한다.\n그것으로 충분하다.\n                — E.V.`
      );
      NotePopup.show(title, body, 'temple');
      HintJournal.add(getDiffText(
        '탐험가 메모: ①해골=숫자 ②벽화=기호이름 ③석판=순서. 셋을 조합해 다이얼을 열어라.',
        '탐험가 메모: 해골(수) + 벽화(이름) + 석판(순서) 세 가지를 조합하라.',
        '탐험가 메모: 셋을 합쳐야 한다.'
      ), 0);
    };

    // Build dial
    const row = document.getElementById('dial-row');
    row.innerHTML = '';
    [0,1,2,3].forEach(i => {
      const cell = document.createElement('div');
      cell.className = 'dial-cell';
      cell.innerHTML = `
        <button class="dial-up" onclick="Game.dialChange(${i},1)">▲</button>
        <div class="dial-display" id="dial-${i}">0</div>
        <button class="dial-down" onclick="Game.dialChange(${i},-1)">▼</button>`;
      row.appendChild(cell);
    });
    window._dialVals = [0,0,0,0];

    document.getElementById('obj-pedestal').onclick = () => {
      Audio.click();
      if (Store.state.flags.temple.dialSolved) { log('이미 해제된 제단이다.','#555'); return; }
      const hasHint = Store.state.flags.temple.skullRead &&
                      (Store.state.flags.temple.noteRead || Store.state.flags.temple.floorRead);
      if (!Store.state.flags.temple.skullRead) {
        log('제단에 4자리 다이얼이 있다. 해골과 벽화를 먼저 살펴봐야 할 것 같다.','#888');
      } else if (!Store.state.flags.temple.noteRead && !Store.state.flags.temple.floorRead) {
        log('해골의 숫자는 알았지만, 어떤 순서로 입력해야 하는지 모르겠다. 다른 단서가 더 있을 것이다.','#888');
      } else {
        if (window._dialHints) {
          document.getElementById('dial-hint').textContent =
            '벽화의 기호 순서대로, 해골에서 찾은 숫자를 입력하라.';
          document.getElementById('dial-hint').style.color = '#666';
        }
        openModal('modal-dial');
      }
    };

    document.getElementById('obj-stone-tablet').onclick = () => {
      Audio.click();
      log(
        '비석에 고대 문자와 후대에 덧씌운 낡은 글씨가 새겨져 있다:\n\n' +
        '"균열은 처음이 아니다. 우리보다 앞선 자가 있었고,\n' +
        '우리 뒤에도 올 것이다. 균열은 시간을 먹는다.\n' +
        '빠져나가는 유일한 법은 — 문을 여는 것이다.\n\n' +
        '— 제5 사제 카엘, 기원전 2,800년 추정"',
        '#8b6000'
      );
      HintJournal.add('돌 비석: 균열은 반복된다. 다음 자도 같은 길을 걸을 것이다. [스토리]', 0);
    };

    document.getElementById('obj-door-temple').onclick = (ev) => {
      Audio.click();
      if (Store.state.selectedItem && Store.state.selectedItem !== 'gear') {
        log('여기에 사용하는 것이 아닌거 같다.', '#888');
        Audio.error();
        return;
      }
      if (Store.state.selectedItem === 'gear') {
        if (!Store.state.flags.temple.dialSolved) {
          log('문에 톱니 홈이 있다. 하지만 제단의 봉인을 먼저 해제해야 할 것 같다.','#888');
          return;
        }
        Audio.unlock();
        Store.setFlag('temple','gearUsed',true);
        Store.removeItem('gear');
        Store.selectItem(null);
        renderInv();
        log('기어를 홈에 끼우자 거대한 돌문이 천천히 열렸다! 차가운 공기가 쏟아진다...','#c8a84b');
        setTimeout(() => {
          closeModal('modal-clear');
          showClear(0);
        }, 1200);
      } else if (Store.state.flags.temple.gearUsed) {
        log('문이 이미 열려 있다.','#555');
      } else {
        log('거대한 돌문이다. 톱니바퀴 모양의 홈이 파여 있다. 맞는 부품이 있어야 열릴 것 같다.','#888');
      }
    };
    // 아이템 가드: 신전에서 아이템을 사용할 수 없는 오브젝트들
    _wrapObjsWithItemGuard(
      ['obj-mural','obj-skull','obj-pedestal','obj-floor-stone','obj-explorer-note','obj-hanzi-note','obj-stone-tablet'],
      null
    );
  }

  window._dialVals = [0,0,0,0];
  function dialChange(idx, delta) {
    Audio.click();
    let v = (window._dialVals[idx] + delta + 10) % 10;
    window._dialVals[idx] = v;
    document.getElementById(`dial-${idx}`).textContent = v;
  }

  function checkDial() {
    const ans = window._dialVals.join('');
    // 랜덤 정답 확인
    if (ans === window._dialAnswer) {
      Audio.success();
      Store.setFlag('temple','dialSolved',true);
      Store.addItem({id:'gear', icon:'⚙️', name:'고대 기어'});
      renderInv();
      closeModal('modal-dial');
      log('딸깍! 제단의 봉인이 풀렸다. 내부에서 낡은 톱니바퀴가 굴러 나왔다.','#27c93f');
    } else {
      Penalty.trigger();
      document.getElementById('dial-hint').textContent = '잘못된 조합이다. 벽화와 해골의 숫자를 다시 연결해보라.';
      document.getElementById('dial-hint').style.color = '#b71c1c';
    }
  }

  // ═══════════════════════════
  //  STAGE 2: SPACE
  // ═══════════════════════════
  function initSpace() {
    // 마커 부착
    clearMarkers();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ['obj-sparks', 'obj-locker', 'obj-console', 'obj-airlock', 'obj-wall-sticker', 'obj-floor-sticker', 'obj-datapad'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) addMarker(el);
      });
    }));
    // 터미널 코드 랜덤 생성
    const _fibs = [1,1,2,3,5,8,13,21];
    const _primes = [2,3,5,7,11,13,17,19];
    const _fi = Math.floor(Math.random()*6)+1; // 1~6번째
    const _pi = Math.floor(Math.random()*4)+1; // 1~4번째
    window._termCode = String(_fibs[_fi-1]) + String(_primes[_pi-1]);
    window._termHint = `피보나치 수열 ${_fi}번째 항(${_fibs[_fi-1]})과 소수 ${_pi}번째 항(${_primes[_pi-1]})을 이어 붙여라.`;
    window._termFibs = _fibs; window._termPrimes = _primes;
    window._termFi = _fi; window._termPi = _pi;
    updateHud(1);
    // Stars
    const container = document.getElementById('space-stars');
    container.innerHTML = '';
    for (let i=0; i<80; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const sz = Math.random()*2+1;
      s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*70}%;left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${1+Math.random()*2}s`;
      container.appendChild(s);
    }

    // Typewriter keys for visual
    const kw = document.getElementById('typewriter-keys');
    if (kw) { kw.innerHTML = ''; for(let i=0;i<14;i++){const k=document.createElement('div');k.className='typewriter-key';kw.appendChild(k);} }

    document.getElementById('obj-sparks').onclick = () => {
      Audio.click();
      Store.setFlag('space','sparkRead',true);
      const txt = getDiffText(
        '손상된 배선 패널이다. 포트 번호에 3을 더하면 출력 번호가 된다. (P1→O4, P2→O5, P3→O6, P4→O7)',
        '손상된 배선 패널이다. 포트 번호와 출력 레이블이 뒤섞여 있다. 벽 어딘가에 규칙이 적혀 있을 것 같다...',
        '손상된 배선이다. 규칙은 스스로 찾아야 한다.'
      );
      log(txt,'#c8a84b');
      HintJournal.add(txt, 1);
    };

    // ★ 벽 스티커 메모 — 수열 항 번호 직접 노출 X, 콘솔 파일 탐색 유도
    document.getElementById('obj-wall-sticker').onclick = () => {
      Audio.click();
      Store.setFlag('space','stickerRead',true);
      const stickerBody = getDiffText(
        `비상 보안 코드 메모:\n\n피보나치 수열과 소수(Prime)\n각각 특정 항 하나씩을\n이어 붙이면 코드가 된다.\n\n정확한 항 번호는\n콘솔 → sequences.dat\n에서 확인 가능.\n\n                — Dr. K`,
        `비상시 보안 코드:\n\n두 수열에서 각각 하나씩,\n이어 붙이면 코드가 된다.\n\n어느 항인지는 내 파일에\n암호화해 저장해뒀다.\n\n콘솔 → sequences.dat\n\n                — Dr. K`,
        `코드는 두 수열에 있다.\n내 파일을 찾아라.\n                — Dr. K`
      );
      NotePopup.show('Dr. K 메모', stickerBody, 'space');
      HintJournal.add(getDiffText(
        'Dr.K: 피보나치+소수 각 1항씩 이어붙임. 콘솔에서 sequences.dat 확인.',
        'Dr.K: 두 수열 각 1항씩 이어붙임. sequences.dat에서 확인.',
        'Dr.K: 코드는 두 수열에 있다.'
      ), 1);
    };

    // ★ 바닥 스티커 메모 — 명령어 직접 노출 X, 터미널 존재만 암시
    document.getElementById('obj-floor-sticker').onclick = () => {
      Audio.click();
      Store.setFlag('space','floorStickerRead',true);
      const manualBody = getDiffText(
        `에어록 비상 잠금 해제\n\n전력 복구 후 메인 콘솔에서\n"override [코드]" 명령어로\n코드를 입력하면 잠금 해제.\n\n터미널 주요 명령:\nls · cat [파일] · override [코드]`,
        `에어록 비상 잠금 해제\n\n전력 복구 후\n메인 콘솔에서\n████ 명령어로\n코드를 입력하면\n잠금이 해제된다.\n\n콘솔에 help를 입력하면\n사용 가능한 명령이 표시됨`,
        `에어록 잠금 해제 절차\n(일부 훼손)\n\n전력... 콘솔... ████...\n코드... ████...`
      );
      NotePopup.show('비상 매뉴얼 (일부 훼손)', manualBody, 'space');
      HintJournal.add(getDiffText(
        '비상 매뉴얼: 전력 복구 → override [코드] 명령으로 에어록 해제.',
        '비상 매뉴얼: 전력 복구 → 콘솔 접속 → 코드 입력.',
        '비상 매뉴얼: 일부 훼손. 절차를 스스로 파악하라.'
      ), 1);
    };

    document.getElementById('obj-locker').onclick = () => {
      Audio.click();
      if (Store.state.flags.space.lockerOpen) {
        log('이미 열려있는 사물함이다. 안은 비어있다.','#555');
        return;
      }
      if (!Store.state.flags.space.sparkRead) {
        log('전자 잠금 장치가 걸려있다. 어딘가에 연결된 배선을 먼저 수리해야 할 것 같다.','#888');
        return;
      }
      initWire();
      openModal('modal-wire');
    };

    // Init terminal
    initTerminal();

    document.getElementById('obj-console').onclick = () => {
      Audio.click();
      if (Store.state.flags.space.hacked) { log('이미 시스템 권한을 장악했다. 에어록을 열 수 있다.','#555'); return; }
      if (!Store.state.flags.space.wireFixed) {
        log('메인 콘솔에 접근하려 했지만... 전력이 불안정하다. 전원을 먼저 복구해야 한다.','#888');
        return;
      }
      openModal('modal-term');
      document.getElementById('term-input').focus();
    };

    document.getElementById('obj-datapad').onclick = () => {
      Audio.click();
      log(
        '[개인 로그 — Cmdr. S. Yun, 2157.11.09]\n\n' +
        '이 "시공간 균열"의 파동 패턴이... 고대 신전 문양과 동일하다.\n' +
        '수천 년 전 누군가도 이 균열을 봤다. 그리고 메시지를 남겼다:\n' +
        '"다음 자여, 문을 열면 나아갈 수 있다."\n\n' +
        '나도 같은 말을 남긴다.\n' +
        '이 패드를 읽는 당신 — 포기하지 마라. 답은 이 방 안에 있다.\n\n' +
        '[배터리 잔량: 8%]',
        '#00bcd4'
      );
      HintJournal.add('데이터패드: S. 윤 대령 로그 — 균열 패턴이 고대 신전 문양과 동일하다. [스토리]', 1);
    };

    document.getElementById('obj-airlock').onclick = () => {
      Audio.click();
      if (Store.state.selectedItem) {
        log('여기에 사용하는 것이 아닌거 같다.', '#888');
        Audio.error();
        return;
      }
      if (Store.state.flags.space.hacked) {
        Audio.unlock();
        document.getElementById('airlock-light').classList.add('green');
        log('에어록이 열렸다! 차원 포탈이 활성화된다...','#27c93f');
        setTimeout(() => showClear(1), 1200);
      } else {
        Audio.error();
        log('에어록이 잠겨있다. 시스템 경고: UNAUTHORIZED ACCESS. 콘솔을 해킹해야 한다.','#b71c1c');
      }
    };
    // 아이템 가드: 우주 스테이션에서 아이템을 사용할 수 없는 오브젝트들
    _wrapObjsWithItemGuard(
      ['obj-sparks','obj-locker','obj-console','obj-wall-sticker','obj-floor-sticker','obj-datapad'],
      null
    );
  }

  // Wire puzzle
  let wireSel = null;
  let wireConnections = {};  // leftId -> rightId
  const wireCorrect = {'P1':'O4','P2':'O5','P3':'O6','P4':'O7'};
  // hint: left port번호 + 3 = right output번호

  function initWire() {
    wireSel = null; wireConnections = {};
    const board = document.getElementById('wire-board');
    const svg   = document.getElementById('wire-svg');
    svg.innerHTML = '';
    const left  = document.getElementById('wire-left');
    const right = document.getElementById('wire-right');
    left.innerHTML = ''; right.innerHTML = '';

    ['P1','P2','P3','P4'].forEach(id => {
      const n = document.createElement('div');
      n.className = 'wire-node'; n.id = 'wl-'+id; n.textContent = id;
      n.onclick = () => selectWireLeft(id);
      left.appendChild(n);
    });
    ['O4','O7','O6','O5'].forEach(id => {  // shuffled
      const n = document.createElement('div');
      n.className = 'wire-node'; n.id = 'wr-'+id; n.textContent = id;
      n.onclick = () => selectWireRight(id);
      right.appendChild(n);
    });
    document.getElementById('wire-status').textContent = '포트를 선택하고 출력을 연결하세요.';
  }

  function selectWireLeft(id) {
    Audio.click();
    document.querySelectorAll('#wire-left .wire-node').forEach(n=>n.classList.remove('selected'));
    document.getElementById('wl-'+id)?.classList.add('selected');
    wireSel = id;
  }

  function selectWireRight(id) {
    if (!wireSel) { log('먼저 왼쪽 포트를 선택하라.','#888'); return; }
    Audio.click();
    wireConnections[wireSel] = id;
    drawWires();
    const status = document.getElementById('wire-status');
    // Check all 4 connected
    if (Object.keys(wireConnections).length === 4) {
      const ok = Object.entries(wireConnections).every(([l,r]) => wireCorrect[l]===r);
      if (ok) {
        Audio.success();
        Store.setFlag('space','wireFixed',true);
        Store.setFlag('space','lockerOpen',true);
        Store.addItem({id:'keycard', icon:'💳', name:'비상 카드'});
        renderInv();
        status.style.color = '#27c93f';
        status.textContent = '배선 복구 완료! 사물함이 열렸다. 비상 출입 카드를 획득했다.';
        setTimeout(() => closeModal('modal-wire'), 1600);
      } else {
        Penalty.trigger();
        status.style.color = '#b71c1c';
        status.textContent = '배선 오류. 잘못된 연결이 있다. 다시 시도하라.';
        setTimeout(() => initWire(), 1200);
      }
    } else {
      status.textContent = `연결됨: ${Object.keys(wireConnections).length}/4`;
      document.getElementById('wl-'+wireSel)?.classList.add('connected');
      document.getElementById('wr-'+id)?.classList.add('connected');
      wireSel = null;
      document.querySelectorAll('#wire-left .wire-node').forEach(n=>n.classList.remove('selected'));
    }
  }

  function drawWires() {
    const svg = document.getElementById('wire-svg');
    svg.innerHTML = '';
    const board = document.getElementById('wire-board');
    const br = board.getBoundingClientRect();
    // game-root scale 보정
    const root  = document.getElementById('game-root');
    const scale = root ? root.getBoundingClientRect().width / 1024 : 1;
    Object.entries(wireConnections).forEach(([lid, rid]) => {
      const le = document.getElementById('wl-'+lid);
      const re = document.getElementById('wr-'+rid);
      if (!le || !re) return;
      const lr = le.getBoundingClientRect();
      const rr = re.getBoundingClientRect();
      const x1 = (lr.right  - br.left) / scale;
      const y1 = (lr.top + lr.height/2 - br.top) / scale;
      const x2 = (rr.left   - br.left) / scale;
      const y2 = (rr.top + rr.height/2 - br.top) / scale;
      const correct = wireCorrect[lid] === rid;
      const line = document.createElementNS('http://www.w3.org/2000/svg','path');
      const cx = (x1+x2)/2;
      line.setAttribute('d',`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`);
      line.setAttribute('class','wire-line' + (correct ? '' : ' wrong'));
      svg.appendChild(line);
    });
  }

  // Terminal FS — 동적 생성 (initSpace에서 호출)
  let termFS = {};
  let termBooted = false;

  function buildTermFS() {
    const fi = window._termFi || 6;
    const pi = window._termPi || 1;
    const fibs = window._termFibs || [1,1,2,3,5,8,13,21];
    const primes = window._termPrimes || [2,3,5,7,11,13,17,19];
    termFS = {
      'readme.txt': `FRACTURE-IV STATION :: EMERGENCY PROTOCOL
---
시스템이 침입 감지 모드에 들어갔다.
메인 에어록 잠금을 해제하려면 보안 코드가 필요하다.

코드 힌트:
- 파일 시스템을 탐색하라. (ls, cat)
- 코드는 두 수열의 특정 항을 조합한 것이다.
- override [코드] 명령으로 잠금을 해제하라.
`,
      'sequences.dat': `[수열 데이터베이스]
피보나치 수열:  1, 1, 2, 3, 5, 8, 13, 21, 34...
소수(Prime):    2, 3, 5, 7, 11, 13, 17, 19, 23...

메모 (항법사 Dr. K):
"보안코드는 피보나치 ${fi}번째 항(${fibs[fi-1]}), 그리고 소수 ${pi}번째 항(${primes[pi-1]})을 이어 붙인 것이다.
나 말고는 아무도 모른다. 가져가지 마라."
`,
      'locklog.sys': `[에어록 잠금 이력]
T-00:42 :: AIRLOCK_A :: LOCKED :: AUTH_FAIL x3
T-00:38 :: AIRLOCK_A :: LOCKED :: MANUAL_OVERRIDE_BLOCKED
T-00:21 :: AIRLOCK_B :: OPEN   :: CREW_EVAC
CURRENT  :: AIRLOCK_A :: LOCKED :: AWAITING_CODE

명령어: override [코드]
`
    };
  }

  function initTerminal() {
    buildTermFS(); // 랜덤 코드 기반으로 파일 내용 생성
    const out = document.getElementById('term-output');
    const inp = document.getElementById('term-input');
    if (!termBooted) {
      out.textContent = '';
      printTerm('SYS-OS v9.4.1 // BREACH PROTOCOL ACTIVE');
      printTerm('WARNING: Unauthorized access detected.');
      printTerm('Type "help" for available commands.\n');
      termBooted = true;
    }
    inp.onkeydown = e => {
      if (e.key !== 'Enter') return;
      const cmd = inp.value.trim();
      inp.value = '';
      printTerm(`root@fracture-IV:~$ ${cmd}`);
      processCmd(cmd);
    };
  }

  function printTerm(line) {
    const out = document.getElementById('term-output');
    out.textContent += line + '\n';
    out.scrollTop = out.scrollHeight;
  }

  function processCmd(raw) {
    const [cmd, ...args] = raw.trim().split(' ');
    switch(cmd.toLowerCase()) {
      case 'help':
        printTerm('commands: ls · cat [file] · override [code] · clear · exit\n');
        break;
      case 'ls':
        printTerm(Object.keys(termFS).join('  ') + '\n');
        break;
      case 'cat':
        if (!args[0]) { printTerm('usage: cat [filename]\n'); break; }
        if (termFS[args[0]]) { printTerm(termFS[args[0]]); }
        else { printTerm(`cat: ${args[0]}: No such file\n`); }
        break;
      case 'clear':
        document.getElementById('term-output').textContent = '';
        break;
      case 'override':
        if (!args[0]) { printTerm('usage: override [code]\n'); break; }
        if (args[0] === (window._termCode||'82')) {
          printTerm('AUTH: Verified. Decrypting...');
          printTerm('AIRLOCK_A :: UNLOCKED\n');
          Audio.success();
          Store.setFlag('space','hacked',true);
          setTimeout(() => closeModal('modal-term'), 1500);
        } else {
          Penalty.trigger();
          printTerm(`AUTH: DENIED. Code "${args[0]}" rejected.\n`);
        }
        break;
      case 'exit': case 'quit':
        closeModal('modal-term'); break;
      case 'fracture':
        if (EasterEgg.checkTerminal('fracture')) {
          printTerm('ACCESSING CLASSIFIED ARCHIVE ...\nACCESS GRANTED\n');
        }
        break;
      default:
        printTerm(`command not found: ${cmd}\n`);
    }
  }

  // ═══════════════════════════
  //  STAGE 3: MANSION
  // ═══════════════════════════
  function initMansion() {
    // 마커 부착
    clearMarkers();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ['obj-mirror', 'obj-spellbook', 'obj-crystals', 'obj-ritual-table', 'obj-secret-door', 'obj-scroll', 'obj-portrait'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) addMarker(el);
      });
    }));
    // 주문 단어 랜덤 선택
    const _words = ['CHAOS','FLAME','STONE','BLADE','STORM','NIGHT','CROWN','LIGHT','SHADOW','RAVEN'];
    window._cipherWord = _words[Math.floor(Math.random()*_words.length)];
    // 룬-숫자 매핑 랜덤 셔플
    const _allRunes = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
    const _shuffled = [..._allRunes].sort(()=>Math.random()-.5);
    window._cipherCells = window._cipherWord.split('').map((ch,i) => ({
      rune: _shuffled[i], num: ch.charCodeAt(0)-64, letter: ch
    }));
    window._cipherOrder = window._cipherCells.map(c=>c.rune).join(' → ');
    updateHud(2);

    document.getElementById('obj-mirror').onclick = () => {
      Audio.click();
      Store.setFlag('mansion','mirrorRead',true);
      const cells = window._cipherCells || [];
      // 룬과 숫자는 보여주되, 알파벳 변환은 플레이어가 직접 해야 함
      const runeList = cells.map(c => `  ${c.rune}  =  ${c.num}`).join('\n');
      const txt = `거울 표면에 반사된 이미지가 일렁인다. 룬 문자와 그 아래 숫자들이 보인다:\n\n${runeList}\n\n각 숫자가 무엇을 의미하는지는... 두루마리를 봐야 알 것 같다.`;
      log(txt, '#c8a84b');
      HintJournal.add(`거울: ${cells.map(c=>`${c.rune}=${c.num}`).join(', ')} — 두루마리의 법칙으로 해독하라.`, 2);
    };

    // ★ 두루마리 — 룬→숫자→알파벳 표 직접 X, 변환 법칙만
    document.getElementById('obj-scroll').onclick = () => {
      Audio.click();
      Store.setFlag('mansion','scrollRead',true);
      if (!Store.state.flags.mansion.mirrorRead) {
        log('오래된 두루마리다. 마법 문자 해독에 관한 내용인 것 같다. 거울을 먼저 봐야 이해할 수 있을 것 같다.', '#888');
        return;
      }
      const scrollBody = getDiffText(
        `룬 해독 법칙:\n\n룬 → 숫자 → 알파벳\n\nA=1, B=2, C=3 … Z=26\n알파벳의 순번이 숫자다.\n\n예) 숫자 3 = C, 숫자 1 = A\n\n거울에서 각 룬의 숫자를\n확인한 뒤 알파벳으로 변환,\n룬 순서대로 나열하면 정답.`,
        `고대 룬 해독의 법칙:\n\n각 룬은 고유한 수를 지닌다.\n그 수는 소리의 순서와 같다.\n\n소리의 첫째는 하나(1),\n소리의 스물여섯째는\n스물여섯(26).\n\n룬의 수를 알면\n그 소리를 알 수 있다.`,
        `고대 해독서:\n\n소리의 순서.\n그것이 법칙이다.`
      );
      NotePopup.show('마법 해독서 (고대 문자)', scrollBody, 'mansion');
      HintJournal.add(getDiffText(
        '두루마리: A=1, B=2…Z=26. 거울 룬의 숫자를 알파벳으로 변환, 순서대로 나열.',
        '두루마리: 룬→수→알파벳. 수=알파벳 순번(A=1,Z=26). 거울에서 룬과 수를 확인하라.',
        '두루마리: 소리의 순서. 법칙은 스스로.'
      ), 2);
    };

    document.getElementById('obj-spellbook').onclick = () => {
      Audio.click();
      if (Store.state.flags.mansion.cipherSolved) {
        log(`이미 해독한 마법서다. 주문은 ${window._cipherWord}.`, '#555');
        return;
      }
      if (!Store.state.flags.mansion.mirrorRead) {
        log('마법서가 황금 걸쇠로 잠겨있다. 무언가 더 알아야 열 수 있다.', '#888');
        return;
      }
      buildCipher();
      openModal('modal-cipher');
    };

    document.getElementById('obj-crystals').onclick = () => {
      Audio.click();
      if (!Store.state.inventory.find(i=>i.id==='crystal')) {
        if (Store.state.flags.mansion.cipherSolved) {
          Store.addItem({id:'crystal', icon:'🔮', name:'마법 수정'});
          renderInv();
          log('수정 하나가 손안에서 따뜻하게 빛난다. 마법 에너지가 느껴진다.', '#27c93f');
        } else {
          log('수정들이 차갑게 박혀있다. 마법서의 주문을 해독해야 에너지가 풀릴 것 같다.', '#888');
        }
      } else {
        log('이미 수정을 가지고 있다.', '#555');
      }
    };

    document.getElementById('obj-ritual-table').onclick = () => {
      Audio.click();
      const orderHint = window._cipherCells ? window._cipherCells.map(c=>c.rune).join(' → ') : '?';
      const txt = `제단 테이블에 초 세 개가 타오르고 있다. 테이블 다리에 새겨진 글씨: "룬의 순서는 소리의 순서다." 룬 순서: ${orderHint}`;
      log(txt, '#c8a84b');
      HintJournal.add(txt, 2);
    };

    document.getElementById('obj-portrait').onclick = () => {
      Audio.click();
      log(
        '초상화 뒷면에 작은 쪽지가 붙어있다:\n\n' +
        '"그림 속 인물: K 박사 (1842–?)\n' +
        '40년간 "시간의 균열"을 연구했다.\n' +
        '1892년 어느 날, 이 서재에서 사라졌다.\n\n' +
        '그의 마지막 메모:\n' +
        '"고대 사제, 미래의 비행사, 그리고 나.\n' +
        '우리는 같은 균열에 갇혔다. 균열은 시간을 가리지 않는다.\n' +
        '다음 방문자에게: 문을 열어라. 그것이 유일한 답이다."',
        '#a060f0'
      );
      HintJournal.add('초상화: K 박사 (1842–?) — 40년간 균열 연구 후 실종. "문을 열어라." [스토리]', 2);
    };

    document.getElementById('obj-secret-door').onclick = () => {
      Audio.click();
      if (Store.state.selectedItem && Store.state.selectedItem !== 'crystal') {
        log('여기에 사용하는 것이 아닌거 같다.', '#888');
        Audio.error();
        return;
      }
      if (Store.state.selectedItem === 'crystal') {
        if (!Store.state.flags.mansion.cipherSolved) {
          log('문이 미세하게 반응하지만 열리지 않는다. 마법서의 봉인을 먼저 풀어야 할 것 같다.', '#888');
          return;
        }
        Audio.unlock();
        Store.setFlag('mansion','doorOpen',true);
        Store.removeItem('crystal');
        Store.selectItem(null);
        renderInv();
        log('수정을 문에 갖다 대자 룬 문자들이 빛나며 비밀 통로가 열렸다!', '#27c93f');
        setTimeout(() => showClear(2), 1200);
      } else {
        log('벽에 균열이 있다. 마법 에너지를 가진 무언가가 필요하다.', '#888');
      }
    };
    // 아이템 가드: 저택에서 아이템을 사용할 수 없는 오브젝트들
    _wrapObjsWithItemGuard(
      ['obj-mirror','obj-spellbook','obj-crystals','obj-ritual-table','obj-scroll','obj-portrait'],
      null
    );
  }

  // ── Cipher puzzle
  // 룬 문자 → 알파벳 매핑, 정답은 "CHAOS"
  // 힌트: 거울(룬5개 ᚠᚢᚦᚨᚱ), 제단(소리의 순서=알파벳 순서)
  // 각 룬에 번호 부여: ᚠ=3(C), ᚢ=8(H), ᚦ=1(A), ᚨ=15(O), ᚱ=19(S)
  const cipherData = [
    {rune:'ᚠ', num:3,  letter:'C'},
    {rune:'ᚢ', num:8,  letter:'H'},
    {rune:'ᚦ', num:1,  letter:'A'},
    {rune:'ᚨ', num:15, letter:'O'},
    {rune:'ᚱ', num:19, letter:'S'},
  ];

  function buildCipher() {
    const grid = document.getElementById('cipher-grid');
    grid.innerHTML = '';
    const data = window._cipherCells || cipherData;
    // shuffle display order (not the answer)
    const shuffled = [...data].sort(() => Math.random()-0.5);
    shuffled.forEach(d => {
      const cell = document.createElement('div');
      cell.className = 'cipher-cell';
      cell.innerHTML = `<div class="cipher-letter">${d.rune}</div><div class="cipher-num">${d.num}</div>`;
      grid.appendChild(cell);
    });
    const orderStr = data.map(c=>c.rune).join(' → ');
    document.getElementById('cipher-clue').textContent =
      `힌트: 숫자→알파벳(A=1, B=2, ...). 룬 순서: ${orderStr}. 각 룬 번호로 알파벳을 찾아 순서대로 나열하라. 정답은 영문 5글자.`;
    document.getElementById('cipher-input').value = '';
    document.getElementById('cipher-status').textContent = '';
  }

  function checkCipher() {
    const val = document.getElementById('cipher-input').value.trim().toUpperCase();
    const answer = window._cipherWord || 'CHAOS';
    if (val === answer) {
      Audio.success();
      Store.setFlag('mansion','cipherSolved',true);
      closeModal('modal-cipher');
      log(`"${answer}" — 마법서의 봉인이 풀렸다. 페이지들이 저절로 넘어가며 주문이 울려 퍼진다.`, '#27c93f');
      document.getElementById('cipher-status').style.color = '#27c93f';
      document.getElementById('cipher-status').textContent = '해독 성공!';
    } else {
      Penalty.trigger();
      document.getElementById('cipher-status').style.color = '#b71c1c';
      document.getElementById('cipher-status').textContent = `오답: "${val}". 룬과 숫자의 대응을 다시 확인하라.`;
    }
  }

  // ═══════════════════════════
  //  STAGE 4: DETECTIVE
  // ═══════════════════════════
  function initDetective() {
    // 마커 부착
    clearMarkers();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ['obj-corkboard', 'obj-typewriter', 'obj-phone', 'obj-safe', 'obj-newspaper', 'obj-floor-note', 'obj-case-file'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) addMarker(el);
      });
    }));
    // 금고 번호 랜덤 생성: 소수a번째 × 소수b번째 + 피보나치c번째
    const _primes = [2,3,5,7,11,13]; const _fibs = [1,1,2,3,5,8,13];
    const _a = Math.floor(Math.random()*4)+2; // 2~5
    const _b = Math.floor(Math.random()*4)+1; // 1~4
    const _c = Math.floor(Math.random()*5)+1; // 1~5
    window._safeAns = _primes[_a-1] * _primes[_b-1] + _fibs[_c-1];
    window._safeHint = `소수 ${_a}번째(${_primes[_a-1]}) × 소수 ${_b}번째(${_primes[_b-1]}) + 피보나치 ${_c}번째(${_fibs[_c-1]}) = ?`;
    updateHud(3);

    // Build corkboard
    buildCorkboard();
    // Build typewriter keys
    const kw = document.getElementById('typewriter-keys');
    kw.innerHTML = '';
    for(let i=0;i<14;i++){const k=document.createElement('div');k.className='typewriter-key';kw.appendChild(k);}

    document.getElementById('obj-case-file').onclick = () => {
      Audio.click();
      log(
        '[수사 파일 — CASE #F-2024]\n\n' +
        '연관 실종 사건 목록:\n' +
        '• 기원전 2,800년 — 제5 사제 카엘 (소재 불명)\n' +
        '• 1892년 — K 박사, 저택 서재에서 실종\n' +
        '• 2157년 — Cmdr. S. 윤, 우주정거장에서 실종\n\n' +
        '공통점: 모두 "시공간 균열" 연구 또는 조사 중 사라짐.\n' +
        '모두 동일한 메시지를 남김: "다음 자여 — 문을 열어라."\n\n' +
        '이 파일을 읽고 있는 당신이 바로 그 다음 자다.\n' +
        '당신이 이 고리를 끊어야 한다.',
        '#c8a84b'
      );
      HintJournal.add('수사 파일: 3명의 전임자 모두 균열 연구 중 실종. 마지막 메시지: "문을 열어라." [스토리]', 3);
    };

    document.getElementById('obj-corkboard').onclick = () => {
      Audio.click();
      Store.setFlag('detective','boardRead',true);
      const boardTxt = getDiffText(
        '수사 게시판: 용의자 셋 — ALEK(빨간 핀), MIRA(파란 핀), CHEN(녹색 핀). ALEK에 타자기 지문이 있다. 타자기에 수식이 적혀있으니 그걸로 금고를 열어라.',
        '수사 게시판: 용의자 세 명 — ALEK(빨간 핀), MIRA(파란 핀), CHEN(녹색 핀). 핵심 실마리: "범인은 수식으로 메모하는 습관이 있었다." 타자기를 확인해보자.',
        '수사 게시판. 용의자가 있다. 범인의 흔적을 찾아라.'
      );
      log(boardTxt, '#c8a84b');
      HintJournal.add(getDiffText(
        '게시판: ALEK 타자기 지문 확인. 타자기의 수식으로 금고를 열어라.',
        '게시판: 범인은 타자기 사용자. 수식 메모 습관 있음.',
        '게시판: 범인의 흔적이 있다.'
      ), 3);
    };

    // ★ 신문 — 수식 구조 암시만, 항 번호 직접 X
    document.getElementById('obj-newspaper').onclick = () => {
      Audio.click();
      Store.setFlag('detective','newspaperRead',true);
      const newsBody = getDiffText(
        `[ 독자 퀴즈 코너 ]\n\n금고 번호 공식:\n소수 A번째 × 소수 B번째\n+ 피보나치 C번째 = 금고 번호\n\n소수: 2,3,5,7,11,13...\n피보나치: 1,1,2,3,5,8,13...\n\n정확한 A, B, C는\n타자기에서 확인하라.`,
        `[ 독자 퀴즈 코너 ]\n\n이 도시의 어느 금고는\n소수와 피보나치의 곱셈과\n덧셈으로 잠겨 있다.\n\n두 소수를 곱하고\n피보나치 하나를 더하면\n문이 열린다.\n\n정확한 항은\n범인의 메모에 있다.\n\n(여백에 누군가\n밑줄을 그었다)`,
        `[ 독자 퀴즈 코너 ]\n\n금고가 있다.\n수학이 열쇠다.\n\n(여백의 밑줄)`
      );
      NotePopup.show('DAILY CIPHER — 오늘의 수수께끼', newsBody, 'newspaper');
      HintJournal.add(getDiffText(
        '신문: 소수A×소수B+피보나치C = 금고 번호. 타자기에서 A,B,C 확인 후 계산.',
        '신문: 소수×소수+피보나치 = 금고 번호. 타자기에서 정확한 항 확인.',
        '신문: 수학이 열쇠다.'
      ), 3);
    };

    // ★ 바닥 탐문 메모 — 용의자 암시만, 수식 직접 언급 X
    document.getElementById('obj-floor-note').onclick = () => {
      Audio.click();
      Store.setFlag('detective','floorNoteRead',true);
      const floorNoteBody = getDiffText(
        `탐문 기록 #7\n\n목격자 진술:\n"ALEK는 항상 수식으로\n메모를 남겼어요.\n타자기를 애용했고요."\n\n→ 타자기를 클릭하면\n   금고 번호 수식이 나온다.`,
        `목격자 진술:\n\n"그 사람은 뭔가를\n항상 숫자로 표현했어요.\n암호 같은 걸 즐겨 썼고..."\n\n"타자기 소리가\n새벽까지 들렸습니다.\n뭔가 중요한 걸\n타이핑하는 것 같았어요."\n\n→ 타자기를 확인하라.`,
        `탐문 기록 #7\n\n"숫자... 타자기... 새벽..."\n\n(나머지 진술 훼손)`
      );
      NotePopup.show('탐문 기록 #7', floorNoteBody, 'detective');
      HintJournal.add(getDiffText(
        '탐문: ALEK가 타자기로 수식을 남겼다. 타자기를 클릭하면 금고 수식을 볼 수 있다.',
        '탐문: 범인은 숫자 암호를 즐겼다. 타자기에 단서가 있을 것.',
        '탐문: 타자기... 새벽... 단서는 희미하다.'
      ), 3);
    };

    document.getElementById('obj-typewriter').onclick = () => {
      Audio.click();
      Store.setFlag('detective','typewriterRead',true);
      if (!Store.state.flags.detective.boardRead && !Store.state.flags.detective.newspaperRead) {
        log('타자기에 무언가 타이핑되어 있다. 게시판이나 주변 단서를 먼저 살펴봐야 내용이 이해될 것 같다.', '#888');
        return;
      }
      // 수식은 보여주되 정답은 직접 안 줌 — 플레이어가 직접 계산해야
      const twTxt = getDiffText(
        `타이핑된 내용: "${window._safeHint}"\n서명: A.K.\n소수: 2,3,5,7,11,13... / 피보나치: 1,1,2,3,5,8,13... 직접 계산하라.`,
        `종이에 타이핑된 내용: "${window._safeHint}" 그리고 서명: A.K. — 계산은 스스로.`,
        `타자기에 서명만 남아있다: A.K. — 나머지는 스스로 찾아라.`
      );
      log(twTxt, '#c8a84b');
      HintJournal.add(getDiffText(
        `타자기: ${window._safeHint} (소수: 2,3,5,7… / 피보나치: 1,1,2,3,5,8…)`,
        `타자기: ${window._safeHint}`,
        '타자기: A.K. 서명. 수식은 다른 곳에서 찾아라.'
      ), 3);
    };

    document.getElementById('obj-phone').onclick = () => {
      Audio.click();
      Store.setFlag('detective','phoneUsed',true);
      if (!Store.state.flags.detective.typewriterRead) {
        log('전화를 들었지만 아무도 없다. 먼저 더 단서를 찾아야 한다.', '#888');
        return;
      }
      const p = _primes[_a-1], q = _primes[_b-1], f = _fibs[_c-1];
      const txt = `전화벨이 울린다. "금고를 열면 모든 게 끝난다... ${p} 곱하기 ${q} 더하기 ${f}. 직접 계산해봐."`;
      log(txt, '#c8a84b');
      HintJournal.add(`전화: ${p} × ${q} + ${f} = ?`, 3);
    };

    document.getElementById('obj-safe').onclick = () => {
      Audio.click();
      if (Store.state.selectedItem) {
        log('여기에 사용하는 것이 아닌거 같다.', '#888');
        Audio.error();
        return;
      }
      if (!Store.state.flags.detective.boardRead && !Store.state.flags.detective.newspaperRead) {
        log('금고다. 다이얼 자물쇠가 달려 있다. 단서를 더 찾아야 할 것 같다.', '#888');
        return;
      }
      if (!Store.state.flags.detective.typewriterRead) {
        log('번호를 알 것 같지만... 타자기의 정확한 수식을 먼저 확인해야 한다.', '#888');
        return;
      }
      openSafePuzzle();
    };
    // 아이템 가드: 탐정 사무소에서 아이템을 사용할 수 없는 오브젝트들
    _wrapObjsWithItemGuard(
      ['obj-corkboard','obj-typewriter','obj-phone','obj-newspaper','obj-floor-note','obj-case-file'],
      null
    );
  }

  // Safe puzzle — 답은 랜덤 (_safeAns)
  function openSafePuzzle() {
    // Reuse dial modal for safe
    document.querySelector('#modal-dial .modal-title').textContent = '탐정 사무소 — 금고 다이얼';
    document.getElementById('dial-hint').textContent = '타자기의 수식을 직접 계산해 입력하라.';
    document.getElementById('dial-hint').style.color = '#888';

    // Rebuild as 2-digit (or 3-digit if answer >= 100)
    const ans = window._safeAns || 40;
    const digits = String(ans).length;
    const row = document.getElementById('dial-row');
    row.innerHTML = '';
    window._dialVals = Array(digits).fill(0);
    window._safeMode = true;
    for (let i = 0; i < digits; i++) {
      const cell = document.createElement('div');
      cell.className = 'dial-cell';
      cell.innerHTML = `
        <button class="dial-up" onclick="Game.dialChange(${i},1)">▲</button>
        <div class="dial-display" id="dial-${i}">0</div>
        <button class="dial-down" onclick="Game.dialChange(${i},-1)">▼</button>`;
      row.appendChild(cell);
    }
    openModal('modal-dial');
  }

  function checkDial() {
    if (window._safeMode) {
      const ans = window._dialVals.join('');
      if (parseInt(ans) === (window._safeAns||40)) {
        Audio.unlock();
        Store.setFlag('detective','safeSolved',true);
        closeModal('modal-dial');
        window._safeMode = false;
        log('금고가 열렸다! 안에는 "시간 봉인 크리스탈"이 있다. 균열을 닫을 마지막 열쇠다!', '#27c93f');
        setTimeout(() => showClear(3), 1400);
      } else {
        Penalty.trigger();
        document.getElementById('dial-hint').style.color = '#b71c1c';
        document.getElementById('dial-hint').textContent = `오답: ${window._dialVals.join('')}. 계산을 다시 해보라.`;
      }
      return;
    }
    // Temple dial
    const ans = window._dialVals.join('');
    // 랜덤 정답 확인
    if (ans === window._dialAnswer) {
      Audio.success();
      Store.setFlag('temple','dialSolved',true);
      Store.addItem({id:'gear', icon:'⚙️', name:'고대 기어'});
      renderInv();
      closeModal('modal-dial');
      log('딸깍! 제단의 봉인이 풀렸다. 내부에서 낡은 톱니바퀴가 굴러 나왔다.','#27c93f');
    } else {
      Penalty.trigger();
      document.getElementById('dial-hint').textContent = '잘못된 조합이다. 벽화와 해골의 숫자를 다시 연결해보라.';
      document.getElementById('dial-hint').style.color = '#b71c1c';
    }
  }

  function buildCorkboard() {
    const board = document.getElementById('corkboard-inner');
    board.innerHTML = '';
    const pins = [
      {top:'20%',left:'15%',color:'#b71c1c'},
      {top:'30%',left:'55%',color:'#1565c0'},
      {top:'60%',left:'35%',color:'#1b5e20'},
    ];
    pins.forEach(p => {
      const pin = document.createElement('div');
      pin.className = 'cork-pin';
      pin.style.cssText = `top:${p.top};left:${p.left};background:${p.color};box-shadow:0 0 4px ${p.color}`;
      board.appendChild(pin);
    });
    const notes = [
      {top:'22%',left:'18%',text:'ALEK\n알리바이 없음\n타자기 지문'},
      {top:'32%',left:'58%',text:'MIRA\n오후 불명'},
      {top:'55%',left:'28%',text:'금고 번호\n= ?'},
    ];
    notes.forEach(n => {
      const note = document.createElement('div');
      note.className = 'cork-note';
      note.style.cssText = `top:${n.top};left:${n.left};white-space:pre-line`;
      note.textContent = n.text;
      board.appendChild(note);
    });
  }

  // ═══════════════════════════
  //  STAGE CLEAR / TRANSITIONS
  // ═══════════════════════════
  const clearData = [
    {
      icon:'⚙️', title:'봉인 해제 — 신전',
      story:'톱니바퀴가 맞물리며 차원의 문이 열렸다. 차가운 허공이 당신을 집어삼키고... 눈을 뜨자 금속 벽과 경고등이 보인다. 우주선 내부다.',
      next:'다음 차원: 우주 정거장 →'
    },
    {
      icon:'🚀', title:'탈출 성공 — 우주',
      story:'에어록이 열리며 차원 포탈이 소용돌이친다. 빨려 들어가는 순간, 고풍스러운 샹들리에와 마법 서적들이 보이기 시작한다...',
      next:'다음 차원: 마법사 저택 →'
    },
    {
      icon:'🔮', title:'봉인 해제 — 저택',
      story:'비밀 통로를 지나자 시간이 다시 흐른다. 눈앞에 낡은 탁자와 타자기, 그리고 가득 쌓인 수사 파일들. 마지막 차원이다.',
      next:'마지막 차원: 탐정 사무소 →'
    },
    {
      icon:'🏆', title:'균열 봉합 완료',
      story:'금고 안의 크리스탈이 눈부시게 빛난다. 네 차원의 에너지가 하나로 수렴하고, 시간의 균열이 봉합된다. 당신은 해냈다.',
      next:'엔딩 보기 →'
    }
  ];

  function showClear(stageIdx) {
    StageTimer.clearStage(elapsedSeconds);
    SaveSystem.save({
      version: 1,
      difficulty: Difficulty.get(),
      stage: stageIdx + 1,
      elapsedSeconds,
      stageTimes: StageTimer.getTimes(),
    });
    const d = clearData[stageIdx];
    document.getElementById('clear-icon').textContent  = d.icon;
    document.getElementById('clear-title').textContent = d.title;
    document.getElementById('clear-story').textContent = d.story;
    document.getElementById('clear-next-btn').textContent = d.next;
    window._clearStage = stageIdx;
    Audio.unlock();
    openModal('modal-clear');
  }


  // ── 인터랙션 마커 (테두리 방식) ──
  function addMarker(el) {
    el.classList.add('ix-active');
    return el;
  }
  function clearMarkers() {
    document.querySelectorAll('.ix-active').forEach(el => el.classList.remove('ix-active', 'ix-paused'));
  }

  function _addHoverSound() {
    if (_hoverListenerAdded) return;
    _hoverListenerAdded = true;
    document.getElementById('game-root').addEventListener('mouseover', e => {
      if (e.target.closest('.obj, .wall-note, .floor-inscription, .space-sticker, .newspaper, .det-note, .scroll-prop')) {
        Audio.hover();
      }
    }, { passive: true });
  }

  function nextStage() {
    clearMarkers();
    closeModal('modal-clear');
    const next = (window._clearStage ?? 0) + 1;
    if (next >= 4) { showEnding(); return; }
    HintJournal.clear();
    const scenes = ['temple','space','mansion','detective'];
    const inits  = [initTemple, initSpace, initMansion, initDetective];
    Store.clearInventory();
    SceneTransition.play(next - 1, () => {
      Store.state.stage = next;
      switchScene('scene-' + scenes[next]);
      StageTimer.startStage(elapsedSeconds);
      inits[next]();
      Ambient.play(next);
    });
  }

  function showEnding() {
    clearInterval(timerInterval);
    Ambient.stop();
    StageTimer.clearStage(elapsedSeconds);

    const m = String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
    const s = String(elapsedSeconds%60).padStart(2,'0');
    document.getElementById('end-time-display').textContent = `TOTAL: ${m}:${s}`;

    // 등급 계산
    const result = GradeSystem.calc(elapsedSeconds, HintRequest.getUsed(), Difficulty.get());
    const gradeEl = document.getElementById('end-grade-display');
    if (gradeEl) {
      gradeEl.innerHTML = `
        <div class="end-grade-letter" style="color:${result.color}">${result.grade}</div>
        <div class="end-grade-msg">${result.msg}</div>
        <div class="end-grade-detail">힌트 ${HintRequest.getUsed()}회 사용 · ${Difficulty.cfg().label} 모드</div>`;
    }

    // 스테이지별 클리어 타임
    const times = StageTimer.getTimes();
    const stageNames = ['신전','우주선','저택','사무소'];
    const timesEl = document.getElementById('end-stage-times');
    if (timesEl) {
      timesEl.innerHTML = times.map((t, i) => {
        const tm = String(Math.floor(t/60)).padStart(2,'0');
        const ts = String(t%60).padStart(2,'0');
        return `<div class="end-stage-row"><span>${stageNames[i]}</span><span>${tm}:${ts}</span></div>`;
      }).join('');
    }

    SaveSystem.clear();
    Cinematic.playOutro(() => openModal('modal-ending'));
  }

  // ═══════════════════════════
  //  PUBLIC
  // ═══════════════════════════
  return {
    start() {
      document.getElementById('title-screen').style.display = 'none';
      document.getElementById('game-wrap').style.display = 'block';
      Store.on((key) => {
        if (key==='inventory'||key==='selected') renderInv();
      });
      elapsedSeconds = 0;
      startTimer();
      StageTimer.reset();
      StageTimer.startStage(0);
      HintRequest.init();
      _addHoverSound();
      initTemple();
      Ambient.play(0);
      log('알 수 없는 사원에서 깨어났다. 주위를 살펴보자.', '#c8a84b');
    },

    continueGame() {
      const sv = SaveSystem.load();
      if (!sv) return;
      document.getElementById('title-screen').style.display = 'none';
      document.getElementById('game-wrap').style.display = 'block';
      Store.on((key) => {
        if (key==='inventory'||key==='selected') renderInv();
      });
      elapsedSeconds = sv.elapsedSeconds || 0;
      Difficulty.set(sv.difficulty || 'normal');
      StageTimer.reset();
      StageTimer.restore(sv.stageTimes || []);
      HintRequest.init();
      startTimer();
      _addHoverSound();
      const stageIdx = Math.min(sv.stage || 0, 3);
      Store.state.stage = stageIdx;
      const scenes = ['temple','space','mansion','detective'];
      switchScene('scene-' + scenes[stageIdx]);
      const inits = [initTemple, initSpace, initMansion, initDetective];
      StageTimer.startStage(elapsedSeconds);
      inits[stageIdx]();
      Ambient.play(stageIdx);
      log(`STAGE ${stageIdx + 1}부터 이어서 탈출을 시작한다.`, '#c8a84b');
    },
    addTime(secs) { elapsedSeconds += secs; },
    closeModal,
    dialChange,
    checkDial,
    checkCipher,
    nextStage,
    selectWireLeft,
    selectWireRight,
  };
})();

// ESC key closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      if (m.id !== 'modal-clear' && m.id !== 'modal-ending') {
        m.classList.remove('open');
      }
    });
  }
});