import 'package:dafluta/dafluta.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/terrain.dart';

class MatchState extends BaseState {
  late GameComponent gameComponent;
  late GameEngine engine;

  MatchState() {
    restart();
  }

  void restart() {
    gameComponent = GameComponent(this);
    engine = GameEngine(
      gameComponent: gameComponent,
      terrain: Terrain.create(),
    );
  }
}
