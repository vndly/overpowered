import {COLLECTIONS, Database} from '../../database/database'
import {FirebaseDocument} from '../../database/firebase-document'
import {Query} from 'firebase-admin/firestore'
import {Room} from '../../models/room'

export const getAvailableRoomDocument = async (params: {
  database: Database,
  playerId: string,
  version: number,
  matchType: string,
  numberOfPlayers: number,
}) => {
  const queryJoinedRoom = params.database
      .collection(COLLECTIONS.ROOMS)
      .where('status', '==', 'open')
      .where('version', '==', params.version)
      .where('matchType', '==', params.matchType)
      .where('playerIds', 'array-contains', params.playerId)
      .where('numberOfPlayers', '==', params.numberOfPlayers)
      .limit(1)

  const resultJoinedRoom = await executeQuery({
    database: params.database,
    query: queryJoinedRoom,
  })

  if (resultJoinedRoom) {
    return resultJoinedRoom
  } else {
    const queryNewRoom = params.database
        .collection(COLLECTIONS.ROOMS)
        .where('status', '==', 'open')
        .where('version', '==', params.version)
        .where('matchType', '==', params.matchType)
        .where('numberOfPlayers', '==', params.numberOfPlayers)
        .limit(1)

    const resultNewRoom = await executeQuery({
      database: params.database,
      query: queryNewRoom,
    })

    return resultNewRoom
  }
}

const executeQuery = async (params: {
  database: Database,
  query: Query,
}) => {
  const snapshot = await params.database.query(params.query)

  if (snapshot.size > 0) {
    return Room.parse(FirebaseDocument.fromRef(snapshot.docs[0]))
  } else {
    return undefined
  }
}
