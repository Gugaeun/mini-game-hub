import { useEffect, useState } from 'react'
import RecommendPanel from './RecommendPanel'

// Only pop up once per browser session — closing it means "not now", not
// "never"; the recommender stays reachable anytime from the navbar/home CTA.
const SEEN_KEY = 'arcadia_quiz_modal_seen'

export default function QuizModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alreadySeen = false
    try {
      alreadySeen = sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      alreadySeen = false
    }
    if (alreadySeen) return

    const timer = setTimeout(() => setOpen(true), 900)
    return () => clearTimeout(timer)
  }, [])

  function close() {
    setOpen(false)
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // ignore (private browsing etc.) — modal just won't remember it was closed
    }
  }

  if (!open) return null

  return (
    <div className="quiz-modal-overlay" onClick={close}>
      <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="quiz-modal-close" onClick={close} aria-label="닫기">
          ✕
        </button>
        <div className="quiz-modal-eyebrow">🎯 취향 테스트</div>
        <RecommendPanel onNavigate={close} />
      </div>
    </div>
  )
}
