import { allowedPostalCodes, center, radiusKm } from '../config/serviceArea'
import type { Address } from './addressService'

const EARTH_RADIUS_KM = 6371

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

async function geocode(addressLine: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = "AIzaSyB3IjVFCe5jVCaRaqxT902UCxVhBQ9pgFY"
  if (!apiKey) return null
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressLine)}&key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const loc = data?.results?.[0]?.geometry?.location
  if (!loc) return null
  return { lat: loc.lat, lng: loc.lng }
}

export async function validateAddress(address: Address): Promise<{ serviceable: boolean; reason?: string }> {
  // 1) Postal code whitelist check
  if (allowedPostalCodes.length > 0) {
    const ok = allowedPostalCodes.includes(address.postalCode)
    if (!ok) return { serviceable: false, reason: 'Postal code not in service area' }
  }

  // 2) Geocode + radius check (if API key available)
  const composed = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state} ${address.postalCode}`
  const coords = await geocode(composed)
  if (coords) {
    const dist = haversineDistance(center.lat, center.lng, coords.lat, coords.lng)
    if (dist > radiusKm) {
      return { serviceable: false, reason: 'Outside service radius' }
    }
  }

  // Default: serviceable
  return { serviceable: true }
}
