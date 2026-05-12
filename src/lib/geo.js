/**
 * Obtiene datos de geolocalización a partir de la IP del cliente.
 * Usa la API pública ip-api.com (gratuita, sin key, hasta 1000 req/min).
 */
export async function getVisitorGeo() {
  try {
    const res  = await fetch('https://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon,isp,query')
    const data = await res.json()
    if (data.status !== 'success') return null
    return {
      ip:      data.query,
      city:    data.city,
      region:  data.regionName,
      country: data.country,
      zip:     data.zip,
      lat:     data.lat,
      lon:     data.lon,
      isp:     data.isp,
    }
  } catch {
    return null
  }
}

export function geoLabel(geo) {
  if (!geo) return 'Ubicación desconocida'
  return [geo.city, geo.region, geo.country].filter(Boolean).join(', ')
}

export function flagEmoji(country) {
  const map = {
    'Argentina': '🇦🇷', 'Spain': '🇪🇸', 'Mexico': '🇲🇽', 'Colombia': '🇨🇴',
    'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Brazil': '🇧🇷', 'United States': '🇺🇸',
    'Uruguay': '🇺🇾', 'Venezuela': '🇻🇪', 'Ecuador': '🇪🇨', 'Bolivia': '🇧🇴',
  }
  return map[country] || '🌐'
}
