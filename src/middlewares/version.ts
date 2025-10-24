import { Request, Response, NextFunction } from 'express'
import { ApiVersionManager } from '@/utils/version'

export interface VersionedRequest extends Request {
  apiVersion?: string
}

export const versionMiddleware = (req: VersionedRequest, res: Response, next: NextFunction) => {
  // Extract version from URL path
  const urlPath = req.path
  const versionMatch = urlPath.match(/^\/v(\d+)/)
  
  let version = 'v1' // Default version
  
  if (versionMatch) {
    version = `v${versionMatch[1]}`
  }

  // Check if version is supported
  if (!ApiVersionManager.isVersionSupported(version)) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported API version',
      message: `API version '${version}' is not supported`,
      supportedVersions: ApiVersionManager.getSupportedVersions(),
      currentVersion: ApiVersionManager.getCurrentVersion()
    })
  }

  // Add deprecation warning header
  if (ApiVersionManager.isVersionDeprecated(version)) {
    const versionInfo = ApiVersionManager.getVersionInfo(version)
    res.set('X-API-Deprecation-Warning', 'true')
    res.set('X-API-Deprecation-Date', versionInfo?.deprecationDate || 'Unknown')
    res.set('X-API-End-Of-Life-Date', versionInfo?.endOfLifeDate || 'Unknown')
    res.set('X-API-Latest-Version', ApiVersionManager.getLatestVersion())
  }

  // Add version info headers
  res.set('X-API-Version', version)
  res.set('X-API-Status', ApiVersionManager.getVersionStatus(version) || 'unknown')

  // Attach version to request object
  req.apiVersion = version

  next()
}

export const acceptVersionHeader = (req: VersionedRequest, res: Response, next: NextFunction) => {
  // Check for version in Accept header (alternative approach)
  const acceptHeader = req.get('Accept')
  if (acceptHeader && acceptHeader.includes('application/vnd.realestate')) {
    const versionMatch = acceptHeader.match(/application\/vnd\.realestate\.v(\d+)\+json/)
    if (versionMatch) {
      req.apiVersion = `v${versionMatch[1]}`
    }
  }
  
  next()
}