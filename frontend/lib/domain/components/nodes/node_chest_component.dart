import 'package:flame/events.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/domain/components/nodes/node_capturable_component.dart';
import 'package:overpowered/extensions/canvas_extension.dart';
import 'package:overpowered/utils/palette.dart';

class NodeChestComponent extends NodeCapturableComponent with TapCallbacks {
  NodeChestComponent({
    required super.node,
    required super.position,
    required super.size,
  });

  @override
  void onTapUp(TapUpEvent event) => node.onTapped();

  @override
  void render(Canvas canvas) {
    super.render(canvas);

    canvas.drawText(
      text: node.creditsAccumulated.toString(),
      position: size / 2,
      size: 70,
      color: Palette.NODE_NEUTRAL_FOREGROUND,
    );
  }
}
