import 'package:dafluta/dafluta.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/terrain.dart';

class MatchState extends BaseState {
  late GameComponent gameComponent;
  late GameEngine engine;
  late final TopbarState topbarState;

  MatchState() {
    topbarState = TopbarState(this);
    restart();
  }

  void restart() {
    gameComponent = GameComponent(this);
    engine = GameEngine(
      gameComponent: gameComponent,
      terrain: Terrain.create(),
      onUpdate: _onUpdate,
      totalTime: Constants.TOTAL_TIME,
    );
  }

  void _onUpdate() {
    topbarState.notify();
  }
}

class TopbarState extends BaseState {
  final MatchState matchState;

  TopbarState(this.matchState);

  GameEngine get engine => matchState.engine;
}
