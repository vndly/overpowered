import 'dart:async';
import 'dart:ui';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/players/player.dart';
import 'package:overpowered/domain/types/priority.dart';

class LaneComponent extends PositionComponent {
  final Lane lane;
  final Player player;
  Paint? hoverPaint;

  LaneComponent({
    required this.lane,
    required this.player,
    required super.position,
    required super.size,
  }) : super(
          anchor: Anchor.topLeft,
          priority: Priority.lane.value,
        );

  @override
  FutureOr onLoad() {
    add(RectangleHitbox());

    return super.onLoad();
  }

  Lane? checkHover(Vector2 point) {
    if (containsPoint(point)) {
      hoverPaint = Paint();
      hoverPaint!.color = const Color(0x11ffffff);

      return lane;
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
      canvas.drawRect(
        size.toRect(),
        hoverPaint!,
      );
    }
  }
}
