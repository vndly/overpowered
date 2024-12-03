import 'package:dafluta/dafluta.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/inventory.dart';
import 'package:overpowered/domain/state/game/resources.dart';
import 'package:overpowered/domain/state/game/terrain.dart';
import 'package:overpowered/domain/types/resource_type.dart';

class MatchState extends BaseState {
  late GameComponent gameComponent;
  late GameEngine engine;
  late final TopbarState topbarState;
  late final BottombarState bottombarState;

  MatchState() {
    topbarState = TopbarState(this);
    bottombarState = BottombarState(this);
    restart();
  }

  void restart() {
    gameComponent = GameComponent(this);
    engine = GameEngine(
      gameComponent: gameComponent,
      terrain: Terrain.create(),
      inventory: Inventory(
        reources: [
          const Resources(
            amount: 3,
            resourceType: ResourceType.water,
          ),
          const Resources(
            amount: 5,
            resourceType: ResourceType.fuel,
          ),
          const Resources(
            amount: 7,
            resourceType: ResourceType.metal,
          ),
        ],
        limit: Constants.INVENTORY_LIMIT,
      ),
      onUpdate: _onUpdate,
      totalEnergy: Constants.TOTAL_ENERGY,
      totalTime: Constants.TOTAL_TIME,
    );
  }

  void _onUpdate() => Delayed.post(topbarState.notify);
}

class TopbarState extends BaseState {
  final MatchState matchState;

  TopbarState(this.matchState);

  GameEngine get engine => matchState.engine;
}

class BottombarState extends BaseState {
  final MatchState matchState;

  BottombarState(this.matchState);

  GameEngine get engine => matchState.engine;
}
