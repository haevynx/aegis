#!/bin/sh
# aegis installer — https://github.com/nvdhai2003mobiledev/aegis
#
#   curl -fsSL https://raw.githubusercontent.com/nvdhai2003mobiledev/aegis/main/install.sh | sh
#   curl -fsSL https://raw.githubusercontent.com/nvdhai2003mobiledev/aegis/main/install.sh | sh -s -- --project
#
# Biến môi trường:
#   AEGIS_VERSION     tag hoặc nhánh (mặc định: main), vd v0.2.0
#   AEGIS_HOME        thư mục cài (mặc định: ~/.aegis)
#   AEGIS_SOURCE_DIR  cài từ thư mục local thay vì tải (dùng cho CI / phát triển)
#
# Không cần sudo. Không sửa file cấu hình shell của bạn.
set -eu

REPO="nvdhai2003mobiledev/aegis"
REF="${AEGIS_VERSION:-main}"
AEGIS_HOME="${AEGIS_HOME:-$HOME/.aegis}"
export AEGIS_HOME

if [ -t 1 ]; then B="$(printf '\033[1m')"; G="$(printf '\033[32m')"; R="$(printf '\033[31m')"; D="$(printf '\033[2m')"; N="$(printf '\033[0m')"; else B=""; G=""; R=""; D=""; N=""; fi
info() { printf '%s\n' "${D}aegis:${N} $*"; }
fail() { printf '%s\n' "${R}aegis: $*${N}" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "cần Node.js ≥ 18 — https://nodejs.org"
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' || fail "cần Node.js ≥ 18 (đang có $(node --version))"

tmp="$(mktemp -d 2>/dev/null || mktemp -d -t aegis)"
trap 'rm -rf "$tmp"' EXIT INT TERM

if [ -n "${AEGIS_SOURCE_DIR:-}" ]; then
  src="$AEGIS_SOURCE_DIR"
  info "cài từ thư mục local: $src"
else
  url="https://codeload.github.com/$REPO/tar.gz/$REF"
  info "tải $REPO@$REF"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$tmp/aegis.tgz" || fail "không tải được $url"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp/aegis.tgz" "$url" || fail "không tải được $url"
  else
    fail "cần curl hoặc wget"
  fi
  mkdir -p "$tmp/src"
  tar -xzf "$tmp/aegis.tgz" -C "$tmp/src" --strip-components=1 || fail "giải nén thất bại"
  src="$tmp/src"
fi

[ -f "$src/bin/aegis.mjs" ] || fail "gói tải về không hợp lệ (thiếu bin/aegis.mjs)"
node "$src/bin/aegis.mjs" install "$@"

case ":$PATH:" in
  *":$AEGIS_HOME/bin:"*) ;;
  *)
    shell_rc="~/.profile"
    case "${SHELL:-}" in */zsh) shell_rc="~/.zshrc" ;; */bash) shell_rc="~/.bashrc" ;; */fish) shell_rc="~/.config/fish/config.fish" ;; esac
    printf '\n%s\n' "${B}Thêm aegis vào PATH${N} (thêm dòng này vào $shell_rc rồi mở terminal mới):"
    case "${SHELL:-}" in
      */fish) printf '  %s\n' "${G}fish_add_path $AEGIS_HOME/bin${N}" ;;
      *) printf '  %s\n' "${G}export PATH=\"$AEGIS_HOME/bin:\$PATH\"${N}" ;;
    esac
    ;;
esac
printf '\n%s\n' "${G}✔ aegis đã sẵn sàng.${N} Chạy ${B}aegis doctor${N} trong thư mục project để xem bước tiếp theo."
