export interface LatLngCoordinates {
  latitude: number
  longitude: number
}

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export class CoordinateUtils {
  /**
   * แปลง latitude, longitude เป็น GeoJSON Point
   */
  static toGeoJSON(latitude: number, longitude: number): GeoJSONPoint {
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90`)
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180`)
    }

    return {
      type: 'Point',
      coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
    }
  }

  /**
   * แปลง GeoJSON Point เป็น latitude, longitude object
   */
  static fromGeoJSON(geoPoint: GeoJSONPoint): LatLngCoordinates {
    if (!geoPoint || geoPoint.type !== 'Point' || !Array.isArray(geoPoint.coordinates)) {
      throw new Error('Invalid GeoJSON Point format')
    }

    const [longitude, latitude] = geoPoint.coordinates
    return { latitude, longitude }
  }

  /**
   * ตรวจสอบว่าพิกัดอยู่ในประเทศลาวหรือไม่
   */
  static isInLaos(latitude: number, longitude: number): boolean {
    // พิกัดประเทศลาว (approximate bounds)
    const LAOS_BOUNDS = {
      north: 22.5,
      south: 13.9, 
      east: 107.6,
      west: 100.1
    }

    return latitude >= LAOS_BOUNDS.south && 
           latitude <= LAOS_BOUNDS.north &&
           longitude >= LAOS_BOUNDS.west && 
           longitude <= LAOS_BOUNDS.east
  }

  /**
   * คำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
   */
  static calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371 // รัศมีโลกในกิโลเมตร
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * สร้าง bounding box สำหรับการค้นหาในรัศมี
   */
  static createBoundingBox(
    centerLat: number, 
    centerLng: number, 
    radiusKm: number
  ): {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  } {
    const latDelta = radiusKm / 111.32 // 1 degree lat ≈ 111.32 km
    const lngDelta = radiusKm / (111.32 * Math.cos(centerLat * Math.PI / 180))

    return {
      minLat: centerLat - latDelta,
      maxLat: centerLat + latDelta,
      minLng: centerLng - lngDelta,
      maxLng: centerLng + lngDelta
    }
  }
}

// Export standalone functions สำหรับใช้งาน
export const toGeoJSON = CoordinateUtils.toGeoJSON
export const fromGeoJSON = CoordinateUtils.fromGeoJSON
export const isInLaos = CoordinateUtils.isInLaos
export const calculateDistance = CoordinateUtils.calculateDistance
export const createBoundingBox = CoordinateUtils.createBoundingBox