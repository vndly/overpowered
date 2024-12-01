import 'dart:ui';
import 'package:overpowered/utils/palette.dart';

enum TileType {
  empty(color: Palette.TILE_EMPTY),
  patch_fuel(color: Palette.TILE_PATCH_FUEL),
  patch_water(color: Palette.TILE_PATCH_WATER),
  patch_metal(color: Palette.TILE_PATCH_METAL),
  power_plant(color: Palette.TILE_POWER_PLANT);

  final Color color;

  const TileType({
    required this.color,
  });
}
