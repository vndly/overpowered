import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/nodes/node_component.dart';
import 'package:overpowered/domain/components/nodes/node_victory_component.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';

class NodeVictory extends Node {
  NodeVictory({
    required super.id,
    required super.lane,
    required super.position,
    required super.maxNodeSize,
  }) : super(captureRate: Constants.NODE_VICTORY_CAPTURE_RATE);

  @override
  NodeComponent get component => NodeVictoryComponent(
        node: this,
        position: position,
        size: size,
      );

  @override
  void onOwnerAssigned(Player owner) => engine.onNodeVictoryCaptured(this);
}
