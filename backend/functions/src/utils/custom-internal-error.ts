import {LogData, Logger} from '../utils/logger'
import {FunctionsErrorCode} from 'firebase-functions/v2/https'

type ErrorCause = any

export class CustomInternalError extends Error {
  readonly originalMessage: string
  readonly data?: LogData

  constructor(params: {
    message: string,
    data?: LogData,
    cause?: ErrorCause,
}) {
    super(params.message)

    this.data = params.data

    if (params.cause) {
      if (params.cause.originalMessage) {
        this.originalMessage = params.cause.originalMessage
      } else {
        this.originalMessage = params.cause.toString()
      }

      if (params.cause.data) {
        this.data = {
          ...this.data,
          causeData: params.cause.data,
        }
      }

      this.stack += '\n\nCaused by: '

      if (params.cause instanceof Error) {
        this.stack += params.cause.stack ?? params.cause.toString()
      } else {
        this.stack += params.cause.toString()
      }

      this.stack += '\n\n'
    } else {
      this.originalMessage = `${this.name}: ${params.message}`
    }
  }

  public log(): void {
    Logger.error({
      error: this,
    })
  }

  public get httpErrorCode(): FunctionsErrorCode {
    return 'internal'
  }

  public get httpErrorMessage(): string {
    return this.message
  }

  public get httpErrorDetails(): unknown {
    return {
      name: this.name,
      data: this.data,
    }
  }
}
