/* "Location map" for the Contact page: Leaflet + OpenStreetMap tiles. Free: no API key, no billing.
   Needs only the `leaflet` package (already in your project). Use it:  <OfficeMap />  in place of the old map block. */
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/* Coordinates are approximate city centres: replace each lat/lng with the exact office pin
   (Google Maps -> right-click the office -> click the numbers to copy "lat, lng"). */
const OFFICES = [
  { id: 'salem', label: 'Salem', title: 'Aakash Aqua Tech Pvt Ltd - Head Office', lat: 11.6643, lng: 78.146 },
  { id: 'coimbatore', label: 'Coimbatore', title: 'Aakash Aqua Tech Pvt Ltd - Coimbatore Branch', lat: 11.0168, lng: 76.9558 },
  { id: 'dharmapuri', label: 'Dharmapuri', title: 'Aakash Pure Aqua Tech - Dharmapuri Branch', lat: 12.1211, lng: 78.1582 },
]

/* a drawn pin (no image files, so Vite never breaks the default Leaflet marker icon) */
const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#0e7c86;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26],
})

export default function OfficeMap({ initial = 'salem' }) {
  const box = useRef(null)
  const map = useRef(null)
  const pins = useRef({})
  const [active, setActive] = useState(initial)

  useEffect(() => {
    const first = OFFICES.find((o) => o.id === initial) || OFFICES[0]
    map.current = L.map(box.current, { center: [first.lat, first.lng], zoom: 15, scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current)
    OFFICES.forEach((o) => {
      pins.current[o.id] = L.marker([o.lat, o.lng], { icon: pinIcon, title: o.title })
        .addTo(map.current)
        .bindPopup(`<strong>${o.title}</strong>`)
        .on('click', () => setActive(o.id))
    })
    return () => {
      map.current.remove() /* StrictMode mounts twice in dev: always clean up */
      map.current = null
      pins.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const o = OFFICES.find((x) => x.id === active)
    if (!map.current || !o) return
    map.current.flyTo([o.lat, o.lng], 15, { duration: 0.8 })
    pins.current[o.id] && pins.current[o.id].openPopup()
  }, [active])

  return (
    <div>
      <div ref={box} style={{ height: 420, borderRadius: 16, overflow: 'hidden' }} />
      {/* use your existing tab classes instead of these if you want the same look as before */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {OFFICES.map((o) => (
          <button key={o.id} type="button" className={'sp-btn' + (o.id === active ? '' : ' ghost')} onClick={() => setActive(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}