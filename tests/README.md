# Unit tests

Run all tests:

```bash
npm test
```

Uses Node’s built-in test runner (`node --test`). No extra dependencies required.

## Test files

| File | Coverage |
|------|----------|
| `timerService.test.js` | Timer status (active/scheduled/expired), active-timer selection for storefront |
| `timerValidation.test.js` | Request validation: create/update schemas, fixed vs evergreen, error responses |
| `analyticsService.test.js` | Impression: shop validation, timerId validation, `$inc` behavior |
| `targetingLogic.test.js` | Targeting: all / products / collections matching |
| `evergreenTimer.test.js` | Evergreen timers: status always “active”, duration validation |

## Adding tests

- **server/** — backend routes, lib, models
- **admin-app/** — React components and utils
- **widget/** — Preact storefront widget logic

You can add more `*.test.js` files in `tests/`; `npm test` runs all of them.
