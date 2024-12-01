import 'package:flame/components.dart';
import 'package:overpowered/domain/components/tile_component.dart';
import 'package:overpowered/domain/types/tile_type.dart';

class Tile {
  final TileType tileType;
  final Vector2 position;

  const Tile({
    required this.tileType,
    required this.position,
  });

  Component get component => TileComponent(this);
}
