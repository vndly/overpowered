import 'package:overpowered/environments/environment.dart';

class RemoteEnvironment extends Environment {
  @override
  String get name => 'remote';

  @override
  String get matchServerUrl => 'wss://zeronest.com:7777';
}
