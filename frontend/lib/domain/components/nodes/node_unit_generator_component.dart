import 'dart:async';
import 'package:overpowered/domain/components/nodes/node_capturable_component.dart';
import 'package:overpowered/domain/components/nodes/node_icon_component.dart';

class NodeUnitGeneratorComponent extends NodeCapturableComponent {
  NodeUnitGeneratorComponent({
    required super.node,
    required super.position,
    required super.size,
  });

  @override
  FutureOr onLoad() {
    add(NodeIconComponent(
      icon: '🚀',
      parent: this,
    ));

    return super.onLoad();
  }
}
