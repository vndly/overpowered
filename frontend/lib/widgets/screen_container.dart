import 'package:dafluta/dafluta.dart';
import 'package:flutter/material.dart';

class ScreenContainer extends StatelessWidget {
  final Widget child;

  const ScreenContainer({required this.child});

  @override
  Widget build(BuildContext context) {
    return DarkStatusBar(
      child: Scaffold(
        body: SafeArea(
          child: child
        ),
      ),
    );
  }
}
