import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import QuizModal from './components/QuizModal'
import Home from './pages/Home'
import About from './pages/About'
import Quiz from './pages/Quiz'
import ShootingGame from './pages/ShootingGame'
import RhythmGame from './pages/RhythmGame'
import MiniGame1 from './pages/MiniGame1'
import MiniGame2 from './pages/MiniGame2'
import EscapeGame from './pages/EscapeGame'
import AcidRain from './pages/AcidRain'
import Breakout from './pages/Breakout'
import Minesweeper from './pages/Minesweeper'
import Gomoku from './pages/Gomoku'
import WhackAMole from './pages/WhackAMole'

export default function App() {
  return (
    <>
      <NavBar />
      <QuizModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/games/shooting" element={<ShootingGame />} />
        <Route path="/games/rhythm" element={<RhythmGame />} />
        <Route path="/games/minigame-1" element={<MiniGame1 />} />
        <Route path="/games/minigame-2" element={<MiniGame2 />} />
        <Route path="/games/escape" element={<EscapeGame />} />
        <Route path="/games/acid-rain" element={<AcidRain />} />
        <Route path="/games/breakout" element={<Breakout />} />
        <Route path="/games/minesweeper" element={<Minesweeper />} />
        <Route path="/games/gomoku" element={<Gomoku />} />
        <Route path="/games/whack-a-mole" element={<WhackAMole />} />
      </Routes>
    </>
  )
}
