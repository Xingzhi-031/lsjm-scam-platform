# KAN-39 Shieldy Implementation Plan

## Reference
4 pixel-art robot states (2×2 grid):
- **Calm**: Silver robot on green leaf, sleeping (Z's), relaxed
- **Suspicious**: Silver robot standing, magnifying glass, question mark
- **Alert**: Silver robot, exclamation mark, warning sign, wide eyes
- **Danger**: Red robot, shield, fist, jagged sparks

## Asset Strategy (implemented)

- **Source**: `shared/images/shieldy-sprite.png` (2×2 grid: Calm, Suspicious, Alert, Danger)
- **Split**: `node scripts/split-shieldy-sprite.mjs` → 4 PNGs
- **Process**: `pnpm shieldy:process` → 去白底、裁掉底部文字标签，只保留角色
- **Web**: img `src="/shared/images/shieldy-"+state+".png"`
- **Extension**: `pnpm copy-shared` copies the 4 PNGs to `extension/images/`; img `src="images/shieldy-"+state+".png"`

## State Mapping
| risk_level | Shieldy state |
|------------|---------------|
| low        | calm          |
| medium     | suspicious    |
| high       | alert         |
| critical   | danger        |

## Animations

| State      | Animation                          | Implementation |
|------------|------------------------------------|----------------|
| **Calm**   | Subtle breathing (up/down)         | `transform: translateY()` keyframes |
| **Calm**   | Snot bubble appear/disappear       | `::after` pseudo, `opacity` 0↔1, 2–3s cycle |
| **Suspicious** | Idle bounce, slight left–right sway | `translateY` + `rotate(±2deg)` |
| **Alert**  | Jump / bounce                      | `translateY` 0 → -6px → 0 |
| **Alert**  | Exclamation pulse (optional)       | `scale` or `opacity` on icon overlay |
| **Danger** | Shake left–right                   | `translateX` ±3px |
| **Danger** | Sparks flicker (optional)          | Extra div with `opacity` keyframes |

## Structure

```
.shieldy-wrapper
  .shieldy.shieldy-{state}     ← sprite or img
  .shieldy-bubble (calm only)  ← ::after or extra span
  .shieldy-label               ← "Calm" | "Suspicious" | "Alert" | "Danger"
```

## Integration Points
- **Web**: Above risk header in result card, or left of risk badge
- **Extension**: Compact version, above risk header in result card

## Implementation Order
1. Create/crop sprite assets from reference
2. Add `shared/css/shieldy.css` (or in ui.css)
3. Add Shieldy HTML + state logic to web `renderResultCard`
4. Add Shieldy to extension `renderResultCard`
5. Add animations per state
6. Add snot bubble for Calm
