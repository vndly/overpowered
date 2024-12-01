import 'dart:async';
import 'package:flame/components.dart';
import 'package:flame/extensions.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/state/game/terrain.dart';
import 'package:overpowered/domain/types/priority.dart';

class TerrainComponent extends PositionComponent {
  final Terrain terrain;
  final Paint backgroundPaint = Paint();
  final Paint borderPaint = Paint();

  TerrainComponent(this.terrain)
      : super(
          position: Vector2(0, 0),
          size: Vector2(
            Constants.TILE_SIZE * terrain.size.x,
            Constants.TILE_SIZE * terrain.size.y,
          ),
          anchor: Anchor.center,
          priority: Priority.battlefield.value,
        );

  @override
  FutureOr onLoad() {
    backgroundPaint.color = const Color(0xff923B01);
    borderPaint.color = const Color(0x33ffffff);

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

    for (int x = 0; x <= terrain.size.x; x++) {
      canvas.drawLine(
        Offset(x * Constants.TILE_SIZE, 0),
        Offset(x * Constants.TILE_SIZE, size.y),
        borderPaint,
      );
    }

    for (int y = 0; y <= terrain.size.y; y++) {
      canvas.drawLine(
        Offset(0, y * Constants.TILE_SIZE),
        Offset(size.x, y * Constants.TILE_SIZE),
        borderPaint,
      );
    }
  }
}
