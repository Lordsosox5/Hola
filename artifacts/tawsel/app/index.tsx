import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSyncUserData } from '@/hooks/useSyncUserData';
import { OrderService, AddressService, FavoritesService, AuthService, ProductService, RestaurantService } from '@/lib/supabase-service';
import { DriverService } from '@/lib/driver-service';
import { supabase } from '@/lib/supabase';
import {
  Image,
  ImageSourcePropType,
  I18nManager,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import colorTokens from '@/constants/colors';
import DriverMap from '../components/DriverMap';
import AddressMapPicker from '../components/AddressMapPicker';
import { pointAlongRoute, type Coordinate } from '../components/DriverMap.types';
import { AdminDashboardScreen } from '../components/AdminDashboardScreen';
import {
  getGetPaymentSubmissionQueryKey,
  setBaseUrl,
  useGetPaymentSubmission,
  useSubmitPayment,
} from '@workspace/api-client-react';

const colors = colorTokens.light;
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
I18nManager.swapLeftAndRightInRTL(true);
setBaseUrl(process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : null);
const IBMPlexSansArabic = 'IBMPlexSansArabic';
const IBMPlexSansArabicMedium = 'IBMPlexSansArabicMedium';
const IBMPlexSansArabicSemiBold = 'IBMPlexSansArabicSemiBold';
const IBMPlexSansArabicBold = 'IBMPlexSansArabicBold';
const LanguageContext = createContext(false);
let activeEnglish = false;

function fontForWeight(weight: unknown) {
  const normalized = String(weight ?? '400').toLowerCase();
  if (normalized === 'bold' || ['700', '800', '900'].includes(normalized)) return IBMPlexSansArabicBold;
  if (normalized === '600' || normalized === 'semibold') return IBMPlexSansArabicSemiBold;
  if (normalized === '500' || normalized === 'medium') return IBMPlexSansArabicMedium;
  return IBMPlexSansArabic;
}

const pizzaImage = require('../assets/images/pizza.jpg');
const burgerImage = require('../assets/images/burger.jpg');
const applesImage = require('../assets/images/apples.jpg');
const logoImage = require('../assets/images/tawsel-icon.png');

type Screen =
  | 'intro'
  | 'login'
  | 'register'
  | 'driverLogin'
  | 'driverRegister'
  | 'home'
  | 'categories'
  | 'restaurant'
  | 'product'
  | 'cart'
  | 'address'
  | 'payment'
  | 'review'
  | 'paymentVerification'
  | 'track'
  | 'orders'
  | 'favorites'
  | 'account'
  | 'settings'
  | 'notifications'
  | 'support'
  | 'driverSupport'
  | 'addresses'
  | 'payments'
  | 'driverDashboard'
  | 'driverDeliveries'
  | 'driverEarnings'
  | 'driverAccount'
  | 'driverSettings'
  | 'driverOrder'
  | 'driverMap'
  | 'adminDashboard';

type Tab = 'home' | 'categories' | 'orders' | 'cart' | 'account';
type DriverTab = 'dashboard' | 'deliveries' | 'earnings' | 'account' | 'settings';
type DriverOrderStatus = 'pending' | 'accepted' | 'pickedUp' | 'delivered' | 'rejected';
type SortOption = 'recommended' | 'price-low' | 'price-high' | 'alphabetical';
type Product = {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  restaurantName?: string;
  restaurantId?: string;
  price: number;
  image: ImageSourcePropType;
  rating: string;
  accent?: string;
  category?: string;
};

type AppDialog = { title: string; message: string } | null;
type CartItem = Product & { quantity: number };
type SavedAddress = { id: string; label: string; value: string; coordinate?: Coordinate };
type OrderStatusPopup = {
  orderId: string;
  items: CartItem[];
  total: number;
  address: string;
  paymentMethod: string;
};

const driverStartLocation: Coordinate = [32.5424, 15.5003];
const clientLocation: Coordinate = [32.5599, 15.5086];
const deliveryRoute: Coordinate[] = [
  driverStartLocation,
  [32.5451, 15.501],
  [32.5472, 15.5042],
  [32.5506, 15.5052],
  [32.5526, 15.507],
  [32.5555, 15.5062],
  [32.5571, 15.509],
  clientLocation,
];
const deliveryDistanceKm = 3.2;

function coordinateFromOrder(order: any): Coordinate {
  const longitude = order?.delivery_longitude ?? order?.longitude ?? order?.customer_longitude;
  const latitude = order?.delivery_latitude ?? order?.latitude ?? order?.customer_latitude;
  if (longitude != null && latitude != null && Number.isFinite(Number(longitude)) && Number.isFinite(Number(latitude))) {
    return [Number(longitude), Number(latitude)];
  }
  const addressNumbers = String(order?.delivery_address ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (addressNumbers.length >= 2 && addressNumbers[0] >= -90 && addressNumbers[0] <= 90 && addressNumbers[1] >= -180 && addressNumbers[1] <= 180) {
    return [addressNumbers[1], addressNumbers[0]];
  }
  return clientLocation;
}

function optionalPickupCoordinate(order: any): Coordinate | undefined {
  const longitude = order?.restaurant_longitude ?? order?.pickup_longitude;
  const latitude = order?.restaurant_latitude ?? order?.pickup_latitude;
  return longitude != null && latitude != null && Number.isFinite(Number(longitude)) && Number.isFinite(Number(latitude))
    ? [Number(longitude), Number(latitude)]
    : undefined;
}

const restaurants: any[] = [];

const products: Product[] = [];

const productCategoryFilters = [
  'الكل',
  'مطاعم',
  'بقالة',
  'مخبوزات',
  'مشروبات',
  'معدات بناء وكهرباء',
  'صيدليات',
  'مستشفيات',
  'هواتف واكسسوارات',
  'بوتيكات وادوات تجميل',
  'هدايا',
  'شقق وفنادق',
  'أخرى',
] as const;

const englishText: Record<string, string> = {
  'طلباتي SD': 'Talabati SD',
  'طلباتك، توصيل بسرعة': 'Your orders, delivered fast',
  'لفترة محدودة': 'Limited time',
  'خصم 20%': '20% off',
  'على أول طلب': 'on your first order',
  'توصيل سريع': 'Fast delivery',
  'اكتشف خدماتنا': 'Explore our services',
  'عرض الكل': 'View all',
  'مطاعم مميزة': 'Featured restaurants',
  'الأكثر طلباً': 'Most ordered',
  'أنشئ حسابك': 'Create your account',
  'مرحباً بك في طلباتي SD': 'Welcome to Talabati SD',
  'ابدأ رحلتك مع أسرع توصيل في مدينتك': 'Start your journey with the fastest delivery in your city',
  'ادخل عالم طلباتك المفضلة': 'Enter a world of your favorite orders',
  'الاسم الكامل': 'Full name',
  'إنشاء الحساب': 'Create account',
  'متابعة': 'Continue',
  'رقم الهاتف مطلوب': 'Phone number required',
  'أدخل رقم هاتفك للمتابعة': 'Enter your phone number to continue',
  'أو': 'or',
  'المتابعة باستخدام Google': 'Continue with Google',
  'بالمتابعة، أنت توافق على': 'By continuing, you agree to the ',
  'الشروط والأحكام': 'Terms & Conditions',
  'سياسة الخصوصية': 'Privacy Policy',
  'لديك حساب بالفعل؟': 'Already have an account? ',
  'ليس لديك حساب؟': "Don't have an account? ",
  'تسجيل الدخول': 'Log in',
  'إنشاء حساب': 'Create account',
  'أهلاً محمد': 'Hello Mohammed',
  'ابحث عن مطعم أو طبق': 'Search for a restaurant or dish',
  'الأقسام': 'Categories',
  'كل ما تحتاجه، في مكان واحد': 'Everything you need, in one place',
  'ابحث في الأقسام': 'Search categories',
  'عروض': 'Offers',
  'زهور': 'Flowers',
  'منتجات طازجة': 'Fresh products',
  'توصيل من المطعم': 'Delivered from the restaurant',
  'الوجبات': 'Meals',
  'المشروبات': 'Drinks',
  'عرض السلة': 'View cart',
  'عن المنتج': 'About the product',
  'استمتع بمذاق طازج ومكونات مختارة بعناية، محضّرة خصيصاً لتصل إليك ساخنة ولذيذة.': 'Enjoy fresh flavor and carefully selected ingredients, prepared especially to arrive hot and delicious.',
  'الكمية': 'Quantity',
  'أضف إلى السلة': 'Add to cart',
  'السلة': 'Cart',
  'عناصر': 'items',
  'لديك كوبون خصم؟': 'Have a discount code?',
  'تطبيق': 'Apply',
  'سلتك فارغة': 'Your cart is empty',
  'أضف شيئاً لذيذاً لتبدأ طلبك': 'Add something delicious to start your order',
  'استكشف المطاعم': 'Explore restaurants',
  'المتابعة للدفع': 'Continue to checkout',
  'المجموع الفرعي': 'Subtotal',
  'رسوم التوصيل': 'Delivery fee',
  'الإجمالي': 'Total',
  'إتمام الطلب': 'Checkout',
  'العنوان': 'Address',
  'اختر عنوان التوصيل': 'Choose a delivery address',
  'المنزل': 'Home',
  'إضافة عنوان جديد': 'Add a new address',
  'سيصل طلبك خلال 25–30 دقيقة تقريباً': 'Your order will arrive in approximately 25–30 minutes',
  'التالي': 'Next',
  'طريقة الدفع': 'Payment method',
  'اختر طريقة الدفع': 'Choose a payment method',
  'الدفع نقداً': 'Cash payment',
  'ادفع عند الاستلام': 'Pay on delivery',
  'بطاقة بنكية': 'Bank card',
  'بطاقة مدى': 'Mada card',
  'الدفع السريع': 'Express payment',
  'إضافة بطاقة جديدة': 'Add a new card',
  'مراجعة الطلب': 'Review order',
  'تفاصيل الطلب': 'Order details',
  'عنوان التوصيل': 'Delivery address',
  'تأكيد الطلب': 'Confirm order',
  'تم تأكيد الطلب': 'Order confirmed',
  'جاري التحضير': 'Preparing',
  'في الطريق': 'On the way',
  'تم التوصيل': 'Delivered',
  'عناويني': 'My addresses',
  'المنزل، المكتب': 'Home, office',
  'المكتب': 'Office',
  'طرق الدفع': 'Payment methods',
  'نقداً عند الاستلام': 'Cash on delivery',
  'الإشعارات': 'Notifications',
  'مفعّلة': 'Enabled',
  'الإعدادات': 'Settings',
  'اللغة، الخصوصية': 'Language, privacy',
  'المساعدة والدعم': 'Help & support',
  'نحن هنا لمساعدتك': 'We are here to help',
  'حسابي': 'Account',
  'طلباتي': 'My orders',
  'المفضلة': 'Favorites',
  'الرئيسية': 'Home',
  'محمد أحمد': 'Mohammed Ahmed',
  'تسجيل الخروج': 'Log out',
  'التفضيلات': 'Preferences',
  'اللغة': 'Language',
  'العربية': 'Arabic',
  'إشعارات العروض': 'Offer notifications',
  'احصل على أفضل العروض': 'Get the best offers',
  'حول طلباتي SD': 'About Talabati SD',
  'تم تأكيد طلبك': 'Your order is confirmed',
  'طلبك من بيتزا هت قيد التحضير الآن': 'Your Pizza Hut order is being prepared',
  'منذ 5 دقائق': '5 minutes ago',
  'عرض خاص لك': 'A special offer for you',
  'خصم 20% على أول طلب لك اليوم': '20% off your first order today',
  'منذ ساعة': '1 hour ago',
  'طلبك وصل': 'Your order has arrived',
  'نتمنى لك وجبة شهية، محمد': 'Enjoy your meal, Mohammed',
  'أمس': 'Yesterday',
  'تتبع طلبي': 'Track my order',
  'تغيير العنوان': 'Change address',
  'مشكلة في الدفع': 'Payment issue',
  'كيف يمكننا مساعدتك؟': 'How can we help you?',
  'فريقنا هنا من أجلك، كل يوم': 'Our team is here for you, every day',
  'مرحباً محمد، كيف يمكنني مساعدتك اليوم؟': 'Hi Mohammed, how can I help you today?',
  'أين وصل طلبي؟': 'Where is my order?',
  'أسئلة شائعة': 'Frequently asked questions',
  'اكتب رسالتك...': 'Type your message...',
  'إضافة طريقة دفع': 'Add a payment method',
  'عند الاستلام': 'On delivery',
  'شارع النيل، الخرطوم، السودان': 'Nile Street, Khartoum, Sudan',
  'شارع الجامعة، الخرطوم': 'University Street, Khartoum',
  'تقييم': 'rating',
  'تقييمات': 'reviews',
  'عنصر': 'item',
  '10:32 ص': '10:32 AM',
  '10:33 ص': '10:33 AM',
  ...Object.fromEntries(restaurants.map((restaurant) => [restaurant.name, restaurant.type])),
  'مطاعم': 'Restaurants',
  'بقالة': 'Grocery',
  'صيدلية': 'Pharmacy',
  'المزيد': 'More',
};

const arabicText: Record<string, string> = {
  ...Object.fromEntries(restaurants.map((restaurant) => [restaurant.type, restaurant.name])),
  'University Street branch': 'فرع شارع الجامعة',
  'Nile Street, Khartoum': 'شارع النيل، الخرطوم، السودان',
  'Mohammed Ahmed': 'محمد أحمد',
  '3.2 km away': 'يبعد 3.2 كم',
  '12 min': '12 دقيقة',
  '2 items · Large pepperoni pizza': 'عنصران · بيتزا بيبروني كبيرة',
  'SAR': 'SDG',
};

function translateText(value: string, english: boolean) {
  const trimmed = value.trim();
  const translations = english ? englishText : arabicText;
  const directTranslation = translations[trimmed];
  if (directTranslation) {
    return `${value.slice(0, value.indexOf(trimmed))}${directTranslation}${value.slice(value.indexOf(trimmed) + trimmed.length)}`;
  }
  const source = Object.keys(translations).find((key) => trimmed.includes(key));
  if (!source) return value;
  return value.replace(source, translations[source]);
}

function localizeChildren(children: React.ReactNode, english: boolean): React.ReactNode {
  return React.Children.map(children, (child) => typeof child === 'string' ? translateText(child, english) : child);
}

function directionalStyle(style: unknown, english: boolean): any {
  const flattened = StyleSheet.flatten(style as never) as Record<string, any> | undefined;
  const next = { ...(flattened ?? {}) };
  if (next.flexDirection === 'row-reverse') next.flexDirection = 'row';
  if (english) {
    if (next.textAlign === 'right') next.textAlign = 'left';
    if (next.writingDirection === 'rtl') next.writingDirection = 'ltr';
    if (next.alignSelf === 'flex-start') next.alignSelf = 'flex-end';
    else if (next.alignSelf === 'flex-end') next.alignSelf = 'flex-start';
    if (next.borderRightWidth !== undefined) {
      next.borderLeftWidth = next.borderRightWidth;
      delete next.borderRightWidth;
    }
    if (next.borderRightColor !== undefined) {
      next.borderLeftColor = next.borderRightColor;
      delete next.borderRightColor;
    }
  }
  return next;
}

const View = ({ style, ...props }: React.ComponentProps<typeof RNView>) => {
  const english = useContext(LanguageContext);
  const directionProps = Platform.OS === 'web'
    ? ({ dir: english ? 'ltr' : 'rtl' } as unknown as React.ComponentProps<typeof RNView>)
    : {};
  return <RNView {...props} {...directionProps} style={directionalStyle(style, english)} />;
};

const Pressable = ({ style, ...props }: React.ComponentProps<typeof RNPressable>) => {
  const english = useContext(LanguageContext);
  const directionalPressableStyle = typeof style === 'function'
    ? (state: Parameters<NonNullable<typeof style>>[0]) => directionalStyle(style(state), english)
    : directionalStyle(style, english);
  const directionProps = Platform.OS === 'web'
    ? ({ dir: english ? 'ltr' : 'rtl' } as unknown as React.ComponentProps<typeof RNPressable>)
    : {};
  return <RNPressable {...props} {...directionProps} style={directionalPressableStyle as React.ComponentProps<typeof RNPressable>['style']} />;
};

const Text = ({ style, children, ...props }: React.ComponentProps<typeof RNText>) => {
  const english = useContext(LanguageContext);
  const directionalTextStyle = directionalStyle(style, english);
  const flattened = StyleSheet.flatten(directionalTextStyle as never) as Record<string, any> | undefined;
  return <RNText {...props} style={[directionalTextStyle, { fontFamily: fontForWeight(flattened?.fontWeight), fontWeight: '400', writingDirection: english ? 'ltr' : 'rtl', textAlign: flattened?.textAlign ?? (english ? 'left' : 'right') }]}>{localizeChildren(children, english)}</RNText>;
};

const TextInput = ({ style, children, placeholder, textAlign, ...props }: React.ComponentProps<typeof RNTextInput>) => {
  const english = useContext(LanguageContext);
  const inputDirection = english ? 'ltr' : 'rtl';
  const webDirectionProps = Platform.OS === 'web'
    ? ({ dir: inputDirection } as unknown as React.ComponentProps<typeof RNTextInput>)
    : {};
  const directionalInputStyle = directionalStyle(style, english);
  const flattened = StyleSheet.flatten(directionalInputStyle as never) as Record<string, any> | undefined;
  return <RNTextInput {...props} {...webDirectionProps} placeholder={placeholder ? translateText(placeholder, english) : placeholder} textAlign={english ? 'left' : 'right'} style={[directionalInputStyle, { fontFamily: fontForWeight(flattened?.fontWeight), fontWeight: '400', writingDirection: inputDirection, textAlign: english ? 'left' : 'right' }]} />;
};

function money(value: number, english = activeEnglish) {
  return `${value.toFixed(value % 1 ? 2 : 0)} SDG`;
}

export default function TawselApp() {
  const insets = useSafeAreaInsets();
  const { user } = useSupabaseAuth();
  const [appDialog, setAppDialog] = useState<AppDialog>(null);
  const [screen, setScreen] = useState<Screen>('intro');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurants[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogRestaurants, setCatalogRestaurants] = useState<any[]>([]);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [productQuantity, setProductQuantity] = useState(1);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoriteRestaurantNames, setFavoriteRestaurantNames] = useState<string[]>([]);
  const [favoriteView, setFavoriteView] = useState<'products' | 'restaurants'>('products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurantCategory, setRestaurantCategory] = useState<'الأكثر طلباً' | 'الوجبات' | 'المشروبات'>('الأكثر طلباً');
  const [promo, setPromo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const isEnglish = false;
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver'>('customer');
  const [driverTab, setDriverTab] = useState<DriverTab>('dashboard');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverVehicle, setDriverVehicle] = useState('');
  const [driverBankName, setDriverBankName] = useState('');
  const [driverBankAccountName, setDriverBankAccountName] = useState('');
  const [driverBankAccountNumber, setDriverBankAccountNumber] = useState('');
  const [driverAuthLoading, setDriverAuthLoading] = useState(false);
  const [driverAuthError, setDriverAuthError] = useState('');
  const [customerAuthLoading, setCustomerAuthLoading] = useState(false);
  const [customerAuthError, setCustomerAuthError] = useState('');
  const [driverProfileMessage, setDriverProfileMessage] = useState('');
  const [driverOnline, setDriverOnline] = useState(true);
  const [driverNotifications, setDriverNotifications] = useState(true);
  const [driverSupportMessage, setDriverSupportMessage] = useState('');
  const [driverSupportSent, setDriverSupportSent] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSentMessage, setSupportSentMessage] = useState('');
  const [expandedDriverFaq, setExpandedDriverFaq] = useState<number | null>(null);
  const [driverOrderStatus, setDriverOrderStatus] = useState<DriverOrderStatus>('pending');
  const [driverAvailableDelivery, setDriverAvailableDelivery] = useState<any | null>(null);
  const [driverAssignedDelivery, setDriverAssignedDelivery] = useState<any | null>(null);
  const [declinedDeliveryIds, setDeclinedDeliveryIds] = useState<string[]>([]);
  const [driverRouteProgress, setDriverRouteProgress] = useState(0);
  const [restaurantPrepSeconds, setRestaurantPrepSeconds] = useState(0);
  const [deviceCoordinate, setDeviceCoordinate] = useState<Coordinate | null>(null);
  const [completedDriverDeliveries, setCompletedDriverDeliveries] = useState(0);
  const [driverEarnings, setDriverEarnings] = useState(0);
  const [driverEarningDeliveries, setDriverEarningDeliveries] = useState<any[]>([]);
  const [payoutRequestPending, setPayoutRequestPending] = useState(false);
  const fixedDriverStats = {
    deliveryCount: completedDriverDeliveries,
    rating: 0,
    todayEarnings: driverEarnings,
    availableBalance: driverEarnings,
    reviewCount: 0,
  };
  const [driverFollowMode, setDriverFollowMode] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('bankak');
  const [paymentDetails, setPaymentDetails] = useState<Record<string, string>>({});
  const [transactionLast4, setTransactionLast4] = useState('');
  const [paymentSubmissionId, setPaymentSubmissionId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | null>(null);
  const [orderStatusPopup, setOrderStatusPopup] = useState<OrderStatusPopup | null>(null);
  const [recentOrder, setRecentOrder] = useState<OrderStatusPopup | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const [supabaseOrders, setSupabaseOrders] = useState<any[]>([]);
  const [paymentSubmitError, setPaymentSubmitError] = useState('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState('bankak');
  const [paymentSaveMessage, setPaymentSaveMessage] = useState('');
  const [policyModal, setPolicyModal] = useState<'terms' | 'privacy' | null>(null);
  const paymentOptions = [
    { id: 'bankak', title: 'بنكك', sub: 'الدفع عبر تطبيق بنكك', icon: 'phone-portrait-outline' as const },
    { id: 'okash', title: 'اوكاش', sub: 'الدفع عبر تطبيق اوكاش', icon: 'wallet-outline' as const },
    { id: 'fawry', title: 'فوري', sub: 'الدفع عبر فوري', icon: 'flash-outline' as const },
    { id: 'mycashy', title: 'ماي كاشي', sub: 'الدفع عبر ماي كاشي', icon: 'card-outline' as const },
  ] as const;
  const [address, setAddress] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [addressLabelDraft, setAddressLabelDraft] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [addressMapPickerVisible, setAddressMapPickerVisible] = useState(false);
  const [addressMapCoordinate, setAddressMapCoordinate] = useState<Coordinate>([32.5424, 15.5003]);
  const [addressMapDraftCoordinate, setAddressMapDraftCoordinate] = useState<Coordinate>([32.5424, 15.5003]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [focusCategorySearch, setFocusCategorySearch] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
  const [showAllCategoryProducts, setShowAllCategoryProducts] = useState(false);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'past'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [offerNotifications, setOfferNotifications] = useState(true);
  const [focusedAuthField, setFocusedAuthField] = useState<'name' | 'email' | 'password' | 'phone' | null>(null);
  const appDirection = 'rtl' as const;
  activeEnglish = false;

  const showAppDialog = (title: string, message: string) => setAppDialog({ title, message });

  const clientProducts = catalogProducts.length ? catalogProducts : products;
  const clientRestaurants = catalogRestaurants.length ? catalogRestaurants : restaurants;

  useEffect(() => {
    let cancelled = false;
    const loadCatalogProducts = async () => {
      const remoteProducts = await ProductService.getAllProducts();
      if (cancelled) return;
      setCatalogProducts(remoteProducts.map((item: any, index: number) => ({
        id: String(item.id),
        title: item.name,
        subtitle: item.description || item.name,
        description: item.description || '',
        restaurantName: item.restaurants?.name || item.restaurant_name || '',
        restaurantId: item.restaurant_id ? String(item.restaurant_id) : undefined,
        price: Number(item.price) || 0,
        image: item.image_url ? { uri: item.image_url } : [pizzaImage, burgerImage, applesImage][index % 3],
        rating: item.rating ? String(item.rating) : '4.5',
        category: item.category || 'مطاعم',
      })));
    };
    void loadCatalogProducts();
    return () => { cancelled = true; };
  }, [catalogRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogRestaurants = async () => {
      const remoteRestaurants = await RestaurantService.getAllRestaurants();
      if (cancelled) return;
      setCatalogRestaurants(remoteRestaurants.map((item: any, index: number) => ({
        name: item.name,
        type: item.type || item.description || item.name,
        eta: item.delivery_time || '20–30 min',
        rating: item.rating ? String(item.rating) : '4.5',
        image: item.image_url ? { uri: item.image_url } : [pizzaImage, burgerImage, applesImage][index % 3],
        color: [colors.primary, '#DF8B35', '#25845B'][index % 3],
        id: String(item.id),
      })));
    };
    void loadCatalogRestaurants();
    return () => { cancelled = true; };
  }, [catalogRefreshKey]);

  const submitPaymentMutation = useSubmitPayment();
  const paymentStatusQuery = useGetPaymentSubmission(paymentSubmissionId ?? 0, {
    query: {
      enabled: paymentSubmissionId !== null,
      refetchInterval: paymentStatus === 'paid' ? false : 3000,
      queryKey: getGetPaymentSubmissionQueryKey(paymentSubmissionId ?? 0),
    },
  });

  // Sync user data from Supabase when user logs in
  useSyncUserData({
    user,
    onOrdersLoaded: (orders) => {
      setSupabaseOrders(orders);
      console.log('Orders loaded from Supabase:', orders);
    },
    onFavoriteProductsLoaded: (productIds) => {
      setFavoriteProductIds(productIds);
    },
    onFavoriteRestaurantsLoaded: (restaurantNames) => {
      setFavoriteRestaurantNames(restaurantNames);
    },
    onAddressesLoaded: (addresses) => {
      const formattedAddresses = addresses.map((addr: any) => ({
        id: addr.id,
        label: addr.label,
        value: addr.address,
        coordinate: addr.longitude != null && addr.latitude != null ? [Number(addr.longitude), Number(addr.latitude)] as Coordinate : undefined,
      }));
      setSavedAddresses(formattedAddresses);
      // Set active address to the default one if it exists, or clear if no addresses
      const defaultAddr = formattedAddresses.find((addr: SavedAddress) => addr.value) ?? null;
      setAddress(defaultAddr?.value ?? '');
    },
    onError: (error) => {
      console.error('Failed to sync user data from Supabase:', error);
    },
  });

  useEffect(() => {
    if (!user?.id || !driverOnline || driverAssignedDelivery) {
      if (!driverOnline || !user?.id) setDriverAvailableDelivery(null);
      return;
    }

    let cancelled = false;
    let refreshAttempted = false;
    const loadAvailableDelivery = async () => {
      try {
        const deliveries = await DriverService.getAvailableDeliveries(user.id);
        const visibleDeliveries = (deliveries as Array<{ id: string }>).filter((delivery: { id: string }) => !declinedDeliveryIds.includes(delivery.id));
        if (!cancelled) setDriverAvailableDelivery(visibleDeliveries[0] ?? null);
      } catch (error) {
        const databaseError = error as { code?: string; message?: string };
        if (databaseError.code === 'PGRST303' && !refreshAttempted) {
          refreshAttempted = true;
          try {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;
            if (!cancelled) await loadAvailableDelivery();
            return;
          } catch (refreshError) {
            console.error('Unable to refresh Supabase session:', refreshError);
          }
        }
        console.error('Error loading available driver deliveries:', error);
        if (databaseError.code === 'PGRST303') {
          showAppDialog(
            isEnglish ? 'Session time error' : 'مشكلة في وقت الجلسة',
            isEnglish ? 'Set your device date and time automatically, then sign in again.' : 'فعّل ضبط التاريخ والوقت تلقائياً في جهازك، ثم سجل الدخول مرة أخرى.',
          );
        }
      }
    };

    void loadAvailableDelivery();
    const channel = supabase
      .channel(`available-deliveries-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        void loadAvailableDelivery();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadAvailableDelivery();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, driverOnline, driverAssignedDelivery, declinedDeliveryIds]);

  useEffect(() => {
    if (!user?.id) {
      setCompletedDriverDeliveries(0);
      return;
    }
    let cancelled = false;
    const loadDriverStats = async () => {
      try {
        const stats = await DriverService.getDriverStats(user.id);
        const earnings = await DriverService.getDriverEarnings(user.id);
        if (!cancelled) {
          setCompletedDriverDeliveries(stats.completed);
          setDriverEarnings(earnings.total);
          setDriverEarningDeliveries(earnings.deliveries);
        }
      } catch (error) {
        console.error('Error loading driver stats:', error);
      }
    };
    void loadDriverStats();
    const channel = supabase
      .channel(`driver-stats-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `assigned_driver_id=eq.${user.id}` }, () => {
        void loadDriverStats();
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !trackingOrderId) {
      setTrackingOrder(null);
      return;
    }
    let cancelled = false;
    const loadTrackingOrder = async () => {
      try {
        const order = await OrderService.getOrderTracking(trackingOrderId);
        if (!cancelled) setTrackingOrder(order);
      } catch (error) {
        console.error('Error loading order tracking:', error);
      }
    };
    void loadTrackingOrder();
    const channel = supabase
      .channel(`order-tracking-${trackingOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `order_id=eq.${trackingOrderId}` }, loadTrackingOrder)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, loadTrackingOrder)
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, trackingOrderId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    const requestDeviceLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) return;
        subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 }, (position) => {
          if (!cancelled) setDeviceCoordinate([position.coords.longitude, position.coords.latitude]);
        });
      } catch (error) {
        console.warn('Unable to access device location:', error);
      }
    };
    void requestDeviceLocation();
    return () => { cancelled = true; subscription?.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setDeviceCoordinate([position.coords.longitude, position.coords.latitude]),
      (error) => console.warn('Unable to access browser location:', error.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!driverAssignedDelivery || !['accepted', 'pickedUp'].includes(driverOrderStatus)) return;
    const interval = setInterval(() => setRestaurantPrepSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(interval);
  }, [driverAssignedDelivery, driverOrderStatus]);

  useEffect(() => {
    AsyncStorage.getItem('tawsel_cart').then((stored) => {
      if (stored) setCart(JSON.parse(stored) as CartItem[]);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('tawsel_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    AsyncStorage.getItem('tawsel_offer_notifications').then((stored) => {
      if (stored === 'true' || stored === 'false') {
        setOfferNotifications(stored === 'true');
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.multiGet(['tawsel_favorite_products', 'tawsel_favorite_restaurants']).then(([productEntry, restaurantEntry]) => {
      try {
        if (productEntry[1]) {
          const parsedProducts = JSON.parse(productEntry[1]) as string[];
          if (Array.isArray(parsedProducts)) setFavoriteProductIds(parsedProducts);
        }
        if (restaurantEntry[1]) {
          const parsedRestaurants = JSON.parse(restaurantEntry[1]) as string[];
          if (Array.isArray(parsedRestaurants)) setFavoriteRestaurantNames(parsedRestaurants);
        }
      } catch {
        // Keep built-in favorites when stored data is invalid.
      }
      setFavoritesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    AsyncStorage.setItem('tawsel_favorite_products', JSON.stringify(favoriteProductIds));
    AsyncStorage.setItem('tawsel_favorite_restaurants', JSON.stringify(favoriteRestaurantNames));
  }, [favoritesLoaded, favoriteProductIds, favoriteRestaurantNames]);

  useEffect(() => {
    AsyncStorage.multiGet(['tawsel_address', 'tawsel_addresses']).then(([activeEntry, savedEntry]) => {
      if (savedEntry[1]) {
        try {
          const parsed = JSON.parse(savedEntry[1]) as SavedAddress[];
          if (Array.isArray(parsed) && parsed.length) {
            setSavedAddresses(parsed);
            // Set active address from storage if it exists and is still in saved addresses
            if (activeEntry[1]?.trim()) {
              const storedAddress = activeEntry[1];
              const isValid = parsed.some((addr) => addr.value === storedAddress);
              if (isValid) setAddress(storedAddress);
            }
          }
        } catch {
          // Use empty address when old storage is invalid.
        }
      }
      setAddressesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!addressesLoaded) return;
    AsyncStorage.setItem('tawsel_addresses', JSON.stringify(savedAddresses));
  }, [addressesLoaded, savedAddresses]);

  useEffect(() => {
    AsyncStorage.getItem('tawsel_payment_profile').then((stored) => {
      if (!stored) return;
      try {
        const saved = JSON.parse(stored) as { defaultMethod?: string; details?: Record<string, string> };
        if (saved.details && typeof saved.details === 'object') {
          setPaymentDetails(saved.details);
        }
        if (saved.defaultMethod && paymentOptions.some((method) => method.id === saved.defaultMethod)) {
          setPaymentMethod(saved.defaultMethod);
          setEditingPaymentMethod(saved.defaultMethod);
        }
      } catch (error) {
        console.error('Unable to load saved payment profile', error);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('tawsel_pending_payment').then((stored) => {
      if (!stored) return;
      const savedId = Number(stored);
      if (Number.isInteger(savedId) && savedId > 0) {
        setPaymentSubmissionId(savedId);
        setPaymentStatus('pending');
      }
    });
  }, []);

  useEffect(() => {
    const status = paymentStatusQuery.data?.status;
    if (!status) return;
    setPaymentStatus(status);
    if (status === 'paid') {
      AsyncStorage.removeItem('tawsel_pending_payment').catch(() => undefined);
    }
  }, [paymentStatusQuery.data?.status]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const isIntro = screen === 'intro';
  const showTabs = ['home', 'categories', 'orders', 'cart', 'account'].includes(screen);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = cart.length ? 15 : 0;
  const total = subtotal + delivery;
  const driverDelivery = driverAssignedDelivery ?? driverAvailableDelivery;
  const deliveryOrder = driverDelivery?.orders ?? driverDelivery ?? {};
  const orderClientCoordinate = coordinateFromOrder(deliveryOrder);
  const pickupCoordinate = optionalPickupCoordinate(deliveryOrder);
  const clientCoordinateLabel = `${orderClientCoordinate[1].toFixed(6)}, ${orderClientCoordinate[0].toFixed(6)}`;
  const hasClientAddress = Boolean(deliveryOrder.delivery_address && !['العنوان غير متاح', 'Address unavailable'].includes(String(deliveryOrder.delivery_address).trim()));
  const driverOrder = {
    id: deliveryOrder.order_id || deliveryOrder.orderId || driverDelivery?.id || '',
    restaurant: deliveryOrder.restaurant || (isEnglish ? 'Restaurant' : 'المطعم'),
    restaurantDetail: deliveryOrder.restaurant_detail || (isEnglish ? 'Pickup details' : 'تفاصيل الاستلام'),
    clientName: deliveryOrder.customer_name || deliveryOrder.client_name || (isEnglish ? 'Client' : 'العميل'),
    clientPhone: deliveryOrder.customer_phone || '',
    clientAddress: hasClientAddress ? String(deliveryOrder.delivery_address) : clientCoordinateLabel,
    distance: deliveryOrder.distance || (isEnglish ? 'Distance unavailable' : 'المسافة غير متاحة'),
    eta: deliveryOrder.eta || (isEnglish ? 'Estimated time unavailable' : 'الوقت غير متاح'),
    prepSeconds: Number(deliveryOrder.preparation_seconds ?? 0),
    total: Number(deliveryOrder.total ?? 0),
    items: Array.isArray(deliveryOrder.items)
      ? (isEnglish ? `${deliveryOrder.items.length} items` : `${deliveryOrder.items.length} عناصر`)
      : deliveryOrder.items || (isEnglish ? 'Order items' : 'تفاصيل الطلب'),
  };
  const isDriverNavigating = screen === 'driverMap'
    && (driverOrderStatus === 'accepted' || driverOrderStatus === 'pickedUp');

  const driverCurrentCoordinate = deviceCoordinate ?? pointAlongRoute(deliveryRoute, driverRouteProgress);
  const remainingDistanceKm = deliveryDistanceKm * (1 - driverRouteProgress);
  const driverRouteDistanceLabel = driverRouteProgress >= 1
    ? (isEnglish ? 'Arrived' : 'وصلت')
    : (isEnglish ? `${remainingDistanceKm.toFixed(1)} km remaining` : `متبقي ${remainingDistanceKm.toFixed(1)} كم`);
  const driverRouteEtaLabel = driverRouteProgress >= 1
    ? (isEnglish ? 'At client location' : 'في موقع العميل')
    : (isEnglish ? `${Math.max(1, Math.ceil(12 * (1 - driverRouteProgress)))} min away` : `${Math.max(1, Math.ceil(12 * (1 - driverRouteProgress)))} دقيقة`);

  const go = (next: Screen) => {
    if (next === screen) return;
    const backTarget: Partial<Record<Screen, Screen>> = {
      login: 'intro',
      register: 'login',
      restaurant: 'home',
      product: 'restaurant',
      cart: 'home',
      address: 'cart',
      payment: 'address',
      review: 'payment',
      paymentVerification: 'review',
      track: 'paymentVerification',
    };
    if (screenHistory.length > 0 && backTarget[screen] === next) {
      goBack();
      return;
    }
    setScreenHistory((current) => [...current, screen].slice(-30));
    if (['home', 'categories', 'orders', 'cart', 'account'].includes(next)) {
      setActiveTab(next as Tab);
    }
    setScreen(next);
  };
  const goBack = () => {
    const previous = screenHistory[screenHistory.length - 1] ?? 'home';
    setScreenHistory((current) => current.slice(0, -1));
    if (['home', 'categories', 'orders', 'cart', 'account'].includes(previous)) {
      setActiveTab(previous as Tab);
    }
    setScreen(previous);
  };
  const resetTo = (next: Screen) => {
    setScreenHistory([]);
    if (['home', 'categories', 'orders', 'cart', 'account'].includes(next)) {
      setActiveTab(next as Tab);
    }
    if (next === 'driverDashboard') {
      setDriverTab('dashboard');
    }
    setScreen(next);
  };
  const selectSavedAddress = async (savedAddress: SavedAddress) => {
    setAddress(savedAddress.value);
    await AsyncStorage.setItem('tawsel_address', savedAddress.value);
  };
  const deleteSavedAddress = async (savedAddress: SavedAddress) => {
    const remainingAddresses = savedAddresses.filter((item) => item.id !== savedAddress.id);
    setSavedAddresses(remainingAddresses);
    if (address === savedAddress.value) {
      const nextAddress = remainingAddresses[0]?.value ?? '';
      setAddress(nextAddress);
      if (nextAddress) {
        await AsyncStorage.setItem('tawsel_address', nextAddress);
      } else {
        await AsyncStorage.removeItem('tawsel_address');
      }
    }
    
    // Delete from Supabase if user is logged in
    if (user?.id) {
      try {
        await AddressService.deleteAddress(savedAddress.id);
      } catch (err) {
        console.error('Error deleting address from Supabase:', err);
      }
    }
  };
  const openAddressEditor = (savedAddress?: SavedAddress) => {
    const target = savedAddress ?? savedAddresses.find((item) => item.value === address);
    setEditingAddressId(target?.id ?? null);
    setAddressLabelDraft(target?.label ?? '');
    setAddressDraft(target?.value ?? '');
    if (target?.coordinate) setAddressMapCoordinate(target.coordinate);
    setEditingAddress(true);
  };
  const openNewAddressEditor = () => {
    setEditingAddressId(null);
    setAddressLabelDraft('');
    setAddressDraft('');
    setEditingAddress(true);
  };
  const openAddressMapPicker = () => {
    const numbers = addressDraft.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const nextCoordinate = numbers.length >= 2 ? [numbers[1], numbers[0]] as Coordinate : addressMapCoordinate;
    setAddressMapDraftCoordinate(nextCoordinate);
    setAddressMapPickerVisible(true);
  };
  const updateAddressMapDraft = (coordinate: Coordinate) => {
    setAddressMapDraftCoordinate(coordinate);
  };
  const saveAddressMapSelection = () => {
    const coordinate = addressMapDraftCoordinate;
    setAddressMapCoordinate(coordinate);
    setAddressDraft(`${coordinate[1].toFixed(6)}, ${coordinate[0].toFixed(6)}`);
    setAddressMapPickerVisible(false);
  };
  const saveAddressEdit = async () => {
    const nextAddress = addressDraft.trim();
    if (!nextAddress) return;
    const nextLabel = addressLabelDraft.trim() || 'عنوان جديد';
    const addressId = editingAddressId ?? `address-${Date.now()}`;
    const nextSavedAddress = { id: addressId, label: nextLabel, value: nextAddress, coordinate: addressMapCoordinate };
    setSavedAddresses((current) => editingAddressId
      ? current.map((item) => item.id === editingAddressId ? nextSavedAddress : item)
      : [...current, nextSavedAddress]);
    setAddress(nextAddress);
    await AsyncStorage.setItem('tawsel_address', nextAddress);
    
    // Save or update address in Supabase if user is logged in
    if (user?.id) {
      try {
        if (editingAddressId) {
          // Update existing address
          await AddressService.updateAddress(editingAddressId, {
            label: nextLabel,
            address: nextAddress,
            longitude: addressMapCoordinate[0],
            latitude: addressMapCoordinate[1],
            updated_at: new Date().toISOString(),
          });
        } else {
          // Create new address
          await AddressService.createAddress(user.id, {
            id: addressId,
            label: nextLabel,
            address: nextAddress,
            longitude: addressMapCoordinate[0],
            latitude: addressMapCoordinate[1],
            is_default: savedAddresses.length === 0,
          });
        }
      } catch (err) {
        console.error('Error saving address to Supabase:', err);
        showAppDialog('تعذر حفظ العنوان', 'تحقق من صلاحيات جدول addresses في Supabase ثم حاول مرة أخرى');
      }
    }
    
    setEditingAddress(false);
  };
  const tap = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const selectedPaymentOption = paymentOptions.find((method) => method.id === editingPaymentMethod) ?? paymentOptions[0];
  const getUserRole = (userRecord?: { user_metadata?: Record<string, any>; app_metadata?: Record<string, any> } | null) => {
    const role = userRecord?.user_metadata?.role ?? userRecord?.app_metadata?.role ?? '';
    return String(role).trim().toLowerCase();
  };
  const ensureRoleMatches = async (userRecord: { user_metadata?: Record<string, any>; app_metadata?: Record<string, any> } | null | undefined, expectedRole: 'customer' | 'driver', onMismatch: () => void) => {
    const role = getUserRole(userRecord);
    if (!role) return true;
    if (role !== expectedRole) {
      await AuthService.signOut().catch(() => undefined);
      onMismatch();
      return false;
    }
    return true;
  };
  const maskPaymentDetails = (details: string) => details.length > 4 ? `•••• ${details.slice(-4)}` : details;
  const savePaymentProfile = async () => {
    const details = (paymentDetails[editingPaymentMethod] ?? '').trim();
    if (!details) {
      setPaymentSaveMessage('أدخل رقم الحساب أو الهاتف أولاً');
      return;
    }

    const nextDetails = { ...paymentDetails, [editingPaymentMethod]: details };
    try {
      await AsyncStorage.setItem('tawsel_payment_profile', JSON.stringify({ defaultMethod: editingPaymentMethod, details: nextDetails }));
      setPaymentDetails(nextDetails);
      setPaymentMethod(editingPaymentMethod);
      setPaymentSaveMessage(`تم حفظ ${selectedPaymentOption.title} كطريقة الدفع الافتراضية`);
      await tap();
    } catch (error) {
      console.error('Unable to save payment profile', error);
      setPaymentSaveMessage('تعذر حفظ بيانات الدفع، حاول مرة أخرى');
    }
  };
  const submitPaymentForReview = async () => {
    if (transactionLast4.length !== 4 || submitPaymentMutation.isPending) return;
    setPaymentSubmitError('');
    const orderId = `TW-${String(Date.now()).slice(-6)}`;
    const submittedOrder: OrderStatusPopup = {
      orderId,
      items: cart,
      total,
      address,
      paymentMethod: paymentOptions.find((method) => method.id === paymentMethod)?.title ?? 'بنكك',
    };
    submitPaymentMutation.mutate(
      {
        data: {
          orderId,
          paymentMethod,
          total,
          transactionLast4,
        },
      },
      {
        onSuccess: async (submission) => {
          setPaymentSubmissionId(submission.id);
          setPaymentStatus(submission.status);
          setDriverOrderStatus('pending');
          setRecentOrder(submittedOrder);
          setOrderStatusPopup(submittedOrder);
          setCart([]);
          await AsyncStorage.setItem('tawsel_pending_payment', String(submission.id));
          
          // Save order to Supabase if user is logged in
          if (user?.id) {
            try {
              const session = await AuthService.getSession();
              const orderUserId = session?.user?.id;
              if (!orderUserId) {
                throw new Error('No active Supabase session');
              }
              await OrderService.createOrder({
                user_id: orderUserId,
                order_id: submittedOrder.orderId,
                restaurant: selectedRestaurant?.name || '',
                items: submittedOrder.items,
                total: submittedOrder.total,
                delivery_address: submittedOrder.address,
                delivery_longitude: addressMapCoordinate[0],
                delivery_latitude: addressMapCoordinate[1],
                payment_method: submittedOrder.paymentMethod,
                transaction_last4: transactionLast4,
                status: 'pending',
                created_at: new Date().toISOString(),
              });
            } catch (err) {
              console.error('Error saving order to Supabase:', err);
              const databaseError = err as { code?: string; message?: string };
              setPaymentSubmitError(`تعذر حفظ الطلب (${databaseError.code ?? 'DB'}): ${databaseError.message ?? 'تحقق من إعدادات Supabase ثم حاول مرة أخرى'}`);
            }
          }
          
          await tap();
        },
        onError: () => {
          setPaymentSubmitError('تعذر إرسال بيانات الدفع، تحقق من الاتصال وحاول مرة أخرى');
        },
      },
    );
  };
  const openTab = (tab: Tab) => {
    if (screen === 'track' && tab === 'home' && screenHistory.length > 0) {
      goBack();
      return;
    }
    setScreenHistory([]);
    setActiveTab(tab);
    setScreen(tab);
  };
  const openOrderTracking = (orderId: string) => {
    setTrackingOrderId(orderId);
    go('track');
  };
  const openDriverTab = (tab: DriverTab) => {
    const nextScreen: Record<DriverTab, Screen> = {
      dashboard: 'driverDashboard',
      deliveries: 'driverDeliveries',
      earnings: 'driverEarnings',
      account: 'driverAccount',
      settings: 'driverSettings',
    };
    setDriverTab(tab);
    setScreenHistory([]);
    setScreen(nextScreen[tab]);
  };
  const requestDriverPayout = async (amount: number, bankName: string, accountName: string, accountNumber: string) => {
    if (!user?.id || amount <= 0 || payoutRequestPending) return;
    setPayoutRequestPending(true);
    const { error } = await supabase.rpc('create_driver_payout_request', {
      p_driver_id: user.id,
      p_amount: amount,
      p_bank_name: bankName,
      p_account_name: accountName,
      p_account_number: accountNumber,
    });
    if (error) showAppDialog('تعذر إرسال طلب الأرباح', error.message || 'حاول مرة أخرى');
    else {
      setDriverEarnings(0);
      showAppDialog('تم إرسال الطلب', 'تم إرسال طلب تحويل الأرباح إلى الإدارة.');
    }
    setPayoutRequestPending(false);
  };
  const addToCart = (item: Product) => {
    setCart((current) => {
      const itemWithRestaurant = {
        ...item,
        restaurantName: item.restaurantName || selectedRestaurant?.name || '',
      };
      const existing = current.find((cartItem) => cartItem.id === item.id);
      return existing
        ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem)
        : [...current, { ...itemWithRestaurant, quantity: 1 }];
    });
    tap();
  };
  const addSelectedProductToCart = () => {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === selectedProduct.id);
      return existing
        ? current.map((cartItem) => cartItem.id === selectedProduct.id
          ? { ...cartItem, quantity: cartItem.quantity + productQuantity }
          : cartItem)
        : [...current, { ...selectedProduct, quantity: productQuantity }];
    });
    tap();
  };
  const changeQuantity = (id: string, delta: number) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  };
  const chooseProduct = (item: Product) => {
    setSelectedProduct(item);
    setProductQuantity(1);
    go('product');
  };

  const toggleProductFavorite = async (productId: string) => {
    const isFavorited = favoriteProductIds.includes(productId);
    setFavoriteProductIds((current) => isFavorited
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
    
    // Sync with Supabase if user is logged in
    if (user?.id) {
      try {
        if (isFavorited) {
          await FavoritesService.removeFavoriteProduct(user.id, productId);
        } else {
          await FavoritesService.addFavoriteProduct(user.id, productId);
        }
      } catch (err) {
        console.error('Error syncing product favorite to Supabase:', err);
      }
    }
    
    await tap();
  };

  const toggleRestaurantFavorite = async (restaurantName: string) => {
    const isFavorited = favoriteRestaurantNames.includes(restaurantName);
    setFavoriteRestaurantNames((current) => isFavorited
      ? current.filter((name) => name !== restaurantName)
      : [...current, restaurantName]);
    
    // Sync with Supabase if user is logged in
    if (user?.id) {
      try {
        if (isFavorited) {
          await FavoritesService.removeFavoriteRestaurant(user.id, restaurantName);
        } else {
          await FavoritesService.addFavoriteRestaurant(user.id, restaurantName);
        }
      } catch (err) {
        console.error('Error syncing restaurant favorite to Supabase:', err);
      }
    }
    
    await tap();
  };

  const Header = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) => (
    <View style={[styles.header, { paddingTop: topPad + 18 }]}> 
      <Pressable onPress={goBack} style={styles.headerIcon} accessibilityLabel="Back">
        <Ionicons name="chevron-forward" size={21} color={colors.ink} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{({ Settings: 'الإعدادات', Notifications: 'الإشعارات', 'My addresses': 'عناويني', 'Payment methods': 'طرق الدفع' } as Record<string, string>)[subtitle] ?? subtitle}</Text> : null}
      </View>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );

  const BottomTabs = () => (
    <View style={[styles.bottomTabs, { paddingBottom: bottomPad + 7 }]}>
      {([
        ['home', 'الرئيسية', 'home-outline', 'home'],
        ['categories', 'الأقسام', 'grid-outline', 'grid'],
        ['orders', 'طلباتي', 'receipt-outline', 'receipt'],
        ['cart', 'السلة', 'bag-outline', 'bag'],
        ['account', 'حسابي', 'person-outline', 'person'],
      ] as const).map(([key, label, inactive, active]) => (
        <Pressable
          key={key}
          accessibilityLabel={label}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === key }}
          onPress={() => openTab(key)}
          style={({ pressed }) => [styles.tabButton, activeTab === key && styles.tabButtonActive, pressed && styles.pressed]}
        >
          <Ionicons name={(activeTab === key ? active : inactive) as keyof typeof Ionicons.glyphMap} size={22} color={activeTab === key ? colors.primary : colors.mutedForeground} />
          {key === 'cart' && cartCount > 0 ? <View style={styles.tabCartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View> : null}
        </Pressable>
      ))}
    </View>
  );

  const PrimaryButton = ({ label, onPress, outline = false, disabled = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean }) => (
    <Pressable disabled={disabled} onPress={async () => { await tap(); onPress(); }} style={({ pressed }) => [styles.primaryButton, outline && styles.outlineButton, disabled && styles.disabledButton, pressed && styles.pressed]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.primaryButtonText, outline && styles.outlineButtonText]}>{label}</Text>
      {!outline ? <Ionicons name="arrow-back" size={18} color="#fff" /> : null}
    </Pressable>
  );

  const IntroScreen = () => (
    <View style={styles.intro}>
      <StatusBar style="light" />
      <LinearGradient colors={[colors.primary, colors.secondaryForeground]} style={StyleSheet.absoluteFill} />
      <View style={[styles.introTop, { paddingTop: topPad + 28 }]}>
        <View style={styles.introLogoCircle}><Ionicons name="bicycle" size={48} color="#fff" /></View>
        <Text style={styles.introBrand}>{isEnglish ? 'Talabati SD' : 'طلباتي SD'}</Text>
        <Text style={styles.introEnglish}>TALABATI SD</Text>
      </View>
      <View style={styles.introHero}>
        <View style={styles.introSwoosh} />
        <View style={styles.introDeliveryIcon}><Ionicons name="bicycle-outline" size={60} color="#fff" /></View>
        <Text style={styles.introHeadline}>{isEnglish ? 'Your orders, delivered fast' : 'طلباتك، توصيل بسرعة'}</Text>
        <Text style={styles.introSubline}>{isEnglish ? 'Fast delivery for everything you need' : 'توصيل سريع لكل ما تحتاجه'}</Text>
      </View>
      <View style={[styles.introActions, { paddingBottom: bottomPad + 22 }]}>
        <Text style={styles.rolePrompt}>{isEnglish ? 'Choose your role' : 'اختر نوع الحساب'}</Text>
        <View style={styles.roleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedRole === 'customer' }}
            onPress={() => { setSelectedRole('customer'); go('login'); }}
            style={selectedRole === 'customer' ? styles.roleActive : styles.roleOutline}
          >
            <Ionicons name="person-outline" size={19} color={selectedRole === 'customer' ? colors.primary : '#fff'} />
            <Text style={selectedRole === 'customer' ? styles.roleActiveText : styles.roleOutlineText}>{isEnglish ? 'Customer' : 'عميل'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedRole === 'driver' }}
            onPress={() => { setSelectedRole('driver'); go('driverLogin'); }}
            style={selectedRole === 'driver' ? styles.roleActive : styles.roleOutline}
          >
            <Ionicons name="bicycle-outline" size={19} color={selectedRole === 'driver' ? colors.primary : '#fff'} />
            <Text style={selectedRole === 'driver' ? styles.roleActiveText : styles.roleOutlineText}>{isEnglish ? 'Driver' : 'سائق'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const AuthScreen = ({ register = false }: { register?: boolean }) => {
    const submitAuth = async () => {
      setCustomerAuthError('');
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const normalizedPhone = phone.replace(/\D/g, '');
      if (!normalizedEmail || !normalizedPassword) {
        setCustomerAuthError(isEnglish ? 'Email and password are required.' : 'البريد الإلكتروني وكلمة المرور مطلوبان');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        setCustomerAuthError(isEnglish ? 'Enter a valid email address.' : 'أدخل بريداً إلكترونياً صحيحاً');
        return;
      }
      if (register && normalizedPassword.length < 6) {
        setCustomerAuthError(isEnglish ? 'Password must be at least 6 characters.' : 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
        return;
      }
      if (register && !name.trim()) {
        setCustomerAuthError(isEnglish ? 'Full name is required.' : 'الاسم الكامل مطلوب');
        return;
      }
      if (register && normalizedPhone.length < 9) {
        setCustomerAuthError(isEnglish ? 'Phone number is required.' : 'رقم الهاتف مطلوب');
        return;
      }
      setCustomerAuthLoading(true);
      try {
        let signedUser: { user_metadata?: Record<string, any>; app_metadata?: Record<string, any> } | null = null;
        if (register) {
          const { user: registeredUser, session } = await AuthService.signUp(normalizedEmail, normalizedPassword, {
            name,
            phone,
            role: 'customer',
          });
          if (!registeredUser) throw new Error(isEnglish ? 'Registration failed.' : 'فشل إنشاء الحساب');
          signedUser = session?.user ?? registeredUser;
          if (!session) {
            setCustomerAuthError(isEnglish ? 'Account created. Check your email to confirm it, then sign in.' : 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجل الدخول');
            setPassword('');
            return;
          }
        } else {
          const { user: signedInUser } = await AuthService.signIn(normalizedEmail, normalizedPassword);
          signedUser = signedInUser;
        }

        const roleAllowed = await ensureRoleMatches(signedUser, 'customer', () => {
          setCustomerAuthError(isEnglish ? 'This account is registered as a driver. Please use the driver sign-in.' : 'هذا الحساب مسجل كسائق. استخدم تسجيل دخول السائق');
        });
        if (!roleAllowed) {
          setPassword('');
          return;
        }

        setEmail(normalizedEmail);
        setPassword('');
        go('home');
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const normalizedMessage = message.toLowerCase();
        setCustomerAuthError(
          normalizedMessage.includes('already registered')
            ? (isEnglish ? 'This email is already registered. Sign in instead.' : 'هذا البريد مسجل بالفعل. سجل الدخول بدلاً من ذلك')
            : normalizedMessage.includes('invalid login credentials')
              ? (isEnglish ? 'Incorrect email or password.' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
              : normalizedMessage.includes('driver')
                ? (isEnglish ? 'This account is registered as a driver. Please use the driver sign-in.' : 'هذا الحساب مسجل كسائق. استخدم تسجيل دخول السائق')
                : message || (isEnglish ? 'Authentication failed.' : 'فشلت المصادقة'),
        );
      } finally {
        setCustomerAuthLoading(false);
      }
    };

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.authContent, { paddingTop: topPad + 20, paddingBottom: bottomPad + 28 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.authTopRow}>
            <Pressable accessibilityLabel={isEnglish ? 'Back to role selection' : 'العودة لاختيار الحساب'} onPress={() => go('intro')} style={({ pressed }) => [styles.backCircle, pressed && styles.pressed]}>
              <Ionicons name="chevron-forward" size={21} color={colors.ink} />
            </Pressable>
            <View style={styles.authTrustPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.green} />
              <Text style={styles.authTrustText}>{isEnglish ? 'Secure access' : 'دخول آمن'}</Text>
            </View>
          </View>
          <View style={styles.authBrandRow}>
            <View style={styles.authLogo}><Image source={logoImage} style={styles.authLogoImage} /></View>
            <View>
              <Text style={styles.authBrandName}>{isEnglish ? 'Talabati SD' : 'طلباتي SD'}</Text>
              <Text style={styles.authBrandCaption}>{isEnglish ? 'Everything, delivered' : 'كل شيء يصلك'}</Text>
            </View>
          </View>
          <Text style={styles.authEyebrow}>{isEnglish ? (register ? 'START YOUR JOURNEY' : 'WELCOME BACK') : (register ? 'ابدأ رحلتك' : 'مرحباً بعودتك')}</Text>
          <Text style={styles.authTitle}>{isEnglish ? (register ? 'Create your account' : 'Welcome to Talabati SD') : (register ? 'أنشئ حسابك' : 'مرحباً بك في طلباتي SD')}</Text>
          <Text style={styles.authSubtitle}>{isEnglish ? (register ? 'Start your journey with the fastest delivery in your city' : 'Your favorite orders, delivered') : (register ? 'ابدأ رحلتك مع أسرع توصيل في مدينتك' : 'ادخل عالم طلباتك المفضلة')}</Text>

          {customerAuthError ? <View style={styles.authError}><Ionicons name="alert-circle-outline" size={16} color={colors.coral} /><Text style={styles.authErrorText}>{customerAuthError}</Text></View> : null}

          <View style={styles.authFormCard}>
            {register ? (
              <View style={styles.authFieldGroup}>
                <Text style={styles.authFieldLabel}>{isEnglish ? 'Full name' : 'الاسم الكامل'}</Text>
                <View style={[styles.inputWrap, focusedAuthField === 'name' && styles.authFieldFocused]}>
                  <Ionicons name="person-outline" size={18} color={focusedAuthField === 'name' ? colors.primary : colors.mutedForeground} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedAuthField('name')}
                    onBlur={() => setFocusedAuthField(null)}
                    placeholder={isEnglish ? 'Enter your full name' : 'أدخل اسمك الكامل'}
                    placeholderTextColor={colors.mutedForeground}
                    style={styles.input}
                  />
                </View>
              </View>
            ) : null}
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>{isEnglish ? 'Email' : 'البريد الإلكتروني'}</Text>
              <View style={[styles.inputWrap, focusedAuthField === 'email' && styles.authFieldFocused]}>
                <Ionicons name="mail-outline" size={18} color={focusedAuthField === 'email' ? colors.primary : colors.mutedForeground} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedAuthField('email')}
                  onBlur={() => setFocusedAuthField(null)}
                  placeholder={isEnglish ? 'you@example.com' : 'name@example.com'}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>{isEnglish ? 'Password' : 'كلمة المرور'}</Text>
              <View style={[styles.inputWrap, focusedAuthField === 'password' && styles.authFieldFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focusedAuthField === 'password' ? colors.primary : colors.mutedForeground} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedAuthField('password')}
                  onBlur={() => setFocusedAuthField(null)}
                  placeholder={isEnglish ? 'Enter your password' : 'أدخل كلمة المرور'}
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>
            {register ? (
              <View style={styles.authFieldGroup}>
                <Text style={styles.authFieldLabel}>{isEnglish ? 'Phone number' : 'رقم الجوال'}</Text>
                <View style={[styles.phoneRow, focusedAuthField === 'phone' && styles.authFieldFocused]}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    onFocus={() => setFocusedAuthField('phone')}
                    onBlur={() => setFocusedAuthField(null)}
                    placeholder="912 345 678"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1 }]}
                    keyboardType="phone-pad"
                  />
                  <View style={styles.countryCode}><Text style={styles.countryFlag}>●</Text><Text style={styles.countryText}>+249</Text></View>
                </View>
              </View>
            ) : null}
            <View style={styles.authHint}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.primary} />
              <Text style={styles.authHintText}>{isEnglish ? (register ? 'Use a valid email and password to create your account.' : 'Sign in securely with your email and password.') : (register ? 'استخدم بريداً إلكترونياً وكلمة مرور صحيحة لإنشاء حسابك.' : 'سجل الدخول بأمان باستخدام بريدك الإلكتروني وكلمة المرور.')}</Text>
            </View>
            <PrimaryButton label={customerAuthLoading ? (isEnglish ? 'Loading...' : 'جاري التحميل...') : (isEnglish ? (register ? 'Create account' : 'Sign in') : (register ? 'إنشاء الحساب' : 'تسجيل الدخول'))} onPress={submitAuth} disabled={customerAuthLoading} />
          </View>

          <Text style={styles.terms}>{isEnglish ? 'By continuing, you agree to our ' : 'بالمتابعة، أنت توافق على '}<Text onPress={() => openPolicy('terms')} style={styles.termsLink}>{isEnglish ? 'Terms' : 'الشروط والأحكام'}</Text>{isEnglish ? ' and ' : ' و'}<Text onPress={() => openPolicy('privacy')} style={styles.termsLink}>{isEnglish ? 'Privacy Policy' : 'سياسة الخصوصية'}</Text></Text>
          <Pressable accessibilityLabel={register ? (isEnglish ? 'Go to login' : 'الانتقال لتسجيل الدخول') : (isEnglish ? 'Create an account' : 'إنشاء حساب')} onPress={() => go(register ? 'login' : 'register')} style={styles.authSwitch}>
            <Text style={styles.authSwitchText}>{register ? (isEnglish ? 'Already have an account? ' : 'لديك حساب بالفعل؟ ') : (isEnglish ? 'New to Talabati SD? ' : 'ليس لديك حساب؟ ')}<Text style={styles.termsLink}>{register ? (isEnglish ? 'Sign in' : 'تسجيل الدخول') : (isEnglish ? 'Create account' : 'إنشاء حساب')}</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const DriverAuthScreen = ({ register = false }: { register?: boolean }) => {
    const submitDriverAuth = async () => {
      setDriverAuthError('');

      const email = driverEmail.trim().toLowerCase();
      const password = driverPassword.trim();

      if (!email || !password) {
        setDriverAuthError(isEnglish ? 'Email and password required' : 'البريد الإلكتروني وكلمة المرور مطلوبان');
        return;
      }

      if (register && password.length < 6) {
        setDriverAuthError(isEnglish ? 'Password must be at least 6 characters' : 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
        return;
      }

      if (register) {
        if (!driverName.trim()) {
          setDriverAuthError(isEnglish ? 'Full name required' : 'الاسم الكامل مطلوب');
          return;
        }
        if (!driverPhone.trim()) {
          setDriverAuthError(isEnglish ? 'Phone number required' : 'رقم الهاتف مطلوب');
          return;
        }
        if (!driverVehicle.trim()) {
          setDriverAuthError(isEnglish ? 'Vehicle type required' : 'نوع المركبة مطلوب');
          return;
        }
      }

      setDriverAuthLoading(true);
      try {
        let signedUser: { user_metadata?: Record<string, any>; app_metadata?: Record<string, any> } | null = null;
        if (register) {
          const { user, session } = await AuthService.signUp(email, password, {
            name: driverName,
            phone: driverPhone,
            vehicle: driverVehicle,
            role: 'driver',
          });
          if (!user) {
            throw new Error(isEnglish ? 'Registration failed. Please try again.' : 'فشل إنشاء الحساب. حاول مرة أخرى');
          }
          signedUser = session?.user ?? user;
          try {
            const driverRecord = {
              id: user.id,
              name: driverName.trim(),
              phone: driverPhone.trim(),
              vehicle: driverVehicle.trim(),
              status: 'active',
              created_at: new Date().toISOString(),
            };
            await supabase.from('drivers').upsert(driverRecord, { onConflict: 'id' });
          } catch (driverSyncError) {
            console.warn('Driver sync to drivers table failed:', driverSyncError);
          }
          if (!session) {
            setDriverAuthError(isEnglish ? 'Account created. Check your email to confirm it, then sign in.' : 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجل الدخول');
            setDriverPassword('');
            return;
          }
        } else {
          const { user: signedInUser } = await AuthService.signIn(email, password);
          signedUser = signedInUser;
        }

        const roleAllowed = await ensureRoleMatches(signedUser, 'driver', () => {
          setDriverAuthError(isEnglish ? 'This account is registered as a customer. Please use the customer sign-in.' : 'هذا الحساب مسجل كعميل. استخدم تسجيل دخول العميل');
        });
        if (!roleAllowed) {
          setDriverPassword('');
          return;
        }

        const signedUserId = (signedUser as { id?: string } | null)?.id;
        if (!signedUserId) {
          await AuthService.signOut().catch(() => undefined);
          setDriverAuthError(isEnglish ? 'This driver account is not available.' : 'حساب السائق غير متاح');
          setDriverPassword('');
          return;
        }
        let driverProfile: any;
        try {
          driverProfile = await DriverService.getDriverProfile(signedUserId);
        } catch (profileError) {
          const profileMessage = profileError instanceof Error
            ? profileError.message
            : profileError && typeof profileError === 'object' && 'message' in profileError
              ? String((profileError as { message: unknown }).message)
              : '';
          await AuthService.signOut().catch(() => undefined);
          setDriverAuthError(profileMessage || (isEnglish ? 'Unable to load this driver account.' : 'تعذر تحميل حساب السائق'));
          setDriverPassword('');
          return;
        }
        if (!driverProfile || driverProfile.status === 'inactive') {
          await AuthService.signOut().catch(() => undefined);
          setDriverAuthError(driverProfile?.status === 'inactive'
            ? (isEnglish ? 'This driver account is suspended.' : 'حساب السائق هذا موقوف')
            : (isEnglish ? 'This driver account was deleted.' : 'تم حذف حساب السائق هذا'));
          setDriverPassword('');
          return;
        }

        setDriverEmail('');
        setDriverPassword('');
        setDriverName('');
        setDriverPhone('');
        setDriverVehicle('');
        go('driverDashboard');
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const normalizedMessage = message.toLowerCase();
        const err = normalizedMessage.includes('email rate limit') || normalizedMessage.includes('rate limit exceeded')
          ? (isEnglish ? 'Too many registration emails were sent. Please wait and try again later, or sign in if you already registered.' : 'تم إرسال عدد كبير من رسائل التسجيل. انتظر قليلاً ثم حاول مرة أخرى، أو سجل الدخول إذا أنشأت حساباً من قبل')
          : normalizedMessage.includes('already registered')
          ? (isEnglish ? 'This email is already registered. Sign in instead.' : 'هذا البريد مسجل بالفعل. سجل الدخول بدلاً من ذلك')
          : normalizedMessage.includes('driver')
            ? (isEnglish ? 'This account is registered as a driver. Please use the driver sign-in.' : 'هذا الحساب مسجل كسائق. استخدم تسجيل دخول السائق')
            : normalizedMessage.includes('invalid email')
              ? (isEnglish ? 'Enter a valid email address.' : 'أدخل بريداً إلكترونياً صحيحاً')
              : message || (isEnglish ? 'Authentication failed' : 'فشلت المصادقة');
        setDriverAuthError(err);
      } finally {
        setDriverAuthLoading(false);
      }
    };

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.authContent, { paddingTop: topPad + 20, paddingBottom: bottomPad + 28 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.authTopRow}>
            <Pressable accessibilityLabel={isEnglish ? 'Back to role selection' : 'العودة لاختيار الحساب'} onPress={() => go('intro')} style={({ pressed }) => [styles.backCircle, pressed && styles.pressed]}>
              <Ionicons name="chevron-forward" size={21} color={colors.ink} />
            </Pressable>
            <View style={styles.authTrustPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.green} />
              <Text style={styles.authTrustText}>{isEnglish ? 'Secure access' : 'دخول آمن'}</Text>
            </View>
          </View>
          <View style={styles.authBrandRow}>
            <View style={styles.authLogo}><Image source={logoImage} style={styles.authLogoImage} /></View>
            <View>
              <Text style={styles.authBrandName}>{isEnglish ? 'Talabati SD' : 'طلباتي SD'}</Text>
              <Text style={styles.authBrandCaption}>{isEnglish ? 'Driver Portal' : 'بوابة السائق'}</Text>
            </View>
          </View>
          <Text style={styles.authEyebrow}>{isEnglish ? (register ? 'JOIN OUR TEAM' : 'DRIVER LOGIN') : (register ? 'انضم إلى فريقنا' : 'تسجيل دخول السائق')}</Text>
          <Text style={styles.authTitle}>{isEnglish ? (register ? 'Become a driver' : 'Driver sign in') : (register ? 'كن سائقاً معنا' : 'تسجيل دخول السائق')}</Text>
          <Text style={styles.authSubtitle}>{isEnglish ? (register ? 'Join Talabati SD and start earning' : 'Sign in to your driver account') : (register ? 'انضم لطلباتي وابدأ في الربح' : 'سجل دخولك لحسابك كسائق')}</Text>

          {driverAuthError ? <View style={styles.authError}><Ionicons name="alert-circle-outline" size={16} color={colors.coral} /><Text style={styles.authErrorText}>{driverAuthError}</Text></View> : null}

          <View style={styles.authFormCard}>
            {register ? (
              <>
                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>{isEnglish ? 'Full name' : 'الاسم الكامل'}</Text>
                  <View style={[styles.inputWrap, styles.authFieldFocused]}>
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                    <TextInput
                      value={driverName}
                      onChangeText={setDriverName}
                      placeholder={isEnglish ? 'Enter your full name' : 'أدخل اسمك الكامل'}
                      placeholderTextColor={colors.mutedForeground}
                      style={styles.input}
                    />
                  </View>
                </View>
                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>{isEnglish ? 'Phone number' : 'رقم الهاتف'}</Text>
                  <View style={[styles.phoneRow, styles.authFieldFocused]}>
                    <TextInput
                      value={driverPhone}
                      onChangeText={setDriverPhone}
                      placeholder="912 345 678"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.input, { flex: 1 }]}
                      keyboardType="phone-pad"
                    />
                    <View style={styles.countryCode}><Text style={styles.countryFlag}>●</Text><Text style={styles.countryText}>+249</Text></View>
                  </View>
                </View>
                <View style={styles.authFieldGroup}>
                  <Text style={styles.authFieldLabel}>{isEnglish ? 'Vehicle type' : 'نوع المركبة'}</Text>
                  <View style={[styles.inputWrap, styles.authFieldFocused]}>
                    <Ionicons name="bicycle-outline" size={18} color={colors.primary} />
                    <TextInput
                      value={driverVehicle}
                      onChangeText={setDriverVehicle}
                      placeholder={isEnglish ? 'e.g., Bicycle, Motorcycle' : 'مثال: دراجة، دراجة نارية'}
                      placeholderTextColor={colors.mutedForeground}
                      style={styles.input}
                    />
                  </View>
                </View>
              </>
            ) : null}
            
            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>{isEnglish ? 'Email' : 'البريد الإلكتروني'}</Text>
              <View style={[styles.inputWrap, styles.authFieldFocused]}>
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                <TextInput
                  value={driverEmail}
                  onChangeText={setDriverEmail}
                  placeholder={isEnglish ? 'driver@example.com' : 'saeq@example.com'}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.authFieldGroup}>
              <Text style={styles.authFieldLabel}>{isEnglish ? 'Password' : 'كلمة المرور'}</Text>
              <View style={[styles.inputWrap, styles.authFieldFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                <TextInput
                  value={driverPassword}
                  onChangeText={setDriverPassword}
                  placeholder={isEnglish ? 'Enter your password' : 'أدخل كلمة المرور'}
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <PrimaryButton 
              label={driverAuthLoading ? (isEnglish ? 'Loading...' : 'جاري التحميل...') : (isEnglish ? (register ? 'Create driver account' : 'Sign in') : (register ? 'إنشاء حساب السائق' : 'تسجيل الدخول'))} 
              onPress={submitDriverAuth}
              disabled={driverAuthLoading}
            />
          </View>

          <Pressable 
            accessibilityLabel={register ? (isEnglish ? 'Go to sign in' : 'الذهاب لتسجيل الدخول') : (isEnglish ? 'Create account' : 'إنشاء حساب')} 
            onPress={() => go(register ? 'driverLogin' : 'driverRegister')} 
            style={styles.authSwitch}
          >
            <Text style={styles.authSwitchText}>
              {register 
                ? (isEnglish ? 'Already have an account? ' : 'لديك حساب بالفعل؟ ') 
                : (isEnglish ? 'New driver? ' : 'سائق جديد؟ ')}
              <Text style={styles.termsLink}>
                {register ? (isEnglish ? 'Sign in' : 'تسجيل الدخول') : (isEnglish ? 'Register here' : 'سجل هنا')}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const HomeScreen = () => {
    const greetingName = name.trim() || user?.user_metadata?.name || user?.user_metadata?.full_name || '';

    return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 100 }}>
        <View style={styles.homeTop}>
          <View style={styles.homeGreeting}>
            <View style={styles.greetingCopy}>
              <Text style={styles.helloText}>{greetingName ? `أهلاً ${greetingName}` : 'أهلاً بك'} <Text style={styles.wave}>✦</Text></Text>
            <Pressable onPress={() => go('addresses')} style={styles.locationLine}><Ionicons name="location" size={15} color={colors.primary} /><Text style={styles.locationText}>{address || 'إضافة عنوان'}</Text><Ionicons name="chevron-down" size={14} color={colors.mutedForeground} /></Pressable>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityLabel="البحث عن مطعم أو طبق"
          accessibilityRole="button"
          onPress={() => {
            setCategoryQuery('');
            setFocusCategorySearch(true);
            go('categories');
          }}
          style={({ pressed }) => [styles.homeSearch, pressed && styles.pressed]}
        >
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <Text style={styles.homeSearchText}>ابحث عن مطعم أو طبق</Text>
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => go('restaurant')} style={styles.promoCard}>
          <Image source={pizzaImage} style={styles.promoImage} />
          <View style={styles.promoOverlay} />
          <View style={styles.promoCopy}><Text style={styles.promoEyebrow}>لفترة محدودة</Text><Text style={styles.promoTitle}>خصم 20%<Text style={styles.promoTitleSmall}> على أول طلب</Text></Text><Text style={styles.promoCode}>TAWSEL20</Text></View>
          <View style={[styles.promoArrow, isEnglish ? styles.promoArrowEnglish : styles.promoArrowArabic]}><Ionicons name="arrow-back" size={18} color={colors.primary} /></View>
        </Pressable>
        <SectionTitle title="اكتشف الخدمات" action="عرض الكل" onPress={() => go('categories')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {[
            { title: 'مطاعم', sub: 'وجبات شهية', filter: 'مطاعم', icon: 'restaurant-outline' as const, tint: colors.coral },
            { title: 'بقالة', sub: 'احتياجاتك اليومية', filter: 'بقالة', icon: 'basket-outline' as const, tint: colors.paleGreen },
            { title: 'مخبوزات', sub: 'طازجة يومياً', filter: 'مخبوزات', icon: 'cafe-outline' as const, tint: '#F7EED9' },
            { title: 'مشروبات', sub: 'باردة وساخنة', filter: 'مشروبات', icon: 'wine-outline' as const, tint: '#E4EFFA' },
          ].map((item) => (
            <Pressable
              key={item.title}
              accessibilityLabel={`تصفح ${item.title}`}
              onPress={() => {
                setCategoryFilter(item.filter);
                go('categories');
              }}
              style={({ pressed }) => [styles.homeCategoryCard, pressed && styles.pressed]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: item.tint }]}><Ionicons name={item.icon} size={25} color={colors.primary} /></View>
              <Text style={styles.categoryTitle}>{item.title}</Text>
              <Text style={styles.categorySub}>{item.sub}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <SectionTitle title="مطاعم مميزة" action="عرض الكل" onPress={() => go('categories')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {clientRestaurants.slice(0, 3).map((restaurant) => <Pressable key={restaurant.id || restaurant.name} onPress={() => { setSelectedRestaurant(restaurant); go('restaurant'); }} style={styles.restaurantCard}><View><Image source={restaurant.image} style={styles.restaurantImage} /><View style={[styles.restaurantTag, { backgroundColor: restaurant.color }]}><Text style={styles.restaurantTagText}>توصيل سريع</Text></View></View><View style={styles.restaurantMeta}><View><Text style={styles.restaurantName}>{restaurant.name}</Text><Text style={styles.restaurantType}>{restaurant.type} · {restaurant.eta}</Text></View><View style={styles.rating}><Ionicons name="star" size={13} color={colors.accent} /><Text style={styles.ratingText}>{restaurant.rating}</Text></View></View></Pressable>)}
        </ScrollView>
         <SectionTitle title="اختياراتنا لك" action="عرض الكل" onPress={() => go('categories')} />
         <Text style={styles.homeChoicesSubtitle}>{isEnglish ? 'Handpicked picks for your next order' : 'اختيارات مميزة لطلبك القادم'}</Text>
         <View style={styles.productGrid}>{clientProducts.slice(0, 4).map((item) => <ProductCard key={item.id} item={item} onPress={() => chooseProduct(item)} onAdd={() => addToCart(item)} />)}</View>
      </ScrollView>
      <BottomTabs />
    </View>
    );
  };

  const SectionTitle = ({ title, action, onPress }: { title: string; action: string; onPress: () => void }) => (
    <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{title}</Text><Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable></View>
  );

  const ProductCard = ({ item, onPress, onAdd, style }: { item: Product; onPress: () => void; onAdd: () => void; style?: object }) => (
    <Pressable onPress={onPress} style={[styles.productCard, screen === 'favorites' && styles.favoriteProductCard, style]}><View style={styles.productImageWrap}><Image source={item.image} style={styles.productImage} /><Pressable onPress={onAdd} style={styles.addCircle}><Ionicons name="add" size={18} color="#fff" /></Pressable></View><Text style={styles.productTitle}>{item.title}</Text><Text style={styles.productSubtitle}>{item.subtitle}</Text><View style={styles.productBottom}><Text style={styles.price}>{money(item.price, isEnglish)}</Text><View style={styles.miniRating}><Ionicons name="star" size={12} color={colors.accent} /><Text style={styles.miniRatingText}>{item.rating}</Text></View></View></Pressable>
  );

  const CategoriesScreen = () => {
    const categoryCards = [
      { title: 'مطاعم', sub: 'وجبات تحبها', filter: 'مطاعم', icon: 'restaurant-outline' as const, tint: '#FBE1DF' },
      { title: 'بقالة', sub: 'طازج كل يوم', filter: 'بقالة', icon: 'basket-outline' as const, tint: '#E5F3E9' },
      { title: 'مخبوزات', sub: 'مخبوزة بحب', filter: 'مخبوزات', icon: 'cafe-outline' as const, tint: '#F7EED9' },
      { title: 'مشروبات', sub: 'باردة وساخنة', filter: 'مشروبات', icon: 'wine-outline' as const, tint: '#E4EFFA' },
      { title: 'معدات بناء وكهرباء', sub: 'أدوات ومستلزمات', filter: 'معدات بناء وكهرباء', icon: 'construct-outline' as const, tint: '#F3E8D2' },
      { title: 'صيدليات', sub: 'أدوية وعناية', filter: 'صيدليات', icon: 'medkit-outline' as const, tint: '#E5F3E9' },
      { title: 'مستشفيات', sub: 'رعاية صحية', filter: 'مستشفيات', icon: 'business-outline' as const, tint: '#E4EFFA' },
      { title: 'هواتف واكسسوارات', sub: 'أجهزة وملحقات', filter: 'هواتف واكسسوارات', icon: 'phone-portrait-outline' as const, tint: '#EDE7F6' },
      { title: 'بوتيكات وادوات تجميل', sub: 'أزياء وعناية', filter: 'بوتيكات وادوات تجميل', icon: 'color-palette-outline' as const, tint: '#FBE1DF' },
      { title: 'هدايا', sub: 'مناسبات وفرح', filter: 'هدايا', icon: 'gift-outline' as const, tint: '#F7EED9' },
      { title: 'شقق وفنادق', sub: 'إقامة مريحة', filter: 'شقق وفنادق', icon: 'bed-outline' as const, tint: '#E4EFFA' },
      { title: 'أخرى', sub: 'خدمات متنوعة', filter: 'أخرى', icon: 'grid-outline' as const, tint: '#F4F1EE' },
    ];
    const filterOptions = productCategoryFilters;
    const normalizeSearch = (value: string) => value
      .trim()
      .toLowerCase()
      .replace(/[إأآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');
    const normalizedQuery = normalizeSearch(categoryQuery);
    const filteredProducts = clientProducts.filter((item) => {
      const matchesFilter = categoryFilter === 'الكل' || item.category === categoryFilter;
      const matchesQuery = !normalizedQuery
        || normalizeSearch(item.title).includes(normalizedQuery)
        || normalizeSearch(item.subtitle).includes(normalizedQuery)
        || normalizeSearch(item.category ?? '').includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
    const sortedProducts = [...filteredProducts].sort((first, second) => {
      if (sortOption === 'price-low') return first.price - second.price;
      if (sortOption === 'price-high') return second.price - first.price;
      if (sortOption === 'alphabetical') return normalizeSearch(first.title).localeCompare(normalizeSearch(second.title), 'ar');
      return clientProducts.indexOf(first) - clientProducts.indexOf(second);
    });
    const visibleProducts = showAllCategoryProducts ? sortedProducts : sortedProducts.slice(0, 6);
    const selectFilter = (filter: string) => {
      setCategoryFilter(filter);
      setShowAllCategoryProducts(false);
      setShowCategoryFilters(false);
      tap();
    };
    const sortOptions = [
      { id: 'recommended', label: isEnglish ? 'Recommended' : 'المقترحة', icon: 'sparkles-outline' },
      { id: 'price-low', label: isEnglish ? 'Price: low to high' : 'السعر: من الأقل للأعلى', icon: 'trending-up-outline' },
      { id: 'price-high', label: isEnglish ? 'Price: high to low' : 'السعر: من الأعلى للأقل', icon: 'trending-down-outline' },
      { id: 'alphabetical', label: isEnglish ? 'Alphabetical' : 'أبجدياً', icon: 'text-outline' },
    ] as const;
    const filterChips = filterOptions.map((filter) => {
      const isActive = categoryFilter === filter;
      return (
        <Pressable
          accessibilityLabel={`عرض ${filter}`}
          key={filter}
          onPress={() => selectFilter(filter)}
          style={({ pressed }) => [
            styles.categoryFilter,
            isActive && styles.categoryFilterActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.categoryFilterText, isActive && styles.categoryFilterTextActive]}>
            {filter}
          </Text>
          {isActive ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </Pressable>
      );
    });

    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageTop}>
            <Text style={styles.pageTitle}>الأقسام</Text>
            <Text style={styles.pageSubtitle}>كل ما تحتاجه، في مكان واحد</Text>
          </View>
          <View style={styles.categoryIntroCard}>
            <View style={styles.categoryIntroIcon}><Ionicons name="sparkles-outline" size={22} color="#fff" /></View>
            <View style={styles.categoryIntroCopy}>
              <Text style={styles.categoryIntroTitle}>{isEnglish ? 'Find exactly what you need' : 'اعثر على كل ما تحتاجه'}</Text>
              <Text style={styles.categoryIntroSub}>{isEnglish ? 'Browse services and discover something new' : 'تصفح الخدمات واكتشف شيئاً جديداً'}</Text>
            </View>
            <View style={styles.categoryIntroCount}><Text style={styles.categoryIntroCountValue}>{categoryCards.length}</Text><Text style={styles.categoryIntroCountLabel}>{isEnglish ? 'categories' : 'قسم'}</Text></View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={colors.mutedForeground} style={styles.searchBoxIcon} />
            <TextInput
              value={categoryQuery}
              onChangeText={(value) => {
                setCategoryQuery(value);
                setShowAllCategoryProducts(false);
              }}
              placeholder="ابحث في الوجبات والأقسام"
              placeholderTextColor={colors.mutedForeground}
              style={styles.searchInput}
              textAlign="right"
              autoFocus={focusCategorySearch}
              onFocus={() => setFocusCategorySearch(false)}
            />
            {categoryQuery ? (
              <Pressable
                accessibilityLabel="مسح البحث"
                onPress={() => setCategoryQuery('')}
                style={({ pressed }) => [styles.searchClearButton, pressed && styles.pressed]}
              >
                <Ionicons name="close-circle" size={19} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="فتح فلاتر الأقسام"
              accessibilityState={{ selected: showCategoryFilters }}
              onPress={() => {
                setShowCategoryFilters((current) => !current);
                tap();
              }}
              style={({ pressed }) => [
                styles.filterButton,
                showCategoryFilters && styles.filterButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={showCategoryFilters ? 'options' : 'options-outline'} size={18} color={showCategoryFilters ? colors.primary : colors.ink} />
            </Pressable>
          </View>

          <View style={styles.categoryGrid}>
            {categoryCards.map((item) => {
              const count = clientProducts.filter((product) => product.category === item.filter).length;
              const isActive = categoryFilter === item.filter;
              return (
                <Pressable
                  accessibilityLabel={`تصفح قسم ${item.title}`}
                  key={item.title}
                  onPress={() => selectFilter(item.filter)}
                  style={({ pressed }) => [
                    styles.largeCategory,
                    isActive && styles.largeCategoryActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.largeCategoryIcon, { backgroundColor: isActive ? colors.primary : item.tint }]}>
                    <Ionicons name={item.icon} size={25} color={isActive ? '#FFFFFF' : colors.ink} />
                  </View>
                  <View style={styles.largeCategoryCopy}>
                    <Text style={[styles.largeCategoryTitle, isActive && styles.largeCategoryTitleActive]}>{item.title}</Text>
                    <Text style={styles.largeCategorySub}>{item.sub} · {count}</Text>
                  </View>
                  <Ionicons name="chevron-back" size={17} color={isActive ? colors.primary : colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>

          <Modal
            visible={showCategoryFilters}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCategoryFilters(false)}
          >
            <View style={styles.categoryFilterModalRoot}>
              <Pressable
                accessibilityLabel="إغلاق الفلاتر"
                onPress={() => setShowCategoryFilters(false)}
                style={styles.categoryFilterBackdrop}
              />
              <View style={styles.categoryFilterSheet}>
                <View style={styles.categoryFilterSheetHandle} />
                <View style={styles.categoryFilterSheetHeader}>
                  <View>
                    <Text style={styles.categoryFilterSheetTitle}>فلترة المنتجات</Text>
                    <Text style={styles.categoryFilterSheetSubtitle}>رتّب النتائج أو اختر القسم المناسب</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="إغلاق الفلاتر"
                    onPress={() => setShowCategoryFilters(false)}
                    style={({ pressed }) => [styles.categoryFilterSheetClose, pressed && styles.pressed]}
                  >
                    <Ionicons name="close" size={20} color={colors.ink} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.categoryFilterSheetContent}>
                  <View style={styles.categoryFilterCurrent}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    <Text style={styles.categoryFilterCurrentText}>
                      {categoryFilter === 'الكل' ? 'كل الأقسام' : `القسم الحالي: ${categoryFilter}`}
                    </Text>
                  </View>
                  <Text style={styles.categoryFilterModalSectionTitle}>ترتيب المنتجات</Text>
                  <View style={styles.categorySortList}>
                    {sortOptions.map((option) => {
                      const isSelected = sortOption === option.id;
                      return (
                        <Pressable
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={option.label}
                          key={option.id}
                          onPress={() => {
                            setSortOption(option.id);
                            setShowAllCategoryProducts(false);
                            tap();
                          }}
                          style={({ pressed }) => [
                            styles.categorySortOption,
                            isSelected && styles.categorySortOptionActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons name={option.icon} size={17} color={isSelected ? '#FFFFFF' : colors.primary} />
                          <Text style={[styles.categorySortOptionText, isSelected && styles.categorySortOptionTextActive]}>{option.label}</Text>
                          {isSelected ? <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.categoryFilterModalSectionTitle}>التصفية حسب القسم</Text>
                  <View style={styles.categoryFilterModalList}>
                    {filterChips}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {visibleProducts.length > 0 ? (
            <>
              <View style={styles.productGrid}>
                {visibleProducts.map((item) => (
                  <ProductCard key={item.id} item={item} onPress={() => chooseProduct(item)} onAdd={() => addToCart(item)} />
                ))}
              </View>
              {visibleProducts.length < filteredProducts.length ? (
                <Pressable
                  accessibilityLabel="عرض المزيد من المنتجات"
                  onPress={() => setShowAllCategoryProducts(true)}
                  style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}
                >
                  <Text style={styles.loadMoreText}>عرض المزيد</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.primary} />
                </Pressable>
              ) : null}
            </>
          ) : (
            <View style={styles.categoryEmpty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>ما لقينا نتائج</Text>
              <Text style={styles.emptySub}>جرّب كلمة ثانية أو اختر قسماً مختلفاً</Text>
              <Pressable
                accessibilityLabel="إعادة ضبط البحث"
                onPress={() => {
                  setCategoryQuery('');
                  setCategoryFilter('الكل');
                }}
                style={({ pressed }) => [styles.emptyReset, pressed && styles.pressed]}
              >
                <Text style={styles.emptyResetText}>عرض كل المنتجات</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
        <BottomTabs />
      </View>
    );
  };

  const RestaurantScreen = () => {
    const restaurantProducts = clientProducts.filter((item) => item.restaurantId === String(selectedRestaurant?.id || ''));
    const restaurantMenu = restaurantProducts.filter((item) => item.category === 'مطاعم');
    const menuByCategory = restaurantCategory === 'المشروبات'
      ? restaurantProducts.filter((item) => item.category === 'مشروبات').slice(0, 6)
      : restaurantCategory === 'الوجبات'
        ? restaurantMenu.slice(0, 8)
        : restaurantProducts.slice(0, 6);
    const categoryTabs: Array<{ label: 'الأكثر طلباً' | 'الوجبات' | 'المشروبات'; icon: keyof typeof Ionicons.glyphMap }> = [
      { label: 'الأكثر طلباً', icon: 'flame-outline' },
      { label: 'الوجبات', icon: 'restaurant-outline' },
      { label: 'المشروبات', icon: 'wine-outline' },
    ];

    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + (cartCount > 0 ? 104 : 28) }}
          stickyHeaderIndices={[2]}
        >
          <View style={[styles.restaurantHero, { paddingTop: topPad }]}>
            <Image source={selectedRestaurant.image} style={styles.restaurantHeroImage} />
            <LinearGradient
              colors={['rgba(36,24,33,0.12)', 'rgba(36,24,33,0.84)']}
              locations={[0.18, 1]}
              style={styles.restaurantHeroGradient}
            />
            <Pressable
              accessibilityLabel="العودة للرئيسية"
              hitSlop={8}
              onPress={() => go('home')}
              style={({ pressed }) => [styles.heroBack, { top: topPad + 12 }, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-forward" size={21} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityLabel={favoriteRestaurantNames.includes(selectedRestaurant.name) ? 'إزالة المطعم من المفضلة' : 'إضافة المطعم إلى المفضلة'}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => toggleRestaurantFavorite(selectedRestaurant.name)}
              style={({ pressed }) => [styles.heroHeart, { top: topPad + 12 }, favoriteRestaurantNames.includes(selectedRestaurant.name) && styles.heroHeartActive, pressed && styles.pressed]}
            >
              <Ionicons name={favoriteRestaurantNames.includes(selectedRestaurant.name) ? 'heart' : 'heart-outline'} size={20} color={favoriteRestaurantNames.includes(selectedRestaurant.name) ? colors.destructive : colors.primary} />
            </Pressable>
            <View style={styles.heroRestaurantInfo}>
              <View style={styles.avatarSquare}>
                <Text style={styles.avatarLetter}>ت</Text>
              </View>
              <View style={styles.heroRestaurantCopy}>
                <View style={styles.restaurantHeroKicker}>
                  <View style={styles.openDot} />
                  <Text style={styles.restaurantHeroKickerText}>مفتوح الآن</Text>
                </View>
                <Text style={styles.heroTitle}>{selectedRestaurant.name}</Text>
                <Text style={styles.heroSub}>{selectedRestaurant.type} · {selectedRestaurant.eta}</Text>
              </View>
              <View style={styles.heroRating}>
                <Ionicons name="star" size={14} color={colors.accent} />
                <Text style={styles.heroRatingText}>{selectedRestaurant.rating}</Text>
                <Text style={styles.heroRatingReviews}>120 تقييم</Text>
              </View>
            </View>
          </View>

          <View style={styles.restaurantTrustRow}>
            <View style={styles.restaurantTrustItem}>
              <View style={styles.restaurantTrustIcon}><Ionicons name="time-outline" size={17} color={colors.primary} /></View>
              <View><Text style={styles.restaurantTrustValue}>{selectedRestaurant.eta}</Text><Text style={styles.restaurantTrustLabel}>وقت التوصيل</Text></View>
            </View>
            <View style={styles.restaurantTrustDivider} />
            <View style={styles.restaurantTrustItem}>
              <View style={styles.restaurantTrustIcon}><Ionicons name="bicycle-outline" size={17} color={colors.primary} /></View>
              <View><Text style={styles.restaurantTrustValue}>15 SDG</Text><Text style={styles.restaurantTrustLabel}>رسوم التوصيل</Text></View>
            </View>
            <View style={styles.restaurantTrustDivider} />
            <View style={styles.restaurantTrustItem}>
              <View style={styles.restaurantTrustIcon}><Ionicons name="shield-checkmark-outline" size={17} color={colors.green} /></View>
              <View><Text style={styles.restaurantTrustValue}>موثوق</Text><Text style={styles.restaurantTrustLabel}>اختيار توصيل</Text></View>
            </View>
          </View>
          <View style={styles.restaurantTabs}>
            <View style={styles.restaurantTabsContent}>
            {categoryTabs.map((tab) => {
              const active = restaurantCategory === tab.label;
              return (
                <Pressable
                  key={tab.label}
                  accessibilityLabel={`تصفح ${tab.label}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => { setRestaurantCategory(tab.label); tap(); }}
                  style={({ pressed }) => [styles.restaurantTab, active && styles.restaurantTabActive, pressed && styles.pressed]}
                >
                  <View style={[styles.restaurantTabIcon, active && styles.restaurantTabIconActive]}>
                    <Ionicons name={tab.icon} size={15} color={active ? colors.primary : colors.mutedForeground} />
                  </View>
                  <Text style={[styles.restaurantTabText, active && styles.restaurantTabTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
            </View>
          </View>

          <View style={styles.menuSection}>
            <View style={styles.menuSectionHeading}>
              <View>
                <Text style={styles.menuSectionTitle}>{restaurantCategory}</Text>
                <Text style={styles.menuSectionSub}>{menuByCategory.length} أصناف مختارة لك اليوم</Text>
              </View>
              <View style={styles.menuSectionMark}><Ionicons name="sparkles-outline" size={17} color={colors.accentForeground} /></View>
            </View>
            <View style={styles.menuList}>
              {menuByCategory.map((item, index) => (
                <View key={item.id} style={[styles.menuItem, index === menuByCategory.length - 1 && styles.menuItemLast]}>
                  <Pressable
                    accessibilityLabel={`عرض ${item.title}`}
                    accessibilityRole="button"
                    onPress={() => chooseProduct(item)}
                    style={({ pressed }) => [styles.menuItemMain, pressed && styles.pressed]}
                  >
                    <Image source={item.image} style={styles.menuImage} />
                    <View style={styles.menuCopy}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSub}>{item.subtitle}</Text>
                      <View style={styles.menuMeta}>
                        <Text style={styles.menuPrice}>{money(item.price, isEnglish)}</Text>
                        <View style={styles.menuItemRating}><Ionicons name="star" size={11} color={colors.accent} /><Text style={styles.menuItemRatingText}>{item.rating}</Text></View>
                      </View>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`إضافة ${item.title} إلى السلة`}
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={() => addToCart(item)}
                    style={({ pressed }) => [styles.menuAdd, pressed && styles.menuAddPressed]}
                  >
                    <Ionicons name="add" size={19} color={colors.primaryForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        {cartCount > 0 ? (
          <Pressable
            accessibilityLabel={`عرض السلة، ${cartCount} عناصر`}
            accessibilityRole="button"
            onPress={() => go('cart')}
            style={({ pressed }) => [styles.cartBar, { bottom: bottomPad + 16 }, pressed && styles.pressed]}
          >
            <View style={styles.cartBarIcon}>
              <Ionicons name="bag-handle-outline" size={20} color={colors.primaryForeground} />
              <Text style={styles.cartBarCount}>{cartCount}</Text>
            </View>
            <Text style={styles.cartBarText}>عرض السلة</Text>
            <Text style={styles.cartBarTotal}>{money(total, isEnglish)}</Text>
            <Ionicons name="arrow-back" size={17} color={colors.primaryForeground} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const ProductScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 122 }}
        style={styles.productScroll}
      >
        <View style={styles.productHero}>
          <Image source={selectedProduct.image} style={styles.productHeroImage} />
          <LinearGradient
            colors={['rgba(36,24,33,0.08)', 'rgba(36,24,33,0.02)', 'rgba(36,24,33,0.62)']}
            locations={[0, 0.48, 1]}
            style={styles.productHeroShade}
          />
          <View style={[styles.productHeroControls, { paddingTop: topPad + 10 }]}>
            <Pressable
              accessibilityLabel="العودة إلى المطعم"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => go('restaurant')}
              style={({ pressed }) => [styles.productHeroBack, pressed && styles.heroControlPressed]}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityLabel={favoriteProductIds.includes(selectedProduct.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              accessibilityRole="button"
              accessibilityState={{ selected: favoriteProductIds.includes(selectedProduct.id) }}
              hitSlop={8}
              onPress={() => toggleProductFavorite(selectedProduct.id)}
              style={({ pressed }) => [styles.productHeroHeart, favoriteProductIds.includes(selectedProduct.id) && styles.productHeroHeartActive, pressed && styles.heroControlPressed]}
            >
              <Ionicons name={favoriteProductIds.includes(selectedProduct.id) ? 'heart' : 'heart-outline'} size={21} color={favoriteProductIds.includes(selectedProduct.id) ? colors.primary : colors.ink} />
            </Pressable>
          </View>
          <View style={styles.heroImageFooter}>
            <View style={styles.heroFreshTag}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={styles.heroFreshText}>اختيار اليوم</Text>
            </View>
            <Text style={styles.heroImageHint}>من مطبخ {selectedRestaurant.name}</Text>
          </View>
        </View>

        <View style={styles.productDetail}>
          <View style={styles.detailTitleRow}>
            <View style={styles.detailTitleCopy}>
              <Text style={styles.detailTitle}>{selectedProduct.title}</Text>
              <Text style={styles.detailSubtitle}>{selectedProduct.subtitle}</Text>
            </View>
            <View style={styles.detailPriceBlock}>
              <Text style={styles.detailPrice}>{money(selectedProduct.price, isEnglish)}</Text>
              <Text style={styles.detailPriceCaption}>للحبة</Text>
            </View>
          </View>

          <View style={styles.detailRating}>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text style={styles.detailRatingText}>{selectedProduct.rating}</Text>
            </View>
            <Text style={styles.detailMuted}>120 تقييم</Text>
            <View style={styles.detailDot} />
            <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
            <Text style={styles.detailMuted}>20–30 دقيقة</Text>
          </View>

          <View style={styles.productTrustRow}>
            <View style={styles.productTrustItem}>
              <View style={styles.productTrustIcon}><Ionicons name="shield-checkmark-outline" size={17} color={colors.green} /></View>
              <Text style={styles.productTrustText}>موثوق</Text>
            </View>
            <View style={styles.productTrustDivider} />
            <View style={styles.productTrustItem}>
              <View style={styles.productTrustIcon}><Ionicons name="flame-outline" size={17} color={colors.accentForeground} /></View>
              <Text style={styles.productTrustText}>يصل ساخناً</Text>
            </View>
            <View style={styles.productTrustDivider} />
            <View style={styles.productTrustItem}>
              <View style={styles.productTrustIcon}><Ionicons name="restaurant-outline" size={17} color={colors.primary} /></View>
              <Text style={styles.productTrustText}>محضّر بعناية</Text>
            </View>
          </View>

          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeading}>
              <View style={styles.descriptionMark} />
              <Text style={styles.detailSection}>عن المنتج</Text>
            </View>
            <Text style={styles.detailDescription}>{selectedProduct.description || selectedProduct.subtitle || 'لا يوجد وصف لهذا المنتج.'}</Text>
          </View>

          <View style={styles.quantityCard}>
            <View>
              <Text style={styles.quantityLabel}>الكمية</Text>
              <Text style={styles.quantityHint}>اضبط الكمية التي تريدها</Text>
            </View>
            <View style={styles.quantityControl}>
              <Pressable
                accessibilityLabel="تقليل الكمية"
                accessibilityRole="button"
                accessibilityState={{ disabled: productQuantity === 1 }}
                disabled={productQuantity === 1}
                hitSlop={6}
                onPress={() => { setProductQuantity((current) => Math.max(1, current - 1)); tap(); }}
                style={({ pressed }) => [styles.quantityButton, productQuantity === 1 && styles.quantityButtonDisabled, pressed && styles.quantityButtonPressed]}
              >
                <Ionicons name="remove" size={18} color={productQuantity === 1 ? colors.mutedForeground : colors.ink} />
              </Pressable>
              <Text style={styles.quantityValue}>{productQuantity}</Text>
              <Pressable
                accessibilityLabel="زيادة الكمية"
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => { setProductQuantity((current) => current + 1); tap(); }}
                style={({ pressed }) => [styles.quantityButton, pressed && styles.quantityButtonPressed]}
              >
                <Ionicons name="add" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}>
        <Pressable
          accessibilityLabel="أضف المنتج إلى السلة وانتقل إلى السلة"
          accessibilityRole="button"
          onPress={() => { addSelectedProductToCart(); go('cart'); }}
          style={({ pressed }) => [styles.productCta, pressed && styles.productCtaPressed]}
        >
          <View style={styles.productCtaIcon}>
            <Ionicons name="bag-handle-outline" size={20} color={colors.primary} />
            <Text style={styles.productCtaQuantity}>{productQuantity}</Text>
          </View>
          <Text style={styles.productCtaLabel}>أضف إلى السلة</Text>
          <Text style={styles.productCtaPrice}>{money(selectedProduct.price * productQuantity, isEnglish)}</Text>
          <Ionicons name="arrow-back" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );

  const CartScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 190 }}
      >
        <View style={styles.headerStatic}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>السلة</Text>
            <Text style={styles.headerSubtitle}>{cartCount} عناصر</Text>
          </View>
        </View>
        {cart.length ? (
          <>
            {cart.every((item) => ['مطاعم', 'مخبوزات', 'مشروبات'].includes(item.category ?? '') && item.restaurantName) && new Set(cart.map((item) => item.restaurantName)).size === 1 ? <View style={styles.cartRestaurant}>
              <View style={styles.smallAvatar}><Text style={styles.avatarLetter}>ت</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartRestaurantTitle}>{cart[0].restaurantName}</Text>
                <Text style={styles.cartRestaurantSub}>توصيل من المطعم</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            </View> : null}
            <View style={styles.cartItems}>
              {cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <Image source={item.image} style={styles.cartImage} />
                  <View style={styles.cartCopy}>
                    <Text style={styles.cartTitle}>{item.title}</Text>
                    <Text style={styles.cartSub}>{item.subtitle}</Text>
                    <Text style={styles.cartPrice}>{money(item.price * item.quantity, isEnglish)}</Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <Pressable accessibilityLabel={`زيادة كمية ${item.title}`} onPress={() => changeQuantity(item.id, 1)} style={({ pressed }) => [styles.miniQty, pressed && styles.pressed]}>
                      <Ionicons name="add" size={14} color={colors.ink} />
                    </Pressable>
                    <Text style={styles.miniQtyValue}>{item.quantity}</Text>
                    <Pressable accessibilityLabel={`تقليل كمية ${item.title}`} onPress={() => changeQuantity(item.id, -1)} style={({ pressed }) => [styles.miniQty, pressed && styles.pressed]}>
                      <Ionicons name="remove" size={14} color={colors.ink} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <Summary subtotal={subtotal} delivery={delivery} total={total} />
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="bag-handle-outline" size={34} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>سلتك فارغة</Text>
            <Text style={styles.emptySub}>أضف شيئاً لذيذاً لتبدأ طلبك</Text>
            <PrimaryButton label="استكشف المطاعم" onPress={() => go('home')} />
          </View>
        )}
      </ScrollView>
      {cart.length ? (
        <View style={[styles.stickyCta, { bottom: bottomPad + 67, paddingBottom: 12 }]}>
          <PrimaryButton label="المتابعة للدفع" onPress={() => go('address')} />
        </View>
      ) : null}
      <BottomTabs />
    </View>
  );

  const Summary = ({ subtotal: sub, delivery: del, total: final }: { subtotal: number; delivery: number; total: number }) => <View style={styles.summary}><View style={styles.summaryRow}><Text style={styles.summaryMuted}>المجموع الفرعي</Text><Text style={styles.summaryValue}>{money(sub)}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryMuted}>رسوم التوصيل</Text><Text style={styles.summaryValue}>{money(del)}</Text></View><View style={styles.summaryDivider} /><View style={styles.summaryRow}><Text style={styles.summaryTotalLabel}>الإجمالي</Text><Text style={styles.summaryTotal}>{money(final)}</Text></View></View>;

  const CheckoutHeader = ({ step, title }: { step: number; title: string }) => <><View style={[styles.checkoutHeader, { paddingTop: topPad + 8 }]}><Pressable onPress={() => go(step === 1 ? 'cart' : step === 2 ? 'address' : step === 3 ? 'payment' : 'review')} style={styles.headerIcon}><Ionicons name="chevron-back" size={21} color={colors.ink} /></Pressable><View style={styles.headerCenter}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSubtitle}>إتمام الطلب</Text></View><Text style={styles.stepText}>{step}/4</Text></View><View style={styles.stepsLine}>{[1, 2, 3, 4].map((item) => <View key={item} style={[styles.stepPill, item <= step && styles.stepPillActive]} />)}</View></>;

  const AddressScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}><CheckoutHeader step={1} title="العنوان" /><View style={styles.checkoutBody}><Text style={styles.checkoutLabel}>اختر عنوان التوصيل</Text><Pressable style={styles.selectedAddress}><Ionicons name="location" size={20} color={colors.primary} /><View style={{ flex: 1 }}><Text style={styles.addressTitle}>المنزل</Text><Text style={styles.addressText}>{address}</Text></View><Ionicons name="checkmark-circle" size={23} color={colors.primary} /></Pressable><Pressable style={styles.addAddressRow} onPress={() => go('addresses')}><Ionicons name="add-circle-outline" size={22} color={colors.primary} /><Text style={styles.addAddressText}>إضافة عنوان جديد</Text></Pressable><View style={styles.deliveryNote}><Ionicons name="information-circle-outline" size={19} color={colors.mutedForeground} /><Text style={styles.deliveryNoteText}>سيصل طلبك خلال 25–30 دقيقة تقريباً</Text></View></View></ScrollView><View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}><PrimaryButton label="التالي" onPress={() => go('payment')} /></View></View>;

  const PaymentScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}><CheckoutHeader step={2} title="طريقة الدفع" /><View style={styles.checkoutBody}><Text style={styles.checkoutLabel}>اختر طريقة الدفع</Text>{paymentOptions.map((method) => <Pressable key={method.id} onPress={() => setPaymentMethod(method.id)} style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionActive]}><View style={styles.paymentIcon}><Ionicons name={method.icon} size={21} color={paymentMethod === method.id ? colors.primary : colors.mutedForeground} /></View><View style={{ flex: 1 }}><Text style={styles.paymentTitle}>{method.title}</Text><Text style={styles.paymentSub}>{paymentDetails[method.id] ? `الحساب: ${maskPaymentDetails(paymentDetails[method.id])}` : method.sub}</Text></View><View style={[styles.radio, paymentMethod === method.id && styles.radioActive]}>{paymentMethod === method.id ? <View style={styles.radioDot} /> : null}</View></Pressable>)}<Pressable onPress={() => go('payments')} style={styles.addAddressRow}><Ionicons name="add-circle-outline" size={22} color={colors.primary} /><Text style={styles.addAddressText}>إدارة طرق الدفع</Text></Pressable></View></ScrollView><View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}><PrimaryButton label="التالي" onPress={() => go('review')} /></View></View>;

  const ReviewScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}><CheckoutHeader step={3} title="مراجعة الطلب" /><View style={styles.checkoutBody}><Text style={styles.checkoutLabel}>تفاصيل الطلب</Text><View style={styles.reviewCard}>{cart.map((item) => <View key={item.id} style={styles.reviewItem}><Image source={item.image} style={styles.reviewImage} /><View style={{ flex: 1 }}><Text style={styles.reviewTitle}>{item.title}</Text><Text style={styles.reviewSub}>الكمية: {item.quantity}</Text></View><Text style={styles.reviewPrice}>{money(item.price * item.quantity)}</Text></View>)}<View style={styles.summaryDivider} /><Summary subtotal={subtotal} delivery={delivery} total={total} /></View><Text style={styles.checkoutLabel}>عنوان التوصيل</Text><View style={styles.infoCard}><Ionicons name="location-outline" size={19} color={colors.primary} /><Text style={styles.infoCardText}>{address}</Text><Ionicons name="chevron-back" size={17} color={colors.mutedForeground} /></View><Text style={styles.checkoutLabel}>طريقة الدفع</Text><View style={styles.infoCard}><Ionicons name="card-outline" size={19} color={colors.primary} /><Text style={styles.infoCardText}>{paymentOptions.find((method) => method.id === paymentMethod)?.title ?? 'بنكك'}{paymentDetails[paymentMethod] ? ` · ${maskPaymentDetails(paymentDetails[paymentMethod])}` : ''}</Text><Ionicons name="chevron-back" size={17} color={colors.mutedForeground} /></View></View></ScrollView><View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}><PrimaryButton label="التالي" onPress={() => go('paymentVerification')} /></View></View>;

  const PaymentVerificationScreen = () => {
    const isPaid = paymentStatus === 'paid';
    const isSubmitting = submitPaymentMutation.isPending;
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}>
          <CheckoutHeader step={4} title="تأكيد الدفع" />
          <View style={styles.checkoutBody}>
            {isPaid ? (
              <View style={styles.paymentStateCard}>
                <View style={styles.paymentStateIconPaid}><Ionicons name="checkmark" size={30} color="#fff" /></View>
                <Text style={styles.paymentStateTitle}>تم تأكيد الدفع</Text>
                <Text style={styles.paymentStateSub}>تمت مراجعة عملية الدفع بنجاح، ويمكنك الآن متابعة طلبك.</Text>
              </View>
            ) : paymentSubmissionId ? (
              <View style={styles.paymentStateCard}>
                <View style={styles.paymentStateIconPending}><Ionicons name="time-outline" size={30} color={colors.primary} /></View>
                <Text style={styles.paymentStateTitle}>بانتظار مراجعة الدفع</Text>
                <Text style={styles.paymentStateSub}>أرسلنا بيانات العملية للإدارة. سنحدّث الحالة فور تأكيدها.</Text>
                <View style={styles.paymentReference}><Text style={styles.paymentReferenceLabel}>رقم المتابعة</Text><Text style={styles.paymentReferenceValue}>#{paymentSubmissionId}</Text></View>
              </View>
            ) : (
              <>
                <View style={styles.paymentVerifyIntro}>
                  <View style={styles.paymentVerifyIcon}><Ionicons name="receipt-outline" size={25} color={colors.primary} /></View>
                  <Text style={styles.paymentVerifyTitle}>أدخل آخر 4 أرقام من رقم العملية</Text>
                  <Text style={styles.paymentVerifySub}>استخدم الرقم الظاهر في إيصال الدفع حتى نتمكن من مراجعة طلبك.</Text>
                </View>
                <Text style={styles.checkoutLabel}>رقم العملية</Text>
                <RNTextInput
                  value={transactionLast4}
                  onChangeText={(value) => setTransactionLast4(value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="٠٠٠٠"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
                  style={styles.transactionInput}
                />
                <Text style={styles.transactionHint}>{transactionLast4.length}/4 أرقام</Text>
                <View style={styles.paymentAccountsCard}>
                  <View style={styles.paymentAccountsHeader}>
                    <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                    <Text style={styles.paymentAccountsTitle}>بيانات التحويل</Text>
                  </View>
                  <View style={styles.paymentAccountRow}>
                    <View style={styles.paymentAccountIcon}><Ionicons name="phone-portrait-outline" size={17} color={colors.primary} /></View>
                    <View style={styles.paymentAccountCopy}>
                      <Text style={styles.paymentAccountProvider}>بنكك</Text>
                      <Text style={styles.paymentAccountName}>اسم الحساب: عبدالله علي عبدالله</Text>
                      <Text style={styles.paymentAccountNumber}>رقم الحساب: 3763350</Text>
                    </View>
                  </View>
                  <View style={styles.paymentAccountDivider} />
                  <View style={styles.paymentAccountRow}>
                    <View style={styles.paymentAccountIcon}><Ionicons name="wallet-outline" size={17} color={colors.primary} /></View>
                    <View style={styles.paymentAccountCopy}>
                      <Text style={styles.paymentAccountProvider}>أوكاش</Text>
                      <Text style={styles.paymentAccountName}>اسم الحساب: عبدالله علي عبدالله</Text>
                      <Text style={styles.paymentAccountNumber}>رقم الحساب: 1780482</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.paymentVerifyNote}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} /><Text style={styles.paymentVerifyNoteText}>لن نطلب رقم العملية كاملاً أو أي رمز سري.</Text></View>
                {paymentSubmitError ? <Text style={styles.paymentSubmitError}>{paymentSubmitError}</Text> : null}
              </>
            )}
          </View>
        </ScrollView>
        <View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}>
          {isPaid ? <PrimaryButton label="متابعة لتتبع الطلب" onPress={() => openOrderTracking(recentOrder?.orderId ?? '')} /> : paymentSubmissionId ? <PrimaryButton label="العودة للرئيسية" onPress={() => resetTo('home')} /> : <PrimaryButton label={isSubmitting ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'} onPress={submitPaymentForReview} disabled={transactionLast4.length !== 4 || isSubmitting} />}
        </View>
      </View>
    );
  };

  const TrackScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 30 }}><View style={styles.trackTop}><Pressable onPress={() => openTab('home')} style={styles.headerIcon}><Ionicons name="chevron-forward" size={21} color={colors.ink} /></Pressable><View style={styles.headerCenter}><Text style={styles.headerTitle}>تتبع الطلب</Text><Text style={styles.headerSubtitle}>طلب رقم #123456</Text></View><Pressable onPress={() => go('support')} style={styles.headerIcon}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /></Pressable></View><View style={styles.trackStatus}><View style={styles.trackCheck}><Ionicons name="checkmark" size={27} color="#fff" /></View><Text style={styles.trackStatusTitle}>جاري تحضير طلبك</Text><Text style={styles.trackStatusSub}>سيصل طلبك خلال 25–30 دقيقة</Text></View><View style={styles.mapCard}><View style={styles.mapRoadOne} /><View style={styles.mapRoadTwo} /><View style={styles.mapRoadThree} /><View style={styles.mapPinStart}><Ionicons name="location" size={21} color={colors.primary} /></View><View style={styles.mapPinEnd}><Ionicons name="bicycle" size={18} color="#fff" /></View><View style={styles.mapLabel}>الخرطوم</View></View><View style={styles.progressTrack}>{[['تم تأكيد الطلب', 'Confirmed', true], ['جاري التحضير', 'Preparing', true], ['في الطريق', 'On the way', false], ['تم التوصيل', 'Delivered', false]].map(([title, sub, done], index) => <View key={title as string} style={styles.progressStep}><View style={[styles.progressDot, done && styles.progressDotDone]}>{done ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}</View><View style={{ flex: 1 }}><Text style={[styles.progressTitle, done && styles.progressTitleDone]}>{title as string}</Text><Text style={styles.progressSub}>{sub as string}</Text></View>{index < 3 ? <View style={[styles.progressLine, done && index === 0 && styles.progressLineDone]} /> : null}</View>)}</View><View style={styles.courierCard}><View style={styles.courierAvatar}><Ionicons name="person" size={22} color="#fff" /></View><View style={{ flex: 1 }}><Text style={styles.courierName}>محمد أحمد</Text><Text style={styles.courierSub}>سائق التوصيل · 4.8 ★</Text></View><Pressable style={styles.callButton}><Ionicons name="call-outline" size={19} color={colors.primary} /></Pressable><Pressable style={styles.callButton}><Ionicons name="chatbubble-outline" size={19} color={colors.primary} /></Pressable></View></ScrollView></View>;

  const LiveTrackScreen = () => {
    const order = trackingOrder;
    const deliveryRecord = order?.deliveries?.[0] ?? null;
    const status = deliveryRecord?.status || order?.status || 'pending';
    const statusIndex = status === 'completed' || status === 'delivered'
      ? 3
      : status === 'driver_accepted' || status === 'in_progress' || status === 'picked_up'
        ? 2
        : status === 'preparing'
          ? 1
          : 0;
    const statusLabels = ['تم تأكيد الطلب', 'جاري التحضير', 'في الطريق', 'تم التوصيل'];
    const driver = deliveryRecord?.drivers;
    const driverName = driver?.name || driver?.full_name || 'لم يتم تعيين سائق بعد';
    const driverPhone = driver?.phone || '';

    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 30 }}>
          <View style={styles.trackTop}>
            <Pressable onPress={() => openTab('orders')} style={styles.headerIcon}><Ionicons name="chevron-forward" size={21} color={colors.ink} /></Pressable>
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>تتبع الطلب</Text><Text style={styles.headerSubtitle}>طلب رقم #{trackingOrderId || '—'}</Text></View>
            <Pressable onPress={() => go('support')} style={styles.headerIcon}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /></Pressable>
          </View>
          <View style={styles.trackStatus}>
            <View style={[styles.trackCheck, statusIndex === 3 && styles.trackCheckDelivered]}><Ionicons name={statusIndex === 3 ? 'checkmark' : 'time-outline'} size={27} color="#fff" /></View>
            <Text style={styles.trackStatusTitle}>{statusLabels[statusIndex]}</Text>
            <Text style={styles.trackStatusSub}>{order?.delivery_address || 'سيظهر عنوان التوصيل هنا'}</Text>
          </View>
          <View style={styles.progressTrack}>
            {statusLabels.map((label, index) => {
              const done = index <= statusIndex;
              return <View key={label} style={styles.progressStep}><View style={[styles.progressDot, done && styles.progressDotDone]}><Ionicons name={done ? 'checkmark' : 'ellipse-outline'} size={11} color={done ? '#fff' : colors.mutedForeground} /></View><View style={{ flex: 1 }}><Text style={[styles.progressTitle, done && styles.progressTitleDone]}>{label}</Text><Text style={styles.progressSub}>{index < statusIndex ? 'اكتملت' : index === statusIndex ? 'الحالة الحالية' : 'بانتظار التحديث'}</Text></View></View>;
            })}
          </View>
          <View style={styles.trackOrderCard}>
            <View style={styles.trackOrderCardHeader}><Text style={styles.trackOrderCardTitle}>تفاصيل الطلب</Text><Text style={styles.trackOrderNumber}>#{trackingOrderId || '—'}</Text></View>
            <Text style={styles.trackOrderRestaurant}>{order?.restaurant || 'طلبك'}</Text>
            <Text style={styles.trackOrderItems}>{Array.isArray(order?.items) ? `${order.items.length} عناصر` : 'تفاصيل المنتجات محفوظة في الطلب'}</Text>
            <Text style={styles.trackOrderTotal}>{money(Number(order?.total || 0))}</Text>
          </View>
          <View style={styles.courierCard}>
            <View style={styles.courierAvatar}><Ionicons name="person" size={22} color="#fff" /></View>
            <View style={{ flex: 1 }}><Text style={styles.courierName}>{driverName}</Text><Text style={styles.courierSub}>{driver ? `${driver.vehicle_type || 'سائق التوصيل'}${driverPhone ? ` · ${driverPhone}` : ''}` : 'سيظهر السائق بعد قبول الطلب'}</Text></View>
            {driverPhone ? <Pressable onPress={() => Linking.openURL(`tel:${driverPhone}`)} style={styles.callButton}><Ionicons name="call-outline" size={19} color={colors.primary} /></Pressable> : null}
          </View>
        </ScrollView>
      </View>
    );
  };

  const OrdersScreen = () => {
    // Transform Supabase orders to app format
    const formattedSupabaseOrders = supabaseOrders.map((order: any) => ({
      id: order.order_id || order.id,
      date: order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SD', { year: 'numeric', month: 'short', day: 'numeric' }) : 'تاريخ غير معروف',
      restaurant: order.restaurant,
      summary: `${order.items?.length || 0} عناصر · ${order.delivery_address}`,
      status: (order.status === 'completed' || order.status === 'delivered' ? 'completed' : 'active') as 'active' | 'completed',
      statusLabel: order.status === 'pending' ? 'بانتظار التأكيد' : order.status === 'completed' || order.status === 'delivered' ? 'تم التوصيل' : 'جاري المعالجة',
      statusHint: order.status === 'pending' ? 'بانتظار مراجعة الطلب' : 'تم التوصيل بنجاح',
      total: order.total,
      items: order.items || [],
      address: order.delivery_address,
      paymentMethod: order.payment_method,
    }));

    const orders: Array<{
      id: string;
      date: string;
      restaurant: string;
      summary: string;
      status: 'active' | 'completed';
      statusLabel: string;
      statusHint: string;
      total: number;
      items: Product[];
      address?: string;
      paymentMethod?: string;
    }> = [
      ...(recentOrder ? [{
        id: recentOrder.orderId,
        date: 'الآن',
        restaurant: 'طلباتي SD',
        summary: `${recentOrder.items.length} عناصر · ${recentOrder.address}`,
        status: 'active' as const,
        statusLabel: paymentStatus === 'paid' ? 'جاري التحضير' : 'بانتظار تأكيد الدفع',
        statusHint: paymentStatus === 'paid' ? 'سيصل خلال 25–30 دقيقة' : 'بانتظار مراجعة الدفع',
        total: recentOrder.total,
        items: recentOrder.items,
        address: recentOrder.address,
        paymentMethod: recentOrder.paymentMethod,
      }] : []),
      // Use only Supabase orders - no mock orders for real users
      ...formattedSupabaseOrders,
    ];
    const visibleOrders = orders.filter((order) => orderFilter === 'all' || order.status === orderFilter);
    const activeOrder = orders.find((order) => order.status === 'active');
    const filterTabs: Array<{ id: 'all' | 'active' | 'past'; label: string; count: number }> = [
      { id: 'all', label: 'الكل', count: orders.length },
      { id: 'active', label: 'الجارية', count: orders.filter((order) => order.status === 'active').length },
      { id: 'past', label: 'السابقة', count: orders.filter((order) => order.status === 'completed').length },
    ];
    const reorder = (items: Product[]) => {
      items.forEach((item) => addToCart(item));
      setExpandedOrderId(null);
      go('cart');
    };

    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}
        >
          <View style={styles.pageTop}>
            <Text style={styles.pageTitle}>طلباتي</Text>
            <Text style={styles.pageSubtitle}>تابع كل طلباتك بسهولة</Text>
          </View>

          {activeOrder ? (
            <Pressable
              accessibilityLabel="تتبع الطلب الجاري"
              onPress={() => {
                const activeOrderId = activeOrder.id;
                openOrderTracking(activeOrderId);
              }}
              style={({ pressed }) => [styles.activeOrderBanner, pressed && styles.pressed]}
            >
              <View style={styles.activeOrderIcon}>
                <Ionicons name="bicycle" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.activeOrderCopy}>
                <View style={styles.activeOrderTitleRow}>
                  <Text style={styles.activeOrderTitle}>طلبك في الطريق</Text>
                  <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.livePillText}>مباشر</Text></View>
                </View>
                <Text style={styles.activeOrderSub}>{activeOrder.restaurant} · {activeOrder.statusHint}</Text>
              </View>
              <Ionicons name="chevron-back" size={19} color="#FFFFFF" />
            </Pressable>
          ) : null}

          <View style={styles.orderFilters}>
            {filterTabs.map((tab) => {
              const isActive = orderFilter === tab.id;
              return (
                <Pressable
                  accessibilityLabel={`عرض ${tab.label} من الطلبات`}
                  key={tab.id}
                  onPress={() => {
                    setOrderFilter(tab.id);
                    setExpandedOrderId(null);
                    tap();
                  }}
                  style={({ pressed }) => [
                    styles.orderFilterButton,
                    isActive && styles.orderFilterButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.orderFilterText, isActive && styles.orderFilterTextActive]}>{tab.label}</Text>
                  <View style={[styles.orderFilterCount, isActive && styles.orderFilterCountActive]}>
                    <Text style={[styles.orderFilterCountText, isActive && styles.orderFilterCountTextActive]}>{tab.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.ordersSectionHeader}>
            <Text style={styles.sectionTitle}>{orderFilter === 'all' ? 'سجل الطلبات' : orderFilter === 'active' ? 'الطلبات الجارية' : 'الطلبات السابقة'}</Text>
            <View style={styles.orderCountHint}>
              <Ionicons name="receipt-outline" size={15} color={colors.mutedForeground} />
              <Text style={styles.orderCountHintText}>{visibleOrders.length} طلب</Text>
            </View>
          </View>

          {visibleOrders.length > 0 ? visibleOrders.map((order, orderIndex) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <View key={`${order.id}-${orderIndex}`} style={[styles.orderCard, order.status === 'active' && styles.orderCardActive]}>
                <Pressable
                  accessibilityLabel={`تفاصيل الطلب رقم ${order.id}`}
                  onPress={() => {
                    if (order.status === 'active') {
                      openOrderTracking(order.id);
                    } else {
                      setExpandedOrderId(isExpanded ? null : order.id);
                      tap();
                    }
                  }}
                  style={({ pressed }) => [styles.orderCardTop, pressed && styles.pressed]}
                >
                  <View style={styles.orderIdentity}>
                    <Text style={styles.orderNumber}>#{order.id}</Text>
                    <Text style={styles.orderDate}>{order.date}</Text>
                  </View>
                  {order.status === 'active' ? (
                    <View style={styles.orderStatus}><View style={styles.statusDot} /><Text style={styles.statusText}>{order.statusLabel}</Text></View>
                  ) : (
                    <View style={styles.completedStatus}><Text style={styles.completedStatusText}>{order.statusLabel}</Text></View>
                  )}
                </Pressable>

                <View style={styles.orderProducts}>
                  {order.items.slice(0, 2).map((item, index) => (
                    <Image key={item.id} source={item.image} style={[styles.orderThumb, index > 0 && { marginLeft: -10 }]} />
                  ))}
                  {order.items.length > 2 ? <View style={styles.orderMore}><Text style={styles.orderMoreText}>+{order.items.length - 2}</Text></View> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={styles.orderTotal}>{money(order.total, isEnglish)}</Text>
                </View>

                <View style={styles.orderDivider} />
                <View style={styles.orderCardBottom}>
                  <View>
                    <Text style={styles.orderRestaurant}>{order.restaurant} · {order.items.length} عناصر</Text>
                    <Text style={styles.orderSummary}>{order.summary}</Text>
                  </View>
                  {order.status === 'active' ? (
                    <Pressable accessibilityLabel="تتبع الطلب" onPress={() => openOrderTracking(order.id)} style={styles.orderAction}>
                      <Text style={styles.reorderText}>تتبع الطلب</Text>
                      <Ionicons name="arrow-back" size={13} color={colors.primary} />
                    </Pressable>
                  ) : (
                    <Pressable accessibilityLabel="إعادة الطلب" onPress={() => reorder(order.items)} style={styles.orderAction}>
                      <Text style={styles.reorderText}>إعادة الطلب</Text>
                      <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                    </Pressable>
                  )}
                </View>

                {isExpanded ? (
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderDetailsTitle}>تفاصيل الطلب</Text>
                    {order.items.map((item) => (
                      <View key={item.id} style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailName}>{item.title}</Text>
                        <Text style={styles.orderDetailPrice}>{money(item.price, isEnglish)}</Text>
                      </View>
                    ))}
                    <View style={styles.orderDetailMeta}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={colors.green} />
                      <Text style={styles.orderDetailMetaText}>{order.statusHint}</Text>
                    </View>
                    {order.address ? <Text style={styles.orderDetailInfo}>العنوان: {order.address}</Text> : null}
                    {order.paymentMethod ? <Text style={styles.orderDetailInfo}>الدفع: {order.paymentMethod}</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          }) : (
            <View style={styles.ordersEmpty}>
              <View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={32} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>لا توجد طلبات هنا</Text>
              <Text style={styles.emptySub}>{orderFilter === 'active' ? 'ستظهر طلباتك الجارية هنا' : 'ابدأ بطلب وجبتك المفضلة'}</Text>
              <Pressable accessibilityLabel="استكشف الأقسام" onPress={() => go('categories')} style={({ pressed }) => [styles.emptyReset, pressed && styles.pressed]}>
                <Text style={styles.emptyResetText}>استكشف الأقسام</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
        <BottomTabs />
      </View>
    );
  };

  const FavoritesScreen = () => {
    const favoriteProducts = clientProducts.filter((item) => favoriteProductIds.includes(item.id));
    const favoriteRestaurants = clientRestaurants.filter((item) => favoriteRestaurantNames.includes(item.name));
    const emptyFavorites = favoriteView === 'products' ? favoriteProducts.length === 0 : favoriteRestaurants.length === 0;

    return <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}><View style={styles.pageTop}><Text style={styles.pageTitle}>المفضلة</Text><Text style={styles.pageSubtitle}>أحب ما لديك في مكان واحد</Text></View><View style={[styles.favoriteTabs, styles.headerContentGap]}><Pressable onPress={() => setFavoriteView('products')} style={[styles.favoriteTabButton, favoriteView === 'products' && styles.favoriteTabButtonActive]}><Text style={favoriteView === 'products' ? styles.favoriteTabActive : styles.favoriteTab}>الأطباق</Text></Pressable><Pressable onPress={() => setFavoriteView('restaurants')} style={[styles.favoriteTabButton, favoriteView === 'restaurants' && styles.favoriteTabButtonActive]}><Text style={favoriteView === 'restaurants' ? styles.favoriteTabActive : styles.favoriteTab}>المطاعم</Text></Pressable></View>{emptyFavorites ? <View style={styles.favoriteEmpty}><View style={styles.emptyIcon}><Ionicons name="heart-outline" size={32} color={colors.primary} /></View><Text style={styles.emptyTitle}>لا توجد مفضلات هنا</Text><Text style={styles.emptySub}>أضف ما تحبه ليظهر في هذه القائمة</Text><Pressable accessibilityLabel="استكشف الأقسام" onPress={() => go(favoriteView === 'products' ? 'categories' : 'home')} style={({ pressed }) => [styles.emptyReset, pressed && styles.pressed]}><Text style={styles.emptyResetText}>{favoriteView === 'products' ? 'استكشف الأقسام' : 'استكشف المطاعم'}</Text></Pressable></View> : favoriteView === 'products' ? <View style={styles.productGrid}>{favoriteProducts.map((item) => <View key={item.id} style={styles.favoriteProductWrap}><ProductCard item={item} onPress={() => chooseProduct(item)} onAdd={() => addToCart(item)} /><Pressable accessibilityLabel={`إزالة ${item.title} من المفضلة`} onPress={(event) => { event.stopPropagation(); void toggleProductFavorite(item.id); }} style={styles.favoriteRemoveButton}><Ionicons name="heart" size={16} color={colors.destructive} /></Pressable></View>)}</View> : <View style={styles.favoriteRestaurantList}>{favoriteRestaurants.map((restaurant) => <View key={restaurant.name} style={styles.favoriteRestaurantCard}><Pressable onPress={() => { setSelectedRestaurant(restaurant); go('restaurant'); }} style={styles.favoriteRestaurantMain}><Image source={restaurant.image} style={styles.favoriteRestaurantImage} /><View style={styles.favoriteRestaurantCopy}><Text style={styles.favoriteRestaurantName}>{restaurant.name}</Text><Text style={styles.favoriteRestaurantMeta}>{restaurant.type} · {restaurant.eta}</Text><View style={styles.favoriteRestaurantRating}><Ionicons name="star" size={13} color={colors.accent} /><Text style={styles.ratingText}>{restaurant.rating}</Text></View></View></Pressable><Pressable accessibilityLabel={`إزالة ${restaurant.name} من المفضلة`} onPress={() => toggleRestaurantFavorite(restaurant.name)} style={styles.favoriteRemoveButton}><Ionicons name="heart" size={17} color={colors.destructive} /></Pressable></View>)}</View>}</ScrollView><BottomTabs /></View>;
  };

  const AccountScreen = () => {
    const displayName = name.trim() || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isEnglish ? 'Add your name' : 'أضف اسمك');
    const displayPhone = phone.trim() ? `+249 ${phone.trim()}` : (isEnglish ? 'Add your phone' : 'أضف رقم هاتفك');
    const quickActions = [
      {
        label: isEnglish ? 'Favorites' : 'المفضلة',
        sub: isEnglish ? '8 saved dishes' : '8 أطباق محفوظة',
        icon: 'heart-outline' as const,
        target: 'favorites' as Screen,
      },
      {
        label: isEnglish ? 'Addresses' : 'العناوين',
        sub: isEnglish ? '2 saved places' : 'مكانان محفوظان',
        icon: 'location-outline' as const,
        target: 'addresses' as Screen,
      },
      {
        label: isEnglish ? 'Payments' : 'الدفع',
        sub: isEnglish ? '2 methods' : 'طريقتان محفوظتان',
        icon: 'card-outline' as const,
        target: 'payments' as Screen,
      },
    ];
    const accountRows = [
      {
        title: isEnglish ? 'Notifications' : 'الإشعارات',
        sub: offerNotifications
          ? (isEnglish ? 'Offers and order updates are on' : 'العروض وتحديثات الطلب مفعّلة')
          : (isEnglish ? 'Offers are off' : 'العروض غير مفعّلة'),
        icon: 'notifications-outline' as const,
        onPress: () => setOfferNotifications((current) => !current),
        trailing: (
          <View style={[styles.accountToggle, offerNotifications && styles.accountToggleOn]}>
            <View style={[styles.accountToggleKnob, offerNotifications && styles.accountToggleKnobOn]} />
          </View>
        ),
      },
      {
        title: isEnglish ? 'Settings' : 'الإعدادات',
        sub: isEnglish ? 'Language, privacy and more' : 'اللغة والخصوصية والمزيد',
        icon: 'settings-outline' as const,
        onPress: () => go('settings'),
        trailing: <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />,
      },
      {
        title: isEnglish ? 'Help & support' : 'المساعدة والدعم',
        sub: isEnglish ? 'We are here whenever you need us' : 'نحن هنا متى احتجت إلينا',
        icon: 'help-circle-outline' as const,
        onPress: () => go('support'),
        trailing: <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />,
      },
    ];

    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}>
          <View style={styles.accountPageHeader}>
            <View style={styles.accountPageCopy}>
              <Text style={styles.accountPageTitle}>{isEnglish ? 'My account' : 'حسابي'}</Text>
              <Text style={styles.accountPageSubtitle}>{isEnglish ? 'Everything you need, in one place' : 'كل ما يخصك في مكان واحد'}</Text>
            </View>
          </View>

          <LinearGradient colors={[colors.primary, colors.secondaryForeground]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.accountProfileCard}>
            <View style={styles.accountProfileTop}>
              <View style={styles.accountAvatar}>
                <Ionicons name="person" size={29} color="#fff" />
                <View style={styles.accountVerified}><Ionicons name="checkmark" size={10} color={colors.primary} /></View>
              </View>
              <View style={styles.accountProfileCopy}>
                <Text style={styles.accountNameLight}>{displayName}</Text>
                <Text style={styles.accountPhoneLight}>{displayPhone}</Text>
                <View style={styles.accountMemberPill}><Ionicons name="sparkles-outline" size={12} color="#FFDA82" /><Text style={styles.accountMemberText}>{isEnglish ? 'Talabati SD member since 2024' : 'عضو في طلباتي SD منذ 2024'}</Text></View>
              </View>
              <Pressable accessibilityLabel={isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي'} onPress={() => setIsEditingProfile((current) => !current)} style={styles.editButtonLight}>
                <Ionicons name={isEditingProfile ? 'close-outline' : 'pencil-outline'} size={18} color="#fff" />
              </Pressable>
            </View>

            {isEditingProfile ? (
              <View style={styles.profileEditPanel}>
                <TextInput value={name} onChangeText={setName} placeholder={isEnglish ? 'Your name' : 'اسمك'} placeholderTextColor="rgba(255,255,255,0.64)" style={styles.profileInput} textAlign="right" />
                <TextInput value={phone} onChangeText={setPhone} placeholder={isEnglish ? 'Phone number' : 'رقم الهاتف'} placeholderTextColor="rgba(255,255,255,0.64)" style={styles.profileInput} keyboardType="phone-pad" textAlign="right" />
                <Pressable accessibilityLabel={isEnglish ? 'Save profile' : 'حفظ الملف الشخصي'} onPress={() => setIsEditingProfile(false)} style={({ pressed }) => [styles.profileSaveButton, pressed && styles.pressed]}>
                  <Text style={styles.profileSaveText}>{isEnglish ? 'Save changes' : 'حفظ التغييرات'}</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.accountStats}>
              <View style={styles.accountStat}>
                <Text style={styles.accountStatValue}>12</Text>
                <Text style={styles.accountStatLabel}>{isEnglish ? 'Orders' : 'طلباً'}</Text>
              </View>
              <View style={styles.accountStatDivider} />
              <View style={styles.accountStat}>
                <Text style={styles.accountStatValue}>8</Text>
                <Text style={styles.accountStatLabel}>{isEnglish ? 'Favorites' : 'مفضلة'}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.accountSectionHeader}>
            <Text style={styles.accountSectionTitle}>{isEnglish ? 'Quick access' : 'وصول سريع'}</Text>
            <Text style={styles.accountSectionHint}>{isEnglish ? 'Manage your essentials' : 'إدارة أهم اختصاراتك'}</Text>
          </View>
          <View style={styles.accountQuickGrid}>
            {quickActions.map((item) => (
              <Pressable key={item.label} accessibilityLabel={item.label} onPress={() => go(item.target)} style={({ pressed }) => [styles.accountQuickCard, pressed && styles.pressed]}>
                <View style={styles.accountQuickIcon}><Ionicons name={item.icon} size={20} color={colors.primary} /></View>
                <Text style={styles.accountQuickTitle}>{item.label}</Text>
                <Text style={styles.accountQuickSub}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.accountSectionHeader}>
            <Text style={styles.accountSectionTitle}>{isEnglish ? 'Account settings' : 'إعدادات الحساب'}</Text>
          </View>
          <View style={styles.accountList}>
            {accountRows.map((item, index) => (
              <Pressable key={item.title} accessibilityLabel={item.title} onPress={item.onPress} style={({ pressed }) => [styles.accountRow, index === accountRows.length - 1 && styles.accountRowLast, pressed && styles.pressed]}>
                <View style={styles.accountRowIcon}><Ionicons name={item.icon} size={20} color={colors.primary} /></View>
                <View style={styles.accountRowCopy}><Text style={styles.accountRowTitle}>{item.title}</Text><Text style={styles.accountRowSub}>{item.sub}</Text></View>
                {item.trailing}
              </Pressable>
            ))}
            <Pressable accessibilityLabel={isEnglish ? 'Log out' : 'تسجيل الخروج'} style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]} onPress={() => go('intro')}>
              <Ionicons name="log-out-outline" size={19} color={colors.primary} />
              <Text style={styles.logoutText}>{isEnglish ? 'Log out' : 'تسجيل الخروج'}</Text>
            </Pressable>
          </View>
        </ScrollView>
        <BottomTabs />
      </View>
    );
  };

  const openClientMap = () => {
    const [longitude, latitude] = orderClientCoordinate;
    const query = Number.isFinite(longitude) && Number.isFinite(latitude)
      ? `${latitude},${longitude}`
      : driverOrder.clientAddress;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(mapUrl).catch(() => {
      showAppDialog(
        isEnglish ? 'Maps unavailable' : 'الخرائط غير متاحة',
        isEnglish ? 'We could not open the maps app.' : 'تعذر فتح تطبيق الخرائط.',
      );
    });
  };

  const DriverMapPanel = ({ expanded = false }: { expanded?: boolean }) => (
    <DriverMap
      expanded={expanded}
      driverCoordinate={driverCurrentCoordinate}
      clientCoordinate={orderClientCoordinate}
      pickupCoordinate={pickupCoordinate}
      pickupLabel={driverOrder.restaurant}
      routeCoordinates={[driverCurrentCoordinate, orderClientCoordinate]}
      routeProgress={driverRouteProgress}
      isFollowing={expanded && driverFollowMode}
      onToggleFollow={() => setDriverFollowMode((current) => !current)}
      driverLabel={isEnglish ? 'You' : 'أنت'}
      clientLabel={driverOrder.clientAddress}
      distanceLabel={expanded ? driverRouteDistanceLabel : driverOrder.distance}
    />
  );

  const DriverHeader = ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
    <View style={[styles.driverHeader, { paddingTop: topPad + 19 }]}> 
      {onBack ? (
        <Pressable accessibilityLabel={isEnglish ? 'Back' : 'رجوع'} onPress={onBack} style={styles.driverHeaderButton}>
          <Ionicons name="chevron-back" size={21} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={styles.driverHeaderCopy}>
        <Text style={styles.driverHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.driverHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const DriverOrderStatusPill = () => {
    const statusCopy = {
      pending: isEnglish ? 'New order' : 'طلب جديد',
      accepted: isEnglish ? 'Accepted' : 'تم القبول',
      pickedUp: isEnglish ? 'Picked up' : 'تم الاستلام',
      delivered: isEnglish ? 'Delivered' : 'تم التسليم',
      rejected: isEnglish ? 'Declined' : 'مرفوض',
    }[driverOrderStatus];
    return (
      <View style={[styles.driverStatusPill, driverOrderStatus === 'pending' && styles.driverStatusPillPending, driverOrderStatus === 'rejected' && styles.driverStatusPillRejected]}>
        <View style={styles.driverStatusDot} />
        <Text style={styles.driverStatusPillText}>{statusCopy}</Text>
      </View>
    );
  };

  const DriverTabs = () => (
    <View style={[styles.driverTabs, { paddingBottom: bottomPad + 7 }]}>
      {([
        ['dashboard', isEnglish ? 'Home' : 'الرئيسية', 'home-outline', 'home'],
        ['deliveries', isEnglish ? 'Deliveries' : 'التوصيلات', 'bicycle-outline', 'bicycle'],
        ['earnings', isEnglish ? 'Earnings' : 'الأرباح', 'wallet-outline', 'wallet'],
        ['account', isEnglish ? 'Account' : 'الحساب', 'person-outline', 'person'],
        ['settings', isEnglish ? 'Settings' : 'الإعدادات', 'settings-outline', 'settings'],
      ] as const).map(([key, label, inactive, active]) => (
        <Pressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: driverTab === key }} onPress={() => openDriverTab(key)} style={({ pressed }) => [styles.driverTabButton, driverTab === key && styles.driverTabButtonActive, pressed && styles.pressed]}>
          <Ionicons name={(driverTab === key ? active : inactive) as keyof typeof Ionicons.glyphMap} size={21} color={driverTab === key ? colors.primary : colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );

  const DriverDashboardScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Driver center' : 'مركز السائق'} subtitle={isEnglish ? 'Deliver with Talabati SD' : 'وصّل مع طلباتي SD'} />
        <View style={styles.driverWelcome}>
          <View style={styles.driverWelcomeIcon}><Ionicons name="bicycle" size={24} color="#fff" /></View>
          <View style={styles.driverWelcomeCopy}>
            <Text style={styles.driverWelcomeTitle}>{isEnglish ? `Good evening, ${driverName.trim() || user?.user_metadata?.name || user?.user_metadata?.full_name || 'Driver'}` : `مساء الخير، ${driverName.trim() || user?.user_metadata?.name || user?.user_metadata?.full_name || 'أيها السائق'}`}</Text>
            <Text style={styles.driverWelcomeSub}>{isEnglish ? 'Your next delivery is waiting' : 'طلبك التالي بانتظارك'}</Text>
          </View>
          <View style={styles.driverLiveTag}><View style={styles.driverLiveDot} /><Text style={styles.driverLiveText}>{driverOnline ? (isEnglish ? 'Online' : 'متصل') : (isEnglish ? 'Offline' : 'غير متصل')}</Text></View>
        </View>

        <View style={styles.driverOnlineCard}>
          <View style={styles.driverOnlineCopy}>
            <Text style={styles.driverSectionEyebrow}>{isEnglish ? 'Availability' : 'التوفر'}</Text>
            <Text style={styles.driverOnlineTitle}>{driverOnline ? (isEnglish ? 'You are ready to receive orders' : 'أنت جاهز لاستقبال الطلبات') : (isEnglish ? 'You are currently offline' : 'أنت غير متصل حالياً')}</Text>
            <Text style={styles.driverOnlineSub}>{driverOnline ? (isEnglish ? 'We will notify you when a new order arrives' : 'سننبهك عند وصول طلب جديد') : (isEnglish ? 'Turn on availability to receive orders' : 'فعّل التوفر لاستقبال الطلبات')}</Text>
          </View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: driverOnline }} onPress={() => setDriverOnline((current) => !current)} style={[styles.driverToggle, driverOnline && styles.driverToggleOn]}>
            <View style={[styles.driverToggleKnob, driverOnline && styles.driverToggleKnobOn]} />
          </Pressable>
        </View>

        <View style={styles.driverStatsRow}>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>{fixedDriverStats.deliveryCount}</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Deliveries' : 'توصيلات'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>{fixedDriverStats.rating.toFixed(1)}</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Rating' : 'التقييم'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>{fixedDriverStats.todayEarnings} SDG</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Today' : 'اليوم'}</Text></View>
        </View>

        <View style={styles.driverSectionHeader}>
          <Text style={styles.driverSectionTitle}>{isEnglish ? 'Delivery requests' : 'طلبات التوصيل'}</Text>
          <Text style={styles.driverSectionHint}>{driverOrderStatus === 'pending' && driverAvailableDelivery ? (isEnglish ? '1 waiting' : 'طلب بانتظارك') : driverOrderStatus === 'pending' ? (isEnglish ? 'No active requests' : 'لا توجد طلبات نشطة') : (isEnglish ? 'Live status' : 'حالة مباشرة')}</Text>
        </View>

        {driverOrderStatus === 'pending' && driverOnline && driverAvailableDelivery ? (
          <Pressable accessibilityLabel={isEnglish ? 'Review new order' : 'مراجعة الطلب الجديد'} onPress={() => go('driverOrder')} style={({ pressed }) => [styles.driverIncomingCard, pressed && styles.pressed]}>
            <View style={styles.driverIncomingTop}>
              <View style={styles.driverIncomingIcon}><Ionicons name="bag-handle-outline" size={23} color="#fff" /></View>
              <View style={styles.driverIncomingCopy}>
                <View style={styles.driverOrderTitleRow}><Text style={styles.driverOrderTitle}>{isEnglish ? 'New delivery request' : 'طلب توصيل جديد'}</Text><DriverOrderStatusPill /></View>
                <Text style={styles.driverRestaurantName}>{driverOrder.restaurant}</Text>
                <Text style={styles.driverRestaurantDetail}>{driverOrder.restaurantDetail} · {driverOrder.eta}</Text>
              </View>
            </View>
            <View style={styles.driverOrderRouteRow}>
              <View style={styles.driverRouteIcon}><Ionicons name="location-outline" size={17} color={colors.primary} /></View>
              <View style={styles.driverRouteCopy}><Text style={styles.driverRouteTitle}>{driverOrder.clientAddress}</Text><Text style={styles.driverRouteSub}>{driverOrder.distance} · {driverOrder.clientName}</Text></View>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.driverOrderFooter}><Text style={styles.driverOrderTotal}>{money(driverOrder.total, isEnglish)}</Text><Text style={styles.driverReviewLink}>{isEnglish ? 'Review order' : 'مراجعة الطلب'} <Ionicons name="arrow-back" size={13} color={colors.primary} /></Text></View>
          </Pressable>
        ) : driverOrderStatus === 'accepted' || driverOrderStatus === 'pickedUp' ? (
          <Pressable accessibilityLabel={isEnglish ? 'Open active delivery' : 'فتح التوصيلة الحالية'} onPress={() => go('driverMap')} style={({ pressed }) => [styles.driverActiveCard, pressed && styles.pressed]}>
            <View style={styles.driverActiveTop}><View><Text style={styles.driverSectionEyebrow}>{isEnglish ? 'Active delivery' : 'التوصيلة الحالية'}</Text><Text style={styles.driverActiveTitle}>{driverOrder.clientAddress}</Text><Text style={styles.driverActiveSub}>{driverOrder.clientName} · {driverOrder.eta}</Text></View><DriverOrderStatusPill /></View>
            <DriverMapPanel />
            <View style={styles.driverActiveFooter}><Text style={styles.driverMapLink}>{isEnglish ? 'Open client map' : 'فتح خريطة العميل'} <Ionicons name="arrow-forward" size={13} color={colors.primary} /></Text><Ionicons name="navigate-outline" size={19} color={colors.primary} /></View>
          </Pressable>
        ) : driverOrderStatus === 'delivered' ? (
          <View style={styles.driverDeliveredCard}><View style={styles.driverDeliveredIcon}><Ionicons name="checkmark" size={24} color="#fff" /></View><View style={styles.driverDeliveredCopy}><Text style={styles.driverDeliveredTitle}>{isEnglish ? 'Delivery completed' : 'تم إكمال التوصيلة'}</Text><Text style={styles.driverDeliveredSub}>{isEnglish ? 'Great work. More orders will appear here.' : 'أحسنت. ستظهر الطلبات الجديدة هنا.'}</Text></View></View>
        ) : (
          <View style={styles.driverEmptyCard}><View style={styles.driverEmptyIcon}><Ionicons name={driverOnline ? 'checkmark-circle-outline' : 'moon-outline'} size={27} color={colors.primary} /></View><Text style={styles.driverEmptyTitle}>{driverOnline ? (isEnglish ? 'No active requests' : 'لا توجد طلبات حالياً') : (isEnglish ? 'You are offline' : 'أنت غير متصل')}</Text><Text style={styles.driverEmptySub}>{driverOnline ? (isEnglish ? 'New requests will appear here.' : 'ستظهر الطلبات الجديدة هنا.') : (isEnglish ? 'Go online to receive a delivery request.' : 'اتصل بالإنترنت لاستقبال طلب توصيل.')}</Text></View>
        )}
      </ScrollView>
      <DriverTabs />
    </View>
  );

  const DriverDeliveriesScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Deliveries' : 'التوصيلات'} subtitle={isEnglish ? 'Manage your delivery requests' : 'إدارة طلبات التوصيل'} />
        <View style={styles.driverTabIntro}>
          <View>
            <Text style={styles.driverSectionEyebrow}>{isEnglish ? 'Today' : 'اليوم'}</Text>
          </View>
          <View style={styles.driverTabCount}><Text style={styles.driverTabCountValue}>{fixedDriverStats.deliveryCount}</Text><Text style={styles.driverTabCountLabel}>{isEnglish ? 'completed' : 'مكتملة'}</Text></View>
        </View>
        <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Current delivery' : 'التوصيلة الحالية'}</Text>
        {driverDelivery ? <Pressable onPress={() => go(driverOrderStatus === 'pending' ? 'driverOrder' : 'driverMap')} style={({ pressed }) => [styles.driverDeliveryCard, pressed && styles.pressed]}>
          <View style={styles.driverDeliveryCardTop}>
            <View style={styles.driverDeliveryIcon}><Ionicons name="bicycle" size={22} color="#fff" /></View>
            <View style={styles.driverDeliveryCopy}>
              <Text style={styles.driverDeliveryTitle}>{driverOrderStatus === 'pending' ? (isEnglish ? 'New delivery request' : 'طلب توصيل جديد') : (isEnglish ? 'Active delivery' : 'التوصيلة الحالية')}</Text>
              <Text style={styles.driverDeliverySub}>{driverOrder.restaurant} · {driverOrder.clientName}</Text>
            </View>
            <DriverOrderStatusPill />
          </View>
          <View style={styles.driverDeliveryRoute}><Ionicons name="location-outline" size={17} color={colors.primary} /><Text style={styles.driverDeliveryRouteText}>{driverOrder.clientAddress}</Text><Ionicons name="chevron-back" size={17} color={colors.mutedForeground} /></View>
          <View style={styles.driverDeliveryFooter}><Text style={styles.driverDeliveryMeta}>{driverOrderStatus === 'pending' ? driverOrder.distance : driverRouteEtaLabel}</Text><Text style={styles.driverDeliveryAction}>{isEnglish ? 'View details' : 'عرض التفاصيل'}</Text></View>
        </Pressable> : <View style={styles.driverEmptyCard}><View style={styles.driverEmptyIcon}><Ionicons name="checkmark-circle-outline" size={27} color={colors.primary} /></View><Text style={styles.driverEmptyTitle}>{isEnglish ? 'No active requests' : 'لا توجد طلبات نشطة'}</Text><Text style={styles.driverEmptySub}>{isEnglish ? 'Available deliveries will appear here.' : 'ستظهر التوصيلات المتاحة هنا.'}</Text></View>}
        <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Recent deliveries' : 'التوصيلات السابقة'}</Text>
        {fixedDriverStats.deliveryCount > 0 ? null : <View style={styles.driverEmptyCard}><View style={styles.driverEmptyIcon}><Ionicons name="receipt-outline" size={27} color={colors.primary} /></View><Text style={styles.driverEmptyTitle}>{isEnglish ? 'No completed deliveries' : 'لا توجد توصيلات مكتملة'}</Text><Text style={styles.driverEmptySub}>{isEnglish ? 'Completed deliveries will appear here.' : 'ستظهر التوصيلات المكتملة هنا.'}</Text></View>}
      </ScrollView>
      <DriverTabs />
    </View>
  );

  const DriverEarningsScreen = () => {
    const payoutBankName = driverBankName.trim() || user?.user_metadata?.bank_name || '';
    const payoutAccountName = driverBankAccountName.trim() || user?.user_metadata?.bank_account_name || '';
    const payoutAccountNumber = driverBankAccountNumber.trim() || user?.user_metadata?.bank_account_number || '';
    const payoutReady = Boolean(payoutBankName && payoutAccountName && payoutAccountNumber);
    return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Earnings' : 'الأرباح'} subtitle={isEnglish ? 'Track your income' : 'تابع دخلك'} />
        {!payoutReady ? (
          <View style={styles.driverBankRequiredCard}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.primary} />
            <Text style={styles.driverBankRequiredTitle}>أكمل بيانات استلام الأرباح</Text>
            <Text style={styles.driverBankRequiredText}>أدخل بيانات البنك من صفحة الحساب حتى تتمكن من عرض الأرباح وتحويلها.</Text>
            <Pressable onPress={() => openDriverTab('account')} style={styles.driverBankRequiredButton}><Text style={styles.driverBankRequiredButtonText}>إعداد الحساب البنكي</Text></Pressable>
          </View>
        ) : null}
        {payoutReady ? <>
        <View style={styles.driverEarningsHero}>
          <View><Text style={styles.driverEarningsEyebrow}>{isEnglish ? 'Available balance' : 'الرصيد المتاح'}</Text><Text style={styles.driverEarningsValue}>{fixedDriverStats.availableBalance} <Text style={styles.driverEarningsCurrency}>SDG</Text></Text><Text style={styles.driverEarningsSub}>{isEnglish ? 'Current payout ready' : 'الدفع الحالي جاهز'}</Text></View>
          <View style={styles.driverEarningsIcon}><Ionicons name="wallet-outline" size={25} color="#fff" /></View>
        </View>
        <View style={styles.driverStatsRow}>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>{fixedDriverStats.todayEarnings}</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Today · SDG' : 'اليوم · SDG'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>{fixedDriverStats.deliveryCount}</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Deliveries' : 'توصيلات'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>{fixedDriverStats.rating.toFixed(1)}</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Rating' : 'التقييم'}</Text></View>
        </View>
        <View style={styles.driverPanelCard}>
          <View style={styles.driverPanelCardHeader}><Text style={styles.driverTabSectionTitle}>{isEnglish ? 'This week' : 'هذا الأسبوع'}</Text><Text style={styles.driverPanelHint}>{isEnglish ? `${fixedDriverStats.availableBalance} SDG` : `${fixedDriverStats.availableBalance} SDG`}</Text></View>
          <View style={styles.driverBars}>
            {[{ day: isEnglish ? 'Sat' : 'س', value: 15 }, { day: isEnglish ? 'Sun' : 'ح', value: 0 }, { day: isEnglish ? 'Mon' : 'ن', value: 0 }, { day: isEnglish ? 'Tue' : 'ث', value: 0 }, { day: isEnglish ? 'Wed' : 'ر', value: 0 }, { day: isEnglish ? 'Thu' : 'خ', value: 0 }, { day: isEnglish ? 'Fri' : 'ج', value: 0 }].map((item) => (
              <View key={item.day} style={styles.driverBarColumn}><View style={styles.driverBarTrack}><View style={[styles.driverBarFill, { height: `${item.value}%` }]} /></View><Text style={styles.driverBarLabel}>{item.day}</Text></View>
            ))}
          </View>
        </View>
        <View style={styles.driverPayoutRow}><View style={styles.driverPayoutIcon}><Ionicons name="card-outline" size={20} color={colors.primary} /></View><View style={styles.driverPayoutCopy}><Text style={styles.driverPayoutTitle}>{payoutBankName}</Text><Text style={styles.driverPayoutSub}>{payoutAccountName} · {payoutAccountNumber}</Text></View><Ionicons name="chevron-back" size={18} color={colors.mutedForeground} /></View>
        <Pressable disabled={payoutRequestPending || fixedDriverStats.availableBalance <= 0} onPress={() => void requestDriverPayout(fixedDriverStats.availableBalance, payoutBankName, payoutAccountName, payoutAccountNumber)} style={[styles.driverPayoutRequestButton, (payoutRequestPending || fixedDriverStats.availableBalance <= 0) && { opacity: 0.45 }]}>
          <Ionicons name="paper-plane-outline" size={18} color="#fff" />
          <Text style={styles.driverPayoutRequestText}>{payoutRequestPending ? 'جارٍ إرسال الطلب...' : 'طلب تحويل الأرباح'}</Text>
        </Pressable>
        <View style={styles.driverEarningsHistory}>
          <View style={styles.driverPanelCardHeader}><Text style={styles.driverTabSectionTitle}>سجل أرباح التوصيلات</Text><Text style={styles.driverPanelHint}>{driverEarningDeliveries.length} طلبات</Text></View>
          {driverEarningDeliveries.length ? driverEarningDeliveries.map((delivery) => (
            <View key={delivery.id} style={styles.driverEarningHistoryRow}>
              <View style={styles.driverHistoryIcon}><Ionicons name="checkmark" size={16} color={colors.green} /></View>
              <View style={styles.driverHistoryCopy}><Text style={styles.driverHistoryTitle}>طلب #{delivery.order_id || delivery.id}</Text><Text style={styles.driverHistorySub}>{delivery.completed_at ? new Date(delivery.completed_at).toLocaleDateString('ar-SD') : 'تاريخ غير متاح'}</Text></View>
              <Text style={styles.driverEarningHistoryAmount}>{Number(delivery.earnings || 0).toFixed(2)} SDG</Text>
            </View>
          )) : <Text style={styles.driverEarningsHistoryEmpty}>لا توجد أرباح مسجلة بعد</Text>}
        </View>
        </> : null}
      </ScrollView>
      <DriverTabs />
    </View>
    );
  };

  const DriverAccountScreen = () => {
    const driverAccountName = driverName.trim() || user?.user_metadata?.name || user?.user_metadata?.full_name || (isEnglish ? 'Driver' : 'السائق');
    const driverAccountPhone = driverPhone.trim() || user?.user_metadata?.phone || user?.phone || (isEnglish ? 'Phone not added' : 'لم تتم إضافة رقم الهاتف');
    const driverAccountVehicle = user?.user_metadata?.vehicle || (isEnglish ? 'Vehicle not added' : 'لم تتم إضافة المركبة');
    const toggleDriverEditing = () => {
      if (!isEditingProfile) {
        setDriverName(user?.user_metadata?.name || user?.user_metadata?.full_name || '');
        setDriverPhone(user?.user_metadata?.phone || user?.phone || '');
        setDriverVehicle(user?.user_metadata?.vehicle || '');
        setDriverBankName(user?.user_metadata?.bank_name || '');
        setDriverBankAccountName(user?.user_metadata?.bank_account_name || '');
        setDriverBankAccountNumber(user?.user_metadata?.bank_account_number || '');
        setDriverProfileMessage('');
      }
      setIsEditingProfile((current) => !current);
    };
    const saveDriverProfile = async () => {
      const nextName = driverName.trim();
      const nextPhone = driverPhone.trim();
      const nextVehicle = driverVehicle.trim();
      const nextBankName = driverBankName.trim();
      const nextBankAccountName = driverBankAccountName.trim();
      const nextBankAccountNumber = driverBankAccountNumber.trim();
      if (!nextName || !nextPhone || !nextVehicle || !nextBankName || !nextBankAccountName || !nextBankAccountNumber) {
        setDriverProfileMessage(isEnglish ? 'Name, phone, vehicle, and bank details are required.' : 'الاسم والهاتف والمركبة وبيانات البنك مطلوبة');
        return;
      }
      try {
        await AuthService.updateUserMetadata({ name: nextName, phone: nextPhone, vehicle: nextVehicle, bank_name: nextBankName, bank_account_name: nextBankAccountName, bank_account_number: nextBankAccountNumber, role: 'driver' });
        setDriverProfileMessage(isEnglish ? 'Profile saved successfully.' : 'تم حفظ بيانات الحساب بنجاح');
        setIsEditingProfile(false);
      } catch (error) {
        setDriverProfileMessage(error instanceof Error ? error.message : (isEnglish ? 'Unable to save profile.' : 'تعذر حفظ بيانات الحساب'));
      }
    };

    return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Account' : 'الحساب'} subtitle={isEnglish ? 'Your driver account' : 'حساب السائق الخاص بك'} />
        <View style={styles.driverProfileCard}>
          <View style={styles.driverProfileAvatar}><Ionicons name="person" size={30} color="#fff" /></View>
          <Text style={styles.driverProfileName}>{driverAccountName}</Text>
          <Text style={styles.driverProfilePhone}>{driverAccountPhone}</Text>
          <View style={styles.driverRatingPill}><Ionicons name="star" size={14} color="#F3B43F" /><Text style={styles.driverRatingText}>{fixedDriverStats.rating.toFixed(1)} · {fixedDriverStats.reviewCount} {isEnglish ? 'review' : 'تقييم'}</Text></View>
        </View>
        <View style={styles.driverPanelCard}>
          <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Driver details' : 'بيانات السائق'}</Text>
          <View style={styles.driverProfileRow}><View style={styles.driverProfileRowIcon}><Ionicons name="bicycle-outline" size={19} color={colors.primary} /></View><View style={styles.driverProfileRowCopy}><Text style={styles.driverProfileRowLabel}>{isEnglish ? 'Vehicle' : 'المركبة'}</Text><Text style={styles.driverProfileRowValue}>{driverAccountVehicle}</Text></View></View>
          <View style={styles.driverProfileRow}><View style={styles.driverProfileRowIcon}><Ionicons name="calendar-outline" size={19} color={colors.primary} /></View><View style={styles.driverProfileRowCopy}><Text style={styles.driverProfileRowLabel}>{isEnglish ? 'Driving since' : 'يعمل منذ'}</Text><Text style={styles.driverProfileRowValue}>2023</Text></View></View>
          <View style={styles.driverProfileRow}><View style={styles.driverProfileRowIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.green} /></View><View style={styles.driverProfileRowCopy}><Text style={styles.driverProfileRowLabel}>{isEnglish ? 'Verification' : 'حالة التحقق'}</Text><Text style={styles.driverProfileRowValue}>{isEnglish ? 'Verified driver' : 'سائق موثّق'}</Text></View><Ionicons name="checkmark-circle" size={20} color={colors.green} /></View>
        </View>
        <Pressable
          accessibilityLabel={isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي'}
          style={({ pressed }) => [styles.driverEditProfileButton, pressed && styles.pressed]}
          onPress={toggleDriverEditing}
        >
          <Ionicons name={isEditingProfile ? 'close-outline' : 'create-outline'} size={18} color={colors.primary} />
          <Text style={styles.driverEditProfileText}>{isEditingProfile ? (isEnglish ? 'Cancel editing' : 'إلغاء التعديل') : (isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي')}</Text>
        </Pressable>
        {isEditingProfile ? (
          <View style={styles.driverProfileEditPanel}>
            <View style={styles.driverProfileField}>
              <Text style={styles.driverProfileFieldLabel}>{isEnglish ? 'Full name' : 'الاسم الكامل'}</Text>
              <Text style={styles.driverProfileFieldSubtitle}>{isEnglish ? 'This name appears on your driver profile' : 'سيظهر هذا الاسم في ملف السائق الخاص بك'}</Text>
              <TextInput
                value={driverName}
                onChangeText={setDriverName}
                placeholder={isEnglish ? 'Your name' : 'اسمك'}
                placeholderTextColor={colors.mutedForeground}
                style={styles.driverProfileInput}
                textAlign="right"
              />
            </View>
            <View style={styles.driverProfileField}>
              <Text style={styles.driverProfileFieldLabel}>{isEnglish ? 'Phone number' : 'رقم الهاتف'}</Text>
              <Text style={styles.driverProfileFieldSubtitle}>{isEnglish ? 'Used to contact you about deliveries' : 'يُستخدم للتواصل معك بشأن التوصيلات'}</Text>
              <TextInput
                value={driverPhone}
                onChangeText={setDriverPhone}
                placeholder={isEnglish ? 'Phone number' : 'رقم الهاتف'}
                placeholderTextColor={colors.mutedForeground}
                style={styles.driverProfileInput}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>
            <View style={styles.driverProfileField}>
              <Text style={styles.driverProfileFieldLabel}>{isEnglish ? 'Vehicle type' : 'نوع المركبة'}</Text>
              <Text style={styles.driverProfileFieldSubtitle}>{isEnglish ? 'Tell customers how you make deliveries' : 'اختر نوع المركبة التي تستخدمها للتوصيل'}</Text>
              <TextInput
                value={driverVehicle}
                onChangeText={setDriverVehicle}
                placeholder={isEnglish ? 'Vehicle type' : 'نوع المركبة'}
                placeholderTextColor={colors.mutedForeground}
                style={styles.driverProfileInput}
                textAlign="right"
              />
            </View>
            <View style={styles.driverProfileField}>
              <Text style={styles.driverProfileFieldLabel}>اسم البنك أو المحفظة</Text>
              <TextInput value={driverBankName} onChangeText={setDriverBankName} placeholder="مثال: بنكك" placeholderTextColor={colors.mutedForeground} style={styles.driverProfileInput} textAlign="right" />
            </View>
            <View style={styles.driverProfileField}>
              <Text style={styles.driverProfileFieldLabel}>اسم صاحب الحساب</Text>
              <TextInput value={driverBankAccountName} onChangeText={setDriverBankAccountName} placeholder="الاسم كما يظهر في الحساب" placeholderTextColor={colors.mutedForeground} style={styles.driverProfileInput} textAlign="right" />
            </View>
            <View style={styles.driverProfileField}>
              <Text style={styles.driverProfileFieldLabel}>رقم الحساب أو المحفظة</Text>
              <TextInput value={driverBankAccountNumber} onChangeText={setDriverBankAccountNumber} placeholder="أدخل رقم التحويل" placeholderTextColor={colors.mutedForeground} style={styles.driverProfileInput} keyboardType="phone-pad" textAlign="right" />
            </View>
            <Pressable
              accessibilityLabel={isEnglish ? 'Save profile' : 'حفظ الملف الشخصي'}
              onPress={() => { void saveDriverProfile(); }}
              style={({ pressed }) => [styles.driverProfileSaveButton, pressed && styles.pressed]}
            >
              <Text style={styles.driverProfileSaveText}>{isEnglish ? 'Save changes' : 'حفظ التغييرات'}</Text>
            </Pressable>
            {driverProfileMessage ? <Text style={styles.driverProfileMessage}>{driverProfileMessage}</Text> : null}
          </View>
        ) : null}
        {!isEditingProfile && driverProfileMessage ? <Text style={styles.driverProfileMessage}>{driverProfileMessage}</Text> : null}
      </ScrollView>
      <DriverTabs />
    </View>
    );
  };

  const DriverSettingsScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Settings' : 'الإعدادات'} subtitle={isEnglish ? 'Control your driver preferences' : 'تحكم في تفضيلات السائق'} />
        <Text style={styles.driverSettingsSection}>{isEnglish ? 'Preferences' : 'التفضيلات'}</Text>
        <View style={styles.driverSettingRow}><View style={styles.driverSettingIcon}><Ionicons name="notifications-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Delivery notifications' : 'إشعارات التوصيل'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Receive new request alerts' : 'استقبل تنبيهات الطلبات الجديدة'}</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: driverNotifications }} onPress={() => setDriverNotifications((current) => !current)} style={[styles.driverToggle, driverNotifications && styles.driverToggleOn]}><View style={[styles.driverToggleKnob, driverNotifications && styles.driverToggleKnobOn]} /></Pressable></View>
        <Text style={styles.driverSettingsSection}>{isEnglish ? 'Support' : 'الدعم'}</Text>
        <Pressable style={styles.driverSettingRow} onPress={() => go('driverSupport')}><View style={styles.driverSettingIcon}><Ionicons name="help-circle-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Help center' : 'مركز المساعدة'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Get help with deliveries' : 'احصل على المساعدة في التوصيلات'}</Text></View><Ionicons name="chevron-back" size={18} color={colors.mutedForeground} /></Pressable>
        <Pressable style={styles.driverSettingRow} onPress={() => resetTo('intro')}><View style={styles.driverSettingIcon}><Ionicons name="log-out-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Log out' : 'تسجيل الخروج'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Switch account or role' : 'تبديل الحساب أو نوع المستخدم'}</Text></View><Ionicons name="chevron-back" size={18} color={colors.mutedForeground} /></Pressable>
      </ScrollView>
      <DriverTabs />
    </View>
  );

  const DriverSupportScreen = () => {
    const faqItems = [
      {
        question: isEnglish ? 'How do I accept a delivery request?' : 'كيف أقبل طلب توصيل؟',
        answer: isEnglish ? 'Open the request from Dashboard or Deliveries, review the pickup and client details, then tap Accept order.' : 'افتح الطلب من الرئيسية أو التوصيلات، راجع تفاصيل الاستلام والعميل، ثم اضغط على قبول الطلب.',
      },
      {
        question: isEnglish ? 'When can I mark an order as delivered?' : 'متى يمكنني تأكيد تسليم الطلب؟',
        answer: isEnglish ? 'After you pick up the order, follow the route until you reach the client location. The delivery button becomes available when you arrive.' : 'بعد استلام الطلب، اتبع المسار حتى تصل إلى موقع العميل. سيصبح زر التسليم متاحاً عند الوصول.',
      },
      {
        question: isEnglish ? 'Why am I not receiving new requests?' : 'لماذا لا تصلني طلبات جديدة؟',
        answer: isEnglish ? 'Make sure you are online from the Dashboard and that delivery notifications are enabled in Settings.' : 'تأكد من أنك متصل من الرئيسية وأن إشعارات التوصيل مفعلة من الإعدادات.',
      },
      {
        question: isEnglish ? 'How do payouts work?' : 'كيف تعمل الدفعات؟',
        answer: isEnglish ? 'Your completed delivery earnings are collected in your wallet and sent to your linked bank account on the next payout date.' : 'تتجمع أرباح التوصيلات المكتملة في محفظتك، ثم تُرسل إلى حسابك البنكي المرتبط في موعد الدفعة القادمة.',
      },
    ];

    const openSupportLink = (url: string) => {
      Linking.openURL(url).catch(() => showAppDialog(isEnglish ? 'Unavailable' : 'غير متاح', isEnglish ? 'This contact method is not available on this device.' : 'طريقة التواصل هذه غير متاحة على هذا الجهاز.'));
    };
    const sendSupportMessage = async () => {
      const message = driverSupportMessage.trim();
      if (!message) return;

      const emailUrl = `mailto:talabaticomp@zohomail.com?subject=${encodeURIComponent(isEnglish ? 'Driver support request' : 'طلب دعم من السائق')}&body=${encodeURIComponent(message)}`;
      try {
        await Linking.openURL(emailUrl);
        setDriverSupportSent(true);
        setDriverSupportMessage('');
      } catch {
        showAppDialog(
          isEnglish ? 'Email unavailable' : 'البريد الإلكتروني غير متاح',
          isEnglish ? 'Could not open the email app.' : 'تعذر فتح تطبيق البريد الإلكتروني.',
        );
      }
    };

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 116 }}>
          <DriverHeader onBack={goBack} title={isEnglish ? 'Help center' : 'مركز المساعدة'} subtitle={isEnglish ? 'Driver support' : 'دعم السائقين'} />
          <View style={styles.driverSupportHero}>
            <View style={styles.driverSupportHeroIcon}><Ionicons name="headset-outline" size={27} color="#fff" /></View>
            <View style={styles.driverSupportHeroCopy}><Text style={styles.driverSupportHeroTitle}>{isEnglish ? 'How can we help?' : 'كيف يمكننا مساعدتك؟'}</Text><Text style={styles.driverSupportHeroSub}>{isEnglish ? 'Find quick answers or contact our driver team.' : 'اعثر على إجابات سريعة أو تواصل مع فريق السائقين.'}</Text></View>
          </View>
          <Text style={styles.driverSupportSection}>{isEnglish ? 'Contact support' : 'تواصل مع الدعم'}</Text>
          <View style={styles.driverSupportContactRow}>
            <Pressable onPress={() => openSupportLink('tel:+249903107227')} style={({ pressed }) => [styles.driverSupportContact, pressed && styles.pressed]}><View style={styles.driverSupportContactIcon}><Ionicons name="call-outline" size={20} color={colors.primary} /></View><Text style={styles.driverSupportContactTitle}>{isEnglish ? 'Call us' : 'اتصل بنا'}</Text><Text style={styles.driverSupportContactSub}>24/7</Text></Pressable>
            <Pressable onPress={() => openSupportLink('https://wa.me/249903107227')} style={({ pressed }) => [styles.driverSupportContact, pressed && styles.pressed]}><View style={[styles.driverSupportContactIcon, styles.driverSupportWhatsapp]}><Ionicons name="logo-whatsapp" size={20} color={colors.green} /></View><Text style={styles.driverSupportContactTitle}>WhatsApp</Text><Text style={styles.driverSupportContactSub}>{isEnglish ? 'Chat now' : 'محادثة الآن'}</Text></Pressable>
          </View>
          <View style={styles.driverSupportSectionRow}><Text style={styles.driverSupportSection}>{isEnglish ? 'Frequently asked questions' : 'الأسئلة الشائعة'}</Text><Text style={styles.driverSupportCount}>{faqItems.length} {isEnglish ? 'articles' : 'مقالات'}</Text></View>
          {faqItems.length ? faqItems.map((item, index) => {
            const isExpanded = expandedDriverFaq === index;
            return (
              <Pressable key={item.question} onPress={() => setExpandedDriverFaq(isExpanded ? null : index)} style={({ pressed }) => [styles.driverFaqRow, isExpanded && styles.driverFaqRowExpanded, pressed && styles.pressed]}>
                <View style={styles.driverFaqCopy}><Text style={styles.driverFaqQuestion}>{item.question}</Text>{isExpanded ? <Text style={styles.driverFaqAnswer}>{item.answer}</Text> : null}</View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primary} />
              </Pressable>
            );
          }) : (
            <View style={styles.driverSupportEmpty}><Ionicons name="search-outline" size={24} color={colors.primary} /><Text style={styles.driverSupportEmptyTitle}>{isEnglish ? 'No matching articles' : 'لا توجد مقالات مطابقة'}</Text><Text style={styles.driverSupportEmptySub}>{isEnglish ? 'Try another search term or message support below.' : 'جرّب كلمة بحث أخرى أو أرسل رسالة للدعم أدناه.'}</Text></View>
          )}
          <Text style={styles.driverSupportSection}>{isEnglish ? 'Send us a message' : 'أرسل لنا رسالة'}</Text>
          {driverSupportSent ? <View style={styles.driverSupportSuccess}><Ionicons name="checkmark-circle" size={19} color={colors.green} /><Text style={styles.driverSupportSuccessText}>{isEnglish ? 'Message sent. Our team will get back to you soon.' : 'تم إرسال الرسالة. سيتواصل معك فريقنا قريباً.'}</Text></View> : null}
          <View style={styles.driverSupportComposer}><TextInput value={driverSupportMessage} onChangeText={(value) => { setDriverSupportMessage(value); setDriverSupportSent(false); }} multiline placeholder={isEnglish ? 'Describe your issue...' : 'اكتب مشكلتك بالتفصيل...'} placeholderTextColor={colors.mutedForeground} style={styles.driverSupportMessageInput} /><Pressable disabled={!driverSupportMessage.trim()} onPress={() => { void sendSupportMessage(); }} style={({ pressed }) => [styles.driverSupportSend, !driverSupportMessage.trim() && styles.driverSupportSendDisabled, pressed && styles.pressed]}><Ionicons name="send" size={17} color="#fff" /></Pressable></View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const DriverOrderScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 34 }}>
        <DriverHeader onBack={goBack} title={isEnglish ? 'Order details' : 'تفاصيل الطلب'} subtitle={`#${driverOrder.id}`} />
        <View style={styles.driverOrderHero}>
          <View style={styles.driverOrderHeroIcon}><Ionicons name="restaurant-outline" size={28} color={colors.primary} /></View>
          <View style={styles.driverOrderHeroCopy}><Text style={styles.driverOrderHeroTitle}>{driverOrder.restaurant}</Text><Text style={styles.driverOrderHeroSub}>{driverOrder.restaurantDetail}</Text></View>
          <DriverOrderStatusPill />
        </View>
        <View style={styles.driverDetailCard}>
          <View style={styles.driverDetailCardHeader}><Text style={styles.driverSectionTitle}>{isEnglish ? 'Pickup details' : 'تفاصيل الاستلام'}</Text><Text style={styles.driverOrderId}>#{driverOrder.id}</Text></View>
          <View style={styles.driverDetailRow}><View style={styles.driverDetailIcon}><Ionicons name="restaurant-outline" size={18} color={colors.primary} /></View><View style={styles.driverDetailCopy}><Text style={styles.driverDetailLabel}>{isEnglish ? 'Pickup from' : 'الاستلام من'}</Text><Text style={styles.driverDetailValue}>{driverOrder.restaurant}</Text><Text style={styles.driverDetailSub}>{driverOrder.restaurantDetail}</Text></View></View>
          <View style={styles.driverDetailDivider} />
          <View style={styles.driverDetailRow}><View style={styles.driverDetailIcon}><Ionicons name="person-outline" size={18} color={colors.primary} /></View><View style={styles.driverDetailCopy}><Text style={styles.driverDetailLabel}>{isEnglish ? 'Deliver to' : 'التوصيل إلى'}</Text><Text style={styles.driverDetailValue}>{driverOrder.clientName}</Text><Text style={styles.driverDetailSub}>{driverOrder.clientAddress}</Text></View><Pressable accessibilityLabel={isEnglish ? 'Open client map' : 'فتح خريطة العميل'} onPress={openClientMap} style={styles.driverSmallAction}><Ionicons name="navigate-outline" size={17} color={colors.primary} /></Pressable></View>
        </View>
        <View style={styles.driverDetailCard}>
          <View style={styles.driverDetailCardHeader}><Text style={styles.driverSectionTitle}>{isEnglish ? 'Order summary' : 'ملخص الطلب'}</Text><Text style={styles.driverOrderTotal}>{money(driverOrder.total, isEnglish)}</Text></View>
          <Text style={styles.driverSummaryText}>{driverOrder.items}</Text>
          <View style={styles.driverInfoStrip}><Ionicons name="time-outline" size={17} color={colors.primary} /><Text style={styles.driverInfoStripText}>{isEnglish ? `Ready in ${driverOrder.eta}` : `جاهز خلال ${driverOrder.eta}`}</Text></View>
        </View>
        <Text style={styles.driverMapSectionTitle}>{isEnglish ? 'Client location' : 'موقع العميل'}</Text>
        <DriverMapPanel />
        {driverOrderStatus === 'pending' ? (
          <View style={styles.driverDecisionRow}>
            <Pressable accessibilityLabel={isEnglish ? 'Decline order' : 'رفض الطلب'} onPress={() => {
              const deliveryId = driverAvailableDelivery?.id;
              if (deliveryId) {
                setDeclinedDeliveryIds((current) => current.includes(deliveryId) ? current : [...current, deliveryId]);
              }
              setDriverAvailableDelivery(null);
              setDriverOrderStatus('rejected');
              go('driverDashboard');
            }} style={({ pressed }) => [styles.driverDeclineButton, pressed && styles.pressed]}><Ionicons name="close" size={18} color={colors.primary} /><Text style={styles.driverDeclineText}>{isEnglish ? 'Decline' : 'رفض'}</Text></Pressable>
            <Pressable accessibilityLabel={isEnglish ? 'Accept order' : 'قبول الطلب'} onPress={async () => {
              if (!user?.id || !driverAvailableDelivery?.id) return;
              try {
                const claimedDelivery = await DriverService.acceptDelivery(user.id, driverAvailableDelivery.id);
                if (!claimedDelivery) {
                  setDriverAvailableDelivery(null);
                  go('driverDashboard');
                  showAppDialog(isEnglish ? 'Already assigned' : 'تم قبول الطلب', isEnglish ? 'Another driver accepted this delivery first.' : 'قام سائق آخر بقبول هذه التوصيلة أولاً.');
                  return;
                }
                setDriverAvailableDelivery(null);
                setDriverAssignedDelivery(claimedDelivery);
                setDriverRouteProgress(0);
                const claimedOrder = claimedDelivery.orders ?? claimedDelivery;
                const etaMinutes = Number(String(claimedOrder.preparation_time || claimedOrder.eta || '').match(/\d+/)?.[0] || 20);
                setRestaurantPrepSeconds(Number(claimedOrder.preparation_seconds) || etaMinutes * 60);
                setDriverFollowMode(false);
                setDriverOrderStatus('accepted');
                go('driverMap');
              } catch (error) {
                showAppDialog(isEnglish ? 'Unable to accept' : 'تعذر قبول الطلب', error instanceof Error ? error.message : (isEnglish ? 'Please try again.' : 'حاول مرة أخرى'));
              }
            }} style={({ pressed }) => [styles.driverAcceptButton, pressed && styles.pressed]}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.driverAcceptText}>{isEnglish ? 'Accept order' : 'قبول الطلب'}</Text></Pressable>
          </View>
        ) : driverOrderStatus === 'accepted' ? (
          <View style={styles.driverPrimaryButtonWrap}><PrimaryButton label={isEnglish ? 'Open client map' : 'فتح خريطة العميل'} onPress={() => go('driverMap')} /></View>
        ) : driverOrderStatus === 'pickedUp' ? (
          <View style={styles.driverPrimaryButtonWrap}><PrimaryButton label={isEnglish ? 'Continue delivery' : 'متابعة التوصيل'} onPress={() => go('driverMap')} /></View>
        ) : driverOrderStatus === 'delivered' ? (
          <View style={styles.driverSuccessBanner}><Ionicons name="checkmark-circle" size={21} color={colors.green} /><Text style={styles.driverSuccessText}>{isEnglish ? 'This order has been delivered.' : 'تم تسليم هذا الطلب.'}</Text></View>
        ) : (
          <View style={styles.driverSuccessBanner}><Ionicons name="close-circle" size={21} color={colors.primary} /><Text style={styles.driverSuccessText}>{isEnglish ? 'This request was declined.' : 'تم رفض هذا الطلب.'}</Text></View>
        )}
      </ScrollView>
    </View>
  );

  const DriverLocationSummary = () => (
    <View style={styles.driverLocationSummary}>
      <View style={styles.driverLocationItem}>
        <View style={[styles.driverLocationDot, styles.driverLocationDotDriver]} />
        <View style={styles.driverLocationCopy}>
          <Text style={styles.driverLocationTitle}>{isEnglish ? 'Your live location' : 'موقعك الحالي'}</Text>
          <Text style={styles.driverLocationCoordinates}>{driverCurrentCoordinate[1].toFixed(4)}, {driverCurrentCoordinate[0].toFixed(4)}</Text>
        </View>
      </View>
      <View style={styles.driverLocationDivider} />
      <View style={styles.driverLocationItem}>
        <View style={[styles.driverLocationDot, styles.driverLocationDotClient]} />
        <View style={styles.driverLocationCopy}>
          <Text style={styles.driverLocationTitle}>{isEnglish ? 'Delivery address' : 'عنوان التوصيل'}</Text>
          <Text style={styles.driverLocationCoordinates}>{orderClientCoordinate[1].toFixed(4)}, {orderClientCoordinate[0].toFixed(4)}</Text>
        </View>
      </View>
      <View style={styles.driverLocationEta}>
        <Ionicons name={driverRouteProgress >= 1 ? 'checkmark-circle' : 'time-outline'} size={17} color={colors.primary} />
        <Text style={styles.driverLocationEtaText}>{driverRouteEtaLabel}</Text>
      </View>
    </View>
  );

  const DriverMapScreen = () => {
    const pickedUp = driverOrderStatus === 'pickedUp' || driverOrderStatus === 'delivered';
    const delivered = driverOrderStatus === 'delivered';
    const arrivedAtClient = driverRouteProgress >= 1;
    const updateDriverDeliveryStatus = async () => {
      if (!driverAssignedDelivery?.id) return;
      if (pickedUp && !arrivedAtClient) {
        setDriverRouteProgress(1);
        return;
      }
      const nextStatus = pickedUp ? 'completed' : 'picked_up';
      try {
        await DriverService.updateDeliveryStatus(driverAssignedDelivery.id, nextStatus);
        if (pickedUp) {
          setCompletedDriverDeliveries((current) => current + 1);
          setDriverAssignedDelivery(null);
          setDriverAvailableDelivery(null);
          setDriverOrderStatus('pending');
          setDriverRouteProgress(0);
          resetTo('driverDashboard');
        } else {
          setDriverOrderStatus('pickedUp');
        }
      } catch (error) {
        showAppDialog(isEnglish ? 'Unable to update delivery' : 'تعذر تحديث التوصيلة', error instanceof Error ? error.message : (isEnglish ? 'Please try again.' : 'حاول مرة أخرى'));
      }
    };
    return (
      <View style={styles.driverMapFullscreen}>
        <StatusBar style="dark" />
        <DriverMapPanel expanded />
        <View style={[styles.driverMapFloatingTop, { top: topPad + 10 }]}>
          <Pressable accessibilityLabel={isEnglish ? 'Back' : 'رجوع'} onPress={goBack} style={styles.driverMapBackButton}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>
          <View style={styles.driverMapDestinationCard}><View style={styles.driverMapDestinationHeader}><View style={styles.driverMapDestinationIcon}><Ionicons name="location" size={16} color={colors.primary} /></View><Text style={styles.driverSectionEyebrow}>{isEnglish ? 'Delivering to' : 'التوصيل إلى'}</Text></View><Text style={styles.driverMapTopTitle}>{driverOrder.clientName}</Text><Text style={styles.driverMapTopSub}>{driverOrder.clientAddress}</Text><Text style={styles.driverMapCoordinateHint}>{hasClientAddress ? clientCoordinateLabel : (isEnglish ? 'Selected map location' : 'الموقع المحدد على الخريطة')}</Text></View>
        </View>
        <View style={[styles.driverMapBottomSheet, { paddingBottom: bottomPad + 14 }]}>
          <View style={styles.driverMapSheetHandle} />
          <View style={styles.driverMapSheetHeader}><View><Text style={styles.driverMapSheetTitle}>{isEnglish ? 'Client destination' : 'وجهة العميل'}</Text><Text style={styles.driverMapSheetSub}>{driverRouteDistanceLabel} · {driverRouteEtaLabel}</Text>{restaurantPrepSeconds > 0 && !pickedUp ? <Text style={styles.driverPrepCountdown}>{isEnglish ? `Restaurant ready in ${Math.floor(restaurantPrepSeconds / 60)}:${String(restaurantPrepSeconds % 60).padStart(2, '0')}` : `المطعم يجهز الطلب · ${Math.floor(restaurantPrepSeconds / 60)}:${String(restaurantPrepSeconds % 60).padStart(2, '0')}`}</Text> : null}</View><DriverOrderStatusPill /></View>
          <View style={styles.driverMapSheetActions}>
            <Pressable accessibilityLabel={isEnglish ? 'Open location in maps' : 'فتح الموقع في الخرائط'} onPress={openClientMap} style={styles.driverMapSecondaryAction}><Ionicons name="map-outline" size={18} color={colors.primary} /><Text style={styles.driverMapSecondaryText}>{isEnglish ? 'Maps' : 'الخرائط'}</Text></Pressable>
            {!delivered ? <View style={styles.driverMapPrimaryAction}><PrimaryButton label={pickedUp ? (arrivedAtClient ? (isEnglish ? 'Mark as delivered' : 'تأكيد التسليم') : (isEnglish ? 'Confirm arrival' : 'تأكيد الوصول')) : (isEnglish ? 'I picked up the order' : 'استلمت الطلب')} onPress={() => { void updateDriverDeliveryStatus(); }} /></View> : <View style={styles.driverMapPrimaryAction}><PrimaryButton label={isEnglish ? 'Back to driver center' : 'العودة إلى مركز السائق'} onPress={() => resetTo('driverDashboard')} /></View>}
          </View>
        </View>
      </View>
    );
  };

  const handleReleaseTap = async () => {
    if (user?.email?.trim().toLowerCase() === 'talabaticomp@zohomail.com') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      go('adminDashboard');
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showAppDialog('رقم الإصدار', 'طلباتي SD\nالإصدار 1.0.0');
  };

  const openPolicy = (policy: 'terms' | 'privacy') => setPolicyModal(policy);

  const SettingsScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }}>
        <Header title="الإعدادات" subtitle="الإعدادات" />
        <View style={styles.settingsSection}>
          <Text style={styles.settingsLabel}>التفضيلات</Text>
          <View style={styles.settingsGroup}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: offerNotifications }}
              onPress={async () => {
                const nextValue = !offerNotifications;
                setOfferNotifications(nextValue);
                await AsyncStorage.setItem('tawsel_offer_notifications', String(nextValue));
                await tap();
              }}
              style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
            >
              <View style={styles.accountRowIcon}><Ionicons name="notifications-outline" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={styles.accountRowTitle}>إشعارات العروض</Text><Text style={styles.accountRowSub}>{offerNotifications ? 'احصل على أفضل العروض' : 'تم إيقاف إشعارات العروض'}</Text></View>
              <View style={[styles.toggleOn, !offerNotifications && styles.toggleOff]}><View style={[styles.toggleKnob, !offerNotifications && styles.toggleKnobOff]} /></View>
            </Pressable>
          </View>
          <Text style={[styles.settingsLabel, { marginTop: 22 }]}>حول طلباتي SD</Text>
          <View style={styles.settingsGroup}>
            <Pressable onPress={() => openPolicy('terms')} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}><View style={styles.accountRowIcon}><Ionicons name="document-text-outline" size={20} color={colors.primary} /></View><Text style={[styles.accountRowTitle, { flex: 1 }]}>الشروط والأحكام</Text><Ionicons name="chevron-back" size={18} color={colors.mutedForeground} /></Pressable>
            <Pressable onPress={() => openPolicy('privacy')} style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}><View style={styles.accountRowIcon}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /></View><Text style={[styles.accountRowTitle, { flex: 1 }]}>سياسة الخصوصية</Text><Ionicons name="chevron-back" size={18} color={colors.mutedForeground} /></Pressable>
            <Pressable
              accessibilityLabel="رقم الإصدار"
              onPress={handleReleaseTap}
              style={[styles.settingsRow, styles.settingsRowLast]}
            >
              <View style={styles.accountRowIcon}><Ionicons name="information-circle-outline" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountRowTitle}>رقم الإصدار</Text>
                <Text style={styles.accountRowSub}>طلباتي SD</Text>
              </View>
              <Text style={styles.releaseNumber}>1.0.0</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const NotificationsScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }}><Header title="الإشعارات" subtitle="Notifications" /><View style={[styles.notificationList, styles.headerContentGap]}>{[{ title: 'تم تأكيد طلبك', sub: 'طلبك من بيتزا هت قيد التحضير الآن', time: 'منذ 5 دقائق', icon: 'checkmark-circle-outline' as const, tint: colors.paleGreen }, { title: 'عرض خاص لك', sub: 'خصم 20% على أول طلب لك اليوم', time: 'منذ ساعة', icon: 'pricetag-outline' as const, tint: colors.coral }, { title: 'طلبك وصل', sub: 'نتمنى لك وجبة شهية، محمد', time: 'أمس', icon: 'bicycle-outline' as const, tint: '#E8EFF8' }].map((item) => <View key={item.title} style={styles.notificationRow}><View style={[styles.notificationIcon, { backgroundColor: item.tint }]}><Ionicons name={item.icon} size={21} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.notificationSub}>{item.sub}</Text><Text style={styles.notificationTime}>{item.time}</Text></View><View style={styles.unreadDot} /></View>)}</View></ScrollView></View>;

  const SupportScreen = () => {
    const quickQuestions = [
      { label: 'تتبع طلبي', icon: 'bicycle-outline' as const },
      { label: 'تغيير العنوان', icon: 'location-outline' as const },
      { label: 'مشكلة في الدفع', icon: 'card-outline' as const },
    ];
    const sendSupportMessage = () => {
      const nextMessage = supportMessage.trim();
      if (!nextMessage) return;
      setSupportSentMessage(nextMessage);
      setSupportMessage('');
    };

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.supportContent, { paddingBottom: bottomPad + 136 }]} keyboardShouldPersistTaps="handled">
          <Header title={isEnglish ? 'Help & support' : 'المساعدة والدعم'} subtitle={isEnglish ? 'We are here for you' : 'نحن هنا من أجلك'} />
          <LinearGradient colors={[colors.primary, '#A80E2B']} style={styles.supportHero}>
            <View style={styles.supportAvatar}><Ionicons name="headset-outline" size={25} color="#fff" /></View>
            <View style={styles.supportHeroCopy}>
              <Text style={styles.supportTitle}>{isEnglish ? 'How can we help?' : 'كيف يمكننا مساعدتك؟'}</Text>
              <Text style={styles.supportSub}>{isEnglish ? 'Our support team is ready to help with your order.' : 'فريق الدعم جاهز لمساعدتك في طلبك.'}</Text>
            </View>
            <View style={styles.supportOnline}><View style={styles.supportOnlineDot} /><Text style={styles.supportOnlineText}>{isEnglish ? 'Online' : 'متصل الآن'}</Text></View>
          </LinearGradient>
          <View style={styles.supportResponseCard}>
            <Ionicons name="time-outline" size={17} color={colors.primary} />
            <View style={styles.supportResponseCopy}>
              <Text style={styles.supportResponseTitle}>{isEnglish ? 'Usually replies in a few minutes' : 'عادةً نرد خلال دقائق'}</Text>
              <Text style={styles.supportResponseSub}>{isEnglish ? 'Send us a message and we will take care of it.' : 'أرسل لنا رسالة وسنتولى مساعدتك.'}</Text>
            </View>
          </View>
          <View style={styles.supportConversationHeader}>
            <Text style={styles.supportConversationTitle}>{isEnglish ? 'Support conversation' : 'محادثة الدعم'}</Text>
            <View style={styles.supportConversationStatus}><View style={styles.supportOnlineDot} /><Text style={styles.supportConversationStatusText}>{isEnglish ? 'Replies in a few minutes' : 'الرد خلال دقائق'}</Text></View>
          </View>
          <View style={styles.chatBubbleAgent}><Text style={styles.chatText}>{isEnglish ? 'Hi Mohammed, how can I help you today?' : 'مرحباً محمد، كيف يمكنني مساعدتك اليوم؟'}</Text><Text style={styles.chatTime}>{isEnglish ? 'Today · 10:32 AM' : 'اليوم · 10:32 ص'}</Text></View>
          {supportSentMessage ? (
            <>
              <View style={[styles.chatBubbleUser, styles.chatBubbleUserLatest]}><Text style={styles.chatTextWhite}>{supportSentMessage}</Text><Text style={styles.chatTimeWhite}>{isEnglish ? 'Now' : 'الآن'}</Text></View>
              <View style={styles.chatBubbleAgent}><Text style={styles.chatText}>{isEnglish ? 'Thanks for reaching out. Our team will review this and reply shortly.' : 'شكراً لتواصلك معنا. سيراجع فريقنا رسالتك ويرد عليك قريباً.'}</Text><Text style={styles.chatTime}>الآن</Text></View>
            </>
          ) : null}
          <View style={styles.supportQuick}>
            <View style={styles.supportQuickHeader}>
              <Text style={styles.supportQuickLabel}>{isEnglish ? 'Quick help' : 'مساعدة سريعة'}</Text>
              <Text style={styles.supportQuickSub}>{isEnglish ? 'Choose a topic to start' : 'اختر موضوعاً لبدء المحادثة'}</Text>
            </View>
            <View style={styles.quickPillRow}>
            {quickQuestions.map((question) => (
              <Pressable
                key={question.label}
                accessibilityLabel={isEnglish ? `Ask about ${question.label}` : `السؤال عن ${question.label}`}
                onPress={() => setSupportMessage(question.label)}
                style={({ pressed }) => [styles.quickPill, pressed && styles.pressed]}
              >
                <View style={styles.quickPillIcon}><Ionicons name={question.icon} size={17} color={colors.primary} /></View>
                <Text style={styles.quickText}>{isEnglish ? ({ 'تتبع طلبي': 'Track my order', 'تغيير العنوان': 'Change address', 'مشكلة في الدفع': 'Payment issue' }[question.label] ?? question.label) : question.label}</Text>
                <Ionicons name="arrow-back" size={13} color={colors.mutedForeground} />
              </Pressable>
            ))}
            </View>
          </View>
        </ScrollView>
        <View style={[styles.chatInputBar, { paddingBottom: bottomPad + 8 }]}>
          <View style={styles.chatComposer}>
            <TextInput
              value={supportMessage}
              onChangeText={setSupportMessage}
              multiline
              placeholder={isEnglish ? 'Write your message...' : 'اكتب رسالتك...'}
              placeholderTextColor={colors.mutedForeground}
              style={styles.chatInput}
            />
            <Pressable
              accessibilityLabel={isEnglish ? 'Send message' : 'إرسال الرسالة'}
              disabled={!supportMessage.trim()}
              onPress={sendSupportMessage}
              style={({ pressed }) => [styles.sendButton, !supportMessage.trim() && styles.sendButtonDisabled, pressed && styles.pressed]}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </Pressable>
          </View>
          <Text style={styles.chatComposerHint}>{isEnglish ? 'Our team usually replies within a few minutes.' : 'يرد فريقنا عادةً خلال دقائق.'}</Text>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const AddressesScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }}><Header title="عناويني" subtitle="My addresses" /><View style={[styles.addressList, styles.headerContentGap]}>{savedAddresses.map((savedAddress) => <Pressable key={savedAddress.id} style={[styles.savedAddress, address === savedAddress.value && styles.savedAddressActive]} onPress={() => selectSavedAddress(savedAddress)}><View style={styles.addressRadio}>{address === savedAddress.value ? <View style={styles.addressRadioDot} /> : null}</View><View style={{ flex: 1 }}><Text style={styles.savedAddressTitle}>{savedAddress.label}</Text><Text style={styles.savedAddressText}>{savedAddress.value}</Text></View><View style={styles.savedAddressActions}><Pressable accessibilityRole="button" accessibilityLabel={`تعديل ${savedAddress.label}`} onPress={(event) => { event.stopPropagation(); openAddressEditor(savedAddress); }}><Ionicons name="pencil-outline" size={17} color={colors.mutedForeground} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`حذف ${savedAddress.label}`} onPress={(event) => { event.stopPropagation(); void deleteSavedAddress(savedAddress); }}><Ionicons name="trash-outline" size={17} color={colors.primary} /></Pressable></View></Pressable>)}<Pressable accessibilityRole="button" onPress={openNewAddressEditor} style={styles.addAddressRow}><Ionicons name="add-circle-outline" size={22} color={colors.primary} /><Text style={styles.addAddressText}>إضافة عنوان جديد</Text></Pressable></View></ScrollView></View>;

  const PaymentsScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }}>
        <Header title="طرق الدفع" subtitle="Payment methods" />
        <View style={[styles.paymentList, styles.headerContentGap]}>
          {paymentOptions.map((method) => (
            <Pressable
              key={method.id}
              onPress={() => {
                setEditingPaymentMethod(method.id);
                setPaymentSaveMessage('');
              }}
              style={({ pressed }) => [styles.savedPayment, editingPaymentMethod === method.id && styles.savedPaymentActive, pressed && styles.pressed]}
            >
              <View style={styles.savedPaymentIcon}><Ionicons name={method.icon} size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedPaymentTitle}>{method.title}</Text>
                <Text style={styles.savedPaymentSub}>{paymentDetails[method.id] ? `الحساب: ${maskPaymentDetails(paymentDetails[method.id])}` : method.sub}</Text>
              </View>
              <View style={styles.savedPaymentStatus}>
                {paymentMethod === method.id ? <Text style={styles.savedPaymentDefault}>الافتراضية</Text> : null}
                <Ionicons name={paymentMethod === method.id ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color={colors.primary} />
              </View>
            </Pressable>
          ))}
          <View style={styles.paymentDetailsCard}>
            <Text style={styles.paymentDetailsTitle}>بيانات الحساب</Text>
            <Text style={styles.paymentDetailsHint}>أدخل رقم الحساب أو رقم الهاتف لـ {selectedPaymentOption.title}</Text>
            <TextInput
              value={paymentDetails[editingPaymentMethod] ?? ''}
              onChangeText={(value) => {
                setPaymentDetails((current) => ({ ...current, [editingPaymentMethod]: value }));
                setPaymentSaveMessage('');
              }}
              placeholder="رقم الحساب أو رقم الهاتف"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              style={styles.paymentDetailsInput}
            />
            <Pressable
              onPress={savePaymentProfile}
              style={({ pressed }) => [styles.paymentSaveButton, !paymentDetails[editingPaymentMethod]?.trim() && styles.paymentSaveButtonDisabled, pressed && styles.pressed]}
            >
              <Text style={styles.paymentSaveButtonText}>حفظ كطريقة الدفع الافتراضية</Text>
            </Pressable>
            {paymentSaveMessage ? <Text style={styles.paymentSaveMessage}>{paymentSaveMessage}</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderScreen = () => {
    switch (screen) {
      case 'intro': return IntroScreen();
      case 'login': return AuthScreen({});
      case 'register': return AuthScreen({ register: true });
      case 'driverLogin': return DriverAuthScreen({});
      case 'driverRegister': return DriverAuthScreen({ register: true });
      case 'home': return HomeScreen();
      case 'categories': return CategoriesScreen();
      case 'restaurant': return RestaurantScreen();
      case 'product': return ProductScreen();
      case 'cart': return CartScreen();
      case 'address': return AddressScreen();
      case 'payment': return PaymentScreen();
      case 'review': return ReviewScreen();
      case 'paymentVerification': return PaymentVerificationScreen();
      case 'track': return LiveTrackScreen();
      case 'orders': return OrdersScreen();
      case 'favorites': return FavoritesScreen();
      case 'account': return AccountScreen();
      case 'settings': return SettingsScreen();
      case 'notifications': return NotificationsScreen();
      case 'support': return SupportScreen();
      case 'driverSupport': return DriverSupportScreen();
      case 'addresses': return AddressesScreen();
      case 'payments': return PaymentsScreen();
      case 'driverDashboard': return DriverDashboardScreen();
      case 'driverDeliveries': return DriverDeliveriesScreen();
      case 'driverEarnings': return DriverEarningsScreen();
      case 'driverAccount': return DriverAccountScreen();
      case 'driverSettings': return DriverSettingsScreen();
      case 'driverOrder': return DriverOrderScreen();
      case 'driverMap': return DriverMapScreen();
      case 'adminDashboard': return <AdminDashboardScreen topPad={topPad} bottomPad={bottomPad} onBack={goBack} onCatalogChanged={() => setCatalogRefreshKey((current) => current + 1)} />;
    }
  };

  return (
    <LanguageContext.Provider value={isEnglish}>
      <View style={styles.appRoot} {...(Platform.OS === 'web' ? { dir: appDirection } : {})}>
        {renderScreen()}
        <Modal visible={editingAddress} transparent animationType="fade" onRequestClose={() => setEditingAddress(false)}>
          <View style={styles.addressEditOverlay}>
            <View style={styles.addressEditCard}>
              <Text style={styles.addressEditTitle}>{editingAddressId ? 'تعديل العنوان' : 'إضافة عنوان جديد'}</Text>
              <TextInput value={addressLabelDraft} onChangeText={setAddressLabelDraft} placeholder="اسم العنوان" placeholderTextColor={colors.mutedForeground} style={styles.addressEditInput} />
              <TextInput value={addressDraft} onChangeText={setAddressDraft} autoFocus textAlign="right" placeholder="اكتب العنوان" placeholderTextColor={colors.mutedForeground} style={styles.addressEditInput} />
              <Pressable onPress={openAddressMapPicker} style={styles.addressMapOpenButton}><Ionicons name="map-outline" size={18} color={colors.primary} /><Text style={styles.addressMapOpenText}>اختيار العنوان من الخريطة</Text></Pressable>
              <View style={styles.addressEditActions}>
                <Pressable onPress={() => setEditingAddress(false)} style={styles.addressEditCancel}><Text style={styles.addressEditCancelText}>إلغاء</Text></Pressable>
                <Pressable onPress={saveAddressEdit} disabled={!addressDraft.trim()} style={[styles.addressEditSave, !addressDraft.trim() && styles.disabledButton]}><Text style={styles.addressEditSaveText}>حفظ</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={addressMapPickerVisible} animationType="slide" onRequestClose={() => setAddressMapPickerVisible(false)}>
          <View style={[styles.addressMapModal, { paddingTop: topPad }]}>
            <View style={styles.addressMapHeader}>
              <Pressable accessibilityLabel="إغلاق الخريطة" onPress={() => setAddressMapPickerVisible(false)} style={styles.addressMapClose}><Ionicons name="close" size={21} color={colors.ink} /></Pressable>
              <View style={styles.addressMapHeaderCopy}><Text style={styles.addressMapTitle}>اختيار عنوان التوصيل</Text><Text style={styles.addressMapSubtitle}>اضغط على الخريطة أو حرّك العلامة</Text></View>
            </View>
            <View style={styles.addressMapBody}><AddressMapPicker coordinate={addressMapDraftCoordinate} onSelect={updateAddressMapDraft} /></View>
            <View style={[styles.addressMapFooter, { paddingBottom: bottomPad + 12 }]}>
              <View style={styles.addressMapNumberRow}><Ionicons name="location-outline" size={19} color={colors.primary} /><Text style={styles.addressMapNumber}>{addressMapDraftCoordinate[1].toFixed(6)}, {addressMapDraftCoordinate[0].toFixed(6)}</Text></View>
              <Pressable onPress={saveAddressMapSelection} style={styles.addressMapSave}><Text style={styles.addressMapSaveText}>حفظ العنوان</Text></Pressable>
            </View>
          </View>
        </Modal>
        <Modal visible={policyModal !== null} transparent animationType="slide" onRequestClose={() => setPolicyModal(null)}>
          <View style={styles.policyOverlay}>
            <View style={[styles.policySheet, { paddingBottom: bottomPad + 12 }]}>
              <View style={styles.policyHeader}>
                <Pressable accessibilityLabel="إغلاق" onPress={() => setPolicyModal(null)} style={styles.policyClose}><Ionicons name="close" size={20} color={colors.ink} /></Pressable>
                <View style={styles.policyHeaderCopy}><Text style={styles.policyTitle}>{policyModal === 'terms' ? 'الشروط والأحكام' : 'سياسة الخصوصية'}</Text><Text style={styles.policyUpdated}>آخر تحديث: 2026/09/04</Text></View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.policyContent}>
                {policyModal === 'terms' ? <>
                  <Text style={styles.policyLead}>باستخدام تطبيق طلباتي SD، فإنك توافق على الشروط التالية.</Text>
                  <Text style={styles.policyHeading}>1. استخدام التطبيق</Text><Text style={styles.policyText}>يُستخدم التطبيق لعرض المنتجات والخدمات، إنشاء الطلبات، اختيار عناوين التوصيل، متابعة حالة الطلب، والتواصل مع السائقين والدعم. يجب تقديم معلومات صحيحة وعدم استخدام التطبيق لأي نشاط غير قانوني أو مضلل.</Text>
                  <Text style={styles.policyHeading}>2. الطلبات والدفع</Text><Text style={styles.policyText}>قبل تأكيد الطلب، راجع المنتجات والكميات والعنوان والتكلفة. قد يحتاج الدفع إلى مراجعة الإدارة قبل إرسال الطلب للسائقين. أنت مسؤول عن صحة بيانات الدفع وعدم مشاركة كلمات المرور أو رموز التحقق.</Text>
                  <Text style={styles.policyHeading}>3. التوصيل</Text><Text style={styles.policyText}>تُستخدم بيانات العنوان لتنسيق التوصيل. قد يختلف وقت الوصول حسب المسافة، حالة المطعم، حركة المرور، وتوفر السائقين. يجب توفير عنوان واضح والتعاون مع السائق عند التسليم.</Text>
                  <Text style={styles.policyHeading}>4. السائقون</Text><Text style={styles.policyText}>يجب على السائق قبول الطلبات التي يستطيع تنفيذها فقط، الحفاظ على سلامة الطلب، تحديث حالة التوصيل بصدق، وعدم استخدام بيانات العميل خارج غرض التوصيل.</Text>
                  <Text style={styles.policyHeading}>5. الإلغاء والدعم</Text><Text style={styles.policyText}>قد تختلف إمكانية الإلغاء حسب مرحلة الطلب. عند وجود مشكلة في الدفع أو المنتج أو التوصيل، تواصل مع الدعم عبر القنوات المتاحة في التطبيق وقدّم رقم الطلب والتفاصيل اللازمة.</Text>
                  <Text style={styles.policyHeading}>6. التغييرات والمسؤولية</Text><Text style={styles.policyText}>قد نحدّث هذه الشروط أو بعض وظائف التطبيق لتحسين الخدمة. استمرارك في الاستخدام بعد التحديث يعني موافقتك على النسخة الجديدة. نعمل على توفير الخدمة باستمرار، وقد تحدث انقطاعات مؤقتة بسبب الصيانة أو مزودي الخدمة.</Text>
                </> : <>
                  <Text style={styles.policyLead}>نحترم خصوصيتك ونوضح هنا كيف يتعامل تطبيق طلباتي SD مع بياناتك.</Text>
                  <Text style={styles.policyHeading}>1. البيانات التي نجمعها</Text><Text style={styles.policyText}>قد نجمع الاسم، البريد الإلكتروني، رقم الهاتف، عناوين التوصيل، تفاصيل الطلب، بيانات الدفع اللازمة للمراجعة، ومعلومات السائق مثل المركبة وبيانات استلام الأرباح.</Text>
                  <Text style={styles.policyHeading}>2. الموقع الجغرافي</Text><Text style={styles.policyText}>عند السماح، نستخدم موقع الجهاز لمساعدة السائق على متابعة موقعه وعرض المسار إلى العميل. يمكنك إيقاف صلاحية الموقع من إعدادات الجهاز، وقد تتأثر وظائف الخرائط عند إيقافها.</Text>
                  <Text style={styles.policyHeading}>3. كيف نستخدم البيانات</Text><Text style={styles.policyText}>نستخدم البيانات لإنشاء الطلبات، التوصيل، الدفع، عرض سجل الطلبات، تحسين تجربة التطبيق، معالجة طلبات السائقين، والرد على الدعم. لا نبيع بياناتك الشخصية.</Text>
                  <Text style={styles.policyHeading}>4. المشاركة والحماية</Text><Text style={styles.policyText}>تُشارك بيانات التوصيل الضرورية مع السائق المعيّن لتنفيذ الطلب. نستخدم خدمات مصادقة وقاعدة بيانات سحابية، ونحد من الوصول حسب نوع الحساب. مع ذلك، لا توجد وسيلة إلكترونية تضمن حماية مطلقة.</Text>
                  <Text style={styles.policyHeading}>5. الاحتفاظ والطلبات</Text><Text style={styles.policyText}>نحتفظ بسجل الطلبات وبيانات الحساب بالقدر اللازم لتشغيل الخدمة، حل النزاعات، وإثبات العمليات. يمكنك التواصل مع الدعم لطلب تصحيح بياناتك أو الاستفسار عن استخدامها.</Text>
                  <Text style={styles.policyHeading}>6. الأطفال والتواصل</Text><Text style={styles.policyText}>الخدمة مخصصة للمستخدمين القادرين قانونياً على استخدامها. قد نتواصل معك بشأن الطلبات أو الأمان أو الدعم، ويمكنك إدارة الإشعارات غير الضرورية من الإعدادات.</Text>
                  <Text style={styles.policyHeading}>7. التواصل</Text><Text style={styles.policyText}>للاستفسارات المتعلقة بالخصوصية أو الحساب، تواصل مع فريق طلباتي SD عبر قنوات الدعم الموضحة داخل التطبيق.</Text>
                </>}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
          visible={orderStatusPopup !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setOrderStatusPopup(null)}
        >
          {orderStatusPopup ? (
            <View style={styles.orderStatusOverlay}>
              <Pressable
                accessibilityLabel="إغلاق تفاصيل الطلب"
                onPress={() => setOrderStatusPopup(null)}
                style={styles.orderStatusBackdrop}
              />
              <View style={styles.orderStatusSheet}>
                <View style={styles.orderStatusHandle} />
                <View style={styles.orderStatusHeader}>
                  <View style={styles.orderStatusSuccessIcon}>
                    <Ionicons name="checkmark" size={25} color="#fff" />
                  </View>
                  <View style={styles.orderStatusHeaderCopy}>
                    <Text style={styles.orderStatusTitle}>تم استلام طلبك</Text>
                    <Text style={styles.orderStatusSubtitle}>طلب رقم #{orderStatusPopup.orderId}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="إغلاق تفاصيل الطلب"
                    onPress={() => setOrderStatusPopup(null)}
                    style={styles.orderStatusClose}
                  >
                    <Ionicons name="close" size={19} color={colors.ink} />
                  </Pressable>
                </View>

                  <View style={styles.orderStatusPill}>
                  <View style={[styles.orderStatusDot, paymentStatus === 'paid' && styles.orderStatusDotPaid]} />
                  <Text style={styles.orderStatusPillText}>{paymentStatus === 'paid' ? 'تم تأكيد الدفع' : 'بانتظار تأكيد الدفع'}</Text>
                </View>

                <View style={styles.orderStatusProgress}>
                  <View style={styles.orderStatusProgressItem}><View style={styles.orderStatusProgressDone}><Ionicons name="checkmark" size={11} color="#fff" /></View><Text style={styles.orderStatusProgressText}>تم الإرسال</Text></View>
                  <View style={[styles.orderStatusProgressLine, paymentStatus === 'paid' && styles.orderStatusProgressLineDone]} />
                  <View style={styles.orderStatusProgressItem}><View style={[styles.orderStatusProgressCircle, paymentStatus === 'paid' && styles.orderStatusProgressDone]}>{paymentStatus === 'paid' ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}</View><Text style={styles.orderStatusProgressText}>قيد المراجعة</Text></View>
                  <View style={[styles.orderStatusProgressLine, paymentStatus === 'paid' && styles.orderStatusProgressLineDone]} />
                  <View style={styles.orderStatusProgressItem}><View style={[styles.orderStatusProgressCircle, paymentStatus === 'paid' && styles.orderStatusProgressDone]}>{paymentStatus === 'paid' ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}</View><Text style={styles.orderStatusProgressText}>قيد التحضير</Text></View>
                </View>

                <View style={styles.orderStatusDetails}>
                  <View style={styles.orderStatusDetailRow}><Ionicons name="location-outline" size={18} color={colors.primary} /><View style={styles.orderStatusDetailCopy}><Text style={styles.orderStatusDetailLabel}>عنوان التوصيل</Text><Text style={styles.orderStatusDetailValue}>{orderStatusPopup.address}</Text></View></View>
                  <View style={styles.orderStatusDetailRow}><Ionicons name="card-outline" size={18} color={colors.primary} /><View style={styles.orderStatusDetailCopy}><Text style={styles.orderStatusDetailLabel}>طريقة الدفع</Text><Text style={styles.orderStatusDetailValue}>{orderStatusPopup.paymentMethod}</Text></View></View>
                  <View style={styles.orderStatusDetailRow}><Ionicons name="bag-handle-outline" size={18} color={colors.primary} /><View style={styles.orderStatusDetailCopy}><Text style={styles.orderStatusDetailLabel}>الطلب</Text><Text style={styles.orderStatusDetailValue}>{orderStatusPopup.items.length} عناصر</Text></View><Text style={styles.orderStatusTotal}>{money(orderStatusPopup.total)}</Text></View>
                </View>

                <View style={styles.orderStatusItems}>
                  <Text style={styles.orderStatusItemsTitle}>تفاصيل المنتجات</Text>
                  {orderStatusPopup.items.map((item) => <View key={item.id} style={styles.orderStatusItem}><Text style={styles.orderStatusItemName}>{item.title} × {item.quantity}</Text><Text style={styles.orderStatusItemPrice}>{money(item.price * item.quantity)}</Text></View>)}
                </View>

                <View style={styles.orderStatusActions}>
                  <Pressable onPress={() => { setOrderStatusPopup(null); resetTo('home'); }} style={styles.orderStatusSecondary}><Text style={styles.orderStatusSecondaryText}>الرئيسية</Text></Pressable>
                  <Pressable onPress={() => { if (!orderStatusPopup) return; setOrderStatusPopup(null); setOrderFilter('all'); setExpandedOrderId(orderStatusPopup.orderId); openTab('orders'); }} style={styles.orderStatusPrimary}><Text style={styles.orderStatusPrimaryText}>عرض حالة الطلب</Text><Ionicons name="arrow-back" size={16} color="#fff" /></Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </Modal>
        {appDialog ? (
          <View style={styles.appDialogOverlay} accessibilityViewIsModal>
            <Pressable style={styles.appDialogBackdrop} onPress={() => setAppDialog(null)} />
            <View style={styles.appDialogCard}>
              <View style={styles.appDialogIcon}><Ionicons name="information-circle" size={26} color={colors.primary} /></View>
              <Text style={styles.appDialogTitle}>{appDialog.title}</Text>
              <Text style={styles.appDialogMessage}>{appDialog.message}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setAppDialog(null)} style={styles.appDialogButton}>
                <Text style={styles.appDialogButtonText}>حسناً</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.cream },
  intro: { flex: 1, backgroundColor: colors.primary },
  introTop: { alignItems: 'center' },
  introLogoCircle: { width: 86, height: 86, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  introLogo: { width: 58, height: 58, tintColor: '#fff' },
  introBrand: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  introEnglish: { color: 'rgba(255,255,255,0.78)', fontSize: 12, letterSpacing: 3, marginTop: 2 },
  introHero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  introSwoosh: { position: 'absolute', width: 270, height: 270, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 135, transform: [{ rotate: '-18deg' }] },
  introDeliveryIcon: { width: 114, height: 114, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)', marginBottom: 28 },
  introHeadline: { color: '#fff', fontSize: 22, fontWeight: '700' },
  introSubline: { color: 'rgba(255,255,255,0.73)', fontSize: 13, marginTop: 7 },
  introActions: { paddingHorizontal: 18 },
  rolePrompt: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 9 },
  roleRow: { flexDirection: 'column', gap: 10, marginBottom: 10 },
  roleActive: { width: '100%', minHeight: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  roleOutline: { width: '100%', minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.63)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  roleActiveText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  roleOutlineText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  languageRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
  languageActive: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  languageActiveText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  languageOutline: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.63)', alignItems: 'center', justifyContent: 'center' },
  languageOutlineText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  authContent: { paddingHorizontal: 21 },
  authTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backCircle: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  authTrustPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, minHeight: 30, borderRadius: 10, backgroundColor: colors.paleGreen },
  authTrustText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  authBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 27 },
  authLogo: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  authLogoImage: { width: 31, height: 31 },
  authBrandName: { color: colors.primary, fontSize: 16, fontWeight: '800', textAlign: 'left' },
  authBrandCaption: { color: colors.mutedForeground, fontSize: 9, marginTop: 2, textAlign: 'left' },
  authEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textAlign: 'left', marginBottom: 6 },
  authTitle: { fontSize: 25, color: colors.ink, fontWeight: '700', textAlign: 'left' },
  authSubtitle: { color: colors.mutedForeground, fontSize: 14, lineHeight: 22, marginTop: 7, marginBottom: 20, textAlign: 'left' },
  authFormCard: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 15, shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  authFieldGroup: { marginBottom: 13 },
  authFieldLabel: { color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'left', marginBottom: 7 },
  inputWrap: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.cream, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, marginBottom: 0 },
  authFieldFocused: { borderColor: colors.primary, backgroundColor: '#fff' },
  input: { minWidth: 0, flex: 1, flexShrink: 1, fontSize: 14, color: colors.ink, height: 52, paddingHorizontal: 12 },
  phoneRow: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.cream, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 6, marginBottom: 0, overflow: 'hidden' },
  countryCode: { flexShrink: 0, height: 42, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRightWidth: 1, borderRightColor: colors.border },
  countryFlag: { color: colors.primary, fontSize: 15 },
  countryText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  authHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, marginBottom: 15, paddingHorizontal: 2 },
  authHintText: { flex: 1, color: colors.mutedForeground, fontSize: 10, textAlign: 'left' },
  authError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, padding: 12, backgroundColor: colors.coral, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226, 92, 76, 0.28)' },
  authErrorText: { flex: 1, color: '#000', fontSize: 11, fontWeight: '600', textAlign: 'left' },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', alignSelf: 'center', minWidth: 0, flex: 1, flexShrink: 1 },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  outlineButtonText: { color: colors.primary },
  disabledButton: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 21 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.mutedForeground, fontSize: 12 },
  googleButton: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.input, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleG: { color: '#4285F4', fontSize: 19, fontWeight: '700' },
  googleText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  terms: { color: colors.mutedForeground, textAlign: 'center', fontSize: 11, lineHeight: 18, marginTop: 26 },
  termsLink: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
  authSwitch: { alignItems: 'center', marginTop: 25 },
  authSwitchText: { color: colors.mutedForeground, fontSize: 13 },
  driverHeader: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  driverHeaderButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  driverHeaderCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  driverHeaderTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  driverHeaderSubtitle: { color: colors.mutedForeground, fontSize: 13, marginTop: 3, textAlign: 'center' },
  driverWelcome: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverWelcomeIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  driverWelcomeCopy: { flex: 1 },
  driverWelcomeTitle: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'left' },
  driverWelcomeSub: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 4, textAlign: 'left' },
  driverLiveTag: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8FF0A7' },
  driverLiveText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  driverOnlineCard: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverOnlineCopy: { flex: 1 },
  driverSectionEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', textAlign: 'left' },
  driverOnlineTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'left' },
  driverOnlineSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, lineHeight: 14, textAlign: 'left' },
  driverToggle: { width: 49, height: 29, borderRadius: 16, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  driverToggleOn: { backgroundColor: colors.green },
  driverToggleKnob: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#fff' },
  driverToggleKnobOn: { alignSelf: 'flex-end' },
  driverStatsRow: { marginHorizontal: 20, flexDirection: 'row', gap: 9, marginBottom: 22 },
  driverStatCard: { flex: 1, minHeight: 73, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  driverStatValue: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  driverStatLabel: { color: colors.mutedForeground, fontSize: 9, marginTop: 5 },
  driverSectionHeader: { marginHorizontal: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  driverSectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  driverSectionHint: { color: colors.primary, fontSize: 9, fontWeight: '700' },
  driverTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, elevation: 8, backgroundColor: 'rgba(255,255,255,0.98)', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 },
  driverTabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14 },
  driverTabButtonActive: { backgroundColor: colors.coral },
  driverTabLabel: { color: colors.mutedForeground, fontSize: 8, fontWeight: '600', textAlign: 'center' },
  driverTabLabelActive: { color: colors.primary, fontWeight: '800' },
  driverTabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 1 },
  driverTabIntro: { marginHorizontal: 20, marginBottom: 21, padding: 16, borderRadius: 18, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverTabIntroTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 5, textAlign: 'left' },
  driverTabCount: { width: 61, height: 61, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  driverTabCountValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  driverTabCountLabel: { color: colors.mutedForeground, fontSize: 8, marginTop: 2 },
  driverTabSectionTitle: { marginHorizontal: 20, marginBottom: 10, marginTop: 10, color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'left' },
  driverDeliveryCard: { marginHorizontal: 20, marginBottom: 22, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverDeliveryCardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  driverDeliveryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverDeliveryCopy: { flex: 1 },
  driverDeliveryTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'left' },
  driverDeliverySub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  driverDeliveryRoute: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 7 },
  driverDeliveryRouteText: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: '700', textAlign: 'left' },
  driverDeliveryFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverDeliveryMeta: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  driverDeliveryAction: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverHistoryRow: { marginHorizontal: 20, marginBottom: 9, padding: 12, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
  driverHistoryIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  driverHistoryCopy: { flex: 1 },
  driverHistoryTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  driverHistorySub: { color: colors.mutedForeground, fontSize: 8, marginTop: 3, textAlign: 'left' },
  driverHistoryAmount: { alignItems: 'flex-end' },
  driverHistoryPrice: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  driverHistoryStatus: { color: colors.green, fontSize: 8, marginTop: 3, fontWeight: '700' },
  driverEarningsHero: { marginHorizontal: 20, marginBottom: 14, padding: 18, borderRadius: 20, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverEarningsEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, textAlign: 'left' },
  driverEarningsValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 5, textAlign: 'left' },
  driverEarningsCurrency: { fontSize: 12, fontWeight: '700' },
  driverEarningsSub: { color: '#A5F0B5', fontSize: 9, marginTop: 3, textAlign: 'left' },
  driverEarningsIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  driverBankRequiredCard: { marginHorizontal: 20, marginBottom: 14, padding: 16, borderRadius: 16, backgroundColor: colors.coral, borderWidth: 1, borderColor: '#F2C5CE', alignItems: 'center' },
  driverBankRequiredTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  driverBankRequiredText: { color: "#000", fontSize: 10, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  driverBankRequiredButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  driverBankRequiredButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  driverPayoutRequestButton: { marginHorizontal: 20, minHeight: 46, borderRadius: 13, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12 },
  driverPayoutRequestText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  driverEarningsHistory: { marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverEarningHistoryRow: { minHeight: 54, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8 },
  driverEarningHistoryAmount: { color: colors.green, fontSize: 11, fontWeight: '800' },
  driverEarningsHistoryEmpty: { color: colors.mutedForeground, fontSize: 10, textAlign: 'center', paddingVertical: 14 },
  driverPanelCard: { marginHorizontal: 20, marginBottom: 14, padding: 15, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverPanelCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  driverPanelHint: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverBars: { height: 136, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 7 },
  driverBarColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  driverBarTrack: { width: '100%', maxWidth: 22, height: 105, borderRadius: 9, backgroundColor: colors.coral, justifyContent: 'flex-end', overflow: 'hidden' },
  driverBarFill: { width: '100%', borderRadius: 9, backgroundColor: colors.primary },
  driverBarLabel: { color: colors.mutedForeground, fontSize: 9, fontWeight: '700' },
  driverPayoutRow: { marginHorizontal: 20, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverPayoutIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverPayoutCopy: { flex: 1 },
  driverPayoutTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  driverPayoutSub: { color: colors.mutedForeground, fontSize: 8, marginTop: 3, textAlign: 'left' },
  driverProfileCard: { marginHorizontal: 20, marginBottom: 14, padding: 20, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  driverProfileAvatar: { width: 67, height: 67, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  driverProfileName: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  driverProfilePhone: { color: colors.mutedForeground, fontSize: 10, marginTop: 4 },
  driverRatingPill: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', gap: 5 },
  driverRatingText: { color: colors.ink, fontSize: 9, fontWeight: '700' },
  driverProfileRow: { minHeight: 57, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverProfileRowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverProfileRowCopy: { flex: 1 },
  driverProfileRowLabel: { color: colors.mutedForeground, fontSize: 9, textAlign: 'left' },
  driverProfileRowValue: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'left' },
  driverEditProfileButton: { marginHorizontal: 20, minHeight: 47, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginBottom: 14 },
  driverEditProfileText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  driverProfileEditPanel: { marginHorizontal: 20, marginBottom: 14, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: 8 },
  driverProfileField: { gap: 3 },
  driverProfileFieldLabel: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  driverProfileFieldSubtitle: { color: colors.mutedForeground, fontSize: 9, lineHeight: 14, textAlign: 'left', marginBottom: 3 },
  driverProfileInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.cream, color: colors.ink, paddingHorizontal: 12, fontSize: 12 },
  driverProfileSaveButton: { minHeight: 42, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  driverProfileSaveText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  driverProfileMessage: { color: colors.primary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  driverSettingsSection: { marginHorizontal: 20, marginTop: 4, marginBottom: 9, color: colors.primary, fontSize: 10, fontWeight: '800', textAlign: 'left' },
  driverSettingRow: { marginHorizontal: 20, marginBottom: 9, padding: 13, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverSettingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverSettingCopy: { flex: 1 },
  driverSettingTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  driverSettingSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  driverSupportHero: { marginHorizontal: 20, marginBottom: 14, padding: 17, borderRadius: 19, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 11 },
  driverSupportHeroIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  driverSupportHeroCopy: { flex: 1 },
  driverSupportHeroTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'left' },
  driverSupportHeroSub: { color: 'rgba(255,255,255,0.74)', fontSize: 9, lineHeight: 15, marginTop: 4, textAlign: 'left' },
  driverSupportSection: { marginHorizontal: 20, marginBottom: 9, color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  driverSupportContactRow: { marginHorizontal: 20, marginBottom: 20, flexDirection: 'row', gap: 9 },
  driverSupportContact: { flex: 1, minHeight: 91, padding: 11, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  driverSupportContactIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  driverSupportWhatsapp: { backgroundColor: colors.paleGreen },
  driverSupportContactTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  driverSupportContactSub: { color: colors.mutedForeground, fontSize: 8, marginTop: 3 },
  driverSupportSectionRow: { marginBottom: 9, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  driverSupportCount: { marginHorizontal: 20, color: colors.mutedForeground, fontSize: 9 },
  driverFaqRow: { marginHorizontal: 20, marginBottom: 8, padding: 13, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  driverFaqRowExpanded: { borderColor: colors.primary, backgroundColor: '#FFF9F9' },
  driverFaqCopy: { flex: 1 },
  driverFaqQuestion: { color: colors.ink, fontSize: 10, fontWeight: '800', lineHeight: 16, textAlign: 'left' },
  driverFaqAnswer: { color: colors.mutedForeground, fontSize: 9, lineHeight: 15, marginTop: 8, textAlign: 'left' },
  driverSupportEmpty: { marginHorizontal: 20, marginBottom: 20, padding: 22, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  driverSupportEmptyTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 8 },
  driverSupportEmptySub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'center' },
  driverSupportSuccess: { marginHorizontal: 20, marginBottom: 8, padding: 11, borderRadius: 12, backgroundColor: colors.paleGreen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  driverSupportSuccessText: { color: colors.green, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  driverSupportComposer: { marginHorizontal: 20, minHeight: 92, padding: 10, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  driverSupportMessageInput: { flex: 1, minHeight: 68, maxHeight: 96, color: colors.ink, fontSize: 10, lineHeight: 15, textAlignVertical: 'top' },
  driverSupportSend: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverSupportSendDisabled: { opacity: 0.4 },
  driverStatusPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.paleGreen, flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverStatusPillPending: { backgroundColor: colors.accent },
  driverStatusPillRejected: { backgroundColor: colors.coral },
  driverStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  driverStatusPillText: { color: colors.green, fontSize: 9, fontWeight: '800' },
  driverIncomingCard: { marginHorizontal: 20, padding: 14, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary, marginBottom: 12 },
  driverIncomingTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverIncomingIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverIncomingCopy: { flex: 1 },
  driverOrderTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  driverOrderTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'left' },
  driverRestaurantName: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 7, textAlign: 'left' },
  driverRestaurantDetail: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  driverOrderRouteRow: { marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
  driverRouteIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverRouteCopy: { flex: 1 },
  driverRouteTitle: { color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'left' },
  driverRouteSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  driverOrderFooter: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverOrderTotal: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  driverReviewLink: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  driverActiveCard: { marginHorizontal: 20, padding: 14, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  driverActiveTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  driverActiveTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'left' },
  driverActiveSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  driverActiveFooter: { marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverMapLink: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  driverDeliveredCard: { marginHorizontal: 20, padding: 18, borderRadius: 18, backgroundColor: colors.paleGreen, flexDirection: 'row', alignItems: 'center', gap: 11 },
  driverDeliveredIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  driverDeliveredCopy: { flex: 1 },
  driverDeliveredTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  driverDeliveredSub: { color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'left' },
  driverEmptyCard: { marginHorizontal: 20, padding: 28, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  driverEmptyIcon: { width: 57, height: 57, borderRadius: 19, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  driverEmptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  driverEmptySub: { color: colors.mutedForeground, fontSize: 10, marginTop: 5, textAlign: 'center' },
  driverMapPanel: { height: 190, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.paleGreen, position: 'relative' },
  driverMapPanelExpanded: { height: 282 },
  driverMapRoadA: { position: 'absolute', width: 430, height: 17, backgroundColor: '#fff', top: 76, left: -50, transform: [{ rotate: '17deg' }] },
  driverMapRoadB: { position: 'absolute', width: 350, height: 12, backgroundColor: '#fff', top: 131, left: 19, transform: [{ rotate: '-26deg' }] },
  driverMapRoadC: { position: 'absolute', width: 290, height: 9, backgroundColor: colors.border, top: 37, left: 62, transform: [{ rotate: '-35deg' }] },
  driverMapRoadD: { position: 'absolute', width: 170, height: 8, backgroundColor: '#fff', top: 17, right: -18, transform: [{ rotate: '57deg' }] },
  driverMapAreaLabel: { position: 'absolute', top: 15, left: 15, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.8)' },
  driverMapAreaLabelText: { color: colors.mutedForeground, fontSize: 9, fontWeight: '800' },
  driverMapDriverMarker: { position: 'absolute', left: '25%', bottom: '23%', width: 37, height: 37, borderRadius: 14, backgroundColor: '#1E4254', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  driverMapClientMarker: { position: 'absolute', right: '19%', top: '25%', width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(201,20,44,0.18)', alignItems: 'center', justifyContent: 'center' },
  driverMapClientMarkerInner: { width: 31, height: 31, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  driverMapClientLabel: { position: 'absolute', right: 14, bottom: 13, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 5 },
  driverMapClientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  driverMapClientLabelText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  driverMapDistance: { position: 'absolute', left: 14, bottom: 13, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 4 },
  driverMapDistanceText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  driverOrderHero: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverOrderHeroIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverOrderHeroCopy: { flex: 1 },
  driverOrderHeroTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  driverOrderHeroSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  driverDetailCard: { marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverDetailCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  driverOrderId: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  driverDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverDetailIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverDetailCopy: { flex: 1 },
  driverDetailLabel: { color: colors.mutedForeground, fontSize: 9, textAlign: 'left' },
  driverDetailValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 3, textAlign: 'left' },
  driverDetailSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  driverSmallAction: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverDetailDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  driverSummaryText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'left' },
  driverInfoStrip: { marginTop: 12, padding: 9, borderRadius: 10, backgroundColor: colors.muted, flexDirection: 'row', alignItems: 'center', gap: 6 },
  driverInfoStripText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  driverMapSectionTitle: { marginHorizontal: 20, color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'left', marginTop: 8, marginBottom: 9 },
  driverDecisionRow: { marginHorizontal: 20, marginTop: 16, flexDirection: 'row', gap: 9 },
  driverPrimaryButtonWrap: { marginHorizontal: 20, marginTop: 16 },
  driverDeclineButton: { flex: 0.8, minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  driverDeclineText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  driverAcceptButton: { flex: 1.2, minHeight: 54, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  driverAcceptText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  driverSuccessBanner: { marginHorizontal: 20, minHeight: 52, borderRadius: 14, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  driverSuccessText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  driverMapTopCard: { marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  driverMapFullscreen: { flex: 1, backgroundColor: colors.paleGreen },
  driverMapFloatingTop: { position: 'absolute', left: 16, right: 16, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  driverMapBackButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#18303D', shadowOpacity: 0.14, shadowRadius: 8, elevation: 3 },
  driverMapDestinationCard: { flex: 1, padding: 13, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#18303D', shadowOpacity: 0.14, shadowRadius: 10, elevation: 3 },
  driverMapDestinationHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  driverMapDestinationIcon: { width: 26, height: 26, borderRadius: 9, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverMapBottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 9, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff', shadowColor: '#18303D', shadowOpacity: 0.18, shadowRadius: 14, elevation: 8 },
  driverMapSheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 4, backgroundColor: colors.border, marginBottom: 12 },
  driverMapSheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  driverMapSheetTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  driverMapSheetSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  driverPrepCountdown: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 6, textAlign: 'left' },
  driverMapSheetActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginTop: 14 },
  driverMapPrimaryAction: { flex: 1 },
  driverMapSecondaryAction: { minWidth: 82, height: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  driverMapSecondaryText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverMapTopTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 4, textAlign: 'left' },
  driverMapTopSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  driverMapCoordinateHint: { color: colors.primary, fontSize: 8, fontWeight: '700', marginTop: 5, textAlign: 'left', writingDirection: 'ltr' },
  driverOpenMapsButton: { marginHorizontal: 20, marginTop: 10, minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  driverOpenMapsText: { color: colors.primary, fontSize: 11, fontWeight: '800', flex: 1, textAlign: 'center' },
  driverLocationSummary: { marginHorizontal: 20, marginTop: 12, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: 11 },
  driverLocationItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  driverLocationDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  driverLocationDotDriver: { backgroundColor: colors.ink, shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  driverLocationDotClient: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  driverLocationCopy: { flex: 1 },
  driverLocationTitle: { color: colors.ink, fontSize: 10, fontWeight: '800', textAlign: 'left' },
  driverLocationCoordinates: { color: colors.mutedForeground, fontSize: 9, marginTop: 2, textAlign: 'left' },
  driverLocationDivider: { height: 1, backgroundColor: colors.border, marginLeft: 19 },
  driverLocationEta: { paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  driverLocationEtaText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverArrivalBanner: { marginHorizontal: 20, marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  driverArrivalText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  driverProgressCard: { marginHorizontal: 20, marginTop: 18, marginBottom: 17, padding: 15, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverProgressStep: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  driverProgressDot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  driverProgressDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  driverProgressCopy: { flex: 1 },
  driverProgressTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  driverProgressMuted: { color: colors.mutedForeground },
  driverProgressSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  driverProgressLine: { width: 1.5, height: 24, backgroundColor: colors.border, marginLeft: 11, marginTop: -4, marginBottom: -4 },
  homeTop: { paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 18 },
  homeGreeting: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1 },
  greetingCopy: { alignItems: 'center' },
  clientAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.coral, position: 'absolute', right: 0 },
  helloText: { color: colors.ink, fontSize: 20, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  wave: { color: colors.accent },
  locationLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 5 },
  locationText: { color: colors.mutedForeground, fontSize: 11, writingDirection: 'rtl' },
  homeSearch: { minHeight: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginHorizontal: 20, marginBottom: 17, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, shadowColor: colors.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  homeSearchText: { flex: 1, color: colors.mutedForeground, fontSize: 12, textAlign: 'left' },
  searchBox: { height: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginHorizontal: 20, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginBottom: 17, overflow: 'hidden' },
  searchBoxIcon: { flexShrink: 0 },
  searchInput: { flex: 1, minWidth: 0, flexShrink: 1, height: 46, color: colors.ink, fontSize: 13, writingDirection: 'rtl' },
  searchClearButton: { width: 28, height: 30, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  promoCard: { height: 155, borderRadius: 20, overflow: 'hidden', marginHorizontal: 20, backgroundColor: colors.primary, position: 'relative', marginBottom: 24 },
  promoImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(104, 4, 18, 0.72)' },
  promoCopy: { position: 'absolute', left: 18, top: 19, width: '90%' },
  promoEyebrow: { color: '#FFCE78', fontSize: 11, fontWeight: '600', marginBottom: 5, textAlign: 'left' },
  promoTitle: { color: '#fff', fontSize: 25, fontWeight: '800', textAlign: 'left' },
  promoTitleSmall: { fontSize: 14, fontWeight: '600', textAlign: 'left' },
  promoCode: { color: '#fff', fontSize: 10, letterSpacing: 2, marginTop: 9, opacity: 0.84, textAlign: 'left' },
  promoArrow: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 17 },
  promoArrowEnglish: { left: 17 },
  promoArrowArabic: { right: 17 },
  sectionTitleRow: { paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  sectionAction: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  homeChoicesSubtitle: { marginHorizontal: 20, marginTop: -6, marginBottom: 12, color: colors.mutedForeground, fontSize: 10, textAlign: 'left' },
  horizontalList: { paddingHorizontal: 20, gap: 11, marginBottom: 25 },
  homeCategoryCard: { width: 104, alignItems: 'center', paddingVertical: 3 },
  categoryCard: { width: 82, alignItems: 'center' },
  categoryIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  categorySub: { color: colors.mutedForeground, fontSize: 9, marginTop: 2 },
  restaurantCard: { width: 214, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  restaurantImage: { width: '100%', height: 118 },
  restaurantTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  restaurantTagText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  restaurantMeta: { padding: 11, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  restaurantName: { color: colors.ink, fontSize: 14, fontWeight: '700', textAlign: 'left' },
  restaurantType: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  productGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 11, paddingHorizontal: 20, marginBottom: 12 },
  productCard: { width: '47.8%', backgroundColor: '#fff', borderRadius: 17, padding: 9, borderWidth: 1, borderColor: colors.border },
  productImageWrap: { height: 125, borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 9 },
  productImage: { width: '100%', height: '100%' },
  addCircle: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 7, right: 7 },
  productTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  productSubtitle: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  productBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 },
  price: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  miniRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniRatingText: { color: colors.mutedForeground, fontSize: 10 },
  bottomTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, elevation: 8, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row-reverse', justifyContent: 'space-around', paddingTop: 10 },
  tabButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, width: 56, position: 'relative', borderRadius: 14 },
  tabButtonActive: { backgroundColor: colors.coral },
  tabCartBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, position: 'absolute', top: -3, right: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  floatingCart: { width: 47, height: 47, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -24, left: 20, shadowColor: colors.shadow, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  cartBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, position: 'absolute', top: -2, right: -2, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: colors.accentForeground, fontSize: 9, fontWeight: '800' },
  pageTop: { paddingHorizontal: 20, marginBottom: 19, alignItems: 'center' },
  pageTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  pageSubtitle: { color: colors.mutedForeground, fontSize: 13, marginTop: 5, textAlign: 'center' },
  categoryIntroCard: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIntroIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  categoryIntroCopy: { flex: 1 },
  categoryIntroTitle: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'left' },
  categoryIntroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 9, marginTop: 4, textAlign: 'left' },
  categoryIntroCount: { minWidth: 42, alignItems: 'center' },
  categoryIntroCountValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  categoryIntroCountLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 8, marginTop: 1 },
  categoryGrid: { paddingHorizontal: 20, flexDirection: 'column', gap: 10, marginBottom: 5 },
  largeCategory: { width: '100%', minHeight: 84, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  largeCategoryActive: { borderColor: colors.primary, backgroundColor: colors.coral },
  largeCategoryIcon: { width: 51, height: 51, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  largeCategoryCopy: { flex: 1 },
  largeCategoryTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  largeCategoryTitleActive: { color: colors.primary },
  largeCategorySub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  filterButton: { width: 30, height: 30, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  filterButtonActive: { backgroundColor: colors.coral },
  categoryFilter: { alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row-reverse', gap: 5, paddingHorizontal: 14, paddingVertical: 8 },
  categoryFilterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryFilterText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  categoryFilterTextActive: { color: '#fff' },
  categoryFilterModalRoot: { flex: 1, justifyContent: 'flex-end' },
  categoryFilterBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24, 11, 19, 0.42)' },
  categoryFilterSheet: { maxHeight: '84%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 22 },
  categoryFilterSheetHandle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', backgroundColor: colors.border, marginBottom: 17 },
  categoryFilterSheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  categoryFilterSheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'left' },
  categoryFilterSheetSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4, textAlign: 'left' },
  categoryFilterSheetClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.muted },
  categoryFilterSheetContent: { paddingBottom: 3 },
  categoryFilterCurrent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: colors.coral, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 18 },
  categoryFilterCurrentText: { flex: 1, color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'left' },
  categoryFilterModalSectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left', marginBottom: 9 },
  categorySortList: { gap: 8, marginBottom: 19 },
  categorySortOption: { minHeight: 47, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 13, backgroundColor: '#fff' },
  categorySortOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categorySortOptionText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'left' },
  categorySortOptionTextActive: { color: '#fff' },
  categoryFilterModalList: { gap: 8, paddingBottom: 4 },
  categoryResultHeader: { paddingHorizontal: 20, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 11 },
  categoryResultSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 2, textAlign: 'left' },
  deliveryHint: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, flexDirection: 'row-reverse', gap: 4, paddingHorizontal: 9, paddingVertical: 7 },
  deliveryHintText: { color: colors.accentForeground, fontSize: 10, fontWeight: '700' },
  loadMoreButton: { alignItems: 'center', alignSelf: 'center', borderColor: colors.primary, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 5, marginBottom: 8, paddingHorizontal: 18, paddingVertical: 9 },
  loadMoreText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  categoryEmpty: { alignItems: 'center', marginHorizontal: 20, marginTop: 10, paddingHorizontal: 18, paddingVertical: 28, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  emptyReset: { backgroundColor: colors.primary, borderRadius: 12, marginTop: 16, paddingHorizontal: 15, paddingVertical: 9 },
  emptyResetText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  restaurantHero: { height: 306, position: 'relative', backgroundColor: colors.primary },
  restaurantHeroImage: { width: '100%', height: '100%' },
  restaurantHeroGradient: { ...StyleSheet.absoluteFillObject },
  restaurantHeroKicker: { alignSelf: 'flex-start', minHeight: 28, borderRadius: 9, paddingHorizontal: 9, backgroundColor: 'rgba(255,255,255,0.92)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6 },
  openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  restaurantHeroKickerText: { color: colors.green, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  heroBack: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 16, left: 18, shadowColor: colors.shadow, shadowOpacity: 0.14, shadowRadius: 8, elevation: 3 },
  heroHeart: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 16, right: 18, shadowColor: colors.shadow, shadowOpacity: 0.14, shadowRadius: 8, elevation: 3 },
  heroHeartActive: { backgroundColor: colors.coral },
  heroRestaurantInfo: { position: 'absolute', bottom: 18, left: 18, right: 18, borderRadius: 20, padding: 13, backgroundColor: 'rgba(255,255,255,0.97)', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  avatarSquare: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.primaryForeground, fontWeight: '800', fontSize: 20 },
  heroRestaurantCopy: { flex: 1 },
  heroTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'left' },
  heroSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  heroRating: { alignItems: 'center', justifyContent: 'center', minWidth: 52, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: colors.border },
  heroRatingText: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 2 },
  heroRatingReviews: { color: colors.mutedForeground, fontSize: 8, marginTop: 1 },
  restaurantContent: { backgroundColor: colors.cream },
  restaurantTrustRow: { marginHorizontal: 18, marginTop: 14, marginBottom: 4, minHeight: 72, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 7 },
  restaurantTrustItem: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 6 },
  restaurantTrustIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  restaurantTrustValue: { color: colors.ink, fontSize: 9, fontWeight: '800', textAlign: 'left' },
  restaurantTrustLabel: { color: colors.mutedForeground, fontSize: 8, marginTop: 2, textAlign: 'left' },
  restaurantTrustDivider: { width: 1, height: 31, backgroundColor: colors.border },
  restaurantTabs: { marginHorizontal: 18, marginTop: 14, marginBottom: 2, minHeight: 60, borderRadius: 17, backgroundColor: '#F1ECE8', borderWidth: 1, borderColor: colors.border },
  restaurantTabsContent: { padding: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  restaurantTab: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2 },
  restaurantTabActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.coral, shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  restaurantTabIcon: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  restaurantTabIconActive: { backgroundColor: colors.coral },
  restaurantTabText: { color: colors.mutedForeground, fontSize: 10, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  restaurantTabTextActive: { color: colors.primary, fontWeight: '800' },
  menuSection: { paddingHorizontal: 18, paddingTop: 22, backgroundColor: colors.cream },
  menuSectionHeading: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  menuSectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'left' },
  menuSectionSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  menuSectionMark: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  menuList: { paddingTop: 4 },
  menuItem: { minHeight: 104, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 13, flexDirection: 'row-reverse', gap: 11, alignItems: 'center' },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemMain: { flex: 1, flexDirection: 'row-reverse', gap: 11, alignItems: 'center', minHeight: 78 },
  menuImage: { width: 82, height: 78, borderRadius: 16, backgroundColor: colors.muted },
  menuCopy: { flex: 1, minHeight: 72, justifyContent: 'center' },
  menuTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'left' },
  menuSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  menuMeta: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  menuPrice: { color: colors.primary, fontSize: 12, fontWeight: '800', textAlign: 'left' },
  menuItemRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  menuItemRatingText: { color: colors.mutedForeground, fontSize: 9 },
  menuAdd: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3 },
  menuAddPressed: { backgroundColor: colors.secondaryForeground, transform: [{ scale: 0.94 }] },
  cartBar: { position: 'absolute', left: 18, right: 18, minHeight: 60, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, gap: 10, shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 12, elevation: 7 },
  cartBarIcon: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 42 },
  cartBarCount: { color: colors.primaryForeground, fontSize: 12, fontWeight: '800' },
  cartBarText: { color: colors.primaryForeground, fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'right' },
  cartBarTotal: { color: colors.primaryForeground, fontSize: 13, fontWeight: '800' },
  productScroll: { backgroundColor: colors.cream },
  productHero: { height: 382, position: 'relative', backgroundColor: colors.coral, overflow: 'hidden' },
  productHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  productHeroShade: { ...StyleSheet.absoluteFillObject },
  productHeroControls: { ...StyleSheet.absoluteFillObject, position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18 },
  productHeroBack: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  productHeroHeart: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  productHeroHeartActive: { backgroundColor: colors.coral },
  heroControlPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
  heroImageFooter: { position: 'absolute', left: 19, right: 19, bottom: 19, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  heroFreshTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card, marginBottom: 16 },
  heroFreshText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  heroImageHint: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700' },
  productDetail: { marginTop: -24, paddingHorizontal: 20, paddingTop: 23, paddingBottom: 8, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.cream, position: 'relative' },
  detailTitleRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  detailTitleCopy: { flex: 1, minWidth: 0 },
  detailTitle: { color: colors.ink, fontSize: 24, lineHeight: 32, fontWeight: '800', textAlign: 'left' },
  detailSubtitle: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, marginTop: 4, textAlign: 'left' },
  detailPriceBlock: { minWidth: 78, alignItems: 'flex-start', paddingTop: 2 },
  detailPrice: { color: colors.primary, fontSize: 18, fontWeight: '800', textAlign: 'left' },
  detailPriceCaption: { color: colors.mutedForeground, fontSize: 9, marginTop: 3 },
  detailRating: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 14 },
  ratingPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.coral },
  detailRatingText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  detailDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border },
  detailMuted: { color: colors.mutedForeground, fontSize: 10 },
  productTrustRow: { minHeight: 68, marginTop: 20, paddingHorizontal: 7, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around' },
  productTrustItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  productTrustIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral },
  productTrustText: { color: colors.ink, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  productTrustDivider: { width: 1, height: 28, backgroundColor: colors.border },
  descriptionCard: { marginTop: 19, padding: 15, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  descriptionHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  descriptionMark: { width: 5, height: 20, borderRadius: 3, backgroundColor: colors.accent },
  detailSection: { color: colors.ink, fontWeight: '800', fontSize: 16, textAlign: 'left', marginBottom: 8 },
  detailDescription: { color: colors.mutedForeground, fontSize: 12, lineHeight: 21, textAlign: 'left' },
  quantityCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 17, paddingVertical: 15, paddingHorizontal: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  quantityLabel: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'left' },
  quantityHint: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  quantityButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { backgroundColor: colors.muted, opacity: 0.65 },
  quantityButtonPressed: { backgroundColor: colors.coral, transform: [{ scale: 0.93 }] },
  quantityValue: { minWidth: 20, fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  stickyCta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 10, paddingHorizontal: 18, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.border },
  productCta: { minHeight: 58, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 13, gap: 10, shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 12, elevation: 7 },
  productCtaPressed: { backgroundColor: colors.secondaryForeground, transform: [{ scale: 0.985 }] },
  productCtaIcon: { minWidth: 39, height: 36, borderRadius: 12, backgroundColor: colors.primaryForeground, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  productCtaQuantity: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  productCtaLabel: { color: colors.primaryForeground, fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'left' },
  productCtaPrice: { color: colors.primaryForeground, fontSize: 12, fontWeight: '800' },
  header: { minHeight: 78, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream },
  headerStatic: { paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  headerSubtitle: { color: colors.mutedForeground, fontSize: 13, marginTop: 3, textAlign: 'center' },
  headerIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 40, height: 40 },
  headerContentGap: { marginTop: 16 },
  cartRestaurant: { marginHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  smallAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cartRestaurantTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  cartRestaurantSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'left' },
  cartItems: { paddingHorizontal: 20, marginTop: 10 },
  cartItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  cartImage: { width: 65, height: 59, borderRadius: 13 },
  cartCopy: { flex: 1 },
  cartTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  cartSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  cartPrice: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 6, textAlign: 'left' },
  cartItemActions: { alignItems: 'center', gap: 6 },
  miniQty: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  miniQtyValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  promoInput: { height: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginHorizontal: 20, marginTop: 16, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  promoTextInput: { flex: 1, color: colors.ink, fontSize: 12 },
  applyText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  summary: { marginHorizontal: 20, marginTop: 18, backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 11 },
  summaryMuted: { color: colors.mutedForeground, fontSize: 12 },
  summaryValue: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
  summaryTotalLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  summaryTotal: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 120 },
  emptyIcon: { width: 83, height: 83, borderRadius: 28, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  emptySub: { color: colors.mutedForeground, fontSize: 13, marginTop: 7, marginBottom: 25 },
  checkoutHeader: { minHeight: 78, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  stepText: { color: colors.primary, fontSize: 12, fontWeight: '800', width: 40 },
  stepsLine: { paddingHorizontal: 20, flexDirection: 'row-reverse', gap: 6, marginBottom: 24 },
  stepPill: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepPillActive: { backgroundColor: colors.primary },
  checkoutBody: { paddingHorizontal: 20 },
  checkoutLabel: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'left', marginBottom: 11, marginTop: 12 },
  selectedAddress: { borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 15 },
  addressTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  addressText: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  addAddressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 18 },
  addAddressText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  deliveryNote: { backgroundColor: colors.muted, borderRadius: 13, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 13 },
  deliveryNoteText: { color: colors.mutedForeground, fontSize: 11, flex: 1, textAlign: 'left' },
  paymentOption: { minHeight: 75, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 12, marginBottom: 10 },
  paymentOptionActive: { borderColor: colors.primary, borderWidth: 1.5 },
  paymentDetailsCard: { marginTop: 6, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  paymentDetailsTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  paymentDetailsHint: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  paymentDetailsInput: { minHeight: 46, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cream, color: colors.ink, paddingHorizontal: 12, fontSize: 12 },
  paymentSaveButton: { minHeight: 44, marginTop: 10, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  paymentSaveButtonDisabled: { opacity: 0.45 },
  paymentSaveButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  paymentSaveMessage: { color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 9, textAlign: 'center' },
  paymentIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  paymentSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'left' },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: colors.border, marginBottom: 17 },
  reviewItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8 },
  reviewImage: { width: 52, height: 47, borderRadius: 11 },
  reviewTitle: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'left' },
  reviewSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  reviewPrice: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  infoCard: { minHeight: 53, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  infoCardText: { color: colors.ink, fontSize: 11, flex: 1, textAlign: 'right' },
  paymentVerifyIntro: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  paymentVerifyIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  paymentVerifyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  paymentVerifySub: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, marginTop: 6, textAlign: 'center' },
  transactionInput: { minHeight: 64, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff', color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: 10, paddingHorizontal: 16 },
  transactionHint: { color: colors.mutedForeground, fontSize: 10, marginTop: 7, textAlign: 'center' },
  paymentAccountsCard: { marginTop: 16, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  paymentAccountsHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 7, marginBottom: 11 },
  paymentAccountsTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'left' },
  paymentAccountRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  paymentAccountIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  paymentAccountCopy: { flex: 1 },
  paymentAccountProvider: { color: colors.primary, fontSize: 11, fontWeight: '800', textAlign: 'left' },
  paymentAccountName: { color: colors.ink, fontSize: 10, marginTop: 3, textAlign: 'left' },
  paymentAccountNumber: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'left', writingDirection: 'ltr' },
  paymentAccountDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  paymentVerifyNote: { backgroundColor: colors.muted, borderRadius: 13, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 17 },
  paymentVerifyNoteText: { color: colors.mutedForeground, fontSize: 10, flex: 1, textAlign: 'left' },
  paymentSubmitError: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  paymentStateCard: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 30, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  paymentStateIconPending: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  paymentStateIconPaid: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  paymentStateTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  paymentStateSub: { color: colors.mutedForeground, fontSize: 11, lineHeight: 18, marginTop: 7, textAlign: 'center' },
  paymentReference: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.muted, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  paymentReferenceLabel: { color: colors.mutedForeground, fontSize: 10 },
  paymentReferenceValue: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  trackTop: { paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 },
  trackStatus: { alignItems: 'center', marginBottom: 20 },
  trackCheck: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  trackCheckDelivered: { backgroundColor: colors.primary },
  trackStatusTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  trackStatusSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 5 },
  mapCard: { height: 188, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E9EEE8', position: 'relative', marginBottom: 22 },
  mapRoadOne: { position: 'absolute', width: 390, height: 15, backgroundColor: '#fff', top: 74, left: -42, transform: [{ rotate: '17deg' }] },
  mapRoadTwo: { position: 'absolute', width: 330, height: 11, backgroundColor: '#fff', top: 121, left: 24, transform: [{ rotate: '-27deg' }] },
  mapRoadThree: { position: 'absolute', width: 260, height: 8, backgroundColor: '#D4DDD1', top: 38, left: 65, transform: [{ rotate: '-35deg' }] },
  mapPinStart: { position: 'absolute', left: 33, bottom: 26, width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mapPinEnd: { position: 'absolute', right: 46, top: 30, width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  mapLabel: { position: 'absolute', right: 14, bottom: 14, color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  progressTrack: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'column', gap: 6 },
  progressStep: { minHeight: 51, flexDirection: 'row', alignItems: 'flex-start', gap: 11, position: 'relative' },
  progressDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', zIndex: 2 },
  progressDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  progressTitle: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600', textAlign: 'left', writingDirection: 'rtl', flexDirection: 'row' },
  progressTitleDone: { color: colors.ink, fontWeight: '800' },
  progressSub: { display: 'none', color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right', writingDirection: 'rtl' },
  progressLine: { position: 'absolute', width: 1.5, height: 30, backgroundColor: colors.border, top: 22, right: undefined, left: 10 },
  progressLineDone: { backgroundColor: colors.green },
  courierCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  courierAvatar: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#1E4254', alignItems: 'center', justifyContent: 'center' },
  courierName: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  courierSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'left' },
  callButton: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  trackOrderCard: { marginHorizontal: 20, marginTop: 14, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  trackOrderCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  trackOrderCardTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  trackOrderNumber: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  trackOrderRestaurant: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 11, textAlign: 'left' },
  trackOrderItems: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  trackOrderTotal: { color: colors.primary, fontSize: 14, fontWeight: '800', marginTop: 8, textAlign: 'left' },
  activeOrderBanner: { marginHorizontal: 20, marginBottom: 17, borderRadius: 18, backgroundColor: colors.primary, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  activeOrderIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  activeOrderCopy: { flex: 1 },
  activeOrderTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  activeOrderTitle: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'left' },
  livePill: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 7, flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8FF0A7' },
  livePillText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  activeOrderSub: { color: 'rgba(255,255,255,0.76)', fontSize: 10, marginTop: 5, textAlign: 'left' },
  orderFilters: { marginHorizontal: 20, backgroundColor: colors.muted, borderRadius: 13, padding: 4, flexDirection: 'row-reverse', marginBottom: 20, gap: 3 },
  orderFilterButton: { flex: 1, minHeight: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 5 },
  orderFilterButtonActive: { backgroundColor: '#fff' },
  orderFilterText: { color: colors.mutedForeground, fontSize: 12 },
  orderFilterTextActive: { color: colors.primary, fontWeight: '800' },
  orderFilterCount: { minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  orderFilterCountActive: { backgroundColor: colors.coral },
  orderFilterCountText: { color: colors.mutedForeground, fontSize: 9, fontWeight: '700' },
  orderFilterCountTextActive: { color: colors.primary },
  ordersSectionHeader: { paddingHorizontal: 20, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderCountHint: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  orderCountHintText: { color: colors.mutedForeground, fontSize: 10 },
  orderCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  orderCardActive: { borderColor: colors.primary },
  orderCardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderIdentity: { alignItems: 'flex-end' },
  orderNumber: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  orderDate: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  orderStatus: { backgroundColor: colors.paleGreen, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row-reverse', gap: 4, alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  completedStatus: { backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  completedStatusText: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  orderProducts: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 16, minHeight: 47 },
  orderThumb: { width: 47, height: 47, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
  orderMore: { width: 47, height: 47, borderRadius: 12, backgroundColor: colors.coral, borderWidth: 2, borderColor: '#fff', marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  orderMoreText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  orderTotal: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  orderDivider: { height: 1, backgroundColor: colors.border, marginVertical: 13 },
  orderCardBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  orderRestaurant: { color: colors.ink, fontSize: 10, fontWeight: '700', textAlign: 'left' },
  orderSummary: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  orderAction: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingVertical: 5, paddingLeft: 3 },
  reorderText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  orderDetails: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 13, paddingTop: 12 },
  orderDetailsTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'left', marginBottom: 7 },
  orderDetailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  orderDetailName: { color: colors.mutedForeground, fontSize: 10, textAlign: 'left' },
  orderDetailPrice: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  orderDetailMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 7 },
  orderDetailMetaText: { color: colors.green, fontSize: 10, fontWeight: '600' },
  orderDetailInfo: { color: colors.mutedForeground, fontSize: 10, marginTop: 5, textAlign: 'left' },
  ordersEmpty: { alignItems: 'center', marginHorizontal: 20, marginTop: 20, paddingHorizontal: 18, paddingVertical: 30, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  favoriteTabs: { flexDirection: 'row-reverse', marginHorizontal: 20, gap: 25, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 18 },
  favoriteTabButton: { paddingBottom: 11 },
  favoriteTabButtonActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  favoriteTabActive: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  favoriteTab: { color: colors.mutedForeground, fontSize: 13 },
  favoriteProductWrap: { width: '47.8%', position: 'relative' },
  favoriteProductCard: { width: '100%' },
  favoriteRemoveButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 8, left: 8, zIndex: 2 },
  favoriteRestaurantList: { marginHorizontal: 20, gap: 10 },
  favoriteRestaurantCard: { minHeight: 92, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, padding: 9, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  favoriteRestaurantMain: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  favoriteRestaurantImage: { width: 76, height: 70, borderRadius: 13 },
  favoriteRestaurantCopy: { flex: 1 },
  favoriteRestaurantName: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  favoriteRestaurantMeta: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'left' },
  favoriteRestaurantRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  favoriteEmpty: { alignItems: 'center', marginHorizontal: 20, marginTop: 20, paddingHorizontal: 18, paddingVertical: 30, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  orderStatusOverlay: { flex: 1, justifyContent: 'flex-end' },
  appDialogOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  appDialogBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,11,19,0.48)' },
  appDialogCard: { width: '100%', maxWidth: 390, borderRadius: 22, backgroundColor: colors.cream, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  appDialogIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  appDialogTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  appDialogMessage: { color: colors.mutedForeground, fontSize: 12, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  appDialogButton: { width: '100%', minHeight: 45, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  appDialogButtonText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '800' },
  orderStatusBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,11,19,0.5)' },
  orderStatusSheet: { maxHeight: '92%', backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  orderStatusHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 17 },
  orderStatusHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  orderStatusSuccessIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  orderStatusHeaderCopy: { flex: 1 },
  orderStatusTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'left' },
  orderStatusSubtitle: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  orderStatusClose: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  orderStatusPill: { marginTop: 17, minHeight: 38, borderRadius: 12, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  orderStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  orderStatusDotPaid: { backgroundColor: colors.green },
  orderStatusPillText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  orderStatusProgress: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'center', marginTop: 18 },
  orderStatusProgressItem: { width: 76, alignItems: 'center', gap: 6 },
  orderStatusProgressDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  orderStatusProgressCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  orderStatusProgressLine: { width: 34, height: 2, backgroundColor: colors.border, marginTop: 10 },
  orderStatusProgressLineDone: { backgroundColor: colors.green },
  orderStatusProgressText: { color: colors.mutedForeground, fontSize: 8, textAlign: 'center' },
  orderStatusDetails: { marginTop: 18, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: 12 },
  orderStatusDetailRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  orderStatusDetailCopy: { flex: 1 },
  orderStatusDetailLabel: { color: colors.mutedForeground, fontSize: 9, textAlign: 'left' },
  orderStatusDetailValue: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'left' },
  orderStatusTotal: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  orderStatusItems: { marginTop: 14, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  orderStatusItemsTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'left', marginBottom: 7 },
  orderStatusItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  orderStatusItemName: { color: colors.mutedForeground, fontSize: 10, textAlign: 'left' },
  orderStatusItemPrice: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  orderStatusActions: { flexDirection: 'row-reverse', gap: 9, marginTop: 16 },
  orderStatusSecondary: { flex: 0.75, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  orderStatusSecondaryText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  orderStatusPrimary: { flex: 1.25, minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  orderStatusPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  accountPageHeader: { marginHorizontal: 20, marginBottom: 24, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  accountPageCopy: { alignItems: 'center' },
  accountPageTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  accountPageSubtitle: { color: colors.mutedForeground, fontSize: 13, marginTop: 4, textAlign: 'center' },
  accountProfileCard: { marginHorizontal: 20, borderRadius: 22, padding: 16, marginBottom: 14, overflow: 'hidden' },
  accountProfileTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  accountAvatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#1E4254', alignItems: 'center', justifyContent: 'center' },
  accountVerified: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute', bottom: -2, right: -3, alignItems: 'center', justifyContent: 'center' },
  accountProfileCopy: { flex: 1 },
  accountNameLight: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'left' },
  accountPhoneLight: { color: 'rgba(255,255,255,0.74)', fontSize: 11, marginTop: 5, textAlign: 'left' },
  accountMemberPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 7, display: 'none' },
  accountMemberText: { color: '#FFDA82', fontSize: 9, fontWeight: '700', textAlign: 'left', display: 'none' },
  editButtonLight: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  profileEditPanel: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', gap: 8 },
  profileInput: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', paddingHorizontal: 12, fontSize: 12 },
  profileSaveButton: { minHeight: 39, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  profileSaveText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  accountStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  accountStat: { flex: 1, alignItems: 'center' },
  accountStatValue: { color: '#fff', fontSize: 17, fontWeight: '800' },
  accountStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 4 },
  accountStatDivider: { width: 1, height: 27, backgroundColor: 'rgba(255,255,255,0.22)' },
  loyaltyCard: { marginHorizontal: 20, padding: 14, borderRadius: 18, backgroundColor: '#FFF7E4', borderWidth: 1, borderColor: '#F5DEAA', marginBottom: 21 },
  loyaltyTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  loyaltyIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  loyaltyCopy: { flex: 1 },
  loyaltyEyebrow: { color: colors.accentForeground, fontSize: 10, fontWeight: '700', textAlign: 'left' },
  loyaltyTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 4, textAlign: 'left' },
  loyaltyPoints: { color: colors.accentForeground, fontSize: 16, fontWeight: '800' },
  loyaltyProgressTrack: { height: 7, borderRadius: 4, backgroundColor: '#F2DCA7', overflow: 'hidden', marginTop: 13 },
  loyaltyProgressFill: { width: '82%', height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  loyaltyBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  loyaltyHint: { color: colors.accentForeground, fontSize: 9, fontWeight: '600' },
  loyaltyGoal: { color: colors.mutedForeground, fontSize: 9, fontWeight: '700' },
  accountSectionHeader: { marginHorizontal: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  accountSectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'left' },
  accountSectionHint: { color: colors.mutedForeground, fontSize: 9 },
  accountQuickGrid: { marginHorizontal: 20, flexDirection: 'row', gap: 9, marginBottom: 21, justifyContent: 'center' },
  accountQuickCard: { flex: 1, minHeight: 105, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'center', justifyContent: 'center' },
  accountQuickIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  accountQuickTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  accountQuickSub: { color: colors.mutedForeground, fontSize: 8, marginTop: 4, textAlign: 'center' },
  accountHeader: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 15 },
  accountName: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'left' },
  accountPhone: { color: colors.mutedForeground, fontSize: 11, marginTop: 5, textAlign: 'left' },
  editButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  accountList: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13 },
  accountRow: { minHeight: 70, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountRowLast: { borderBottomWidth: 0 },
  accountRowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  accountRowCopy: { flex: 1 },
  accountRowTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  accountRowSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'left' },
  accountToggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.input, padding: 3, justifyContent: 'center', alignItems: 'flex-start' },
  accountToggleOn: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  accountToggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  accountToggleKnobOn: { backgroundColor: '#fff' },
  logoutRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 10},
  logoutText: { flex: 1, color: colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'left', writingDirection: 'rtl' },
  settingsSection: { marginHorizontal: 20, marginTop: 18 },
  settingsLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700', textAlign: 'left', marginBottom: 8 },
  settingsGroup: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 2 },
  settingsRow: { minHeight: 68, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  settingsRowLast: { borderBottomWidth: 0 },
  releaseNumber: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700', writingDirection: 'ltr' },
  toggleOn: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.primary, padding: 3, justifyContent: 'center', alignItems: 'flex-end' },
  toggleOff: { backgroundColor: colors.input, alignItems: 'flex-start' },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  toggleKnobOff: { backgroundColor: '#fff' },
  notificationList: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13 },
  notificationRow: { minHeight: 90, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  notificationIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  notificationSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  notificationTime: { color: colors.mutedForeground, fontSize: 9, marginTop: 5, textAlign: 'left' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, alignSelf: 'flex-start', marginTop: 18 },
  supportContent: { paddingTop: 0 },
  supportHero: { marginHorizontal: 20, marginBottom: 14, minHeight: 103, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  supportAvatar: { width: 49, height: 49, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  supportHeroCopy: { flex: 1 },
  supportTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'left' },
  supportSub: { color: 'rgba(255,255,255,0.74)', fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'left' },
  supportOnline: { alignItems: 'center', gap: 4 },
  supportOnlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8FF0A7' },
  supportOnlineText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  supportResponseCard: { marginHorizontal: 20, marginBottom: 20, padding: 12, borderRadius: 15, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  supportResponseCopy: { flex: 1 },
  supportResponseTitle: { color: colors.ink, fontSize: 10, fontWeight: '800', textAlign: 'left' },
  supportResponseSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  supportConversationHeader: { marginHorizontal: 20, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  supportConversationTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  supportConversationStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  supportConversationStatusText: { color: colors.mutedForeground, fontSize: 9 },
  chatBubbleAgent: { alignSelf: 'flex-start', maxWidth: '78%', backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border, padding: 12, marginLeft: 20, marginBottom: 11 },
  chatBubbleUser: { alignSelf: 'flex-end', maxWidth: '72%', backgroundColor: colors.primary, borderRadius: 16, borderBottomRightRadius: 4, padding: 12, marginRight: 20, marginBottom: 20 },
  chatBubbleUserLatest: { marginBottom: 11 },
  chatText: { color: colors.ink, fontSize: 12, lineHeight: 19, textAlign: 'left' },
  chatTextWhite: { color: '#fff', fontSize: 12, lineHeight: 19, textAlign: 'left' },
  chatTime: { color: colors.mutedForeground, fontSize: 9, marginTop: 5, textAlign: 'left' },
  chatTimeWhite: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 5, textAlign: 'left' },
  supportQuick: { marginHorizontal: 20, marginTop: 8 },
  supportQuickHeader: { marginBottom: 10 },
  supportQuickLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  supportQuickSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  quickPillRow: { flexDirection: 'row', gap: 8 },
  quickPill: { flex: 1, minWidth: 0, minHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickPillIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  quickText: { color: colors.ink, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  chatInputBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 10 },
  chatComposer: { minHeight: 60, padding: 7, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  chatInput: { flex: 1, minWidth: 0, minHeight: 44, maxHeight: 92, height: 44, borderRadius: 0, backgroundColor: 'transparent', paddingHorizontal: 8, paddingVertical: 10, color: colors.ink, fontSize: 12, textAlignVertical: 'top' },
  sendButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  chatComposerHint: { color: colors.mutedForeground, fontSize: 8, textAlign: 'center', marginTop: 6, marginBottom: 1 },
  addressList: { marginHorizontal: 20 },
  savedAddress: { minHeight: 82, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, marginBottom: 10 },
  savedAddressActive: { borderColor: colors.primary },
  addressRadio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  addressRadioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  savedAddressTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  savedAddressText: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  savedAddressActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressEditOverlay: { flex: 1, backgroundColor: 'rgba(24,11,19,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
  addressEditCard: { backgroundColor: '#fff', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 10 },
  addressEditTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'left', marginBottom: 12 },
  addressEditInput: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cream, color: colors.ink, paddingHorizontal: 12, fontSize: 13, textAlign: 'left' },
  addressEditActions: { flexDirection: 'row-reverse', gap: 9, marginTop: 4 },
  addressEditCancel: { flex: 1, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  addressEditCancelText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '700' },
  addressEditSave: { flex: 1, minHeight: 45, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addressEditSaveText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  addressMapOpenButton: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  addressMapOpenText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  addressMapModal: { flex: 1, backgroundColor: colors.cream },
  addressMapHeader: { minHeight: 72, paddingHorizontal: 18, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff' },
  addressMapClose: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  addressMapHeaderCopy: { flex: 1, alignItems: 'flex-start' },
  addressMapTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'left' },
  addressMapSubtitle: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'left' },
  addressMapBody: { flex: 1, padding: 0 },
  addressMapFooter: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  addressMapNumberRow: { minHeight: 40, borderRadius: 11, backgroundColor: colors.cream, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addressMapNumber: { color: colors.ink, fontSize: 12, fontWeight: '700', writingDirection: 'ltr' },
  addressMapSave: { minHeight: 46, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  addressMapSaveText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  policyOverlay: { flex: 1, backgroundColor: 'rgba(24,11,19,0.48)', justifyContent: 'flex-end' },
  policySheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18 },
  policyHeader: { paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  policyClose: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  policyHeaderCopy: { flex: 1, alignItems: 'flex-start' },
  policyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'left' },
  policyUpdated: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'left' },
  policyContent: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 18 },
  policyLead: { color: colors.ink, fontSize: 12, lineHeight: 21, fontWeight: '700', textAlign: 'left', marginBottom: 14 },
  policyHeading: { color: colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'left', marginTop: 13, marginBottom: 5 },
  policyText: { color: '#000', fontSize: 11, lineHeight: 20, textAlign: 'left' },
  addressNewFloating: { position: 'absolute', left: 20, right: 20, bottom: 18, minHeight: 50, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, elevation: 5 },
  addressNewFloatingText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  paymentList: { marginHorizontal: 20 },
  savedPayment: { minHeight: 73, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 },
  savedPaymentActive: { borderColor: colors.primary, borderWidth: 1.5 },
  savedPaymentIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  savedPaymentTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  savedPaymentSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'left' },
  savedPaymentStatus: { alignItems: 'center', gap: 3 },
  savedPaymentDefault: { color: colors.primary, fontSize: 8, fontWeight: '800' },
});