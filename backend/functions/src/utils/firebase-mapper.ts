import {Timestamp} from 'firebase-admin/firestore'
import {isDate, isTimestamp} from './dates'

export const mapToFirebaseDocument = (o: any): any => {
  if (o && typeof o === 'object') {
    if (isDate(o)) {
      return Timestamp.fromDate(o as Date)
    } else if (Array.isArray(o)) {
      return o.map(mapToFirebaseDocument)
    } else {
      return {
        ...Object.keys(o).reduce(
            (acc: any, key) => {
              acc[key] = mapToFirebaseDocument(o[key])
              return acc
            },
            {}
        ),
      }
    }
  }

  return o
}

export const mapFromFirebaseDocument = (o: any): any => {
  if (o && typeof o === 'object') {
    if (isTimestamp(o)) {
      return (o as Timestamp).toDate()
    } else if (Array.isArray(o)) {
      return o.map(mapFromFirebaseDocument)
    } else {
      return {
        ...Object.keys(o).reduce(
            (acc: any, key) => {
              acc[key] = mapFromFirebaseDocument(o[key])
              return acc
            },
            {}
        ),
      }
    }
  }

  return o
}
