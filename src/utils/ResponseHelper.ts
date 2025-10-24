import { Response } from 'express'

export class ResponseHelper {
  static success(res: Response, data?: any, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data
    })
  }

  static error(res: Response, message = 'Internal server error', status = 500) {
    return res.status(status).json({
      success: false,
      message,
      error: message
    })
  }

  static badRequest(res: Response, message = 'Bad request') {
    return res.status(400).json({
      success: false,
      message,
      error: message
    })
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return res.status(401).json({
      success: false,
      message,
      error: message
    })
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return res.status(403).json({
      success: false,
      message,
      error: message
    })
  }

  static notFound(res: Response, message = 'Not found') {
    return res.status(404).json({
      success: false,
      message,
      error: message
    })
  }

  static created(res: Response, data?: any, message = 'Created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data
    })
  }
}