import 'package:overpowered/platform/platform_mobile.dart'
    if (dart.library.html) 'package:overpowered/platform/platform_web.dart';

class SetFullscreen {
  static void set() => PlatformMethods().webFullscreen();
}
