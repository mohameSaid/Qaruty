# Qaryati &ndash; User Management (Angular 20)

Single-page CRUD app for managing users, built with Angular 20 standalone
components, Signals, Reactive Forms, Angular Material, and the control-flow
syntax (`@if` / `@for` / `@switch`).

## Setup

```bash
npm install
npm start
```

Then set the real API host in `src/environments/environment.ts`
(`baseUrl`) &mdash; this corresponds to `{{base_url}}` in the Postman
collection.

## Architecture

```
src/app/
  core/               # cross-cutting concerns: error interceptor, snackbar service
  shared/             # confirm dialog, reusable validators
  features/users/
    components/       # user-form, user-search, users-table (presentational)
    pages/            # users-page (container, wires store + components)
    services/         # UserService, LookupService (typed HTTP calls)
    models/           # request/response/UI interfaces
    store/            # UsersStore: signal-based state + orchestration
```

No HTTP calls or business logic live inside components &mdash; `UsersStore`
owns state (`loading`, `saving`, `deleting`, `searching` signals) and talks to
`UserService`/`LookupService`.

## Things confirmed vs. assumed from your inputs

The Postman collection and the prompt spec disagree/are incomplete in a few
spots. I went with the more concrete source (the Postman collection) and
flagged the gaps in code comments so you can correct them quickly:

1. **Update User body.** The collection's saved "Update User" request only
   sends `{ email, address }` (address as a flat string), while Create sends
   the full nested shape. I assumed that sample was just illustrative/partial
   and wired the form to submit the same full shape as Create on `PUT
   /user/{id}`. If your backend actually only accepts the narrow
   `{ email, address }` payload, update `UserService.updateUser()` and the
   `submit()` method in `user-form.component.ts` to build that shape instead.
2. **Governorate lookup endpoint.** Only `GET /lookup/city?parentId=...` was
   present in the collection; there's no saved request for governorates. I
   assumed `GET /lookup/governorate` following the same pattern as city/village
   look-ups (`LookupService.getGovernorates()`). Confirm the real path.
3. **Village lookup endpoint.** Not present in the collection either &mdash;
   inferred as `GET /lookup/village?parentId={cityId}` per the original prompt
   doc, matching the city endpoint's pattern.
4. **Paged response envelope.** The collection's saved responses were empty,
   so `PagedResponse<T>` assumes `{ content, totalElements, totalPages,
   pageNo, size }`. If your backend uses different field names (e.g. `items`,
   `total`), update `PagedResponse<T>` in
   `features/users/models/api-response.model.ts` &mdash; it's the single
   place consumers depend on.
5. **Delete User response/verb.** The collection confirms `DELETE
   /user/{id}` with no body, which is what's implemented.

## Features implemented

- Create / Update / Delete / List / Search-by-National-ID, all against the
  real REST endpoints (no mock data).
- Cascading Governorate &rarr; City &rarr; Village dropdowns using
  `switchMap` + `distinctUntilChanged` + `takeUntilDestroyed`, no nested
  subscriptions.
- Reactive form with validators (required fields, 14-digit National ID,
  email format, mobile number pattern).
- The form auto-switches between Create Mode and Edit Mode; searching by
  National ID that finds a match loads it into the form for editing.
- Loading/saving/deleting/searching signals drive spinners and disabled
  buttons across the UI.
- Global HTTP error interceptor mapped to Material snackbars (network,
  validation, server, not-found).
- Delete requires confirmation via a Material dialog.
- Sortable, paginated Material table; responsive two-column form that
  collapses to one column on mobile.


<!-- 
npm run build:gh
npm run deploy 

-->