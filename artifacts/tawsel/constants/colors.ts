/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#171717',
    tint: '#F97316',
    background: '#FCFBF8',
    foreground: '#171717',
    card: '#FFFFFF',
    cardForeground: '#171717',
    primary: '#F97316',
    primaryForeground: '#FFFFFF',
    secondary: '#FFF1E6',
    secondaryForeground: '#9A4A11',
    muted: '#F4F1EE',
    mutedForeground: '#817B76',
    accent: '#F5B944',
    accentForeground: '#5E3A08',
    destructive: '#B42318',
    destructiveForeground: '#FFFFFF',
    border: '#EAE5DF',
    input: '#E3DDD6',
    ink: '#171717',
    cream: '#FCFBF8',
    coral: '#FBE7E3',
    green: '#2D936C',
    paleGreen: '#E7F3EE',
    shadow: '#24120F',
  },
  dark: {
    text: '#F5F5F5',
    tint: '#FB923C',
    background: '#111315',
    foreground: '#F5F5F5',
    card: '#1A1D20',
    cardForeground: '#F5F5F5',
    primary: '#F97316',
    primaryForeground: '#FFFFFF',
    secondary: '#2C211A',
    secondaryForeground: '#FFD9BE',
    muted: '#1D2023',
    mutedForeground: '#B2ABAA',
    accent: '#F5B944',
    accentForeground: '#201508',
    destructive: '#F87171',
    destructiveForeground: '#1B0D0D',
    border: '#2B2F34',
    input: '#24292D',
    ink: '#F9FAFB',
    cream: '#111315',
    coral: '#3A2527',
    green: '#54D2A0',
    paleGreen: '#122A22',
    shadow: '#000000',
  },
  radius: 16,
};

export default colors;
