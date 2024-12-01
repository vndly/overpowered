import 'package:flame/components.dart';
import 'package:overpowered/domain/state/game/tile.dart';
import 'package:overpowered/domain/types/tile_type.dart';

class Terrain {
  final Vector2 size;
  final List<Tile> tiles;

  Terrain({
    required this.size,
    required this.tiles,
  });

  factory Terrain.create() {
    final Vector2 size = Vector2(7, 12);
    final List<Tile> emptyTiles = [];

    for (int x = 0; x < size.x; x++) {
      for (int y = 0; y < size.y; y++) {
        emptyTiles.add(Tile(
          tileType: TileType.empty,
          position: Vector2(x.toDouble(), y.toDouble()),
        ));
      }
    }

    final List<Tile> newTiles = [
      Tile(
        tileType: TileType.patch_fuel,
        position: Vector2(1, 1),
      ),
      Tile(
        tileType: TileType.patch_water,
        position: Vector2(3, 5),
      ),
      Tile(
        tileType: TileType.patch_metal,
        position: Vector2(6, 8),
      ),
    ];
    final List<Tile> tiles =
        emptyTiles.where((tile) => !_inList(newTiles, tile)).toList();
    tiles.addAll(newTiles);

    return Terrain(
      size: size,
      tiles: tiles,
    );
  }

  double get aspectRatio => size.x / size.y;

  void update(double dt) {}

  static bool _inList(List<Tile> list, Tile tile) =>
      list.any((current) => current.position == tile.position);
}
