import { Platform } from 'react-native';

const AddressMapPickerImpl = Platform.OS === 'web'
  ? require('./AddressMapPicker.web').default
  : require('./AddressMapPicker.native').default;

export default AddressMapPickerImpl;
