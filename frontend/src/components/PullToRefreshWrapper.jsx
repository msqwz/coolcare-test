import React, { useEffect } from 'react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { Icons } from './Icons'

export function PullToRefreshWrapper({ onRefresh, children }) {
  const {
    containerRef,
    pullDistance,
    refreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(onRefresh)

  // Register touchmove with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handleTouchMove, containerRef])

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', minHeight: '100%' }}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="pull-indicator"
          style={{
            height: pullDistance > 0 ? pullDistance : 50,
            opacity: refreshing ? 1 : Math.min(pullDistance / 80, 1),
          }}
        >
          <div className={`pull-spinner ${refreshing ? 'spinning' : ''}`}>
            {Icons.snowflake}
          </div>
          <span className="pull-text">
            {refreshing ? 'Обновление...' : pullDistance >= 80 ? 'Отпустите' : 'Потяните вниз'}
          </span>
        </div>
      )}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: pullDistance > 0 ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  )
}
