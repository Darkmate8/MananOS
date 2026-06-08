# SYSTEM DIRECTIVE: UI/UX DESIGN FRAMEWORK (DOC 03/06)
**Target Audience:** AI Front-End Code Generator / Styling Agent.
**Aesthetic Profile:** Earthy warm minimalism, editorial journal typography, flat card geometries. No outer shadow structures. 
**Visual Source References:** Match layout densities verbatim from workspace image files: "Today _ mid-day partial.jpg", "Workouts _ mid-session_ set 3 PR.jpg", "Nutrition _ Coach 2 parse moment.jpg", "Habits _ contribution grid.jpg", and "Coach 1 chat _ streaming reply.jpg".

---

## 1. COLOR SYSTEM & DATA DESIGNATION
Downstream engines must map code styling objects directly to this strict dictionary.

### 1.1 Surfaces & Canvas Layers (Flat, No Shadows)
- `bg-canvas`: `#1A1714` (Application root black-brown backdrop)
- `bg-surface-1`: `#211D1A` (Standard components, cards, list container segments)
- `bg-surface-2`: `#2A2522` (Modals, overlays, selected element focus states)
- `bg-surface-3`: `#332D29` (Top-layer popovers, interactive dropdown sheets)
- `border-default`: `#2F2925` (1px hairline boundary separating content matrices)
- `border-strong`: `#403832` (Focused text input areas or active structural frames)

### 1.2 Text Properties
- `text-primary`: `#F0EBE3` (Primary string data, headlines, active input content)
- `text-secondary`: `#B8B0A4` (System metadata tracking labels, description strings)
- `text-tertiary`: `#7A7268` (Placeholder keys, inactive counters, disabled text)

### 1.3 System Accent & Data States
- `accent-primary`: `#D97757` (Action keys, main buttons, ring progress highlights)
- `accent-primary-pressed`: `#C26545` (Press interaction state for primary components)
- `accent-primary-muted`: `rgba(217, 119, 87, 0.15)` (Tinted structural highlights)
- **Activity Rings (Unfilled Track = 12% Opacity):**
  - Steps Ring: `#D97757` | Water Ring: `#6A8CAF` | Calories Ring: `#788C5D`
- **Semantic Signals:**
  - `success`: `#7A9B6E` | `warning`: `#C9A05C` | `error`: `#C26B5C` | `info`: `#6A8CAF`
- **Habit Grid Intensity Ramp (grid-0 to grid-4):**
  - `empty`: `#211D1A` | `25%`: `#3A2E26` | `50%`: `#7A4A33` | `75%`: `#B2613F` | `100%`: `#D97757`

---

## 2. TYPOGRAPHY & SPACING SYSTEM

### 2.1 Font Families & Scopes
- **EB Garamond (Display Serif):** Page headers, module greetings, milestone logs. Never drop font-size configuration below 20px (prevents pixelation artifacts on Android screens).
- **JetBrains Mono (Monospace System):** Structural numeric fields, counters, weights, reps, nutrition statistics, durations. Tabular numerals behavior is native.
- **Inter (Clean Sans):** Standard labels, menu selectors, chat layout lines, body paragraphs.

### 2.2 Typography Sizing Definitions
- `display-xl`: 36px / LH 40px | Weight 600 (EB Garamond) -> PR celebrations
- `display-lg`: 28px / LH 34px | Weight 600 (EB Garamond) -> Main section views
- `heading`: 20px / LH 26px | Weight 600 (EB Garamond) -> In-card component titles
- `body-lg`: 17px / LH 24px | Weight 400 (Inter) -> Coach system threads
- `body`: 15px / LH 22px | Weight 400 (Inter) -> Standard UI fields, descriptions
- `caption`: 13px / LH 18px | Weight 500 (Inter) -> Labels, metadata markers
- `mono-data`: 15px / LH 20px | Weight 500 (JetBrains Mono) -> Direct numbers code

### 2.3 Structural Spatial Increments
- Scale base multiples: 4px (`space-1`: 4px, `space-2`: 8px, `space-3`: 12px, `space-4`: 16px, `space-5`: 20px, `space-6`: 24px, `space-8`: 32px, `space-10`: 40px, `space-12`: 48px). Omit odd increments entirely to guarantee strict grid alignment.
- **Radius Bounds:** `radius-button`: 10px | `radius-card`: 16px | `radius-modal`: 24px | `radius-pill`: 999px.

---

## 3. STRUCTURAL COMPONENT GEOMETRIES

### 3.1 Page Header Blueprint
Apply globally as demonstrated across all mockups:
- **Structure:** Top container holds an absolute tracking meta-label (`caption/text-tertiary`, tracking uppercase, e.g., `"TUESDAY · MAY 27"`). Vertically stack main header title directly underneath using `display-lg/text-primary` family (`EB Garamond`). Left padding bound handles default screen edge margin spacing (`space-6`).

### 3.2 Activity Rings Architecture (Today View)
- Layout properties derived from `Today _ mid-day partial.jpg`.
- **Dimensions:** Three concentric paths centered horizontally. Outer Ring (Steps) = 220px diameter, 14px stroke width. Middle Ring (Water) = 180px diameter, 14px stroke width, separated via a 6px gap. Inner Ring (Calories) = 140px diameter, 14px stroke width. Stroke terminals are rounded.
- **Data Callout Matrix:** Deep inside the hollow core, vertically align active parameter counts (`display-xl` utilizing `JetBrains Mono`) with secondary tracking text description nested directly underneath (`caption/text-tertiary`).

### 3.3 Workout Set Logger UI
- Layout properties derived from `Workouts _ mid-session_ set 3 PR.jpg`.
- **Row Properties:** Explicit container height constrained to 56px. Horizontally array elements: Set counter indicator (28px radius layout box, background set to `bg-surface-2`), entry properties for `weight_kg` and `reps` configured with `mono-data/text-primary`.
- **Set Type Pills:** Pills appear inline right of the set counter. `W` pill = warmup (`bg-surface-2`, `text-secondary`). `D` pill = drop set (`accent-primary-muted` background, `accent-primary` text). Tapping a pill toggles the flag. Both can be active simultaneously (e.g. a warmup drop is legal but rare).
- **Unilateral Weight Label:** When the active exercise has `is_unilateral = true`, render a `"per arm"` caption string directly below the weight input field using `caption/text-tertiary`. No other UI change — weight entry and volume calculation behavior are explained in the PRD.
- **Validation Switch Component:** 40px layout structure target. Default state displays empty circle ring bound to `border-default`. Checking elements updates state to solid `accent-primary` fill mapping a internal primary-white indicator icon.
- **PR Row Modification Variant:** When a personal milestone is logged, immediately shift localized typography to `accent-primary` and render a compact terracotta icon tag left of numeric text data.

### 3.4 Interactive Habit Tile & Log Cards
- Layout properties derived from `Habits _ contribution grid.jpg`.
- **Primary Grid Blueprint:** Structural cells bounded tightly to 80px by 80px squares. Background layer maps `bg-surface-1` styled with a subtle `border-default` vector wrap. Rounded corners follow `radius-card`.
- **Binary Status Toggles:** Inside the cell canvas area, isolate a single 28px central glyph icon layered atop a lowercase text description label. Completion shifts state values to an integrated `accent-primary-muted` background fill framed by a matching terracotta border wrap.
- **Aggregate Contribution Grid:** The 52-week grid on `habits/index.tsx` renders aggregate data. Each cell color is derived from `ratio = completions_for_day / total_active_habits`, mapped to the existing `grid-0` → `grid-4` intensity ramp. Section header label: `"ALL HABITS · 52 WKS"` (`caption/text-tertiary`, uppercase, letterSpacing 1.2). Tap a cell to show a small inline tooltip: `"MON JUN 3 · 3/5 habits"`. The tooltip auto-dismisses after 2s or on tap-elsewhere.

### 3.10 Workout Template Card
- **List Row Geometry:** Template cards in `workouts/templates.tsx` are full-width cards (`bg-surface-1`, `radius-card`, `border-default`). Card height is auto — min 72px.
- **Composition:** Template name in `bodyBold/text-primary`. Below it: a compact exercise preview string listing the first 3 exercise names separated by `·` in `caption/text-tertiary`. Far right: a `"▶ Start"` pill button (`accent-primary` background, `radius-pill`).
- **Edit / Delete:** Trailing swipe-right reveals an edit icon (`Feather/edit-2`, `warning` color) and a delete icon (`Feather/trash-2`, `error` color). Long-press also triggers the delete confirmation alert.
- **Create New FAB:** Same design as the workouts screen FAB — full-width bottom-pinned button, `accent-primary`, label `"New Template"`.

### 3.5 Rest Timer Element Overlay
- Layout properties derived from `Workouts _ mid-session_ set 3 PR.jpg`.
- **Geometry:** Bottom-pinned floating viewport card container, extending to a precise height boundary of 120px. Sits directly above the bottom navigation architecture layer.
- **Composition:** Base fill layer drops to `bg-surface-3`. Upper boundary layer runs a continuous 3px linear animated execution line indicator tracking color property `accent-primary`. Core countdown statistics stack clean mono digits centered within the panel using typography style code `display-xl / JetBrains Mono`. Side boundaries mount ghost time correction shortcuts (`-15s`, `+15s`).
- **Custom Duration Edit:** Tapping the countdown number itself transitions it inline to a numeric `TextInput` (same mono font, same size). User types a new value in seconds and confirms with the keyboard return key. This replaces remaining seconds for the current rest only — does not save to exercise defaults. On invalid input (non-numeric, <0), revert to current remaining time with a `Warning` haptic.

### 3.6 Chat UI System (Coach 1 Interface)
- Layout properties derived from `Coach 1 chat _ streaming reply.jpg`.
- **Interface Structure:** Mounted directly below page header layout. Immediately includes a horizontal row of filter chips (`"Last 4 workouts"`, `"7-day nutrition"`) using typography `caption/text-primary`, styled with a thin outline border on `bg-surface-1`.
- **User Block Vectors:** Container pushes flush to right viewport boundaries. Sizing max-width is clamped to 78% of overall horizontal canvas. Core fill layer sets color values to `bg-surface-2` styled with an eccentric corner modifier: `borderBottomRightRadius: 6`. Typography maps to `body/text-primary`.
- **Assistant Thread Blocks:** Alignment anchors to left boundary lines. Area limits parameters mirror user block limits. Background changes to `bg-surface-1` using an opposing edge anchor styling rule: `borderBottomLeftRadius: 6`. Incorporates native runtime markdown rendering configurations via font token profile `body-lg/text-primary`.

### 3.7 Coach 2 Input Controller Component
- Layout properties derived from `Nutrition _ Coach 2 parse moment.jpg`.
- **Design Structure:** Full-bleed card architecture block built atop `bg-surface-1`. Top corner profiles lock structural boundary to `radius-card`. Internal spaces map to padding multiplier `space-4`.
- **Input Architecture:** Implements a top metadata label tracking system prompt string `"What did you eat?"` (`caption/text-secondary`). Nest text entry area processing multiple lines of continuous user feedback text directly beneath via font style `body-lg`. Bottom margin line places action processing buttons (`"Log"`) anchored directly to the right border boundary using design properties `accent-primary` background styling and `radius-pill` curve definitions.

### 3.8 Application Nav Architecture Bar
- **Geometry:** Bar thickness set cleanly to 64px combined structurally with device safe area padding metrics. 
- **Backdrop Styling:** Blends base color token `bg-canvas` directly below a soft top-edge horizontal transparent gradient. Drops traditional drop-shadow definitions completely.
- **Navigation Controls:** 4 standard tab items tracking specific operational modules. Isolate 24px layout glyphs arrayed directly above localized textual navigation labels (`caption`). Activation transitions state styling arrays smoothly from `text-tertiary` elements to vivid `text-primary` values while displaying a small 4px absolute accent dot indicator above the active element grid cell.

### 3.9 Water Quick-Add Tracker FAB
- **Dimensions:** Clean 56px circular floating component structure pinned dynamically to the lower-right application container corner on the main dashboard view.
- **Color Parameters:** Background color hardcoded to `accent-primary`. Interior anchors a single crisp 24px system icon element colorized white. Pushes outward with a clean 2px `bg-canvas` ring border separator block instead of using shadow definitions.

---

## 4. INTERACTION & ANIMATION BUDGETS

### 4.1 System Global Easing Standards
- **Processing Speeds:** Standard component transitions map to an explicit execution window of 180ms. Updates handling statistical elements inside the activity rings loop extend animation processing routines to 600ms.
- **Easing Values:** `Easing.out(Easing.cubic)`. Processing hooks map cleanly to native layout engine driver instances (`react-native-reanimated`).
- **Touch Targets Rule:** Interactive elements must execute scaling shifts mapping `scale: 0.97` across a 100ms processing threshold during active user finger contact cycles. Every single link or element target smaller than a 44x44pt operational zone must automatically generate invisible expansion layers to meet strict accessibility baselines.
- **Banned Interactions:** Do not introduce transition animations during initial component mounts, page switches, or tabs swaps. Frame updates must snap instantly across view ports to minimize execution friction.

### 4.2 Localized Device Haptic Protocols
Code hooks generating interaction workflows using `expo-haptics` must execute according to these exact rule definitions:
- Validated Set Completion / Habit Checkbox Validation / Quick Water Logging Actions -> Run `ImpactFeedbackStyle.Light`.
- Structural Long-Press System Triggers -> Run `ImpactFeedbackStyle.Medium`.
- PR Verification Event Alerts / Operational Timer Execution Completions -> Run `NotificationFeedbackType.Success`.
- API Call Failure Processing / UI Data Validation Breaches -> Run `NotificationFeedbackType.Warning`.
- Standard Navigation Events / View Mode Tab Modifications -> **Do not introduce any haptics** (Strictly forbidden).