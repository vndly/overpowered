import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/terrain.dart';

class GameEngine {
  final GameComponent gameComponent;
  final Terrain terrain;

  GameEngine({
    required this.gameComponent,
    required this.terrain,
  }) {
    GameEngineRef.instance = this;
  }

  void update(double dt) {
    terrain.update(dt);
  }
}

mixin GameEngineRef {
  static late GameEngine instance;

  GameEngine get engine => instance;
}
