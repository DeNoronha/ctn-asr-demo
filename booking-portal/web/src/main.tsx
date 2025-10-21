import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import './styles/index.css'
import { API_CONFIG } from './config/api'

// Configure axios defaults
axios.defaults.baseURL = API_CONFIG.baseURL

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
