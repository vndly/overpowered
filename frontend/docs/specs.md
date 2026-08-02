# Overpowered

A real-time grid-based strategy game where you must generate enough energy before time runs out without pushing your power grid into overload.

# Characteristics

- Rectangular grid based (e.g. 10x10)
- The grid has different type of cells
  - Empty (only relays and accumulators can be built on them)
  - Resource (only generators can be build on them)
  - Obstacle (e.g. a rock/wall/water/etc) (nothing can be build on them)
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
  - The maxium temperature the generator can withstand before it metlsdown (e.g. 100°C)
- Current temperature
  - From 0°C (coolest) to "max temperature" (hottest)
- Output
  - The amount of energy produced per second (e.g. 100⚡/m)
  - It increases with each level upgrade (e.g. 100 → 140 ⚡/m)
- Heat generation
  - How much heat the generator produces (e.g. 5°C/m)
  - It increases with each level upgrade (e.g. 6°C/m → 9°C/m)

## Types of generators

- mix all these variables
  - output: low, high
  - heat: low, high
  - cost: low, high
  - max temperature: low, high

| Generator     | Output | Heat | Cost | Max Temperature | Notes                                                 |
| ------------- | ------ | ---- | ---- | --------------- | ----------------------------------------------------- |
| Solar         | Low    | Low  | Low  | Low             | Output varies over time                               |
| Wind          | Low    | Low  | Low  | Low             | Blocked by nearby obstacles                           |
| Coal          | High   | High | Low  | High            |                                                       |
| Gas           | High   | Low  | High | Low             |                                                       |
| Oil           | High   | High | High | High            |                                                       |
| Geothermal    | High   | High | High | High            | If adjacent cells are empty, it produdces more output |
| Hydroelectric | High   | Low  | High | High            |                                                       |
| Nuclear       | High   | High | High | Low             |                                                       |
| Fusion        | High   | High | High | High            | Turn off and on cycles are very long                  |

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
