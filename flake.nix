{
  description = "TypeScript & Node.js development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    systems = [
      "x86_64-linux"
      "aarch64-linux"
    ];
    forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
  in {
    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_22
          typescript
          typescript-language-server
          pnpm
          yarn
          bun
          biome
        ];

        shellHook = ''
          export NPM_CONFIG_CACHE="$PWD/.direnv/npm/cache"
          export NPM_CONFIG_USERCONFIG="$PWD/.direnv/npm/npmrc"
          export NODE_REPL_HISTORY="$PWD/.direnv/node/repl_history"
          mkdir -p "$(dirname "$NPM_CONFIG_USERCONFIG")" "$(dirname "$NODE_REPL_HISTORY")"
          echo "⚡ [TypeScript / Node.js Dev Environment Loaded]"
          echo "  • Node: $(node --version 2>/dev/null || echo 'ready')"
          echo "  • pnpm: $(pnpm --version 2>/dev/null || echo 'ready')"
          echo "  • Bun:  $(bun --version 2>/dev/null || echo 'ready')"
        '';
      };
    });
  };
}
