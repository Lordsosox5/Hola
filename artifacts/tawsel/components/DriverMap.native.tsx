import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import colors from '../constants/colors';
import { type DriverMapProps } from './DriverMap.types';

export default function DriverMap({
  expanded = false,
  driverCoordinate,
  clientCoordinate,
  isFollowing = false,
  onToggleFollow,
  driverLabel,
  clientLabel,
  distanceLabel,
  style,
}: DriverMapProps) {
  return (
    <View style={[styles.frame, expanded && styles.frameExpanded, style]}>
      <View style={styles.mapBackdrop} />
      <View style={styles.route} />
      <View style={styles.routeProgress} />

      <View style={styles.driverMarker}><Ionicons name="navigate" size={18} color="#fff" /></View>
      <View style={styles.clientMarker}><View style={styles.clientMarkerInner}><Text style={styles.clientGlyph}>●</Text></View></View>

      <View pointerEvents="none" style={styles.areaLabel}><Text style={styles.areaLabelText}>Map · Khartoum</Text></View>
      <View pointerEvents="none" style={styles.clientLabel}><View style={styles.clientDot} /><Text style={styles.clientLabelText}>{clientLabel}</Text></View>
      <View pointerEvents="none" style={styles.distance}><Text style={styles.distanceText}>{distanceLabel}</Text></View>
      <View pointerEvents="none" style={styles.driverLabel}><Text style={styles.driverLabelText}>{driverLabel}</Text></View>

      {expanded && onToggleFollow ? (
        <Pressable accessibilityRole="button" accessibilityLabel={isFollowing ? 'Stop following driver' : 'Follow driver'} onPress={onToggleFollow} style={styles.followButton}>
          <Ionicons name={isFollowing ? 'locate' : 'locate-outline'} size={17} color={colors.light.primary} />
          <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow driver'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 190, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.light.paleGreen, position: 'relative' },
  frameExpanded: { height: 282 },
  mapBackdrop: { position: 'absolute', inset: 0, backgroundColor: '#edf4ee' },
  route: {
    position: 'absolute',
    left: 36,
    right: 38,
    top: 40,
    bottom: 36,
    borderWidth: 3,
    borderColor: 'rgba(23, 23, 23, 0.12)',
    borderRadius: 18,
    transform: [{ rotate: '-18deg' }],
    borderStyle: 'dashed',
  },
  routeProgress: {
    position: 'absolute',
    left: 52,
    right: 70,
    top: 60,
    bottom: 52,
    borderWidth: 4,
    borderColor: colors.light.primary,
    borderRadius: 18,
    transform: [{ rotate: '-18deg' }],
    borderStyle: 'solid',
  },
  areaLabel: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' },
  areaLabelText: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
  clientLabel: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 },
  clientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.light.primary },
  clientLabelText: { color: colors.light.ink, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
  distance: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff' },
  distanceText: { color: colors.light.primary, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
  driverLabel: { position: 'absolute', left: 12, top: 43, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.9)' },
  driverLabelText: { color: colors.light.ink, fontSize: 8, fontWeight: '700', fontFamily: 'IBM Arabic' },
  driverMarker: {
    position: 'absolute',
    left: 26,
    top: 116,
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: colors.light.ink,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  clientMarker: {
    position: 'absolute',
    right: 38,
    top: 44,
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(249,115,22,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientMarkerInner: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: colors.light.primary,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientGlyph: { color: '#fff', fontSize: 12, fontFamily: 'IBM Arabic' },
  followButton: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 },
  followButtonText: { color: colors.light.primary, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
});