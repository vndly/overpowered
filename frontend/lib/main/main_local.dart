import 'dart:async';
import 'package:flutter/material.dart';
import 'package:overpowered/app/overpowered.dart';
import 'package:overpowered/environments/environment_local.dart';
import 'package:overpowered/utils/error_handler.dart';
import 'package:overpowered/utils/locator.dart';

void main() {
  runZonedGuarded(() async {
    await Locator.load(LocalEnvironment());
    runApp(const Overpowered());
  }, ErrorHandler.onUncaughtError);
}
