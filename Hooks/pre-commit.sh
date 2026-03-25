#!/usr/bin/env bash
# =============================================================================
# PRE-COMMIT HOOK - Tuna Budget Management System
# =============================================================================
# Commit öncesi otomatik kalite kontrolleri
# Kurulum: ./Hooks/install-hooks.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

passed=0
failed=0
warnings=0

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}${BOLD}  TUNA - Pre-Commit Kontrolleri${NC}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════${NC}"
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

print_header

# ─────────────────────────────────────────────────────────────────────────────
# 1. Hassas dosya kontrolü (.env, credentials, secrets)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Hassas dosya kontrolü${NC}"

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)

SENSITIVE_PATTERNS=(".env" ".env.local" ".env.production" "credentials" "secret" ".pem" ".key" "id_rsa")
sensitive_found=false

for file in $STAGED_FILES; do
  for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if [[ "$file" == *"$pattern"* && "$file" != ".env.example" && "$file" != *".sh" && "$file" != *"rules"* ]]; then
      check_fail "Hassas dosya tespit edildi: $file"
      sensitive_found=true
    fi
  done
done

if [ "$sensitive_found" = false ]; then
  check_pass "Hassas dosya bulunamadı"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. TypeScript / TSX dosyalarında console.log kontrolü
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/5] console.log kontrolü${NC}"

STAGED_TS_FILES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx)$' || true)

console_found=false
if [ -n "$STAGED_TS_FILES" ]; then
  for file in $STAGED_TS_FILES; do
    if git diff --cached "$file" 2>/dev/null | grep -q '^\+.*console\.log'; then
      check_warn "console.log bulundu: $file"
      console_found=true
    fi
  done
fi

if [ "$console_found" = false ]; then
  check_pass "Gereksiz console.log bulunamadı"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. TODO/FIXME/HACK kontrolü (yeni eklenenler)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[3/5] TODO/FIXME/HACK kontrolü${NC}"

todo_found=false
if [ -n "$STAGED_TS_FILES" ]; then
  for file in $STAGED_TS_FILES; do
    if git diff --cached "$file" 2>/dev/null | grep -qE '^\+.*(TODO|FIXME|HACK|XXX):'; then
      check_warn "TODO/FIXME/HACK bulundu: $file"
      todo_found=true
    fi
  done
fi

if [ "$todo_found" = false ]; then
  check_pass "Yeni TODO/FIXME/HACK bulunamadı"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Büyük dosya kontrolü (>500KB)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[4/5] Büyük dosya kontrolü${NC}"

large_found=false
for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    file_size=$(wc -c < "$file" 2>/dev/null || echo 0)
    if [ "$file_size" -gt 512000 ]; then
      check_fail "Büyük dosya (>500KB): $file ($(( file_size / 1024 ))KB)"
      large_found=true
    fi
  fi
done

if [ "$large_found" = false ]; then
  check_pass "Büyük dosya bulunamadı"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Merge conflict marker kontrolü
# ─────────────────────────────────────────────────────────────────────────────
echo -e "${BOLD}[5/5] Merge conflict marker kontrolü${NC}"

conflict_found=false
for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    if grep -qE '^(<<<<<<<|=======|>>>>>>>)' "$file" 2>/dev/null; then
      check_fail "Merge conflict marker bulundu: $file"
      conflict_found=true
    fi
  fi
done

if [ "$conflict_found" = false ]; then
  check_pass "Merge conflict marker bulunamadı"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Sonuç
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}───────────────────────────────────────────────────${NC}"
echo -e "  Sonuç: ${GREEN}$passed geçti${NC} | ${RED}$failed başarısız${NC} | ${YELLOW}$warnings uyarı${NC}"
echo -e "${CYAN}${BOLD}───────────────────────────────────────────────────${NC}"

if [ "$failed" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}  Commit engellendi! Yukarıdaki hataları düzeltin.${NC}"
  echo -e "  ${YELLOW}Atlamak için: git commit --no-verify${NC}"
  echo ""
  exit 1
fi

echo ""
exit 0
