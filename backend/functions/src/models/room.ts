import {FirebaseDocument} from '../database/firebase-document'
import {RoomStatus} from '../types/room-status'
import {RoomVisibility} from '../types/room-visibility'
import {merge} from '../utils/merge'

export interface IRoom {
  id: string
  createdAt: Date
  version: number
  numberOfPlayers: number
  visibility: RoomVisibility
  status: RoomStatus
  matchType: string
  playerIds: string[]
  players: Record<string, string>
}

export class Room implements IRoom {
  readonly id: string
  readonly createdAt: Date
  readonly version: number
  readonly numberOfPlayers: number
  readonly visibility: RoomVisibility
  readonly status: RoomStatus
  readonly matchType: string
  readonly playerIds: string[]
  readonly players: Record<string, string>

  constructor(data: IRoom) {
    this.id = data.id
    this.createdAt = data.createdAt
    this.version = data.version
    this.numberOfPlayers = data.numberOfPlayers
    this.visibility = data.visibility
    this.status = data.status
    this.matchType = data.matchType
    this.playerIds = data.playerIds
    this.players = data.players
  }

  public get joinedPlayers(): number {
    return this.playerIds.length
  }

  public with(data: Partial<IRoom>): Room {
    return new Room(merge(this, data))
  }

  public hasPlayer(playerId: string): boolean {
    return this.playerIds.includes(playerId)
  }

  public join(params: {
    playerId: string,
    playerName: string
  }): Room {
    const playerInRoom = this.hasPlayer(params.playerId)
    const roomFull = !playerInRoom && (this.numberOfPlayers === (this.joinedPlayers + 1))

    const newStatus = roomFull ? RoomStatus.closed : RoomStatus.open
    const newPlayerIds = this.playerIds
    const newPlayers = this.players

    if (!playerInRoom) {
      newPlayerIds.push(params.playerId)
      newPlayers[params.playerId] = params.playerName
    }

    return this.with({
      status: newStatus,
      playerIds: newPlayerIds,
      players: newPlayers,
    })
  }

  public leave(playerId: string): Room {
    const newPlayerIds = this.playerIds.filter((p) => p !== playerId)
    const newPlayers: Record<string, string> = {}

    for (const mapPlayerId of Object.keys(this.players)) {
      if (mapPlayerId !== playerId) {
        newPlayers[mapPlayerId] = this.players[mapPlayerId]
      }
    }

    return this.with({
      playerIds: newPlayerIds,
      players: newPlayers,
    })
  }

  public static create(params: {
    playerId: string,
    playerName: string,
    version: number,
    matchType: string,
    numberOfPlayers: number,
    visibility: RoomVisibility,
  }): Room {
    return new Room({
      id: '',
      createdAt: new Date(),
      version: params.version,
      numberOfPlayers: params.numberOfPlayers,
      visibility: params.visibility,
      status: RoomStatus.open,
      matchType: params.matchType,
      playerIds: [params.playerId],
      players: {
        [params.playerId]: params.playerName,
      },
    })
  }

  public static parse(document: FirebaseDocument): Room {
    return new Room(document.data())
  }
}
