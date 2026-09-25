---
name: EduTech Pro
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dae0'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4fa'
  surface-container: '#ebeef4'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#dfe3e8'
  on-surface: '#181c20'
  on-surface-variant: '#424753'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f7'
  outline: '#727785'
  outline-variant: '#c2c6d5'
  surface-tint: '#005ac1'
  primary: '#0058bd'
  on-primary: '#ffffff'
  primary-container: '#2771df'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#006e2c'
  on-secondary: '#ffffff'
  secondary-container: '#86f898'
  on-secondary-container: '#00722f'
  tertiary: '#765700'
  on-tertiary: '#ffffff'
  tertiary-container: '#956e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#89fa9b'
  secondary-fixed-dim: '#6ddd81'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdea0'
  tertiary-fixed-dim: '#fbbc06'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#dfe3e8'
typography:
  display:
    fontFamily: lexend
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: lexend
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md:
    fontFamily: lexend
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  margin-sm: 16px
  margin-md: 32px
  margin-lg: 48px
---

## Brand & Style
This design system is built upon a **Corporate / Modern** aesthetic, heavily influenced by the Material Design philosophy. It aims to evoke a sense of professional reliability, intellectual clarity, and approachable innovation. The target audience consists of educators, administrators, and students who require a focused, "flow-state" workspace that minimizes cognitive load. The emotional response is one of organized calm, utilizing ample white space and a systematic color language to guide the user through complex educational workflows without friction.

## Colors
The color palette is rooted in the iconic Google quartet, repurposed for a professional educational environment. 
- **Primary (Google Blue):** Used for primary actions, active states, and key navigational elements to signify stability and intent.
- **Secondary (Google Green):** Reserved for success states, progress indicators, and "complete" actions.
- **Tertiary (Yellow):** Employed sparingly for highlights, bookmarks, or cautionary alerts that require attention without the urgency of an error.
- **Error (Red):** Dedicated strictly to destructive actions and critical system alerts.
- **Surface & Backgrounds:** The design system utilizes a white base (#FFFFFF) with subtle cool-grey tints (#F8F9FA) for secondary containers to maintain a high-contrast, clean environment.

## Typography
The typography strategy pairs **Lexend** for headlines and **Inter** for body text. Lexend is chosen for its specific design origins in reading proficiency and education, providing a friendly, geometric clarity that mirrors the Google aesthetic. Inter is utilized for the interface and body copy to provide a highly legible, systematic feel necessary for data-heavy educational workspaces. Weight is used strategically to establish hierarchy; avoid using weights below 400 to ensure accessibility across all device types.

## Layout & Spacing
This design system utilizes a **12-column fluid grid** for desktop environments, transitioning to a 4-column grid for mobile. The spacing rhythm is based on an 8px baseline grid to ensure mathematical consistency. 
- **Margins:** Page margins are set to 24px on tablet/desktop to provide breathing room.
- **Gutters:** Standard 16px gutters maintain distinct separation between content blocks.
- **Padding:** Internal card padding should default to 24px (3 units) to reinforce the minimalist, "airy" feel of the workspace.

## Elevation & Depth
Depth in the design system is achieved through a combination of **Tonal Layers** and **Ambient Shadows**. 
- **Level 0 (Base):** Background surfaces use #FFFFFF.
- **Level 1 (Cards):** Use a subtle, diffused shadow: `0px 1px 3px rgba(0, 0, 0, 0.05), 0px 4px 6px rgba(0, 0, 0, 0.02)`. This creates a soft lift without cluttering the UI.
- **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced shadow to draw immediate focus.
- **Tonal Tiers:** In lieu of heavy shadows, different workspace zones (like sidebars) are separated by a subtle surface tint (#F1F3F4) rather than a border, maintaining the minimalist philosophy.

## Shapes
The shape language is defined by a **Rounded** aesthetic. Standard components like buttons and input fields utilize a 0.5rem (8px) radius, while larger containers and cards utilize a more pronounced 0.75rem to 1rem (12px-16px) radius. This softening of the geometry makes the professional environment feel more modern and less rigid, encouraging user engagement.

## Components
- **Buttons:** Primary buttons are filled with Google Blue and use white Lexend Medium text. Secondary buttons use a tonal background or a simple outline. All buttons feature a 0.5rem corner radius.
- **Cards:** Cards are the primary unit of the workspace. They should feature a 12px or 16px corner radius, a Level 1 shadow, and no border. 
- **Input Fields:** Outlined style with a 1px border (#DADCE0). On focus, the border thickens to 2px and changes to Google Blue. Labels should be floating or positioned closely above the field in Inter 12px Medium.
- **Chips:** Highly rounded (pill-shaped) with a light grey background for filters or status tags. Active states use a light tint of the Primary Blue.
- **Lists:** Clean rows separated by 1px light grey lines or simply by whitespace. Avoid heavy dividers; use 16px of vertical padding per list item to maintain the "Edu" focus.
- **Workspace Specifics:** Progress bars (for course completion) should use Google Green, and warning banners for deadlines should use Google Red with high transparency backgrounds.