// ВРЕМЕННО: точка входа автономного запуска тура (ветка 3d).
// Фронтенд подключает тур через src/3d/index.js, а этот файл и вся папка _stubs уходят.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './stubs.css'
import '../scene/tour.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
