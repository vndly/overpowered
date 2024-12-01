import 'package:flame/game.dart';
import 'package:overpowered/domain/types/damage_type.dart';

class Damage {
  final DamageType type;
  final Vector2 position;
  final double radius;
  final double expansionRate;

  const Damage({
    required this.type,
    required this.position,
    required this.radius,
    required this.expansionRate,
  });

  void update(double dt) {}
}
