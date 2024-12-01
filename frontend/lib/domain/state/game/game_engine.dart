import 'package:flame/components.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/components/unit_component.dart';
import 'package:overpowered/domain/state/game/base.dart';
import 'package:overpowered/domain/state/game/battlefield.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';
import 'package:overpowered/domain/state/game/units/unit.dart';

class GameEngine {
  final GameComponent gameComponent;
  final Player self;
  final Player enemy;
  final Battlefield battlefield;

  GameEngine({
    required this.gameComponent,
    required this.self,
    required this.enemy,
    required this.battlefield,
  }) {
    GameEngineRef.instance = this;
  }

  void update(double dt) {
    self.update(dt);
    enemy.update(dt);
    battlefield.update(dt);
  }

  void onSpawnUnit({
    required Lane lane,
    required Player player,
    required Node node,
    required int power,
  }) {
    final List<Node> nodes = lane.getNodes(
      forward: player.isSelf,
      from: node,
    );

    final double extraGap =
        -player.ownershipDirection * (battlefield.maxUnitSize / 2);
    final Vector2 startingPosition = Vector2.copy(nodes.first.position);
    startingPosition.add(Vector2(0, extraGap));

    final Unit unit = Unit(
      hp: power,
      speed: Constants.UNIT_SPEED,
      owner: player,
      lane: lane,
      nodes: nodes.sublist(1, nodes.length),
      startingPosition: startingPosition,
    );

    lane.addUnit(unit);
    onUnitCreated(unit);
  }

  void onUnitCreated(Unit unit) {
    final UnitComponent unitComponent = unit.component(battlefield.maxUnitSize);
    gameComponent.onUnitCreated(unitComponent);
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
