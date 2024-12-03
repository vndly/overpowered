import 'package:overpowered/extensions/duration_extension.dart';

class Formatter {
  static String time(num amount) => Duration(seconds: amount.toInt()).formatted;
}
