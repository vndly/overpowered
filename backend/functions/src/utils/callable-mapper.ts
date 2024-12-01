import {isDate} from './dates'

export const callableResponseFromObject = (o: any): any => {
  if (o && typeof o === 'object') {
    if (isDate(o)) {
      return (o as Date).toISOString()
    } else if (Array.isArray(o)) {
      return o.map(callableResponseFromObject)
    } else {
      return {
        ...Object.keys(o).reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (acc: any, key) => {
              acc[key] = callableResponseFromObject(o[key])
              return acc
            },
            {}
        ),
      }
    }
  }
  return o
}

export const callableResponseFromArray = (o: any[]): any => o.map(callableResponseFromObject)
