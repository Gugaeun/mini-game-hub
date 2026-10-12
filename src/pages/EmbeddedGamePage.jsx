import { Link } from 'react-router-dom'

// Wraps an existing standalone HTML/JS/CSS game (unmodified) in an iframe,
// so the original game code never has to be touched or rewritten in React.
// wide: 원래 1024×768 기준으로 만든 게임(Escape)을 허브의 작은 상자에서 줄이지 않고 큰 상자로 보여준다.
export default function EmbeddedGamePage({ title, src, hint, wide = false }) {
  // src is given relative (e.g. "games/minigames/2048_Game.html") so it
  // resolves correctly under Vite's `base` both in dev and once deployed
  // to a GitHub Pages project subpath.
  const resolvedSrc = `${import.meta.env.BASE_URL}${src}`

  return (
    <div className={`game-page${wide ? ' game-page-wide' : ''}`}>
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">
        <h2 className="cabinet-title" style={{ margin: 0 }}>
          {title}
        </h2>
        {wide && hint && <p className="game-hint">{hint}</p>}
        <iframe
          src={resolvedSrc}
          title={title}
          className={`game-embed${wide ? ' game-embed-wide' : ''}`}
          allow="autoplay; fullscreen"
        />
        {!wide && hint && <p className="game-hint">{hint}</p>}
      </div>
    </div>
  )
}
