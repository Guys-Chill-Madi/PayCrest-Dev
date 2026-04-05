# Visual Regression Baseline Plan

Date: 2026-02-16

## Baseline Screens
- Customer Portal: Dashboard, Wallet, EMI, Loans, Profile
- Verification: Queue, KYC Review, Document Review
- Manager: Pending, Completed, Review
- Admin: Overview, Approvals, Review
- Staff Login and Customer Login

## Baseline States
- Loading
- Empty
- Error
- Success
- Mobile/tablet/desktop breakpoints

## Recommended Tooling
- Playwright screenshot assertions (`toHaveScreenshot`) per route and state fixture.
- Snapshot naming convention:
  - `route-state-breakpoint.png`
  - Example: `verification-pending-empty-mobile.png`

## Acceptance Rule
- Any non-intentional visual delta fails CI and requires review approval.

