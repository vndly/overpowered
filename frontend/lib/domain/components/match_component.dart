import 'dart:async';
import 'package:flame/components.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/base_component.dart';
import 'package:overpowered/domain/components/battlefield_component.dart';
import 'package:overpowered/domain/components/controls_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';

class MatchComponent extends World {
  MatchComponent();

  @override
  FutureOr onLoad() {
    final GameEngine engine = GameEngineRef.instance;

    add(BattlefieldComponent(engine.battlefield));

    add(BaseComponent(
      base: engine.battlefield.baseEnemy,
      position: Vector2(0, -Constants.UI_BASE_HEIGHT),
      size: Vector2(
        Constants.SCREEN_WIDTH,
        Constants.UI_BASE_HEIGHT,
      ),
    ));

    add(BaseComponent(
      base: engine.battlefield.baseSelf,
      position: Vector2(
        0,
        Constants.SCREEN_HEIGHT -
            Constants.UI_CONTROLS_HEIGHT -
            (Constants.UI_BASE_HEIGHT * 2),
      ),
      size: Vector2(
        Constants.SCREEN_WIDTH,
        Constants.UI_BASE_HEIGHT,
      ),
    ));

    add(ControlsComponent(
      player: engine.self,
      position: Vector2(
        0,
        Constants.SCREEN_HEIGHT -
            Constants.UI_CONTROLS_HEIGHT -
            Constants.UI_BASE_HEIGHT,
      ),
      size: Vector2(
        Constants.SCREEN_WIDTH,
        Constants.UI_CONTROLS_HEIGHT,
      ),
    ));

    return super.onLoad();
  }
}
