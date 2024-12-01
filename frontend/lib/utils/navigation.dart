import 'package:dafluta/dafluta.dart';
import 'package:flutter/widgets.dart';
import 'package:overpowered/presentation/match/match_screen.dart';
import 'package:overpowered/utils/locator.dart';

class Navigation {
  final Routes routes = Routes();

  static Navigation get get => locator<Navigation>();

  static BuildContext context() => get.routes.key.currentContext!;

  static void pop<T>([T? result]) => get.routes.pop(result);

  static void matchScreen() => get.routes.push(
        BasicRoute(
          MatchScreen.instance(),
          name: 'match',
        ),
      );
}
