import axios, {HttpStatusCode} from 'axios'
import {Room} from '../models/room'
import {API_KEY, MATCH_SERVER_URL, X_API_KEY_HEADER} from '..'

export const createMatchServerRoom = async (room: Room): Promise<boolean> => {
  const xAxios = axios.create()
  const response = await xAxios.request({
    baseURL: MATCH_SERVER_URL.value(),
    url: '/rooms',
    method: 'POST',
    headers: {
      [X_API_KEY_HEADER]: API_KEY.value(),
      ['Content-Type']: 'application/json',
    },
    data: {
      roomId: room.id,
      createdAt: room.createdAt.toISOString(),
      numberOfPlayers: room.numberOfPlayers,
      matchType: room.matchType,
      players: room.players,
    },
  })

  return (response.status === HttpStatusCode.Created)
}
