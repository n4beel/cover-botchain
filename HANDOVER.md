# Project 66 — Cover Handover

- **Status**: Handed over
- **Folder**: `cover-botchain/`
- **Contract**: `Cover` (`contracts/src/Cover.sol`)
- **Archetype**: AU · Round table (`#2BAE8A` ground, `#FFFFFF` surface, `#04231A` ink, `#1B3A57` accent)
- **Typography**: Merriweather (headings), Heebo (UI), M PLUS 1 Code (figures & amounts)

---

## Deliverables Summary

1. **Smart Contracts (`contracts/src/Cover.sol`)**:
   - `create(...)`: Establishes new risk pot with fixed join fee, wait period, vote window, claim cap, and term.
   - `join(id)`: Equal fee deposit to join as an equal member (up to 50 members).
   - `file(id, amount, reason)`: File claim with reason in event log (`Filed`), checking wait period, claim cap, and eligibility scan.
   - `vote(id, yes)`: Cast peer vote; enforces prior membership and excludes claimant.
   - `settle(id)`: Settle claim when strict majority of eligible members vote yes (`yes * 2 > eligible`) or window expires.
   - `closeOut(id)`: Closes season and distributes remaining funds equally to all members.
   - `withdraw()`: Pull payment for payouts and dividends.
   - 21 Foundry tests (20 unit/fuzz + 1 invariant with 128,000 calls, 0 reverts).

2. **Frontend UI & Round Table Visualisation**:
   - Interactive SVG Round Table with member seat chips, center pot stack, vote tokens in dishes, and season duration bar.
   - Accessible table toggle with full membership, join dates, and voting eligibility breakdown.
   - Active claim card with reasoning read from on-chain event logs (`Filed`).
   - Member dashboard (`/me`) for active pots, claim statuses, and 1-click withdraw.
   - Responsive design with single-column layout on mobile (≥ 360px).

3. **Verification**:
   - Mutation check: 21/25 killed (84%), remaining 4 verified equivalent in `contracts/DECISIONS.md`.
   - Integration test: full path on Anvil (port 8666).
   - Next.js production build: compiles cleanly with zero TypeScript or lint errors.
   - Scripts:
     - `python3 scripts/check-distinct.py cover` -> OK
     - `python3 scripts/check-tokens.py cover` -> OK
     - `python3 scripts/check-ui-contract.py cover` -> OK
     - `python3 scripts/check-honesty.py cover` -> OK
