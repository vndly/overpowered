import 'package:overpowered/platform/platform_mobile.dart'
    if (dart.library.html) 'package:overpowered/platform/platform_web.dart';

class SetUrlStrategy {
  static void set() => PlatformMethods().urlStrategy();
}
