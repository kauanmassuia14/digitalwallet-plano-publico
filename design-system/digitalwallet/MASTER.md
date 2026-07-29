# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** DigitalWallet
**Generated:** 2026-07-23 14:07:38
**Category:** Luxury/Premium Brand

---

# Design System Master File - DigitalWallet

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** DigitalWallet
**Generated:** 2026-07-23
**Category:** Premium Dark Fintech & Circular Recycling

---

## Global Rules

### Color Palette

| Role               | Hex                   | CSS Variable            | Usage                                           |
| ------------------ | --------------------- | ----------------------- | ----------------------------------------------- |
| Primary/Accent     | `#bef264` (Lime-300)  | `--color-primary`       | Main highlight, buttons, active icons           |
| Primary Dark       | `#a3e635` (Lime-400)  | `--color-primary-dark`  | Pressed states, active highlights               |
| Background Deep    | `#0e1115`             | `--color-bg-deep`       | Main body background, app shell backdrop        |
| Background Surface | `#1a1f26`             | `--color-bg-surface`    | Card background, sidebars, modal surfaces       |
| Background Elev    | `#242c36`             | `--color-bg-elevated`   | Secondary cards, active buttons, hover surfaces |
| Border Subtle      | `#2e3845`             | `--color-border-subtle` | Borders, dividers, subtle separators            |
| Text Primary       | `#f8fafc` (Slate-50)  | `--color-text`          | Main titles, readable paragraph body            |
| Text Muted         | `#94a3b8` (Slate-400) | `--color-text-muted`    | Subtitles, helper text, labels                  |

**Color Notes:** Premium dark graphite backgrounds combined with vibrant Lime Neon highlights. Contrast pairs must always maintain readable text contrast.

### Typography

- **Heading Font:** Outfit (fallback: sans-serif)
- **Body Font:** Inter (fallback: sans-serif)
- **Mood:** cinematic, premium dark, fintech, tech-wear, active ecology, modern utility
- **Google Fonts:** [Outfit + Inter](https://fonts.google.com/share?selection.family=Outfit:wght@500;700|Inter:wght@400;500;600)

**CSS Import:**

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;700&display=swap");
```

### Spacing Variables

| Token        | Value             | Usage                                     |
| ------------ | ----------------- | ----------------------------------------- |
| `--space-xs` | `4px` / `0.25rem` | Inner element gaps (icon + text)          |
| `--space-sm` | `8px` / `0.5rem`  | Component margins, list gap               |
| `--space-md` | `16px` / `1rem`   | Standard cards and page side paddings     |
| `--space-lg` | `24px` / `1.5rem` | Internal card padding, element separation |
| `--space-xl` | `32px` / `2rem`   | Section offsets, hero margins             |

### Shadow & Glow Depths

| Level           | Value                             | Usage                                |
| --------------- | --------------------------------- | ------------------------------------ |
| `--shadow-sm`   | `0 1px 2px rgba(0,0,0,0.3)`       | Subtle separation                    |
| `--shadow-md`   | `0 8px 16px rgba(0,0,0,0.4)`      | Standard bento cards                 |
| `--shadow-glow` | `0 0 12px rgba(190,242,100,0.15)` | Glowing highlights for Lime elements |
| `--radius-lg`   | `24px`                            | Main bento cards, modals, sliders    |
| `--radius-md`   | `16px`                            | Buttons, small card elements         |

---

## Component Specs

### Buttons

```css
/* Lime Primary Button */
.btn-primary {
  background: var(--color-primary);
  color: #0e1115;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-family: "Outfit", sans-serif;
  font-weight: 700;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Secondary Dark Button */
.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text);
  border: 1px solid var(--color-border-subtle);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-family: "Inter", sans-serif;
  font-weight: 500;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--color-border-subtle);
  color: var(--color-primary);
}
```

### Bento Cards

```css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.card:hover {
  border-color: rgba(190, 242, 100, 0.3);
  transform: translateY(-2px);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.5),
    var(--shadow-glow);
}
```

### Inputs

```css
.input {
  background: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text);
  padding: 14px 18px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-family: "Inter", sans-serif;
  transition: all 200ms ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(190, 242, 100, 0.15);
}
```

---

## Anti-Patterns (Do NOT Use)

- ❌ **No Emoji as Structural Icons** — Use vector-based icons (Lucide, Heroicons)
- ❌ **Bright background** — DigitalWallet is premium dark mode only
- ❌ **Sharp borders** — Avoid 0px border-radius, use 16px/24px rounded corners
- ❌ **Light mode text colors** — Never use dark gray/black text on dark background
- ❌ **Layout-shifting hovers** — Always transition borders and shadows smoothly without size change
- ❌ **Instant state transitions** — Use transitions (150-300ms) for all interactive components

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] All colors and elements are mapped to the premium dark mode tokens
- [ ] Safe areas respected for bottom mobile tabs and headers
- [ ] Primary text contrast >=4.5:1 on dark surface backgrounds
- [ ] Icons are SVG vectors and consistent style
- [ ] `cursor-pointer` is active on all clickable elements
- [ ] Spacing fits the 4px/8px modular spacing system
