import 'package:flame/components.dart';

class Terrain {
  final Vector2 size;

  Terrain({
    required this.size,
  });

  factory Terrain.create() => Terrain(size: Vector2(7, 12));

  double get aspectRatio => size.x / size.y;

  void update(double dt) {}
}
