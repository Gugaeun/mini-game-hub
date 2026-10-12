import { Link } from 'react-router-dom'

// Wraps an existing standalone HTML/JS/CSS game (unmodified) in an iframe,
// so the original game code never has to be touched or rewritten in React.
export default function EmbeddedGamePage({ title, src, hint }) {
  // src is given relative (e.g. "games/minigames/2048_Game.html") so it
  // resolves correctly under Vite's `base` both in dev and once deployed
  // to a GitHub Pages project subpath.
  const resolvedSrc = `${import.meta.env.BASE_URL}${src}`

  return (
    <div className="game-page">
      <Link to="/" className="game-back">
        ← 허브로 돌아가기
      </Link>
      <div className="game-frame">
        <h2 className="cabinet-title" style={{ margin: 0 }}>
          {title}
        </h2>
        <iframe
          src={resolvedSrc}
          title={title}
          className="game-embed"
          allow="autoplay; fullscreen"
        />
        {hint && <p className="game-hint">{hint}</p>}
      </div>
    </div>
  )
}
