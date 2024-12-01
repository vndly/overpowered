import 'package:dafluta/dafluta.dart';
import 'package:flutter/material.dart';
import 'package:overpowered/domain/state/match/match_state.dart';
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
    return Center(
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          color: Colors.red,
        ),
      ),
    );

    //return GameWidget(
    //  game: state.gameComponent,
    //);
  }
}
