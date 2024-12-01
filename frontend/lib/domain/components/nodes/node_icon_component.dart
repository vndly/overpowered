import 'package:flame/components.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/domain/types/priority.dart';
import 'package:overpowered/extensions/canvas_extension.dart';
import 'package:overpowered/utils/palette.dart';

class NodeIconComponent extends PositionComponent {
  final String icon;

  NodeIconComponent({
    required this.icon,
    required PositionComponent parent,
  }) : super(
          position: parent.size / 2,
          size: parent.size / 2,
          anchor: Anchor.center,
          priority: Priority.node.value,
        );

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawText(
      text: icon,
      position: size / 2,
      size: size.x,
      color: Palette.NODE_NEUTRAL_FOREGROUND,
    );
  }
}
