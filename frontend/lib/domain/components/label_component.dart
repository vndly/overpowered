import 'package:flame/components.dart';
import 'package:flutter/painting.dart';

class LabelComponent extends TextComponent {
  LabelComponent({
    required String text,
    required Vector2 position,
    required double size,
    required Color color,
  }) : super(
          text: text,
          anchor: Anchor.center,
          position: position,
          textRenderer: TextPaint(
            style: TextStyle(
              fontSize: size,
              color: color,
            ),
          ),
        );
}
