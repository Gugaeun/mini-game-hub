import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="navbar">
      <NavLink to="/" end className="navbar-brand">
        ARCADIA
      </NavLink>
      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          게임 목록
        </NavLink>
        <NavLink
          to="/quiz"
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          취향 테스트
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
        >
          About
        </NavLink>
      </div>
    </nav>
  )
}
