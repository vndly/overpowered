import 'dart:async';
import 'package:flame/components.dart';
import 'package:flame/extensions.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/lane_component.dart';
import 'package:overpowered/domain/state/game/battlefield.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/types/priority.dart';
import 'package:overpowered/extensions/component_extension.dart';

class BattlefieldComponent extends PositionComponent with HasGameRef {
  final Battlefield battlefield;
  final Paint backgroundPaint = Paint();
  final Paint laneNormalPaint = Paint();
  final Paint laneNeonPaint = Paint();

  BattlefieldComponent(this.battlefield)
      : super(
          position: Vector2(0, 0),
          size: Vector2(
            Constants.UI_BATTLEFIELD_WIDTH,
            Constants.UI_BATTLEFIELD_HEIGHT,
          ),
          anchor: Anchor.topLeft,
          priority: Priority.battlefield.value,
        );

  @override
  FutureOr onLoad() {
    backgroundPaint.color = const Color(0xff222222);

    laneNormalPaint.strokeWidth = 1;
    laneNormalPaint.color = const Color(0x44ffffff);

    laneNeonPaint.strokeWidth = 4;
    laneNeonPaint.color = const Color(0x44ffffff);
    laneNeonPaint.maskFilter = MaskFilter.blur(
      BlurStyle.normal,
      laneNeonPaint.strokeWidth * Constants.NEON_EFFECT,
    );

    for (int i = 0; i < battlefield.lanes.length; i++) {
      final Lane lane = battlefield.lanes[i];

      gameRef.world.add(LaneComponent(
        lane: lane,
        player: engine.self,
        position: Vector2(i * battlefield.laneWidth, 0),
        size: Vector2(battlefield.laneWidth, battlefield.mapSize.y),
      ));

      for (final Node node in lane.nodes) {
        gameRef.world.add(node.component);
      }
    }

    return super.onLoad();
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawRect(
      Rect.fromLTWH(0, 0, width, height),
      backgroundPaint,
    );

    for (int i = 1; i < battlefield.lanes.length; i++) {
      canvas.drawLine(
        Offset(i * battlefield.laneWidth, 0),
        Offset(i * battlefield.laneWidth, height),
        laneNormalPaint,
      );

      canvas.drawLine(
        Offset(i * battlefield.laneWidth, 0),
        Offset(i * battlefield.laneWidth, height),
        laneNeonPaint,
      );
    }
  }
}
