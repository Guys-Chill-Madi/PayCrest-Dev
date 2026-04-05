# Frontend Target Structure

src/
  app/
    routes.tsx
    store.ts
  core/
    apiClient.ts
    auth.ts
    constants.ts
  modules/
    admin/
      pages/
      components/
      hooks/
      services/
      types/
    customer/
      pages/
      components/
      hooks/
      services/
      types/
    manager/
      pages/
      components/
      hooks/
      services/
      types/
    verification/
      pages/
      components/
      hooks/
      services/
      types/
    wallet/
      pages/
      components/
      hooks/
      services/
      types/
    auth/
      pages/
      components/
      hooks/
      services/
      types/
  shared/
    ui/
    hooks/
    utils/
    types/
    styles/
      base/
      tokens/
      utilities/

CSS strategy:
- Keep only tokens/reset/global helpers in shared/styles.
- Keep feature styles in co-located files, for example:
  modules/admin/components/ApprovalsTable.module.css
  modules/customer/pages/CustomerPortalPage.module.css
