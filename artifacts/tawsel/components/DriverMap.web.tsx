import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from './ArabicText';
import colors from '../constants/colors';
import { routeThroughProgress, type DriverMapProps } from './DriverMap.types';

const MAP_RED = '#E53935';
declare global { interface Window { L?: any } }
const cssUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const jsUrl = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let leafletPromise: Promise<any> | null = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${cssUrl}"]`)) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = cssUrl; document.head.appendChild(link); }
    const existing = document.querySelector(`script[src="${jsUrl}"]`) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => resolve(window.L)); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script'); script.src = jsUrl; script.async = true; script.onload = () => resolve(window.L); script.onerror = reject; document.head.appendChild(script);
  });
  return leafletPromise;
}

export default function DriverMap({ expanded = false, driverCoordinate, clientCoordinate, pickupCoordinate, pickupLabel, routeCoordinates = [driverCoordinate, clientCoordinate], routeProgress = 0, isFollowing = false, onToggleFollow, driverLabel, clientLabel, distanceLabel, style }: DriverMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const clientMarkerRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const completedRouteRef = useRef<any>(null);
  const userMovedMapRef = useRef(false);
  useEffect(() => {
    let disposed = false;
    loadLeaflet().then((L) => {
      if (disposed || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true }).setView([driverCoordinate[1], driverCoordinate[0]], expanded ? 13.1 : 12.8);
      map.on('dragstart', () => { userMovedMapRef.current = true; });
      const markerStyle = document.createElement('style');
      markerStyle.textContent = `
        .tawsel-driver-marker, .tawsel-destination-marker { display: grid; place-items: center; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(24,48,61,.28); color: #fff; }
        .tawsel-driver-marker { width: 38px; height: 38px; border-radius: 50%; background: ${colors.light.ink}; font-size: 18px; }
        .tawsel-destination-marker { width: 42px; height: 42px; border-radius: 50% 50% 50% 8px; transform: rotate(-45deg); background: ${MAP_RED}; }
        .tawsel-destination-marker span { transform: rotate(45deg); font-size: 16px; }
        .tawsel-pickup-marker { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: ${MAP_RED}; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(229,57,53,.28); color: #fff; font-size: 16px; }
        .leaflet-control-zoom { border: 0 !important; border-radius: 12px !important; overflow: hidden; box-shadow: 0 3px 12px rgba(24,48,61,.16) !important; }
        .leaflet-control-zoom a { color: ${colors.light.ink} !important; background: #fff !important; border-bottom-color: ${colors.light.border} !important; }
        .tawsel-map-control { color: ${MAP_RED}; }
      `;
      document.head.appendChild(markerStyle);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: '&copy; Esri' }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, opacity: 1 }).addTo(map);
      const driverIcon = L.divIcon({ className: 'tawsel-driver-marker', html: '<span>➤</span>', iconSize: [38, 38], iconAnchor: [19, 19] });
      const destinationIcon = L.divIcon({ className: 'tawsel-destination-marker', html: '<span>●</span>', iconSize: [42, 42], iconAnchor: [12, 36] });
      const pickupIcon = L.divIcon({ className: 'tawsel-pickup-marker', html: '<span>●</span>', iconSize: [36, 36], iconAnchor: [18, 18] });
      driverMarkerRef.current = L.marker([driverCoordinate[1], driverCoordinate[0]], { icon: driverIcon }).addTo(map);
      clientMarkerRef.current = L.marker([clientCoordinate[1], clientCoordinate[0]], { icon: destinationIcon }).addTo(map);
      if (pickupCoordinate) L.marker([pickupCoordinate[1], pickupCoordinate[0]], { icon: pickupIcon, title: pickupLabel }).addTo(map);
      routeRef.current = L.polyline(routeCoordinates.map(([lng, lat]) => [lat, lng]), { color: '#fff', weight: expanded ? 9 : 7, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      completedRouteRef.current = L.polyline(routeThroughProgress(routeCoordinates, routeProgress, driverCoordinate).map(([lng, lat]) => [lat, lng]), { color: MAP_RED, weight: expanded ? 5 : 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      if (expanded) {
        map.fitBounds([[driverCoordinate[1], driverCoordinate[0]], [clientCoordinate[1], clientCoordinate[0]]], { padding: [90, 90], maxZoom: 14, animate: false });
        userMovedMapRef.current = true;
      }
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize());
    }).catch(() => undefined);
    return () => { disposed = true; driverMarkerRef.current?.remove(); clientMarkerRef.current?.remove(); mapRef.current?.remove(); document.querySelectorAll('style').forEach((style) => { if (style.textContent?.includes('tawsel-driver-marker')) style.remove(); }); mapRef.current = null; driverMarkerRef.current = null; clientMarkerRef.current = null; routeRef.current = null; completedRouteRef.current = null; };
  }, [expanded]);
  useEffect(() => {
    if (!mapRef.current) return;
    driverMarkerRef.current?.setLatLng([driverCoordinate[1], driverCoordinate[0]]);
    clientMarkerRef.current?.setLatLng([clientCoordinate[1], clientCoordinate[0]]);
    routeRef.current?.setLatLngs(routeCoordinates.map(([lng, lat]) => [lat, lng]));
    completedRouteRef.current?.setLatLngs(routeThroughProgress(routeCoordinates, routeProgress, driverCoordinate).map(([lng, lat]) => [lat, lng]));
    if (isFollowing || !userMovedMapRef.current) mapRef.current.setView([driverCoordinate[1], driverCoordinate[0]], expanded ? 14.2 : 13.1, { animate: false });
  }, [clientCoordinate, driverCoordinate, expanded, isFollowing, routeCoordinates, routeProgress]);
  useEffect(() => {
    const route = routeCoordinates;
    if (route.length < 2 || !routeRef.current) return;
    const controller = new AbortController();
    fetch(`https://router.project-osrm.org/route/v1/driving/${route[0][0]},${route[0][1]};${route[route.length - 1][0]},${route[route.length - 1][1]}?overview=full&geometries=geojson`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => { const coordinates = result.routes?.[0]?.geometry?.coordinates; if (Array.isArray(coordinates)) routeRef.current?.setLatLngs(coordinates.map(([lng, lat]: [number, number]) => [lat, lng])); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [routeCoordinates]);
  return <View style={[styles.frame, expanded && styles.frameExpanded, style]}><div ref={containerRef} style={styles.mapContainer as React.CSSProperties} /><View pointerEvents="none" style={styles.areaLabel}><Text style={styles.areaLabelText}>Tawsel map</Text></View><View pointerEvents="none" style={styles.clientLabel}><View style={styles.clientDot} /><Text style={styles.clientLabelText}>{clientLabel}</Text></View><View pointerEvents="none" style={styles.distance}><Text style={styles.distanceText}>{distanceLabel}</Text></View><View pointerEvents="none" style={styles.driverLabel}><Text style={styles.driverLabelText}>{driverLabel}</Text></View><View style={styles.mapControls}><Pressable accessibilityLabel="إظهار الموقع الحالي للسائق" onPress={() => { userMovedMapRef.current = false; mapRef.current?.setView([driverCoordinate[1], driverCoordinate[0]], expanded ? 14.2 : 13.1, { animate: true }); }} style={styles.mapControl}><Text style={styles.mapControlText}>⌖</Text></Pressable></View>{expanded && onToggleFollow ? <Pressable accessibilityRole="button" accessibilityLabel={isFollowing ? 'Stop following driver' : 'Follow driver'} onPress={onToggleFollow} style={styles.followButton}><Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow driver'}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ frame: { height: 190, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.light.paleGreen, position: 'relative' }, frameExpanded: { flex: 1, minHeight: 1, height: 'auto', width: '100%', marginHorizontal: 0, borderRadius: 0 }, mapContainer: { position: 'absolute', inset: 0 }, areaLabel: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' }, areaLabelText: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '800' }, clientLabel: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 }, clientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.light.primary }, clientLabelText: { color: colors.light.ink, fontSize: 9, fontWeight: '800' }, distance: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff' }, distanceText: { color: colors.light.primary, fontSize: 9, fontWeight: '800' }, driverLabel: { position: 'absolute', left: 12, top: 43, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.9)' }, driverLabelText: { color: colors.light.ink, fontSize: 8, fontWeight: '700' }, followButton: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff' }, followButtonText: { color: colors.light.primary, fontSize: 9, fontWeight: '800' }, mapControls: { position: 'absolute', top: 58, left: 12 }, mapControl: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, mapControlText: { color: colors.light.primary, fontSize: 22, fontWeight: '800' } });
