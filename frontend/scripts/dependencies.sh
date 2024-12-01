#!/usr/bin/env bash

set -e

flutter pub upgrade
flutter pub run dapublock:dapublock.dart .
flutter pub run daunused:daunused.dart . lib/main/* lib/build/generate_version.dart test/* .dart_tool/* integration_test/*
flutter pub outdated
flutter pub upgrade --major-versions
dart format lib