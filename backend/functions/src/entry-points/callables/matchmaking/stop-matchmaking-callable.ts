import {deleteRoomDocument} from '../../../collections/rooms/delete-room-document'
import {getRoomRoomDocument} from '../../../collections/rooms/get-room-document'
import {updateRoomDocument} from '../../../collections/rooms/update-room-document'
import {Database} from '../../../database/database'
import {RoomStatus} from '../../../types/room-status'
import {CustomInternalError} from '../../../utils/custom-internal-error'
import {registerCallable} from '../../index'

interface StopMatchmakingCallableParams {
  playerId: string
  roomId: string
}

export const stopMatchmakingCallable = registerCallable(async (params: StopMatchmakingCallableParams) => {
  return Database.runTransaction(async (database) => {
    const room = await getRoomRoomDocument({
      database: database,
      playerId: params.playerId,
      roomId: params.roomId,
    })

    if (!room.hasPlayer(params.playerId)) {
      throw new CustomInternalError({
        message: 'Player not in room',
        data: {
          playerId: params.playerId,
          roomId: params.roomId,
        },
      })
    }

    if (room.status !== RoomStatus.open) {
      throw new CustomInternalError({
        message: 'Room is not open',
        data: {
          playerId: params.playerId,
          roomId: params.roomId,
        },
      })
    }

    if (room.joinedPlayers === 1) {
      await deleteRoomDocument({
        database: database,
        roomId: params.roomId,
      })
    } else {
      const newRoom = room.leave(params.playerId)

      await updateRoomDocument({
        database: database,
        room: newRoom,
      })
    }
  })
})
