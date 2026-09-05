import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from './ArabicText';
import colors from '../constants/colors';

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

type Coordinate = [number, number];
type Props = { coordinate: Coordinate; onSelect: (coordinate: Coordinate) => void };
export default function AddressMapPicker({ coordinate, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const next: Coordinate = [position.coords.longitude, position.coords.latitude];
      mapRef.current?.setView([next[1], next[0]], 16, { animate: true });
      onSelect(next);
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  };
  useEffect(() => {
    let disposed = false;
    loadLeaflet().then((L) => {
      if (disposed || !containerRef.current) return;
      const map = L.map(containerRef.current).setView([coordinate[1], coordinate[0]], 13);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: '&copy; Esri' }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, opacity: 1 }).addTo(map);
      map.on('moveend', () => { const position = map.getCenter(); onSelect([position.lng, position.lat]); });
      mapRef.current = map; requestAnimationFrame(() => map.invalidateSize());
    }).catch(() => undefined);
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => { mapRef.current?.panTo([coordinate[1], coordinate[0]], { animate: true }); }, [coordinate]);
  return <View style={styles.frame}><div ref={containerRef} style={styles.map as React.CSSProperties} /><View pointerEvents="none" style={styles.centerPin}><View style={styles.centerPinDot} /></View><View style={styles.mapControls}><Pressable accessibilityLabel="اكتشاف موقعي" onPress={detectLocation} style={styles.mapControl}><Text style={styles.mapControlText}>⌖</Text></Pressable></View><View pointerEvents="none" style={styles.hint}><Text style={styles.hintText}>حرّك الخريطة حتى تصل العلامة إلى العنوان</Text></View></View>;
}
const styles = StyleSheet.create({ frame: { flex: 1, overflow: 'hidden', backgroundColor: '#E8F2EE' }, map: { position: 'absolute', inset: 0 }, centerPin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -14, marginTop: -28, width: 28, height: 36, borderRadius: 18, backgroundColor: colors.light.primary, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, elevation: 4 }, centerPinDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' }, mapControls: { position: 'absolute', top: 14, right: 14 }, mapControl: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 }, mapControlText: { color: colors.light.primary, fontSize: 22, fontWeight: '800' }, hint: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.92)' }, hintText: { color: colors.light.ink, fontSize: 10, textAlign: 'center', fontWeight: '700' } });
