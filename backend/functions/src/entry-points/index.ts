import * as functionsV2 from 'firebase-functions/v2'
import {AuthData} from 'firebase-functions/lib/common/providers/tasks'
import {Logger} from '../utils/logger'
import {CallableOptions} from 'firebase-functions/v2/https'
import {CustomInternalError} from '../utils/custom-internal-error'
import {callableResponseFromArray, callableResponseFromObject} from '../utils/callable-mapper'

type CallableHandler = (data: any, context?: Context) => any

export const registerCallable = (handler: CallableHandler, options: CallableOptions = {}, authenticated = true) => {
  const newOptions = {
    ...options,
    region: 'europe-west6',
  }

  return functionsV2.https.onCall(newOptions, async (request) => {
    try {
      if (authenticated && !request.auth) {
        throw new CustomInternalError({
          message: 'Trying to execute a callable function without an authenticated user',
        })
      }

      const context = new Context(request.auth)

      const response = await handler(context.withData(request.data), context)

      if (Array.isArray(response)) {
        return callableResponseFromArray(response)
      } else {
        return callableResponseFromObject(response)
      }
    } catch (e) {
      handleCallableError(e, request.data)
    }
  })
}

const handleCallableError = (error: unknown, data: any) => {
  if (error instanceof functionsV2.https.HttpsError) {
    Logger.error({
      error: error,
    }, {
      data: data,
    })
    throw error
  } else if (error instanceof CustomInternalError) {
    error.log()
    throw new functionsV2.https.HttpsError(error.httpErrorCode, error.httpErrorMessage, error.httpErrorDetails)
  } else if (error instanceof Error) {
    Logger.error({
      error: error,
    }, {
      data: data,
    })
    throw new functionsV2.https.HttpsError('internal', error.message, error)
  } else {
    Logger.error({
      error: error,
    }, {
      data: data,
    })
    throw new functionsV2.https.HttpsError('unknown', 'Could not process the request', error)
  }
}

export class Context {
  constructor(
    readonly auth?: AuthData,
  ) {
  }

  public get playerId(): string {
    if (!this.auth) {
      throw new CustomInternalError({
        message: 'Trying to access missing auth property in context',
      })
    } else {
      return this.auth?.uid ?? ''
    }
  }

  public withData(data: any) {
    return {
      ...data,
      playerId: this.playerId,
    }
  }
}

export * from './callables/index'
