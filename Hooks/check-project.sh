#!/usr/bin/env bash
# =============================================================================
# PROJE SAĞLIK KONTROLÜ - Tuna Budget Management System
# =============================================================================
# Projenin genel durumunu, uyumluluk sorunlarını ve potansiyel problemleri
# tespit eden kapsamlı kontrol scripti.
#
# Kullanım:
#   bash Hooks/check-project.sh          # Tam kontrol
#   bash Hooks/check-project.sh --quick  # Hızlı kontrol (build hariç)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

QUICK_MODE=false
if [[ "${1:-}" == "--quick" ]]; then
  QUICK_MODE=true
fi

passed=0
failed=0
warnings=0

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

check_info() {
  echo -e "  ${CYAN}ℹ${NC} $1"
}

echo ""
echo -e "${MAGENTA}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}${BOLD}║          TUNA - Proje Sağlık Kontrolü                    ║${NC}"
echo -e "${MAGENTA}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$QUICK_MODE" = true ]; then
  echo -e "  ${YELLOW}Mod: Hızlı kontrol (build adımı atlanacak)${NC}"
  echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 1: ORTAM VE BAĞIMLILIKLAR
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}━━━ ORTAM VE BAĞIMLILIKLAR ━━━${NC}"

# Node.js sürümü
NODE_VERSION=$(node -v 2>/dev/null || echo "yok")
if [[ "$NODE_VERSION" == "yok" ]]; then
  check_fail "Node.js kurulu değil"
else
  NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 20 ]; then
    check_pass "Node.js sürümü: $NODE_VERSION"
  else
    check_warn "Node.js $NODE_VERSION — v20+ önerilir"
  fi
fi

# npm sürümü
NPM_VERSION=$(npm -v 2>/dev/null || echo "yok")
if [[ "$NPM_VERSION" != "yok" ]]; then
  check_pass "npm sürümü: v$NPM_VERSION"
else
  check_fail "npm kurulu değil"
fi

# node_modules
if [ -d "node_modules" ]; then
  check_pass "node_modules mevcut"
else
  check_fail "node_modules bulunamadı — npm install çalıştırın"
fi

# package-lock.json
if [ -f "package-lock.json" ]; then
  check_pass "package-lock.json mevcut"
else
  check_warn "package-lock.json bulunamadı — npm install ile oluşturun"
fi

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 2: ENVIRONMENT DEĞİŞKENLERİ
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}━━━ ENVIRONMENT DEĞİŞKENLERİ ━━━${NC}"

if [ -f ".env" ]; then
  check_pass ".env dosyası mevcut"

  # Gerekli değişkenler
  REQUIRED_VARS=("DATABASE_URL" "DIRECT_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "APP_ENV")
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env 2>/dev/null; then
      VALUE=$(grep "^${var}=" .env | cut -d= -f2-)
      if [ -z "$VALUE" ]; then
        check_fail "$var tanımlı ama değeri boş"
      else
        check_pass "$var tanımlı"
      fi
    else
      check_fail "$var eksik — .env.example dosyasına bakın"
    fi
  done

  # APP_ENV değeri kontrolü
  APP_ENV_VALUE=$(grep "^APP_ENV=" .env 2>/dev/null | cut -d= -f2- || echo "")
  if [[ "$APP_ENV_VALUE" == "production" ]]; then
    check_warn "APP_ENV=production — yerel geliştirme için 'development' önerilir"
  fi

else
  check_fail ".env dosyası bulunamadı — .env.example'dan kopyalayın"
fi

if [ -f ".env.example" ]; then
  check_pass ".env.example şablon dosyası mevcut"
else
  check_warn ".env.example bulunamadı"
fi

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 3: VERİTABANI VE PRISMA
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}━━━ VERİTABANI VE PRISMA ━━━${NC}"

# Prisma şema
if [ -f "prisma/schema.prisma" ]; then
  check_pass "Prisma şema dosyası mevcut"

  # Prisma validate
  if npx prisma validate > /dev/null 2>&1; then
    check_pass "Prisma şema geçerli"
  else
    check_fail "Prisma şema doğrulama hatası — npx prisma validate çalıştırın"
  fi

  # Prisma client oluşturulmuş mu
  if [ -d "node_modules/.prisma/client" ]; then
    check_pass "Prisma Client oluşturulmuş"
  else
    check_warn "Prisma Client bulunamadı — npx prisma generate çalıştırın"
  fi
else
  check_fail "prisma/schema.prisma bulunamadı"
fi

# Migration durumu
if [ -d "prisma/migrations" ]; then
  MIGRATION_COUNT=$(ls -d prisma/migrations/*/  2>/dev/null | wc -l || echo 0)
  check_pass "Prisma migration'lar mevcut ($MIGRATION_COUNT migration)"
else
  check_warn "Prisma migrations klasörü bulunamadı"
fi

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 4: KOD KALİTESİ
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}━━━ KOD KALİTESİ ━━━${NC}"

# ESLint
if npm run lint > /dev/null 2>&1; then
  check_pass "ESLint — hata yok"
else
  check_fail "ESLint hataları mevcut — npm run lint çalıştırın"
fi

# TypeScript
if npx tsc --noEmit > /dev/null 2>&1; then
  check_pass "TypeScript — tip hatası yok"
else
  check_fail "TypeScript tip hataları mevcut — npx tsc --noEmit çalıştırın"
fi

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 5: GÜVENLİK KONTROLLERİ
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}━━━ GÜVENLİK KONTROLLERİ ━━━${NC}"

# .gitignore kontrolü
if [ -f ".gitignore" ]; then
  MUST_IGNORE=(".env" "node_modules" ".next")
  for item in "${MUST_IGNORE[@]}"; do
    if grep -q "^${item}" .gitignore 2>/dev/null; then
      check_pass ".gitignore: $item dahil"
    else
      check_fail ".gitignore: $item eksik — eklenmeli!"
    fi
  done
else
  check_fail ".gitignore dosyası bulunamadı"
fi

# Hardcoded secret taraması (src/ altında)
echo -e "  ${CYAN}ℹ${NC} Kaynak kodda hardcoded secret taraması..."
SECRET_PATTERNS='(password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["\x27][^"\x27]{8,}'
if grep -rEi "$SECRET_PATTERNS" src/ --include="*.ts" --include="*.tsx" \
   --exclude-dir=node_modules 2>/dev/null | grep -v "process\.env" | grep -v "\.example" | head -5 | grep -q .; then
  check_warn "Kaynak kodda potansiyel hardcoded secret bulundu — kontrol edin"
else
  check_pass "Hardcoded secret bulunamadı"
fi

# npm audit
echo -e "  ${CYAN}ℹ${NC} npm güvenlik denetimi çalışıyor..."
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || echo '{}')
AUDIT_HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | head -1 | cut -d: -f2 || echo 0)
AUDIT_CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | head -1 | cut -d: -f2 || echo 0)

if [ "${AUDIT_CRITICAL:-0}" -gt 0 ]; then
  check_fail "npm audit: $AUDIT_CRITICAL kritik güvenlik açığı"
elif [ "${AUDIT_HIGH:-0}" -gt 0 ]; then
  check_warn "npm audit: $AUDIT_HIGH yüksek seviye güvenlik açığı"
else
  check_pass "npm audit — kritik güvenlik açığı yok"
fi

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 6: DOSYA YAPISI VE UYUMLULUK
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}━━━ DOSYA YAPISI VE UYUMLULUK ━━━${NC}"

# Gerekli dosyalar
REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "next.config.js"
  "eslint.config.mjs"
  "prisma/schema.prisma"
  ".gitignore"
  ".env.example"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$file mevcut"
  else
    check_fail "$file eksik"
  fi
done

# Gerekli dizinler
REQUIRED_DIRS=("src/app" "src/components" "src/lib" "prisma/migrations" "public")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    check_pass "$dir/ dizini mevcut"
  else
    check_warn "$dir/ dizini eksik"
  fi
done

# Next.js App Router yapı kontrolü
if [ -f "src/app/layout.tsx" ]; then
  check_pass "Root layout (src/app/layout.tsx) mevcut"
else
  check_fail "Root layout eksik — src/app/layout.tsx gerekli"
fi

# API route kontrolü
API_ROUTE_COUNT=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l || echo 0)
check_info "API route sayısı: $API_ROUTE_COUNT"

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 7: GIT DURUMU
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}━━━ GIT DURUMU ━━━${NC}"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
check_info "Mevcut branch: $CURRENT_BRANCH"

# Commit edilmemiş değişiklikler
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l || echo 0)
if [ "$UNCOMMITTED" -gt 0 ]; then
  check_warn "$UNCOMMITTED commit edilmemiş değişiklik var"
else
  check_pass "Çalışma dizini temiz"
fi

# Son commit
LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "commit yok")
check_info "Son commit: $LAST_COMMIT"

# ═══════════════════════════════════════════════════════════════════════════
# BÖLÜM 8: BUILD KONTROLÜ (sadece tam modda)
# ═══════════════════════════════════════════════════════════════════════════
if [ "$QUICK_MODE" = false ]; then
  echo ""
  echo -e "${BOLD}━━━ BUILD KONTROLÜ ━━━${NC}"
  echo -e "  ${CYAN}ℹ${NC} Next.js build çalışıyor (bu biraz zaman alabilir)..."

  if npm run build > /dev/null 2>&1; then
    check_pass "Next.js build başarılı"
  else
    check_fail "Next.js build başarısız — npm run build çalıştırın"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# SONUÇ
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${MAGENTA}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
if [ "$failed" -gt 0 ]; then
  echo -e "${MAGENTA}${BOLD}║${NC}  ${RED}${BOLD}DURUM: SORUNLAR TESPİT EDİLDİ${NC}                            ${MAGENTA}${BOLD}║${NC}"
elif [ "$warnings" -gt 0 ]; then
  echo -e "${MAGENTA}${BOLD}║${NC}  ${YELLOW}${BOLD}DURUM: UYARILAR MEVCUT${NC}                                   ${MAGENTA}${BOLD}║${NC}"
else
  echo -e "${MAGENTA}${BOLD}║${NC}  ${GREEN}${BOLD}DURUM: PROJE SAĞLIKLI${NC}                                    ${MAGENTA}${BOLD}║${NC}"
fi
echo -e "${MAGENTA}${BOLD}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${MAGENTA}${BOLD}║${NC}  ${GREEN}Geçen: $passed${NC}  |  ${RED}Başarısız: $failed${NC}  |  ${YELLOW}Uyarı: $warnings${NC}              ${MAGENTA}${BOLD}║${NC}"
echo -e "${MAGENTA}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$failed" -gt 0 ]; then
  exit 1
fi
exit 0
