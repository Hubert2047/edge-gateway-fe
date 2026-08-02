# AGENTS.md — EDGE-GATEWAY-FE

## Tech stack
- Next.js (App Router)
- TypeScript
- Auth: NextAuth (`app/api/auth/[...nextauth]/route.ts`), session-based, redirect to sign-in on 401/expired session. Login stores each user's `locale`; only admin sessions receive the safe global `appConfig` (currently `timeZone`).
- Styling: Tailwind CSS
- UI kit: shadcn/ui (`components/ui/`)
- Data fetching:
  - Server Components: plain `fetch` wrapped in `lib/api/server.ts`'s `serverApiFetch()`
  - Client Components: **TanStack Query (react-query)**, via per-feature hooks in `lib/api/<feature>.queries.ts`
- Backend API base: for now set via `BACKEND_URL` in `.env.local`, read server-side only in `lib/api/server.ts` (never exposed to the browser)

## Data flow pattern (important)
This app does NOT call the Go backend directly from the browser. Instead:

1. **Server Components** (e.g. `page.tsx`) fetch initial data via a `*.server.ts` file
   (e.g. `lib/api/hub.server.ts` → `getHubs()`, `lib/api/cloud-target.server.ts` → `getCloudTargets()`),
   which talks to the Go backend server-side via `lib/api/server.ts`'s `serverApiFetch()`
   (uses `BACKEND_URL` env var + session `accessToken`). This initial data is passed down as
   `initialData` into the corresponding react-query hook so the first render has no loading state.
2. **Client Components** (e.g. `gateway-list.tsx`, `cloud-target-list.tsx`) call react-query hooks
   from `lib/api/<feature>.queries.ts` (e.g. `useCloudTargets`, `useCreateCloudTarget`,
   `useUpdateCloudTarget`, `useDeleteCloudTarget`) instead of calling API functions directly.
3. Those hooks internally call the existing thin wrapper functions in `lib/api/<feature>.ts`
   (e.g. `getCloudTargets`, `createCloudTarget`, `updateCloudTarget`, `deleteCloudTarget`), which
   still use `apiFetch()` from `lib/api/client.ts` against **internal Next.js API routes**
   (e.g. `/api/cloud-targets`) — never the Go backend directly. `lib/api/<feature>.ts` is unchanged;
   react-query hooks are a layer on top of it, not a replacement for it.
4. Those internal API routes (`app/api/hubs/route.ts`, `app/api/cloud-targets/route.ts`, etc.)
   act as a proxy: they use `lib/api/route-handler.ts`'s `handleRoute()` wrapper (catches
   `ServerApiError`, returns consistent JSON error shape) and internally call
   `serverApiFetch()` from `lib/api/server.ts`, same as step 1.

So each CRUD feature typically has:
- `types/<feature>.ts` — entity + form value types
- `lib/api/<feature>.ts` — client-side functions using `apiFetch`, hit `/api/<feature>` routes
- `lib/api/<feature>.queries.ts` — react-query layer: query key factory + `useQuery`/`useMutation`
  hooks wrapping the functions in `lib/api/<feature>.ts` (see Query layer section below)
- `lib/api/<feature>.server.ts` — server-side function(s) for initial page load (Server Components)
- `app/api/<feature>/route.ts` + `app/api/<feature>/[id]/route.ts` (+ nested action routes like
  `[id]/test/route.ts` when needed) — Next.js route handlers proxying to Go backend
- `components/<feature>/<feature>-list.tsx` — client component: table + inline edit forms +
  create form + confirm dialogs, driven by the feature's react-query hooks (see
  `cloud-target-list.tsx` as reference)
- `app/<feature>/page.tsx` — Server Component, calls `.server.ts` getter, renders `<FeatureList>`
  with the server-fetched data as `initialData`/`initialTargets` prop

## Query layer (`lib/api/<feature>.queries.ts`)
- Query keys use a small factory per feature, e.g.:
  ```ts
  export const cloudTargetKeys = {
    all: ['cloud-targets'] as const,
    list: () => [...cloudTargetKeys.all, 'list'] as const,
  }
  ```
- List hook (`useCloudTargets`, `useHubs`) takes the server-fetched array as `initialData` and
  polls with `refetchInterval: 30_000`.
- Mutations follow one of two patterns:
  - **Simple invalidate** (create, delete, test-connection): `onSuccess` (or nothing, for
    read-only actions like test connection) just calls
    `queryClient.invalidateQueries({ queryKey: <feature>Keys.list() })`.
  - **Optimistic update** (update/save, toggle `enabled`): `onMutate` cancels in-flight list
    queries, snapshots the previous list with `getQueryData`, and writes the optimistic result
    with `setQueryData`; `onError` rolls back to the snapshot; `onSettled` invalidates the list
    to reconcile with the server.
- `QueryProvider` (`components/providers/query-provider.tsx`) wraps the app with a client-scoped
  `QueryClient` (`staleTime: 10_000`, `refetchOnWindowFocus: true`) — created once via
  `useState(() => new QueryClient(...))` so it isn't recreated on re-render.

## Backend response envelope & how the client layer handles it
The Go backend (`edge-gateway`) is migrating all endpoints to a consistent envelope:

```json
// success
{ "ok": true, "data": <payload> }

// error
{ "ok": false, "message": "<error message>" }
```

- `CloudTarget` handlers already use this envelope. `Hub` handlers are legacy
  (still return raw arrays/objects, and `{ "message": ... }` on error) and will be
  migrated later.
- `serverApiFetch()` (`lib/api/server.ts`) handles **both formats transparently**:
  it detects an envelope via `isEnvelope(body)` (checks for a boolean `ok` field);
  if present, unwraps `.data` and throws using `.message` on `ok: false`; if not
  present, falls back to treating the raw body as the payload (legacy Hub behavior).
  Callers (`hub.server.ts`, `cloud-target.server.ts`, route handlers) don't need to
  care which format the backend returned — they just get `T` back.
- `apiFetch()` (`lib/api/client.ts`) does **not** need this logic — it talks to our
  own Next.js API routes, which already return unwrapped `data` via `handleRoute()`.
- When Hub is migrated backend-side, no FE changes are needed; the legacy branch
  in `isEnvelope()`/`serverApiFetch()` simply stops being hit for that domain.

## `apiFetch()` behavior (`lib/api/client.ts`)
- Adds `Content-Type: application/json` automatically when a body is present.
- On 401 / auth-expired response (checked via `isAuthError()` in `lib/utils.ts`), triggers
  `signIn()` redirect back to current path, then throws `ApiError`.
- Throws `ApiError` (with `status`) on any non-OK response; returns `undefined` on 204.
- This is unchanged by the react-query migration — react-query hooks call `lib/api/<feature>.ts`
  functions, which still go through `apiFetch()`; auth-redirect behavior is unaffected.

## Confirm dialogs
List components use a single `pendingAction` state (`{ type, id/uid, displayName } | null`) +
one shared `<AlertDialog>` at the bottom of the component, with per-type title/description
text (see `dialogText` map in `gateway-list.tsx` / `cloud-target-list.tsx`). Reuse this exact
pattern for new features. Actions that don't need confirmation (e.g. toggling `enabled` via
checkbox, test connection) run immediately without a dialog, via the mutation hook directly.
Per-row loading state is derived from the mutation itself, e.g.
`updateMutation.isPending && updateMutation.variables?.id === target.id`, rather than local
per-row boolean state.

## Directory structure
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      hubs/
        [uid]/route.ts
        route.ts
      cloud-targets/
        [id]/
          route.ts
          test/route.ts
        route.ts
    cloud-sync/
      page.tsx        # renders CloudTargetList, fed by getCloudTargets()
    gateways/
      page.tsx
    history-data/
    history-events/
    login/
      page.tsx
    meters/
    process-control/
    process-rules/
    settings/
      page.tsx
    overview/
      page.tsx             # operations dashboard, fed by hubs, cloud targets and meter metadata
    globals.css
    layout.tsx
    page.tsx
  components/
    cloud-sync/
      cloud-target-list.tsx   # list + inline edit + create form + test connection (react-query)
    gateways/
      gateway-list.tsx        # reference pattern for new list+CRUD components
    layouts/
      app-shell.tsx
      sidebar.tsx
    providers/
      query-provider.tsx      # TanStack QueryClientProvider — see Query layer section above
      session-provider.tsx
    ui/           # shadcn: alert-dialog, badge, button, card, checkbox, dialog,
                  # dropdown-menu, input, label, select, separator, switch, table
    overview/
      overview-dashboard.tsx # operations overview UI; real-time reading fields are placeholders until backend APIs exist
    process-control/
      process-control-analysis.tsx # process control filters, summary cards and history chart
    history-data/
      history-data-view.tsx # historical data filters, bar chart and result table
    history-events/
      history-events-view.tsx # historical event filters and result table
    process-rules/
      process-rules-view.tsx # process rule list and create form
    users/
      user-management.tsx # admin-only user list, create, enable/disable, role and delete UI
  lib/
    api/
      auth.ts             # TODO: describe purpose
      client.ts           # apiFetch() — see above
      cloud-target.queries.ts # react-query hooks: useCloudTargets, useCreateCloudTarget,
                               # useUpdateCloudTarget, useDeleteCloudTarget, useTestCloudTargetConnection
      cloud-target.server.ts  # getCloudTargets()
      cloud-target.ts          # createCloudTarget/updateCloudTarget/deleteCloudTarget/testCloudTargetConnection
      hub.queries.ts       # react-query hooks: useHubs, useCreateHub, useUpdateHub, useDeleteHub
      hub.server.ts        # getHubs(), getHub()
      hub.ts               # createHub/updateHub/deleteHub
      route-handler.ts       # handleRoute() wrapper for API route handlers
      server.ts               # serverApiFetch() — see envelope section above
    auth.ts
    utils.ts        # includes isAuthError()
  types/
    auth.ts
    cloud-target.ts  # CloudTarget, CloudTargetFormValues, TestConnectionResult
    hub.ts          # Hub, HubFormValues — reference shape for new entity types
    next-auth.d.ts
  proxy.ts

## Convention
- Each folder at the same level as root `app/` pages is a self-contained feature module
  (page + local sub-components).
- Client-side data access goes through react-query hooks in `lib/api/<feature>.queries.ts`;
  those hooks call `lib/api/<feature>.ts`'s functions, which use `apiFetch()`
  (`lib/api/client.ts`). Server-side data access uses `lib/api/server.ts`'s `serverApiFetch()`.
  Components should not call `apiFetch()` or the `lib/api/<feature>.ts` functions directly —
  go through the query/mutation hooks so caching/invalidation stays consistent.
- Auth session is read via `lib/auth.ts` — TODO: document NextAuth config (provider, callbacks,
  session strategy).
- i18n: none — UI strings are hard-coded Traditional Chinese directly in components.
- Avoid code comments unless truly necessary.
- Prefer rewriting the whole file on major changes, rather than small diffs (per your own preference).
- Keep feature container/list components focused on data flow and orchestration. Extract self-contained UI sections or rows with their own state and actions into sibling components within the same feature folder instead of accumulating them in one large component.
- A gateway with `isVirtual: true` is a backend-managed virtual gateway. Render
  it with `VirtualGatewayRow`, separate from physical gateways. That UI may
  update only its enabled state and polling interval; do not fabricate a
  virtual row when the backend has not returned one.

## Role-based access
- Roles are normalized from the backend value to `admin` or `viewer` in `lib/roles.ts`.
- `admin` can access all application pages.
- `viewer` can access only read-only `/overview`, `/history-data`, and `/settings`.
- Admin-only pages are `/cloud-sync`, `/gateways`, `/meters`, `/history-events`,
  `/process-control`, `/process-rules`, and `/users`.
  They are filtered from the sidebar and protected by `src/proxy.ts` plus server-page guards.
- If a viewer tries to open an admin-only URL directly, they are redirected to `/overview`.
- `/settings` is available to every authenticated user. Every user can save only their own locale through the internal `PUT /api/v1/settings` proxy; only admins receive, see, or can update the global `timeZone` app config. Do not expose app-config controls or values to viewers.
- Overview detail links to Gateway, Cloud Sync, and Meter management are administrator-only. Do not render them for viewers.
- `/users` is also admin-only and uses the backend user endpoints through Next.js proxy routes.
- Current backend user endpoints support list/create, enabled toggle, role update, delete, and
  admin password reset via `PUT /users/:id/password`. Username editing still needs a separate
  endpoint if it is required later. The UI exposes only `admin` and `viewer`; `viewer` is mapped
  to the backend's `user` role because the current database CHECK constraint allows `admin`,
  `user`, and `readonly` only.

## Known TODOs / not yet implemented
- Cloud-sync "執行佇列上傳" (run queued uploads) button — no backend endpoint yet
  (depends on an offline-buffer/upload-worker module planned backend-side). Currently
  a no-op placeholder in `cloud-target-list.tsx`.
- `pendingReadings` / queue count on `CloudTarget` — backend field not implemented yet either
  (see backend AGENTS.md poller/cloud-target notes).

## Operations overview API gaps
- The overview page currently uses the existing `/api/hubs`, `/api/cloud-targets`, and
  `/api/hubs/{uid}/meters` endpoints. Counts and enabled/disabled states are real data.
- The screenshot includes gateway health/last-seen status, current readings (average current,
  L1/L2/L3), and latest sample timestamps. No backend endpoints currently expose those fields,
  so the UI displays `—` for them and must not fabricate values.
- To complete the overview, add a backend/API contract for an aggregated overview response (or
  health and latest-reading endpoints) containing gateway online/last-seen, cloud upload totals,
  meter phase currents, and latest sample timestamps. Then add the corresponding Next.js proxy
  route and server/client API layer before replacing the placeholders.

## Process control API gaps
- `/process-control` currently uses existing gateway and meter metadata for its selectors.
- The chart and summary values remain empty until the backend exposes a process-history query
  endpoint with the selected time range, meter, metric, and control limits, plus aggregated
  latest/average/minimum/maximum/exceeded values.

## History data API gaps
- `/history-data` currently uses existing gateway and meter metadata for its selectors.
- The chart and table remain empty until the backend exposes a historical samples query
  endpoint returning timestamp, gateway, meter, voltage, current, active power, and status.

## History events API gaps
- `/history-events` currently uses existing gateway and meter metadata for its selectors.
- The rule selector and event table remain empty until the backend exposes process rules and
  historical event records with timestamp, rule, gateway, meter, metric, trigger value,
  threshold, and trigger reason.

## Process rules API gaps
- `/process-rules` currently uses existing gateway and meter metadata for selectors.
- Rule list/create/update/delete actions are local UI state until the backend exposes a
  process-rules CRUD API with name, enabled state, gateway, meter, metric, and thresholds.
