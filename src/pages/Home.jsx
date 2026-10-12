import { Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import Mascot from '../components/Mascot'
import { games } from '../data/games'

export default function Home() {
  const genres = [...new Set(games.map((g) => g.genre))]

  return (
    <div className="layout">
      <header className="marquee">
        <Mascot pose="lying" size={110} />
        <div className="marquee-eyebrow">Personal Arcade</div>
        <h1 className="marquee-title">ARCADIA</h1>
        <p className="marquee-sub">
          ARCADIA는 'Arcade'와 그리운 그 시절의 유토피아를 뜻하는 'Utopia'를
          합친 이름이에요.
        </p>
        <Link to="/quiz" className="quiz-cta marquee-quiz-cta">
          🎯 취향 테스트로 게임 찾기
        </Link>
      </header>

      {genres.map((genre) => (
        <section key={genre}>
          <div className="section-label">{genre}</div>
          <div className="grid">
            {games
              .filter((g) => g.genre === genre)
              .map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
