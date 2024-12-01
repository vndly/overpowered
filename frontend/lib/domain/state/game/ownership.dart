import 'dart:ui';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/players/player.dart';
import 'package:overpowered/domain/state/game/units/unit.dart';
import 'package:overpowered/utils/palette.dart';

class Ownership with GameEngineRef {
  final double captureRate;
  double _value = 0;
  Player? _owner;
  Player? _lastTouched;

  Ownership({
    required this.captureRate,
  });

  bool get hasOwner => _owner != null;

  Player? get owner => _owner;

  bool get hasTouched => _lastTouched != null;

  double get ownershipValue => _value;

  Color get color {
    if (ownershipValue > 0) {
      return Palette.PLAYER_SELF;
    } else if (ownershipValue < 0) {
      return Palette.PLAYER_ENEMY;
    } else {
      return Palette.transparent;
    }
  }

  bool get isOwned => _owner == engine.self;

  bool isOwner(Player player) => _owner == player;

  void onTouched(Unit unit) => _lastTouched = unit.owner;

  void update(double dt) {
    if ((_lastTouched != null) && (_lastTouched != _owner)) {
      _value += (dt * captureRate) * _lastTouched!.ownershipDirection;
      _value = _value.clamp(-1, 1);

      if ((_value == 1) || (_value == -1)) {
        _owner = _lastTouched!;
        onOwnerAssigned(_owner!);
      } else {
        if (_owner != null) {
          onOwnerUnassigned(_owner!);
        }

        _owner = null;
      }
    }
  }

  void onOwnerAssigned(Player owner) {}

  void onOwnerUnassigned(Player owner) {}
}
