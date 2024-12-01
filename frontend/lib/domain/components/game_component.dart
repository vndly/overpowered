import 'dart:async';
import 'package:flame/components.dart';
import 'package:flame/extensions.dart';
import 'package:flame/game.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/match_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/match/match_state.dart';
import 'package:overpowered/presentation/dialogs/confirmation_dialog.dart';
import 'package:overpowered/utils/navigation.dart';
import 'package:overpowered/utils/palette.dart';

class GameComponent extends FlameGame
    with HasCollisionDetection, GameEngineRef {
  final MatchState matchState;

  GameComponent(this.matchState) : super(world: MatchComponent());

  @override
  FutureOr onLoad() {
    final double width = Constants.TILE_SIZE * matchState.engine.terrain.size.x;
    final double height =
        Constants.TILE_SIZE * matchState.engine.terrain.size.y;

    camera = CameraComponent.withFixedResolution(
      width: width,
      height: height,
    );

    camera.moveTo(Vector2(
      width / 2,
      height / 2,
    ));

    if (debugMode) {
      add(FpsTextComponent());
    }

    return super.onLoad();
  }

  @override
  Color backgroundColor() => Palette.GAME_BACKGROUND;

  @override
  void update(double dt) {
    engine.update(dt);

    super.update(dt);
  }

  void onMatchFinished(bool won) {
    pauseEngine();

    if (won) {
      ConfirmationDialog.won(
        onAccept: _onMatchReset,
        onCancel: _onMatchQuit,
      );
    } else {
      ConfirmationDialog.lost(
        onAccept: _onMatchReset,
        onCancel: _onMatchQuit,
      );
    }
  }

  void _onMatchReset() => matchState.restart();

  void _onMatchQuit() => Navigation.pop();
}
