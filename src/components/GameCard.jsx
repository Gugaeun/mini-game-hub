import { Link } from 'react-router-dom'

export default function GameCard({ game }) {
  const isReady = game.status === 'ready'
  const inner = (
    <>
      <div className="cabinet-marquee">
        <span className="cabinet-genre">{game.genre}</span>
        <span className={`status-led ${game.status}`}>
          {isReady ? 'Ready' : 'In dev'}
        </span>
      </div>
      <div className="cabinet-body">
        <h3 className="cabinet-title">{game.title}</h3>
        <p className="cabinet-desc">{game.description}</p>
        <span className="cabinet-cta">
          {isReady ? 'Play →' : 'Preview →'}
        </span>
      </div>
    </>
  )

  if (game.type === 'internal') {
    return (
      <Link to={game.route} className="cabinet">
        {inner}
      </Link>
    )
  }

  return (
    <a href={game.url} target="_blank" rel="noreferrer" className="cabinet">
      {inner}
    </a>
  )
}
