const HISTORY_SAMPLES = 60 // One minute of net flow, for the Net Flow Graph
const SAMPLE_INTERVAL_SECONDS = 1

/**
 * Running energy accounting for one run.
 * Every MWh the Turbine generates must end up banked, drawn by a machine, spent on coal,
 * or spent on an upgrade, so a run can be audited for conservation. The ledger also
 * carries the rolling series the Power Summary reads, so no component recomputes them.
 */
export class EnergyLedger {
  generated: number // MWh that reached the Battery
  discarded: number // MWh produced with the Battery already full
  machineUse: number // MWh drawn by the Pulverizer and Boiler
  coalCost: number // MWh spent on raw coal
  upgradeSpend: number // MWh spent on upgrades
  peakContents: number // Highest Battery Contents this run, the player's best result
  generationPower: number // Turbine output over the last step, MW
  consumptionPower: number // Pulverizer and Boiler draw over the last step, MW
  peakNetFlow: number // Highest net flow this run, MW
  private netFlowEnergy: number // Sum of NetFlow × dt, MW·s
  private netFlowSeconds: number // Run time that sum covers
  private readonly samples: number[] // One-second net flow samples, oldest first
  private secondsSinceSample: number

  constructor(startingCharge: number) {
    this.generated = 0
    this.discarded = 0
    this.machineUse = 0
    this.coalCost = 0
    this.upgradeSpend = 0
    this.peakContents = startingCharge
    this.generationPower = 0
    this.consumptionPower = 0
    this.peakNetFlow = 0
    this.netFlowEnergy = 0
    this.netFlowSeconds = 0
    this.samples = []
    this.secondsSinceSample = 0
  }

  /** Net flow over the last step, MW. */
  get netFlow(): number {
    return this.generationPower - this.consumptionPower
  }

  /** Mean net flow over the run so far, MW. */
  get averageNetFlow(): number {
    return this.netFlowSeconds <= 0 ? 0 : this.netFlowEnergy / this.netFlowSeconds
  }

  /** The last minute of one-second net flow samples, oldest first. */
  get netFlowHistory(): readonly number[] {
    return this.samples
  }

  /**
   * Records the energy a step moved.
   * @param stored - MWh that reached the Battery
   * @param discarded - MWh produced with the Battery already full
   * @param used - MWh the Pulverizer and Boiler drew
   */
  recordEnergy(stored: number, discarded: number, used: number): void {
    this.generated += stored
    this.discarded += discarded
    this.machineUse += used
  }

  /**
   * Records the rates a step ran at, after RunRatio.
   * @param generationPower - Turbine output, MW
   * @param consumptionPower - Pulverizer and Boiler draw, MW
   * @param deltaSeconds - Length of the step
   */
  recordFlow(generationPower: number, consumptionPower: number, deltaSeconds: number): void {
    const first = this.netFlowSeconds <= 0

    this.generationPower = generationPower
    this.consumptionPower = consumptionPower
    this.peakNetFlow = first ? this.netFlow : Math.max(this.peakNetFlow, this.netFlow)
    this.netFlowEnergy += this.netFlow * deltaSeconds
    this.netFlowSeconds += deltaSeconds
    this.sample(deltaSeconds)
  }

  /**
   * Tracks the highest Battery Contents the run has reached.
   * @param contents - Battery Contents at the end of a step
   */
  recordContents(contents: number): void {
    this.peakContents = Math.max(this.peakContents, contents)
  }

  /**
   * @param cost - MWh a coal purchase deducted from the Battery
   */
  recordCoalPurchase(cost: number): void {
    this.coalCost += cost
  }

  /**
   * @param cost - MWh an upgrade deducted from the Battery
   */
  recordUpgrade(cost: number): void {
    this.upgradeSpend += cost
  }

  /**
   * Records one net flow sample per second of run time, keeping the last minute.
   * @param deltaSeconds - Length of the step
   */
  private sample(deltaSeconds: number): void {
    this.secondsSinceSample += deltaSeconds

    if (this.secondsSinceSample < SAMPLE_INTERVAL_SECONDS) {
      return
    }

    this.secondsSinceSample -= SAMPLE_INTERVAL_SECONDS
    this.samples.push(this.netFlow)

    if (this.samples.length > HISTORY_SAMPLES) {
      this.samples.shift()
    }
  }
}
