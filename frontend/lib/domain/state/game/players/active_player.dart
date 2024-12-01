import 'dart:math';
import 'package:overpowered/domain/state/game/players/player.dart';

class ActivePlayer extends Player {
  late int creditsTarget;

  ActivePlayer({
    required super.id,
    required super.ownershipDirection,
    required super.baseCreditsRate,
  }) {
    _recalculateCredits();
  }

  @override
  void takeAction() {
    if (credits >= creditsTarget) {}
  }

  void _recalculateCredits() {
    final int value = Random().nextInt(21) + 1;

    if (value <= 6) {
      creditsTarget = 1;
    } else if (value <= 11) {
      creditsTarget = 2;
    } else if (value <= 15) {
      creditsTarget = 3;
    } else if (value <= 18) {
      creditsTarget = 4;
    } else if (value <= 20) {
      creditsTarget = 5;
    } else {
      creditsTarget = 6;
    }
  }
}
