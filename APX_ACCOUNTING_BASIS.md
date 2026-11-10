# APX Accounting Basis

Public APXFund pages inspected on 2026-11-08:

- Token page: https://apxfund.xyz/token — APX contract `0x8d6032443cb7B23c134094c8921F1F37824EA3a2` on BNB Smart Chain; internal buy rate `$0.0008/APX`; internal redemption rate `$0.00072/APX`; market price described as coming soon.
- Tokenomics: https://apxfund.xyz/tokenomics — says cycle rewards are issued at maturity; describes a reward emission formula of 8% of cycle profit and an internal APX wallet/redemption process.
- Investment plans: https://apxfund.xyz/investment-plans — plan principal and return examples are stated in USD; plan profit is described as available at cycle end.
- Policies: https://apxfund.xyz/policies — says returns are credited upon maturity.
- Token wallet/litepaper page: https://apxfund.xyz/litepaper — lists BSC, APX symbol, and 18 token decimals; also repeats the internal redemption rate.
- BscScan token page: https://bscscan.com/token/0x8d6032443cb7B23c134094c8921F1F37824EA3a2 — matches APXFund's stated contract and reports 18 decimals.

Implementation choice explicitly confirmed by the user on 2026-11-10: retain USD-denominated principal and cash balance, convert the full plan ROI profit basis to APX at maturity using `$0.00072 per APX`, with no separate 8% reward. Thus `APX = USD ROI basis / 0.00072`. This supersedes the public page's separate 8%-of-profit reward formula for this requested implementation.

The application change creates an internal APX balance/ledger only. It does not mint, transfer, or send BSC tokens. The site's contract address is recorded for traceability but the code does not interact with that contract. The schema migration is a forward-only file and must be reviewed and deliberately applied by the repository owner before the application can use the new fields.
