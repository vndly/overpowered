import 'package:flutter/material.dart';
import 'package:overpowered/domain/state/splash/splash_state.dart';
import 'package:overpowered/widgets/screen_container.dart';

class SplashScreen extends StatelessWidget {
  final SplashState state;

  const SplashScreen._(this.state);

  factory SplashScreen.instance() => SplashScreen._(SplashState());

  @override
  Widget build(BuildContext context) {
    return ScreenContainer(
      child: Center(
        child: ElevatedButton(
          onPressed: state.onPlay,
          child: const Text('PLAY'),
        ),
      ),
    );
  }
}
