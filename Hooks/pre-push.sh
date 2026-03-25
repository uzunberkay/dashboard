#!/usr/bin/env bash
# =============================================================================
# PRE-PUSH HOOK - Tuna Budget Management System
# =============================================================================
# GitHub'a push öncesi kapsamlı kalite kontrolleri
# CI pipeline'daki adımları yerel ortamda çalıştırır
# Kurulum: ./Hooks/install-hooks.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

passed=0
failed=0
warnings=0
start_time=$(date +%s)

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}${BOLD}  TUNA - Pre-Push Kontrolleri (GitHub'a yüklemeden önce)${NC}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

check_pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  passed=$((passed + 1))
}

check_fail() {
  echo -e "  ${RED}✗${NC} $1"
  failed=$((failed + 1))
}

check_warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  warnings=$((warnings + 1))
}

run_step() {
  local step_name="$1"
  local step_cmd="$2"
  local step_num="$3"
  local total="$4"

  echo ""
  echo -e "${BOLD}[$step_num/$total] $step_name${NC}"

  local step_start=$(date +%s)

  if eval "$step_cmd" > /tmp/tuna-hook-output.log 2>&1; then
    local step_end=$(date +%s)
    local step_duration=$((step_end - step_start))
    check_pass "$step_name (${step_duration}s)"
    return 0
  else
    local step_end=$(date +%s)
    local step_duration=$((step_end - step_start))
    check_fail "$step_name (${step_duration}s)"
    echo ""
    echo -e "  ${RED}Hata çıktısı:${NC}"
    tail -20 /tmp/tuna-hook-output.log | sed 's/^/    /'
    echo ""
    return 1
  fi
}

print_header

# Push edilen branch bilgisi
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo -e "  Branch: ${BOLD}$CURRENT_BRANCH${NC}"

# Protected branch uyarısı
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  echo -e "  ${YELLOW}⚠ Ana branch'e direkt push yapıyorsunuz!${NC}"
  echo ""
fi

TOTAL_STEPS=6

# ─────────────────────────────────────────────────────────────────────────────
# 1. Node modules kontrolü
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[1/$TOTAL_STEPS] Bağımlılık kontrolü${NC}"

if [ ! -d "node_modules" ]; then
  check_fail "node_modules bulunamadı — npm install çalıştırın"
  echo -e "${RED}${BOLD}  Push engellendi! Önce 'npm install' çalıştırın.${NC}"
  exit 1
fi

# package-lock.json ve package.json senkronizasyon kontrolü
if [ -f "package-lock.json" ]; then
  PKG_MODIFIED=$(git log -1 --format="%H" -- package.json 2>/dev/null || echo "none")
  LOCK_MODIFIED=$(git log -1 --format="%H" -- package-lock.json 2>/dev/null || echo "none")

  if [ "$PKG_MODIFIED" != "$LOCK_MODIFIED" ] && [ "$PKG_MODIFIED" != "none" ] && [ "$LOCK_MODIFIED" != "none" ]; then
    check_warn "package.json ve package-lock.json farklı commit'lerde değişmiş — npm install kontrol edin"
  else
    check_pass "Bağımlılıklar senkron"
  fi
else
  check_warn "package-lock.json bulunamadı"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Environment doğrulama
# ─────────────────────────────────────────────────────────────────────────────
run_step "Environment değişken doğrulaması" "npm run env:check" 2 $TOTAL_STEPS || true

# ─────────────────────────────────────────────────────────────────────────────
# 3. Prisma şema doğrulama
# ─────────────────────────────────────────────────────────────────────────────
run_step "Prisma şema doğrulaması" "npx prisma validate" 3 $TOTAL_STEPS || true

# ─────────────────────────────────────────────────────────────────────────────
# 4. ESLint
# ─────────────────────────────────────────────────────────────────────────────
run_step "ESLint kontrolü" "npm run lint" 4 $TOTAL_STEPS || true

# ─────────────────────────────────────────────────────────────────────────────
# 5. TypeScript type check
# ─────────────────────────────────────────────────────────────────────────────
run_step "TypeScript tip kontrolü" "npx tsc --noEmit" 5 $TOTAL_STEPS || true

# ─────────────────────────────────────────────────────────────────────────────
# 6. Next.js build
# ─────────────────────────────────────────────────────────────────────────────
run_step "Next.js build kontrolü" "npm run build" 6 $TOTAL_STEPS || true

# ─────────────────────────────────────────────────────────────────────────────
# Sonuç
# ─────────────────────────────────────────────────────────────────────────────
end_time=$(date +%s)
total_duration=$((end_time - start_time))

echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Sonuç: ${GREEN}$passed geçti${NC} | ${RED}$failed başarısız${NC} | ${YELLOW}$warnings uyarı${NC}"
echo -e "  Toplam süre: ${BOLD}${total_duration}s${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"

if [ "$failed" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}  Push engellendi! Yukarıdaki hataları düzeltin.${NC}"
  echo -e "  ${YELLOW}Atlamak için: git push --no-verify${NC}"
  echo ""
  rm -f /tmp/tuna-hook-output.log
  exit 1
fi

if [ "$warnings" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}  Uyarılar mevcut — push devam ediyor ancak düzeltmeniz önerilir.${NC}"
fi

echo ""
rm -f /tmp/tuna-hook-output.log
exit 0
