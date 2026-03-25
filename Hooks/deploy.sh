#!/usr/bin/env bash
# =============================================================================
# DEPLOY SCRIPT - Tuna Budget Management System
# =============================================================================
# Tek komutla: stage → commit → push
#
# Kullanım:
#   bash Hooks/deploy.sh                    # Otomatik versiyon (V1.x.x)
#   bash Hooks/deploy.sh "commit mesajı"    # Özel mesaj
#   bash Hooks/deploy.sh --bump major       # Major versiyon artır (V2.0.0)
#   bash Hooks/deploy.sh --bump minor       # Minor versiyon artır (V1.2.0)
#   bash Hooks/deploy.sh --bump patch       # Patch versiyon artır (V1.1.6)
#   bash Hooks/deploy.sh --dry-run          # Sadece göster, çalıştırma
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

DRY_RUN=false
BUMP_TYPE="patch"
CUSTOM_MSG=""

# ─── Argüman parsing ─────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --bump)
      BUMP_TYPE="$2"
      shift 2
      ;;
    *)
      CUSTOM_MSG="$1"
      shift
      ;;
  esac
done

# ─── Proje kökünde olduğumuzu doğrula ────────────────────────────────────
if [ ! -d ".git" ]; then
  echo -e "${RED}Hata: Bu script proje kök dizininde çalıştırılmalıdır.${NC}"
  exit 1
fi

echo ""
echo -e "${MAGENTA}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}${BOLD}║              TUNA - Otomatik Deploy                      ║${NC}"
echo -e "${MAGENTA}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Değişiklik kontrolü ─────────────────────────────────────────────────
CHANGES=$(git status --porcelain 2>/dev/null)

if [ -z "$CHANGES" ]; then
  echo -e "  ${YELLOW}Değişiklik yok — commit/push edilecek bir şey bulunamadı.${NC}"
  echo ""
  exit 0
fi

CHANGED_COUNT=$(echo "$CHANGES" | wc -l)
echo -e "  ${CYAN}ℹ${NC} ${BOLD}$CHANGED_COUNT${NC} değişiklik tespit edildi:"
echo ""
echo "$CHANGES" | head -20 | while read -r line; do
  STATUS="${line:0:2}"
  FILE="${line:3}"
  case "$STATUS" in
    "M "| " M"|"MM") echo -e "    ${YELLOW}~${NC} $FILE (değiştirildi)" ;;
    "A "| "??"     ) echo -e "    ${GREEN}+${NC} $FILE (yeni)" ;;
    "D "| " D"     ) echo -e "    ${RED}-${NC} $FILE (silindi)" ;;
    "R "           ) echo -e "    ${CYAN}→${NC} $FILE (yeniden adlandırıldı)" ;;
    *              ) echo -e "    ${NC}?${NC} $FILE" ;;
  esac
done

if [ "$CHANGED_COUNT" -gt 20 ]; then
  echo -e "    ${YELLOW}... ve $((CHANGED_COUNT - 20)) dosya daha${NC}"
fi

# ─── Versiyon hesaplama ───────────────────────────────────────────────────
echo ""

# Son versiyon tag'ini bul
LAST_TAG=$(git tag -l "V*" --sort=-version:refname 2>/dev/null | head -1 || echo "")

if [ -z "$LAST_TAG" ]; then
  # Tag yoksa commit mesajlarından bul
  LAST_TAG=$(git log --oneline -20 2>/dev/null | grep -oP 'V\d+\.\d+\.\d+' | head -1 || echo "V1.0.0")
fi

# Versiyon parçala
VERSION_CLEAN="${LAST_TAG#V}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION_CLEAN"
MAJOR=${MAJOR:-1}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}

# Bump
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="V${MAJOR}.${MINOR}.${PATCH}"

# Commit mesajı
if [ -n "$CUSTOM_MSG" ]; then
  COMMIT_MSG="$CUSTOM_MSG"
else
  COMMIT_MSG="$NEW_VERSION"
fi

echo -e "  ${CYAN}ℹ${NC} Son versiyon:  ${BOLD}$LAST_TAG${NC}"
echo -e "  ${CYAN}ℹ${NC} Yeni versiyon: ${BOLD}${GREEN}$NEW_VERSION${NC}"
echo -e "  ${CYAN}ℹ${NC} Commit mesajı: ${BOLD}$COMMIT_MSG${NC}"
echo -e "  ${CYAN}ℹ${NC} Branch:        ${BOLD}$(git rev-parse --abbrev-ref HEAD)${NC}"

# ─── Dry run kontrolü ────────────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "  ${YELLOW}${BOLD}[DRY RUN] Gerçek işlem yapılmadı.${NC}"
  echo -e "  Çalıştırmak için: ${BOLD}bash Hooks/deploy.sh${NC}"
  echo ""
  exit 0
fi

# ─── Git işlemleri ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Git İşlemleri ━━━${NC}"

# 1. Stage
echo -e "  ${CYAN}→${NC} Dosyalar stage ediliyor..."
git add -A
echo -e "  ${GREEN}✓${NC} Stage tamamlandı"

# 2. Commit
echo -e "  ${CYAN}→${NC} Commit oluşturuluyor..."
if git commit -m "$COMMIT_MSG" > /tmp/tuna-deploy-commit.log 2>&1; then
  COMMIT_HASH=$(git rev-parse --short HEAD)
  echo -e "  ${GREEN}✓${NC} Commit oluşturuldu: ${BOLD}$COMMIT_HASH${NC} — $COMMIT_MSG"
else
  # Pre-commit hook başarısız olmuş olabilir
  echo -e "  ${RED}✗${NC} Commit başarısız!"
  echo ""
  cat /tmp/tuna-deploy-commit.log | tail -20 | sed 's/^/    /'
  echo ""
  rm -f /tmp/tuna-deploy-commit.log
  exit 1
fi

# 3. Push
echo -e "  ${CYAN}→${NC} GitHub'a push ediliyor..."
if git push 2>&1 | tee /tmp/tuna-deploy-push.log | grep -q "error\|fatal\|rejected"; then
  echo -e "  ${RED}✗${NC} Push başarısız!"
  echo ""
  cat /tmp/tuna-deploy-push.log | tail -20 | sed 's/^/    /'
  echo ""
  rm -f /tmp/tuna-deploy-commit.log /tmp/tuna-deploy-push.log
  exit 1
else
  echo -e "  ${GREEN}✓${NC} Push tamamlandı"
fi

rm -f /tmp/tuna-deploy-commit.log /tmp/tuna-deploy-push.log

# ─── Sonuç ────────────────────────────────────────────────────────────────
echo ""
echo -e "${MAGENTA}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}${BOLD}║${NC}  ${GREEN}${BOLD}Deploy tamamlandı!${NC}                                      ${MAGENTA}${BOLD}║${NC}"
echo -e "${MAGENTA}${BOLD}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}${BOLD}║${NC}  Versiyon: ${BOLD}$NEW_VERSION${NC}                                       ${MAGENTA}${BOLD}║${NC}"
echo -e "${MAGENTA}${BOLD}║${NC}  Commit:   ${BOLD}$COMMIT_HASH${NC}                                         ${MAGENTA}${BOLD}║${NC}"
echo -e "${MAGENTA}${BOLD}║${NC}  Branch:   ${BOLD}$(git rev-parse --abbrev-ref HEAD)${NC}                                        ${MAGENTA}${BOLD}║${NC}"
echo -e "${MAGENTA}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
