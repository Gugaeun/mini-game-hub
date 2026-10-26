# 프로젝트 컨텍스트 (Claude Code 등 새 세션용)

이 문서는 새 세션에서 작업을 이어갈 때 먼저 읽는 현재 상태 요약입니다. (2026-10-26 기준)

## 프로젝트 개요

- **서비스명**: ARCADIA — 직접 만든 미니게임 10개를 모은 개인 아케이드 웹사이트
- **핵심 기능**: 취향을 한두 문장(100자) 또는 객관식 3문항으로 입력하면 게임 1개와 추천 이유를 보여주는 추천 기능
- **배포**: GitHub Pages — https://gugaeun.github.io/mini-game-hub/ (소스: https://github.com/Gugaeun/mini-game-hub)
- **기간 / 작성자**: 2026-09-07 ~ 2026-10-25, 개인 프로젝트(구가은)

## 기술 스택과 구조

- React 18 + Vite 5, react-router-dom(HashRouter — GitHub Pages에서 새로고침 404를 피하려고 해시 방식 사용), `base: '/mini-game-hub/'`
- 게임 목록은 `src/data/games.js` 한 곳에서 관리(홈 카드·추천 모두 여기서 만들어짐)
- 직접 만든 게임(슈팅·벽돌깨기·리듬·산성비·지뢰찾기·오목·두더지잡기)은 규칙·판정을 `src/lib/*Engine.js` 순수 함수로 분리하고, React 페이지는 렌더링·입력만 담당
- 기존 HTML/JS 게임(2048, Memory Match, Escape Game)은 `public/games/`에 두고 `<iframe>`으로 통합
- 효과음·음악은 외부 파일 없이 WebAudio로 합성(`src/lib/sfx.js`)
- 마스코트(레서판다 픽셀 캐릭터)는 PixelLab으로 생성, `public/mascot/`, 컴포넌트는 `src/components/Mascot.jsx`

## 게임 10개

2048, Memory Match(15단계), Escape Game(개발 중), 슈팅, 벽돌깨기, 리듬(6단계·4단계부터 6레인), 산성비, 지뢰찾기, 오목(컴퓨터 대전 AI), 두더지잡기

- **Escape Game**: 난이도별 제한 시간(쉬움 무제한 · 보통 5분 · 어려움 10분). 남은 시간 25% 이하 경고(균열), 10% 이하 위험(붉은 테두리·심장 소리), 0이 되면 화면이 무너지는 연출 후 "다시 도전". 시연용 단축키 **Shift+T**(누를 때마다 경고 → 위험 → 붕괴로 시간을 건너뜀). 코드는 `public/games/escape-game/fracture-collapse.js·css`.

## 추천 기능

- `src/data/quiz.js`(7개 성향 축·3문항), `src/lib/recommend.js`(키워드 매칭 + 선택적 원격 호출), `RecommendPanel`/`QuizModal`
- **현재 동작은 규칙 기반**입니다. LLM 연동용 서버리스 중계 함수(Cloudflare Worker)는 `serverless/`에 코드와 테스트(11건)까지 작성했고, **API 키 발급과 배포는 아직 하지 않았습니다**(비용 문제로 이후 진행). 연동 순서는 `serverless/README.md` 참고. 키는 절대 저장소·채팅에 적지 않습니다.

## 실행·테스트·배포

```bash
npm install
npm run dev      # http://localhost:5173/mini-game-hub/
npm test         # 71건 (엔진 시뮬레이션 60 + 서버리스 11)
npm run deploy   # 빌드 후 gh-pages 브랜치로 배포
```

## 작업 시 지켜 온 규칙

- 사용자가 요청하기 전에는 push·배포하지 않는다.
- `.docx`(제출 문서)와 `.claude/`는 저장소에 올리지 않는다(`.gitignore`).
- 문서에는 직접 확인한 출처·실측값만 쓰고, 측정하지 않은 것은 "미측정"으로 적는다.
- 마스코트는 역할이 있는 화면에만 쓴다.

## 남은 일 (선택)

- LLM API 키 발급 → 중계 함수 배포 → `VITE_RECOMMEND_API_URL` 설정 후 재배포
- 지인 5명 사용자 평가와 추천 수락률 측정
- Escape Game 퍼즐 완성, 글꼴 파일(약 8MB) 경량화
