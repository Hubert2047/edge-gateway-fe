# AGENTS.md — EDGE-GATEWAY-FE

## Tech stack
- Next.js (App Router) — version: TODO
- TypeScript
- Auth: NextAuth (`api/auth/[...nextauth]/route.ts`)
- Styling: TODO (Tailwind? CSS Modules? styled-components?)
- UI kit: TODO (shadcn/ui? Radix? MUI? tự viết components/?)
- Data fetching: TODO (fetch thuần + useEffect? SWR? React Query?)
- Backend API base: TODO (vd. https://api.mmold.com/api/v1)

## Cấu trúc thư mục
src/
app/
cloud-sync/
gateways/
history-data/
history-events/
meters/
process-control/
process-rules/
settings/
layout.tsx
page.tsx
api/
auth/[...nextauth]/route.ts
login/
page.tsx
globals.css
layout.tsx
page.tsx
components/
lib/
api/
auth.ts # TODO: mô tả chức năng
client.ts # TODO: mô tả chức năng
auth.ts
utils.ts
types/
auth.ts
next-auth.d.ts
proxy.ts
## Convention
- Mỗi thư mục trong cung level voi app là 1 module tính năng, tự chứa page + component con nếu có.
- Gọi API qua `lib/api/client.ts` — TODO: mô tả cách xử lý token/interceptor.
- Auth session lấy qua `lib/auth.ts` — TODO: NextAuth config (provider, callback, session strategy).
- i18n: TODO (next-intl? i18next? hard-code phồn thể trực tiếp?)
- Không dùng comment trong code trừ khi thật cần thiết.
- Ưu tiên viết lại toàn bộ file khi sửa lớn, thay vì diff nhỏ lẻ (theo yêu cầu riêng của bạn).
