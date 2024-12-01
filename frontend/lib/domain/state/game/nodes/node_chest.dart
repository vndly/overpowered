import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/components/nodes/node_chest_component.dart';
import 'package:overpowered/domain/components/nodes/node_component.dart';
import 'package:overpowered/domain/state/game/nodes/node_accumulator.dart';

class NodeChest extends NodeAccumulator {
  NodeChest({
    required super.id,
    required super.lane,
    required super.position,
    required super.maxNodeSize,
  }) : super(captureRate: Constants.NODE_CHEST_CAPTURE_RATE);

  @override
  NodeComponent get component => NodeChestComponent(
        node: this,
        position: position,
        size: size,
      );

  @override
  bool canAccumulate() => creditsAccumulated < 10;

  @override
  void onTapped() {
    if (hasOwner && owner!.isSelf && hasCreditsAccumulated) {
      _claimCredits();
    }
  }

  @override
  void update(double dt) {
    super.update(dt);

    if (hasOwner && owner!.isEnemy && hasCreditsAccumulated) {
      _claimCredits();
    }
  }

  void _claimCredits() {
    final double credits = creditsAccumulated;

    engine.onAddCredits(
      player: owner!,
      credits: credits,
    );

    removeAccumulated(credits);
  }
}
