import 'dart:ui';
import 'package:flame/components.dart';
import 'package:overpowered/extensions/canvas_extension.dart';
import 'package:overpowered/utils/palette.dart';

class IconComponent extends PositionComponent {
  final String icon;

  IconComponent({
    required this.icon,
    required PositionComponent parent,
  }) : super(
          position: parent.size / 2,
          size: parent.size / 3,
          anchor: Anchor.center,
          priority: parent.priority,
        );

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawText(
      text: icon,
      position: size / 2,
      size: size.x,
      color: Palette.TILE_ICON,
    );
  }
}
