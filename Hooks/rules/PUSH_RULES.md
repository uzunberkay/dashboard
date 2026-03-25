# GitHub Push Kuralları — Tuna Budget Management System

Bu doküman, GitHub'a kod yüklemeden önce uyulması gereken kuralları tanımlar.
Hook scriptleri bu kuralları otomatik olarak uygular.

---

## 1. Zorunlu Kontroller (Push Engelleyici)

Bu kontroller başarısız olursa push engellenir:

### 1.1 ESLint Kontrolü
- `npm run lint` hatasız geçmeli
- Kural: `eslint-config-next/core-web-vitals` + `typescript` kuralları uygulanır
- Unused variables `warn` seviyesinde (`_` prefix ile atlanabilir)

### 1.2 TypeScript Tip Kontrolü
- `npx tsc --noEmit` hatasız geçmeli
- Strict mode aktif — `any` kullanımından kaçının
- Tüm bileşenler ve API route'lar tip güvenli olmalı

### 1.3 Next.js Build
- `npm run build` başarılı olmalı
- Server/Client component sınırları doğru olmalı
- Dynamic import'lar çalışır durumda olmalı

### 1.4 Prisma Şema Doğrulaması
- `npx prisma validate` hatasız geçmeli
- Şema değişiklikleri migration ile desteklenmeli
- İlişki tanımları tutarlı olmalı

### 1.5 Environment Doğrulaması
- `npm run env:check` (scripts/validate-env.mjs) geçmeli
- Gerekli ortam değişkenleri tanımlı olmalı

---

## 2. Commit Kontrolleri (Commit Engelleyici)

### 2.1 Hassas Dosya Kontrolü
Aşağıdaki dosyalar **kesinlikle** commit edilmemeli:
- `.env`, `.env.local`, `.env.production`
- `*.pem`, `*.key`, `id_rsa`
- `credentials.*`, `*secret*` (dosya adında)

İzin verilen: `.env.example`

### 2.2 Merge Conflict Marker
- `<<<<<<<`, `=======`, `>>>>>>>` işaretleri kaynak kodda bulunmamalı

### 2.3 Büyük Dosya Kontrolü
- 500KB üstü dosyalar commit edilmemeli
- Medya dosyaları CDN veya external storage'da tutulmalı

---

## 3. Uyarı Seviyesinde Kontroller (Push Engellemez)

### 3.1 console.log Kullanımı
- Production'a gidecek kodda `console.log` bırakılmamalı
- Hata ayıklama için `console.error` veya `console.warn` tercih edin

### 3.2 TODO/FIXME/HACK Yorumları
- Yeni eklenen TODO'lar uyarı üretir
- Uzun süre açık kalan TODO'lar issue'ya dönüştürülmeli

### 3.3 Bağımlılık Senkronizasyonu
- `package.json` ve `package-lock.json` aynı commit'te değişmeli
- `npm ci` ile clean install yapılabilir olmalı

---

## 4. Branch Kuralları

### 4.1 Ana Branch Koruması
- `main` / `master` branch'e direkt push **uyarı** üretir
- Mümkünse Pull Request üzerinden merge yapılmalı

### 4.2 Branch İsimlendirme
Önerilen format:
```
feature/kisa-aciklama
fix/hata-aciklamasi
refactor/alan-adi
hotfix/acil-duzeltme
```

### 4.3 Commit Mesajları
Önerilen format:
```
<tip>: <kısa açıklama>

Örnekler:
feat: bütçe limit uyarı sistemi eklendi
fix: kategori silme sorunu düzeltildi
refactor: dashboard veri çekme optimizasyonu
chore: bağımlılıklar güncellendi
```

---

## 5. Veritabanı Değişiklik Kuralları

### 5.1 Prisma Migration
- Şema değişiklikleri her zaman migration ile yapılmalı
- `npx prisma migrate dev` ile yerel migration oluşturun
- Migration dosyaları commit'e dahil edilmeli
- `npx prisma db push` sadece prototipleme için kullanılmalı

### 5.2 Seed Data
- `prisma/seed.ts` güncel tutulmalı
- Demo verileri gerçekçi olmalı
- Seed script idempotent olmalı (tekrar çalıştırılabilir)

### 5.3 Şema Değişiklik Kontrol Listesi
Şema değiştirdiğinizde:
- [ ] Migration oluşturuldu
- [ ] Prisma Client yeniden oluşturuldu (`npx prisma generate`)
- [ ] İlgili API route'lar güncellendi
- [ ] İlgili Zod validasyonları güncellendi (`src/lib/validations.ts`)
- [ ] Seed dosyası güncellendi

---

## 6. API Route Kuralları

### 6.1 Güvenlik
- Tüm mutation endpoint'leri authentication gerektirmeli
- Admin route'lar role kontrolü yapmalı (SUPPORT, ANALYST, OPS_ADMIN, SUPER_ADMIN)
- Rate limiting uygulanmalı (`src/lib/rate-limit.ts`)
- Input validasyonu Zod ile yapılmalı

### 6.2 Hata Yönetimi
- API route'lar try-catch ile sarılmalı
- Uygun HTTP status code'ları kullanılmalı
- Hata mesajları kullanıcıya anlamlı olmalı, ancak iç detayları ifşa etmemeli

---

## 7. Hook'ları Atlatma

Acil durumlarda hook'lar atlanabilir:
```bash
git commit --no-verify    # pre-commit atla
git push --no-verify      # pre-push atla
```

**Dikkat:** Hook atlatma sadece acil hotfix durumlarında kullanılmalı ve sonrasında sorunlar giderilmelidir.
