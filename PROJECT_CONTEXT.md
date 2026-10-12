# 프로젝트 컨텍스트 (Claude Code 등 새 세션용)

이 문서는 claude.ai 채팅에서 이 프로젝트를 기획하며 나눈 대화 내용을
요약한 것입니다. 새 세션에서 작업을 이어갈 때 먼저 읽어주세요.

## 프로젝트 목적

- **무엇**: 개인이 만든 미니게임들을 모아둔 아케이드 스타일 포트폴리오 웹사이트
- **왜**: 취업/포트폴리오용으로 보여주기 위함
- **누구에게**: 1차 타겟은 채용담당자/개발자 동료, 하지만 링크를 타고 오는
  불특정 다수도 재미있게 즐길 수 있어야 함 → "채용담당자가 스캔하기 쉬운
  구조" + "아무나 들어와도 재밌는 UX"를 동시에 만족해야 함

## 벤치마킹 근거

세 유형을 비교해서 장점만 조합하기로 결정함:

1. **미니멀·전문가형** (예: Jenova Chen 포트폴리오) — 깔끔하고 스캔하기
   쉬움. 단점: 재미 요소 부족
2. **플레이풀·인터랙티브형** (예: Facepunch) — 인상적이고 기억에 남음.
   단점: 정보 찾기 산만, 로딩 무거움
3. **브라우징 편의형** (예: itch.io류) — 게임 개수 늘려도 확장 쉬움.
   단점: 개인 서사(왜 만들었는지)가 안 보임
4. 사용자가 어릴 때 즐긴 "슈게임"(한국 아바타 캐릭터 기반 플래시 미니게임
   모음)도 참고함 — 장점은 캐릭터 하나로 서로 다른 장르를 하나의
   세계관처럼 묶는 것. 단점은 플래시 기반이라 기술이 죽으면서 사이트
   전체가 소실된 것(→ 우리는 React/HTML로 만들어 이 문제를 원천 회피)
   그리고 개발 맥락이 전혀 없는 순수 엔터테인먼트 상품이었다는 것

**결론**: 아케이드 마퀴 비주얼 + 카드 그리드 브라우징 + 마스코트 캐릭터로
세계관 통일 + About 페이지로 "왜 만들었는지" 서사 보완.

## 디자인 방향

- **컨셉**: 레트로 아케이드 캐비닛/마퀴 스타일
- **컬러**: 딥 인디고 배경(#130c22), 마젠타(#ff4fa3)/앰버(#ffb703)/시안(#4cd7e0) 포인트
- **폰트**: 헤드라인은 Press Start 2P(픽셀), 본문은 Space Grotesk, 수치/라벨은 JetBrains Mono
- **마스코트**: 랫서판다 캐릭터 (동글동글한 스타일 선호), `src/components/Mascot.jsx`에
  SVG로 구현됨. pose prop으로 idle/shooting/rhythm 세 가지 모습.
  게임 종류가 달라도 마스코트로 통일된 정체성을 줌 (슈게임 벤치마킹 반영)

## 기술 스택 & 구조

- React + Vite, react-router-dom (HashRouter — GitHub Pages 정적 호스팅에서
  새로고침 시 404 안 나게 하려고 일부러 Hash 방식 사용)
- `src/data/games.js` 하나만 고치면 홈 화면 카드가 자동으로 반영됨
- 게임 구성 5개:
  - 슈팅 게임, 리듬 게임 — 순수 React/Canvas로 새로 제작 (useRef에 게임
    상태, useState는 HUD 표시값만 — 매 프레임 리렌더 피하기 위함)
  - MiniGame 1, MiniGame 2, Escape Game — 사용자의 기존 GitHub 저장소
    `Gugaeun/Practicum/Web_Practicum`에 있던 순수 HTML/JS 게임들.
    코드는 건드리지 않고 `public/games/`에 원본 그대로 복사해 넣은 뒤
    `<iframe>`으로 감싸서 보여주는 방식으로 통합함 (React로 새로
    포팅하지 않음 — 시간 대비 이득이 적다고 판단)

## 현재 미해결 이슈

- `public/games/minigames/`, `public/games/escape-game/`에 **아직 실제
  게임 파일이 안 들어가 있음** (PUT_YOUR_FILES_HERE.txt만 있는 상태).
  그래서 MiniGame1/MiniGame2/EscapeGame 페이지 진입 시 iframe이 404를
  띄우고 있었음.
- `src/pages/MiniGame1.jsx`, `MiniGame2.jsx`, `EscapeGame.jsx`의
  `src="..."` 경로가 placeholder(`game1.html`, `game2.html`,
  `index.html`)로 되어 있어서, 실제 파일명과 다르면 맞춰줘야 함.

## 다음에 할 일 (제안)

1. `Practicum/Web_Practicum/MiniGames`, `escape-game`의 실제 파일을
   `mini-game-hub/public/games/`로 복사하고 경로 맞추기 (404 해결)
2. `src/data/games.js`의 title/description을 실제 게임 내용으로 채우기
3. `src/pages/About.jsx`의 자기소개/기술스택/링크를 실제 내용으로 채우기
4. GitHub에 `mini-game-hub` 새 저장소로 push 후 `npm run deploy`로 배포
5. (선택) 게임 상세 페이지 — 각 게임에 스크린샷/조작법/"무엇을 연습했는지"
   추가하면 포트폴리오로서 완성도가 더 올라감 (아직 미착수)
