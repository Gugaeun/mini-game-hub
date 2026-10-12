import { useState } from 'react'
import { Link } from 'react-router-dom'
import { games } from '../data/games'
import { AXES, QUESTIONS, emptyScore, pickBestGame } from '../data/quiz'
import { MAX_LENGTH, recommend, usesRemoteAI, validate } from '../lib/recommend'

// 게임 추천 UI. 퀴즈 페이지(pages/Quiz.jsx)와 팝업(components/QuizModal.jsx)이 공유한다.
//   mode 'text' : 취향을 한두 문장으로 직접 입력
//   mode 'quiz' : 객관식 문답 3개
//   outcome     : { type: 'result', game, reason } | { type: 'list', message }
export default function RecommendPanel({ onNavigate }) {
  const [mode, setMode] = useState('text')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [score, setScore] = useState(emptyScore())
  const [outcome, setOutcome] = useState(null)

  function reset() {
    setMode('text')
    setText('')
    setError('')
    setStep(0)
    setScore(emptyScore())
    setOutcome(null)
  }

  async function submitText(e) {
    e.preventDefault()
    const checked = validate(text)
    if (!checked.ok) {
      setError(checked.message)
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await recommend(checked.text, games)
      setOutcome(
        result
          ? { type: 'result', ...result }
          : {
              type: 'list',
              message:
                '입력하신 내용만으로는 어떤 게임이 좋을지 판단하기 어려웠어요. 다시 적어보시거나 아래 목록에서 골라보세요.',
            },
      )
    } catch {
      setOutcome({
        type: 'list',
        message: '추천을 불러오지 못했어요. 아래 전체 게임 목록에서 골라보세요.',
      })
    } finally {
      setLoading(false)
    }
  }

  function answer(optionScore) {
    const next = { ...score }
    AXES.forEach((k) => {
      next[k] += optionScore[k] || 0
    })
    setScore(next)

    if (step + 1 < QUESTIONS.length) {
      setStep(step + 1)
    } else {
      setOutcome({
        type: 'result',
        game: pickBestGame(games, next),
        reason: '고르신 답변을 종합해 가장 잘 맞는 게임이에요.',
      })
    }
  }

  if (outcome?.type === 'result') {
    const { game, reason } = outcome
    return (
      <div className="quiz-result">
        <div className="quiz-result-eyebrow">당신에게 딱 맞는 게임은</div>
        <h2 className="quiz-result-title">{game.title}</h2>
        <p className="quiz-reason">{reason}</p>
        <p className="quiz-result-desc">{game.description}</p>
        <div className="quiz-result-actions">
          <Link to={game.route} className="quiz-cta" onClick={onNavigate}>
            {game.status === 'ready' ? '플레이하러 가기 →' : '미리보기 →'}
          </Link>
          <button className="quiz-restart" onClick={reset}>
            다시 하기
          </button>
        </div>
      </div>
    )
  }

  if (outcome?.type === 'list') {
    return (
      <div className="quiz-result">
        <p className="quiz-fallback-message">{outcome.message}</p>
        <ul className="quiz-fallback-list">
          {games.map((g) => (
            <li key={g.id}>
              <Link to={g.route} className="quiz-fallback-item" onClick={onNavigate}>
                <span className="quiz-fallback-title">{g.title}</span>
                <span className="quiz-fallback-genre">{g.genre}</span>
              </Link>
            </li>
          ))}
        </ul>
        <button className="quiz-restart" onClick={reset}>
          다시 입력하기
        </button>
      </div>
    )
  }

  if (mode === 'quiz') {
    return (
      <div>
        <div className="quiz-progress">
          {step + 1} / {QUESTIONS.length}
        </div>
        <h2 className="quiz-question">{QUESTIONS[step].q}</h2>
        <div className="quiz-options">
          {QUESTIONS[step].options.map((opt) => (
            <button key={opt.label} className="quiz-option" onClick={() => answer(opt.score)}>
              {opt.label}
            </button>
          ))}
        </div>
        <button className="quiz-restart quiz-switch" onClick={reset}>
          ← 직접 입력으로 돌아가기
        </button>
      </div>
    )
  }

  const overLimit = text.length > MAX_LENGTH

  return (
    <form onSubmit={submitText}>
      <h2 className="quiz-question">어떤 게임이 끌리세요?</h2>
      <p className="quiz-hint">
        취향을 한두 문장으로 적어주세요.
        <br />
        예) 머리 쓰는 퍼즐이 좋아요 / 심심해서 가볍게 할 만한 거
      </p>
      <textarea
        className="taste-input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="지금 하고 싶은 게임을 자유롭게 적어보세요"
        aria-label="취향 입력"
      />
      <div className={`taste-counter${overLimit ? ' over' : ''}`}>
        {text.length} / {MAX_LENGTH}
      </div>
      {error && <p className="taste-error">{error}</p>}
      <button type="submit" className="quiz-cta" disabled={loading}>
        {loading ? '찾는 중…' : '추천받기'}
      </button>
      <p className="taste-privacy">
        {usesRemoteAI
          ? '입력한 문장은 추천을 위해 외부 AI 서비스로 전송돼요. 개인정보는 입력하지 마세요.'
          : '입력한 문장은 저장되지 않아요. 개인정보는 적지 마세요.'}
      </p>
      <button type="button" className="quiz-restart quiz-switch" onClick={() => setMode('quiz')}>
        문장 쓰기 어렵다면 객관식으로 찾기 →
      </button>
    </form>
  )
}
