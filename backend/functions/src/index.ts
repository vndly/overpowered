export * from './entry-points'
import {firestore} from 'firebase-admin'
import {initializeApp} from 'firebase-admin/app'
import {defineString} from 'firebase-functions/params'
import {setGlobalOptions} from 'firebase-functions/v2/options'

export const isEmulator = Boolean(process.env.FUNCTIONS_EMULATOR)
export const X_API_KEY_HEADER = 'x-api-key'

export const MATCH_SERVER_URL = defineString('MATCH_SERVER_URL')
export const API_KEY = defineString('API_KEY')

initializeApp()
firestore().settings({ignoreUndefinedProperties: true})

setGlobalOptions({
  region: 'europe-west6',
  timeoutSeconds: 60,
})
