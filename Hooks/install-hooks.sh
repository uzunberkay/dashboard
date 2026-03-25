#!/usr/bin/env bash
# =============================================================================
# HOOK INSTALLER - Tuna Budget Management System
# =============================================================================
# Bu script, Hooks/ klasöründeki hook'ları .git/hooks/ dizinine kurar.
#
# Kullanım:
#   bash Hooks/install-hooks.sh           # Hook'ları kur
#   bash Hooks/install-hooks.sh --remove  # Hook'ları kaldır
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Proje kökünde olduğumuzu doğrula
if [ ! -d ".git" ]; then
  echo -e "${RED}Hata: Bu script proje kök dizininde çalıştırılmalıdır.${NC}"
  echo "  Kullanım: cd /path/to/tuna && bash Hooks/install-hooks.sh"
  exit 1
fi

HOOKS_DIR="Hooks"
GIT_HOOKS_DIR=".git/hooks"

# Hook eşleştirmeleri: kaynak:hedef
HOOKS="pre-commit.sh:pre-commit pre-push.sh:pre-push"

if [[ "${1:-}" == "--remove" ]]; then
  # ─── Kaldırma modu ───
  echo ""
  echo -e "${CYAN}${BOLD}  Hook'lar kaldırılıyor...${NC}"
  echo ""

  for entry in $HOOKS; do
    target="${entry##*:}"
    target_path="$GIT_HOOKS_DIR/$target"

    if [ -f "$target_path" ]; then
      rm "$target_path"
      echo -e "  ${GREEN}✓${NC} $target kaldırıldı"
    else
      echo -e "  ${YELLOW}⚠${NC} $target zaten kurulu değil"
    fi
  done

  echo ""
  echo -e "${GREEN}${BOLD}  Hook'lar başarıyla kaldırıldı.${NC}"
  echo ""
  exit 0
fi

# ─── Kurulum modu ───
echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}  TUNA - Git Hook Kurulumu${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

# .git/hooks dizini
mkdir -p "$GIT_HOOKS_DIR"

installed=0

for entry in $HOOKS; do
  source="${entry%%:*}"
  target="${entry##*:}"
  source_path="$HOOKS_DIR/$source"
  target_path="$GIT_HOOKS_DIR/$target"

  if [ ! -f "$source_path" ]; then
    echo -e "  ${RED}✗${NC} $source bulunamadı — atlanıyor"
    continue
  fi

  # Mevcut hook varsa yedekle
  if [ -f "$target_path" ]; then
    # Bizim hook'umuz mu kontrol et
    if grep -q "Tuna Budget Management" "$target_path" 2>/dev/null; then
      echo -e "  ${YELLOW}↻${NC} $target güncelleniyor..."
    else
      backup_path="${target_path}.backup.$(date +%Y%m%d%H%M%S)"
      cp "$target_path" "$backup_path"
      echo -e "  ${YELLOW}⚠${NC} Mevcut $target yedeklendi: $(basename "$backup_path")"
    fi
  fi

  # Hook'u kopyala ve çalıştırılabilir yap
  cp "$source_path" "$target_path"
  chmod +x "$target_path"
  echo -e "  ${GREEN}✓${NC} $target kuruldu"
  installed=$((installed + 1))
done

echo ""
echo -e "${CYAN}${BOLD}───────────────────────────────────────────────────${NC}"
echo -e "  ${GREEN}${BOLD}$installed hook başarıyla kuruldu!${NC}"
echo ""
echo -e "  Ek komutlar:"
echo -e "    ${BOLD}bash Hooks/check-project.sh${NC}        — Proje sağlık kontrolü"
echo -e "    ${BOLD}bash Hooks/check-project.sh --quick${NC} — Hızlı kontrol"
echo -e "    ${BOLD}bash Hooks/install-hooks.sh --remove${NC} — Hook'ları kaldır"
echo -e "${CYAN}${BOLD}───────────────────────────────────────────────────${NC}"
echo ""
