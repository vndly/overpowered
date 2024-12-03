import 'dart:math';
import 'package:dafluta/dafluta.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/domain/state/match/match_state.dart';
import 'package:overpowered/presentation/match/bottombar.dart';
import 'package:overpowered/presentation/match/topbar.dart';
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
