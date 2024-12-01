#!/usr/bin/env bash

set -e

flutter clean
#dart lib/build/generate_version.dart
flutter build web -t lib/main/main_remote.dart --web-renderer canvaskit --release

OUTPUT="../backend/public"
rm -r ${OUTPUT}
mkdir ${OUTPUT}
cp -r build/web/** ${OUTPUT}

cd ../backend

firebase use remote
firebase deploy --only hosting
firebase use local

cd ../frontend