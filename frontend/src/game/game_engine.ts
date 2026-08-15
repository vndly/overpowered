import {Boiler} from '@/game/boiler'
import {CoalMarket} from '@/game/coal_market'
import {BACKLOG_THRESHOLD, RESERVE_FRACTION, RESTART_MULTIPLE, SECONDS_PER_HOUR, STARTING_CHARGE, STARTUP_SECONDS, STARVE_THRESHOLD, STORAGE, STRAIN_GAIN, TANK_STARTING_FILL, TARGET_ENERGY, TIME_LIMIT} from '@/game/constants'
import {EnergyLedger} from '@/game/energy_ledger'
import {Pulverizer} from '@/game/pulverizer'
import {Storage} from '@/game/storage'
import {Turbine} from '@/game/turbine'
import type {MachineId, RunOutcome, StrainSource, UpgradeTrackId} from '@/game/types'
import type {UpgradeTrack} from '@/game/upgrade_track'

/** What a machine is fighting, and how hard — specs.md §Buffers and strain. */
export interface Strain {
  readonly value: number // StrainGain × Pressure, the term that raises stress
  readonly source: StrainSource // Which of the two pressures is the worse one
}

const CLEAR: Strain = {
  value: 0,
  source: 'none',
}

/**
 * The whole game: every rule in docs/specs.md, and nothing else.
 * It owns the plant, advances it one fixed step at a time, and applies player actions.
 * It imports nothing from Vue — the view model reads it, and no component ever holds it.
 *
 * Machines have no operating control. Every machine runs at its Capacity, so the only
 * player actions are buying coal and buying upgrades, and the only thing that can make a
 * machine wear is being out of step with the chain around it.
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
  // The seed the run was created from. Nothing draws from it while every rule is
  // deterministic — it is the hook a rule that needs randomness would take.
  readonly seed: number
  private elapsed: number // Run time consumed, s
  private runOutcome: RunOutcome // Where the run stands
  private strains: Record<'pulverizer' | 'boiler' | 'turbine', Strain>
  private ratios: Record<'stockpile' | 'silo' | 'tank' | 'battery', number>
  private demanded: Record<'stockpile' | 'silo' | 'tank' | 'battery', number>
  private running: Record<MachineId, number>

  constructor(seed: number) {
    this.seed = seed
    this.stockpile = new Storage(STORAGE.stockpile.capacity, STORAGE.stockpile.flow)
    this.silo = new Storage(STORAGE.silo.capacity, STORAGE.silo.flow)
    this.tank = new Storage(
      STORAGE.tank.capacity, STORAGE.tank.flow,
      STORAGE.tank.capacity * TANK_STARTING_FILL)
    this.battery = new Storage(STORAGE.battery.capacity, STORAGE.battery.flow, STARTING_CHARGE)
    this.pulverizer = new Pulverizer()
    this.boiler = new Boiler()
    this.turbine = new Turbine()
    this.market = new CoalMarket()
    this.ledger = new EnergyLedger(STARTING_CHARGE)
    this.elapsed = 0
    this.runOutcome = 'idle'
    this.strains = {
      pulverizer: CLEAR,
      boiler: CLEAR,
      turbine: CLEAR,
    }
    this.ratios = {
      stockpile: 1,
      silo: 1,
      tank: 1,
      battery: 1,
    }
    // Nothing has been asked of any store yet, which is the one reading that is not 1:
    // a store nothing is drawing on is not near its cap
    this.demanded = {
      stockpile: 0,
      silo: 0,
      tank: 0,
      battery: 0,
    }
    // Nothing has run yet, and a card that has not started is not working
    this.running = {
      pulverizer: 0,
      boiler: 0,
      turbine: 0,
    }
  }

  /**
   * The fraction of its requested rate each machine ran at last step. Zero is a machine
   * that produced nothing — tripped, starved, or unpowered — which is what a card's
   * drawing reports before any question of wear arises.
   */
  get runRatios(): Readonly<Record<MachineId, number>> {
    return this.running
  }

  /**
   * The share of its requested throughput each store's Flow carried last step. Below 1
   * the store is holding a machine back, which is what the alerts panel names in words
   * so a single gauge does not have to carry both sources of strain.
   */
  get flowRatios(): Readonly<Record<'stockpile' | 'silo' | 'tank' | 'battery', number>> {
    return this.ratios
  }

  /**
   * The throughput each store was asked to move last step, in its own unit per second —
   * the figure flowRatios is the share of. It is the only thing a store's Flow can be
   * read against: nothing bounds the Flow itself, since every upgrade multiplies it again.
   */
  get flowDemands(): Readonly<Record<'stockpile' | 'silo' | 'tank' | 'battery', number>> {
    return this.demanded
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

  /** MWh the Pulverizer and Boiler draw over StartupSeconds. */
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

  /** Strain on the Pulverizer, from the Silo it is grinding into. */
  get pulverizerStrain(): Strain {
    return this.strains.pulverizer
  }

  /** Strain on the Boiler, from the Tank it is pushing into. */
  get boilerStrain(): Strain {
    return this.strains.boiler
  }

  /** Strain on the Turbine, from the Tank it is draining. */
  get turbineStrain(): Strain {
    return this.strains.turbine
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
    const powder = this.pulverizer.pulverizedOutput
    const fuelDraw = this.boiler.fuelConsumption
    const steam = this.boiler.steamOutput
    const steamDraw = this.turbine.steamConsumption
    const power = this.turbine.powerOutput
    const pulverizerPower = this.pulverizer.electricConsumption
    const boilerPower = this.boiler.electricConsumption

    // Electricity is shared in proportion to demand, so both consumers run at the same
    // ratio. A tripped machine requests nothing.
    const requestedEnergy = ((this.pulverizer.isTripped ? 0 : pulverizerPower)
      + (this.boiler.isTripped ? 0 : boilerPower)) * deltaSeconds / SECONDS_PER_HOUR
    const electricityRatio = requestedEnergy <= 0
      ? 1
      : Math.min(1, this.battery.contents / requestedEnergy)

    // Flow. A contended store divides one Flow between what enters and what leaves, so
    // both sides are scaled by the same share; the Stockpile and Battery cap one
    // direction only. All read start-of-step state, so the split does not depend on the
    // order the machines are evaluated in. What was asked of each store is kept rather
    // than discarded, so a card can draw how near its Flow is to being the thing holding
    // the chain back; both readings then come from the one set of figures.
    this.demanded = {
      stockpile: rawDraw,
      silo: powder + fuelDraw,
      tank: steam + steamDraw,
      battery: power,
    }

    const supplyFlow = this.stockpile.flowRatio(this.demanded.stockpile)
    const siloFlow = this.silo.flowRatio(this.demanded.silo)
    const tankFlow = this.tank.flowRatio(this.demanded.tank)
    const batteryFlow = this.battery.flowRatio(this.demanded.battery)

    this.ratios = {
      stockpile: supplyFlow,
      silo: siloFlow,
      tank: tankFlow,
      battery: batteryFlow,
    }

    const pulverizerRatio = this.pulverizer.isTripped
      ? 0
      : Math.min(electricityRatio, supplyFlow, siloFlow,
        this.inputRatio(rawDraw, this.stockpile, deltaSeconds))
    const boilerRatio = this.boiler.isTripped
      ? 0
      : Math.min(electricityRatio, siloFlow, tankFlow,
        this.inputRatio(fuelDraw, this.silo, deltaSeconds))
    const turbineRatio = this.turbine.isTripped
      ? 0
      : Math.min(tankFlow, batteryFlow, this.inputRatio(steamDraw, this.tank, deltaSeconds))

    // Strain is start-of-step state like every other input to a step, so it is read
    // before any storage moves. Each machine takes the worse of the store's fill and the
    // share of its request a flow cap took away.
    this.strains = {
      pulverizer: this.strainOf(this.backlogPressure(this.silo), Math.max(1 - supplyFlow, 1 - siloFlow)),
      boiler: this.strainOf(this.backlogPressure(this.tank), Math.max(1 - siloFlow, 1 - tankFlow)),
      turbine: this.strainOf(this.starvePressure(this.tank), Math.max(1 - tankFlow, 1 - batteryFlow)),
    }

    // Storage writes. Each store takes what it has room for before it is drawn down, so
    // the room is the room there was at the start of the step.
    const generationPower = power * turbineRatio
    const consumptionPower = pulverizerPower * pulverizerRatio + boilerPower * boilerRatio
    const generated = (generationPower * deltaSeconds) / SECONDS_PER_HOUR
    const used = (consumptionPower * deltaSeconds) / SECONDS_PER_HOUR
    const discarded = this.battery.add(generated)

    this.battery.remove(used)
    this.silo.add(powder * pulverizerRatio * deltaSeconds)
    this.silo.remove(fuelDraw * boilerRatio * deltaSeconds)
    this.tank.add(steam * boilerRatio * deltaSeconds)
    this.tank.remove(steamDraw * turbineRatio * deltaSeconds)
    this.stockpile.remove(rawDraw * pulverizerRatio * deltaSeconds)
    this.ledger.recordEnergy(generated - discarded, discarded, used)
    this.ledger.recordFlow(generationPower, consumptionPower, deltaSeconds)

    this.running = {
      pulverizer: pulverizerRatio,
      boiler: boilerRatio,
      turbine: turbineRatio,
    }

    // Wear, and then the repairs it causes
    this.pulverizer.advanceWear(this.strains.pulverizer.value, pulverizerRatio, deltaSeconds)
    this.boiler.advanceWear(this.strains.boiler.value, boilerRatio, deltaSeconds)
    this.turbine.advanceWear(this.strains.turbine.value, turbineRatio, deltaSeconds)

    this.elapsed += deltaSeconds
    this.ledger.recordContents(this.battery.contents)
    this.updateOutcome()
  }

  /**
   * Buys raw coal, reduced to what the Stockpile has room for and what the player can
   * afford — specs.md §Stockpile. The coal lands at once: the Stockpile's Flow governs
   * how fast it can leave again, not how fast it arrives.
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
   * The worse of a machine's two pressures, and which one it was.
   * @param fill - Pressure from the store's fill, 0 to 1
   * @param unmet - Share of its request a store's Flow took away, 0 to 1
   * @returns The strain that raises this machine's stress
   */
  private strainOf(fill: number, unmet: number): Strain {
    const flow = Math.max(0, Math.min(1, unmet))
    const pressure = Math.max(fill, flow)

    if (pressure <= 0) {
      return CLEAR
    }

    return {
      value: STRAIN_GAIN * pressure,
      source: flow > fill ? 'flow' : 'fill',
    }
  }

  /**
   * Pressure on a machine pushing into a store that is backing up.
   * @param store - The store below the machine
   * @returns Pressure, 0 to 1
   */
  private backlogPressure(store: Storage): number {
    const backlog = (store.fill - BACKLOG_THRESHOLD) / (1 - BACKLOG_THRESHOLD)
    return Math.max(0, Math.min(1, backlog))
  }

  /**
   * Pressure on a machine drawing from a store that is running dry.
   * @param store - The store above the machine
   * @returns Pressure, 0 to 1
   */
  private starvePressure(store: Storage): number {
    const starve = (STARVE_THRESHOLD - store.fill) / STARVE_THRESHOLD
    return Math.max(0, Math.min(1, starve))
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
   * @param track - The upgrade track to look up
   * @returns The track that prices it
   */
  private trackFor(track: UpgradeTrackId): UpgradeTrack {
    switch (track) {
      case 'pulverizer_capacity':
        return this.pulverizer.capacityUpgrade
      case 'pulverizer_efficiency':
        return this.pulverizer.efficiencyUpgrade
      case 'pulverizer_tolerance':
        return this.pulverizer.toleranceUpgrade
      case 'boiler_capacity':
        return this.boiler.capacityUpgrade
      case 'boiler_efficiency':
        return this.boiler.efficiencyUpgrade
      case 'boiler_tolerance':
        return this.boiler.toleranceUpgrade
      case 'turbine_capacity':
        return this.turbine.capacityUpgrade
      case 'turbine_efficiency':
        return this.turbine.efficiencyUpgrade
      case 'turbine_tolerance':
        return this.turbine.toleranceUpgrade
      case 'stockpile_capacity':
        return this.stockpile.capacityUpgrade
      case 'stockpile_flow':
        return this.stockpile.flowUpgrade
      case 'silo_capacity':
        return this.silo.capacityUpgrade
      case 'silo_flow':
        return this.silo.flowUpgrade
      case 'tank_capacity':
        return this.tank.capacityUpgrade
      case 'tank_flow':
        return this.tank.flowUpgrade
      case 'battery_capacity':
        return this.battery.capacityUpgrade
      case 'battery_flow':
        return this.battery.flowUpgrade
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
      case 'pulverizer_tolerance':
        this.pulverizer.upgradeTolerance()
        break
      case 'boiler_capacity':
        this.boiler.upgradeCapacity()
        break
      case 'boiler_efficiency':
        this.boiler.upgradeEfficiency()
        break
      case 'boiler_tolerance':
        this.boiler.upgradeTolerance()
        break
      case 'turbine_capacity':
        this.turbine.upgradeCapacity()
        break
      case 'turbine_efficiency':
        this.turbine.upgradeEfficiency()
        break
      case 'turbine_tolerance':
        this.turbine.upgradeTolerance()
        break
      case 'stockpile_capacity':
        this.stockpile.upgradeCapacity()
        break
      case 'stockpile_flow':
        this.stockpile.upgradeFlow()
        break
      case 'silo_capacity':
        this.silo.upgradeCapacity()
        break
      case 'silo_flow':
        this.silo.upgradeFlow()
        break
      case 'tank_capacity':
        this.tank.upgradeCapacity()
        break
      case 'tank_flow':
        this.tank.upgradeFlow()
        break
      case 'battery_capacity':
        this.battery.upgradeCapacity()
        break
      case 'battery_flow':
        this.battery.upgradeFlow()
        break
    }
  }
}
