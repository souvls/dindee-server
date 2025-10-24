export interface ApiVersion {
  version: string
  status: 'stable' | 'beta' | 'alpha' | 'deprecated' | 'development'
  releaseDate?: string
  deprecationDate?: string
  endOfLifeDate?: string
  description?: string
  changelog?: string[]
}

export const API_VERSIONS: Record<string, ApiVersion> = {
  'v1': {
    version: '1.0.0',
    status: 'stable',
    releaseDate: '2024-01-01',
    description: 'Initial stable release with core functionality',
    changelog: [
      'User authentication and authorization',
      'Post CRUD operations',
      'Admin functionality',
      'Basic search and filtering'
    ]
  },
  'v2': {
    version: '2.0.0',
    status: 'development',
    description: 'Enhanced version with advanced features',
    changelog: [
      'Enhanced authentication with 2FA',
      'Advanced post filtering and search',
      'Real-time notifications',
      'Improved performance and caching',
      'GraphQL support (planned)',
      'Microservices architecture (planned)'
    ]
  }
}

export class ApiVersionManager {
  static getSupportedVersions(): string[] {
    return Object.keys(API_VERSIONS)
  }

  static getVersionInfo(version: string): ApiVersion | null {
    return API_VERSIONS[version] || null
  }

  static getCurrentVersion(): string {
    return 'v1'
  }

  static getLatestVersion(): string {
    return 'v1'
  }

  static isVersionSupported(version: string): boolean {
    return version in API_VERSIONS && API_VERSIONS[version].status !== 'deprecated'
  }

  static isVersionDeprecated(version: string): boolean {
    const versionInfo = API_VERSIONS[version]
    return versionInfo ? versionInfo.status === 'deprecated' : false
  }

  static getVersionStatus(version: string): string | null {
    const versionInfo = API_VERSIONS[version]
    return versionInfo ? versionInfo.status : null
  }

  static getAllVersions(): Record<string, ApiVersion> {
    return API_VERSIONS
  }
}