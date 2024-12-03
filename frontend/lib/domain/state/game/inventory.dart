import 'package:overpowered/domain/state/game/resources.dart';

class Inventory {
  final List<Resources> reources;
  int limit;

  Inventory({
    required this.reources,
    required this.limit,
  });
}
