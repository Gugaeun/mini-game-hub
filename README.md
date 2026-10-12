# ARCADIA

React + Vite로 만든 개인 미니게임 포트폴리오. 게임 카드가 나열된 홈페이지 하나와,
새로 만드는 슈팅/리듬 게임 두 개의 시작 코드가 들어있습니다.

## 폴더 구조

```
src/
  data/games.js        게임 목록 (제목, 장르, 상태, 링크) — 여기만 고치면 카드가 자동 반영됨
  components/GameCard   홈 화면 카드 UI
  pages/Home.jsx        게임 카드 그리드
  pages/ShootingGame.jsx  캔버스 게임 루프 + React HUD
  pages/RhythmGame.jsx    캔버스 게임 루프 + React HUD
```

## 기존 퍼즐 게임 3개(MiniGames × 2, escape-game) 연결하기

이제 완전히 이 저장소 안으로 합쳐져 있어요. 기존 게임 코드는 손대지 않고
그대로 `public/games/` 아래에 복사해 넣기만 하면 됩니다.

```
public/games/
  minigames/       ← Web_Practicum/MiniGames 안의 파일 전부를 여기에 복사
    game1.html
    game2.html
    ...
  escape-game/      ← Web_Practicum/escape-game 안의 파일 전부를 여기에 복사
    index.html
    ...
```

파일명이 다르면 `src/pages/MiniGame1.jsx`, `MiniGame2.jsx`,
`EscapeGame.jsx`에서 `src="..."` 경로만 실제 파일명으로 맞춰주면 됩니다.
Vite는 `public/` 폴더를 그대로 정적 파일로 서빙하기 때문에 별도 설정은
필요 없어요.

게임은 `<iframe>`으로 감싸서 보여줍니다 — 원본 게임의 HTML/CSS/JS는
전혀 수정하지 않아도 작동해요.

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages 배포

이제 저장소가 하나(`mini-game-hub`)로 합쳐졌으니 배포도 한 번만 하면
모든 게임이 같이 올라갑니다. `Practicum` 저장소는 더 이상 배포할 필요
없어요 (원한다면 코드 백업용으로만 유지해도 됩니다).

1. `mini-game-hub` 폴더를 새 저장소로 push (게임 파일까지 다 넣은 상태로)
2. `npm install` 로 `gh-pages` 패키지까지 설치
3. `npm run deploy` 실행 — 빌드 후 `gh-pages` 브랜치로 자동 배포됨
4. 저장소 Settings → Pages → Source를 `gh-pages` 브랜치로 지정
5. `https://username.github.io/mini-game-hub` 로 접속 확인

저장소 이름이 `username.github.io` (루트 사이트)라면 `vite.config.js`의
`base`를 `'/'`로 그대로 두면 됩니다. 프로젝트 사이트(`/mini-game-hub` 하위 경로)로
배포한다면 `base: '/mini-game-hub/'`로 저장소 이름과 맞춰 바꿔주세요.

## 새 게임 추가하기

1. `src/pages/`에 새 게임 컴포넌트 작성 (기존 두 게임의 useRef 게임 루프 패턴 참고)
2. `src/App.jsx`에 라우트 추가
3. `src/data/games.js`에 카드 항목 추가 — 홈 화면에 자동으로 나타남

## 게임 추천 기능

방문자가 취향을 한두 문장으로 입력하면 게임 1개와 추천 이유를 보여줍니다 (`/quiz` 페이지와 첫 방문 팝업).

- **지금 동작 방식**: 브라우저 안의 키워드 매칭(규칙 기반). 객관식 문답 모드도 제공합니다.
- **AI(LLM) 연동**: 서버리스 중계 함수 코드는 `serverless/` 에 작성되어 있습니다.
  **LLM API 키 발급과 배포는 아직 하지 않았고, 이후 진행 예정**입니다.
  연동하려면 `VITE_RECOMMEND_API_URL` 에 배포한 함수 주소를 설정합니다. 자세한 순서는 [serverless/README.md](serverless/README.md) 참고.

## 게임 목록 (10개)

| 게임 | 장르 | 구현 | 상태 |
| --- | --- | --- | --- |
| 2048 | Puzzle | 기존 HTML/JS (iframe) | 완성 |
| Memory Match | Puzzle | 기존 HTML/JS (iframe, 15단계) | 완성 |
| Escape Game | Puzzle | 기존 HTML/JS (iframe) | 개발 중 |
| 슈팅 게임 | Action | React + Canvas | 완성 |
| 벽돌깨기 | Action | React + Canvas | 완성 |
| 리듬 게임 | Rhythm | React + Canvas + WebAudio 합성 음악 (6단계, 4단계부터 6레인) | 완성 |
| 산성비 | Typing | React + Canvas | 완성 |
| 지뢰찾기 | Puzzle | React (DOM) | 완성 |
| 오목 | Strategy | React + Canvas (컴퓨터 대전 AI) | 완성 |
| 두더지잡기 | Casual | React (DOM) | 완성 |

직접 만든 게임(슈팅·벽돌깨기·리듬·산성비·지뢰찾기·오목·두더지잡기)의 규칙/판정은 화면과 분리된 `src/lib/*Engine.js` 에 있고,
`npm test` 로 화면 없이 시뮬레이션 테스트를 실행할 수 있습니다.


## 에셋 출처

- **마스코트(레서판다 픽셀 캐릭터)**: AI 픽셀아트 생성 서비스 [PixelLab](https://www.pixellab.ai)에서 직접 작성한 설명문으로 생성했습니다. 서비스 약관([Terms of Service](https://www.pixellab.ai/termsofservice), 2025-11-23 개정본) 1.3·3.3항에 따라 생성물의 저작권은 사용자에게 있으며 상업·비상업 용도로 허락 없이 사용할 수 있습니다. (생성물로 다른 AI 모델을 학습시키는 것은 금지되어 있습니다.) 원본 GIF와 사이트용 파일은 `public/mascot/`에 있습니다.
- **게임 효과음·음악**: 외부 파일 없이 WebAudio로 코드에서 합성합니다.
- **폰트**: Google Fonts (Jua, Gothic A1, JetBrains Mono).
