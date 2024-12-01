import 'dart:async';
import 'package:flame/components.dart';
import 'package:flame/extensions.dart';
import 'package:flame/game.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/lane_component.dart';
import 'package:overpowered/domain/components/match_component.dart';
import 'package:overpowered/domain/components/nodes/node_checkpoint_component.dart';
import 'package:overpowered/domain/components/nodes/node_component.dart';
import 'package:overpowered/domain/components/unit_component.dart';
import 'package:overpowered/domain/state/game/game_engine.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/units/unit.dart';
import 'package:overpowered/domain/state/match/match_state.dart';
import 'package:overpowered/presentation/dialogs/confirmation_dialog.dart';
import 'package:overpowered/utils/navigation.dart';
import 'package:overpowered/utils/palette.dart';

class GameComponent extends FlameGame
    with HasCollisionDetection, GameEngineRef {
  final MatchState matchState;
  final List<LaneComponent> cachedLaneComponents = [];
  final List<NodeComponent> cachedNodeComponents = [];

  GameComponent(this.matchState) : super(world: MatchComponent());

  @override
  FutureOr onLoad() {
    camera = CameraComponent.withFixedResolution(
      height: Constants.SCREEN_HEIGHT,
      width: Constants.SCREEN_WIDTH,
    );

    camera.moveTo(Vector2(
      Constants.SCREEN_WIDTH / 2,
      (Constants.SCREEN_HEIGHT / 2) - Constants.UI_BASE_HEIGHT,
    ));

    if (debugMode) {
      add(FpsTextComponent());
    }

    return super.onLoad();
  }

  @override
  Color backgroundColor() => Palette.GAME_BACKGROUND;

  Iterable<LaneComponent> get laneComponents {
    if (cachedLaneComponents.isEmpty) {
      cachedLaneComponents.addAll(world.children.whereType<LaneComponent>());
    }

    return cachedLaneComponents;
  }

  Iterable<NodeComponent> get nodeComponents {
    if (cachedNodeComponents.isEmpty) {
      cachedNodeComponents
          .addAll(world.children.whereType<NodeCheckpointComponent>());
    }

    return cachedNodeComponents;
  }

  Iterable<UnitComponent> get unitComponents =>
      world.children.whereType<UnitComponent>();

  Lane? checkLaneHover(Vector2 position) {
    Lane? result;

    for (final LaneComponent lane in laneComponents) {
      final Lane? laneResult = lane.checkHover(position);

      if (laneResult != null) {
        result = laneResult;
      }
    }

    return result;
  }

  Node? checkNodeHover(Vector2 position) {
    Node? result;

    for (final NodeComponent node in nodeComponents) {
      final Node? nodeResult = node.checkHover(position);

      if (nodeResult != null) {
        result = nodeResult;
      }
    }

    return result;
  }

  void cleanLaneHover() {
    for (final LaneComponent lane in laneComponents) {
      lane.cleanHover();
    }
  }

  void cleanNodeHover() {
    for (final NodeComponent node in nodeComponents) {
      node.cleanHover();
    }
  }

  void onUnitCreated(UnitComponent unitComponent) {
    world.add(unitComponent);
  }

  void onUnitDestroyed(Unit unit) {
    for (final UnitComponent unitComponent in unitComponents) {
      if (unitComponent.unit == unit) {
        world.remove(unitComponent);
        break;
      }
    }
  }

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
