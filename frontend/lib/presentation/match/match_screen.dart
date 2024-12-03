import 'dart:math';

import 'package:dafluta/dafluta.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/domain/state/game/resources.dart';
import 'package:overpowered/domain/state/match/match_state.dart';
import 'package:overpowered/utils/formatter.dart';
import 'package:overpowered/utils/palette.dart';
import 'package:overpowered/widgets/label.dart';
import 'package:overpowered/widgets/screen_container.dart';

class MatchScreen extends StatelessWidget {
  final MatchState state;

  const MatchScreen._(this.state);

  factory MatchScreen.instance() => MatchScreen._(MatchState());

  @override
  Widget build(BuildContext context) {
    return ScreenContainer(
      child: StateProvider<MatchState>(
        state: state,
        builder: (context, state) => Content(state),
      ),
    );
  }
}

class Content extends StatelessWidget {
  final MatchState state;

  const Content(this.state);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Topbar(state.topbarState),
        MapContainer(
          state: state,
          child: GameWidget(
            game: state.gameComponent,
          ),
        ),
        Bottombar(state.bottombarState),
      ],
    );
  }
}

class Topbar extends StatelessWidget {
  final TopbarState state;

  const Topbar(this.state);

  @override
  Widget build(BuildContext context) {
    return StateProvider<TopbarState>(
      state: state,
      builder: (context, state) => Container(
        padding: const EdgeInsets.all(10),
        color: Colors.green,
        child: Column(
          children: [
            ParameterIndicator(
              title: 'Energy',
              label: '${state.engine.remainingEnergy} left',
              backgroundColor: Palette.TOPBAR_ENERGY_FOREGROUND,
              foregroundColor: Palette.TOPBAR_BACKGROUND,
              progress: state.engine.remainingEnergyPercentage,
            ),
            const VBox(10),
            ParameterIndicator(
              title: 'Time',
              label: '${Formatter.time(state.engine.remainingTime)} left',
              backgroundColor: Palette.TOPBAR_TIME_FOREGROUND,
              foregroundColor: Palette.TOPBAR_BACKGROUND,
              progress: state.engine.remainingTimePercentage,
            ),
          ],
        ),
      ),
    );
  }
}

class ParameterIndicator extends StatelessWidget {
  final String title;
  final String label;
  final Color backgroundColor;
  final Color foregroundColor;
  final double progress;

  const ParameterIndicator({
    required this.title,
    required this.label,
    required this.backgroundColor,
    required this.foregroundColor,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(
          width: 140,
          child: Row(
            children: [
              Label(
                text: '$title:',
                color: Colors.white,
                size: 12,
              ),
              const Spacer(),
              Label(
                text: label,
                color: Colors.white,
                size: 12,
              ),
              const HBox(10),
            ],
          ),
        ),
        Expanded(
          child: ProgressIndicator(
            backgroundColor: backgroundColor,
            foregroundColor: foregroundColor,
            progress: progress,
          ),
        ),
      ],
    );
  }
}

class ProgressIndicator extends StatelessWidget {
  final Color backgroundColor;
  final Color foregroundColor;
  final double progress;

  const ProgressIndicator({
    required this.backgroundColor,
    required this.foregroundColor,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      clipBehavior: Clip.hardEdge,
      child: SizedBox(
        height: 10,
        child: FractionallySizedBox(
          widthFactor: progress,
          alignment: Alignment.centerRight,
          child: Container(
            color: foregroundColor,
          ),
        ),
      ),
    );
  }
}

class MapContainer extends StatelessWidget {
  final MatchState state;
  final Widget child;

  const MapContainer({
    required this.state,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final Size size = MediaQuery.of(context).size;
    final double gap = min(size.width, size.height) * 0.05;

    return Expanded(
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(gap),
          child: AspectRatio(
            aspectRatio: state.engine.terrain.aspectRatio,
            child: child,
          ),
        ),
      ),
    );
  }
}

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
