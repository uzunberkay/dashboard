# Uyumluluk ve Tutarlılık Kuralları — Tuna Budget Management System

Bu doküman, projede uyumluluk sorunlarını önlemek ve tutarlılığı sağlamak için
uyulması gereken kuralları tanımlar. `check-project.sh` scripti bu kuralların
çoğunu otomatik olarak kontrol eder.

---

## 1. Teknoloji Sürüm Uyumluluğu

### 1.1 Çekirdek Bağımlılıklar
| Paket | Minimum Sürüm | Notlar |
|-------|---------------|--------|
| Node.js | v20+ | v22 önerilir (CI'da v22 kullanılıyor) |
| React | v19 | React 19 özellikleri kullanılıyor |
| Next.js | v16 | App Router zorunlu |
| TypeScript | v5.9+ | Strict mode aktif |
| Prisma | v6+ | PostgreSQL provider |
| Tailwind CSS | v4 | PostCSS entegrasyonu |

### 1.2 Sürüm Güncelleme Kuralları
- **Major** sürüm güncellemeleri (React 19→20, Next 16→17) tek başına yapılmalı
- Güncelleme sonrası tam build kontrolü zorunlu
- `package-lock.json` her zaman commit'e dahil edilmeli
- `npm audit` ile güvenlik kontrolü yapılmalı

---

## 2. Next.js App Router Uyumluluğu

### 2.1 Server vs Client Component
```
KURAL: Varsayılan olarak tüm bileşenler Server Component'tir.
       Client Component gerekiyorsa dosyanın başına "use client" ekleyin.
```

Client Component gerektiren durumlar:
- `useState`, `useEffect`, `useRef` gibi React hook'ları
- Event handler'lar (`onClick`, `onChange`, vb.)
- Browser API'leri (`window`, `document`, `localStorage`)
- `useRouter` (next/navigation)
- Üçüncü parti kütüphaneler (Recharts, dnd-kit, vb.)

### 2.2 Dosya Konvansiyonları
```
src/app/
  layout.tsx     → Zorunlu root layout
  page.tsx       → Route sayfası
  loading.tsx    → Yükleme UI (opsiyonel)
  error.tsx      → Hata UI (opsiyonel, "use client" gerekli)
  not-found.tsx  → 404 sayfası (opsiyonel)

src/app/api/
  route.ts       → API endpoint (GET, POST, PUT, DELETE, PATCH)
```

### 2.3 Import Kuralları
```typescript
// DOĞRU - next/navigation (App Router)
import { useRouter, usePathname } from "next/navigation"

// YANLIŞ - next/router (Pages Router — kullanılmamalı)
import { useRouter } from "next/router"
```

### 2.4 Data Fetching
- Server Component'lerde doğrudan `async/await` kullanın
- Client Component'lerde `fetch` + `useEffect` veya SWR kullanın
- API route'lardan veri çekerken relative path kullanın (`/api/...`)
- `unstable_cache` ile server-side cache kullanabilirsiniz

---

## 3. TypeScript Uyumluluğu

### 3.1 Strict Mode Kuralları
tsconfig.json'da `strict: true` aktif. Bunun anlamı:
- `noImplicitAny` — `any` tipi açıkça belirtilmeli
- `strictNullChecks` — null/undefined kontrolleri zorunlu
- `strictFunctionTypes` — Fonksiyon parametre tipleri katı
- `noImplicitReturns` — Tüm dallar değer döndürmeli

### 3.2 Tip Tanımlama Kuralları
```typescript
// DOĞRU — Arayüz veya tip tanımı kullanın
interface TransactionFormData {
  type: "income" | "expense"
  amount: number
  description?: string
  categoryId: string | null
}

// YANLIŞ — any kullanmayın
const handleSubmit = (data: any) => { ... }
```

### 3.3 Path Alias
```typescript
// DOĞRU — @/ alias kullanın
import { Button } from "@/components/ui/button"

// YANLIŞ — Relative path kullanmayın (derin import'larda)
import { Button } from "../../../../components/ui/button"
```

---

## 4. Prisma ve Veritabanı Uyumluluğu

### 4.1 Şema-Kod Senkronizasyonu
Her şema değişikliğinde şu adımlar takip edilmeli:

```bash
# 1. Şemayı düzenle
#    prisma/schema.prisma

# 2. Migration oluştur
npx prisma migrate dev --name aciklayici-isim

# 3. Client'ı yeniden oluştur
npx prisma generate

# 4. İlgili kodları güncelle
#    - API route'lar
#    - Zod validasyonları (src/lib/validations.ts)
#    - Type tanımları (src/types/)
```

### 4.2 İlişki Tutarlılığı
```prisma
// Her ilişkinin karşı tarafı tanımlanmalı
model User {
  transactions Transaction[]  // ← "one" tarafı
}

model Transaction {
  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)  // ← "many" tarafı
}
```

### 4.3 onDelete Davranışları
| Durum | Davranış | Örnek |
|-------|----------|-------|
| Ana veri silindiğinde alt veri de silinmeli | `Cascade` | User → Transaction |
| Ana veri silindiğinde referans null olmalı | `SetNull` | Category → Transaction |
| Ana veri silinmesi engellenmeli | `Restrict` | Aktif referansı olan veri |

### 4.4 Index Kuralları
- Sık sorgulanan alanlar için `@@index` ekleyin
- Unique constraint gereken yerlerde `@@unique` kullanın
- Composite index'lerde sıralama önemli — en seçici alan önce

---

## 5. API Route Uyumluluğu

### 5.1 Response Formatı
```typescript
// Başarılı yanıt
return NextResponse.json({ data: result })
return NextResponse.json({ data: result }, { status: 201 })

// Hata yanıtı
return NextResponse.json({ error: "Açıklama" }, { status: 400 })
return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
return NextResponse.json({ error: "Bulunamadı" }, { status: 404 })
```

### 5.2 Authentication Pattern
```typescript
// Her korumalı route'da:
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }
  // ... iş mantığı
}
```

### 5.3 Admin Route Koruması
```typescript
// Admin route'larda rol kontrolü:
const user = await prisma.user.findUnique({ where: { id: session.user.id } })
if (!user || !["SUPER_ADMIN", "OPS_ADMIN"].includes(user.role)) {
  return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
}
```

---

## 6. Bileşen Uyumluluğu

### 6.1 shadcn/ui Kullanımı
- UI primitifleri `src/components/ui/` altında
- Yeni shadcn bileşeni eklerken mevcut tema ile uyumlu olmalı
- `class-variance-authority` (cva) ile variant tanımlayın
- `tailwind-merge` (cn) ile class birleştirme yapın

### 6.2 Layout Hiyerarşisi
```
src/app/layout.tsx                    → Root layout (tema, font, providers)
  └── src/app/(main)/layout.tsx       → Ana uygulama layout (sidebar, header)
  └── src/app/(auth)/layout.tsx       → Auth sayfaları layout
  └── src/app/admin/layout.tsx        → Admin panel layout (AdminShell)
```

### 6.3 Form Validasyonu
- Tüm formlar Zod şemaları ile valide edilmeli
- Validasyon şemaları `src/lib/validations.ts` içinde tutulmalı
- Client ve server tarafında aynı şema kullanılmalı

---

## 7. Stil ve Tailwind Uyumluluğu

### 7.1 Tailwind v4 Kuralları
- `@tailwind` direktifleri yerine CSS import kullanın
- `tailwind.config.ts` yerine CSS variables ile konfigürasyon
- PostCSS üzerinden entegrasyon (`@tailwindcss/postcss`)

### 7.2 Responsive Tasarım
```
Breakpoint'ler (Tailwind varsayılan):
  sm: 640px   → Telefon (landscape)
  md: 768px   → Tablet
  lg: 1024px  → Laptop
  xl: 1280px  → Desktop
  2xl: 1536px → Geniş ekran
```

### 7.3 Tema Uyumluluğu
- CSS custom properties (variables) kullanarak tema desteği
- Dark mode uyumlu renkler kullanın
- Hardcoded renk değerleri yerine tema değişkenleri tercih edin

---

## 8. Bilinen Kısıtlamalar ve Dikkat Edilmesi Gerekenler

### 8.1 Rate Limiting
- Mevcut implementasyon in-memory (`src/lib/rate-limit.ts`)
- **Production'da Redis/KV ile değiştirilmeli** (release blocker)
- Çoklu instance'da çalışmaz

### 8.2 Session Yönetimi
- NextAuth.js v4 credentials strategy kullanılıyor
- `sessionVersion` ile session invalidation destekleniyor
- JWT token tabanlı — sunucu tarafında session store yok

### 8.3 Dosya Yükleme
- Şu an dosya yükleme özelliği yok
- Eklenecekse external storage (S3, Cloudinary) tercih edilmeli
- Public dizinine büyük dosya eklenmemeli

---

## 9. Uyumluluk Kontrol Listesi (Yeni Özellik Ekleme)

Yeni bir özellik eklerken bu kontrol listesini takip edin:

- [ ] TypeScript tipleri tanımlandı
- [ ] Zod validasyon şemaları oluşturuldu
- [ ] API route'lar authentication ile korunuyor
- [ ] Admin route'lar rol kontrolü yapıyor
- [ ] Prisma şema değişiklikleri migration ile uygulandı
- [ ] Client/Server component ayrımı doğru
- [ ] Error boundary / hata yönetimi eklendi
- [ ] Responsive tasarım uygulandı
- [ ] `npm run lint` hatasız geçiyor
- [ ] `npx tsc --noEmit` hatasız geçiyor
- [ ] `npm run build` başarılı
- [ ] .env.example güncellendi (yeni env var varsa)
