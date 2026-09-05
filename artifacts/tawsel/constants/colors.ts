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
    text: '#241821',
    tint: '#5B1F4D',
    background: '#FCFBF8',
    foreground: '#241821',
    card: '#FFFFFF',
    cardForeground: '#241821',
    primary: '#5B1F4D',
    primaryForeground: '#FFFFFF',
    secondary: '#F3E6EF',
    secondaryForeground: '#6E285C',
    muted: '#F4F1EE',
    mutedForeground: '#817B76',
    accent: '#F5B944',
    accentForeground: '#5E3A08',
    destructive: '#B42318',
    destructiveForeground: '#FFFFFF',
    border: '#EAE5DF',
    input: '#E3DDD6',
    ink: '#241821',
    cream: '#FCFBF8',
    coral: '#F8E5EF',
    green: '#2D936C',
    paleGreen: '#E7F3EE',
    shadow: '#2B1225',
  },
  radius: 16,
};

export default colors;
