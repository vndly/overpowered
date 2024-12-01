import 'package:flutter/material.dart';
import 'package:overpowered/presentation/splash/splash_screen.dart';
import 'package:overpowered/utils/navigation.dart';
import 'package:overpowered/utils/palette.dart';

class Overpowered extends StatelessWidget {
  const Overpowered();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Overpowered',
      debugShowCheckedModeBanner: false,
      navigatorKey: Navigation.get.routes.key,
      theme: ThemeData(
        primaryColor: Palette.primary,
        primarySwatch: Palette.primary,
        colorScheme: ColorScheme.fromSeed(seedColor: Palette.primary),
        scaffoldBackgroundColor: Palette.GAME_BACKGROUND,
      ),
      home: SplashScreen.instance(),
    );
  }
}
