/**
 * CoolCare Offline Storage
 * IndexedDB для кэширования данных и очереди синхронизации
 */

const DB_NAME = 'coolcare-offline'
const DB_VERSION = 1

const STORES = {
  jobs: 'jobs',
  stats: 'stats',
  user: 'user',
  syncQueue: 'syncQueue',
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Заявки
      if (!db.objectStoreNames.contains(STORES.jobs)) {
        const jobsStore = db.createObjectStore(STORES.jobs, { keyPath: 'id' })
        jobsStore.createIndex('status', 'status', { unique: false })
        jobsStore.createIndex('user_id', 'user_id', { unique: false })
      }

      // Статистика (один объект)
      if (!db.objectStoreNames.contains(STORES.stats)) {
        db.createObjectStore(STORES.stats, { keyPath: 'key' })
      }

      // Профиль пользователя (один объект)
      if (!db.objectStoreNames.contains(STORES.user)) {
        db.createObjectStore(STORES.user, { keyPath: 'key' })
      }

      // Очередь действий для синхронизации
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const syncStore = db.createObjectStore(STORES.syncQueue, {
          keyPath: 'id',
          autoIncrement: true,
        })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ==================== Универсальные операции ====================

async function getAll(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function put(storeName, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function deleteItem(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearStore(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ==================== Jobs ====================

export async function cacheJobs(jobs) {
  await clearStore(STORES.jobs)
  for (const job of jobs) {
    await put(STORES.jobs, job)
  }
}

export async function getCachedJobs() {
  return getAll(STORES.jobs)
}

export async function cacheJob(job) {
  await put(STORES.jobs, job)
}

export async function removeCachedJob(jobId) {
  await deleteItem(STORES.jobs, jobId)
}

// ==================== Stats ====================

export async function cacheStats(stats) {
  await put(STORES.stats, { key: 'dashboard', ...stats })
}

export async function getCachedStats() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.stats, 'readonly')
    const store = tx.objectStore(STORES.stats)
    const request = store.get('dashboard')
    request.onsuccess = () => {
      const result = request.result
      if (result) {
        delete result.key
      }
      resolve(result || null)
    }
    request.onerror = () => reject(request.error)
  })
}

// ==================== User ====================

export async function cacheUser(user) {
  await put(STORES.user, { key: 'current', ...user })
}

export async function getCachedUser() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.user, 'readonly')
    const store = tx.objectStore(STORES.user)
    const request = store.get('current')
    request.onsuccess = () => {
      const result = request.result
      if (result) {
        delete result.key
      }
      resolve(result || null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function clearUserCache() {
  await clearStore(STORES.user)
  await clearStore(STORES.stats)
  await clearStore(STORES.jobs)
  await clearStore(STORES.syncQueue)
}

// ==================== Sync Queue ====================

export async function addToSyncQueue(action) {
  await put(STORES.syncQueue, {
    ...action,
    timestamp: Date.now(),
  })
}

export async function getSyncQueue() {
  return getAll(STORES.syncQueue)
}

export async function removeSyncItem(id) {
  await deleteItem(STORES.syncQueue, id)
}

export async function clearSyncQueue() {
  await clearStore(STORES.syncQueue)
}

/**
 * Обрабатывает очередь синхронизации при возврате в онлайн
 * @param {Function} apiRequest - функция для API-запросов
 * @returns {Object} результат синхронизации
 */
export async function processSyncQueue(apiRequest) {
  const queue = await getSyncQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  // Сортируем по времени создания
  queue.sort((a, b) => a.timestamp - b.timestamp)

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'CREATE_JOB':
          await apiRequest('/jobs', {
            method: 'POST',
            body: JSON.stringify(item.data),
          })
          break
        case 'UPDATE_JOB':
          await apiRequest(`/jobs/${item.jobId}`, {
            method: 'PUT',
            body: JSON.stringify(item.data),
          })
          break
        case 'DELETE_JOB':
          await apiRequest(`/jobs/${item.jobId}`, {
            method: 'DELETE',
          })
          break
        default:
          console.warn('Unknown sync action:', item.type)
      }
      await removeSyncItem(item.id)
      synced++
    } catch (err) {
      console.error('Sync failed for item:', item, err)
      failed++
    }
  }

  return { synced, failed }
}
