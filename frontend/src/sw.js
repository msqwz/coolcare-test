/**
 * Service Worker для CoolCare PWA
 * Cache-first для статики, Network-first для API
 */

const CACHE_NAME = 'coolcare-v3'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Установка — кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Активация — чистим старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Пропускаем запросы к Supabase и Auth API — не кэшируем
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/jobs') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/health')
  ) {
    // Network-first для API: пробуем сеть, при ошибке — кэш
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Кэшируем GET-ответы
          if (event.request.method === 'GET' && response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(event.request)
        })
    )
    return
  }

  // Cache-first для статических ресурсов
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response

      return fetch(event.request).then((fetchResponse) => {
        // Кэшируем новые статические ресурсы
        if (fetchResponse.ok && event.request.method === 'GET') {
          const responseClone = fetchResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return fetchResponse
      }).catch(() => {
        // Для навигации — возвращаем index.html (SPA), кроме админки
        if (event.request.mode === 'navigate' && !url.pathname.startsWith('/admin')) {
          return caches.match('/index.html')
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

// Push-уведомления
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'CoolCare'
  const options = {
    body: data.body ?? 'Новое уведомление',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Клик по уведомлению — открываем приложение
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
