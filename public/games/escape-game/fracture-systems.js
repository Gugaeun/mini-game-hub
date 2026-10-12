/* fracture-systems.js — 난이도 · 저장 · 힌트 · 등급 · 씬 전환 */

// ═══════════════════════════════════════════════════════════
//  DIFFICULTY
// ═══════════════════════════════════════════════════════════
const Difficulty = (() => {
  let current = 'normal';
  const CFG = {
    easy:   { label: '쉬움',   hintsAllowed: 5 },
    normal: { label: '보통',   hintsAllowed: 3 },
    hard:   { label: '어려움', hintsAllowed: 1 },
  };
  return {
    set: d => { current = d; },
    get: () => current,
    cfg: () => CFG[current],
    CFG,
  };
})();

// ═══════════════════════════════════════════════════════════
//  SAVE SYSTEM
// ═══════════════════════════════════════════════════════════
const SaveSystem = (() => {
  const KEY = 'fracture_v1';
  return {
    save:   d  => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} },
    load:   () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    clear:  () => localStorage.removeItem(KEY),
    exists: () => !!localStorage.getItem(KEY),
  };
})();

// ═══════════════════════════════════════════════════════════
//  STAGE TIMER
// ═══════════════════════════════════════════════════════════
const StageTimer = (() => {
  let times      = [];
  let stageStart = 0;
  return {
    startStage: elapsed => { stageStart = elapsed; },
    clearStage: elapsed => { times.push(elapsed - stageStart); },
    getTimes:   ()      => [...times],
    restore:    arr     => { times = [...(arr || [])]; },
    reset:      ()      => { times = []; stageStart = 0; },
  };
})();

// ─── DIFFICULTY TEXT HELPER ───────────────────────────────
function getDiffText(easy, normal, hard) {
  const d = Difficulty.get();
  if (d === 'easy') return easy;
  if (d === 'hard') return hard;
  return normal;
}

// ═══════════════════════════════════════════════════════════
//  HINT REQUEST
// ═══════════════════════════════════════════════════════════
const HintRequest = (() => {
  let usedCount = 0;
  let maxHints  = 3;
  let stageUsed = [0, 0, 0, 0];

  const HINTS = {
    0: {
      easy: [
        '해골을 클릭하면 뼛조각과 함께 눈구멍의 숫자 4개가 바로 공개된다.',
        '石板(석판): 壹=1·☉(태양), 貳=2·骨(해골), 參=3·☽(달), 肆=4·∞(무한). 이 순서대로 다이얼에 입력하면 된다.',
        '다이얼 순서: ☉→骨→☽→∞. 해골 눈구멍의 숫자 4개를 이 순서대로 입력하라.',
      ],
      normal: [
        '해골(💀)을 클릭해 뼛조각을 얻어라. 바닥 석판과 탐험가 메모도 읽어야 한다.',
        '바닥 석판: 壹(1)☉ · 貳(2)骨 · 參(3)☽ · 肆(4)∞ — 이 순서가 다이얼 입력 순서다.',
        '해골 각인의 숫자 4개를 석판 기호 순서(☉→骨→☽→∞)대로 제단 다이얼에 입력하라.',
      ],
      hard: [
        '셋이 있다. 수를 품은 것, 이름을 새긴 것, 순서를 기록한 것.',
        '각 단서의 역할을 스스로 파악해 조합하라. 순서가 핵심이다.',
        '해골이 수를, 벽화가 기호의 이름을, 석판이 순서를 말한다.',
      ],
    },
    1: {
      easy: [
        '진행 순서: 스파크 패널 → 사물함 배선 → 콘솔 터미널 → 에어록.',
        '배선 규칙: 포트 번호 + 3 = 출력 번호. (P1→O4, P2→O5, P3→O6, P4→O7)',
        '터미널: ls → cat sequences.dat → override [코드] 순서로 입력하면 에어록이 열린다.',
      ],
      normal: [
        '스파크 패널 조사 → 사물함 배선 퍼즐 → 콘솔 해킹 → 에어록 순서로 진행하라.',
        '배선 패널의 포트 번호와 출력 번호 사이의 규칙을 찾아라.',
        '터미널에서 파일 시스템을 탐색하면 보안 코드를 찾을 수 있다.',
      ],
      hard: [
        '전력부터 복구해야 한다. 무엇이 전력과 연결되어 있는가?',
        '수열과 관련된 파일이 어딘가 있다. 터미널 명령어를 스스로 떠올려라.',
        '코드를 찾았다면, 올바른 명령어와 함께 입력해야 잠금이 풀린다.',
      ],
    },
    2: {
      easy: [
        '거울(룬+숫자) → 두루마리(변환 법칙) → 마법서(입력) 세 단계로 진행하라.',
        '변환: A=1, B=2, C=3 … Z=26. 거울의 룬 숫자로 알파벳을 찾아라.',
        '제단 테이블의 룬 순서대로 알파벳을 나열하면 정답 단어가 완성된다.',
      ],
      normal: [
        '거울과 두루마리를 모두 읽어야 마법서를 풀 수 있다.',
        '두루마리의 "소리의 순서"가 핵심 법칙이다. 알파벳과 관련이 있다.',
        '룬→숫자→알파벳 변환 후 룬 순서대로 나열하면 단어가 된다.',
      ],
      hard: [
        '거울이 전부를 말하지 않는다. 법칙은 다른 곳에 있다.',
        '"소리의 순서"란 무엇인가? 스스로 법칙을 발견해야 한다.',
        '수와 소리와 문자 사이의 관계. 그것이 마법의 열쇠다.',
      ],
    },
    3: {
      easy: [
        '게시판과 신문을 읽은 뒤 타자기를 클릭해 수식을 확인하라.',
        '수식의 숫자가 기억나지 않으면 전화기를 클릭하면 알려준다.',
        '소수: 2,3,5,7,11,13… / 피보나치: 1,1,2,3,5,8… 수식대로 계산해 금고를 열어라.',
      ],
      normal: [
        '수사 게시판과 신문을 읽은 뒤 타자기를 클릭해 수식을 확인하라.',
        '수식: 소수 A번째 × 소수 B번째 + 피보나치 C번째. 직접 계산해야 한다.',
        '전화기를 클릭하면 수식의 실제 숫자를 알려준다.',
      ],
      hard: [
        '범인의 습관을 파악하라. 어디서 그 흔적을 찾을 수 있나?',
        '수식이 있다. 하지만 어떤 수열인지, 몇 번째 항인지 스스로 찾아야 한다.',
        '모든 단서를 조합해야만 계산이 가능하다. 아직 보지 못한 것이 있다.',
      ],
    },
  };

  function init() {
    usedCount = 0;
    stageUsed = [0, 0, 0, 0];
    maxHints  = Difficulty.cfg().hintsAllowed;
    _updateUI();
  }

  function use(stageIdx) {
    if (HintJournal.allNaturalFound(stageIdx)) {
      _toast('단서를 모두 발견했다. 힌트가 필요 없다!');
      return;
    }
    const rem = maxHints - usedCount;
    if (rem <= 0) { _toast('사용 가능한 힌트가 없다.'); return; }
    const diff  = Difficulty.get();
    const stage = HINTS[stageIdx] || {};
    const list  = stage[diff] || stage.normal || [];
    const hIdx  = stageUsed[stageIdx] || 0;
    const hint  = list[Math.min(hIdx, list.length - 1)];
    stageUsed[stageIdx] = hIdx + 1;
    usedCount++;
    _updateUI();
    if (hint) {
      HintJournal.add('[힌트] ' + hint, stageIdx, true);
      _toast(`힌트 사용 (남은 횟수: ${maxHints - usedCount})`);
    }
  }

  function _updateUI() {
    const btn = document.getElementById('hint-req-btn');
    if (!btn) return;
    const rem = maxHints - usedCount;
    btn.textContent = `? 힌트 [${rem}]`;
    btn.disabled    = rem <= 0;
    btn.style.opacity = rem <= 0 ? '0.35' : '1';
  }

  function _toast(msg) {
    const el = document.getElementById('hint-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('visible'), 2400);
  }

  return {
    init,
    use,
    getUsed: () => usedCount,
    getMax:  () => maxHints,
  };
})();

// ═══════════════════════════════════════════════════════════
//  GRADE SYSTEM
// ═══════════════════════════════════════════════════════════
const GradeSystem = (() => {
  const PENALTY = 120; // 힌트 1회당 패널티(초)
  const THR = {
    easy:   { S: 900,  A: 1500, B: 2400 },
    normal: { S: 600,  A: 1000, B: 1800 },
    hard:   { S: 480,  A: 800,  B: 1400 },
  };
  function calc(totalSec, hintsUsed, difficulty) {
    const thr = THR[difficulty] || THR.normal;
    const eff = totalSec + hintsUsed * PENALTY;
    if (eff <= thr.S) return { grade: 'S', color: '#ffd700', msg: '완벽한 탈출! 시간의 균열이 흔적도 없이 봉합됐다.' };
    if (eff <= thr.A) return { grade: 'A', color: '#c8a84b', msg: '훌륭한 탈출! 약간의 잔흔이 남았지만 균열은 닫혔다.' };
    if (eff <= thr.B) return { grade: 'B', color: '#40d4d4', msg: '무난한 탈출. 균열이 봉합됐으나 시간이 걸렸다.' };
    return          { grade: 'C', color: '#888',    msg: '간신히 탈출. 균열의 잔해가 곳곳에 남아있다.' };
  }
  return { calc };
})();

// ═══════════════════════════════════════════════════════════
//  SCENE TRANSITION
// ═══════════════════════════════════════════════════════════
const SceneTransition = (() => {
  // 각 스테이지 탈출 시 전환 효과: 0→불꽃, 1→포탈, 2→그림자, 3→균열
  const FX = ['fx-fire', 'fx-portal', 'fx-shadow', 'fx-crack'];
  const SWITCH_AT = 650; // ms — 이 시점에 씬 교체 (오버레이가 꽉 찬 상태)
  const TOTAL     = 1400; // ms — 전체 애니메이션 길이

  function play(fromStageIdx, cb) {
    const el = document.getElementById('transition-overlay');
    if (!el) { cb?.(); return; }
    const cls = FX[fromStageIdx] || 'fx-fire';
    el.style.pointerEvents = 'all';
    el.className = 'transition-overlay ' + cls;
    setTimeout(() => {
      cb?.();
    }, SWITCH_AT);
    setTimeout(() => {
      el.className = 'transition-overlay';
      el.style.pointerEvents = 'none';
    }, TOTAL);
  }

  return { play };
})();

// ═══════════════════════════════════════════════════════════
//  TITLE SCREEN HELPERS
// ═══════════════════════════════════════════════════════════
function selectDifficulty(d) {
  Difficulty.set(d);
  document.querySelectorAll('.diff-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.diff === d);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const continueBtn = document.getElementById('btn-continue');
  if (!continueBtn) return;
  if (SaveSystem.exists()) {
    const sv = SaveSystem.load();
    if (sv && sv.stage > 0 && sv.stage < 4) {
      const names = ['신전', '우주선', '저택', '사무소'];
      const idx   = Math.min(sv.stage, 3);
      const m     = String(Math.floor((sv.elapsedSeconds || 0) / 60)).padStart(2, '0');
      const s     = String((sv.elapsedSeconds || 0) % 60).padStart(2, '0');
      continueBtn.style.display = 'block';
      continueBtn.innerHTML =
        `[ 이어하기 — STAGE ${idx + 1} · ${names[idx]} · ${m}:${s} ]`;
      if (sv.difficulty) selectDifficulty(sv.difficulty);
      // 저장 데이터로 이어하기 시 인트로 건너뜀
      Cinematic.skipIntro();
    } else {
      continueBtn.style.display = 'none';
    }
  } else {
    continueBtn.style.display = 'none';
  }
  Cinematic.initIntro();
});

// ═══════════════════════════════════════════════════════════
//  CINEMATIC
// ═══════════════════════════════════════════════════════════
const Cinematic = (() => {
  let _outroCb = null;
  let _introTimer = null;

  function _fadeHide(id, cb) {
    const el = document.getElementById(id);
    if (!el) { cb?.(); return; }
    const doneClass = id === 'intro-cinematic' ? 'ic-done' : 'oc-done';
    el.classList.add(doneClass);
    setTimeout(() => {
      el.style.display = 'none';
      cb?.();
    }, 700);
  }

  function initIntro() {
    const el = document.getElementById('intro-cinematic');
    if (!el) return;

    // 먼지 파티클 생성
    const pWrap = document.getElementById('ic-particles');
    if (pWrap) {
      const positions = [
        [18,82],[32,71],[45,90],[58,65],[70,85],[22,60],
        [40,78],[55,55],[68,92],[80,68],[12,75],[88,80],
      ];
      positions.forEach(([lp, tp]) => {
        const p = document.createElement('div');
        p.className = 'ic-p';
        p.style.cssText = `left:${lp}%;top:${tp}%;--dur:${3.5+Math.random()*2.5}s;--del:${Math.random()*3}s;--drift:${(Math.random()-0.5)*28}px`;
        pWrap.appendChild(p);
      });
    }

    // 애니메이션 총 길이 후 자동 종료 (8.4s = 마지막 아이템 완료 + 여유)
    _introTimer = setTimeout(() => _fadeHide('intro-cinematic'), 8400);
  }

  function skipIntro() {
    if (_introTimer) { clearTimeout(_introTimer); _introTimer = null; }
    _fadeHide('intro-cinematic');
  }

  function playOutro(cb) {
    _outroCb = cb;
    const el = document.getElementById('outro-cinematic');
    if (!el) { cb?.(); return; }
    el.classList.remove('oc-done');
    el.style.display = 'block';
    void el.offsetWidth; // reflow — 애니메이션 재시작
    setTimeout(() => _finishOutro(), 6300);
  }

  function skipOutro() { _finishOutro(); }

  function _finishOutro() {
    _fadeHide('outro-cinematic', () => {
      const cb = _outroCb;
      _outroCb = null;
      cb?.();
    });
  }

  return { initIntro, skipIntro, playOutro, skipOutro };
})();
