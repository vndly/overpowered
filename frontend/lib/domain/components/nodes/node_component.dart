import 'dart:ui';
import 'package:flame/components.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/types/priority.dart';

class NodeComponent extends PositionComponent {
  final Node node;
  Paint? hoverPaint;

  NodeComponent({
    required this.node,
    required super.position,
    required super.size,
  }) : super(
          anchor: Anchor.center,
          priority: Priority.node.value,
        );

  Node? checkHover(Vector2 point) {
    if (node.isOwned && containsPoint(point)) {
      hoverPaint = Paint();
      hoverPaint!.color = const Color(0x11ffffff);

      return node;
    } else {
      hoverPaint = null;

      return null;
    }
  }

  void cleanHover() {
    hoverPaint = null;
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    if (hoverPaint != null) {
      canvas.drawCircle(
        (size / 2).toOffset(),
        size.x / 2,
        hoverPaint!,
      );
    }
  }
}
