import {Boiler} from '@/game/boiler'
import {CoalMarket} from '@/game/coal_market'
import {BACKLOG_THRESHOLD, MAX_SETTING_STEPS, RESERVE_FRACTION, RESTART_MULTIPLE, SECONDS_PER_HOUR, STARTING_CHARGE, STARTUP_SECONDS, STARVE_THRESHOLD, STORAGE_CAPACITY, STRAIN_GAIN, TARGET_ENERGY, TIME_LIMIT} from '@/game/constants'
import {EnergyLedger} from '@/game/energy_ledger'
import type {Machine} from '@/game/machine'
import {Pulverizer} from '@/game/pulverizer'
import {Storage} from '@/game/storage'
import {Turbine} from '@/game/turbine'
import type {MachineId, RunOutcome, UpgradeTrackId} from '@/game/types'
import type {UpgradeTrack} from '@/game/upgrade_track'

/**
 * The whole game: every rule in docs/specs.md, and nothing else.
 * It owns the plant, advances it one fixed step at a time, and applies player actions.
 * It imports nothing from Vue — the view model reads it, and no component ever holds it.
 */
export class GameEngine {
  readonly stockpile: Storage
  readonly silo: Storage
  readonly tank: Storage
  readonly battery: Storage
  readonly pulverizer: Pulverizer
  readonly boiler: Boiler
  readonly turbine: Turbine
  readonly market: CoalMarket
  readonly ledger: EnergyLedger
  private elapsed: number // Run time consumed, s
  private runOutcome: RunOutcome // Where the run stands

  constructor(seed: number) {
    this.stockpile = new Storage(STORAGE_CAPACITY.stockpile)
    this.silo = new Storage(STORAGE_CAPACITY.silo)
    this.tank = new Storage(STORAGE_CAPACITY.tank)
    this.battery = new Storage(STORAGE_CAPACITY.battery, STARTING_CHARGE)
    this.pulverizer = new Pulverizer()
    this.boiler = new Boiler()
    this.turbine = new Turbine()
    this.market = new CoalMarket(seed)
    this.ledger = new EnergyLedger(STARTING_CHARGE)
    this.elapsed = 0
    this.runOutcome = 'idle'
  }

  /** Run time consumed, s. */
  get elapsedSeconds(): number {
    return this.elapsed
  }

  /** Run time left before the timer expires, s. */
  get remainingSeconds(): number {
    return Math.max(0, TIME_LIMIT - this.elapsed)
  }

  /** Where the run stands. */
  get outcome(): RunOutcome {
    return this.runOutcome
  }

  /** MWh the Pulverizer and Boiler draw over StartupSeconds at the current Settings. */
  get startupEnergy(): number {
    const power = this.pulverizer.electricConsumption + this.boiler.electricConsumption
    return (power * STARTUP_SECONDS) / SECONDS_PER_HOUR
  }

  /**
   * The floor upgrade spending stops at. The two terms scale with different things — the
   * first with the Battery, the second with machine consumption — and taking the larger
   * is what stops the upgrade floor sinking below the coal floor, where a player could
   * spend down to the reserve and find no coal affordable at any price.
   */
  get minimumReserve(): number {
    return Math.max(this.battery.capacity * RESERVE_FRACTION, this.startupEnergy * RESTART_MULTIPLE)
  }

  /** MWh available for upgrades — specs.md §Spendable energy. */
  get spendableEnergy(): number {
    return Math.max(0, this.battery.contents - this.minimumReserve)
  }

  /**
   * MWh available for coal. Coal is floored by StartupEnergy rather than MinimumReserve
   * because it is the only purchase that can restart a stalled chain.
   */
  get coalBudget(): number {
    return Math.max(0, this.battery.contents - this.startupEnergy)
  }

  /** Strain on the Pulverizer, from a Silo it is grinding into. */
  get pulverizerStrain(): number {
    return this.backlogStrain(this.silo)
  }

  /** Strain on the Boiler, from a Tank it is pushing into. */
  get boilerStrain(): number {
    return this.backlogStrain(this.tank)
  }

  /** Strain on the Turbine, from a Tank it is draining. */
  get turbineStrain(): number {
    return this.starveStrain(this.tank)
  }

  /**
   * Starts the run. Does nothing once a run is under way or over.
   */
  start(): void {
    if (this.runOutcome === 'idle') {
      this.runOutcome = 'running'
    }
  }

  /**
   * Advances the simulation by one step — specs.md §Simulation step. Every machine reads
   * state as it stood at the start of the step and every storage write lands at the end,
   * so the result does not depend on the order the machines are evaluated in.
   * @param deltaSeconds - Length of the step
   */
  step(deltaSeconds: number): void {
    if (this.runOutcome !== 'running') {
      return
    }

    // The market moves first, so everything in this step reads one price
    this.market.step(deltaSeconds)

    // Requested rates, all from start-of-step state
    const rawDraw = this.pulverizer.rawCoalConsumption
    const fuelDraw = this.boiler.fuelConsumption
    const steamDraw = this.turbine.steamConsumption
    const pulverizerPower = this.pulverizer.electricConsumption
    const boilerPower = this.boiler.electricConsumption

    // Electricity is shared in proportion to demand, so both consumers run at the same
    // ratio. A tripped machine requests nothing.
    const requestedEnergy = ((this.pulverizer.isTripped ? 0 : pulverizerPower)
      + (this.boiler.isTripped ? 0 : boilerPower)) * deltaSeconds / SECONDS_PER_HOUR
    const electricityRatio = requestedEnergy <= 0
      ? 1
      : Math.min(1, this.battery.contents / requestedEnergy)

    const pulverizerRatio = this.pulverizer.isTripped
      ? 0
      : Math.min(electricityRatio, this.inputRatio(rawDraw, this.stockpile, deltaSeconds))
    const boilerRatio = this.boiler.isTripped
      ? 0
      : Math.min(electricityRatio, this.inputRatio(fuelDraw, this.silo, deltaSeconds))
    const turbineRatio = this.turbine.isTripped
      ? 0
      : this.inputRatio(steamDraw, this.tank, deltaSeconds)

    // Strain is start-of-step state like every other input to a step, so it is read
    // before any storage moves
    const pulverizerStrain = this.pulverizerStrain
    const boilerStrain = this.boilerStrain
    const turbineStrain = this.turbineStrain

    // Storage writes. Each store takes what it has room for before it is drawn down, so
    // the room is the room there was at the start of the step.
    const generationPower = this.turbine.powerOutput * turbineRatio
    const consumptionPower = pulverizerPower * pulverizerRatio + boilerPower * boilerRatio
    const generated = (generationPower * deltaSeconds) / SECONDS_PER_HOUR
    const used = (consumptionPower * deltaSeconds) / SECONDS_PER_HOUR
    const discarded = this.battery.add(generated)

    this.battery.remove(used)
    this.silo.add(this.pulverizer.pulverizedOutput * pulverizerRatio * deltaSeconds)
    this.silo.remove(fuelDraw * boilerRatio * deltaSeconds)
    this.tank.add(this.boiler.steamOutput * boilerRatio * deltaSeconds)
    this.tank.remove(steamDraw * turbineRatio * deltaSeconds)
    this.stockpile.remove(rawDraw * pulverizerRatio * deltaSeconds)
    this.ledger.recordEnergy(generated - discarded, discarded, used)
    this.ledger.recordFlow(generationPower, consumptionPower, deltaSeconds)

    // Wear, and then the repairs it causes
    this.pulverizer.advanceWear(pulverizerStrain, pulverizerRatio, deltaSeconds)
    this.boiler.advanceWear(boilerStrain, boilerRatio, deltaSeconds)
    this.turbine.advanceWear(turbineStrain, turbineRatio, deltaSeconds)

    this.elapsed += deltaSeconds
    this.ledger.recordContents(this.battery.contents)
    this.updateOutcome()
  }

  /**
   * Moves a machine's Setting.
   * @param machine - The machine to set
   * @param steps - Setting in tenths, clamped to 0..MaxSettingSteps
   */
  setSettingSteps(machine: MachineId, steps: number): void {
    this.machineFor(machine).settingSteps = Math.max(0, Math.min(MAX_SETTING_STEPS, Math.round(steps)))
  }

  /**
   * Buys raw coal, reduced to what the Stockpile has room for and what the player can
   * afford — specs.md §Stockpile.
   * @param kilograms - Raw coal requested
   * @returns The kilograms actually bought
   */
  buyCoal(kilograms: number): number {
    const price = this.market.pricePerKilogram

    if (kilograms <= 0 || price <= 0) {
      return 0
    }

    const room = this.stockpile.capacity - this.stockpile.contents
    const affordable = this.coalBudget / price
    const purchased = Math.max(0, Math.min(kilograms, room, affordable))

    if (purchased <= 0) {
      return 0
    }

    const cost = purchased * price

    this.battery.remove(cost)
    this.stockpile.add(purchased)
    this.ledger.recordCoalPurchase(cost)
    return purchased
  }

  /**
   * @param track - The upgrade track to price
   * @returns MWh the next purchase on that track costs
   */
  upgradeCost(track: UpgradeTrackId): number {
    return this.trackFor(track).cost
  }

  /**
   * @param track - The upgrade track to price
   * @returns Whether SpendableEnergy covers its next purchase
   */
  canAfford(track: UpgradeTrackId): boolean {
    return this.upgradeCost(track) <= this.spendableEnergy
  }

  /**
   * Buys one level on a track, paying for it out of the Battery.
   * @param track - The upgrade track to buy on
   * @returns Whether the purchase went through
   */
  purchaseUpgrade(track: UpgradeTrackId): boolean {
    if (!this.canAfford(track)) {
      return false
    }

    const cost = this.upgradeCost(track)

    this.battery.remove(cost)
    this.ledger.recordUpgrade(cost)
    this.applyUpgrade(track)
    return true
  }

  /**
   * Fraction of its requested draw a machine's input store can supply this step.
   * @param requested - Requested draw, in units per second
   * @param store - The store the machine draws from
   * @param deltaSeconds - Length of the step
   * @returns InputRatio, 0 to 1
   */
  private inputRatio(requested: number, store: Storage, deltaSeconds: number): number {
    const demand = requested * deltaSeconds
    return demand <= 0 ? 1 : Math.min(1, store.contents / demand)
  }

  /**
   * Strain on a machine pushing into a store that is backing up.
   * @param store - The store below the machine
   * @returns Strain, 0 to StrainGain
   */
  private backlogStrain(store: Storage): number {
    const backlog = (store.fill - BACKLOG_THRESHOLD) / (1 - BACKLOG_THRESHOLD)
    return STRAIN_GAIN * Math.max(0, Math.min(1, backlog))
  }

  /**
   * Strain on a machine drawing from a store that is running dry.
   * @param store - The store above the machine
   * @returns Strain, 0 to StrainGain
   */
  private starveStrain(store: Storage): number {
    const starve = (STARVE_THRESHOLD - store.fill) / STARVE_THRESHOLD
    return STRAIN_GAIN * Math.max(0, Math.min(1, starve))
  }

  /**
   * Ends the run once it is decided: a stall first, since it is a loss whatever else is
   * true, then the win, then the timer.
   */
  private updateOutcome(): void {
    if (this.isStalled) {
      this.runOutcome = 'stalled'
    } else if (this.battery.contents >= TARGET_ENERGY) {
      this.runOutcome = 'won'
    } else if (this.elapsed >= TIME_LIMIT) {
      this.runOutcome = 'timeout'
    }
  }

  /** Nothing left to produce with and nothing left to buy with — specs.md §Stalling. */
  private get isStalled(): boolean {
    return this.battery.contents <= 0
      && this.stockpile.contents <= 0
      && this.silo.contents <= 0
      && this.tank.contents <= 0
  }

  /**
   * @param machine - The machine to look up
   * @returns The machine itself
   */
  private machineFor(machine: MachineId): Machine {
    switch (machine) {
      case 'pulverizer':
        return this.pulverizer
      case 'boiler':
        return this.boiler
      case 'turbine':
        return this.turbine
    }
  }

  /**
   * @param track - The upgrade track to look up
   * @returns The track that prices it
   */
  private trackFor(track: UpgradeTrackId): UpgradeTrack {
    switch (track) {
      case 'pulverizer_capacity':
        return this.pulverizer.capacityUpgrade
      case 'pulverizer_efficiency':
        return this.pulverizer.efficiencyUpgrade
      case 'boiler_capacity':
        return this.boiler.capacityUpgrade
      case 'boiler_efficiency':
        return this.boiler.efficiencyUpgrade
      case 'turbine_capacity':
        return this.turbine.capacityUpgrade
      case 'turbine_efficiency':
        return this.turbine.efficiencyUpgrade
      case 'stockpile_capacity':
        return this.stockpile.capacityUpgrade
      case 'silo_capacity':
        return this.silo.capacityUpgrade
      case 'tank_capacity':
        return this.tank.capacityUpgrade
      case 'battery_capacity':
        return this.battery.capacityUpgrade
    }
  }

  /**
   * Applies one level of an upgrade to the component that owns the track.
   * @param track - The upgrade track that was bought
   */
  private applyUpgrade(track: UpgradeTrackId): void {
    switch (track) {
      case 'pulverizer_capacity':
        this.pulverizer.upgradeCapacity()
        break
      case 'pulverizer_efficiency':
        this.pulverizer.upgradeEfficiency()
        break
      case 'boiler_capacity':
        this.boiler.upgradeCapacity()
        break
      case 'boiler_efficiency':
        this.boiler.upgradeEfficiency()
        break
      case 'turbine_capacity':
        this.turbine.upgradeCapacity()
        break
      case 'turbine_efficiency':
        this.turbine.upgradeEfficiency()
        break
      case 'stockpile_capacity':
        this.stockpile.upgradeCapacity()
        break
      case 'silo_capacity':
        this.silo.upgradeCapacity()
        break
      case 'tank_capacity':
        this.tank.upgradeCapacity()
        break
      case 'battery_capacity':
        this.battery.upgradeCapacity()
        break
    }
  }
}
