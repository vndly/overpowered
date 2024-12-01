import 'dart:async';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:overpowered/domain/state/game/damage.dart';
import 'package:overpowered/domain/types/priority.dart';

class DamageComponent extends PositionComponent with CollisionCallbacks {
  final Damage damage;

  DamageComponent({
    required this.damage,
    required super.size,
  }) : super(
          position: damage.position,
          anchor: Anchor.center,
          priority: Priority.damage.value,
        );

  @override
  FutureOr onLoad() {
    add(CircleHitbox());

    return super.onLoad();
  }

  @override
  void onCollisionStart(
    Set<Vector2> intersectionPoints,
    PositionComponent other,
  ) {
    // TODO(momo): implement

    super.onCollisionStart(intersectionPoints, other);
  }

  @override
  void update(double dt) {
    position.setFrom(damage.position);
  }
}
