import 'dart:async';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/extensions.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/state/game/tile.dart';
import 'package:overpowered/domain/types/priority.dart';
import 'package:overpowered/domain/types/tile_type.dart';

class TileComponent extends PositionComponent with HoverCallbacks, HasGameRef {
  final Tile tile;
  final Paint backgroundPaint = Paint();
  final Paint hoverPaint = Paint();

  TileComponent(this.tile)
      : super(
          position: Vector2(
            (tile.position.x * Constants.TILE_SIZE) + (Constants.TILE_SIZE / 2),
            (tile.position.y * Constants.TILE_SIZE) + (Constants.TILE_SIZE / 2),
          ),
          size: Vector2(
            Constants.TILE_SIZE,
            Constants.TILE_SIZE,
          ),
          anchor: Anchor.center,
          priority: Priority.tile.value,
        );

  @override
  FutureOr onLoad() {
    backgroundPaint.color = tile.tileType.color;
    hoverPaint.color = const Color(0x22ffffff);

    return super.onLoad();
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    if (tile.tileType != TileType.empty) {
      canvas.drawRect(
        Rect.fromLTWH(0, 0, width, height),
        backgroundPaint,
      );
    }

    if (isHovered) {
      canvas.drawRect(
        size.toRect(),
        hoverPaint,
      );
    }
  }
}
