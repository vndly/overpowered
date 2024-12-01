import 'package:flame/game.dart';
import 'package:overpowered/app/constants.dart';
import 'package:overpowered/domain/state/game/base.dart';
import 'package:overpowered/domain/state/game/lane.dart';
import 'package:overpowered/domain/state/game/nodes/node_checkpoint.dart';
import 'package:overpowered/domain/state/game/nodes/node_chest.dart';
import 'package:overpowered/domain/state/game/nodes/node_credit_generator.dart';
import 'package:overpowered/domain/state/game/nodes/node_invisible.dart';
import 'package:overpowered/domain/state/game/nodes/node_unit_generator.dart';
import 'package:overpowered/domain/state/game/nodes/node_victory.dart';
import 'package:overpowered/domain/state/game/players/player.dart';

class Battlefield {
  final String id;
  final List<Base> bases;
  final List<Lane> lanes;
  final Vector2 mapSize;
  final double laneWidth;
  final double maxNodeSize;
  final double maxUnitSize;

  const Battlefield({
    required this.id,
    required this.bases,
    required this.lanes,
    required this.mapSize,
    required this.laneWidth,
    required this.maxNodeSize,
    required this.maxUnitSize,
  });

  Base get baseSelf => bases.where((b) => b.owner.isSelf).first;

  Base get baseEnemy => bases.where((b) => b.owner.isEnemy).first;

  void update(double dt) {
    for (final Lane lane in lanes) {
      lane.update(dt);
    }
  }

  factory Battlefield.vector({
    required Player self,
    required Player enemy,
  }) {
    const double laneHeight = Constants.UI_BATTLEFIELD_HEIGHT;
    const double laneWidth = Constants.UI_BATTLEFIELD_WIDTH / 5;
    const double maxNodeSize = laneWidth * 0.7;
    const double maxUnitSize = laneWidth * 0.6;

    // ignore: prefer_const_constructors
    final Lane lane1 = Lane(
      id: 'l1',
      nodes: [],
      units: [],
    );

    lane1.nodes.addAll([
      NodeInvisible(
        id: 'n1a',
        lane: lane1,
        position: Vector2(laneWidth * 0.5, laneHeight),
        maxNodeSize: maxNodeSize,
      ),
      NodeChest(
        id: 'n1b',
        lane: lane1,
        position: Vector2(laneWidth * 0.5, laneHeight / 2),
        maxNodeSize: maxNodeSize,
      ),
      NodeInvisible(
        id: 'n1c',
        lane: lane1,
        position: Vector2(laneWidth * 0.5, 0),
        maxNodeSize: maxNodeSize,
      ),
    ]);

    // ignore: prefer_const_constructors
    final Lane lane2 = Lane(
      id: 'l2',
      nodes: [],
      units: [],
    );

    lane2.nodes.addAll([
      NodeInvisible(
        id: 'n2a',
        lane: lane2,
        position: Vector2(laneWidth * 1.5, laneHeight),
        maxNodeSize: maxNodeSize,
      ),
      NodeUnitGenerator(
        id: 'n2b',
        lane: lane2,
        position: Vector2(laneWidth * 1.5, laneHeight * (2 / 3)),
        maxNodeSize: maxNodeSize,
      ),
      NodeCreditGenerator(
        id: 'n2c',
        lane: lane2,
        position: Vector2(laneWidth * 1.5, laneHeight * (1 / 3)),
        maxNodeSize: maxNodeSize,
      ),
      NodeInvisible(
        id: 'n2d',
        lane: lane2,
        position: Vector2(laneWidth * 1.5, 0),
        maxNodeSize: maxNodeSize,
      ),
    ]);

    // ignore: prefer_const_constructors
    final Lane lane3 = Lane(
      id: 'l3',
      nodes: [],
      units: [],
    );

    lane3.nodes.addAll([
      NodeInvisible(
        id: 'n3a',
        lane: lane3,
        position: Vector2(laneWidth * 2.5, laneHeight),
        maxNodeSize: maxNodeSize,
      ),
      NodeVictory(
        id: 'n3b',
        lane: lane3,
        position: Vector2(laneWidth * 2.5, laneHeight / 2),
        maxNodeSize: maxNodeSize,
      ),
      NodeInvisible(
        id: 'n3c',
        lane: lane3,
        position: Vector2(laneWidth * 2.5, 0),
        maxNodeSize: maxNodeSize,
      ),
    ]);

    // ignore: prefer_const_constructors
    final Lane lane4 = Lane(
      id: 'l4',
      nodes: [],
      units: [],
    );

    lane4.nodes.addAll([
      NodeInvisible(
        id: 'n4a',
        lane: lane4,
        position: Vector2(laneWidth * 3.5, laneHeight),
        maxNodeSize: maxNodeSize,
      ),
      NodeCreditGenerator(
        id: 'n4b',
        lane: lane4,
        position: Vector2(laneWidth * 3.5, laneHeight * (2 / 3)),
        maxNodeSize: maxNodeSize,
      ),
      NodeUnitGenerator(
        id: 'n4c',
        lane: lane4,
        position: Vector2(laneWidth * 3.5, laneHeight * (1 / 3)),
        maxNodeSize: maxNodeSize,
      ),
      NodeInvisible(
        id: 'n4d',
        lane: lane4,
        position: Vector2(laneWidth * 3.5, 0),
        maxNodeSize: maxNodeSize,
      ),
    ]);

    // ignore: prefer_const_constructors
    final Lane lane5 = Lane(
      id: 'l5',
      nodes: [],
      units: [],
    );

    lane5.nodes.addAll([
      NodeInvisible(
        id: 'n5a',
        lane: lane5,
        position: Vector2(laneWidth * 4.5, laneHeight),
        maxNodeSize: maxNodeSize,
      ),
      NodeCheckpoint(
        id: 'n5b',
        lane: lane5,
        position: Vector2(laneWidth * 4.5, laneHeight / 2),
        maxNodeSize: maxNodeSize,
      ),
      NodeInvisible(
        id: 'n5c',
        lane: lane5,
        position: Vector2(laneWidth * 4.5, 0),
        maxNodeSize: maxNodeSize,
      ),
    ]);

    return Battlefield(
      id: 'vector',
      mapSize: Vector2(
        Constants.UI_BATTLEFIELD_WIDTH,
        Constants.UI_BATTLEFIELD_HEIGHT,
      ),
      laneWidth: laneWidth,
      maxNodeSize: maxNodeSize,
      maxUnitSize: maxUnitSize,
      bases: [
        Base(
          owner: self,
          hp: 100,
        ),
        Base(
          owner: enemy,
          hp: 100,
        ),
      ],
      lanes: [
        lane1,
        lane2,
        lane3,
        lane4,
        lane5,
      ],
    );
  }
}
