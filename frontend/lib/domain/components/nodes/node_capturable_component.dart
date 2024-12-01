import 'dart:async';
import 'dart:math';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/nodes/node_component.dart';
import 'package:overpowered/domain/components/unit_component.dart';
import 'package:overpowered/extensions/component_extension.dart';
import 'package:overpowered/utils/palette.dart';

class NodeCapturableComponent extends NodeComponent with CollisionCallbacks {
  final Paint backgroundPaint = Paint();
  final Paint ownershipNormalPaint = Paint();
  final Paint ownershipNeonPaint = Paint();
  final Paint borderNormalPaint = Paint();
  final Paint borderNeonPaint = Paint();

  NodeCapturableComponent({
    required super.node,
    required super.position,
    required super.size,
  }) {
    ownershipNormalPaint.style = PaintingStyle.stroke;
    ownershipNormalPaint.strokeWidth = 10;

    ownershipNeonPaint.style = PaintingStyle.stroke;
    ownershipNeonPaint.strokeWidth = 10;
    ownershipNeonPaint.maskFilter = MaskFilter.blur(
      BlurStyle.normal,
      ownershipNeonPaint.strokeWidth * Constants.NEON_EFFECT,
    );

    borderNormalPaint.style = PaintingStyle.stroke;
    borderNormalPaint.strokeWidth = 5;

    borderNeonPaint.style = PaintingStyle.stroke;
    borderNeonPaint.strokeWidth = 5;
    borderNeonPaint.maskFilter = MaskFilter.blur(
      BlurStyle.normal,
      borderNeonPaint.strokeWidth * Constants.NEON_EFFECT,
    );
  }

  @override
  FutureOr onLoad() {
    add(CircleHitbox());

    return super.onLoad();
  }

  @override
  void onCollisionStart(
    Set<Vector2> intersectionPoints,
    PositionComponent other,
  ) {
    if (other is UnitComponent) {
      engine.onNodeTouched(
        node: node,
        unit: other.unit,
      );
    }

    super.onCollisionStart(intersectionPoints, other);
  }

  @override
  void update(double dt) {
    super.update(dt);

    if (node.hasOwner) {
      backgroundPaint.color = node.owner!.color.withAlpha(100);
      borderNormalPaint.color = node.owner!.color;
      borderNeonPaint.color = node.owner!.color;
    } else {
      backgroundPaint.color = Palette.transparent;
      borderNormalPaint.color = Palette.NODE_NEUTRAL_BORDER;
      borderNeonPaint.color = Palette.NODE_NEUTRAL_BORDER;
    }
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawCircle(
      Offset(size.x / 2, size.y / 2),
      size.x / 2,
      backgroundPaint,
    );

    canvas.drawCircle(
      Offset(size.x / 2, size.y / 2),
      size.x / 2,
      borderNormalPaint,
    );

    canvas.drawCircle(
      Offset(size.x / 2, size.y / 2),
      size.x / 2,
      borderNeonPaint,
    );

    if (node.hasTouched) {
      ownershipNormalPaint.color = node.color;
      ownershipNeonPaint.color = node.color;

      canvas.drawArc(
        Rect.fromLTWH(0, 0, size.x, size.y),
        -pi / 2,
        2 * pi * node.ownershipValue,
        false,
        ownershipNormalPaint,
      );

      canvas.drawArc(
        Rect.fromLTWH(0, 0, size.x, size.y),
        -pi / 2,
        2 * pi * node.ownershipValue,
        false,
        ownershipNeonPaint,
      );
    }
  }
}
