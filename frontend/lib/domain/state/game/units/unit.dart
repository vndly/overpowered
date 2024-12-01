import 'dart:ui';
import 'package:flame/game.dart';
import 'package:overpowered/domain/components/unit_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';

class Unit with GameEngineRef {
  final Player owner;
  final Lane lane;
  final List<Node> nodes;
  late int nextNodeIndex;
  late int hp;
  late double speed;
  late Vector2 position;

  Unit({
    required this.hp,
    required this.speed,
    required this.owner,
    required this.lane,
    required this.nodes,
    required Vector2 startingPosition,
  }) {
    nextNodeIndex = 0;
    position = Vector2.copy(startingPosition);
  }

  Color get color => owner.color;

  Node get nextNode => nodes[nextNodeIndex];

  void update(double dt) {
    position.moveToTarget(nextNode.position, speed * dt);
    _checkNextNode();
  }

  void _checkNextNode() {
    if (_hasReached(nextNode) && (nextNodeIndex < (nodes.length - 1))) {
      nextNodeIndex++;
    }
  }

  bool _hasReached(Node node) => (position - node.position).length < 1;

  void reduceHealth(int value) {
    hp -= value;
  }

  void destroy() {
    lane.removeUnit(this);
  }

  UnitComponent component(double maxUnitSize) => UnitComponent(
        unit: this,
        size: Vector2(maxUnitSize, maxUnitSize),
      );
}
