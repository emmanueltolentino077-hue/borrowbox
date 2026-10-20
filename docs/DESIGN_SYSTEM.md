# BorrowBox Design System

Design tokens and component rules taken from the BorrowBox style board. Use this file as the single source of truth for colors, type and components when building the UI.

> **Exact vs estimated values.** The four brand colors and the three fonts are exact (printed on the board). Tonal steps, surface colors, the red and the radii were read by eye from the image, so they are marked *approx.* Adjust them if your designer has the real values.

## 1. Color

### Brand colors (exact)

| Role | Hex | Typical use |
|---|---|---|
| Primary | `#15803D` | Main actions, active nav item, "Active" status, success |
| Secondary | `#0F172A` | Dark text, dark panels, slate accents |
| Tertiary | `#D97706` | Warnings, "Due Today", edit actions, low stock |
| Neutral | `#78716C` | Borders, muted text, "Returned" status, disabled states |

### Tonal scales (approx.)

Each brand color has an 11-step scale from black to white. Step names follow the usual 50 to 950 pattern; use the anchor color at 600 to 700 for primary use.

**Primary (green)**

| Step | Hex |
|---|---|
| 950 | `#002D10` |
| 900 | `#003D18` |
| 800 | `#005A24` |
| 700 | `#006E2E` |
| 600 | `#15803D` (anchor) |
| 500 | `#2A9150` |
| 400 | `#4CAF6E` |
| 300 | `#7AD79A` |
| 200 | `#99F6B4` |
| 100 | `#C8FBD8` |
| 50 | `#EAFFF1` |

**Secondary (slate)**

| Step | Hex |
|---|---|
| 950 | `#0A0F1C` |
| 900 | `#0F172A` (anchor) |
| 800 | `#1E293B` |
| 700 | `#334155` |
| 600 | `#475569` |
| 500 | `#64748B` |
| 400 | `#94A3B8` |
| 300 | `#CBD5E1` |
| 200 | `#DDE3F7` |
| 100 | `#EEF1FD` |
| 50 | `#F8FAFC` |

**Tertiary (amber)**

| Step | Hex |
|---|---|
| 950 | `#2B1400` |
| 900 | `#4A2800` |
| 800 | `#6B3C00` |
| 700 | `#8F5200` |
| 600 | `#B26500` |
| 500 | `#D97706` (anchor) |
| 400 | `#FF9A2E` |
| 300 | `#FFB878` |
| 200 | `#FFD9BD` |
| 100 | `#FFEBDC` |
| 50 | `#FFF7F0` |

**Neutral (warm gray)**

| Step | Hex |
|---|---|
| 950 | `#1C1917` |
| 900 | `#292524` |
| 800 | `#44403C` |
| 700 | `#57534E` |
| 600 | `#78716C` (anchor) |
| 500 | `#8F8680` |
| 400 | `#A8A29E` |
| 300 | `#D6CFCA` |
| 200 | `#E8DFDA` |
| 100 | `#F5EDE6` |
| 50 | `#FBF7F4` |

### Semantic colors (approx.)

| Token | Hex | Use |
|---|---|---|
| `danger` | `#B91C1C` | Delete, Overdue, errors |
| `danger-soft` | `#FEE2E2` | Overdue badge background |
| `success` | Primary 600 | Active, confirmed |
| `warning` | Tertiary 500 | Due Today, Low Stock |
| `muted` | Neutral 600 | Returned, Out of Stock text, disabled |

### Surfaces (approx.)

| Token | Hex | Use |
|---|---|---|
| `page` | `#E0D8D2` | App background behind cards |
| `card` | `#F5EDE6` | Cards, panels, tiles |
| `field` | `#EFE5DF` | Input and search backgrounds |
| `border` | `#B9C4BB` | Input outline, dividers |
| `text` | `#1F1A17` | Headlines |
| `text-body` | `#3D4640` | Body copy (slightly green-gray) |

### BorrowBox status mapping

| Status | Text | Background |
|---|---|---|
| Active | Primary 700 | Primary 50 |
| Due Today | Tertiary 800 | Tertiary 100 |
| Overdue | `danger` | `danger-soft` |
| Returned | Neutral 700 | Neutral 200 |
| Ready / Available | Primary 700 | Primary 50 |
| Low Stock | Tertiary 800 | Tertiary 100 |
| Depleted / Out of Stock | Neutral 700 | Neutral 200 |

## 2. Typography

| Style | Font | Weight | Use |
|---|---|---|---|
| Headline | **Inter** | 600 to 700 | Page titles, card titles, modal titles |
| Body | **Inter** | 400 to 500 | Paragraphs, table cells, descriptions |
| Label | **JetBrains Mono** | 400 to 500 | Product codes, IDs, badges, button text, small captions, stat card labels |

Suggested scale:

| Token | Size / line height |
|---|---|
| `display` | 32 / 40 |
| `h1` | 28 / 36 |
| `h2` | 20 / 28 |
| `h3` | 16 / 24 |
| `body` | 14 / 20 |
| `label` | 12 / 16 (JetBrains Mono, uppercase with 0.04em tracking for card captions) |

Load both fonts from Google Fonts, and give each a fallback stack: `Inter, system-ui, sans-serif` and `"JetBrains Mono", ui-monospace, monospace`.

## 3. Shape, spacing and elevation (approx.)

| Token | Value |
|---|---|
| Radius, tiles and cards | 16px |
| Radius, buttons and inputs | 4px (nearly square) |
| Radius, badges | 999px (pill) |
| Spacing scale | 4, 8, 12, 16, 24, 32 |
| Card padding | 16 to 24px |
| Shadow | Very light or none. Separate surfaces with the `page` and `card` colors instead |

## 4. Components

### Buttons

All buttons use the Label font (JetBrains Mono), a 4px radius and about 36 to 40px height.

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | Primary 700 | White | None | Main action (Issue Borrow, Add Equipment, Save) |
| Secondary | Neutral 200 | Neutral 800 | None | Supporting action |
| Inverted | Neutral 900 | White | None | Strong contrast action on light surfaces |
| Outlined | Transparent | Neutral 900 | 1px Neutral 600 | Low emphasis (Cancel, Export CSV) |

States: hover darkens one step, focus shows a 2px Primary 400 ring, disabled uses Neutral 300 background with Neutral 500 text.

### Icon buttons

Square, 40 by 40px, 4px radius, white icon (20px) on a solid color. The color tells the action type.

| Action | Background |
|---|---|
| Edit | Tertiary 700 |
| Magic or generate action | Primary 700 |
| Category or group | Secondary 600 |
| Tag or label | Tertiary 800 |
| Delete | `danger` |

An icon button can carry a text label (icon on the left, label on the right) using the Primary style.

### Search field

Field background, 1px `border`, 4px radius, search icon on the left in Neutral 600, placeholder in Neutral 600. About 44px tall.

### Progress bars

Thin rounded bars (6px tall) on a light neutral track. The fill color shows the level:

| Fill | Meaning |
|---|---|
| Primary 700 | Healthy (for example low borrowed percentage) |
| Secondary 600 | Informational or neutral |
| Tertiary 800 | Caution (for example high borrowed percentage, low stock) |
| `danger` | Full or out of stock |

### Navigation

A pill-shaped bar on the `field` color. The active item is a solid Primary 700 square with a white icon. Inactive items show a Neutral 900 outline icon. Icons shown: home, search, person. The BorrowBox sidebar follows the same rule: active item is solid Primary, others are plain text and icon.

### Cards and tiles

Background `card`, 16px radius, 16 to 24px padding, no heavy shadow. The small caption at the top uses the Label font in Neutral 600. Stat cards pair that caption with a large Inter number.

## 5. Icons

Use one outline icon set at 20px with a 1.5px stroke (Lucide works well). Icons seen in the board: home, search, person, pencil (edit), magic wand, shapes (category), tag and trash (delete).

## 6. Design tokens (CSS)

```css
:root {
  /* Brand */
  --color-primary: #15803d;
  --color-primary-700: #006e2e;
  --color-primary-50: #eafff1;
  --color-secondary: #0f172a;
  --color-secondary-600: #475569;
  --color-tertiary: #d97706;
  --color-tertiary-800: #6b3c00;
  --color-tertiary-100: #ffebdc;
  --color-neutral: #78716c;
  --color-neutral-200: #e8dfda;
  --color-neutral-900: #292524;

  /* Semantic */
  --color-danger: #b91c1c;
  --color-danger-soft: #fee2e2;

  /* Surfaces */
  --surface-page: #e0d8d2;
  --surface-card: #f5ede6;
  --surface-field: #efe5df;
  --border: #b9c4bb;
  --text: #1f1a17;
  --text-body: #3d4640;

  /* Type */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Shape */
  --radius-card: 16px;
  --radius-control: 4px;
  --radius-pill: 999px;
}
```

If you use Tailwind, map these tokens in the theme config under `colors`, `fontFamily` and `borderRadius` so components use names like `bg-primary` and `font-mono` instead of raw hex values.

## 7. Usage rules

1. Use Primary for the single main action on a screen. Do not place two Primary buttons side by side.
2. Use Label (monospace) for anything that is a code, ID, status badge or small caption. Use Inter for everything people read as sentences.
3. Never rely on color alone for status. Always include the status word in the badge.
4. Keep text contrast at WCAG AA (4.5 to 1 for body text). White on Primary 700 and on `danger` passes. Check any text placed on Tertiary 500.
5. Reuse the same button, badge, card and input components on every screen instead of restyling each one.
