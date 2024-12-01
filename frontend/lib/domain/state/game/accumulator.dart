mixin Accumulator {
  double _creditsAccumulated = 0;

  bool get hasCreditsAccumulated => creditsAccumulated > 0;

  double get creditsAccumulated => _creditsAccumulated.floorToDouble();

  void addAccumulated(double value) => _creditsAccumulated += value;

  void removeAccumulated(double value) => _creditsAccumulated -= value;

  void clearAccumulated() => _creditsAccumulated = 0;
}
