# fnc-shared Project Instructions
Before editing any files, always read `CONVENTIONS.md` in the repository root.

When prompted to update or add any static dataset in `data/`:
1. **Never hand-edit large JSON files directly** if a patch script exists in `scripts/`—use or extend the Node.js scripts in `scripts/` to apply the update cleanly.
2. **Validate the JSON** (valid syntax, no trailing commas, schema matches `CONVENTIONS.md`).
3. **Update `data/manifest.json`** with a fresh Unix timestamp for every modified or newly added dataset so jsDelivr cache-busting triggers immediately across FNC Oracle, FNC Retirement Engine, and Cardimizer.
4. **Confirm external figures:** If the update depends on newly released tax brackets, contribution limits, or credit card terms not explicitly provided in the user's prompt, flag which figures were assumed so the user can verify them before pushing to GitHub.