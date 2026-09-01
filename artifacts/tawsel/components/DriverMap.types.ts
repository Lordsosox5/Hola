import type { StyleProp, ViewStyle } from 'react-native';

export type Coordinate = [number, number];

export type DriverMapProps = {
  expanded?: boolean;
  driverCoordinate: Coordinate;
  clientCoordinate: Coordinate;
  routeCoordinates?: Coordinate[];
  routeProgress?: number;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  driverLabel: string;
  clientLabel: string;
  distanceLabel: string;
  style?: StyleProp<ViewStyle>;
};

export function pointAlongRoute(route: Coordinate[], progress: number): Coordinate {
  if (route.length === 0) return [0, 0];
  if (route.length === 1) return route[0];

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const segmentPosition = clampedProgress * (route.length - 1);
  const segmentIndex = Math.min(Math.floor(segmentPosition), route.length - 2);
  const segmentProgress = segmentPosition - segmentIndex;
  const start = route[segmentIndex];
  const end = route[segmentIndex + 1];

  return [
    start[0] + (end[0] - start[0]) * segmentProgress,
    start[1] + (end[1] - start[1]) * segmentProgress,
  ];
}

export function routeThroughProgress(
  route: Coordinate[],
  progress: number,
  currentCoordinate: Coordinate,
): Coordinate[] {
  if (route.length < 2) return [currentCoordinate, currentCoordinate];

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const segmentIndex = Math.min(
    Math.floor(clampedProgress * (route.length - 1)),
    route.length - 2,
  );
  const completed = route.slice(0, segmentIndex + 1);
  const last = completed[completed.length - 1];

  if (!last || last[0] !== currentCoordinate[0] || last[1] !== currentCoordinate[1]) {
    completed.push(currentCoordinate);
  }

  return completed.length >= 2 ? completed : [currentCoordinate, currentCoordinate];
}