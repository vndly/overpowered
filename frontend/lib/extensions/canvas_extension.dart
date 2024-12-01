import 'package:flame/game.dart';
import 'package:flame/widgets.dart';
import 'package:flutter/material.dart';

extension CanvasExtension on Canvas {
  void drawText({
    required String text,
    required Vector2 position,
    required double size,
    Color? color,
    Paint? foreground,
    Paint? background,
  }) {
    final TextStyle textStyle = TextStyle(
      fontSize: size,
      fontWeight: FontWeight.normal,
      color: color,
      foreground: foreground,
      background: background,
    );
    final TextSpan textSpan = TextSpan(
      text: text,
      style: textStyle,
    );
    final TextPainter textPainter = TextPainter(
      text: textSpan,
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
    );
    textPainter.layout();

    final translatedPosition = translate(
      anchor: Anchor.center,
      point: Vector2(position.x, position.y),
      size: Vector2(textPainter.size.width, textPainter.size.height),
    );
    textPainter.paint(
      this,
      translatedPosition.toOffset(),
    );
  }

  Vector2 translate({
    required Anchor anchor,
    required Vector2 point,
    required Vector2 size,
  }) =>
      point - (Vector2(anchor.x, anchor.y)..multiply(size));
}
