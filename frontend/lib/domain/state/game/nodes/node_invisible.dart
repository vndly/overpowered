import 'package:overpowered/domain/components/nodes/node_component.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';

class NodeInvisible extends Node {
  NodeInvisible({
    required super.id,
    required super.lane,
    required super.position,
    required super.maxNodeSize,
  }) : super(captureRate: 0);

  @override
  NodeComponent get component => NodeComponent(
        node: this,
        position: position,
        size: size,
      );
}
