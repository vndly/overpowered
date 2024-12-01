import * as functions from 'firebase-functions/v2'

export class Logger {
  static debug(params: {
    message?: string,
  }, data?: LogData) {
    functions.logger.debug(...this.buildEntry({
      message: params.message,
      data: data,
    }))
  }

  static log(params: {
    message?: string,
  }, data?: LogData) {
    functions.logger.log(...this.buildEntry({
      message: params.message,
      data: data,
    }))
  }

  static info(params: {
    message?: string,
  }, data?: LogData) {
    functions.logger.info(...this.buildEntry({
      message: params.message,
      data: data,
    }))
  }

  static warning(params: {
    message?: string,
    error?: unknown,
  }, data?: LogData) {
    functions.logger.warn(...this.buildEntry({
      message: params.message,
      error: params.error,
      data: data,
    }))
  }

  static error(params: {
    error?: unknown,
  }, data?: LogData) {
    functions.logger.error(...this.buildEntry({
      error: params.error,
      data: data,
    }))
  }

  private static buildEntry(params: {
    message?: string,
    error?: unknown,
    data?: LogData,
  }) {
    const payload: any = params.data

    let errorMessage = ''

    if (params.error) {
      payload.error = params.error

      if (params.error instanceof Error) {
        errorMessage = params.error.message
      } else {
        errorMessage = params?.error?.toString()
      }
    }

    let message = params.message || errorMessage

    if (params.error instanceof Error) {
      message += `\n\n`
    }

    const response = []

    if (message) {
      response.push(message)
    }

    if (params.error instanceof Error) {
      response.push(params.error)
    }

    response.push(payload)

    return response
  }
}

export type LogValue = string | number | boolean | string[] | null | undefined

export type LogData = Record<string, LogValue | Record<string, LogValue>>
