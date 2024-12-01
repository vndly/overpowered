import 'dart:async';
import 'dart:ui';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/extensions.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';
import 'package:overpowered/domain/types/priority.dart';
import 'package:overpowered/extensions/canvas_extension.dart';
import 'package:overpowered/extensions/component_extension.dart';
import 'package:overpowered/utils/palette.dart';

class ControlsComponent extends PositionComponent {
  final Player player;
  final Paint backgroundPaint = Paint();

  ControlsComponent({
    required this.player,
    required super.position,
    required super.size,
  }) : super(
          anchor: Anchor.topLeft,
          priority: Priority.controls.value,
        );

  @override
  FutureOr onLoad() {
    backgroundPaint.style = PaintingStyle.fill;
    backgroundPaint.color = Palette.CONTROLS_BACKGROUND;

    final double cardWidth = (size.x / 7) * 0.8;
    final double cardHeight = size.y * 0.8;

    final double horizontalGapSize = (size.x - (cardWidth * 7)) / 8;
    final double verticalGapSize = (size.y - cardHeight) / 2;

    add(CreditCounterComponent(
      player: player,
      position: Vector2(
        horizontalGapSize,
        verticalGapSize,
      ),
      size: Vector2(cardWidth, cardHeight),
    ));

    for (int i = 0; i < 6; i++) {
      final Vector2 position = Vector2(
        ((i + 1.5) * cardWidth) + ((i + 2) * horizontalGapSize),
        verticalGapSize + (cardHeight / 2),
      );

      add(UnitSelectorComponent(
        player: player,
        value: i + 1,
        position: position,
        size: Vector2(cardWidth, cardHeight),
      ));
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
  }
}

class CreditCounterComponent extends PositionComponent {
  final Player player;
  final Paint backgroundPaint = Paint();

  CreditCounterComponent({
    required this.player,
    required super.position,
    required super.size,
  }) : super(
          anchor: Anchor.topLeft,
          priority: Priority.controls.value,
        );

  @override
  FutureOr onLoad() {
    backgroundPaint.style = PaintingStyle.fill;
    backgroundPaint.color = Palette.CONTROLS_CREDIT_BACKGROUND;

    return super.onLoad();
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawCircle(
      (size / 2).toOffset(),
      size.x / 2,
      backgroundPaint,
    );

    canvas.drawText(
      text: player.credits.floor().toString(),
      position: size / 2,
      size: size.x / 2,
      color: Palette.CONTROLS_CREDIT_FOREGROUND,
    );
  }
}

class UnitSelectorComponent extends PositionComponent
    with DragCallbacks, HasGameRef<GameComponent> {
  final Player player;
  final int value;
  final Paint backgroundPaint = Paint();
  final Paint foregroundPaint = Paint();
  final Paint borderPaint = Paint();
  Vector2 initialPosition = Vector2(0, 0);

  UnitSelectorComponent({
    required this.player,
    required this.value,
    required super.position,
    required super.size,
  }) : super(
          anchor: Anchor.center,
          priority: Priority.controls.value,
        );

  @override
  FutureOr onLoad() {
    add(RectangleHitbox());

    backgroundPaint.style = PaintingStyle.fill;
    backgroundPaint.color = Palette.CONTROLS_CARD_BACKGROUND;

    foregroundPaint.style = PaintingStyle.fill;
    foregroundPaint.color = Palette.CONTROLS_CARD_FOREGROUND;

    borderPaint.style = PaintingStyle.stroke;
    borderPaint.strokeWidth = 5;

    return super.onLoad();
  }

  @override
  void onDragStart(DragStartEvent event) {
    super.onDragStart(event);
    initialPosition.setFrom(position);
  }

  @override
  void onDragUpdate(DragUpdateEvent event) {
    position += event.localDelta;

    final Node? nodeHovered = gameRef.checkNodeHover(absolutePosition);

    if (nodeHovered == null) {
      gameRef.checkLaneHover(absolutePosition);
    } else {
      gameRef.cleanLaneHover();
    }
  }

  @override
  void onDragEnd(DragEndEvent event) {
    super.onDragEnd(event);

    final Lane? lane = gameRef.checkLaneHover(absolutePosition);
    final Node? node = gameRef.checkNodeHover(absolutePosition);

    gameRef.cleanLaneHover();
    gameRef.cleanNodeHover();

    position.setFrom(initialPosition);

    if ((player.credits >= value) && (lane != null)) {
      _spawnUnitOfPlayer(
        lane: lane,
        node: node,
        player: player,
        power: value,
      );
    }
  }

  void _spawnUnitOfPlayer({
    required Lane lane,
    required Node? node,
    required Player player,
    required int power,
  }) {
    engine.onSpawnUnit(
      lane: lane,
      player: player,
      node: node ?? lane.nodes.first,
      power: power,
    );
    player.spendCredits(power);
  }

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawRect(
      Rect.fromLTWH(
        0,
        0,
        size.x,
        size.y,
      ),
      backgroundPaint,
    );

    double fillValue = 1 - (value - player.credits);
    fillValue = fillValue.clamp(0, 1);
    final double height = size.y * fillValue;

    canvas.drawRect(
      Rect.fromLTWH(
        0,
        size.y - height,
        size.x,
        height,
      ),
      foregroundPaint,
    );

    final Color cardColor =
        fillValue == 1 ? player.color : Palette.CONTROLS_CARD_VALUE;

    borderPaint.color = cardColor;

    canvas.drawRect(
      Rect.fromLTWH(
        0,
        0,
        size.x,
        size.y,
      ),
      borderPaint,
    );

    canvas.drawText(
      text: value.toString(),
      position: size / 2,
      size: size.y / 2,
      color: cardColor,
    );
  }
}
