import {COLLECTIONS, Database, WriteOptionMerge} from '../../database/database'
import {Room} from '../../models/room'

export const createRoomDocument = async (params: {
  database: Database,
  room: Room,
}) => {
  const newId = params.database
      .collection(COLLECTIONS.ROOMS)
      .doc().id

  const newRoom = params.room.with({
    id: newId,
  })

  const docRef = params.database
      .collection(COLLECTIONS.ROOMS)
      .doc(newRoom.id)

  await params.database.setDocument(docRef, newRoom, WriteOptionMerge)

  return newRoom
}
