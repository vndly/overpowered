import 'package:overpowered/domain/state/game/nodes/node.dart';
import 'package:overpowered/domain/state/game/players/player.dart';
import 'package:overpowered/domain/state/game/units/unit.dart';

class Lane {
  final String id;
  final List<Node> nodes;
  final List<Unit> units;

  const Lane({
    required this.id,
    required this.nodes,
    required this.units,
  });

  List<Node> nodesFromPlayer(Player player) =>
      nodes.where((n) => n.owner == player).toList();

  List<Node> getNodes({
    required bool forward,
    Node? from,
  }) {
    final List<Node> list = forward ? nodes : nodes.reversed.toList();
    final List<Node> result = [];
    bool found = false;

    for (final Node node in list) {
      if ((node == from) || (from == null)) {
        found = true;
      }

      if (found) {
        result.add(node);
      }
    }

    return result;
  }

  void addUnit(Unit unit) {
    units.add(unit);
  }

  void removeUnit(Unit unit) {
    units.remove(unit);
  }

  void update(double dt) {
    for (final Node node in nodes) {
      node.update(dt);
    }

    for (final Unit unit in units) {
      unit.update(dt);
    }
  }
}
