{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [ ];
  env = { };
  idx = {
    extensions = [
      "Dart-Code.flutter"
      "Dart-Code.dart-code"
    ];
    workspace = { };
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "flutter" "run" "--machine" "-d" "web-server" "-t" "lib/main/main_local.dart" "--web-hostname" "0.0.0.0" "--web-port" "$PORT" ];
          manager = "flutter";
          cwd = "./frontend";
        };
      };
    };
  };
}
