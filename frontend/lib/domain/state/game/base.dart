import 'package:flame/palette.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/players/player.dart';

class Base with GameEngineRef {
  final Player owner;
  int hp;

  Base({
    required this.owner,
    required this.hp,
  });

  Color get color => owner.color;

  void onHit(int value) {
    hp -= value;
    hp = hp.clamp(0, 100);

    if (hp <= 0) {
      engine.onBaseDestroyed(this);
    }
  }
}
