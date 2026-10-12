// Shared quiz logic used by both the full quiz page (pages/Quiz.jsx) and
// the popup version (components/QuizModal.jsx), so the questions and
// scoring only need to be maintained in one place.

export const AXES = ['logic', 'memory', 'story', 'reflex', 'rhythm', 'typing', 'strategy']

export const QUESTIONS = [
  {
    q: '지금 기분에 가장 가까운 건?',
    options: [
      { label: '차분하게 머리 쓰고 싶어요', score: { logic: 2, memory: 1, strategy: 1 } },
      { label: '이야기에 폭 빠지고 싶어요', score: { story: 2 } },
      { label: '신나게 손을 움직이고 싶어요', score: { reflex: 2, rhythm: 1, typing: 1 } },
    ],
  },
  {
    q: '어떤 순간이 제일 짜릿해요?',
    options: [
      { label: '복잡한 걸 딱 풀어냈을 때', score: { logic: 2 } },
      { label: '다 기억해서 완벽히 맞췄을 때', score: { memory: 2 } },
      { label: '숨겨진 단서를 찾아냈을 때', score: { story: 2 } },
      { label: '위기를 아슬아슬하게 피했을 때', score: { reflex: 2 } },
      { label: '박자를 완벽하게 맞췄을 때', score: { rhythm: 2 } },
      { label: '빠르고 정확하게 타자를 쳤을 때', score: { typing: 2 } },
      { label: '상대의 수를 읽고 한 수 앞서갔을 때', score: { strategy: 2 } },
    ],
  },
  {
    q: '오늘 시간은 얼마나 있어요?',
    options: [
      { label: '5분, 가볍게', score: { reflex: 1, rhythm: 1, memory: 1, typing: 1 } },
      { label: '20분 정도, 여유 있게', score: { logic: 1, memory: 1, strategy: 1 } },
      { label: '몰입해서 오래', score: { story: 2, logic: 1 } },
    ],
  },
]

export function emptyScore() {
  return AXES.reduce((acc, k) => ({ ...acc, [k]: 0 }), {})
}

export function pickBestGame(games, userScore) {
  let best = null
  let bestValue = -Infinity
  games.forEach((game) => {
    const value = AXES.reduce((sum, k) => sum + userScore[k] * (game.tags?.[k] ?? 0), 0)
    if (value > bestValue) {
      bestValue = value
      best = game
    }
  })
  return best
}
