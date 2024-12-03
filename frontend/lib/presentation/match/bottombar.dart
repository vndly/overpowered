import 'package:dafluta/dafluta.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/domain/state/game/resources.dart';
import 'package:overpowered/domain/state/match/match_state.dart';

class Bottombar extends StatelessWidget {
  final BottombarState state;

  const Bottombar(this.state);

  @override
  Widget build(BuildContext context) {
    return StateProvider<BottombarState>(
      state: state,
      builder: (context, state) => Container(
        padding: const EdgeInsets.all(10),
        color: Colors.red,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SelectedItem(state),
            const VBox(10),
            InventoryList(state),
          ],
        ),
      ),
    );
  }
}

class SelectedItem extends StatelessWidget {
  final BottombarState state;

  const SelectedItem(this.state);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      color: Colors.yellow,
    );
  }
}

class InventoryList extends StatelessWidget {
  final BottombarState state;

  const InventoryList(this.state);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      color: Colors.blue,
      child: Padding(
        padding: const EdgeInsets.all(5),
        child: Row(
          children: [
            for (final Resources resources in state.engine.inventory.reources)
              InventoryItem(resources),
          ],
        ),
      ),
    );
  }
}

class InventoryItem extends StatelessWidget {
  final Resources resources;

  const InventoryItem(this.resources);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      margin: const EdgeInsets.only(right: 5),
      color: Colors.green,
    );
  }
}
