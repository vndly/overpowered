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
  | `${MachineId}_capacity`
  | `${MachineId}_efficiency`
  | `${StorageId}_capacity`

/** Where a run stands. Only `running` advances the simulation. */
export type RunOutcome = 'idle' | 'running' | 'won' | 'timeout' | 'stalled'

/** The stress a machine converts its Setting into. */
export type StressKind = 'temperature' | 'pressure' | 'vibration'
