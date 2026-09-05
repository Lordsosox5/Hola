import React from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
} from 'react-native';

const IBM_ARABIC = 'IBMPlexSansArabic';
const IBM_ARABIC_MEDIUM = 'IBMPlexSansArabicMedium';
const IBM_ARABIC_SEMIBOLD = 'IBMPlexSansArabicSemiBold';
const IBM_ARABIC_BOLD = 'IBMPlexSansArabicBold';

function fontForWeight(weight: unknown) {
  const normalized = String(weight ?? '400').toLowerCase();
  if (normalized === 'bold' || ['700', '800', '900'].includes(normalized)) return IBM_ARABIC_BOLD;
  if (normalized === '600' || normalized === 'semibold') return IBM_ARABIC_SEMIBOLD;
  if (normalized === '500' || normalized === 'medium') return IBM_ARABIC_MEDIUM;
  return IBM_ARABIC;
}

export function ArabicText({ style, ...props }: React.ComponentProps<typeof NativeText>) {
  const flattened = StyleSheet.flatten(style as never) as Record<string, unknown> | undefined;
  return (
    <NativeText
      {...props}
      style={[style, { fontFamily: fontForWeight(flattened?.fontWeight), fontWeight: '400' } as never]}
    />
  );
}

export function ArabicTextInput({ style, ...props }: React.ComponentProps<typeof NativeTextInput>) {
  const flattened = StyleSheet.flatten(style as never) as Record<string, unknown> | undefined;
  return (
    <NativeTextInput
      {...props}
      style={[style, { fontFamily: fontForWeight(flattened?.fontWeight), fontWeight: '400' } as never]}
    />
  );
}
