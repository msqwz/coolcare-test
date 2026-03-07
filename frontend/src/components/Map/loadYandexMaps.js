import { YANDEX_MAPS_KEY } from '../../constants'

export function loadYandexMaps() {
  return new Promise((resolve) => {
    if (window.ymaps) {
      if (window.ymaps.ready) window.ymaps.ready(resolve)
      else resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_KEY}&lang=ru_RU&load=package.full`
    script.async = true
    script.onload = () => {
      if (window.ymaps && window.ymaps.ready) window.ymaps.ready(resolve)
      else resolve()
    }
    document.head.appendChild(script)
  })
}
