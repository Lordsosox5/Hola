import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Image,
  ImageSourcePropType,
  I18nManager,
  KeyboardAvoidingView,
  Linking,
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
import colorTokens from '@/constants/colors';
import DriverMap from '../components/DriverMap';
import { pointAlongRoute, type Coordinate } from '../components/DriverMap.types';
import { HomeTab } from './client/tabs/HomeTab';
import { CategoriesTab } from './client/tabs/CategoriesTab';
import { OrdersTab } from './client/tabs/OrdersTab';
import { CartTab, CheckoutHeader, AddressScreen, PaymentScreen, ReviewScreen } from './client/tabs/CartTab';
import { AccountTab } from './client/tabs/AccountTab';
import {
  DriverAccountScreen,
  DriverDashboardScreen,
  DriverDeliveriesScreen,
  DriverEarningsScreen,
  DriverSettingsScreen,
  DriverSupportScreen,
} from './driver/DriverScreens';

const colors = colorTokens.light;
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
const IBMArabic = 'IBM Arabic';
const LanguageContext = createContext(false);
let activeEnglish = false;

const pizzaImage = require('../assets/images/pizza.jpg');
const burgerImage = require('../assets/images/burger.jpg');
const applesImage = require('../assets/images/apples.jpg');
const logoImage = require('../assets/images/tawsel-icon.png');

type Screen =
  | 'intro'
  | 'login'
  | 'register'
  | 'home'
  | 'categories'
  | 'restaurant'
  | 'product'
  | 'cart'
  | 'address'
  | 'payment'
  | 'review'
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
  | 'driverMap';

type Tab = 'home' | 'categories' | 'orders' | 'cart' | 'account';
type DriverTab = 'dashboard' | 'deliveries' | 'earnings' | 'account' | 'settings';
type DriverOrderStatus = 'pending' | 'accepted' | 'pickedUp' | 'delivered' | 'rejected';
type Product = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  image: ImageSourcePropType;
  rating: string;
  accent?: string;
  category?: string;
};
type CartItem = Product & { quantity: number };

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

const restaurants = [
  { name: 'بيتزا هت', type: 'Pizza Hut', eta: '20–30 min', rating: '4.5', image: pizzaImage, color: '#F97316' },
  { name: 'كودو', type: 'Kudu', eta: '25–35 min', rating: '4.4', image: burgerImage, color: '#DF8B35' },
  { name: 'ماكدونالدز', type: "McDonald's", eta: '20–30 min', rating: '4.3', image: burgerImage, color: '#F6D747' },
  { name: 'كنتاكي', type: 'KFC', eta: '25–35 min', rating: '4.2', image: burgerImage, color: '#F97316' },
];

const catalogSeeds: Array<{ title: string; subtitle: string; price: number; category: string }> = [
  { title: 'بيتزا مارجريتا', subtitle: 'Margherita Pizza', price: 25, category: 'مطاعم' },
  { title: 'برجر دجاج', subtitle: 'Crispy Chicken Burger', price: 22, category: 'مطاعم' },
  { title: 'تفاح أحمر', subtitle: 'Red Apples', price: 8.75, category: 'بقالة' },
  { title: 'بطاطس مقلية', subtitle: 'French Fries', price: 9.5, category: 'مطاعم' },
  { title: 'بيتزا بيبروني', subtitle: 'Pepperoni Pizza', price: 29, category: 'مطاعم' },
  { title: 'بيتزا خضار', subtitle: 'Garden Veggie Pizza', price: 27, category: 'مطاعم' },
  { title: 'بيتزا دجاج باربكيو', subtitle: 'BBQ Chicken Pizza', price: 32, category: 'مطاعم' },
  { title: 'برجر كلاسيك', subtitle: 'Classic Beef Burger', price: 24, category: 'مطاعم' },
  { title: 'برجر مشروم', subtitle: 'Mushroom Swiss Burger', price: 28, category: 'مطاعم' },
  { title: 'برجر حار', subtitle: 'Spicy Beef Burger', price: 26, category: 'مطاعم' },
  { title: 'سندويتش دجاج', subtitle: 'Chicken Sandwich', price: 18, category: 'مطاعم' },
  { title: 'راب شاورما', subtitle: 'Chicken Shawarma Wrap', price: 16, category: 'مطاعم' },
  { title: 'شاورما لحم', subtitle: 'Beef Shawarma', price: 19, category: 'مطاعم' },
  { title: 'وجبة دجاج مقرمش', subtitle: 'Crunchy Chicken Meal', price: 31, category: 'مطاعم' },
  { title: 'أرز بالدجاج', subtitle: 'Chicken Rice Bowl', price: 23, category: 'مطاعم' },
  { title: 'نودلز بالخضار', subtitle: 'Vegetable Noodles', price: 21, category: 'مطاعم' },
  { title: 'مكرونة ألفريدو', subtitle: 'Chicken Alfredo Pasta', price: 30, category: 'مطاعم' },
  { title: 'سلطة سيزر', subtitle: 'Chicken Caesar Salad', price: 20, category: 'مطاعم' },
  { title: 'أجنحة حارة', subtitle: 'Hot Chicken Wings', price: 22, category: 'مطاعم' },
  { title: 'سمك مشوي', subtitle: 'Grilled Fish Plate', price: 38, category: 'مطاعم' },
  { title: 'كباب مشوي', subtitle: 'Grilled Kebab', price: 34, category: 'مطاعم' },
  { title: 'فلافل عربية', subtitle: 'Falafel Plate', price: 14, category: 'مطاعم' },
  { title: 'حمص باللحم', subtitle: 'Hummus with Beef', price: 18, category: 'مطاعم' },
  { title: 'شوربة عدس', subtitle: 'Lentil Soup', price: 12, category: 'مطاعم' },
  { title: 'حلومي مشوي', subtitle: 'Grilled Halloumi', price: 22, category: 'مطاعم' },
  { title: 'موز طازج', subtitle: 'Fresh Bananas', price: 6.5, category: 'بقالة' },
  { title: 'تفاح أخضر', subtitle: 'Green Apples', price: 9.25, category: 'بقالة' },
  { title: 'برتقال سكري', subtitle: 'Sweet Oranges', price: 7.75, category: 'بقالة' },
  { title: 'عنب أحمر', subtitle: 'Red Grapes', price: 12, category: 'بقالة' },
  { title: 'فراولة طازجة', subtitle: 'Fresh Strawberries', price: 14, category: 'بقالة' },
  { title: 'مانجو سوداني', subtitle: 'Sudanese Mangoes', price: 11, category: 'بقالة' },
  { title: 'بطيخ صغير', subtitle: 'Mini Watermelon', price: 15, category: 'بقالة' },
  { title: 'رمان', subtitle: 'Pomegranate', price: 13.5, category: 'بقالة' },
  { title: 'ليمون أصفر', subtitle: 'Fresh Lemons', price: 5.5, category: 'بقالة' },
  { title: 'خيار طازج', subtitle: 'Fresh Cucumbers', price: 4.5, category: 'بقالة' },
  { title: 'طماطم كرزية', subtitle: 'Cherry Tomatoes', price: 8.5, category: 'بقالة' },
  { title: 'طماطم حمراء', subtitle: 'Red Tomatoes', price: 5.75, category: 'بقالة' },
  { title: 'بطاطس محلية', subtitle: 'Local Potatoes', price: 7, category: 'بقالة' },
  { title: 'جزر عضوي', subtitle: 'Organic Carrots', price: 6.5, category: 'بقالة' },
  { title: 'بصل أبيض', subtitle: 'White Onions', price: 5, category: 'بقالة' },
  { title: 'فلفل ملون', subtitle: 'Bell Peppers', price: 10, category: 'بقالة' },
  { title: 'خس طازج', subtitle: 'Fresh Lettuce', price: 5.5, category: 'بقالة' },
  { title: 'سبانخ صغيرة', subtitle: 'Baby Spinach', price: 9, category: 'بقالة' },
  { title: 'ذرة حلوة', subtitle: 'Sweet Corn', price: 8.75, category: 'بقالة' },
  { title: 'ثوم طازج', subtitle: 'Fresh Garlic', price: 4.75, category: 'بقالة' },
  { title: 'بيض بلدي', subtitle: 'Farm Fresh Eggs', price: 16, category: 'بقالة' },
  { title: 'حليب كامل الدسم', subtitle: 'Whole Milk', price: 9, category: 'بقالة' },
  { title: 'زبادي طبيعي', subtitle: 'Natural Yogurt', price: 7.5, category: 'بقالة' },
  { title: 'جبن أبيض', subtitle: 'White Cheese', price: 18, category: 'بقالة' },
  { title: 'خبز عربي', subtitle: 'Arabic Bread', price: 4, category: 'بقالة' },
  { title: 'كرواسون زبدة', subtitle: 'Butter Croissant', price: 10, category: 'مخبوزات' },
  { title: 'دونات شوكولاتة', subtitle: 'Chocolate Donut', price: 8, category: 'مخبوزات' },
  { title: 'دونات سكر', subtitle: 'Sugar Donut', price: 7, category: 'مخبوزات' },
  { title: 'كيك شوكولاتة', subtitle: 'Chocolate Cake Slice', price: 16, category: 'مخبوزات' },
  { title: 'كيك فانيلا', subtitle: 'Vanilla Cake Slice', price: 15, category: 'مخبوزات' },
  { title: 'تشيز كيك', subtitle: 'Classic Cheesecake', price: 18, category: 'مخبوزات' },
  { title: 'براوني دافئ', subtitle: 'Warm Brownie', price: 13, category: 'مخبوزات' },
  { title: 'كوكيز شوكولاتة', subtitle: 'Chocolate Chip Cookie', price: 7.5, category: 'مخبوزات' },
  { title: 'كوكيز شوفان', subtitle: 'Oatmeal Cookie', price: 7.5, category: 'مخبوزات' },
  { title: 'مافن توت', subtitle: 'Blueberry Muffin', price: 9.5, category: 'مخبوزات' },
  { title: 'مافن شوكولاتة', subtitle: 'Chocolate Muffin', price: 9.5, category: 'مخبوزات' },
  { title: 'خبز بالجبن', subtitle: 'Cheese Bread', price: 11, category: 'مخبوزات' },
  { title: 'سينابون', subtitle: 'Cinnamon Roll', price: 12, category: 'مخبوزات' },
  { title: 'فطيرة تفاح', subtitle: 'Apple Pie', price: 15, category: 'مخبوزات' },
  { title: 'فطيرة زعتر', subtitle: 'Zaatar Pie', price: 10, category: 'مخبوزات' },
  { title: 'مناقيش جبن', subtitle: 'Cheese Manakish', price: 13, category: 'مخبوزات' },
  { title: 'مناقيش زعتر', subtitle: 'Zaatar Manakish', price: 11, category: 'مخبوزات' },
  { title: 'باغيت فرنسي', subtitle: 'French Baguette', price: 8, category: 'مخبوزات' },
  { title: 'توست حبوب كاملة', subtitle: 'Wholegrain Toast', price: 9, category: 'مخبوزات' },
  { title: 'بسكويت زبدة', subtitle: 'Butter Biscuits', price: 12, category: 'مخبوزات' },
  { title: 'تارت فواكه', subtitle: 'Fresh Fruit Tart', price: 19, category: 'مخبوزات' },
  { title: 'كعكة تمر', subtitle: 'Date Cake', price: 16, category: 'مخبوزات' },
  { title: 'عصير برتقال', subtitle: 'Fresh Orange Juice', price: 12, category: 'مشروبات' },
  { title: 'عصير مانجو', subtitle: 'Mango Juice', price: 13, category: 'مشروبات' },
  { title: 'ليمون بالنعناع', subtitle: 'Mint Lemonade', price: 11, category: 'مشروبات' },
  { title: 'شاي مثلج', subtitle: 'Iced Tea', price: 9, category: 'مشروبات' },
  { title: 'كولا باردة', subtitle: 'Chilled Cola', price: 7, category: 'مشروبات' },
  { title: 'مياه معدنية', subtitle: 'Mineral Water', price: 3, category: 'مشروبات' },
  { title: 'قهوة أمريكية', subtitle: 'Americano Coffee', price: 10, category: 'مشروبات' },
  { title: 'لاتيه', subtitle: 'Café Latte', price: 14, category: 'مشروبات' },
  { title: 'كابتشينو', subtitle: 'Cappuccino', price: 14, category: 'مشروبات' },
  { title: 'سبانش لاتيه', subtitle: 'Spanish Latte', price: 16, category: 'مشروبات' },
  { title: 'قهوة عربية', subtitle: 'Arabic Coffee', price: 12, category: 'مشروبات' },
  { title: 'شاي كرك', subtitle: 'Karak Tea', price: 8, category: 'مشروبات' },
  { title: 'شاي بالنعناع', subtitle: 'Mint Tea', price: 8, category: 'مشروبات' },
  { title: 'موهيتو فراولة', subtitle: 'Strawberry Mojito', price: 15, category: 'مشروبات' },
  { title: 'موهيتو توت', subtitle: 'Berry Mojito', price: 15, category: 'مشروبات' },
  { title: 'سموثي فراولة', subtitle: 'Strawberry Smoothie', price: 17, category: 'مشروبات' },
  { title: 'سموثي مانجو', subtitle: 'Mango Smoothie', price: 17, category: 'مشروبات' },
  { title: 'ميلك شيك فانيلا', subtitle: 'Vanilla Milkshake', price: 18, category: 'مشروبات' },
  { title: 'ميلك شيك شوكولاتة', subtitle: 'Chocolate Milkshake', price: 18, category: 'مشروبات' },
  { title: 'شوكولاتة ساخنة', subtitle: 'Hot Chocolate', price: 15, category: 'مشروبات' },
  { title: 'ماء جوز الهند', subtitle: 'Coconut Water', price: 13, category: 'مشروبات' },
  { title: 'مشروب طاقة', subtitle: 'Energy Drink', price: 11, category: 'مشروبات' },
  { title: 'شاي أخضر', subtitle: 'Green Tea', price: 9, category: 'مشروبات' },
  { title: 'كومبوتشا', subtitle: 'Ginger Kombucha', price: 18, category: 'مشروبات' },
  { title: 'عصير تفاح', subtitle: 'Apple Juice', price: 10, category: 'مشروبات' },
  { title: 'عصير أناناس', subtitle: 'Pineapple Juice', price: 12, category: 'مشروبات' },
  { title: 'عصير رمان', subtitle: 'Pomegranate Juice', price: 14, category: 'مشروبات' },
  { title: 'عصير جوافة', subtitle: 'Guava Juice', price: 12, category: 'مشروبات' },
];

const products: Product[] = catalogSeeds.map((item, index) => ({
  ...item,
  id: `item-${index + 1}`,
  image: [pizzaImage, burgerImage, applesImage][index % 3],
  rating: ['4.8', '4.7', '4.6', '4.5'][index % 4],
}));

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
  'توصيل': 'Tawsel',
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
  'مرحباً بك في توصيل': 'Welcome to Tawsel',
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
  'حول توصيل': 'About Tawsel',
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
  ...Object.fromEntries(catalogSeeds.map((item) => [item.title, item.subtitle])),
  ...Object.fromEntries(restaurants.map((restaurant) => [restaurant.name, restaurant.type])),
  'مطاعم': 'Restaurants',
  'بقالة': 'Grocery',
  'صيدلية': 'Pharmacy',
  'المزيد': 'More',
};

function translateText(value: string, english: boolean) {
  if (!english) return value;
  const trimmed = value.trim();
  const translated = englishText[trimmed];
  if (!translated) return value;
  return `${value.slice(0, value.indexOf(trimmed))}${translated}${value.slice(value.indexOf(trimmed) + trimmed.length)}`;
}

function localizeChildren(children: React.ReactNode, english: boolean): React.ReactNode {
  return React.Children.map(children, (child) => typeof child === 'string' ? translateText(child, english) : child);
}

function directionalStyle(style: unknown, english: boolean): any {
  const flattened = StyleSheet.flatten(style as never) as Record<string, any> | undefined;
  const next = { ...(flattened ?? {}) };

  next.fontFamily = 'IBM Arabic';
  if (next.fontWeight) {
    const normalized = String(next.fontWeight).toLowerCase();
    if (normalized === 'bold' || normalized === '700' || normalized === '800' || normalized === '900') next.fontFamily = 'IBM Arabic Bold';
    else if (normalized === '600' || normalized === 'semibold') next.fontFamily = 'IBM Arabic SemiBold';
    else if (normalized === '500' || normalized === 'medium') next.fontFamily = 'IBM Arabic Medium';
  }

  if (english) {
    next.direction = 'ltr';
    next.writingDirection = 'ltr';
    if (next.textAlign === 'right') next.textAlign = 'left';
    if (!('textAlign' in next)) next.textAlign = 'left';
    if (next.flexDirection === 'row-reverse') next.flexDirection = 'row';
  } else {
    next.direction = 'rtl';
    next.writingDirection = 'rtl';
    if (next.textAlign === 'left') next.textAlign = 'right';
    if (!('textAlign' in next)) next.textAlign = 'right';
    if (next.flexDirection === 'row') next.flexDirection = 'row-reverse';
  }

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
  return next;
}

const resolveIBMArabicFont = (weight?: string | number) => {
  const normalized = String(weight ?? '400').toLowerCase();
  if (normalized === 'bold' || normalized === '700' || normalized === '800' || normalized === '900') return 'IBM Arabic Bold';
  if (normalized === '600' || normalized === 'semibold') return 'IBM Arabic SemiBold';
  if (normalized === '500' || normalized === 'medium') return 'IBM Arabic Medium';
  return 'IBM Arabic';
};

const baseTextStyle = { fontFamily: IBMArabic };

const View = ({ style, ...props }: React.ComponentProps<typeof RNView>) => {
  const english = useContext(LanguageContext);
  return <RNView {...props} style={directionalStyle(style, english)} />;
};

const Pressable = ({ style, ...props }: React.ComponentProps<typeof RNPressable>) => {
  const english = useContext(LanguageContext);
  const directionalPressableStyle = typeof style === 'function'
    ? (state: Parameters<NonNullable<typeof style>>[0]) => directionalStyle(style(state), english)
    : directionalStyle(style, english);
  return <RNPressable {...props} style={directionalPressableStyle as React.ComponentProps<typeof RNPressable>['style']} />;
};

const Text = ({ style, children, ...props }: React.ComponentProps<typeof RNText>) => {
  const english = useContext(LanguageContext);
  const textStyle = directionalStyle([baseTextStyle, style], english);
  const flattened = StyleSheet.flatten(textStyle as never) as Record<string, any> | undefined;
  const resolvedDirection = english ? 'ltr' : 'rtl';
  const resolvedWritingDirection = english ? 'ltr' : 'rtl';
  const resolvedFontWeight = flattened?.fontWeight ?? '400';
  const resolvedTextAlign = flattened?.textAlign ?? (english ? 'left' : 'right');
  return <RNText {...props} style={[baseTextStyle, textStyle, { fontFamily: resolveIBMArabicFont(resolvedFontWeight), fontWeight: '400', direction: resolvedDirection, writingDirection: resolvedWritingDirection, textAlign: resolvedTextAlign } as any]}>{localizeChildren(children, english)}</RNText>;
};

const TextInput = ({ style, children, placeholder, textAlign, ...props }: React.ComponentProps<typeof RNTextInput>) => {
  const english = useContext(LanguageContext);
  const inputDirection = english ? 'ltr' : 'rtl';
  const webDirectionProps = Platform.OS === 'web'
    ? ({ dir: inputDirection } as unknown as React.ComponentProps<typeof RNTextInput>)
    : {};
  const flattened = StyleSheet.flatten([baseTextStyle, style] as never) as Record<string, any> | undefined;
  const resolvedFontWeight = flattened?.fontWeight ?? '400';
  const resolvedTextAlign = textAlign ?? (english ? 'left' : 'right');
  return <RNTextInput {...props} {...webDirectionProps} placeholder={placeholder ? translateText(placeholder, english) : placeholder} textAlign={resolvedTextAlign} style={[directionalStyle([baseTextStyle, style], english), { fontFamily: resolveIBMArabicFont(resolvedFontWeight), fontWeight: '400', direction: inputDirection, writingDirection: inputDirection, textAlign: resolvedTextAlign } as any]} />;
};

const NativeRNText = RNText as any;
const NativeRNTextInput = RNTextInput as any;

NativeRNText.defaultProps = { ...(NativeRNText.defaultProps ?? {}), style: [baseTextStyle, NativeRNText.defaultProps?.style] };
NativeRNTextInput.defaultProps = { ...(NativeRNTextInput.defaultProps ?? {}), style: [baseTextStyle, NativeRNTextInput.defaultProps?.style] };

function money(value: number, english = activeEnglish) {
  return `${value.toFixed(value % 1 ? 2 : 0)} ${english ? 'SAR' : 'ر.س'}`;
}

export default function TawselApp() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('intro');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurants[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isEnglish, setIsEnglish] = useState(false);
  I18nManager.allowRTL(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver'>('customer');
  const [driverTab, setDriverTab] = useState<DriverTab>('dashboard');
  const [driverOnline, setDriverOnline] = useState(true);
  const [driverNotifications, setDriverNotifications] = useState(true);
  const [driverSupportQuery, setDriverSupportQuery] = useState('');
  const [driverSupportMessage, setDriverSupportMessage] = useState('');
  const [driverSupportSent, setDriverSupportSent] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSentMessage, setSupportSentMessage] = useState('');
  const [expandedDriverFaq, setExpandedDriverFaq] = useState<number | null>(null);
  const [driverOrderStatus, setDriverOrderStatus] = useState<DriverOrderStatus>('pending');
  const [driverRouteProgress, setDriverRouteProgress] = useState(0);
  const [driverFollowMode, setDriverFollowMode] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [address, setAddress] = useState('شارع النيل، الخرطوم، السودان');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [focusCategorySearch, setFocusCategorySearch] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [sortOption, setSortOption] = useState('recommended');
  const [showAllCategoryProducts, setShowAllCategoryProducts] = useState(false);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'past'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [offerNotifications, setOfferNotifications] = useState(true);
  const [focusedAuthField, setFocusedAuthField] = useState<'name' | 'phone' | null>(null);
  const appDirection = 'ltr' as const;
  activeEnglish = isEnglish;

  useEffect(() => {
    I18nManager.forceRTL(!isEnglish);
  }, [isEnglish]);

  useEffect(() => {
    AsyncStorage.getItem('tawsel_cart').then((stored) => {
      if (stored) setCart(JSON.parse(stored) as CartItem[]);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('tawsel_cart', JSON.stringify(cart));
  }, [cart]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const isIntro = screen === 'intro';
  const showTabs = ['home', 'categories', 'orders', 'cart', 'account'].includes(screen);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = cart.length ? 15 : 0;
  const total = subtotal + delivery;
  const driverOrder = {
    id: 'TW-1048',
    restaurant: isEnglish ? 'Pizza Hut' : 'بيتزا هت',
    restaurantDetail: isEnglish ? 'University Street branch' : 'فرع شارع الجامعة',
    clientName: isEnglish ? 'Mohammed Ahmed' : 'محمد أحمد',
    clientPhone: '+249 912 345 678',
    clientAddress: isEnglish ? 'Nile Street, Khartoum' : 'شارع النيل، الخرطوم، السودان',
    distance: isEnglish ? '3.2 km away' : 'يبعد 3.2 كم',
    eta: isEnglish ? '12 min' : '12 دقيقة',
    total: 74,
    items: isEnglish ? '2 items · Large pepperoni pizza' : 'عنصران · بيتزا بيبروني كبيرة',
  };
  const isDriverNavigating = screen === 'driverMap'
    && (driverOrderStatus === 'accepted' || driverOrderStatus === 'pickedUp');

  useEffect(() => {
    if (!isDriverNavigating || driverRouteProgress >= 1) return;

    const durationMs = 28000;
    const startedAt = Date.now() - driverRouteProgress * durationMs;
    const timer = setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / durationMs);
      setDriverRouteProgress(nextProgress);
      if (nextProgress >= 1) clearInterval(timer);
    }, 120);

    return () => clearInterval(timer);
  }, [isDriverNavigating]);

  const driverCurrentCoordinate = pointAlongRoute(deliveryRoute, driverRouteProgress);
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
      track: 'review',
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
  const tap = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  const addToCart = (item: Product) => {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id);
      return existing
        ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem)
        : [...current, { ...item, quantity: 1 }];
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
    go('product');
  };

  const Header = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) => (
    <View style={[styles.header, { paddingTop: topPad + 28 }]}>
      <View style={styles.headerSide}>
        <Pressable onPress={goBack} style={styles.headerIcon} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={21} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerSide}>{right ?? <View style={styles.headerActionSpacer} />}</View>
    </View>
  );

  const BottomTabs = () => (
    <View style={[styles.bottomTabs, { paddingBottom: bottomPad + 7 }]}>
      {([
        ['account', 'حسابي', 'person-outline', 'person'],
        ['cart', 'السلة', 'bag-outline', 'bag'],
        ['orders', 'طلباتي', 'receipt-outline', 'receipt'],
        ['categories', 'الأقسام', 'grid-outline', 'grid'],
        ['home', 'الرئيسية', 'home-outline', 'home'],
      ] as const).map(([key, label, inactive, active]) => (
        <Pressable key={key} onPress={() => openTab(key)} style={styles.tabButton}>
          <Ionicons name={(activeTab === key ? active : inactive) as keyof typeof Ionicons.glyphMap} size={22} color={activeTab === key ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabLabel, activeTab === key && styles.tabLabelActive]}>{label}</Text>
          {activeTab === key ? <View style={styles.tabDot} /> : null}
          {key === 'cart' && cartCount > 0 ? <View style={styles.tabCartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View> : null}
        </Pressable>
      ))}
    </View>
  );

  const PrimaryButton = ({ label, onPress, outline = false, disabled = false, fullWidth = false }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean; fullWidth?: boolean }) => (
    <Pressable
      disabled={disabled}
      onPress={async () => { await tap(); onPress(); }}
      style={({ pressed }) => [
        styles.primaryButton,
        fullWidth && { width: '100%' },
        outline && styles.outlineButton,
        disabled && styles.disabledButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.primaryButtonText, outline && styles.outlineButtonText]}>{label}</Text>
      {!outline ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
    </Pressable>
  );

  const IntroScreen = () => (
    <View style={styles.intro}>
      <StatusBar style="light" />
      <LinearGradient colors={['#F97316', '#D97706']} style={StyleSheet.absoluteFill} />
      <View style={[styles.introTop, { paddingTop: topPad + 28 }]}>
        <View style={styles.introLogoCircle}><Ionicons name="bicycle" size={48} color="#fff" /></View>
        <Text style={styles.introBrand}>{isEnglish ? 'Tawsel' : 'توصيل'}</Text>
        <Text style={styles.introEnglish}>TAWSEL</Text>
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
            onPress={() => { setSelectedRole('driver'); resetTo('driverDashboard'); }}
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
    const submitAuth = () => {
      const normalizedPhone = phone.replace(/\D/g, '');
      if (register && !name.trim()) {
        Alert.alert(isEnglish ? 'Name required' : 'الاسم مطلوب', isEnglish ? 'Enter your full name to create an account.' : 'أدخل اسمك الكامل لإنشاء الحساب.');
        return;
      }
      if (normalizedPhone.length < 9) {
        Alert.alert(isEnglish ? 'Phone number required' : 'رقم الهاتف مطلوب', isEnglish ? 'Enter a valid phone number to continue.' : 'أدخل رقم هاتف صحيح للمتابعة.');
        return;
      }
      go('home');
    };

    return (
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.authContent, { paddingTop: topPad + 20, paddingBottom: bottomPad + 28 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.authTopRow}>
            <Pressable accessibilityLabel={isEnglish ? 'Back to role selection' : 'العودة لاختيار الحساب'} onPress={() => go('intro')} style={({ pressed }) => [styles.backCircle, pressed && styles.pressed]}>
              <Ionicons name="chevron-back" size={21} color={colors.ink} />
            </Pressable>
            <View style={styles.authTrustPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.green} />
              <Text style={styles.authTrustText}>{isEnglish ? 'Secure access' : 'دخول آمن'}</Text>
            </View>
          </View>
          <View style={styles.authBrandRow}>
            <View style={styles.authLogo}><Image source={logoImage} style={styles.authLogoImage} /></View>
            <View>
              <Text style={styles.authBrandName}>{isEnglish ? 'Tawsel' : 'توصيل'}</Text>
              <Text style={styles.authBrandCaption}>{isEnglish ? 'Everything, delivered' : 'كل شيء يصلك'}</Text>
            </View>
          </View>
          <Text style={styles.authEyebrow}>{isEnglish ? (register ? 'START YOUR JOURNEY' : 'WELCOME BACK') : (register ? 'ابدأ رحلتك' : 'مرحباً بعودتك')}</Text>
          <Text style={styles.authTitle}>{isEnglish ? (register ? 'Create your account' : 'Welcome to Tawsel') : (register ? 'أنشئ حسابك' : 'مرحباً بك في توصيل')}</Text>
          <Text style={styles.authSubtitle}>{isEnglish ? (register ? 'Start your journey with the fastest delivery in your city' : 'Your favorite orders, delivered') : (register ? 'ابدأ رحلتك مع أسرع توصيل في مدينتك' : 'ادخل عالم طلباتك المفضلة')}</Text>

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
            <View style={styles.authHint}>
              <Ionicons name="lock-closed-outline" size={15} color={colors.primary} />
              <Text style={styles.authHintText}>{isEnglish ? 'We will send a one-time verification code.' : 'سنرسل لك رمز تحقق لمرة واحدة.'}</Text>
            </View>
            <PrimaryButton label={isEnglish ? (register ? 'Create account' : 'Continue') : (register ? 'إنشاء الحساب' : 'متابعة')} onPress={submitAuth} />
          </View>

          <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>{isEnglish ? 'OR' : 'أو'}</Text><View style={styles.orLine} /></View>
          <Pressable accessibilityLabel={isEnglish ? 'Continue with Google' : 'المتابعة باستخدام Google'} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]} onPress={() => go('home')}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>{isEnglish ? 'Continue with Google' : 'المتابعة باستخدام Google'}</Text>
          </Pressable>
          <Text style={styles.terms}>{isEnglish ? 'By continuing, you agree to our ' : 'بالمتابعة، أنت توافق على '}<Text style={styles.termsLink}>{isEnglish ? 'Terms' : 'الشروط والأحكام'}</Text>{isEnglish ? ' and ' : ' و'}<Text style={styles.termsLink}>{isEnglish ? 'Privacy Policy' : 'سياسة الخصوصية'}</Text></Text>
          <Pressable accessibilityLabel={register ? (isEnglish ? 'Go to login' : 'الانتقال لتسجيل الدخول') : (isEnglish ? 'Create an account' : 'إنشاء حساب')} onPress={() => go(register ? 'login' : 'register')} style={styles.authSwitch}>
            <Text style={styles.authSwitchText}>{register ? (isEnglish ? 'Already have an account? ' : 'لديك حساب بالفعل؟ ') : (isEnglish ? 'New to Tawsel? ' : 'ليس لديك حساب؟ ')}<Text style={styles.termsLink}>{register ? (isEnglish ? 'Sign in' : 'تسجيل الدخول') : (isEnglish ? 'Create account' : 'إنشاء حساب')}</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const HomeScreen = () => {
    const homeFilterChips = productCategoryFilters.map((filter) => {
      const isActive = categoryFilter === filter;
      return (
        <Pressable
          accessibilityLabel={`فتح قسم ${filter}`}
          key={filter}
          onPress={() => {
            setCategoryFilter(filter);
            setCategoryQuery('');
            setShowAllCategoryProducts(false);
            setShowCategoryFilters(false);
            go('categories');
          }}
          style={({ pressed }) => [
            styles.categoryFilter,
            isActive && styles.categoryFilterActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.categoryFilterText, isActive && styles.categoryFilterTextActive]}>{filter}</Text>
          {isActive ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </Pressable>
      );
    });

    return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 100 }}>
        <View style={styles.homeTop}>
          <View style={styles.homeGreeting}>
            <View style={styles.greetingCopy}>
              <Text style={styles.helloText}>أهلاً محمد <Text style={styles.wave}>✦</Text></Text>
              <Pressable onPress={() => go('addresses')} style={styles.locationLine}><Ionicons name="location" size={15} color={colors.primary} /><Text style={styles.locationText}>{address}</Text><Ionicons name="chevron-down" size={14} color={colors.mutedForeground} /></Pressable>
            </View>
          </View>
        </View>
        <Pressable onPress={() => go('restaurant')} style={styles.promoCard}>
          <View style={styles.promoCopy}><Text style={styles.promoEyebrow}>لفترة محدودة</Text><Text style={styles.promoTitle}>خصم 20%<Text style={styles.promoTitleSmall}> على أول طلب</Text></Text><Text style={styles.promoCode}>TAWSEL20</Text></View>
          <View style={[styles.promoArrow, isEnglish ? styles.promoArrowEnglish : styles.promoArrowArabic]}><Ionicons name="arrow-forward" size={18} color={colors.primary} /></View>
        </Pressable>
        <SectionTitle title="مطاعم مميزة" action="عرض الكل" onPress={() => go('categories')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {restaurants.slice(0, 3).map((restaurant) => <Pressable key={restaurant.name} onPress={() => { setSelectedRestaurant(restaurant); go('restaurant'); }} style={styles.restaurantCard}><View><Image source={restaurant.image} style={styles.restaurantImage} /><View style={[styles.restaurantTag, { backgroundColor: restaurant.color }]}><Text style={styles.restaurantTagText}>توصيل سريع</Text></View></View><View style={styles.restaurantMeta}><View><Text style={styles.restaurantName}>{restaurant.name}</Text><Text style={styles.restaurantType}>{restaurant.type} · {restaurant.eta}</Text></View><View style={styles.rating}><Ionicons name="star" size={13} color={colors.accent} /><Text style={styles.ratingText}>{restaurant.rating}</Text></View></View></Pressable>)}
        </ScrollView>
         <SectionTitle title="اختياراتنا لك" action="عرض الكل" onPress={() => go('categories')} />
         <Text style={styles.homeChoicesSubtitle}>{isEnglish ? 'Handpicked picks for your next order' : 'اختيارات مميزة لطلبك القادم'}</Text>
         <View style={styles.productGrid}>{products.slice(0, 4).map((item) => <ProductCard key={item.id} item={item} onPress={() => chooseProduct(item)} onAdd={() => addToCart(item)} />)}</View>
      </ScrollView>
      <BottomTabs />
    </View>
    );
  };

  const SectionTitle = ({ title, action, onPress }: { title: string; action: string; onPress: () => void }) => (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onPress}>
        <Text style={styles.sectionAction}>{action}</Text>
      </Pressable>
    </View>
  );

  const ProductCard = ({ item, onPress, onAdd }: { item: Product; onPress: () => void; onAdd: () => void }) => (
    <Pressable onPress={onPress} style={styles.productCard}><View style={styles.productImageWrap}><Image source={item.image} style={styles.productImage} /><Pressable onPress={onAdd} style={styles.addCircle}><Ionicons name="add" size={18} color="#fff" /></Pressable></View><Text style={styles.productTitle}>{item.title}</Text><Text style={styles.productSubtitle}>{item.subtitle}</Text><View style={styles.productBottom}><Text style={styles.price}>{money(item.price, isEnglish)}</Text><View style={styles.miniRating}><Ionicons name="star" size={12} color={colors.accent} /><Text style={styles.miniRatingText}>{item.rating}</Text></View></View></Pressable>
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
    const normalizedQuery = categoryQuery.trim().toLowerCase();
    const filteredProducts = products.filter((item) => {
      const matchesFilter = categoryFilter === 'الكل' || item.category === categoryFilter;
      const matchesQuery = !normalizedQuery
        || item.title.toLowerCase().includes(normalizedQuery)
        || item.subtitle.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
    const visibleProducts = showAllCategoryProducts ? filteredProducts : filteredProducts.slice(0, 6);
    const selectFilter = (filter: string) => {
      setCategoryFilter(filter);
      setShowAllCategoryProducts(false);
      setShowCategoryFilters(false);
      tap();
    };
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
              const count = products.filter((product) => product.category === item.filter).length;
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
                  <Ionicons name="chevron-forward" size={17} color={isActive ? colors.primary : colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>

          {showCategoryFilters ? (
            <View style={styles.categoryFilterPanel}>
              <View style={styles.categoryFilterHeader}>
                <View>
                  <Text style={styles.categoryFilterHeaderTitle}>فلترة المنتجات</Text>
                  <Text style={styles.categoryFilterHeaderSub}>اختر القسم الذي تريد تصفحه</Text>
                </View>
                <Pressable accessibilityLabel="إغلاق الفلاتر" onPress={() => setShowCategoryFilters(false)} style={({ pressed }) => [styles.categoryFilterClose, pressed && styles.pressed]}>
                  <Ionicons name="close" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.categoryFilterList} horizontal showsHorizontalScrollIndicator={false}>
                {filterChips}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.categoryResultHeader}>
            <View>
              <Text style={styles.sectionTitle}>{categoryFilter === 'الكل' ? 'اختياراتنا لك' : categoryFilter}</Text>
              <Text style={styles.categoryResultSub}>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'منتج' : 'منتجات'} متاحة الآن
              </Text>
            </View>
            <View style={styles.deliveryHint}>
              <Ionicons name="flash-outline" size={15} color={colors.accentForeground} />
              <Text style={styles.deliveryHintText}>توصيل سريع</Text>
            </View>
          </View>

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

  const RestaurantScreen = () => (
    <View style={styles.screen}><StatusBar style="dark" /><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 30 }}><View style={[styles.restaurantHero, { paddingTop: topPad }]}><Image source={selectedRestaurant.image} style={styles.restaurantHeroImage} /><View style={styles.heroShade} /><Pressable onPress={() => go('home')} style={styles.heroBack}><Ionicons name="chevron-back" size={21} color={colors.ink} /></Pressable><Pressable style={styles.heroHeart}><Ionicons name="heart-outline" size={21} color={colors.primary} /></Pressable><View style={styles.heroRestaurantInfo}><View style={styles.avatarSquare}><Text style={styles.avatarLetter}>ت</Text></View><View><Text style={styles.heroTitle}>{selectedRestaurant.name}</Text><Text style={styles.heroSub}>{selectedRestaurant.type} · {selectedRestaurant.eta}</Text></View><View style={styles.heroRating}><Ionicons name="star" size={14} color={colors.accent} /><Text style={styles.heroRatingText}>{selectedRestaurant.rating}</Text></View></View></View><View style={styles.restaurantTabs}><Text style={styles.restaurantTabActive}>الأكثر طلباً</Text><Text style={styles.restaurantTab}>الوجبات</Text><Text style={styles.restaurantTab}>المشروبات</Text></View><View style={styles.menuList}>{products.slice(0, 3).map((item) => <Pressable key={item.id} onPress={() => chooseProduct(item)} style={styles.menuItem}><Image source={item.image} style={styles.menuImage} /><View style={styles.menuCopy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuSub}>{item.subtitle}</Text><Text style={styles.menuPrice}>{money(item.price, isEnglish)}</Text></View><Pressable onPress={() => addToCart(item)} style={styles.menuAdd}><Ionicons name="add" size={18} color="#fff" /></Pressable></Pressable>)}</View></ScrollView>{cartCount > 0 ? <Pressable onPress={() => go('cart')} style={[styles.cartBar, { bottom: bottomPad + 16 }]}><View style={styles.cartBarIcon}><Ionicons name="bag-handle-outline" size={20} color="#fff" /><Text style={styles.cartBarCount}>{cartCount}</Text></View><Text style={styles.cartBarText}>عرض السلة</Text><Text style={styles.cartBarTotal}>{money(total, isEnglish)}</Text></Pressable> : null}</View>
  );

  const ProductScreen = () => (
    <View style={styles.screen}><StatusBar style="dark" /><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 110 }}><View style={[styles.productHero, { paddingTop: topPad }]}><Image source={selectedProduct.image} style={styles.productHeroImage} /><Pressable onPress={() => go('restaurant')} style={styles.heroBack}><Ionicons name="chevron-back" size={21} color={colors.ink} /></Pressable><Pressable style={styles.heroHeart}><Ionicons name="heart-outline" size={21} color={colors.primary} /></Pressable></View><View style={styles.productDetail}><View style={styles.detailTitleRow}><View><Text style={styles.detailTitle}>{selectedProduct.title}</Text><Text style={styles.detailSubtitle}>{selectedProduct.subtitle}</Text></View><Text style={styles.detailPrice}>{money(selectedProduct.price, isEnglish)}</Text></View><View style={styles.detailRating}><Ionicons name="star" size={15} color={colors.accent} /><Text style={styles.detailRatingText}>{selectedProduct.rating} (120 تقييم)</Text><Text style={styles.detailDot}>·</Text><Text style={styles.detailMuted}>20–30 min</Text></View><Text style={styles.detailSection}>عن المنتج</Text><Text style={styles.detailDescription}>استمتع بمذاق طازج ومكونات مختارة بعناية، محضّرة خصيصاً لتصل إليك ساخنة ولذيذة.</Text><View style={styles.quantityCard}><Text style={styles.quantityLabel}>الكمية</Text><View style={styles.quantityControl}><Pressable onPress={() => changeQuantity(selectedProduct.id, -1)} style={styles.quantityButton}><Ionicons name="remove" size={17} color={colors.ink} /></Pressable><Text style={styles.quantityValue}>{cart.find((item) => item.id === selectedProduct.id)?.quantity ?? 1}</Text><Pressable onPress={() => addToCart(selectedProduct)} style={styles.quantityButton}><Ionicons name="add" size={17} color={colors.ink} /></Pressable></View></View></View></ScrollView><View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}><PrimaryButton label="أضف إلى السلة" onPress={() => { addToCart(selectedProduct); go('cart'); }} /></View></View>
  );

  const CartScreenComponent = () =>
    CartTab({
      styles,
      colors,
      isEnglish,
      cart,
      cartCount,
      promo,
      setPromo,
      changeQuantity,
      go,
      topPad,
      bottomPad,
      money,
      BottomTabs,
      PrimaryButton,
    });

  const AddressScreenComponent = () =>
    AddressScreen({
      styles,
      colors,
      topPad,
      bottomPad,
      address,
      go,
      PrimaryButton,
    });

  const PaymentScreenComponent = () =>
    PaymentScreen({
      styles,
      colors,
      topPad,
      bottomPad,
      paymentMethod,
      setPaymentMethod,
      go,
      PrimaryButton,
    });

  const ReviewScreenComponent = () => {
    const subtotal = cart.reduce((sum: number, item) => sum + item.price * item.quantity, 0);
    const delivery = cart.length ? 15 : 0;
    const total = subtotal + delivery;
    return ReviewScreen({
      styles,
      colors,
      topPad,
      bottomPad,
      cart,
      address,
      paymentMethod,
      subtotal,
      delivery,
      total,
      money,
      go,
      setDriverOrderStatus,
      setScreen,
      setCart,
      PrimaryButton,
    });
  };

  const TrackScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 30 }}>
        <View style={styles.trackTop}>
          <Pressable onPress={() => openTab('home')} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={21} color={colors.ink} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>تتبع الطلب</Text>
            <Text style={styles.headerSubtitle}>طلب رقم #123456</Text>
          </View>
          <Pressable onPress={() => go('support')} style={styles.headerIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.trackStatus}>
          <View style={styles.trackCheck}>
            <Ionicons name="checkmark" size={27} color="#fff" />
          </View>
          <Text style={styles.trackStatusTitle}>جاري تحضير طلبك</Text>
          <Text style={styles.trackStatusSub}>سيصل طلبك خلال 25–30 دقيقة</Text>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapRoadOne} />
          <View style={styles.mapRoadTwo} />
          <View style={styles.mapRoadThree} />
          <View style={styles.mapPinStart}><Ionicons name="location" size={21} color={colors.primary} /></View>
          <View style={styles.mapPinEnd}><Ionicons name="bicycle" size={18} color="#fff" /></View>
          <Text style={styles.mapLabel}>الخرطوم</Text>
        </View>

        <View style={[styles.progressTrack, { direction: 'rtl', writingDirection: 'rtl' }]}>
          {[
            ['تم تأكيد الطلب', 'تمت الموافقة على الطلب', true],
            ['جاري التحضير', 'المطعم يجهز طلبك', true],
            ['في الطريق', 'السائق في طريقه إليك', false],
            ['تم التوصيل', 'تمت عملية التوصيل', false],
          ].map(([title, sub, done]) => (
            <View
              key={title as string}
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'flex-end',
                width: '100%',
                minHeight: 52,
                marginBottom: 4,
                direction: 'rtl',
                writingDirection: 'rtl',
              }}
            >
              <View style={[styles.progressDot, done && styles.progressDotDone, { marginLeft: 11, marginRight: 0 }]}>
                {done ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.progressTitle, done && styles.progressTitleDone, { textAlign: 'right', direction: 'rtl', writingDirection: 'rtl' }]}>{title as string}</Text>
                <Text style={[styles.progressSub, { textAlign: 'right', direction: 'rtl', writingDirection: 'rtl' }]}>{sub as string}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.courierCard}>
          <Pressable style={styles.callButton}><Ionicons name="call-outline" size={19} color={colors.primary} /></Pressable>
          <Pressable style={styles.callButton}><Ionicons name="chatbubble-outline" size={19} color={colors.primary} /></Pressable>
          <View style={styles.courierInfo}>
            <Text style={styles.courierName}>محمد أحمد</Text>
            <Text style={styles.courierSub}>سائق التوصيل · 4.8 ★</Text>
          </View>
          <View style={styles.courierAvatar}><Ionicons name="person" size={22} color="#fff" /></View>
        </View>
      </ScrollView>
    </View>
  );

  const OrdersScreen = () => {
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
    }> = [
      {
        id: '123456',
        date: 'اليوم، 10:25 ص',
        restaurant: 'بيتزا هت',
        summary: 'بيتزا · وجبة عائلية',
        status: 'active',
        statusLabel: 'جاري التوصيل',
        statusHint: 'سيصل خلال 12 دقيقة',
        total: 55,
        items: [products[0], products[1], products[3], products[4]],
      },
      {
        id: '123455',
        date: 'أمس، 8:12 م',
        restaurant: 'توصيل البقالة',
        summary: 'بقالة · فواكه طازجة',
        status: 'completed',
        statusLabel: 'تم التوصيل',
        statusHint: 'اكتمل أمس',
        total: 30,
        items: [products[2], products[29]],
      },
      {
        id: '123454',
        date: 'الأحد، 2:40 م',
        restaurant: 'كودو',
        summary: 'برجر · وجبة غداء',
        status: 'completed',
        statusLabel: 'تم التوصيل',
        statusHint: 'اكتمل الأحد',
        total: 42,
        items: [products[1], products[4]],
      },
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
              onPress={() => go('track')}
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
              <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
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

          {visibleOrders.length > 0 ? visibleOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <View key={order.id} style={[styles.orderCard, order.status === 'active' && styles.orderCardActive]}>
                <Pressable
                  accessibilityLabel={`تفاصيل الطلب رقم ${order.id}`}
                  onPress={() => {
                    if (order.status === 'active') {
                      go('track');
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
                    <Image key={item.id} source={item.image} style={[styles.orderThumb, index > 0 && { marginRight: -10 }]} />
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
                    <Pressable accessibilityLabel="تتبع الطلب" onPress={() => go('track')} style={styles.orderAction}>
                      <Text style={styles.reorderText}>تتبع الطلب</Text>
                      <Ionicons name="arrow-forward" size={13} color={colors.primary} />
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

  const FavoritesScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}><View style={styles.pageTop}><Text style={styles.pageTitle}>المفضلة</Text><Text style={styles.pageSubtitle}>أحب ما لديك في مكان واحد</Text></View><View style={styles.favoriteTabs}><Text style={styles.favoriteTabActive}>الأطباق</Text><Text style={styles.favoriteTab}>المطاعم</Text></View><View style={styles.productGrid}>{products.slice(0, 3).map((item) => <ProductCard key={item.id} item={item} onPress={() => chooseProduct(item)} onAdd={() => addToCart(item)} />)}</View></ScrollView><BottomTabs /></View>;

  const AccountScreen = () => {
    const displayName = name.trim() || (isEnglish ? 'Mohammed Ahmed' : 'محمد أحمد');
    const displayPhone = phone.trim() ? `+249 ${phone.trim()}` : '+249 912 345 678';
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
        trailing: <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />,
      },
      {
        title: isEnglish ? 'Help & support' : 'المساعدة والدعم',
        sub: isEnglish ? 'We are here whenever you need us' : 'نحن هنا متى احتجت إلينا',
        icon: 'help-circle-outline' as const,
        onPress: () => go('support'),
        trailing: <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />,
      },
    ];

    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}>
          <View style={styles.accountPageHeader}>
            <View>
              <Text style={styles.accountPageTitle}>{isEnglish ? 'My account' : 'حسابي'}</Text>
              <Text style={styles.accountPageSubtitle}>{isEnglish ? 'Everything you need, in one place' : 'كل ما يخصك في مكان واحد'}</Text>
            </View>
            <Pressable accessibilityLabel={isEnglish ? 'Open notifications' : 'فتح الإشعارات'} onPress={() => go('notifications')} style={styles.accountNotificationButton}>
              <Ionicons name="notifications-outline" size={20} color={colors.ink} />
              <View style={styles.accountNotificationDot} />
            </Pressable>
          </View>

          <LinearGradient colors={['#F97316', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.accountProfileCard}>
            <View style={styles.accountProfileTop}>
              <View style={styles.accountAvatar}>
                <Ionicons name="person" size={29} color="#fff" />
                <View style={styles.accountVerified}><Ionicons name="checkmark" size={10} color={colors.primary} /></View>
              </View>
              <View style={styles.accountProfileCopy}>
                <Text style={styles.accountNameLight}>{displayName}</Text>
                <Text style={styles.accountPhoneLight}>{displayPhone}</Text>
                <View style={styles.accountMemberPill}><Ionicons name="sparkles-outline" size={12} color="#FFDA82" /><Text style={styles.accountMemberText}>{isEnglish ? 'Tawsel member since 2024' : 'عضو في توصيل منذ 2024'}</Text></View>
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
                <Text style={styles.accountStatValue}>2,450</Text>
                <Text style={styles.accountStatLabel}>{isEnglish ? 'Points' : 'نقطة'}</Text>
              </View>
              <View style={styles.accountStatDivider} />
              <View style={styles.accountStat}>
                <Text style={styles.accountStatValue}>8</Text>
                <Text style={styles.accountStatLabel}>{isEnglish ? 'Favorites' : 'مفضلة'}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.loyaltyCard}>
            <View style={styles.loyaltyTop}>
              <View style={styles.loyaltyIcon}><Ionicons name="ribbon-outline" size={21} color={colors.accentForeground} /></View>
              <View style={styles.loyaltyCopy}>
                <Text style={styles.loyaltyEyebrow}>{isEnglish ? 'Tawsel rewards' : 'مكافآت توصيل'}</Text>
                <Text style={styles.loyaltyTitle}>{isEnglish ? 'You are 550 points from Gold' : 'تبقى 550 نقطة للوصول للذهبي'}</Text>
              </View>
              <Text style={styles.loyaltyPoints}>2,450</Text>
            </View>
            <View style={styles.loyaltyProgressTrack}><View style={styles.loyaltyProgressFill} /></View>
            <View style={styles.loyaltyBottom}><Text style={styles.loyaltyHint}>{isEnglish ? 'Gold unlocks free delivery' : 'الذهبي يفتح لك توصيلاً مجانياً'}</Text><Text style={styles.loyaltyGoal}>3,000 {isEnglish ? 'pts' : 'نقطة'}</Text></View>
          </View>

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
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(driverOrder.clientAddress)}`;
    Linking.openURL(mapUrl).catch(() => {
      Alert.alert(
        isEnglish ? 'Maps unavailable' : 'الخرائط غير متاحة',
        isEnglish ? 'We could not open the maps app.' : 'تعذر فتح تطبيق الخرائط.',
      );
    });
  };

  const DriverMapPanel = ({ expanded = false }: { expanded?: boolean }) => (
    <DriverMap
      expanded={expanded}
      driverCoordinate={driverCurrentCoordinate}
      clientCoordinate={clientLocation}
      routeCoordinates={deliveryRoute}
      routeProgress={driverRouteProgress}
      isFollowing={expanded && driverFollowMode}
      onToggleFollow={() => setDriverFollowMode((current) => !current)}
      driverLabel={isEnglish ? 'You' : 'أنت'}
      clientLabel={isEnglish ? 'Client location' : 'موقع العميل'}
      distanceLabel={expanded ? driverRouteDistanceLabel : driverOrder.distance}
    />
  );

  const DriverHeader = ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
    <View style={[styles.driverHeader, { paddingTop: topPad + 9 }]}>
      {onBack ? (
        <Pressable accessibilityLabel={isEnglish ? 'Back' : 'رجوع'} onPress={onBack} style={styles.driverHeaderButton}>
          <Ionicons name="chevron-back" size={21} color={colors.ink} />
        </Pressable>
      ) : <View style={styles.driverHeaderButtonPlaceholder} />}
      <View style={styles.driverHeaderCopy}>
        <Text style={styles.driverHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.driverHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.driverHeaderButtonPlaceholder} />
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
        <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: driverTab === key }} onPress={() => openDriverTab(key)} style={styles.driverTabButton}>
          <Ionicons name={(driverTab === key ? active : inactive) as keyof typeof Ionicons.glyphMap} size={21} color={driverTab === key ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.driverTabLabel, driverTab === key && styles.driverTabLabelActive]}>{label}</Text>
          {driverTab === key ? <View style={styles.driverTabDot} /> : null}
        </Pressable>
      ))}
    </View>
  );

  const DriverDashboardScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Driver center' : 'مركز السائق'} subtitle={isEnglish ? 'Deliver with Tawsel' : 'وصّل مع توصيل'} />
        <View style={styles.driverWelcome}>
          <View style={styles.driverWelcomeIcon}><Ionicons name="bicycle" size={24} color="#fff" /></View>
          <View style={styles.driverWelcomeCopy}>
            <Text style={styles.driverWelcomeTitle}>{isEnglish ? 'Good evening, Mohammed' : 'مساء الخير، محمد'}</Text>
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
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>8</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Deliveries' : 'توصيلات'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>4.9</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Rating' : 'التقييم'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>SAR 186</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Today' : 'اليوم'}</Text></View>
        </View>

        <View style={styles.driverSectionHeader}>
          <Text style={styles.driverSectionTitle}>{isEnglish ? 'Delivery requests' : 'طلبات التوصيل'}</Text>
          <Text style={styles.driverSectionHint}>{driverOrderStatus === 'pending' ? (isEnglish ? '1 waiting' : 'طلب بانتظارك') : (isEnglish ? 'Live status' : 'حالة مباشرة')}</Text>
        </View>

        {driverOrderStatus === 'pending' && driverOnline ? (
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
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.driverOrderFooter}><Text style={styles.driverOrderTotal}>{money(driverOrder.total, isEnglish)}</Text><Text style={styles.driverReviewLink}>{isEnglish ? 'Review order' : 'مراجعة الطلب'} <Ionicons name="arrow-forward" size={13} color={colors.primary} /></Text></View>
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
            <Text style={styles.driverTabIntroTitle}>{isEnglish ? 'Your delivery activity' : 'نشاط التوصيل الخاص بك'}</Text>
          </View>
          <View style={styles.driverTabCount}><Text style={styles.driverTabCountValue}>8</Text><Text style={styles.driverTabCountLabel}>{isEnglish ? 'completed' : 'مكتملة'}</Text></View>
        </View>
        <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Current delivery' : 'التوصيلة الحالية'}</Text>
        <Pressable onPress={() => go(driverOrderStatus === 'pending' ? 'driverOrder' : 'driverMap')} style={({ pressed }) => [styles.driverDeliveryCard, pressed && styles.pressed]}>
          <View style={styles.driverDeliveryCardTop}>
            <View style={styles.driverDeliveryIcon}><Ionicons name="bicycle" size={22} color="#fff" /></View>
            <View style={styles.driverDeliveryCopy}>
              <Text style={styles.driverDeliveryTitle}>{driverOrderStatus === 'pending' ? (isEnglish ? 'New delivery request' : 'طلب توصيل جديد') : (isEnglish ? 'Active delivery' : 'التوصيلة الحالية')}</Text>
              <Text style={styles.driverDeliverySub}>{driverOrder.restaurant} · {driverOrder.clientName}</Text>
            </View>
            <DriverOrderStatusPill />
          </View>
          <View style={styles.driverDeliveryRoute}><Ionicons name="location-outline" size={17} color={colors.primary} /><Text style={styles.driverDeliveryRouteText}>{driverOrder.clientAddress}</Text><Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} /></View>
          <View style={styles.driverDeliveryFooter}><Text style={styles.driverDeliveryMeta}>{driverOrderStatus === 'pending' ? driverOrder.distance : driverRouteEtaLabel}</Text><Text style={styles.driverDeliveryAction}>{isEnglish ? 'View details' : 'عرض التفاصيل'}</Text></View>
        </Pressable>
        <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Recent deliveries' : 'التوصيلات السابقة'}</Text>
        {[
          { id: '#TW-1047', client: isEnglish ? 'Al Riyadh district' : 'حي الرياض', amount: '38 SAR', time: isEnglish ? 'Today, 1:20 PM' : 'اليوم، 1:20 م', status: isEnglish ? 'Delivered' : 'تم التسليم' },
          { id: '#TW-1046', client: isEnglish ? 'Al Amarat' : 'العمارات', amount: '42 SAR', time: isEnglish ? 'Today, 11:05 AM' : 'اليوم، 11:05 ص', status: isEnglish ? 'Delivered' : 'تم التسليم' },
          { id: '#TW-1045', client: isEnglish ? 'Khartoum 2' : 'الخرطوم 2', amount: '31 SAR', time: isEnglish ? 'Yesterday, 7:40 PM' : 'أمس، 7:40 م', status: isEnglish ? 'Delivered' : 'تم التسليم' },
        ].map((item) => (
          <View key={item.id} style={styles.driverHistoryRow}>
            <View style={styles.driverHistoryIcon}><Ionicons name="checkmark" size={16} color={colors.green} /></View>
            <View style={styles.driverHistoryCopy}><Text style={styles.driverHistoryTitle}>{item.client}</Text><Text style={styles.driverHistorySub}>{item.id} · {item.time}</Text></View>
            <View style={styles.driverHistoryAmount}><Text style={styles.driverHistoryPrice}>{item.amount}</Text><Text style={styles.driverHistoryStatus}>{item.status}</Text></View>
          </View>
        ))}
      </ScrollView>
      <DriverTabs />
    </View>
  );

  const DriverEarningsScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Earnings' : 'الأرباح'} subtitle={isEnglish ? 'Track your income' : 'تابع دخلك'} />
        <View style={styles.driverEarningsHero}>
          <View><Text style={styles.driverEarningsEyebrow}>{isEnglish ? 'Available balance' : 'الرصيد المتاح'}</Text><Text style={styles.driverEarningsValue}>1,240 <Text style={styles.driverEarningsCurrency}>SAR</Text></Text><Text style={styles.driverEarningsSub}>{isEnglish ? '+12% from last week' : '+12% من الأسبوع الماضي'}</Text></View>
          <View style={styles.driverEarningsIcon}><Ionicons name="wallet-outline" size={25} color="#fff" /></View>
        </View>
        <View style={styles.driverStatsRow}>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>186</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Today · SAR' : 'اليوم · ر.س'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>8</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Deliveries' : 'توصيلات'}</Text></View>
          <View style={styles.driverStatCard}><Text style={styles.driverStatValue}>4.9</Text><Text style={styles.driverStatLabel}>{isEnglish ? 'Rating' : 'التقييم'}</Text></View>
        </View>
        <View style={styles.driverPanelCard}>
          <View style={styles.driverPanelCardHeader}><Text style={styles.driverTabSectionTitle}>{isEnglish ? 'This week' : 'هذا الأسبوع'}</Text><Text style={styles.driverPanelHint}>{isEnglish ? '1,240 SAR' : '١٬٢٤٠ ر.س'}</Text></View>
          <View style={styles.driverBars}>
            {[{ day: isEnglish ? 'Sat' : 'س', value: 42 }, { day: isEnglish ? 'Sun' : 'ح', value: 68 }, { day: isEnglish ? 'Mon' : 'ن', value: 52 }, { day: isEnglish ? 'Tue' : 'ث', value: 82 }, { day: isEnglish ? 'Wed' : 'ر', value: 63 }, { day: isEnglish ? 'Thu' : 'خ', value: 94 }, { day: isEnglish ? 'Fri' : 'ج', value: 76 }].map((item) => (
              <View key={item.day} style={styles.driverBarColumn}><View style={styles.driverBarTrack}><View style={[styles.driverBarFill, { height: `${item.value}%` }]} /></View><Text style={styles.driverBarLabel}>{item.day}</Text></View>
            ))}
          </View>
        </View>
        <View style={styles.driverPayoutRow}><View style={styles.driverPayoutIcon}><Ionicons name="card-outline" size={20} color={colors.primary} /></View><View style={styles.driverPayoutCopy}><Text style={styles.driverPayoutTitle}>{isEnglish ? 'Next payout' : 'الدفعة القادمة'}</Text><Text style={styles.driverPayoutSub}>{isEnglish ? 'Thursday · Bank account ending 4242' : 'الخميس · الحساب البنكي المنتهي بـ 4242'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></View>
      </ScrollView>
      <DriverTabs />
    </View>
  );

  const DriverAccountScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Account' : 'الحساب'} subtitle={isEnglish ? 'Your driver account' : 'حساب السائق الخاص بك'} />
        <View style={styles.driverProfileCard}>
          <View style={styles.driverProfileAvatar}><Ionicons name="person" size={30} color="#fff" /></View>
          <Text style={styles.driverProfileName}>{name.trim() || (isEnglish ? 'Mohammed Ahmed' : 'محمد أحمد')}</Text>
          <Text style={styles.driverProfilePhone}>{phone.trim() ? `+249 ${phone.trim()}` : '+249 912 345 678'}</Text>
          <View style={styles.driverRatingPill}><Ionicons name="star" size={14} color="#F3B43F" /><Text style={styles.driverRatingText}>4.9 · 128 {isEnglish ? 'reviews' : 'تقييماً'}</Text></View>
        </View>
        <View style={styles.driverPanelCard}>
          <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Driver details' : 'بيانات السائق'}</Text>
          <View style={styles.driverProfileRow}><View style={styles.driverProfileRowIcon}><Ionicons name="bicycle-outline" size={19} color={colors.primary} /></View><View style={styles.driverProfileRowCopy}><Text style={styles.driverProfileRowLabel}>{isEnglish ? 'Vehicle' : 'المركبة'}</Text><Text style={styles.driverProfileRowValue}>{isEnglish ? 'Motorcycle · Khartoum 4821' : 'دراجة نارية · الخرطوم 4821'}</Text></View></View>
          <View style={styles.driverProfileRow}><View style={styles.driverProfileRowIcon}><Ionicons name="calendar-outline" size={19} color={colors.primary} /></View><View style={styles.driverProfileRowCopy}><Text style={styles.driverProfileRowLabel}>{isEnglish ? 'Driving since' : 'يعمل منذ'}</Text><Text style={styles.driverProfileRowValue}>2023</Text></View></View>
          <View style={styles.driverProfileRow}><View style={styles.driverProfileRowIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.green} /></View><View style={styles.driverProfileRowCopy}><Text style={styles.driverProfileRowLabel}>{isEnglish ? 'Verification' : 'حالة التحقق'}</Text><Text style={styles.driverProfileRowValue}>{isEnglish ? 'Verified driver' : 'سائق موثّق'}</Text></View><Ionicons name="checkmark-circle" size={20} color={colors.green} /></View>
        </View>
        <Pressable
          accessibilityLabel={isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي'}
          style={({ pressed }) => [styles.driverEditProfileButton, pressed && styles.pressed]}
          onPress={() => setIsEditingProfile((current) => !current)}
        >
          <Ionicons name={isEditingProfile ? 'close-outline' : 'create-outline'} size={18} color={colors.primary} />
          <Text style={styles.driverEditProfileText}>{isEditingProfile ? (isEnglish ? 'Cancel editing' : 'إلغاء التعديل') : (isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي')}</Text>
        </Pressable>
        {isEditingProfile ? (
          <View style={styles.driverProfileEditPanel}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={isEnglish ? 'Your name' : 'اسمك'}
              placeholderTextColor={colors.mutedForeground}
              style={styles.driverProfileInput}
              textAlign="right"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={isEnglish ? 'Phone number' : 'رقم الهاتف'}
              placeholderTextColor={colors.mutedForeground}
              style={styles.driverProfileInput}
              keyboardType="phone-pad"
              textAlign="right"
            />
            <Pressable
              accessibilityLabel={isEnglish ? 'Save profile' : 'حفظ الملف الشخصي'}
              onPress={() => setIsEditingProfile(false)}
              style={({ pressed }) => [styles.driverProfileSaveButton, pressed && styles.pressed]}
            >
              <Text style={styles.driverProfileSaveText}>{isEnglish ? 'Save changes' : 'حفظ التغييرات'}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <DriverTabs />
    </View>
  );

  const DriverSettingsScreen = () => (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <DriverHeader title={isEnglish ? 'Settings' : 'الإعدادات'} subtitle={isEnglish ? 'Control your driver preferences' : 'تحكم في تفضيلات السائق'} />
        <Text style={styles.driverSettingsSection}>{isEnglish ? 'Preferences' : 'التفضيلات'}</Text>
        <View style={styles.driverSettingRow}><View style={styles.driverSettingIcon}><Ionicons name="language-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Language' : 'اللغة'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'English' : 'العربية'}</Text></View><Ionicons name="checkmark-circle" size={17} color={colors.primary} /></View>
        <View style={styles.driverSettingRow}><View style={styles.driverSettingIcon}><Ionicons name="notifications-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Delivery notifications' : 'إشعارات التوصيل'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Receive new request alerts' : 'استقبل تنبيهات الطلبات الجديدة'}</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: driverNotifications }} onPress={() => setDriverNotifications((current) => !current)} style={[styles.driverToggle, driverNotifications && styles.driverToggleOn]}><View style={[styles.driverToggleKnob, driverNotifications && styles.driverToggleKnobOn]} /></Pressable></View>
        <Text style={styles.driverSettingsSection}>{isEnglish ? 'Support' : 'الدعم'}</Text>
        <Pressable style={styles.driverSettingRow} onPress={() => go('driverSupport')}><View style={styles.driverSettingIcon}><Ionicons name="help-circle-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Help center' : 'مركز المساعدة'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Get help with deliveries' : 'احصل على المساعدة في التوصيلات'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>
        <Pressable style={styles.driverSettingRow} onPress={() => resetTo('intro')}><View style={styles.driverSettingIcon}><Ionicons name="log-out-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Log out' : 'تسجيل الخروج'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Switch account or role' : 'تبديل الحساب أو نوع المستخدم'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>
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
    ].filter((item) => {
      const query = driverSupportQuery.trim().toLowerCase();
      return !query || `${item.question} ${item.answer}`.toLowerCase().includes(query);
    });

    const openSupportLink = (url: string) => {
      Linking.openURL(url).catch(() => Alert.alert(isEnglish ? 'Unavailable' : 'غير متاح', isEnglish ? 'This contact method is not available on this device.' : 'طريقة التواصل هذه غير متاحة على هذا الجهاز.'));
    };
    const sendSupportMessage = () => {
      if (!driverSupportMessage.trim()) return;
      setDriverSupportSent(true);
      setDriverSupportMessage('');
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
          <View style={styles.driverSupportSearch}><Ionicons name="search-outline" size={18} color={colors.mutedForeground} /><TextInput value={driverSupportQuery} onChangeText={setDriverSupportQuery} placeholder={isEnglish ? 'Search help topics' : 'ابحث في مواضيع المساعدة'} placeholderTextColor={colors.mutedForeground} style={styles.driverSupportSearchInput} /></View>
          <Text style={styles.driverSupportSection}>{isEnglish ? 'Contact support' : 'تواصل مع الدعم'}</Text>
          <View style={styles.driverSupportContactRow}>
            <Pressable onPress={() => openSupportLink('tel:+249912345678')} style={({ pressed }) => [styles.driverSupportContact, pressed && styles.pressed]}><View style={styles.driverSupportContactIcon}><Ionicons name="call-outline" size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.driverSupportContactTitle}>{isEnglish ? 'Call us' : 'اتصل بنا'}</Text><Text style={styles.driverSupportContactSub}>24/7</Text></View></Pressable>
            <Pressable onPress={() => openSupportLink('https://wa.me/249912345678')} style={({ pressed }) => [styles.driverSupportContact, pressed && styles.pressed]}><View style={[styles.driverSupportContactIcon, styles.driverSupportWhatsapp]}><Ionicons name="logo-whatsapp" size={20} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={styles.driverSupportContactTitle}>WhatsApp</Text><Text style={styles.driverSupportContactSub}>{isEnglish ? 'Chat now' : 'محادثة الآن'}</Text></View></Pressable>
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
          <View style={styles.driverSupportComposer}><TextInput value={driverSupportMessage} onChangeText={(value) => { setDriverSupportMessage(value); setDriverSupportSent(false); }} multiline placeholder={isEnglish ? 'Describe your issue...' : 'اكتب مشكلتك بالتفصيل...'} placeholderTextColor={colors.mutedForeground} style={styles.driverSupportMessageInput} /><Pressable disabled={!driverSupportMessage.trim()} onPress={sendSupportMessage} style={({ pressed }) => [styles.driverSupportSend, !driverSupportMessage.trim() && styles.driverSupportSendDisabled, pressed && styles.pressed]}><Ionicons name="send" size={17} color="#fff" /></Pressable></View>
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
            <Pressable accessibilityLabel={isEnglish ? 'Decline order' : 'رفض الطلب'} onPress={() => { setDriverOrderStatus('rejected'); go('driverDashboard'); }} style={({ pressed }) => [styles.driverDeclineButton, pressed && styles.pressed]}><Ionicons name="close" size={18} color={colors.primary} /><Text style={styles.driverDeclineText}>{isEnglish ? 'Decline' : 'رفض'}</Text></Pressable>
            <Pressable accessibilityLabel={isEnglish ? 'Accept order' : 'قبول الطلب'} onPress={() => { setDriverRouteProgress(0); setDriverFollowMode(true); setDriverOrderStatus('accepted'); }} style={({ pressed }) => [styles.driverAcceptButton, pressed && styles.pressed]}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.driverAcceptText}>{isEnglish ? 'Accept order' : 'قبول الطلب'}</Text></Pressable>
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
          <Text style={styles.driverLocationTitle}>{isEnglish ? 'Client exact location' : 'موقع العميل الدقيق'}</Text>
          <Text style={styles.driverLocationCoordinates}>{clientLocation[1].toFixed(4)}, {clientLocation[0].toFixed(4)}</Text>
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
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 34 }}>
          <DriverHeader onBack={goBack} title={isEnglish ? 'Delivery route' : 'مسار التوصيل'} subtitle={isEnglish ? 'Follow the client location' : 'تابع موقع العميل'} />
          <View style={styles.driverMapTopCard}><View><Text style={styles.driverSectionEyebrow}>{isEnglish ? 'Delivering to' : 'التوصيل إلى'}</Text><Text style={styles.driverMapTopTitle}>{driverOrder.clientName}</Text><Text style={styles.driverMapTopSub}>{driverOrder.clientAddress}</Text></View><DriverOrderStatusPill /></View>
          <DriverMapPanel expanded />
           <DriverLocationSummary />
          <Pressable accessibilityLabel={isEnglish ? 'Open location in maps' : 'فتح الموقع في الخرائط'} onPress={openClientMap} style={({ pressed }) => [styles.driverOpenMapsButton, pressed && styles.pressed]}><Ionicons name="map-outline" size={18} color={colors.primary} /><Text style={styles.driverOpenMapsText}>{isEnglish ? 'Open in Maps' : 'فتح في الخرائط'}</Text><Ionicons name="arrow-forward" size={15} color={colors.primary} /></Pressable>
           {arrivedAtClient ? (
             <View style={styles.driverArrivalBanner}><Ionicons name="checkmark-circle" size={19} color={colors.green} /><Text style={styles.driverArrivalText}>{isEnglish ? 'You have reached the client location' : 'لقد وصلت إلى موقع العميل'}</Text></View>
           ) : null}
          <View style={styles.driverProgressCard}>
            <Text style={styles.driverSectionTitle}>{isEnglish ? 'Delivery progress' : 'تقدم التوصيل'}</Text>
            <View style={styles.driverProgressStep}><View style={[styles.driverProgressDot, styles.driverProgressDotDone]}><Ionicons name="checkmark" size={11} color="#fff" /></View><View style={styles.driverProgressCopy}><Text style={styles.driverProgressTitle}>{isEnglish ? 'Order accepted' : 'تم قبول الطلب'}</Text><Text style={styles.driverProgressSub}>{isEnglish ? 'Restaurant is preparing it' : 'المطعم يجهز الطلب'}</Text></View></View>
            <View style={styles.driverProgressLine} />
            <View style={styles.driverProgressStep}><View style={[styles.driverProgressDot, pickedUp && styles.driverProgressDotDone]}>{pickedUp ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}</View><View style={styles.driverProgressCopy}><Text style={[styles.driverProgressTitle, !pickedUp && styles.driverProgressMuted]}>{isEnglish ? 'Order picked up' : 'تم استلام الطلب'}</Text><Text style={styles.driverProgressSub}>{isEnglish ? 'Collect it from the restaurant' : 'استلمه من المطعم'}</Text></View></View>
            <View style={styles.driverProgressLine} />
            <View style={styles.driverProgressStep}><View style={[styles.driverProgressDot, delivered && styles.driverProgressDotDone]}>{delivered ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}</View><View style={styles.driverProgressCopy}><Text style={[styles.driverProgressTitle, !delivered && styles.driverProgressMuted]}>{isEnglish ? 'Delivered to client' : 'تم التسليم للعميل'}</Text><Text style={styles.driverProgressSub}>{isEnglish ? 'Complete the delivery' : 'أكمل عملية التوصيل'}</Text></View></View>
          </View>
          {!delivered ? (
             <View style={styles.driverPrimaryButtonWrap}><PrimaryButton disabled={pickedUp && !arrivedAtClient} label={pickedUp ? (arrivedAtClient ? (isEnglish ? 'Mark as delivered' : 'تأكيد التسليم') : (isEnglish ? 'Following route…' : 'جارٍ اتباع المسار…')) : (isEnglish ? 'I picked up the order' : 'استلمت الطلب')} onPress={() => { if (pickedUp && !arrivedAtClient) return; setDriverOrderStatus(pickedUp ? 'delivered' : 'pickedUp'); }} /></View>
          ) : (
            <View style={styles.driverPrimaryButtonWrap}><PrimaryButton label={isEnglish ? 'Back to driver center' : 'العودة إلى مركز السائق'} onPress={() => resetTo('driverDashboard')} /></View>
          )}
        </ScrollView>
      </View>
    );
  };

  const SettingsScreen = () => {
    const palette = themeMode === 'dark' ? colorTokens.dark : colorTokens.light;
    const settingsRows = [
      {
        key: 'language',
        label: isEnglish ? 'Language' : 'اللغة',
        value: isEnglish ? 'English' : 'العربية',
        icon: 'language-outline' as const,
        action: undefined,
      },
      {
        key: 'theme',
        label: isEnglish ? 'Theme' : 'المظهر',
        value: themeMode === 'dark' ? (isEnglish ? 'Dark' : 'داكن') : (isEnglish ? 'Light' : 'فاتح'),
        icon: themeMode === 'dark' ? 'moon-outline' as const : 'sunny-outline' as const,
        action: () => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark')),
      },
      {
        key: 'offers',
        label: isEnglish ? 'Offer notifications' : 'إشعارات العروض',
        value: isEnglish ? 'Best deals and updates' : 'أفضل العروض والتحديثات',
        icon: 'notifications-outline' as const,
        action: () => setOfferNotifications((current) => !current),
      },
    ];

    return (
      <View style={[styles.screen, { backgroundColor: palette.background }]}> 
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }} showsVerticalScrollIndicator={false}>
          <Header title={isEnglish ? 'Settings' : 'الإعدادات'} subtitle={isEnglish ? 'Preferences & account' : 'التفضيلات والحساب'} />

          <View style={[styles.settingsSection, { marginTop: 12 }]}> 
            <Text style={[styles.settingsLabel, { color: palette.mutedForeground }]}> {isEnglish ? 'Preferences' : 'التفضيلات'} </Text>

            {settingsRows.map((row) => {
              const isToggleRow = row.key === 'offers';
              const active = row.key === 'theme' ? themeMode === 'dark' : row.key === 'offers' ? offerNotifications : false;

              return (
                <Pressable
                  key={row.key}
                  style={[
                    styles.settingsRow,
                    {
                      backgroundColor: palette.card,
                      borderBottomColor: palette.border,
                    },
                  ]}
                  onPress={row.action}
                >
                  <View style={[styles.accountRowIcon, { backgroundColor: palette.muted }]}>
                    <Ionicons name={row.icon} size={20} color={palette.primary} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountRowTitle, { color: palette.foreground }]}>{row.label}</Text>
                    <Text style={[styles.accountRowSub, { color: palette.mutedForeground }]}>{row.value}</Text>
                  </View>

                  {isToggleRow ? (
                    <View style={[styles.toggleBase, { backgroundColor: active ? palette.primary : palette.muted, borderColor: palette.border }]}>
                      <View style={[styles.toggleKnob, active && styles.toggleKnobOn]} />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
                  )}
                </Pressable>
              );
            })}

            <Text style={[styles.settingsLabel, { color: palette.mutedForeground, marginTop: 22 }]}> {isEnglish ? 'About Tawsel' : 'حول توصيل'} </Text>

            {[
              { label: isEnglish ? 'Terms & conditions' : 'الشروط والأحكام', icon: 'document-text-outline' as const, action: () => Alert.alert(isEnglish ? 'Terms & conditions' : 'الشروط والأحكام', isEnglish ? 'These will be displayed here in the next release.' : 'سيتم عرض هذه المعلومات هنا في الإصدار القادم.') },
              { label: isEnglish ? 'Privacy policy' : 'سياسة الخصوصية', icon: 'shield-checkmark-outline' as const, action: () => Alert.alert(isEnglish ? 'Privacy policy' : 'سياسة الخصوصية', isEnglish ? 'Your data is protected and used only for service delivery.' : 'يتم حماية بياناتك واستخدامها فقط لتقديم الخدمة.') },
            ].map((item) => (
              <Pressable
                key={item.label}
                style={[
                  styles.settingsRow,
                  {
                    backgroundColor: palette.card,
                    borderBottomColor: palette.border,
                  },
                ]}
                onPress={item.action}
              >
                <View style={[styles.accountRowIcon, { backgroundColor: palette.muted }]}>
                  <Ionicons name={item.icon} size={20} color={palette.primary} />
                </View>
                <Text style={[styles.accountRowTitle, { flex: 1, color: palette.foreground }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={palette.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const NotificationsScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }}><Header title="الإشعارات" subtitle="Notifications" /><View style={styles.notificationList}>{[{ title: 'تم تأكيد طلبك', sub: 'طلبك من بيتزا هت قيد التحضير الآن', time: 'منذ 5 دقائق', icon: 'checkmark-circle-outline' as const, tint: colors.paleGreen }, { title: 'عرض خاص لك', sub: 'خصم 20% على أول طلب لك اليوم', time: 'منذ ساعة', icon: 'pricetag-outline' as const, tint: colors.coral }, { title: 'طلبك وصل', sub: 'نتمنى لك وجبة شهية، محمد', time: 'أمس', icon: 'bicycle-outline' as const, tint: '#E8EFF8' }].map((item) => <View key={item.title} style={styles.notificationRow}><View style={[styles.notificationIcon, { backgroundColor: item.tint }]}><Ionicons name={item.icon} size={21} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.notificationTitle}>{item.title}</Text><Text style={styles.notificationSub}>{item.sub}</Text><Text style={styles.notificationTime}>{item.time}</Text></View><View style={styles.unreadDot} /></View>)}</View></ScrollView></View>;

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
          <LinearGradient colors={[colors.primary, '#D97706']} style={styles.supportHero}>
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
                <Ionicons name="arrow-forward" size={13} color={colors.mutedForeground} />
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

  const AddressesScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 28 }}><Header title="عناويني" subtitle="My addresses" /><View style={styles.addressList}><Pressable style={[styles.savedAddress, styles.savedAddressActive]} onPress={() => { setAddress('شارع النيل، الخرطوم، السودان'); go('home'); }}><View style={styles.addressRadio}><View style={styles.addressRadioDot} /></View><View style={{ flex: 1 }}><Text style={styles.savedAddressTitle}>المنزل</Text><Text style={styles.savedAddressText}>شارع النيل، الخرطوم، السودان</Text></View><Ionicons name="pencil-outline" size={17} color={colors.mutedForeground} /></Pressable><Pressable style={styles.savedAddress}><View style={styles.addressRadio} /><View style={{ flex: 1 }}><Text style={styles.savedAddressTitle}>المكتب</Text><Text style={styles.savedAddressText}>شارع الجامعة، الخرطوم</Text></View><Ionicons name="pencil-outline" size={17} color={colors.mutedForeground} /></Pressable><Pressable style={styles.addAddressRow}><Ionicons name="add-circle-outline" size={22} color={colors.primary} /><Text style={styles.addAddressText}>إضافة عنوان جديد</Text></Pressable></View></ScrollView></View>;

  const PaymentsScreen = () => <View style={styles.screen}><StatusBar style="dark" /><ScrollView contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 28 }}><View style={styles.pageTop}><Text style={styles.pageTitle}>{isEnglish ? 'Payment methods' : 'طرق الدفع'}</Text><Text style={styles.pageSubtitle}>{isEnglish ? 'Choose how you want to pay' : 'اختر طريقة الدفع المناسبة لك'}</Text></View><View style={styles.paymentList}><Pressable style={[styles.savedPayment, { flexDirection: 'row-reverse', direction: 'rtl', writingDirection: 'rtl' }]} onPress={() => go('home')}><View style={styles.savedPaymentIcon}><Ionicons name="card-outline" size={22} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.savedPaymentTitle, { textAlign: 'right' }]}>Visa</Text><Text style={[styles.savedPaymentSub, { textAlign: 'right' }]}>•••• 4242</Text></View><Ionicons name="checkmark-circle" size={22} color={colors.primary} /></Pressable><Pressable style={[styles.savedPayment, { flexDirection: 'row-reverse', direction: 'rtl', writingDirection: 'rtl' }]} onPress={() => go('home')}><View style={[styles.savedPaymentIcon, { backgroundColor: colors.paleGreen }]}><Ionicons name="cash-outline" size={22} color={colors.green} /></View><View style={{ flex: 1 }}><Text style={[styles.savedPaymentTitle, { textAlign: 'right' }]}>الدفع نقداً</Text><Text style={[styles.savedPaymentSub, { textAlign: 'right' }]}>عند الاستلام</Text></View><Ionicons name="checkmark-circle-outline" size={22} color={colors.mutedForeground} /></Pressable><Pressable style={[styles.addAddressRow, { flexDirection: 'row-reverse', direction: 'rtl', writingDirection: 'rtl' }]} onPress={() => go('payment')}><Ionicons name="add-circle-outline" size={22} color={colors.primary} /><Text style={styles.addAddressText}>إضافة طريقة دفع</Text></Pressable></View></ScrollView></View>;

  const renderScreen = () => {
    switch (screen) {
      case 'intro': return <IntroScreen />;
      case 'login': return <AuthScreen />;
      case 'register': return <AuthScreen register />;
      case 'home': return (
        <HomeTab
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          go={go}
          address={address}
          addToCart={addToCart}
          chooseProduct={chooseProduct}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          setCategoryQuery={setCategoryQuery}
          setShowAllCategoryProducts={setShowAllCategoryProducts}
          showAllCategoryProducts={showAllCategoryProducts}
          setShowCategoryFilters={setShowCategoryFilters}
          products={products}
          productCategoryFilters={productCategoryFilters}
          selectedRestaurant={selectedRestaurant}
          setSelectedRestaurant={setSelectedRestaurant}
          restaurants={restaurants}
          money={money}
          cartCount={cartCount}
          topPad={topPad}
          bottomPad={bottomPad}
          BottomTabs={BottomTabs}
        />
      );
      case 'categories': return (
        <CategoriesTab
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          categoryQuery={categoryQuery}
          setCategoryQuery={setCategoryQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          sortOption={sortOption}
          setSortOption={setSortOption}
          setShowAllCategoryProducts={setShowAllCategoryProducts}
          showAllCategoryProducts={showAllCategoryProducts}
          setShowCategoryFilters={setShowCategoryFilters}
          showCategoryFilters={showCategoryFilters}
          focusCategorySearch={focusCategorySearch}
          setFocusCategorySearch={setFocusCategorySearch}
          products={products}
          productCategoryFilters={productCategoryFilters}
          tap={tap}
          chooseProduct={chooseProduct}
          addToCart={addToCart}
          money={money}
          topPad={topPad}
          bottomPad={bottomPad}
          BottomTabs={BottomTabs}
        />
      );
      case 'restaurant': return <RestaurantScreen />;
      case 'product': return <ProductScreen />;
      case 'cart': return <CartScreenComponent />;
      case 'address': return <AddressScreenComponent />;
      case 'payment': return <PaymentScreenComponent />;
      case 'review': return <ReviewScreenComponent />;
      case 'track': return <TrackScreen />;
      case 'orders': return (
        <OrdersTab
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          orderFilter={orderFilter}
          setOrderFilter={setOrderFilter}
          setExpandedOrderId={setExpandedOrderId}
          tap={tap}
          expandedOrderId={expandedOrderId}
          products={products}
          addToCart={addToCart}
          money={money}
          go={go}
          topPad={topPad}
          bottomPad={bottomPad}
          BottomTabs={BottomTabs}
        />
      );
      case 'favorites': return <FavoritesScreen />;
      case 'account': return (
        <AccountTab
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          name={name}
          phone={phone}
          offerNotifications={offerNotifications}
          setOfferNotifications={setOfferNotifications}
          go={go}
          setIsEditingProfile={setIsEditingProfile}
          isEditingProfile={isEditingProfile}
          setName={setName}
          setPhone={setPhone}
          topPad={topPad}
          bottomPad={bottomPad}
          BottomTabs={BottomTabs}
        />
      );
      case 'settings': return <SettingsScreen />;
      case 'notifications': return <NotificationsScreen />;
      case 'support': return <SupportScreen />;
      case 'driverSupport': return (
        <DriverSupportScreen
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          go={go}
          driverSupportQuery={driverSupportQuery}
          setDriverSupportQuery={setDriverSupportQuery}
          driverSupportMessage={driverSupportMessage}
          setDriverSupportMessage={setDriverSupportMessage}
          driverSupportSent={driverSupportSent}
          setDriverSupportSent={setDriverSupportSent}
          setExpandedDriverFaq={setExpandedDriverFaq}
          expandedDriverFaq={expandedDriverFaq}
        />
      );
      case 'addresses': return <AddressesScreen />;
      case 'payments': return <PaymentsScreen />;
      case 'driverDashboard': return (
        <DriverDashboardScreen
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          driverOnline={driverOnline}
          setDriverOnline={setDriverOnline}
          driverOrderStatus={driverOrderStatus}
          go={go}
          money={money}
          setScreen={setScreen}
        />
      );
      case 'driverDeliveries': return (
        <DriverDeliveriesScreen
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          driverOrderStatus={driverOrderStatus}
          go={go}
        />
      );
      case 'driverEarnings': return (
        <DriverEarningsScreen
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          go={go}
        />
      );
      case 'driverAccount': return (
        <DriverAccountScreen
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          name={name}
          phone={phone}
          go={go}
          setIsEditingProfile={setIsEditingProfile}
          isEditingProfile={isEditingProfile}
          setName={setName}
          setPhone={setPhone}
        />
      );
      case 'driverSettings': return (
        <DriverSettingsScreen
          styles={styles}
          colors={colors}
          isEnglish={isEnglish}
          driverNotifications={driverNotifications}
          setDriverNotifications={setDriverNotifications}
          setIsEnglish={setIsEnglish}
          go={go}
          resetTo={resetTo}
        />
      );
      case 'driverOrder': return <DriverOrderScreen />;
      case 'driverMap': return <DriverMapScreen />;
    }
  };

  return (
    <LanguageContext.Provider value={isEnglish}>
      <View style={[styles.appRoot, { direction: appDirection }]}>{renderScreen()}</View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.cream, paddingTop: 12 },
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
  authBrandName: { color: colors.primary, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  authBrandCaption: { color: colors.mutedForeground, fontSize: 9, marginTop: 2, textAlign: 'right' },
  authEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textAlign: 'right', marginBottom: 6 },
  authTitle: { fontSize: 25, color: colors.ink, fontWeight: '700', textAlign: 'right' },
  authSubtitle: { color: colors.mutedForeground, fontSize: 14, lineHeight: 22, marginTop: 7, marginBottom: 20, textAlign: 'right' },
  authFormCard: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 15, shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  authFieldGroup: { marginBottom: 13 },
  authFieldLabel: { color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 7 },
  inputWrap: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.cream, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 0 },
  authFieldFocused: { borderColor: colors.primary, backgroundColor: '#fff' },
  input: { minWidth: 0, flexShrink: 1, fontSize: 14, color: colors.ink, height: 52, paddingHorizontal: 12 },
  phoneRow: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.cream, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 6, marginBottom: 0, overflow: 'hidden' },
  countryCode: { flexShrink: 0, height: 42, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRightWidth: 1, borderRightColor: colors.border },
  countryFlag: { color: colors.primary, fontSize: 15 },
  countryText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  authHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, marginBottom: 15, paddingHorizontal: 2 },
  authHintText: { flex: 1, color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  termsLink: { color: colors.primary, fontWeight: '700' },
  authSwitch: { alignItems: 'center', marginTop: 25 },
  authSwitchText: { color: colors.mutedForeground, fontSize: 13 },
  driverHeader: { position: 'relative', paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  driverHeaderButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  driverHeaderButtonPlaceholder: { width: 42, height: 42 },
  driverHeaderCopy: { position: 'absolute', left: '50%', top: 0, bottom: 0, transform: [{ translateX: -50 }], alignItems: 'center', justifyContent: 'center', paddingHorizontal: 52, width: 220, maxWidth: '68%' },
  driverHeaderTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', alignSelf: 'center' },
  driverHeaderSubtitle: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'center', alignSelf: 'center' },
  driverWelcome: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverWelcomeIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  driverWelcomeCopy: { flex: 1 },
  driverWelcomeTitle: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'right' },
  driverWelcomeSub: { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 4, textAlign: 'right' },
  driverLiveTag: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  driverLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8FF0A7' },
  driverLiveText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  driverOnlineCard: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  driverOnlineCopy: { flex: 1 },
  driverSectionEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  driverOnlineTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  driverOnlineSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, lineHeight: 14, textAlign: 'right' },
  driverToggle: { width: 49, height: 29, borderRadius: 16, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  driverToggleOn: { backgroundColor: colors.green },
  driverToggleKnob: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#fff' },
  driverToggleKnobOn: { alignSelf: 'flex-end' },
  driverStatsRow: { marginHorizontal: 20, flexDirection: 'row-reverse', gap: 9, marginBottom: 22 },
  driverStatCard: { flex: 1, minHeight: 73, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  driverStatValue: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  driverStatLabel: { color: colors.mutedForeground, fontSize: 9, marginTop: 5 },
  driverSectionHeader: { marginHorizontal: 20, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between' },
  driverSectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  driverSectionHint: { color: colors.primary, fontSize: 9, fontWeight: '700' },
  driverTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.98)', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row-reverse', justifyContent: 'space-around', paddingTop: 9 },
  driverTabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 51, gap: 3 },
  driverTabLabel: { color: colors.mutedForeground, fontSize: 8, fontWeight: '600', textAlign: 'center' },
  driverTabLabelActive: { color: colors.primary, fontWeight: '800' },
  driverTabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 1 },
  driverTabIntro: { marginHorizontal: 20, marginBottom: 21, padding: 16, borderRadius: 18, backgroundColor: colors.coral, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  driverTabIntroTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 5, textAlign: 'right' },
  driverTabCount: { width: 61, height: 61, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  driverTabCountValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  driverTabCountLabel: { color: colors.mutedForeground, fontSize: 8, marginTop: 2 },
  driverTabSectionTitle: { marginHorizontal: 20, marginBottom: 10, color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  driverDeliveryCard: { marginHorizontal: 20, marginBottom: 22, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverDeliveryCardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  driverDeliveryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverDeliveryCopy: { flex: 1 },
  driverDeliveryTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  driverDeliverySub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'right' },
  driverDeliveryRoute: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  driverDeliveryRouteText: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  driverDeliveryFooter: { marginTop: 12, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  driverDeliveryMeta: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  driverDeliveryAction: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverHistoryRow: { marginHorizontal: 20, marginBottom: 9, padding: 12, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  driverHistoryIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center' },
  driverHistoryCopy: { flex: 1 },
  driverHistoryTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  driverHistorySub: { color: colors.mutedForeground, fontSize: 8, marginTop: 3, textAlign: 'right' },
  driverHistoryAmount: { alignItems: 'flex-end' },
  driverHistoryPrice: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  driverHistoryStatus: { color: colors.green, fontSize: 8, marginTop: 3, fontWeight: '700' },
  driverEarningsHero: { marginHorizontal: 20, marginBottom: 14, padding: 18, borderRadius: 20, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  driverEarningsEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, textAlign: 'right' },
  driverEarningsValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 5, textAlign: 'right' },
  driverEarningsCurrency: { fontSize: 12, fontWeight: '700' },
  driverEarningsSub: { color: '#A5F0B5', fontSize: 9, marginTop: 3, textAlign: 'right' },
  driverEarningsIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  driverPanelCard: { marginHorizontal: 20, marginBottom: 14, padding: 15, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverPanelCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  driverPanelHint: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverBars: { height: 136, flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-around', gap: 7 },
  driverBarColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  driverBarTrack: { width: '100%', maxWidth: 22, height: 105, borderRadius: 9, backgroundColor: colors.coral, justifyContent: 'flex-end', overflow: 'hidden' },
  driverBarFill: { width: '100%', borderRadius: 9, backgroundColor: colors.primary },
  driverBarLabel: { color: colors.mutedForeground, fontSize: 9, fontWeight: '700' },
  driverPayoutRow: { marginHorizontal: 20, padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverPayoutIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverPayoutCopy: { flex: 1 },
  driverPayoutTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  driverPayoutSub: { color: colors.mutedForeground, fontSize: 8, marginTop: 3, textAlign: 'right' },
  driverProfileCard: { marginHorizontal: 20, marginBottom: 14, padding: 20, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  driverProfileAvatar: { width: 67, height: 67, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  driverProfileName: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  driverProfilePhone: { color: colors.mutedForeground, fontSize: 10, marginTop: 4 },
  driverRatingPill: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.coral, flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  driverRatingText: { color: colors.ink, fontSize: 9, fontWeight: '700' },
  driverProfileRow: { minHeight: 57, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverProfileRowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverProfileRowCopy: { flex: 1 },
  driverProfileRowLabel: { color: colors.mutedForeground, fontSize: 9, textAlign: 'right' },
  driverProfileRowValue: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'right' },
  driverEditProfileButton: { marginHorizontal: 20, minHeight: 47, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7, marginBottom: 14 },
  driverEditProfileText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  driverProfileEditPanel: { marginHorizontal: 20, marginBottom: 14, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: 8 },
  driverProfileInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.input, backgroundColor: colors.cream, color: colors.ink, paddingHorizontal: 12, fontSize: 12 },
  driverProfileSaveButton: { minHeight: 42, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  driverProfileSaveText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  driverSettingsSection: { marginHorizontal: 20, marginTop: 4, marginBottom: 9, color: colors.primary, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  driverSettingRow: { marginHorizontal: 20, marginBottom: 9, padding: 13, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverSettingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverSettingCopy: { flex: 1 },
  driverSettingTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  driverSettingSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
  driverSupportHero: { marginHorizontal: 20, marginBottom: 14, padding: 17, borderRadius: 19, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  driverSupportHeroIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  driverSupportHeroCopy: { flex: 1 },
  driverSupportHeroTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  driverSupportHeroSub: { color: 'rgba(255,255,255,0.74)', fontSize: 9, lineHeight: 15, marginTop: 4, textAlign: 'right' },
  driverSupportSearch: { marginHorizontal: 20, marginBottom: 18, height: 48, paddingHorizontal: 13, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  driverSupportSearchInput: { flex: 1, height: 45, color: colors.ink, fontSize: 11 },
  driverSupportSection: { marginHorizontal: 20, marginBottom: 9, color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  driverSupportContactRow: { marginHorizontal: 20, marginBottom: 20, flexDirection: 'row-reverse', gap: 9 },
  driverSupportContact: { flex: 1, minHeight: 91, padding: 11, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', gap: 11 },
  driverSupportContactIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  driverSupportWhatsapp: { backgroundColor: colors.paleGreen },
  driverSupportContactTitle: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  driverSupportContactSub: { color: colors.mutedForeground, fontSize: 8, marginTop: 3 },
  driverSupportSectionRow: { marginBottom: 9, flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between' },
  driverSupportCount: { marginHorizontal: 20, color: colors.mutedForeground, fontSize: 9 },
  driverFaqRow: { marginHorizontal: 20, marginBottom: 8, padding: 13, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 9 },
  driverFaqRowExpanded: { borderColor: colors.primary, backgroundColor: '#FFF9F9' },
  driverFaqCopy: { flex: 1 },
  driverFaqQuestion: { color: colors.ink, fontSize: 10, fontWeight: '800', lineHeight: 16, textAlign: 'right' },
  driverFaqAnswer: { color: colors.mutedForeground, fontSize: 9, lineHeight: 15, marginTop: 8, textAlign: 'right' },
  driverSupportEmpty: { marginHorizontal: 20, marginBottom: 20, padding: 22, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  driverSupportEmptyTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 8 },
  driverSupportEmptySub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'center' },
  driverSupportSuccess: { marginHorizontal: 20, marginBottom: 8, padding: 11, borderRadius: 12, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  driverSupportSuccessText: { color: colors.green, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  driverSupportComposer: { marginHorizontal: 20, minHeight: 92, padding: 10, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 },
  driverSupportMessageInput: { flex: 1, minHeight: 68, maxHeight: 96, color: colors.ink, fontSize: 10, lineHeight: 15, textAlignVertical: 'top' },
  driverSupportSend: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverSupportSendDisabled: { opacity: 0.4 },
  driverStatusPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  driverStatusPillPending: { backgroundColor: colors.accent },
  driverStatusPillRejected: { backgroundColor: colors.coral },
  driverStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  driverStatusPillText: { color: colors.green, fontSize: 9, fontWeight: '800' },
  driverIncomingCard: { marginHorizontal: 20, padding: 14, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary, marginBottom: 12 },
  driverIncomingTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverIncomingIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  driverIncomingCopy: { flex: 1 },
  driverOrderTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  driverOrderTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'right' },
  driverRestaurantName: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 7, textAlign: 'right' },
  driverRestaurantDetail: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
  driverOrderRouteRow: { marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  driverRouteIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverRouteCopy: { flex: 1 },
  driverRouteTitle: { color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  driverRouteSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'right' },
  driverOrderFooter: { marginTop: 13, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  driverOrderTotal: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  driverReviewLink: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  driverActiveCard: { marginHorizontal: 20, padding: 14, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  driverActiveTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  driverActiveTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  driverActiveSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'right' },
  driverActiveFooter: { marginTop: 11, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  driverMapLink: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  driverDeliveredCard: { marginHorizontal: 20, padding: 18, borderRadius: 18, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  driverDeliveredIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  driverDeliveredCopy: { flex: 1 },
  driverDeliveredTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  driverDeliveredSub: { color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'right' },
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
  driverMapClientLabel: { position: 'absolute', right: 14, bottom: 13, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  driverMapClientDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  driverMapClientLabelText: { color: colors.ink, fontSize: 9, fontWeight: '800' },
  driverMapDistance: { position: 'absolute', left: 14, bottom: 13, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  driverMapDistanceText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  driverOrderHero: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverOrderHeroIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverOrderHeroCopy: { flex: 1 },
  driverOrderHeroTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  driverOrderHeroSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  driverDetailCard: { marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverDetailCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  driverOrderId: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  driverDetailRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  driverDetailIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverDetailCopy: { flex: 1 },
  driverDetailLabel: { color: colors.mutedForeground, fontSize: 9, textAlign: 'right' },
  driverDetailValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 3, textAlign: 'right' },
  driverDetailSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
  driverSmallAction: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  driverDetailDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  driverSummaryText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'right' },
  driverInfoStrip: { marginTop: 12, padding: 9, borderRadius: 10, backgroundColor: colors.muted, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  driverInfoStripText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  driverMapSectionTitle: { marginHorizontal: 20, color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', marginTop: 8, marginBottom: 9 },
  driverDecisionRow: { marginHorizontal: 20, marginTop: 16, flexDirection: 'row-reverse', gap: 9 },
  driverPrimaryButtonWrap: { marginHorizontal: 20, marginTop: 16 },
  driverDeclineButton: { flex: 0.8, minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  driverDeclineText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  driverAcceptButton: { flex: 1.2, minHeight: 54, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  driverAcceptText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  driverSuccessBanner: { marginHorizontal: 20, minHeight: 52, borderRadius: 14, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  driverSuccessText: { color: colors.green, fontSize: 11, fontWeight: '800' },
  driverMapTopCard: { marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  driverMapTopTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  driverMapTopSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  driverOpenMapsButton: { marginHorizontal: 20, marginTop: 10, minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  driverOpenMapsText: { color: colors.primary, fontSize: 11, fontWeight: '800', flex: 1, textAlign: 'center' },
  driverLocationSummary: { marginHorizontal: 20, marginTop: 12, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, gap: 11 },
  driverLocationItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  driverLocationDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  driverLocationDotDriver: { backgroundColor: colors.ink, shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  driverLocationDotClient: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  driverLocationCopy: { flex: 1 },
  driverLocationTitle: { color: colors.ink, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  driverLocationCoordinates: { color: colors.mutedForeground, fontSize: 9, marginTop: 2, textAlign: 'right' },
  driverLocationDivider: { height: 1, backgroundColor: colors.border, marginLeft: 19 },
  driverLocationEta: { paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  driverLocationEtaText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  driverArrivalBanner: { marginHorizontal: 20, marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: colors.paleGreen, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  driverArrivalText: { color: colors.green, fontSize: 10, fontWeight: '800' },
  driverProgressCard: { marginHorizontal: 20, marginTop: 18, marginBottom: 17, padding: 15, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  driverProgressStep: { minHeight: 52, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  driverProgressDot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  driverProgressDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  driverProgressCopy: { flex: 1 },
  driverProgressTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  driverProgressMuted: { color: colors.mutedForeground },
  driverProgressSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
  driverProgressLine: { width: 1.5, height: 24, backgroundColor: colors.border, marginLeft: 11, marginTop: -4, marginBottom: -4 },
  homeTop: { paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  homeGreeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1, width: '100%' },
  greetingCopy: { alignItems: 'center', justifyContent: 'center' },
  clientAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.coral },
  helloText: { color: colors.ink, fontSize: 22, fontWeight: '700', textAlign: 'center', fontFamily: 'IBM Arabic' },
  wave: { color: colors.accent, fontFamily: 'IBM Arabic' },
  locationLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5 },
  locationText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center' },
  searchBox: { height: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginHorizontal: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 17, overflow: 'hidden' },
  searchBoxIcon: { flexShrink: 0 },
  searchInput: { flex: 1, minWidth: 0, flexShrink: 1, height: 46, color: colors.ink, fontSize: 13 },
  searchClearButton: { width: 28, height: 30, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  promoCard: { height: 155, borderRadius: 20, overflow: 'hidden', marginHorizontal: 20, backgroundColor: colors.primary, position: 'relative', marginBottom: 24, paddingRight: 60, paddingVertical: 19 },
  promoImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(104, 4, 18, 0.72)' },
  promoCopy: { position: 'absolute', top: 19, width: '95%', alignItems: 'flex-start', paddingHorizontal: 20 },
  promoEyebrow: { color: '#000', fontSize: 11, fontWeight: '600', marginBottom: 5, textAlign: 'right' },
  promoTitle: { color: '#000', fontSize: 25, fontWeight: '800', textAlign: 'right' },
  promoTitleSmall: { fontSize: 14, fontWeight: '600', textAlign: 'right', color: '#000' },
  promoCode: { color: '#000', fontSize: 10, letterSpacing: 2, marginTop: 9, opacity: 0.84, textAlign: 'right' },
  promoArrow: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 17 },
  promoArrowEnglish: { right: 17 },
  promoArrowArabic: { left: 17 },
  sectionTitleRow: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', textAlign: 'left', fontFamily: 'IBM Arabic', flex: 1 },
  sectionAction: { color: colors.primary, fontSize: 12, fontWeight: '600', fontFamily: 'IBM Arabic', textAlign: 'left' },
  categorySectionHeader: { paddingHorizontal: 20, flexDirection: 'column', alignItems: 'center', marginBottom: 16 },
  homeChoicesSubtitle: { marginHorizontal: 20, marginTop: -6, marginBottom: 12, color: colors.mutedForeground, fontSize: 10, textAlign: 'left', fontFamily: 'IBM Arabic' },
  horizontalList: { paddingHorizontal: 20, gap: 11, marginBottom: 25 },
  categoryCard: { width: 82, alignItems: 'center' },
  categoryIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  categorySub: { color: colors.mutedForeground, fontSize: 9, marginTop: 2 },
  restaurantCard: { width: 214, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  restaurantImage: { width: '100%', height: 118 },
  restaurantTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  restaurantTagText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  restaurantMeta: { padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  restaurantName: { color: colors.ink, fontSize: 14, fontWeight: '700', textAlign: 'left' },
  restaurantType: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  productGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 11, paddingHorizontal: 20, marginBottom: 12 },
  productCard: { width: '47.8%', backgroundColor: '#fff', borderRadius: 17, padding: 9, borderWidth: 1, borderColor: colors.border },
  productImageWrap: { height: 125, borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 9 },
  productImage: { width: '100%', height: '100%' },
  addCircle: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 7, right: 7 },
  productTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  productSubtitle: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'center' },
  productBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 },
  price: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  miniRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniRatingText: { color: colors.mutedForeground, fontSize: 10 },
  bottomTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 },
  tabButton: { alignItems: 'center', width: 62, position: 'relative' },
  tabLabel: { color: colors.mutedForeground, fontSize: 9, marginTop: 4 },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4 },
  tabCartBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, position: 'absolute', top: -3, right: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  floatingCart: { width: 47, height: 47, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -24, left: 20, shadowColor: colors.shadow, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  cartBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, position: 'absolute', top: -2, right: -2, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: colors.accentForeground, fontSize: 9, fontWeight: '800' },
  pageTop: { paddingHorizontal: 20, marginBottom: 19, width: '100%', alignItems: 'center' },
  pageTitle: { color: colors.ink, fontSize: 27, fontWeight: '800', textAlign: 'center' },
  pageSubtitle: { color: colors.mutedForeground, fontSize: 13, marginTop: 5, textAlign: 'center' },
  categoryIntroCard: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryIntroIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  categoryIntroCopy: { flex: 1 },
  categoryIntroTitle: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  categoryIntroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 9, marginTop: 4, textAlign: 'center' },
  categoryIntroCount: { minWidth: 42, alignItems: 'center' },
  categoryIntroCountValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  categoryIntroCountLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 8, marginTop: 1 },
  categoryGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 54 },
  categoryGridItem: { width: '48.5%', minHeight: 112, padding: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  categoryGridItemActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  categoryGridIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  categoryGridTitle: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  categoryGridTitleActive: { color: '#FFFFFF' },
  largeCategory: { width: '100%', minHeight: 84, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  largeCategoryActive: { borderColor: colors.primary, backgroundColor: colors.coral },
  largeCategoryIcon: { width: 51, height: 51, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  largeCategoryCopy: { flex: 1 },
  largeCategoryTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  largeCategoryTitleActive: { color: colors.primary },
  largeCategorySub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'center' },
  filterButton: { width: 30, height: 30, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  filterButtonActive: { backgroundColor: colors.coral },
  categoryFilterButton: { marginHorizontal: 20, marginTop: -9, marginBottom: 14, minHeight: 58, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryFilterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryFilterButtonIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  categoryFilterButtonCopy: { flex: 1, alignItems: 'flex-start' },
  categoryFilterButtonTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'left' },
  categoryFilterButtonTitleActive: { color: '#fff' },
  categoryFilterButtonSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 2, textAlign: 'left' },
  categoryFilterButtonSubActive: { color: 'rgba(255,255,255,0.76)' },
  categoryFilterModalRoot: { flex: 1, justifyContent: 'flex-end' },
  categoryFilterBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 24, 39, 0.48)' },
  categoryFilterSheet: { maxHeight: '82%', minHeight: '48%', backgroundColor: colors.cream, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: -5 }, elevation: 12 },
  categoryFilterSheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 17 },
  categoryFilterSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  categoryFilterSheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', textAlign: 'left' },
  categoryFilterSheetSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4, textAlign: 'left' },
  categoryFilterSheetClose: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  categoryFilterCurrent: { minHeight: 46, borderRadius: 14, backgroundColor: colors.coral, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 15 },
  categoryFilterCurrentText: { flex: 1, color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  categoryFilterModalList: { gap: 9, paddingBottom: 12 },
  categoryFilterModalSectionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left', marginBottom: 9 },
  categorySortList: { gap: 8, marginBottom: 18 },
  categorySortOption: { minHeight: 44, paddingHorizontal: 12, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
  categorySortOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categorySortOptionText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'left' },
  categorySortOptionTextActive: { color: '#fff' },
  categoryFilterPanel: { marginHorizontal: 20, marginTop: 5, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingTop: 12, paddingBottom: 2 },
  homeFilterPanel: { marginHorizontal: 20, marginTop: -7, marginBottom: 17, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingTop: 12, paddingBottom: 2 },
  categoryFilterHeader: { paddingHorizontal: 13, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  categoryFilterHeaderTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  categoryFilterHeaderSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  categoryFilterClose: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.muted },
  categoryFilterList: { paddingHorizontal: 20, paddingVertical: 17, gap: 8 },
  categoryFilter: { alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingVertical: 8 },
  categoryFilterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryFilterText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
  categoryFilterTextActive: { color: '#fff' },
  categoryResultHeader: { paddingHorizontal: 20, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 11 },
  categoryResultSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 2, textAlign: 'right' },
  deliveryHint: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, flexDirection: 'row-reverse', gap: 4, paddingHorizontal: 9, paddingVertical: 7 },
  deliveryHintText: { color: colors.accentForeground, fontSize: 10, fontWeight: '700' },
  loadMoreButton: { alignItems: 'center', alignSelf: 'center', borderColor: colors.primary, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 5, marginBottom: 8, paddingHorizontal: 18, paddingVertical: 9 },
  loadMoreText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  categoryEmpty: { alignItems: 'center', marginHorizontal: 20, marginTop: 10, paddingHorizontal: 18, paddingVertical: 28, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  emptyReset: { backgroundColor: colors.primary, borderRadius: 12, marginTop: 16, paddingHorizontal: 15, paddingVertical: 9 },
  emptyResetText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  restaurantHero: { height: 270, position: 'relative', marginBottom: 0 },
  restaurantHeroImage: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  heroBack: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 16, left: 18 },
  heroHeart: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 16, right: 18 },
  heroRestaurantInfo: { position: 'absolute', bottom: 18, left: 18, right: 18, borderRadius: 18, padding: 12, backgroundColor: 'rgba(255,255,255,0.96)', flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  avatarSquare: { width: 41, height: 41, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '800', fontSize: 20 },
  heroTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  heroSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  heroRating: { marginLeft: 'auto', flexDirection: 'row', gap: 3, alignItems: 'center' },
  heroRatingText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  restaurantTabs: { flexDirection: 'row-reverse', gap: 25, paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  restaurantTabActive: { color: colors.primary, fontWeight: '800', fontSize: 13, paddingBottom: 9, borderBottomWidth: 2, borderBottomColor: colors.primary },
  restaurantTab: { color: colors.mutedForeground, fontSize: 13 },
  menuList: { paddingHorizontal: 20, paddingTop: 9 },
  menuItem: { minHeight: 95, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12, flexDirection: 'row-reverse', gap: 12, alignItems: 'center' },
  menuImage: { width: 79, height: 70, borderRadius: 14 },
  menuCopy: { flex: 1 },
  menuTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  menuSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  menuPrice: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 7, textAlign: 'right' },
  menuAdd: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cartBar: { position: 'absolute', left: 18, right: 18, height: 56, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 13, gap: 10, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  cartBarIcon: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cartBarCount: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cartBarText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  cartBarTotal: { color: '#fff', fontSize: 13, fontWeight: '800' },
  productHero: { height: 330, position: 'relative', backgroundColor: colors.coral },
  productHeroImage: { width: '100%', height: '100%' },
  productDetail: { paddingHorizontal: 20, paddingTop: 20 },
  detailTitleRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between' },
  detailTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', textAlign: 'right' },
  detailSubtitle: { color: colors.mutedForeground, fontSize: 12, marginTop: 5, textAlign: 'right' },
  detailPrice: { color: colors.primary, fontSize: 18, fontWeight: '800', marginTop: 5 },
  detailRating: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 13 },
  detailRatingText: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  detailDot: { color: colors.mutedForeground },
  detailMuted: { color: colors.mutedForeground, fontSize: 11 },
  detailSection: { color: colors.ink, fontWeight: '800', fontSize: 16, textAlign: 'right', marginTop: 26, marginBottom: 8 },
  detailDescription: { color: colors.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'right' },
  quantityCard: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  quantityLabel: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  quantityButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
  stickyCta: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 10, paddingHorizontal: 18, backgroundColor: colors.cream },
  header: { position: 'relative', minHeight: 104, paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream },
  headerStatic: { position: 'relative', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  headerSide: { width: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', alignSelf: 'center', textAlign: 'center' },
  headerSubtitle: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'center', alignSelf: 'center' },
  headerIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  headerActionSpacer: { width: 40, height: 40 },
  cartRestaurant: { marginHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  smallAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cartRestaurantTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  cartRestaurantSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  cartItems: { paddingHorizontal: 20, marginTop: 10 },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  cartImage: { width: 65, height: 59, borderRadius: 13 },
  cartCopy: { flex: 1 },
  cartTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  cartSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
  cartPrice: { color: colors.primary, fontSize: 12, fontWeight: '800', marginTop: 6, textAlign: 'right' },
  cartItemActions: { alignItems: 'center', gap: 6 },
  miniQty: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  miniQtyValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  promoInput: { height: 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, marginHorizontal: 20, marginTop: 16, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  promoTextInput: { flex: 1, color: colors.ink, fontSize: 12 },
  applyText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  summary: { marginHorizontal: 20, marginTop: 18, backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  summaryMuted: { color: colors.mutedForeground, fontSize: 12 },
  summaryValue: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
  summaryTotalLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  summaryTotal: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 120 },
  emptyIcon: { width: 83, height: 83, borderRadius: 28, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  emptySub: { color: colors.mutedForeground, fontSize: 13, marginTop: 7, marginBottom: 25 },
  checkoutHeader: { position: 'relative', minHeight: 78, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepText: { color: colors.primary, fontSize: 12, fontWeight: '800', width: 40, textAlign: 'left' },
  stepsLine: { paddingHorizontal: 20, flexDirection: 'row-reverse', gap: 6, marginBottom: 24 },
  stepPill: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepPillActive: { backgroundColor: colors.primary },
  checkoutBody: { paddingHorizontal: 20 },
  checkoutLabel: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 11, marginTop: 12 },
  selectedAddress: { borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 15 },
  addressTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  addressText: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  addAddressRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 18 },
  addAddressText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  deliveryNote: { backgroundColor: colors.muted, borderRadius: 13, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 13 },
  deliveryNoteText: { color: colors.mutedForeground, fontSize: 11, flex: 1, textAlign: 'right' },
  paymentOption: { minHeight: 75, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', gap: 11, padding: 12, marginBottom: 10, direction: 'rtl', writingDirection: 'rtl' },
  paymentOptionActive: { borderColor: colors.primary, borderWidth: 1.5 },
  paymentIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  paymentSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: colors.border, marginBottom: 17 },
  reviewItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8 },
  reviewImage: { width: 52, height: 47, borderRadius: 11 },
  reviewTitle: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  reviewSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  reviewPrice: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  infoCard: { minHeight: 53, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  infoCardText: { color: colors.ink, fontSize: 11, flex: 1, textAlign: 'right' },
  trackTop: { position: 'relative', paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21, minHeight: 50 },
  trackStatus: { alignItems: 'center', marginBottom: 20 },
  trackCheck: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  trackStatusTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  trackStatusSub: { color: colors.mutedForeground, fontSize: 12, marginTop: 5 },
  mapCard: { height: 188, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#E9EEE8', position: 'relative', marginBottom: 22 },
  mapRoadOne: { position: 'absolute', width: 390, height: 15, backgroundColor: '#fff', top: 74, left: -42, transform: [{ rotate: '17deg' }] },
  mapRoadTwo: { position: 'absolute', width: 330, height: 11, backgroundColor: '#fff', top: 121, left: 24, transform: [{ rotate: '-27deg' }] },
  mapRoadThree: { position: 'absolute', width: 260, height: 8, backgroundColor: '#D4DDD1', top: 38, left: 65, transform: [{ rotate: '-35deg' }] },
  mapPinStart: { position: 'absolute', left: 33, bottom: 26, width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mapPinEnd: { position: 'absolute', right: 46, top: 30, width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  mapLabel: { position: 'absolute', right: 14, bottom: 14, color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  progressTrack: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, direction: 'rtl', writingDirection: 'rtl' },
  progressStep: { minHeight: 51, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 11, position: 'relative', width: '100%', direction: 'rtl', writingDirection: 'rtl' },
  progressDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', zIndex: 2 },
  progressDotDone: { backgroundColor: colors.green, borderColor: colors.green },
  progressTitle: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600', textAlign: 'right', direction: 'rtl', writingDirection: 'rtl' },
  progressTitleDone: { color: colors.ink, fontWeight: '800' },
  progressSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right', direction: 'rtl', writingDirection: 'rtl', direction: 'rtl', writingDirection: 'rtl' },
  progressLine: { position: 'absolute', width: 1.5, height: 28, backgroundColor: colors.border, top: 18, right: 18, borderRadius: 999, zIndex: 0 },
  progressLineDone: { backgroundColor: colors.green },
  courierCard: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  courierInfo: { flex: 1 },
  courierAvatar: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#1E4254', alignItems: 'center', justifyContent: 'center' },
  courierName: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  courierSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  callButton: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  activeOrderBanner: { marginHorizontal: 20, marginBottom: 17, borderRadius: 18, backgroundColor: colors.primary, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeOrderIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  activeOrderCopy: { flex: 1 },
  activeOrderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, textAlign: 'right' },
  activeOrderTitle: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'right' },
  livePill: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8FF0A7' },
  livePillText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  activeOrderSub: { color: 'rgba(255,255,255,0.76)', fontSize: 10, marginTop: 5, textAlign: 'left' },
  orderFilters: { marginHorizontal: 20, backgroundColor: colors.muted, borderRadius: 13, padding: 4, flexDirection: 'row', marginBottom: 20, gap: 3 },
  orderFilterButton: { flex: 1, minHeight: 43, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  orderFilterButtonActive: { backgroundColor: '#fff' },
  orderFilterText: { color: colors.mutedForeground, fontSize: 12, textAlign: 'center' },
  orderFilterTextActive: { color: colors.primary, fontWeight: '800' },
  orderFilterCount: { minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  orderFilterCountActive: { backgroundColor: colors.coral },
  orderFilterCountText: { color: colors.mutedForeground, fontSize: 9, fontWeight: '700' },
  orderFilterCountTextActive: { color: colors.primary },
  ordersSectionHeader: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderCountHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderCountHintText: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
  orderCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  orderCardActive: { borderColor: colors.primary },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderIdentity: { alignItems: 'flex-start' },
  orderNumber: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  orderDate: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  orderStatus: { backgroundColor: colors.paleGreen, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', gap: 4, alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  statusText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  completedStatus: { backgroundColor: colors.muted, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  completedStatusText: { color: colors.mutedForeground, fontSize: 10, fontWeight: '700' },
  orderProducts: { flexDirection: 'row', alignItems: 'center', marginTop: 16, minHeight: 47 },
  orderThumb: { width: 47, height: 47, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
  orderMore: { width: 47, height: 47, borderRadius: 12, backgroundColor: colors.coral, borderWidth: 2, borderColor: '#fff', marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  orderMoreText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  orderTotal: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  orderDivider: { height: 1, backgroundColor: colors.border, marginVertical: 13 },
  orderCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRestaurant: { color: colors.ink, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  orderSummary: { color: colors.mutedForeground, fontSize: 9, marginTop: 4, textAlign: 'right' },
  orderAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingRight: 3 },
  reorderText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  orderDetails: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 13, paddingTop: 12 },
  orderDetailsTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textAlign: 'right', marginBottom: 7 },
  orderDetailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  orderDetailName: { color: colors.mutedForeground, fontSize: 10, textAlign: 'right' },
  orderDetailPrice: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  orderDetailMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 7 },
  orderDetailMetaText: { color: colors.green, fontSize: 10, fontWeight: '600' },
  ordersEmpty: { alignItems: 'center', marginHorizontal: 20, marginTop: 20, paddingHorizontal: 18, paddingVertical: 30, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  favoriteTabs: { flexDirection: 'row-reverse', marginHorizontal: 20, gap: 25, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 18 },
  favoriteTabActive: { color: colors.primary, fontSize: 13, fontWeight: '800', paddingBottom: 11, borderBottomWidth: 2, borderBottomColor: colors.primary },
  favoriteTab: { color: colors.mutedForeground, fontSize: 13, paddingBottom: 11 },
  accountPageHeader: { marginHorizontal: 20, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountPageTitle: { color: colors.ink, fontSize: 27, fontWeight: '800', textAlign: 'right' },
  accountPageSubtitle: { color: colors.mutedForeground, fontSize: 11, marginTop: 4, textAlign: 'right' },
  accountNotificationButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  accountNotificationPill: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  accountNotificationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', position: 'absolute', top: 6, right: 7 },
  accountProfileCard: { marginHorizontal: 20, borderRadius: 22, padding: 16, marginBottom: 14, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  accountProfileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  accountProfileTop: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  accountAvatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#1E4254', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },
  accountVerified: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute', bottom: -2, right: -3, alignItems: 'center', justifyContent: 'center' },
  accountProfileCopy: { flex: 1, alignItems: 'flex-end' },
  accountNameLight: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  accountMetaLight: { color: 'rgba(255,255,255,0.74)', fontSize: 11, marginTop: 5, textAlign: 'right' },
  accountMemberPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 7, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  accountMemberText: { color: '#FFDA82', fontSize: 9, fontWeight: '700' },
  accountProfileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  accountBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  accountBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  accountStatus: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '600' },
  editButtonLight: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  profileEditPanel: { marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', gap: 8 },
  profileInput: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', paddingHorizontal: 12, fontSize: 12 },
  profileSaveButton: { minHeight: 39, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  profileSaveText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  accountStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 17, paddingTop: 14 },
  accountStat: { flex: 1, alignItems: 'center' },
  accountStatValue: { color: '#fff', fontSize: 17, fontWeight: '800' },
  accountStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 4 },
  accountStatDivider: { width: 1, height: 27, backgroundColor: 'rgba(255,255,255,0.22)' },
  loyaltyCard: { marginHorizontal: 20, padding: 14, borderRadius: 18, backgroundColor: '#FFF7E4', borderWidth: 1, borderColor: '#F5DEAA', marginBottom: 21, shadowColor: colors.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  loyaltyTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  loyaltyIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  loyaltyCopy: { flex: 1 },
  loyaltyEyebrow: { color: colors.accentForeground, fontSize: 10, fontWeight: '700' },
  loyaltyTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  loyaltyPoints: { color: colors.accentForeground, fontSize: 16, fontWeight: '800' },
  loyaltyProgressTrack: { height: 7, borderRadius: 4, backgroundColor: '#F2DCA7', overflow: 'hidden', marginTop: 13 },
  loyaltyProgressFill: { width: '82%', height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  loyaltyBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  loyaltyHint: { color: colors.accentForeground, fontSize: 9, fontWeight: '600' },
  loyaltyGoal: { color: colors.mutedForeground, fontSize: 9, fontWeight: '700' },
  accountSectionHeader: { marginHorizontal: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  accountSectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  accountSectionHint: { color: colors.mutedForeground, fontSize: 9 },
  accountQuickGrid: { marginHorizontal: 20, flexDirection: 'row', gap: 9, marginBottom: 21 },
  accountQuickActions: { marginHorizontal: 20, flexDirection: 'row', gap: 9, marginBottom: 21 },
  accountQuickCard: { flex: 1, minHeight: 105, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', justifyContent: 'flex-end', shadowColor: colors.shadow, shadowOpacity: 0.01, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  accountQuickIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  accountQuickTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  accountQuickSub: { color: colors.mutedForeground, fontSize: 8, marginTop: 4, textAlign: 'right' },
  accountHeader: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 15 },
  accountName: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  accountPhone: { color: colors.mutedForeground, fontSize: 11, marginTop: 5, textAlign: 'right' },
  editButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  accountList: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  accountRow: { minHeight: 70, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2, textAlign: 'right' },
  accountRowLast: { borderBottomWidth: 0 },
  accountRowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  accountRowCopy: { flex: 1, alignItems: 'flex-start' },
  accountRowTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  accountRowSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 3, textAlign: 'right' },
  accountToggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.input, padding: 3, justifyContent: 'center', alignItems: 'flex-start' },
  accountToggleOn: { backgroundColor: colors.primary, alignItems: 'flex-end' },
  accountToggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  accountToggleKnobOn: { backgroundColor: '#fff' },
  logoutRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  settingsSection: { marginHorizontal: 20 },
  settingsLabel: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  settingsRow: { minHeight: 65, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleBase: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.input, padding: 3, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  toggleOn: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.primary, padding: 3, justifyContent: 'center', alignItems: 'flex-end' },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  notificationList: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13 },
  notificationRow: { minHeight: 90, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  notificationIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notificationTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  notificationSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  notificationTime: { color: colors.mutedForeground, fontSize: 9, marginTop: 5, textAlign: 'right' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, alignSelf: 'flex-start', marginTop: 18 },
  supportContent: { paddingTop: 0 },
  supportHero: { marginHorizontal: 20, marginBottom: 14, minHeight: 103, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  supportAvatar: { width: 49, height: 49, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  supportHeroCopy: { flex: 1 },
  supportTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  supportSub: { color: 'rgba(255,255,255,0.74)', fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'right' },
  supportOnline: { alignItems: 'center', gap: 4 },
  supportOnlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8FF0A7' },
  supportOnlineText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  supportResponseCard: { marginHorizontal: 20, marginBottom: 20, padding: 12, borderRadius: 15, backgroundColor: colors.paleGreen, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  supportResponseCopy: { flex: 1 },
  supportResponseTitle: { color: colors.ink, fontSize: 10, fontWeight: '800', textAlign: 'right' },
  supportResponseSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
  supportConversationHeader: { marginHorizontal: 20, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  supportConversationTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  supportConversationStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  supportConversationStatusText: { color: colors.mutedForeground, fontSize: 9 },
  chatBubbleAgent: { alignSelf: 'flex-start', maxWidth: '78%', backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border, padding: 12, marginLeft: 20, marginBottom: 11 },
  chatBubbleUser: { alignSelf: 'flex-end', maxWidth: '72%', backgroundColor: colors.primary, borderRadius: 16, borderBottomRightRadius: 4, padding: 12, marginRight: 20, marginBottom: 20 },
  chatBubbleUserLatest: { marginBottom: 11 },
  chatText: { color: colors.ink, fontSize: 12, lineHeight: 19, textAlign: 'right' },
  chatTextWhite: { color: '#fff', fontSize: 12, lineHeight: 19, textAlign: 'right' },
  chatTime: { color: colors.mutedForeground, fontSize: 9, marginTop: 5, textAlign: 'left' },
  chatTimeWhite: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 5, textAlign: 'left' },
  supportQuick: { marginHorizontal: 20, marginTop: 8 },
  supportQuickHeader: { marginBottom: 10 },
  supportQuickLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  supportQuickSub: { color: colors.mutedForeground, fontSize: 9, marginTop: 3, textAlign: 'right' },
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
  savedAddressTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  savedAddressText: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
  paymentList: { marginHorizontal: 20 },
  savedPayment: { minHeight: 73, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10, direction: 'rtl', writingDirection: 'rtl' },
  savedPaymentIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  savedPaymentTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  savedPaymentSub: { color: colors.mutedForeground, fontSize: 10, marginTop: 4, textAlign: 'right' },
});