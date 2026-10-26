/* fracture-collapse.js — 제한 시간 경고 · 차원 붕괴 연출
 *
 *  TimeLimit : 남은 시간에 따라 화면이 서서히 위험해진다 (균열 · 붉은 테두리 · 심장 소리)
 *  Collapse  : 시간이 0이 되면 지금 보던 장면이 조각나 무너지고 '차원 붕괴' 화면이 나온다
 *
 *  fracture.js 의 Game(타이머)이 TimeLimit.update() 를 매초 부른다.
 *  Audio · Ambient · Game · SaveSystem · Difficulty · Store 는 fracture.js / fracture-systems.js 에 있다.
 */

const TimeLimit = (() => {
  let level = 'calm'; // 'calm' | 'warn' | 'danger'

  const root  = () => document.getElementById('game-root');
  const timer = () => document.getElementById('hud-timer');

  function apply(lv, crack) {
    const r = root(), t = timer();
    if (!r || !t) return;
    r.classList.toggle('time-warn',   lv === 'warn');
    r.classList.toggle('time-danger', lv === 'danger');
    t.classList.toggle('timer-warn',   lv === 'warn');
    t.classList.toggle('timer-danger', lv === 'danger');
    r.style.setProperty('--crack', crack.toFixed(3));
  }

  function reset() { level = 'calm'; apply('calm', 0); }

  // remain: 남은 초(null 이면 제한 없음), limit: 전체 제한 시간
  function update(remain, limit) {
    if (remain == null) { if (level !== 'calm') reset(); return; }
    if (remain <= 0) { Collapse.start(); return; }

    const ratio = remain / limit;
    const lv    = ratio <= 0.10 ? 'danger' : ratio <= 0.25 ? 'warn' : 'calm';
    // 균열은 25% 남았을 때부터 서서히 번져 10% 쯤에서 거의 화면을 덮는다
    const crack = Math.max(0, Math.min(1, (0.25 - ratio) / 0.15));
    apply(lv, crack);

    if (lv !== level) {
      if (lv === 'warn')   { Game.log('균열이 벌어지기 시작했다… 시간이 많지 않다.', '#e0a030'); Collapse.rumble(1.2, 0.35); }
      if (lv === 'danger') { Game.log('균열이 번진다! 이곳이 곧 무너진다!', '#ff3b30');       Collapse.rumble(1.6, 0.6); }
      level = lv;
    }

    // 위험 구간: 매초 심장 소리, 마지막 10초는 시계 소리까지
    if (lv === 'danger') {
      Audio.tone(55, 'sine', 0.35, 0.32);
      setTimeout(() => Audio.tone(48, 'sine', 0.3, 0.2), 170);
      if (remain <= 10) Audio.tone(1100, 'square', 0.05, 0.07);
    }
  }

  return { update, reset };
})();

const Collapse = (() => {
  let started = false;

  const reducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = sec => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

  // ── 소리 ────────────────────────────────────────────────
  // 지진처럼 낮게 울리는 소리 (갈색 소음 + 내려가는 필터)
  function rumble(dur = 2, vol = 0.8) {
    try {
      const c = Audio.getCtx();
      const n = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(420, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(60, c.currentTime + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(vol, c.currentTime + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    } catch (e) { /* 오디오를 쓸 수 없는 환경에서는 소리 없이 진행 */ }
  }
  function snap()  { Audio.tone(2300, 'square', 0.04, 0.12); Audio.tone(900, 'sawtooth', 0.07, 0.1); }
  function boom()  { Audio.tone(70, 'sine', 0.9, 0.5); Audio.tone(38, 'sawtooth', 1.2, 0.3); rumble(1.4, 1); }

  // ── 조각(shard) 만들기: 3×3 칸을 삐뚤게 나눈 다각형으로 현재 화면을 조각낸다 ──
  const GRID = [
    [[0, 0],   [36, 0],   [66, 0],   [100, 0]],
    [[0, 30],  [31, 36],  [70, 30],  [100, 34]],
    [[0, 68],  [38, 64],  [64, 70],  [100, 66]],
    [[0, 100], [34, 100], [68, 100], [100, 100]],
  ];

  function buildShards(overlay) {
    const wrap = document.getElementById('game-wrap');
    const layer = document.createElement('div');
    layer.className = 'shard-layer';
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const quad = [GRID[r][c], GRID[r][c + 1], GRID[r + 1][c + 1], GRID[r + 1][c]];
        const poly = quad.map(([x, y]) => `${x}% ${y}%`).join(', ');
        const shard = document.createElement('div');
        shard.className = 'shard';
        shard.style.clipPath = `polygon(${poly})`;
        // 위쪽 조각이 먼저, 아래쪽은 조금 늦게 떨어지고 방향·회전은 제각각
        shard.style.setProperty('--delay', `${(r * 0.18 + ((idx * 37) % 7) * 0.04).toFixed(2)}s`);
        shard.style.setProperty('--dur',   `${(1.5 + ((idx * 53) % 5) * 0.12).toFixed(2)}s`);
        shard.style.setProperty('--dx',    `${((idx * 71) % 9 - 4) * 26}`);
        shard.style.setProperty('--rot',   `${((idx * 29) % 11 - 5) * 7}`);
        const inner = document.createElement('div');
        inner.className = 'shard-inner';
        const copy = wrap.cloneNode(true);
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id')); // id 중복 방지
        copy.style.display = 'block';
        inner.appendChild(copy);
        shard.appendChild(inner);
        layer.appendChild(shard);
        idx++;
      }
    }
    overlay.appendChild(layer);
  }

  // ── 붕괴 시작 ───────────────────────────────────────────
  function start() {
    if (started) return;
    started = true;

    Game.stopTimer();
    Ambient.stop();
    SaveSystem.clear(); // 닫았다 다시 열어도 시간을 되돌릴 수 없게 저장 기록 삭제

    const stageIdx = (Store.state && Store.state.stage) || 0;
    const stageNames = ['고대 신전', '우주 정거장', '마법사 저택', '탐정 사무소'];

    const root = document.getElementById('game-root');
    const wrap = document.getElementById('game-wrap');
    const overlay = document.getElementById('collapse-overlay');

    // 열려 있는 팝업을 닫고 입력을 막는다
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    const hintBtn = document.getElementById('hint-req-btn');
    if (hintBtn) hintBtn.disabled = true;
    overlay.classList.add('on');

    // 끝 화면(마지막에 보여줄 내용)
    overlay.querySelector('.cs-stage').textContent = `STAGE ${stageIdx + 1} · ${stageNames[stageIdx] || ''}`;
    overlay.querySelector('.cs-stats').textContent =
      `${Difficulty.cfg().label} 모드 · 제한 시간 ${fmt(Difficulty.timeLimit() || 0)} 안에 탈출하지 못했다`;

    const showEnd = () => {
      overlay.classList.add('show-end');
      const layer = overlay.querySelector('.shard-layer');
      if (layer) layer.remove(); // 떨어진 조각은 더 필요 없다
    };

    if (reducedMotion()) {
      // '동작 줄이기': 흔들림·조각 없이 어두워지고 결과만 보여준다
      overlay.classList.add('calm-fade');
      setTimeout(showEnd, 900);
      return;
    }

    // 1) 0 ~ 1.5초: 화면이 크게 흔들리고 균열이 온 화면을 덮는다
    root.style.setProperty('--crack', '1');
    root.classList.add('time-danger', 'collapse-quake');
    rumble(2.2, 0.9);
    [150, 450, 750, 1050, 1300].forEach(t => setTimeout(snap, t));

    // 2) 1.5초: 번쩍하며 화면이 조각나 떨어진다
    setTimeout(() => {
      root.classList.remove('collapse-quake');
      buildShards(overlay);
      wrap.style.visibility = 'hidden';
      overlay.classList.add('shatter');
      boom();
    }, 1500);

    // 3) 3.6초: 어두워진 화면에 '차원 붕괴' 결과가 나타난다
    setTimeout(showEnd, 3600);
  }

  return { start, rumble };
})();

/* 시연용 단축키 — Shift+T
 * 누를 때마다 남은 시간을 경고(20%) → 위험(8%) → 붕괴(0) 순서로 건너뛴다.
 * 녹화·시연 때 5분을 기다리지 않기 위한 용도이며, 제한 시간이 있는 난이도에서 게임 중일 때만 동작한다. */
(() => {
  const STEPS = [0.2, 0.08, 0];
  document.addEventListener('keydown', e => {
    if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 't') return;
    if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    const limit = Difficulty.timeLimit();
    const hud = document.getElementById('hud-timer');
    const overlay = document.getElementById('collapse-overlay');
    if (!limit || !hud || !hud.offsetParent || (overlay && overlay.classList.contains('on'))) return;
    const remain = limit - Game.getElapsed();
    const next = STEPS.find(r => r * limit < remain - 1);
    if (next === undefined) return;
    Game.addTime(Math.ceil(remain - next * limit) + (next === 0 ? 1 : 0));
  });
})();
