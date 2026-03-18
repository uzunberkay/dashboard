# Bütçe Yönetim Sistemi

Kişisel bütçe ve harcama takip uygulaması. Next.js, TypeScript, Prisma ve PostgreSQL ile geliştirilmiştir.

## Özellikler

- Gelir ve harcama kaydı
- Kategori bazlı harcama takibi
- Aylık bütçe limitleri ve uyarı sistemi
- Dashboard ile finansal özet
- Grafik ve analizler (pasta grafik, çizgi grafik)
- Kullanıcı kimlik doğrulama (email/şifre)

## Kurulum

```bash
npm install
docker compose up -d db
npm run env:check
npm run db:migrate
npm run db:seed
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Demo Hesap

- **E-posta:** demo@example.com
- **Şifre:** demo1234

## Teknolojiler

- **Next.js 16** (App Router)
- **TypeScript**
- **Prisma** + PostgreSQL
- **NextAuth.js** (Credentials)
- **Tailwind CSS** + shadcn/ui
- **Recharts** (grafikler)
- **Zod** (validasyon)

## Prod Hazırlığı

- Prod deploy için migration tabanlı akış kullanılır: `npm run db:deploy`
- Env doğrulaması: `npm run env:check`
- Health endpoint: `/api/health`
- Ayrıntılı runbook: `docs/PRODUCTION.md`
