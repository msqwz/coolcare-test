import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { LoginScreen } from './components/LoginScreen'
import { HomeTab } from './components/HomeTab'
import { JobsTab } from './components/JobsTab'
import { MapTab } from './components/Map/MapTab'
import { CalendarTab } from './components/CalendarTab'
import { ProfileTab } from './components/ProfileTab'
import { JobDetail } from './components/JobDetail'
import { JobForm } from './components/JobForm'
import { Icons } from './components/Icons'
import { openYandexNavigator } from './lib/utils'
import './App.css'

function AppLayout() {
  const {
    user,
    loading,
    isAuthenticated,
    jobs,
    stats,
    todayJobs,
    syncing,
    isOnline,
    handleRefresh,
    handleLogin,
    handleLogout,
    handleUpdateUser,
    handleJobUpdate,
    handleJobDelete,
    handleJobCreated,
    handleStatusChange,
    handleResetStats,
  } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const isJobDetail = location.pathname.startsWith('/jobs/') && location.pathname !== '/jobs/new'
  const isJobForm = location.pathname === '/jobs/new'
  const jobId = isJobDetail ? parseInt(location.pathname.split('/')[2], 10) : null
  const selectedJob = jobId ? (jobs.find((j) => j.id === jobId) || todayJobs.find((j) => j.id === jobId)) : null

  const activeTab =
    location.pathname === '/' ? 'home' :
      location.pathname === '/jobs' || isJobForm || isJobDetail ? 'jobs' :
        location.pathname === '/calendar' ? 'calendar' :
          location.pathname === '/map' ? 'map' :
            location.pathname === '/profile' ? 'profile' : 'home'

  if (loading) return <div className="loading">Загрузка...</div>
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />

  const handleBack = () => {
    if (isJobDetail || isJobForm) navigate(-1)
  }

  const handleAddressNavigate = (job) => {
    openYandexNavigator({
      latitude: job?.latitude,
      longitude: job?.longitude,
      address: job?.address,
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        {isJobDetail || isJobForm ? (
          <div className="header-with-back">
            <button className="btn-back" onClick={handleBack}>
              {Icons.back}
            </button>
            <h1>{isJobDetail ? 'Заявка' : 'Новая заявка'}</h1>
          </div>
        ) : (
          <h1>❄️ CoolCare</h1>
        )}
        <div className="user-info">
          {!isOnline && (
            <span className="offline-indicator" title="Оффлайн">
              {Icons.offline}
            </span>
          )}
          {syncing && (
            <span className="sync-indicator" title="Синхронизация...">
              {Icons.sync}
            </span>
          )}
          <span>{user?.name || user?.phone}</span>
        </div>
      </header>
      <main className="app-main">
        {isJobDetail && selectedJob ? (
          <JobDetail
            job={selectedJob}
            onClose={() => navigate('/jobs')}
            onAddressClick={() => handleAddressNavigate(selectedJob)}
            onUpdate={(j) => {
              handleJobUpdate(j)
              navigate('/jobs')
            }}
            onDelete={() => {
              handleJobDelete()
              navigate('/jobs')
            }}
            isOnline={isOnline}
          />
        ) : isJobForm ? (
          <JobForm
            onClose={() => navigate('/jobs')}
            onCreated={() => {
              handleJobCreated()
              navigate('/jobs')
            }}
            isOnline={isOnline}
          />
        ) : (
          <>
            {location.pathname === '/' && (
              <HomeTab
                stats={stats}
                todayJobs={todayJobs}
                onSelectJob={(job) => navigate(`/jobs/${job.id}`)}
                onAddressClick={handleAddressNavigate}
                onStatusChange={handleStatusChange}
                isOnline={isOnline}
                onRefresh={handleRefresh}
              />
            )}
            {location.pathname === '/jobs' && (
              <JobsTab
                onSelectJob={(job) => navigate(`/jobs/${job.id}`)}
                onAddressClick={handleAddressNavigate}
                onShowForm={() => navigate('/jobs/new')}
                onStatusChange={handleStatusChange}
                jobs={jobs}
                onRefresh={handleRefresh}
              />
            )}
            {location.pathname === '/calendar' && (
              <CalendarTab
                jobs={jobs}
                onSelectJob={(job) => navigate(`/jobs/${job.id}`)}
                onAddressClick={handleAddressNavigate}
                onRefresh={handleRefresh}
              />
            )}
            {location.pathname === '/map' && <MapTab jobs={jobs} />}
            {location.pathname === '/profile' && (
              <ProfileTab
                user={user}
                onUpdateUser={handleUpdateUser}
                onLogout={handleLogout}
                onResetStats={handleResetStats}
                isOnline={isOnline}
              />
            )}
          </>
        )}
      </main>
      {!isJobDetail && !isJobForm && (
        <nav className="bottom-nav">
          <div
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <span className="nav-icon">{Icons.home}</span>
            <span className="nav-label">Главная</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => navigate('/jobs')}
          >
            <span className="nav-icon">{Icons.jobs}</span>
            <span className="nav-label">Заявки</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => navigate('/calendar')}
          >
            <span className="nav-icon">{Icons.calendar}</span>
            <span className="nav-label">Календарь</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => navigate('/map')}
          >
            <span className="nav-icon">{Icons.map}</span>
            <span className="nav-label">Карта</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => navigate('/profile')}
          >
            <span className="nav-icon">{Icons.profile}</span>
            <span className="nav-label">Профиль</span>
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

function LoginRoute() {
  const { isAuthenticated, loading, handleLogin } = useApp()
  if (loading) return <div className="loading">Загрузка...</div>
  if (isAuthenticated) return <Navigate to="/" replace />
  return <LoginScreen onLogin={handleLogin} />
}
