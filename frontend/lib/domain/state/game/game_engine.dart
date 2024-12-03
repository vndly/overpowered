import 'package:flutter/widgets.dart';
import 'package:overpowered/domain/components/game_component.dart';
import 'package:overpowered/domain/state/game/inventory.dart';
import 'package:overpowered/domain/state/game/terrain.dart';

class GameEngine {
  final GameComponent gameComponent;
  final Terrain terrain;
  final Inventory inventory;
  final VoidCallback onUpdate;

  final int totalEnergy;
  int remainingEnergy = 0;

  final int totalTime;
  double remainingTime = 0;

  GameEngine({
    required this.gameComponent,
    required this.terrain,
    required this.inventory,
    required this.onUpdate,
    required this.totalEnergy,
    required this.totalTime,
  }) {
    GameEngineRef.instance = this;
    remainingEnergy = totalEnergy;
    remainingTime = totalTime.toDouble();
  }

  double get remainingEnergyPercentage => remainingEnergy / totalEnergy;

  double get remainingTimePercentage => remainingTime / totalTime;

  void update(double dt) {
    terrain.update(dt);
    remainingTime -= dt;
    onUpdate();
  }
}

mixin GameEngineRef {
  static late GameEngine instance;

  GameEngine get engine => instance;
}
