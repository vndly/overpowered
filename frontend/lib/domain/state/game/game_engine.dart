import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/base.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';
import 'package:overpowered/domain/state/game/terrain.dart';
import 'package:overpowered/domain/state/game/units/unit.dart';

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

  void onSpawnUnit({
    required Lane lane,
    required Player player,
    required Node node,
    required int power,
  }) {
  }

  void onUnitCreated(Unit unit) {
  }

  void onUnitCollidedWithBase({
    required Unit unit,
    required Base base,
  }) {
    base.onHit(unit.hp);
    onDestroyUnit(unit);
  }

  void onUnitsCollided({
    required Unit unit1,
    required Unit unit2,
  }) {
    if (unit1.hp > unit2.hp) {
      unit1.reduceHealth(unit2.hp);
      onDestroyUnit(unit2);
    } else if (unit1.hp < unit2.hp) {
      unit2.reduceHealth(unit1.hp);
      onDestroyUnit(unit1);
    } else {
      onDestroyUnit(unit1);
      onDestroyUnit(unit2);
    }
  }

  void onDestroyUnit(Unit unit) {
    unit.destroy();
    gameComponent.onUnitDestroyed(unit);
  }

  void onNodeTouched({
    required Node node,
    required Unit unit,
  }) {
    node.onTouched(unit);
  }

  void onBaseDestroyed(Base base) =>
      gameComponent.onMatchFinished(base.owner.isEnemy);

  void onNodeVictoryCaptured(Node node) =>
      gameComponent.onMatchFinished(node.owner!.isSelf);

  void onNodeCreditsGeneratorCaptured({
    required Node node,
    required Player owner,
  }) {
    const double extra = Constants.CREDITS_EXTRA_RATE;
    owner.addCreditsExtraRate(extra);
  }

  void onNodeCreditsGeneratorLost({
    required Node node,
    required Player owner,
  }) {
    const double extra = Constants.CREDITS_EXTRA_RATE;
    owner.removeCreditsExtraRate(extra);
  }

  void onAddCredits({
    required Player player,
    required double credits,
  }) {
    player.addCredits(credits);
  }
}

mixin GameEngineRef {
  static late GameEngine instance;

  GameEngine get engine => instance;
}
