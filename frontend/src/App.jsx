import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Agents from './pages/Agents.jsx'
import Tasks from './pages/Tasks.jsx'
import Leads from './pages/Leads.jsx'
import Content from './pages/Content.jsx'
import Offers from './pages/Offers.jsx'
import Services from './pages/Services.jsx'
import Strategy from './pages/Strategy.jsx'
import Settings from './pages/Settings.jsx'
import Automation from './pages/Automation.jsx'
import Sales from './pages/Sales.jsx'
import TelegramBot from './pages/TelegramBot.jsx'
import Memory from './pages/Memory.jsx'
import Cinema from './pages/Cinema.jsx'

const Layout = ({ children }) => (
  <div style={{
    display: 'flex',
    height: '100vh',
    background: 'var(--bg-base)',
    overflow: 'hidden',
  }}>
    <Sidebar />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar />
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {children}
      </main>
    </div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/agents" element={<Layout><Agents /></Layout>} />
        <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
        <Route path="/leads" element={<Layout><Leads /></Layout>} />
        <Route path="/content" element={<Layout><Content /></Layout>} />
        <Route path="/offers" element={<Layout><Offers /></Layout>} />
        <Route path="/services" element={<Layout><Services /></Layout>} />
        <Route path="/strategy" element={<Layout><Strategy /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/automation" element={<Layout><Automation /></Layout>} />
        <Route path="/sales" element={<Layout><Sales /></Layout>} />
        <Route path="/telegram-bot" element={<Layout><TelegramBot /></Layout>} />
        <Route path="/memory" element={<Layout><Memory /></Layout>} />
        <Route path="/cinema" element={<Layout><Cinema /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
