# @lynx/types

Typed contracts generated from the services' OpenAPI specs. **Never edit the
generated files by hand.**

- `openapi/api.json`: spec exported from `apps/api`.
- `src/generated/api.ts`: TypeScript types generated from it.

Regenerate after changing any API route or schema, and commit the result in
the same PR:

```
pnpm api:types
```

Use in the web app:

```ts
import type { paths } from "@lynx/types/api"
type Health = paths["/health"]["get"]["responses"]["200"]["content"]["application/json"]
```
