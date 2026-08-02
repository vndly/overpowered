# Overpowered

A real-time grid-based strategy game where you must generate enough energy before time runs out without pushing your power grid into overload.

# Characteristics

- Rectangular grid based (e.g. 10x10)
- The grid has different type of cells
  - Empty (only relays and accumulators can be built on them)
  - Resource (only generators can be built on them. they can never be depleted)
  - Obstacle (e.g. a rock/wall/water/etc) (nothing can be built on them)
- The goal is to generate certain amount of energy in certain amount of time
- To generate energy, the player must build generators
- Each type of generator can be placed only on top of its corresponding resource (e.g. coal based generator only on a coal cell)
- Buying and improving generators cost energy
- Energy is the main and only currency of the game (e.g. 100⚡)
- Generators can be sold at a lower cost
- The player needs to balance the energy generated with the energy spent to reach the goal on time

# Generators

## Properties

- Type (see #types-of-generators)
- Cost
  - How much energy it takes to build it (e.g. 50⚡)
- Level
  - From 1 (when it's built)
  - Each increase costs energy (exponential growth)
- Max temperature
  - The maximum temperature the generator can withstand before it melts down (e.g. 100°C)
- Current temperature
  - From 0°C (coolest) to "max temperature" (hottest)
- Output
  - The amount of energy produced per second (e.g. 100⚡/m)
  - It increases with each level upgrade (e.g. 100 → 140 ⚡/m)
- Heat generation
  - How much heat the generator produces (e.g. 5°C/m)
  - It increases with each level upgrade (e.g. 6°C/m → 9°C/m)

## Types of generators

| Generator     | Output | Max Temp | Heat   | Cost   | Notes                                                    |
| ------------- | ------ | -------- | ------ | ------ | -------------------------------------------------------- |
| Solar         | Low    | Low      | Low    | Low    | Output varies over time                                  |
| Wind          | Low    | Medium   | Low    | Medium | Nearby obstacles reduce its output                       |
| Biomass       | Low    | Medium   | Medium | Low    |                                                          |
| Coal          | Medium | High     | High   | Medium | Heats up quickly                                         |
| Geothermal    | Medium | High     | Medium | High   | Produces more output when adjacent cells are empty       |
| Gas           | Medium | Medium   | Medium | Medium | Can rapidly adjust its output                            |
| Oil           | High   | High     | High   | Medium | Venting costs are more expensive                         |
| Hydroelectric | High   | High     | Low    | High   | Output increases with the number of adjacent water tiles |
| Nuclear       | High   | Low      | High   | High   | Has a narrow safety margin                               |
| Fusion        | XHigh  | High     | High   | XHigh  | Startup and shutdown cycles take a long time             |

low cost / low output / low heat = solar/geothermal
low cost / low output / high heat = biomass
low cost / high output / low heat = wind/gas
low cost / high output / high heat = oil
high cost / low output / low heat = hydroelectric
high cost / low output / high heat = coal
high cost / high output / low heat = nuclear
high cost / high output / high heat = fusion

| Combination                         | Generator             |
| ----------------------------------- | --------------------- |
| Low cost / Low output / Low heat    | Solar                 |
| Low cost / Low output / High heat   | Biomass               |
| Low cost / High output / Low heat   | Wind                  |
| Low cost / High output / High heat  | Gas                   |
| High cost / Low output / Low heat   | Geothermal            |
| High cost / Low output / High heat  | Oil                   |
| High cost / High output / Low heat  | Hydroelectric         |
| High cost / High output / High heat | Coal, Nuclear, Fusion |


| Generator     | Output | Max Temp | Heat | Cost | Output + Max Temp − Heat − Cost |
| ------------- | -----: | -------: | ---: | ---: | ------------------------------: |
| Solar         |      1 |        1 |    1 |    1 |                               0 |
| Biomass       |      1 |        2 |    2 |    1 |                               0 |
| Wind          |      1 |        2 |    1 |    2 |                               0 |

| Coal          |      2 |        3 |    3 |    2 |                               0 |
| Geothermal    |      2 |        3 |    2 |    3 |                               0 |
| Gas           |      2 |        2 |    2 |    2 |                               0 |

| Oil           |      3 |        3 |    3 |    3 |                               0 |
| Hydroelectric |      3 |        3 |    2 |    3 |                               0 |

| Nuclear       |      4 |        1 |    1 |    4 |                               0 |
| Fusion        |      5 |        4 |    4 |    5 |                               0 |


| Generator     | Cost   | Output | Heat   |
| ------------- | ------ | ------ | ------ |
| *Solar         | Low    | Low    | Low    |
| *Wind          | Medium | Medium | Low    |
| *Biomass       | Medium | Medium | High   |

| *Gas           | Low    | High   | High   |
| *Oil           | Medium | Medium | High   |
| *Geothermal    | High   | Medium | Medium |

| Coal          | High   | High   | High   |
| Hydroelectric | High   | High   | Low    |
| Nuclear       | High   | High   | High   |

| Fusion        | High   | High   | High   |



| Generator     | Output | Max Temp | Heat | Cost | Output + Max Temp − Heat − Cost |
| ------------- | -----: | -------: | ---: | ---: | ------------------------------: |
| Solar         |      1 |        1 |    1 |    1 |                               0 | normal cost / normal stable
| Wind          |      1 |        2 |    1 |    2 |                               0 | high cost / high stable
| Biomass       |      2 |        1 |    2 |    1 |                               0 | low cost / low stable

| Gas           |      2 |        2 |    2 |    2 |                               0 | normal cost / normal stable
| Geothermal    |      2 |        3 |    2 |    3 |                               0 | high cost / high stable
| Coal          |      3 |        2 |    3 |    2 |                               0 | low cost / low stable

| Coal          |      3 |        3 |    3 |    3 |                               0 | normal cost / stable
| Hydroelectric |      3 |        4 |    3 |    4 |                               0 | high cost / stable
| Nuclear       |      4 |        1 |    1 |    4 |                               0 | low cost / unstable

| Coal          |      3 |        3 |    3 |    3 |                               0 |
| Hydroelectric |      3 |        3 |    2 |    3 |                               0 |
| Nuclear       |      4 |        1 |    1 |    4 |                               0 |

| Fusion        |      5 |        4 |    4 |    5 |                               0 |


## Actions

- Build generators
- Upgrade level
- Shut down (takes time)
- Turn on (takes time)
- Throttle
- Vent

# Mechanics

## Heat

- heat spreads to adjacent generators
- if a generator overheats, it explodes, damaging nearby structures
- obstacles can be taken down (it costs money) to make room for structures

## Cooling

- place a cooling structure close to the generator

### Shut down

- Pros
  - Heat drops quickly
- Cons
  - Produces no energy while offline
  - It takes time to turn off and turn on again

### Throttle

- Pros
  - Slows or reverses heat buildup
- Cons
  - Produces less energy while throttled

### Venting

- Pros
  - Instantly removes heat
- Cons
  - It costs energy proportionally to the level of the generator (e.g. 10% of the energy output)
  - Becomes more expensive with repeated use

---

Match flow - players start with some small amount of energy to start building - player can decide where to install the accumulator - show energy pace required to achieve the goal according to the remaining time (so the player knows if they are falling behind or not)

---

- connections:
  - generators connect automatically to the accumulator if in reach (i.e. no obstacle in between)
  - generators connect automatically to the relays in reach (showing a cable)
  - they only connect to the one that offers the shortest path
  - the user only places generators and relays. Never cables
  - cables have a maximum distance, the player needs to add more relays to connect long distances

- a generator needs to be connected to the accumulator in order to its energy to count to the goal
- energy distribution: the more jumps the energy has to make (i.e. the more connectors it passes through) the less energy reaches the accumulator
- obstacles block cables
- if a generator is not connected to the accumulator, it cannot dissipate the energy it produces so it overheats faster

- other structures:
  - cooling structures: reduce the heat in a radius. the consume energy constantly. can be upgraded (in each attribute: range, effectiveness, etc)
  - maintenance hub: slows degradation nearby. the consume energy constantly. can be upgraded
  - connectors/relay: connect cables and generators (nodes). they can be overloaded. they need to be upgraded to support more energy going through
  - accumulator: collects the energy generated (they cost a lot of money so users don't abuse)

---

- questions
  - make patches appear and disappear randomly?
  - are there similar games?
  - square or hexagonal grid?
  - can cables or relays be upgraded in order to extend the leght of possible connections?
  - can relays overheat or get damaged?
  - add energy transmition loss or only count jumps? if energy lost by distance, adding more relays fixes the problem
  - add max temperature limit increase for generators? (e.g. a generator can be upgraded to withstand more heat)

- future
  - add overclocing to generators (e.g. a generator can be upgraded to produce more energy but it will overheat faster)
  - add generator degradation/wear

---

- i want the player to feel tension. it's not a chill slow pace game. i want the user to have to worry about generators overheating while thinking strategically about where to place the next generator
- core emotional arc: control → growth → pressure → overload → desperate stabilization
- Generator controls solve immediate problems; cooling buildings solve spatial, long-term problems.
- central conflict: energy production versus system stability.
- Generators create the strategy. Heat creates the urgency. Cooling units and relays make the grid matter
