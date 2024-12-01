import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/nodes/node_component.dart';
import 'package:overpowered/domain/components/nodes/node_credit_generator_component.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';

class NodeCreditGenerator extends Node {
  NodeCreditGenerator({
    required super.id,
    required super.lane,
    required super.position,
    required super.maxNodeSize,
  }) : super(captureRate: Constants.NODE_CREDIT_GENERATOR_CAPTURE_RATE);

  @override
  NodeComponent get component => NodeCreditGeneratorComponent(
        node: this,
        position: position,
        size: size,
      );

  @override
  void onOwnerAssigned(Player owner) {
    engine.onNodeCreditsGeneratorCaptured(
      node: this,
      owner: owner,
    );
  }

  @override
  void onOwnerUnassigned(Player owner) {
    engine.onNodeCreditsGeneratorLost(
      node: this,
      owner: owner,
    );
  }
}
