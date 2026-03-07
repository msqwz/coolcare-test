import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminProvider, useAdmin } from './context/AdminContext'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Jobs } from './pages/Jobs'
import { Workers } from './pages/Workers'
import { Map } from './pages/Map'
import { Settings } from './pages/Settings'
import { Services } from './pages/Services'


function ProtectedLayout({ children }) {
  const { user, loading } = useAdmin()

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Загрузка...</div>
  if (!user) return <Navigate to="/login" />

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <Topbar />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename="/admin" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AdminProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          } />

          <Route path="/jobs" element={
            <ProtectedLayout>
              <Jobs />
            </ProtectedLayout>
          } />

          <Route path="/map" element={
            <ProtectedLayout>
              <Map />
            </ProtectedLayout>
          } />

          <Route path="/workers" element={
            <ProtectedLayout>
              <Workers />
            </ProtectedLayout>
          } />

          <Route path="/services" element={
            <ProtectedLayout>
              <Services />
            </ProtectedLayout>
          } />



          <Route path="/settings" element={
            <ProtectedLayout>
              <Settings />
            </ProtectedLayout>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  )
}

export default App
