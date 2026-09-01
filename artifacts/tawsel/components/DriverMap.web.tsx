import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as maplibregl from 'maplibre-gl';

import colors from '../constants/colors';
import { routeThroughProgress, type DriverMapProps } from './DriverMap.types';

const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const MAPLIBRE_CSS = `
.maplibregl-ctrl-group { border: 0 !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 3px 12px rgba(23,23,23,.14) !important; }
.maplibregl-ctrl button { width: 30px !important; height: 30px !important; }
.maplibregl-ctrl-attrib { font-size: 8px !important; border-radius: 6px; opacity: .8; }
`;

export default function DriverMap({
  expanded = false,
  driverCoordinate,
  clientCoordinate,
  routeCoordinates = [driverCoordinate, clientCoordinate],
  routeProgress = 0,
  isFollowing = false,
  onToggleFollow,
  driverLabel,
  clientLabel,
  distanceLabel,
  style,
}: DriverMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const clientMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const styleTag = document.createElement('style');
    styleTag.textContent = `${MAPLIBRE_CSS}
      .tawsel-driver-marker { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: ${colors.light.ink}; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(30,66,84,.32); }
      .tawsel-driver-marker span { color: #fff; font-size: 19px; line-height: 1; transform: rotate(-45deg); display: block; }
      .tawsel-client-marker { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: rgba(201,20,44,.18); }
      .tawsel-client-marker span { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: ${colors.light.primary}; border: 3px solid #fff; font-size: 11px; box-sizing: border-box; }
    `;
    document.head.appendChild(styleTag);

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE_URL,
      center: [(driverCoordinate[0] + clientCoordinate[0]) / 2, (driverCoordinate[1] + clientCoordinate[1]) / 2],
      zoom: expanded ? 13.1 : 12.8,
      attributionControl: { compact: true },
      dragRotate: false,
      touchPitch: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const driverElement = document.createElement('div');
    driverElement.className = 'tawsel-driver-marker';
    driverElement.innerHTML = '<span>➤</span>';
    const clientElement = document.createElement('div');
    clientElement.className = 'tawsel-client-marker';
    clientElement.innerHTML = '<span>●</span>';
    mapRef.current = map;
    driverMarkerRef.current = new maplibregl.Marker({ element: driverElement, anchor: 'center' }).setLngLat(driverCoordinate).addTo(map);
    clientMarkerRef.current = new maplibregl.Marker({ element: clientElement, anchor: 'center' }).setLngLat(clientCoordinate).addTo(map);

    const addRouteLayers = () => {
      if (map.getSource('driver-route')) return;
      map.addSource('driver-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: routeCoordinates },
        },
      });
      map.addSource('driver-completed-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: routeThroughProgress(routeCoordinates, routeProgress, driverCoordinate) },
        },
      });
      map.addLayer({
        id: 'driver-route-line',
        type: 'line',
        source: 'driver-route',
        paint: {
          'line-color': colors.light.border,
          'line-width': expanded ? 5 : 4,
          'line-opacity': 0.75,
          'line-dasharray': [1.2, 1.1],
        },
      });
      map.addLayer({
        id: 'driver-completed-route-line',
        type: 'line',
        source: 'driver-completed-route',
        paint: {
          'line-color': colors.light.primary,
          'line-width': expanded ? 5 : 4,
          'line-opacity': 0.95,
        },
      });
    };

    if (map.isStyleLoaded()) {
      addRouteLayers();
    } else {
      map.once('load', addRouteLayers);
    }

    return () => {
      driverMarkerRef.current?.remove();
      clientMarkerRef.current?.remove();
      driverMarkerRef.current = null;
      clientMarkerRef.current = null;
      mapRef.current = null;
      map.remove();
      styleTag.remove();
    };
  }, [expanded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncMap = () => {
      const routeSource = map.getSource('driver-route') as maplibregl.GeoJSONSource | undefined;
      const completedRouteSource = map.getSource('driver-completed-route') as maplibregl.GeoJSONSource | undefined;
      routeSource?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeCoordinates },
      });
      completedRouteSource?.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeThroughProgress(routeCoordinates, routeProgress, driverCoordinate),
        },
      });
      driverMarkerRef.current?.setLngLat(driverCoordinate);
      clientMarkerRef.current?.setLngLat(clientCoordinate);
      if (isFollowing) {
        map.easeTo({ center: driverCoordinate, duration: 180, zoom: expanded ? 14.2 : 13.1 });
      }
    };

    if (map.isStyleLoaded()) {
      syncMap();
    } else {
      map.once('load', syncMap);
      return () => {
        map.off('load', syncMap);
      };
    }
  }, [clientCoordinate[0], clientCoordinate[1], driverCoordinate[0], driverCoordinate[1], expanded, isFollowing, routeProgress, routeCoordinates]);

  return (
    <View style={[styles.frame, expanded && styles.frameExpanded, style]}>
      <div ref={containerRef} style={styles.mapContainer as React.CSSProperties} />
      <View pointerEvents="none" style={styles.areaLabel}><Text style={styles.areaLabelText}>MapLibre · Khartoum</Text></View>
      <View pointerEvents="none" style={styles.clientLabel}><View style={styles.clientDot} /><Text style={styles.clientLabelText}>{clientLabel}</Text></View>
      <View pointerEvents="none" style={styles.distance}><Text style={styles.distanceText}>{distanceLabel}</Text></View>
      <View pointerEvents="none" style={styles.driverLabel}><Text style={styles.driverLabelText}>{driverLabel}</Text></View>
      {expanded && onToggleFollow ? (
        <Pressable accessibilityRole="button" accessibilityLabel={isFollowing ? 'Stop following driver' : 'Follow driver'} onPress={onToggleFollow} style={styles.followButton}>
          <Text style={styles.followButtonIcon}>{isFollowing ? '◎' : '⊙'}</Text>
          <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow driver'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 190, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.light.paleGreen, position: 'relative' },
  frameExpanded: { height: 282 },
  mapContainer: { position: 'absolute', inset: 0 },
  areaLabel: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' },
  areaLabelText: { color: colors.light.mutedForeground, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
  clientLabel: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 },
  clientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.light.primary },
  clientLabelText: { color: colors.light.ink, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
  distance: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff' },
  distanceText: { color: colors.light.primary, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
  driverLabel: { position: 'absolute', left: 12, top: 43, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.9)' },
  driverLabelText: { color: colors.light.ink, fontSize: 8, fontWeight: '700', fontFamily: 'IBM Arabic' },
  followButton: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 },
  followButtonIcon: { color: colors.light.primary, fontSize: 17, lineHeight: 17, fontWeight: '800', fontFamily: 'IBM Arabic' },
  followButtonText: { color: colors.light.primary, fontSize: 9, fontWeight: '800', fontFamily: 'IBM Arabic' },
});