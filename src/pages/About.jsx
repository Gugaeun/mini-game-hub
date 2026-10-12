import Mascot from '../components/Mascot'

const techStack = ['React', 'JavaScript', 'HTML5 Canvas', 'Vite', 'CSS']

export default function About() {
  return (
    <div className="layout about-layout">
      <header className="marquee about-hero">
        <Mascot pose="idle" size={114} />
        <div className="marquee-eyebrow">About</div>
        <h1 className="marquee-title about-title">왜 만들었나요?</h1>
      </header>

      <section className="about-block">
        <p className="about-text">
          미니게임들이 모여있던 때처럼, 미니게임을 만들고 그걸 모아둘 수
          있는 웹페이지를 만들었어요.
        </p>
      </section>

      <div className="section-label">기술 스택</div>
      <div className="tech-tags">
        {techStack.map((t) => (
          <span key={t} className="tech-tag">
            {t}
          </span>
        ))}
      </div>

      <div className="section-label">링크</div>
      <div className="about-links">
        <a
          href="https://github.com/Gugaeun"
          target="_blank"
          rel="noreferrer"
          className="about-link"
        >
          GitHub ↗
        </a>
        <a href="mailto:yms07050@gmail.com" className="about-link">
          Email ↗
        </a>
      </div>
    </div>
  )
}
