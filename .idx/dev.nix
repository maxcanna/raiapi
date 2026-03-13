# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "unstable";

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_24
    pkgs.yarn-berry
    pkgs.go
  ];

  # Sets environment variables in the workspace
  env = {
  };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "golang.go"
      "google.gemini-cli-vscode-ide-companion"
      "k--kato.intellij-idea-keybindings"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          command = [
            "go"
            "run"
            "./cmd/server/main.go"
          ];
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        golangci-lint = "curl -sSfL https://golangci-lint.run/install.sh | sh -s -- -b ~/flutter/bin";
        gosec = "curl -sfL https://raw.githubusercontent.com/securego/gosec/master/install.sh | sh -s -- -b ~/flutter/bin";
        gemini-cli = "npm install -g @google/gemini-cli";
      };
      # Runs when the workspace is (re)started
      onStart = {
        build = "yarn install --immutable && yarn build";
      };
    };
  };
}
