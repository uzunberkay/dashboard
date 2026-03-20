# Admin Panel Architecture

## Prisma schema

- `User.role`: `USER | ADMIN`
- `User.isActive`: account enable/disable flag
- `User.lastLoginAt`: latest successful login timestamp
- `ActivityLog`: login and user change audit trail

## Route structure

```text
/app/admin
  /page.tsx                -> dashboard
  /users/page.tsx          -> advanced user list
  /users/[id]/page.tsx     -> user detail
  /system/page.tsx         -> system monitoring
  /settings/page.tsx       -> admin settings

/app/api/admin
  /dashboard/route.ts      -> admin KPI + trend API
  /users/route.ts          -> paginated user list API
  /users/[id]/route.ts     -> user detail + mutate API
  /users/bulk/route.ts     -> bulk actions API
  /system/route.ts         -> runtime health API
  /settings/route.ts       -> admin settings API
```

## Component architecture

- `AdminShell`: admin-only layout wrapper with sidebar and topbar
- `AdminPageHeader`: shared page intro block
- `AdminKpiCard`: dashboard KPI tiles
- `AdminTrendChart`: dynamic-imported Recharts visualization
- `AdminActivityFeed`: audit timeline
- `AdminUsersTable`: search results, bulk actions and quick-view drawer
- `AdminUserActions`: role/status controls on detail page
- `Table` and `Sheet`: shared admin UI primitives

## Security model

- `src/proxy.ts`: authenticated route protection plus `/admin` redirect for non-admins
- `requireAdminPageSession()`: server-side layout/page guard
- `requireAdminApiSession()`: API route role guard
- `updateManagedUser()`: last-active-admin protection and self-demotion prevention

## Performance notes

- Admin user list is paginated with a fixed page size
- Dashboard and system metrics use `unstable_cache`
- Trend chart loads via dynamic import
- Expensive queries are constrained to small windows or aggregated server-side
