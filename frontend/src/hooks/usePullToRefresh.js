import { useState, useRef, useCallback } from 'react'

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef(null)
  const threshold = 80

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!pulling) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 120))
      if (diff > 10) e.preventDefault()
    }
  }, [pulling])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } catch (e) {
        console.error(e)
      }
      setRefreshing(false)
    }
    setPulling(false)
    setPullDistance(0)
  }, [pullDistance, onRefresh])

  return {
    containerRef,
    pullDistance,
    refreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
