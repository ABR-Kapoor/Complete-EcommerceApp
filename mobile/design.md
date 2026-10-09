# AuraMart Design System

This document outlines the core aesthetic and design language used throughout the AuraMart mobile application. This UI is intended to be implemented across all screens to ensure a consistent, beautiful, and "alive" experience for users.

## 1. Core Brand Colors
The brand relies on a fresh, vibrant "Grocery Green" aesthetic with clean white backgrounds.
- **Primary Green (`colors.primary`)**: `#11A559` - Used for primary buttons, highlighted text (e.g. "Create" in "Create Account"), bottom borders of focused inputs, and the massive curved top headers.
- **Primary Light**: `#22C55E` - Used for soft highlights.
- **Primary Dark**: `#15803D` - Used for pressed states.
- **Background**: `#FFFFFF` - The main app body should always be clean white to make the green pop.

## 2. Top Curved Header
Instead of a simple flat header, the top of the auth screens (and potentially user profile screens) features a **massive green curved block**.
- **Implementation**: This is achieved by creating an absolute positioned `<View>` that is intentionally oversized (`top: -100`, `left: -50`, `right: -50`) with an extremely large border radius at the bottom:
  ```css
  borderBottomLeftRadius: 200,
  borderBottomRightRadius: 200,
  backgroundColor: colors.primary
  ```
- **Content**: Illustrations or icons sit inside this green curve in white to stand out.

## 3. Typography
- **Headings**: `Outfit_700Bold` and `Outfit_600SemiBold`.
  - Titles often use a dual-color approach. E.g., `Hello ` (Green) + `Again!` (Dark Gray). This makes headings feel dynamic and personalized.
  - Size: ~28px for screen titles.
- **Subtitles**: `Inter_400Regular`.
  - Small (14px), gray (`colors.textTertiary`), centered, to guide the user without dominating the visual hierarchy.

## 4. Input Fields
Inputs are minimalist. They do **not** use full borders or boxes.
- **Labels**: Small (12px), gray text floating above the input.
- **Input Line**: 
  - Resting state: A single 1px bottom border (`borderBottomWidth: 1`, color: `#E0EAE8`).
  - Focused state: The bottom border thickens to 2px and changes to the Primary Green (`#11A559`).
- No background color on the inputs. They sit directly on the white app background.

## 5. Buttons
- **Primary Action (Sign In / Sign Up)**:
  - Solid Primary Green (`#11A559`).
  - White, bold text.
  - Medium border radius (`borderRadius: 12px` or `16px`).
  - No shadows. Keep it flat and modern.
- **Secondary Action (Sign in with Google)**:
  - Very light gray background (`#F3F4F6`).
  - Dark gray text.
  - Same border radius as the primary button.
  - Accompanied by the colored Google icon.
- **Text Links (Forgot Password / Create Account)**:
  - Usually Primary Green if it's the main call-to-action link.
  - Small (12px-14px), `Inter_500Medium`.

## 6. Animations (The "Alive" Feel)
We use `react-native-reanimated` heavily to make the screens feel organic.
- **Staggered Entry**:
  - The top curved header falls in slowly from the top: `FadeInDown.duration(800).springify()`.
  - The main form container bubbles up from below with a slight delay: `FadeInUp.duration(600).delay(300).springify().damping(14)`.
- This ensures that when the user navigates between screens, the UI elegantly pieces itself together rather than flashing instantly.

## Next Steps for the Rest of the App
- **Tabs/Navigation**: Ensure the bottom tab bar uses an active tint color of `#11A559` and inactive of gray.
- **Cards/Products**: Product cards should have a white background, very subtle shadow (or light gray 1px border), with vibrant green "Add to Cart" buttons.
- **Headers**: Internal app screens can either use a smaller version of the top green curve or a standard white header with a green back-arrow icon.
