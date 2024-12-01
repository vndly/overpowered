import 'dart:ui';
import 'package:overpowered/utils/palette.dart';

enum TileType {
  empty(
    icon: '',
    color: Palette.TILE_EMPTY,
  ),
  patch_fuel(
    icon: '🛢️',
    color: Palette.TILE_PATCH_FUEL,
  ),
  patch_water(
    icon: '💧',
    color: Palette.TILE_PATCH_WATER,
  ),
  patch_metal(
    icon: '⚙️',
    color: Palette.TILE_PATCH_METAL,
  ),
  power_plant(
    icon: '⚡',
    color: Palette.TILE_POWER_PLANT,
  );

  final String icon;
  final Color color;

  const TileType({
    required this.icon,
    required this.color,
  });
}
