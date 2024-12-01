import {COLLECTIONS, Database} from '../../database/database'

export const deleteRoomDocument = async (params: {
  database: Database,
  roomId: string,
}) => {
  const docRef = params.database
      .collection(COLLECTIONS.ROOMS)
      .doc(params.roomId)

  await params.database.deleteDocument(docRef)

  return docRef
}
