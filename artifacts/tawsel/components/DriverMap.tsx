import { Platform } from 'react-native';

const DriverMapImpl =
  Platform.OS === 'web' ? require('./DriverMap.web').default : require('./DriverMap.native').default;

export default DriverMapImpl;
export type { DriverMapProps } from './DriverMap.types';