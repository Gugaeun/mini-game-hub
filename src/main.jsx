import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'

// HashRouter (urls like /#/games/shooting) is used instead of BrowserRouter
// because GitHub Pages serves static files only — a direct refresh on
// /games/shooting would 404 with BrowserRouter. HashRouter sidesteps that
// with zero extra config. Swap to BrowserRouter + a 404.html redirect trick
// later if you want cleaner URLs.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
