import 'dart:async';
import 'package:flame/components.dart';
import 'package:flame/extensions.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/state/game/terrain.dart';
import 'package:overpowered/domain/types/priority.dart';

class TerrainComponent extends PositionComponent with HasGameRef {
  final Terrain terrain;
  final Paint backgroundPaint = Paint();

  TerrainComponent(this.terrain)
      : super(
          position: Vector2(0, 0),
          size: Vector2(
            Constants.UI_TERRAIN_WIDTH,
            Constants.UI_TERRAIN_HEIGHT,
          ),
          anchor: Anchor.center,
          priority: Priority.battlefield.value,
        );

  @override
  FutureOr onLoad() {
    backgroundPaint.color = const Color.fromARGB(255, 146, 59, 1);

    /*for (int i = 0; i < terrain.lanes.length; i++) {
      final Lane lane = terrain.lanes[i];

      for (final Node node in lane.nodes) {
        gameRef.world.add(node.component);
      }
    }*/

    return super.onLoad();
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawRect(
      Rect.fromLTWH(0, 0, width, height),
      backgroundPaint,
    );
  }
}
