/**
 * The identifiers the engine and the view model share.
 * They are string unions rather than enums so a view can switch on them exhaustively.
 */

/** The three machines of the production chain, in chain order. */
export type MachineId = 'pulverizer' | 'boiler' | 'turbine'

/** The four storage components, in chain order. */
export type StorageId = 'stockpile' | 'silo' | 'tank' | 'battery'

/** Every upgrade track that can be purchased — specs.md §Upgrade costs. */
export type UpgradeTrackId =
  | `${MachineId}_flow`
  | `${MachineId}_efficiency`
  | `${MachineId}_tolerance`
  | `${StorageId}_capacity`
  | `${StorageId}_flow`

/** Where a run stands. Only `running` advances the simulation. */
export type RunOutcome = 'idle' | 'running' | 'won' | 'timeout' | 'stalled'

/** The stress a machine's strain turns into. */
export type StressKind = 'temperature' | 'pressure' | 'vibration'

/**
 * What a machine is losing rate to, which is what the alerts panel names in words.
 * One gauge carries both sources of strain, so the card cannot say which — specs.md
 * §Buffers and strain.
 */
export type StrainSource = 'none' | 'fill' | 'flow'

/**
 * What a card's drawing says at a glance: the component is idle, working, or in trouble.
 * One vocabulary for all seven, because a player scanning the row is asking the same
 * question of each of them — is this thing doing its job right now.
 */
export type ComponentStatus = 'stopped' | 'normal' | 'critical'
