import 'package:flutter/foundation.dart';

class Platform {
  static const bool isDebug = kDebugMode;

  static final bool isAndroid = defaultTargetPlatform == TargetPlatform.android;

  static final bool isIOS = defaultTargetPlatform == TargetPlatform.iOS;

  static const bool isWeb = kIsWeb;

  static final bool isMobile = isAndroid || isIOS;

  static final bool isMobileNative = isMobile && !isWeb;

  static const bool isDebugMode = kDebugMode;

  static const bool isReleaseMode = kReleaseMode;
}
