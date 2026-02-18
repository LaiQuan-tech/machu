import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Could not find root element')

const root = ReactDOM.createRoot(rootElement)

// Route to admin or public frontend based on URL path
const isAdminPath = window.location.pathname.startsWith('/admin')

if (isAdminPath) {
  import('./admin/AdminApp').then(({ AdminApp }) => {
    root.render(
      <React.StrictMode>
        <AdminApp />
      </React.StrictMode>
    )
  })
} else {
  // App.tsx is at root level
  import('../App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
}
