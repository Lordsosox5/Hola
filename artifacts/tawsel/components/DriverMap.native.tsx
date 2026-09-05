import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, UrlTile, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ArabicText as Text } from './ArabicText';
import colors from '../constants/colors';
import type { Coordinate, DriverMapProps } from './DriverMap.types';

const MAP_RED = '#E53935';
const toLatLng = ([longitude, latitude]: Coordinate) => ({ latitude, longitude });
const initialRegion = (driver: Coordinate, client: Coordinate): Region => ({
  latitude: (driver[1] + client[1]) / 2,
  longitude: (driver[0] + client[0]) / 2,
  latitudeDelta: Math.max(0.012, Math.abs(driver[1] - client[1]) * 1.8),
  longitudeDelta: Math.max(0.012, Math.abs(driver[0] - client[0]) * 1.8),
});

export default function DriverMap({ expanded = false, driverCoordinate, clientCoordinate, pickupCoordinate, pickupLabel, routeCoordinates = [driverCoordinate, clientCoordinate], routeProgress = 0, isFollowing = false, onToggleFollow, driverLabel, clientLabel, distanceLabel, style }: DriverMapProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(() => initialRegion(driverCoordinate, clientCoordinate));
  const driver = toLatLng(driverCoordinate);
  const client = toLatLng(clientCoordinate);
  const pickup = pickupCoordinate ? toLatLng(pickupCoordinate) : null;
  const route = routeCoordinates.map(toLatLng);
  const progress = Math.max(0, Math.min(1, routeProgress));
  const routeEnd = route[route.length - 1] ?? client;

  useEffect(() => {
    if (isFollowing) {
      mapRef.current?.animateToRegion({ ...region, latitude: driver.latitude, longitude: driver.longitude }, 220);
    }
  }, [driver.latitude, driver.longitude, isFollowing]);

  const fitBothLocations = () => {
    mapRef.current?.fitToCoordinates([driver, client], { edgePadding: { top: expanded ? 130 : 55, right: 55, bottom: expanded ? 150 : 55, left: 55 }, animated: true });
  };

  return (
    <View style={[styles.frame, expanded && styles.frameExpanded, style]}>
      <MapView ref={mapRef} style={styles.map} initialRegion={region} onRegionChangeComplete={setRegion} showsCompass={false} toolbarEnabled={false} rotateEnabled={false} pitchEnabled={false} loadingEnabled>
        <UrlTile urlTemplate="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png" maximumZ={19} flipY={false} tileSize={256} shouldReplaceMapContent={false} zIndex={1} />
        <Polyline coordinates={route} strokeColor="#FFFFFF" strokeWidth={expanded ? 9 : 7} lineCap="round" lineJoin="round" zIndex={3} />
        <Polyline coordinates={route.slice(0, Math.max(2, Math.ceil(route.length * Math.max(progress, 0.05)))).concat([toLatLng(driverCoordinate)])} strokeColor={MAP_RED} strokeWidth={expanded ? 5 : 4} lineCap="round" lineJoin="round" zIndex={4} />
        <Marker coordinate={driver} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.driverMarker}><Ionicons name="bicycle" size={18} color="#fff" /></View>
        </Marker>
        <Marker coordinate={client} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <View style={styles.destinationMarker}><Ionicons name="location" size={17} color="#fff" /></View>
        </Marker>
        {pickup ? <Marker coordinate={pickup} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} title={pickupLabel}>
          <View style={styles.pickupMarker}><Ionicons name="restaurant" size={16} color="#fff" /></View>
        </Marker> : null}
        <Circle center={driver} radius={24} strokeColor="rgba(229,57,53,.25)" fillColor="rgba(229,57,53,.08)" zIndex={2} />
      </MapView>
      <View pointerEvents="none" style={styles.areaLabel}><Text style={styles.areaLabelText}>Tawsel map</Text></View>
      <View pointerEvents="none" style={styles.destinationLabel}><View style={styles.destinationDot} /><Text style={styles.destinationLabelText}>{clientLabel}</Text></View>
      <View pointerEvents="none" style={styles.distance}><Text style={styles.distanceText}>{distanceLabel}</Text></View>
      <View style={styles.mapControls}>
        <Pressable accessibilityLabel="تكبير الخريطة" onPress={() => mapRef.current?.animateCamera({ zoom: Math.min(19, (region.latitudeDelta ? 14 : 14) + 1) }, { duration: 180 })} style={styles.mapControl}><Ionicons name="add" size={20} color={colors.light.ink} /></Pressable>
        <Pressable accessibilityLabel="تصغير الخريطة" onPress={() => mapRef.current?.animateCamera({ zoom: 11 }, { duration: 180 })} style={styles.mapControl}><Ionicons name="remove" size={20} color={colors.light.ink} /></Pressable>
        <Pressable accessibilityLabel="إظهار السائق وعنوان التوصيل" onPress={fitBothLocations} style={styles.mapControl}><Ionicons name="locate-outline" size={18} color={MAP_RED} /></Pressable>
      </View>
      {expanded && onToggleFollow ? <Pressable accessibilityRole="button" accessibilityLabel={isFollowing ? 'Stop following driver' : 'Follow driver'} onPress={onToggleFollow} style={styles.followButton}><Ionicons name={isFollowing ? 'locate' : 'locate-outline'} size={17} color={MAP_RED} /><Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow driver'}</Text></Pressable> : null}
      <View pointerEvents="none" style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap contributors</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 190, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F4F5F3', position: 'relative' },
  frameExpanded: { flex: 1, minHeight: 1, height: 'auto', width: '100%', marginHorizontal: 0, borderRadius: 0 },
  map: { flex: 1 },
  driverMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.ink, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#18303D', shadowOpacity: 0.28, shadowRadius: 8, elevation: 5 },
  destinationMarker: { width: 42, height: 48, borderRadius: 23, backgroundColor: MAP_RED, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: MAP_RED, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  pickupMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: MAP_RED, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: MAP_RED, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  areaLabel: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.94)' },
  areaLabelText: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '800' },
  destinationLabel: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5, shadowColor: '#18303D', shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  destinationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: MAP_RED },
  destinationLabelText: { color: colors.light.ink, fontSize: 9, fontWeight: '800' },
  distance: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: '#fff' },
  distanceText: { color: MAP_RED, fontSize: 9, fontWeight: '800' },
  mapControls: { position: 'absolute', top: 60, left: 12, gap: 7 },
  mapControl: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#18303D', shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  followButton: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5, shadowColor: '#18303D', shadowOpacity: 0.14, shadowRadius: 7, elevation: 3 },
  followButtonText: { color: MAP_RED, fontSize: 9, fontWeight: '800' },
  attribution: { position: 'absolute', bottom: 2, right: 5, paddingHorizontal: 4, backgroundColor: 'rgba(255,255,255,.78)' },
  attributionText: { color: colors.light.mutedForeground, fontSize: 7 },
});
