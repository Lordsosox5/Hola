import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { UrlTile, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ArabicText as Text } from './ArabicText';
import colors from '../constants/colors';

type Coordinate = [number, number];
type Props = { coordinate: Coordinate; onSelect: (coordinate: Coordinate) => void };
const toRegion = ([longitude, latitude]: Coordinate): Region => ({ latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 });

export default function AddressMapPicker({ coordinate, onSelect }: Props) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(() => toRegion(coordinate));
  useEffect(() => { mapRef.current?.animateToRegion(toRegion(coordinate), 180); }, [coordinate]);
  const detectLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) return;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const next: Coordinate = [position.coords.longitude, position.coords.latitude];
    mapRef.current?.animateToRegion(toRegion(next), 250);
    onSelect(next);
  };
  const updateSelection = (next: Region) => { setRegion(next); onSelect([next.longitude, next.latitude]); };
  return (
    <View style={styles.frame}>
      <MapView ref={mapRef} style={styles.map} initialRegion={region} onRegionChangeComplete={updateSelection} showsCompass={false} toolbarEnabled={false} rotateEnabled={false} pitchEnabled={false}>
        <UrlTile urlTemplate="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png" maximumZ={19} flipY={false} tileSize={256} shouldReplaceMapContent={false} zIndex={1} />
      </MapView>
      <View pointerEvents="none" style={styles.centerPin}><View style={styles.centerPinDot} /></View>
      <View style={styles.mapControls}><Pressable accessibilityLabel="اكتشاف موقعي" onPress={() => { void detectLocation(); }} style={styles.mapControl}><Ionicons name="locate-outline" size={21} color={colors.light.primary} /></Pressable></View>
      <View pointerEvents="none" style={styles.hint}><Text style={styles.hintText}>حرّك الخريطة حتى تصل العلامة إلى العنوان</Text></View>
      <View pointerEvents="none" style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap contributors</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden', backgroundColor: '#F4F5F3' },
  map: { flex: 1 },
  centerPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -14, marginTop: -28, width: 28, height: 36, borderRadius: 18, backgroundColor: colors.light.primary, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: colors.light.primary, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5, transform: [{ rotate: '-45deg' }] },
  centerPinDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] },
  mapControls: { position: 'absolute', top: 14, right: 14 },
  mapControl: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#18303D', shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  hint: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.92)' },
  hintText: { color: colors.light.ink, fontSize: 10, textAlign: 'center', fontWeight: '700' },
  attribution: { position: 'absolute', bottom: 2, right: 5, paddingHorizontal: 4, backgroundColor: 'rgba(255,255,255,.78)' },
  attributionText: { color: colors.light.mutedForeground, fontSize: 7 },
});
