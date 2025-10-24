import { Response } from 'express'

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: any[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class ResponseHelper {
  static success<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    }
    return res.status(statusCode).json(response)
  }

  static successWithPagination<T>(
    res: Response,
    data: T,
    pagination: { page: number; limit: number; total: number; totalPages: number },
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      pagination,
    }
    return res.status(statusCode).json(response)
  }

  static error(
    res: Response,
    message: string,
    errors?: any[],
    statusCode: number = 400
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
    }
    return res.status(statusCode).json(response)
  }

  static validationError(res: Response, errors: any[]): Response {
    return this.error(res, 'Validation failed', errors, 400)
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, message, undefined, 404)
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, undefined, 401)
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, undefined, 403)
  }

  static badRequest(res: Response, message: string = 'Bad Request'): Response {
    return this.error(res, message, undefined, 400)
  }

  static conflict(res: Response, message: string = 'Resource already exists'): Response {
    return this.error(res, message, undefined, 409)
  }

  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, message, undefined, 500)
  }
}