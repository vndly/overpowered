import 'package:intl/intl.dart';

typedef TimeDuration = (int, int, int);

extension DurationExtension on Duration {
  bool get hasHours => timeDuration.$1 > 0;

  TimeDuration get timeDuration {
    int totalTime = inSeconds;
    final int hours = totalTime ~/ 3600;

    totalTime -= hours * 3600;
    final int minutes = totalTime ~/ 60;

    totalTime -= minutes * 60;
    final int seconds = totalTime;

    return (hours, minutes, seconds);
  }

  String get formatted {
    final NumberFormat formatter = NumberFormat('00');
    final TimeDuration duration = timeDuration;

    if (hasHours) {
      return '${formatter.format(duration.$1)}:${formatter.format(duration.$2)}:${formatter.format(duration.$3)}';
    } else {
      return '${formatter.format(duration.$2)}:${formatter.format(duration.$3)}';
    }
  }
}