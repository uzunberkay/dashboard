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
  LAST_TAG=$(git log --oneline -20 2>/dev/null | grep -oE 'V[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "V1.0.0")
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

# ─── Otomatik özet oluşturma ──────────────────────────────────────────────
generate_summary() {
  local changes="$1"
  local summary_parts=()

  # Değişen dosya gruplarını analiz et
  local new_files=$(echo "$changes" | grep -E '^\?\?|^A ' | wc -l)
  local modified_files=$(echo "$changes" | grep -E '^ M|^M |^MM' | wc -l)
  local deleted_files=$(echo "$changes" | grep -E '^ D|^D ' | wc -l)

  # Diff'ten değişen alanları tespit et
  local diff_stat=$(git diff --cached --stat 2>/dev/null || git diff --stat 2>/dev/null || echo "")
  local diff_files=$(echo "$changes" | awk '{print $2}')

  # ── Kategori tespiti ──
  local has_components=false has_api=false has_lib=false has_prisma=false
  local has_hooks=false has_styles=false has_config=false has_auth=false
  local has_admin=false has_pages=false has_docs=false has_ci=false
  local has_transactions=false has_budget=false has_dashboard=false
  local has_categories=false has_ui=false has_types=false

  while IFS= read -r file; do
    case "$file" in
      src/components/admin/*|src/app/admin/*) has_admin=true ;;
      src/components/auth/*|src/app/*/login/*|src/app/*/register/*|src/lib/auth*) has_auth=true ;;
      src/components/transactions/*|src/app/*/transactions/*) has_transactions=true ;;
      src/components/budget/*|src/app/*/budgets/*) has_budget=true ;;
      src/components/dashboard/*) has_dashboard=true ;;
      src/components/categories/*|src/app/*/categories/*) has_categories=true ;;
      src/components/ui/*) has_ui=true ;;
      src/components/*) has_components=true ;;
      src/app/api/*) has_api=true ;;
      src/lib/*) has_lib=true ;;
      src/types/*) has_types=true ;;
      src/app/*/page.tsx|src/app/*/layout.tsx) has_pages=true ;;
      prisma/*) has_prisma=true ;;
      Hooks/*) has_hooks=true ;;
      *.css|*.scss|tailwind*) has_styles=true ;;
      package.json|tsconfig.json|next.config*|eslint*|.env*) has_config=true ;;
      docs/*|*.md) has_docs=true ;;
      .github/*) has_ci=true ;;
    esac
  done <<< "$diff_files"

  # ── Özet parçalarını oluştur ──
  if [ "$has_admin" = true ]; then summary_parts+=("admin paneli güncellendi"); fi
  if [ "$has_auth" = true ]; then summary_parts+=("auth sistemi düzenlendi"); fi
  if [ "$has_transactions" = true ]; then summary_parts+=("işlem yönetimi güncellendi"); fi
  if [ "$has_budget" = true ]; then summary_parts+=("bütçe modülü düzenlendi"); fi
  if [ "$has_dashboard" = true ]; then summary_parts+=("dashboard güncellendi"); fi
  if [ "$has_categories" = true ]; then summary_parts+=("kategori yönetimi düzenlendi"); fi
  if [ "$has_api" = true ] && [ "$has_admin" = false ]; then summary_parts+=("API endpoint'leri güncellendi"); fi
  if [ "$has_prisma" = true ]; then summary_parts+=("veritabanı şeması güncellendi"); fi
  if [ "$has_hooks" = true ]; then summary_parts+=("hook scriptleri eklendi"); fi
  if [ "$has_ui" = true ]; then summary_parts+=("UI bileşenleri güncellendi"); fi
  if [ "$has_components" = true ] && [ ${#summary_parts[@]} -eq 0 ]; then summary_parts+=("bileşenler güncellendi"); fi
  if [ "$has_lib" = true ] && [ ${#summary_parts[@]} -eq 0 ]; then summary_parts+=("yardımcı kütüphaneler düzenlendi"); fi
  if [ "$has_styles" = true ]; then summary_parts+=("stil düzenlemeleri yapıldı"); fi
  if [ "$has_config" = true ]; then summary_parts+=("proje konfigürasyonu güncellendi"); fi
  if [ "$has_ci" = true ]; then summary_parts+=("CI/CD pipeline güncellendi"); fi
  if [ "$has_docs" = true ]; then summary_parts+=("dokümantasyon güncellendi"); fi
  if [ "$has_pages" = true ] && [ ${#summary_parts[@]} -eq 0 ]; then summary_parts+=("sayfa düzenlemeleri yapıldı"); fi
  if [ "$has_types" = true ] && [ ${#summary_parts[@]} -eq 0 ]; then summary_parts+=("tip tanımları güncellendi"); fi

  # Hiçbir kategori eşleşmediyse genel özet
  if [ ${#summary_parts[@]} -eq 0 ]; then
    if [ "$new_files" -gt 0 ] && [ "$modified_files" -gt 0 ]; then
      summary_parts+=("yeni dosyalar eklendi ve mevcut dosyalar güncellendi")
    elif [ "$new_files" -gt 0 ]; then
      summary_parts+=("yeni dosyalar eklendi")
    elif [ "$deleted_files" -gt 0 ]; then
      summary_parts+=("dosya temizliği yapıldı")
    else
      summary_parts+=("küçük düzenlemeler yapıldı")
    fi
  fi

  # Maksimum 3 parça al ve birleştir
  local max=3
  local count=${#summary_parts[@]}
  if [ "$count" -gt "$max" ]; then
    count=$max
  fi

  local result=""
  for ((i=0; i<count; i++)); do
    if [ $i -gt 0 ]; then
      result+=", "
    fi
    result+="${summary_parts[$i]}"
  done

  echo "$result"
}

SUMMARY=$(generate_summary "$CHANGES")

# Commit mesajı
if [ -n "$CUSTOM_MSG" ]; then
  COMMIT_MSG="$CUSTOM_MSG"
else
  COMMIT_MSG="${NEW_VERSION} — ${SUMMARY}"
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
