import {COLLECTIONS, Database} from '../../database/database'
import {FirebaseDocument} from '../../database/firebase-document'
import {Room} from '../../models/room'

export const getRoomRoomDocument = async (params: {
  database: Database,
  playerId: string,
  roomId: string,
}) => {
  const docRef = params.database
      .collection(COLLECTIONS.ROOMS)
      .doc(params.roomId)

  const doc = await params.database.getDocument(docRef)

  return Room.parse(FirebaseDocument.fromRef(doc))
}
