import Mascot from '../components/Mascot'
import RecommendPanel from '../components/RecommendPanel'

export default function Quiz() {
  return (
    <div className="layout quiz-layout">
      <header className="marquee about-hero">
        <Mascot pose="idle" size={114} />
        <div className="marquee-eyebrow">Recommend</div>
        <h1 className="marquee-title about-title">취향 맞춤 게임 찾기</h1>
      </header>

      <div className="quiz-card">
        <RecommendPanel />
      </div>
    </div>
  )
}
