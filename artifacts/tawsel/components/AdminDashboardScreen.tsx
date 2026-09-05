import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListAdminPaymentSubmissionsQueryKey,
  useConfirmAdminPaymentSubmission,
  useListAdminPaymentSubmissions,
  type PaymentSubmission,
} from '@workspace/api-client-react';
import { ArabicText as Text } from './ArabicText';
import { supabase } from '../lib/supabase';

const colors = {
  primary: '#BC1534',
  ink: '#18303D',
  muted: '#6E7D85',
  cream: '#F7F4EE',
  card: '#FFFFFF',
  border: '#E6DFD5',
  green: '#25845B',
  paleGreen: '#E7F5EE',
  coral: '#FCE8E5',
  amber: '#C87919',
};

type Tab = 'drivers' | 'payments' | 'catalog' | 'orders' | 'payouts';
type Driver = { id: string; name: string; phone: string; vehicle: string; status: 'active' | 'inactive'; todayDeliveries: number; profit: number; bankAccountName: string; bankAccountNumber: string; bankName: string };
type DriverDraft = { name: string; phone: string; vehicle: string };

const emptyDraft: DriverDraft = { name: '', phone: '', vehicle: '' };
type CatalogType = 'restaurants' | 'products';
type AdminDialog = { title: string; message: string; onConfirm?: () => void } | null;
const defaultProductCategories = [
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
  'اخرى',
];
const foodProductCategories = new Set(['مطاعم', 'مخبوزات', 'مشروبات']);

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'error' in error) {
    return String((error as { error: unknown }).error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const databaseError = error as { message: unknown; details?: unknown; hint?: unknown };
    const message = String(databaseError.message);
    const details = databaseError.details ? ` ${String(databaseError.details)}` : '';
    const hint = databaseError.hint ? ` ${String(databaseError.hint)}` : '';
    return `${message}${details}${hint}`;
  }
  if (error instanceof Error) return error.message;
  return 'تعذر إكمال العملية. حاول مرة أخرى.';
}

function DriverForm({
  visible,
  draft,
  pending,
  error,
  onChange,
  onCancel,
  onSave,
}: {
  visible: boolean;
  draft: DriverDraft;
  pending: boolean;
  error: string;
  onChange: (field: keyof DriverDraft, value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const complete = Object.values(draft).every((value) => value.trim());
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>إضافة حساب سائق</Text>
              <Text style={styles.modalSub}>أدخل بيانات السائق الأساسية</Text>
            </View>
            <Pressable accessibilityLabel="إغلاق" disabled={pending} onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          {([
            ['name', 'اسم السائق', 'مثال: أحمد محمد', 'default'],
            ['phone', 'رقم الهاتف', '+249 9xx xxx xxx', 'phone-pad'],
            ['vehicle', 'المركبة', 'مثال: دراجة نارية · 4821', 'default'],
          ] as const).map(([field, label, placeholder, keyboardType]) => (
            <View key={field} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                value={draft[field]}
                onChangeText={(value) => onChange(field, value)}
                placeholder={placeholder}
                placeholderTextColor="#9BA5AA"
                keyboardType={keyboardType}
                editable={!pending}
                style={styles.input}
              />
            </View>
          ))}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.modalActions}>
            <Pressable disabled={pending} onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>إلغاء</Text>
            </Pressable>
            <Pressable disabled={!complete || pending} onPress={onSave} style={[styles.primaryButton, (!complete || pending) && styles.disabled]}>
              <Text style={styles.primaryButtonText}>{pending ? 'جارٍ الحفظ...' : 'إضافة السائق'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DriverCard({
  driver,
  pending,
  onToggle,
  onDelete,
}: {
  driver: Driver;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const active = driver.status === 'active';
  return (
    <View style={styles.driverCard}>
      <View style={styles.driverTopRow}>
        <View style={[styles.avatar, !active && styles.avatarInactive]}>
          <Ionicons name="bicycle" size={21} color={active ? colors.primary : colors.muted} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.driverName}>{driver.name}</Text>
          <Text style={styles.driverMeta}>{driver.phone}</Text>
          <Text style={styles.driverMeta}>{driver.vehicle}</Text>
          <Text style={styles.driverMeta}>اليوم: {driver.todayDeliveries} توصيلات · الربح: {driver.profit.toFixed(2)} SDG</Text>
          <Text style={styles.driverMeta}>التحويل: {driver.bankName} · {driver.bankAccountName} · {driver.bankAccountNumber}</Text>
        </View>
        <View style={[styles.statusPill, active ? styles.activePill : styles.inactivePill]}>
          <View style={[styles.statusDot, { backgroundColor: active ? colors.green : colors.muted }]} />
          <Text style={[styles.statusText, { color: active ? colors.green : colors.muted }]}>{active ? 'نشط' : 'موقوف'}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable disabled={pending} onPress={onToggle} style={styles.manageButton}>
          <Ionicons name={active ? 'pause-circle-outline' : 'play-circle-outline'} size={17} color={colors.primary} />
          <Text style={styles.manageButtonText}>{active ? 'إيقاف الحساب' : 'تفعيل الحساب'}</Text>
        </Pressable>
        <Pressable disabled={pending} onPress={onDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={17} color={colors.primary} />
          <Text style={styles.deleteButtonText}>حذف</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentCard({
  payment,
  pending,
  onConfirm,
}: {
  payment: PaymentSubmission;
  pending: boolean;
  onConfirm: () => void;
}) {
  const lastFourText = payment.transactionLast4?.trim();

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentTopRow}>
        <View style={styles.paymentIcon}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.paymentOrder}>الطلب #{payment.orderId}</Text>
          <Text style={styles.paymentMeta}>{payment.paymentMethod} · {payment.total.toFixed(2)} SDG</Text>
        </View>
        <View style={styles.lastFour}>
          <Text style={styles.lastFourLabel}>آخر ٤ أرقام</Text>
          <Text style={styles.lastFourValue}>{lastFourText ? `•••• ${lastFourText}` : 'غير متاح'}</Text>
        </View>
      </View>
      <Pressable disabled={pending} onPress={onConfirm} style={[styles.confirmButton, pending && styles.disabled]}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        <Text style={styles.confirmButtonText}>{pending ? 'جارٍ التأكيد...' : 'تأكيد وصول الدفع'}</Text>
      </Pressable>
    </View>
  );
}

export function AdminDashboardScreen({
  topPad,
  bottomPad,
  onBack,
  onCatalogChanged,
}: {
  topPad: number;
  bottomPad: number;
  onBack: () => void;
  onCatalogChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const [adminDialog, setAdminDialog] = useState<AdminDialog>(null);
  const showAdminDialog = (title: string, message: string, onConfirm?: () => void) => setAdminDialog({ title, message, onConfirm });
  const [tab, setTab] = useState<Tab>('drivers');
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [draft, setDraft] = useState<DriverDraft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [catalogType, setCatalogType] = useState<CatalogType>('restaurants');
  const [catalogRows, setCatalogRows] = useState<any[]>([]);
  const [catalogEditingId, setCatalogEditingId] = useState<string | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogDescription, setCatalogDescription] = useState('');
  const [catalogTypeName, setCatalogTypeName] = useState('');
  const [catalogEta, setCatalogEta] = useState('');
  const [catalogRating, setCatalogRating] = useState('4.5');
  const [catalogDeliveryFee, setCatalogDeliveryFee] = useState('');
  const [catalogPrice, setCatalogPrice] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('مطاعم');
  const [catalogCategories, setCatalogCategories] = useState(defaultProductCategories);
  const [catalogImageUrl, setCatalogImageUrl] = useState('');
  const [catalogRestaurantId, setCatalogRestaurantId] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutRequestsError, setPayoutRequestsError] = useState<unknown>(null);
  const [payoutMutationPending, setPayoutMutationPending] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<unknown>(null);
  const [orderMutationPending, setOrderMutationPending] = useState(false);
  const paymentsParams = useMemo(() => ({ status: 'pending' as const }), []);
  const paymentsKey = useMemo(() => getListAdminPaymentSubmissionsQueryKey(paymentsParams), [paymentsParams]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<unknown>(null);
  const [driverMutationPending, setDriverMutationPending] = useState(false);
  const [confirmedPaymentIds, setConfirmedPaymentIds] = useState<number[]>([]);
  const paymentsQuery = useListAdminPaymentSubmissions(paymentsParams, { query: { queryKey: paymentsKey } });
  const confirmPayment = useConfirmAdminPaymentSubmission();
  const paymentResponse = paymentsQuery.data;
  const apiPayments = Array.isArray(paymentResponse) ? paymentResponse : [];
  const localPendingOrderPayments = useMemo(() => orders
    .filter((order) => !order.status || order.status === 'pending')
    .map((order) => {
      const transactionLast4 = String(order.transaction_last4 ?? order.transactionLast4 ?? '').replace(/\D/g, '').slice(-4);
      return {
        id: Number(String(order.id).slice(-8)) || Date.now() + Math.random(),
        orderId: String(order.order_id ?? order.id),
        paymentMethod: String(order.payment_method ?? 'غير محدد'),
        total: Number(order.total ?? 0),
        transactionLast4,
        status: 'pending' as const,
        createdAt: order.created_at ?? new Date().toISOString(),
        updatedAt: order.updated_at ?? order.created_at ?? new Date().toISOString(),
        __local: true,
      };
    }), [orders]);
  const hasLocalPendingPayments = localPendingOrderPayments.length > 0;
  const payments = (apiPayments.length ? apiPayments : (hasLocalPendingPayments ? localPendingOrderPayments : []))
    .filter((payment) => !confirmedPaymentIds.includes(payment.id));
  const paymentResponseError = paymentResponse && !Array.isArray(paymentResponse)
    ? new Error('تعذر تحميل قائمة المدفوعات من الخادم')
    : null;
  const activeDrivers = drivers.filter((driver) => driver.status === 'active').length;
  const pendingOrders = orders.filter((order) => !['completed', 'delivered', 'cancelled', 'rejected'].includes(String(order.status || 'pending')));

  const refreshOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    const { data, error } = await supabase.rpc('admin_list_orders');
    if (error) setOrdersError(error);
    setOrders(data ?? []);
    setOrdersLoading(false);
  };

  const refreshPayoutRequests = async () => {
    setPayoutRequestsError(null);
    const { data, error } = await supabase.rpc('admin_list_payout_requests');
    if (error) setPayoutRequestsError(error);
    setPayoutRequests(data ?? []);
  };

  const markPayoutPaid = async (requestId: string) => {
    if (payoutMutationPending) return;
    setPayoutMutationPending(true);
    const { error } = await supabase.rpc('admin_mark_payout_paid', { p_request_id: requestId });
    if (error) showAdminDialog('تعذر تحديث طلب الأرباح', getErrorMessage(error));
    else await refreshPayoutRequests();
    setPayoutMutationPending(false);
  };

  const refreshDrivers = async () => {
    setDriversLoading(true);
    setDriversError(null);
    const { data: driverRows, error: driverError } = await supabase.rpc('admin_list_drivers');
    if (driverError) setDriversError(driverError);
    setDrivers(((driverRows ?? []) as any[]).map((driver: any) => ({
      id: String(driver.id),
      name: String(driver.name || driver.full_name || 'سائق'),
      phone: String(driver.phone || 'غير محدد'),
      vehicle: String(driver.vehicle || 'غير محدد'),
      status: driver.status === 'inactive' || driver.status === 'offline' ? 'inactive' : 'active',
      todayDeliveries: Number(driver.today_deliveries || 0),
      profit: Number(driver.profit || 0),
      bankAccountName: String(driver.bank_account_name || 'غير مضاف'),
      bankAccountNumber: String(driver.bank_account_number || 'غير مضاف'),
      bankName: String(driver.bank_name || 'غير مضاف'),
    })));
    setDriversLoading(false);
  };
  const refreshPayments = () => queryClient.invalidateQueries({ queryKey: paymentsKey });

  useEffect(() => {
    void refreshDrivers();
    void refreshOrders();
    void refreshPayoutRequests();
  }, []);

  useEffect(() => {
    if (tab === 'payouts') void refreshPayoutRequests();
  }, [tab]);

  const updateOrderStatus = async (order: any, status: string) => {
    setOrderMutationPending(true);
    const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', order.id);
    if (!error) await refreshOrders();
    else setOrdersError(error);
    setOrderMutationPending(false);
  };

  const loadCatalog = async (type: CatalogType) => {
    setCatalogLoading(true);
    setCatalogError('');
    const { data, error } = await supabase.from(type).select('*').order('created_at', { ascending: false });
    if (error) setCatalogError(getErrorMessage(error));
    setCatalogRows(data ?? []);
    setCatalogLoading(false);
  };

  const loadProductCategories = async () => {
    const { data } = await supabase.from('categories').select('name').order('name');
    const remoteCategories = (data ?? []).map((row) => String(row.name).trim()).filter(Boolean);
    if (remoteCategories.length) setCatalogCategories(Array.from(new Set([...remoteCategories, ...defaultProductCategories])));
  };

  useEffect(() => {
    if (tab === 'catalog') {
      void loadCatalog(catalogType);
      void loadProductCategories();
    }
  }, [tab, catalogType]);

  const resetCatalogForm = () => {
    setCatalogEditingId(null);
    setCatalogName('');
    setCatalogDescription('');
    setCatalogTypeName('');
    setCatalogEta('');
    setCatalogRating('4.5');
    setCatalogDeliveryFee('');
    setCatalogPrice('');
    setCatalogImageUrl('');
    setCatalogRestaurantId('');
    setCatalogCategory('مطاعم');
  };

  const editCatalogItem = (row: any) => {
    setCatalogEditingId(String(row.id));
    setCatalogName(String(row.name || ''));
    setCatalogDescription(String(row.description || ''));
    setCatalogTypeName(String(row.type || ''));
    setCatalogEta(String(row.delivery_time || ''));
    setCatalogRating(String(row.rating || '4.5'));
    setCatalogDeliveryFee(String(row.delivery_fee || ''));
    setCatalogPrice(String(row.price || ''));
    setCatalogImageUrl(String(row.image_url || ''));
    setCatalogRestaurantId(String(row.restaurant_id || ''));
    setCatalogCategory(String(row.category || 'مطاعم'));
  };

  const handleCreateCatalogItem = async () => {
    if (!catalogName.trim()) return;
    if (catalogType === 'restaurants' && (!catalogTypeName.trim() || !catalogEta.trim() || !catalogImageUrl.trim())) {
      setCatalogError('أدخل النوع ووقت التوصيل ورابط صورة المطعم');
      return;
    }
    const productIsFood = foodProductCategories.has(catalogCategory.trim());
    if (catalogType === 'products' && (!catalogImageUrl.trim() || Number(catalogPrice) <= 0)) {
      setCatalogError('أدخل رابط الصورة وسعراً أكبر من صفر');
      return;
    }
    let resolvedRestaurantId = catalogRestaurantId.trim();
    if (catalogType === 'products' && productIsFood && !resolvedRestaurantId) {
      setCatalogError('اختر مطعماً لهذا المنتج الغذائي');
      return;
    }
    if (catalogType === 'products' && productIsFood && resolvedRestaurantId) {
      const { data: restaurantRows, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name');
      if (restaurantError) {
        setCatalogError(getErrorMessage(restaurantError));
        return;
      }
      const restaurantMatch = (restaurantRows ?? []).find((restaurant) =>
        String(restaurant.id).toLowerCase() === resolvedRestaurantId.toLowerCase()
        || String(restaurant.name).trim().toLowerCase() === resolvedRestaurantId.toLowerCase(),
      );
      if (!restaurantMatch) {
        setCatalogError('المطعم غير موجود. أدخل معرّف المطعم الصحيح أو أضف المطعم أولاً');
        return;
      }
      resolvedRestaurantId = String(restaurantMatch.id);
    }
    setCatalogLoading(true);
    setCatalogError('');
    if (catalogType === 'products' && !productIsFood) resolvedRestaurantId = '';
    const fields = catalogType === 'restaurants'
      ? { name: catalogName.trim(), type: catalogTypeName.trim(), description: catalogDescription.trim() || null, image_url: catalogImageUrl.trim(), rating: Number(catalogRating) || 4.5, delivery_time: catalogEta.trim(), delivery_fee: Number(catalogDeliveryFee) || 0 }
      : { name: catalogName.trim(), description: catalogDescription.trim() || null, price: Number(catalogPrice) || 0, category: catalogCategory.trim() || 'مطاعم', image_url: catalogImageUrl.trim(), restaurant_id: resolvedRestaurantId || null };
    const payload = { id: `${catalogType === 'restaurants' ? 'restaurant' : 'product'}-${Date.now()}`, ...fields };
    const query = catalogEditingId
      ? supabase.from(catalogType).update(fields as any).eq('id', catalogEditingId)
      : supabase.from(catalogType).insert(payload as any);
    const { error } = await query;
    if (error) {
      setCatalogError(getErrorMessage(error));
    } else {
      resetCatalogForm();
      await loadCatalog(catalogType);
      onCatalogChanged?.();
    }
    setCatalogLoading(false);
  };

  const handleCreateDriver = async () => {
    if (driverMutationPending) return;
    setFormError('');
    setDriverMutationPending(true);
    const { error } = await supabase.from('drivers').insert({ name: draft.name.trim(), phone: draft.phone.trim(), vehicle: draft.vehicle.trim(), status: 'active' });
    if (error) setFormError(getErrorMessage(error));
    else { setShowDriverForm(false); setDraft(emptyDraft); }
    await refreshDrivers();
    setDriverMutationPending(false);
  };

  const handleToggleDriver = async (driver: Driver) => {
    setDriverMutationPending(true);
    const nextStatus = driver.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.rpc('admin_set_driver_status', {
      p_driver_id: driver.id,
      p_status: nextStatus,
    });
    if (error) {
      showAdminDialog('تعذر تحديث حالة السائق', getErrorMessage(error));
    } else {
      setDrivers((current) => current.map((currentDriver) => currentDriver.id === driver.id ? { ...currentDriver, status: nextStatus } : currentDriver));
      await refreshDrivers();
    }
    setDriverMutationPending(false);
  };

  const handleDeleteDriver = (driver: Driver) => {
    showAdminDialog('حذف حساب السائق', `هل تريد حذف حساب ${driver.name} نهائياً؟`, async () => {
          setDriverMutationPending(true);
          const { error } = await supabase.rpc('admin_delete_driver', { p_driver_id: driver.id });
          if (error) {
            showAdminDialog('تعذر حذف السائق', getErrorMessage(error));
          } else {
            setDrivers((current) => current.filter((currentDriver) => currentDriver.id !== driver.id));
            await refreshDrivers();
          }
          setDriverMutationPending(false);
        });
  };

  const handleConfirmPayment = (payment: PaymentSubmission) => {
    const isLocalPayment = Boolean((payment as any).__local);
    const lastFourText = payment.transactionLast4?.trim() || 'غير متاح';

    showAdminDialog('تأكيد الدفع', `هل تطابق آخر أربعة أرقام (${lastFourText}) مع التحويل؟`, async () => {
          setOrderMutationPending(true);
          const { error } = await supabase.rpc('confirm_order_payment', {
            order_number: payment.orderId,
          });
          if (error) {
            setOrdersError(error);
            showAdminDialog('تعذر تأكيد الدفع', getErrorMessage(error));
            setOrderMutationPending(false);
            return;
          }

          if (!isLocalPayment) {
            confirmPayment.mutate({ id: payment.id }, {
              onError: (syncError) => console.warn('Payment submission sync failed after order confirmation:', syncError),
            });
          }
          setConfirmedPaymentIds((current) => [...current, payment.id]);
          showAdminDialog('تم تأكيد الدفع', 'تم تحديث حالة الطلب إلى مدفوع وإرساله للسائقين.');
          await refreshOrders();
          await refreshPayments();
          setOrderMutationPending(false);
        });
  };

  const loading = tab === 'drivers' ? driversLoading : tab === 'payments' ? (!hasLocalPendingPayments && paymentsQuery.isLoading) : tab === 'catalog' ? catalogLoading : ordersLoading;
  const error = tab === 'drivers'
    ? driversError
    : tab === 'payments'
      ? (hasLocalPendingPayments ? null : (paymentsQuery.error || paymentResponseError))
      : tab === 'catalog'
        ? catalogError
        : ordersError;
  const refresh = tab === 'drivers' ? refreshDrivers : tab === 'payments' ? paymentsQuery.refetch : tab === 'catalog' ? () => loadCatalog(catalogType) : refreshOrders;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable accessibilityLabel="رجوع" onPress={onBack} style={styles.headerButton}>
          <Ionicons name="chevron-forward" size={21} color="#fff" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerKicker}>طلباتي SD · عمليات</Text>
          <Text style={styles.headerTitle}>لوحة التحكم المخفية</Text>
        </View>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={17} color="#fff" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={topPad}
        style={styles.dashboardBody}
      >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 280 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}><Text style={styles.metricLabel}>حسابات السائقين</Text><View style={styles.metricIcon}><Ionicons name="bicycle-outline" size={17} color={colors.primary} /></View></View>
            <Text style={styles.metricValue}>{drivers.length}</Text>
            <Text style={styles.metricHint}>إجمالي الحسابات</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}><Text style={[styles.metricLabel, { color: colors.green }]}>متصل الآن</Text><View style={[styles.metricIcon, styles.metricIconGreen]}><Ionicons name="radio-outline" size={17} color={colors.green} /></View></View>
            <Text style={[styles.metricValue, { color: colors.green }]}>{activeDrivers}</Text>
            <Text style={styles.metricHint}>سائقون نشطون</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricCardHeader}><Text style={[styles.metricLabel, { color: colors.amber }]}>قيد المتابعة</Text><View style={[styles.metricIcon, styles.metricIconAmber]}><Ionicons name="time-outline" size={17} color={colors.amber} /></View></View>
            <Text style={[styles.metricValue, { color: colors.amber }]}>{pendingOrders.length}</Text>
            <Text style={styles.metricHint}>طلبات مفتوحة</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          <Pressable onPress={() => setTab('drivers')} style={[styles.tab, tab === 'drivers' && styles.tabActive]}>
            <Ionicons name="people-outline" size={18} color={tab === 'drivers' ? '#fff' : colors.muted} />
            <Text style={[styles.tabText, tab === 'drivers' && styles.tabTextActive]}>السائقون</Text>
          </Pressable>
          <Pressable onPress={() => setTab('payments')} style={[styles.tab, tab === 'payments' && styles.tabActive]}>
            <Ionicons name="wallet-outline" size={18} color={tab === 'payments' ? '#fff' : colors.muted} />
            <Text style={[styles.tabText, tab === 'payments' && styles.tabTextActive]}>المدفوعات</Text>
          </Pressable>
          <Pressable onPress={() => setTab('catalog')} style={[styles.tab, tab === 'catalog' && styles.tabActive]}>
            <Ionicons name="grid-outline" size={18} color={tab === 'catalog' ? '#fff' : colors.muted} />
            <Text style={[styles.tabText, tab === 'catalog' && styles.tabTextActive]}>المحتوى</Text>
          </Pressable>
          <Pressable onPress={() => setTab('orders')} style={[styles.tab, tab === 'orders' && styles.tabActive]}>
            <Ionicons name="receipt-outline" size={18} color={tab === 'orders' ? '#fff' : colors.muted} />
            <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>الطلبات</Text>
          </Pressable>
          <Pressable onPress={() => setTab('payouts')} style={[styles.tab, tab === 'payouts' && styles.tabActive]}>
            <Ionicons name="cash-outline" size={18} color={tab === 'payouts' ? '#fff' : colors.muted} />
            <Text style={[styles.tabText, tab === 'payouts' && styles.tabTextActive]}>أرباح السائقين</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{tab === 'drivers' ? 'إدارة حسابات السائقين' : tab === 'payments' ? 'تأكيد المدفوعات' : tab === 'catalog' ? 'إدارة محتوى التطبيق' : tab === 'payouts' ? 'طلبات تحويل أرباح السائقين' : 'إدارة الطلبات'}</Text>
            <Text style={styles.sectionSub}>{tab === 'drivers' ? 'أضف أو أوقف أو احذف حساباً' : tab === 'payments' ? 'راجع آخر ٤ أرقام قبل التأكيد' : tab === 'catalog' ? 'أضف المطاعم والمنتجات مع بياناتها الكاملة' : tab === 'payouts' ? 'راجع مبلغ التحويل وبيانات الحساب البنكي' : 'تابع الحالة والتوصيل لكل طلب'}</Text>
          </View>
          {tab === 'drivers' ? (
            <Pressable onPress={() => { setFormError(''); setShowDriverForm(true); }} style={styles.addButton}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>إضافة</Text>
            </Pressable>
          ) : tab === 'payments' ? (
            <Pressable onPress={() => void paymentsQuery.refetch()} style={styles.refreshButton}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
            </Pressable>
          ) : tab === 'payouts' ? (
            <Pressable onPress={() => void refreshPayoutRequests()} style={styles.refreshButton}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
            </Pressable>
          ) : tab === 'orders' ? (
            <Pressable onPress={() => void refreshOrders()} style={styles.refreshButton}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>

        {tab === 'payouts' ? (
          <View>
            {payoutRequestsError ? <View style={styles.stateCard}><Ionicons name="alert-circle-outline" size={30} color={colors.primary} /><Text style={styles.stateTitle}>تعذر تحميل طلبات الأرباح</Text><Text style={styles.stateSub}>{getErrorMessage(payoutRequestsError)}</Text><Pressable onPress={() => void refreshPayoutRequests()} style={styles.retryButton}><Text style={styles.retryText}>إعادة المحاولة</Text></Pressable></View> : payoutRequests.length ? payoutRequests.map((request) => (
              <View key={request.id} style={styles.payoutRequestCard}>
                <View style={styles.payoutRequestHeader}><Text style={styles.payoutRequestDriver}>{request.driver_name || 'سائق'}</Text><Text style={styles.payoutRequestAmount}>{Number(request.amount || 0).toFixed(2)} SDG</Text></View>
                <Text style={styles.payoutRequestMeta}>البنك: {request.bank_name || 'غير مضاف'}</Text>
                <Text style={styles.payoutRequestMeta}>اسم الحساب: {request.account_name || 'غير مضاف'}</Text>
                <Text style={styles.payoutRequestMeta}>رقم الحساب: {request.account_number || 'غير مضاف'}</Text>
                <Text style={styles.payoutRequestStatus}>الحالة: {request.status || 'pending'}</Text>
                {request.status === 'pending' ? <Pressable disabled={payoutMutationPending} onPress={() => void markPayoutPaid(String(request.id))} style={[styles.payoutRequestButton, payoutMutationPending && styles.disabled]}><Ionicons name="checkmark-circle-outline" size={17} color="#fff" /><Text style={styles.payoutRequestButtonText}>{payoutMutationPending ? 'جارٍ التحديث...' : 'تم التحويل'}</Text></Pressable> : null}
              </View>
            )) : <View style={styles.stateCard}><Ionicons name="cash-outline" size={30} color={colors.muted} /><Text style={styles.stateTitle}>لا توجد طلبات تحويل</Text><Text style={styles.stateSub}>ستظهر طلبات أرباح السائقين هنا.</Text></View>}
          </View>
        ) : null}

        {tab === 'catalog' ? (
          <>
            <View style={styles.catalogTypeTabs}>
              {([['restaurants', 'المطاعم'], ['products', 'المنتجات']] as const).map(([type, label]) => (
                <Pressable key={type} onPress={() => { setCatalogType(type); resetCatalogForm(); }} style={[styles.catalogTypeTab, catalogType === type && styles.catalogTypeTabActive]}>
                  <Text style={[styles.catalogTypeText, catalogType === type && styles.catalogTypeTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.catalogForm}>
              <View><Text style={styles.fieldLabel}>الاسم</Text><TextInput value={catalogName} onChangeText={setCatalogName} placeholder={catalogType === 'restaurants' ? 'اسم المطعم' : 'اسم المنتج'} placeholderTextColor="#9BA5AA" style={styles.input} /></View>
              <View><Text style={styles.fieldLabel}>الوصف التفصيلي</Text><TextInput value={catalogDescription} onChangeText={setCatalogDescription} placeholder="أدخل وصفاً واضحاً" placeholderTextColor="#9BA5AA" style={styles.input} multiline /></View>
              {catalogType === 'restaurants' ? <><View><Text style={styles.fieldLabel}>نوع المطعم</Text><TextInput value={catalogTypeName} onChangeText={setCatalogTypeName} placeholder="مثال: Pizza Hut" placeholderTextColor="#9BA5AA" style={styles.input} /></View><View><Text style={styles.fieldLabel}>وقت التوصيل</Text><TextInput value={catalogEta} onChangeText={setCatalogEta} placeholder="مثال: 20–30 min" placeholderTextColor="#9BA5AA" style={styles.input} /></View><View><Text style={styles.fieldLabel}>التقييم</Text><TextInput value={catalogRating} onChangeText={setCatalogRating} placeholder="مثال: 4.5" placeholderTextColor="#9BA5AA" keyboardType="decimal-pad" style={styles.input} /></View><View><Text style={styles.fieldLabel}>رسوم التوصيل بـ SDG</Text><TextInput value={catalogDeliveryFee} onChangeText={setCatalogDeliveryFee} placeholder="مثال: 50" placeholderTextColor="#9BA5AA" keyboardType="decimal-pad" style={styles.input} /></View><View><Text style={styles.fieldLabel}>رابط صورة المطعم</Text><TextInput value={catalogImageUrl} onChangeText={setCatalogImageUrl} placeholder="https://..." placeholderTextColor="#9BA5AA" style={styles.input} keyboardType="url" autoCapitalize="none" /></View></> : null}
              {catalogType === 'products' ? <><View><Text style={styles.fieldLabel}>السعر بـ SDG</Text><TextInput value={catalogPrice} onChangeText={setCatalogPrice} placeholder="مثال: 25" placeholderTextColor="#9BA5AA" keyboardType="decimal-pad" style={styles.input} /></View><View><Text style={styles.fieldLabel}>القسم</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChoices}>{catalogCategories.map((category) => <Pressable key={category} onPress={() => { setCatalogCategory(category); if (!foodProductCategories.has(category)) setCatalogRestaurantId(''); }} style={[styles.categoryChoice, catalogCategory === category && styles.categoryChoiceActive]}><Text style={[styles.categoryChoiceText, catalogCategory === category && styles.categoryChoiceTextActive]}>{category}</Text></Pressable>)}</ScrollView></View>{foodProductCategories.has(catalogCategory.trim()) ? <View><Text style={styles.fieldLabel}>المطعم أو معرّف المطعم</Text><TextInput value={catalogRestaurantId} onChangeText={setCatalogRestaurantId} placeholder="اسم المطعم أو restaurant-..." placeholderTextColor="#9BA5AA" style={styles.input} autoCapitalize="none" /></View> : null}<View><Text style={styles.fieldLabel}>التقييم</Text><TextInput value={catalogRating} onChangeText={setCatalogRating} placeholder="مثال: 4.5" placeholderTextColor="#9BA5AA" keyboardType="decimal-pad" style={styles.input} /></View><View><Text style={styles.fieldLabel}>رابط صورة المنتج</Text><TextInput value={catalogImageUrl} onChangeText={setCatalogImageUrl} placeholder="https://..." placeholderTextColor="#9BA5AA" style={styles.input} keyboardType="url" autoCapitalize="none" /></View></> : null}
              <View style={styles.catalogFormActions}>
                <Pressable accessibilityRole="button" disabled={catalogLoading || !catalogName.trim()} onPress={() => void handleCreateCatalogItem()} style={[styles.primaryButton, (catalogLoading || !catalogName.trim()) && styles.disabled]}><Text style={styles.primaryButtonText}>{catalogLoading ? 'جارٍ الحفظ...' : catalogEditingId ? 'حفظ التعديلات' : 'إضافة'}</Text></Pressable>
                {catalogEditingId ? <Pressable disabled={catalogLoading} onPress={resetCatalogForm} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>إلغاء</Text></Pressable> : null}
              </View>
              {catalogError ? <Text style={styles.errorText}>{catalogError}</Text> : null}
            </View>
            {catalogRows.map((row) => <View key={row.id} style={styles.catalogRow}><View style={styles.flex}><Text style={styles.catalogRowTitle}>{row.name}</Text><Text style={styles.catalogRowMeta}>{catalogType === 'products' ? `${row.price ?? 0} SDG · ${row.category ?? 'بدون قسم'} · ${row.restaurant_id ?? ''}` : `${row.type || ''} · ${row.delivery_time || ''} · ${row.delivery_fee ?? 0} SDG`}</Text></View><Pressable accessibilityLabel={`تعديل ${row.name}`} onPress={() => editCatalogItem(row)} style={styles.catalogEditButton}><Ionicons name="create-outline" size={18} color={colors.primary} /></Pressable></View>)}
          </>
        ) : null}

        {tab === 'orders' ? (
          <View>
            {orders.map((order) => {
              const delivery = order.deliveries?.[0];
              const driver = delivery?.drivers;
              const status = order.status || 'pending';
              return (
                <View key={order.id} style={styles.orderAdminCard}>
                  <View style={styles.orderAdminHeader}>
                    <View style={styles.flex}>
                      <Text style={styles.orderAdminNumber}>#{order.order_id || order.id}</Text>
                      <Text style={styles.orderAdminDate}>{order.created_at ? new Date(order.created_at).toLocaleString('ar-SD') : 'تاريخ غير معروف'}</Text>
                    </View>
                    <View style={[styles.orderAdminStatus, status === 'completed' && styles.orderAdminStatusDone]}><Text style={styles.orderAdminStatusText}>{status}</Text></View>
                  </View>
                  <Text style={styles.orderAdminRestaurant}>{order.restaurant || 'طلب بدون مطعم'}</Text>
                  <Text style={styles.orderAdminMeta}>{order.delivery_address || 'لا يوجد عنوان'} · {Number(order.total || 0)} SDG</Text>
                  <Text style={styles.orderAdminDriver}>{driver ? `السائق: ${driver.name || driver.full_name || 'بدون اسم'} · ${driver.phone || 'بدون رقم'}` : 'لم يتم تعيين سائق بعد'}</Text>
                  <View style={styles.orderAdminActions}>
                    {(['pending', 'preparing', 'out_for_delivery', 'completed'] as const).map((nextStatus) => (
                      <Pressable key={nextStatus} disabled={orderMutationPending || status === nextStatus} onPress={() => void updateOrderStatus(order, nextStatus)} style={[styles.orderAdminAction, status === nextStatus && styles.orderAdminActionActive, (orderMutationPending || status === nextStatus) && styles.disabled]}>
                        <Text style={[styles.orderAdminActionText, status === nextStatus && styles.orderAdminActionTextActive]}>{nextStatus === 'pending' ? 'جديد' : nextStatus === 'preparing' ? 'تحضير' : nextStatus === 'out_for_delivery' ? 'في الطريق' : 'مكتمل'}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
            {!orders.length && !ordersLoading ? <View style={styles.stateCard}><Ionicons name="receipt-outline" size={30} color={colors.muted} /><Text style={styles.stateTitle}>لا توجد طلبات</Text><Text style={styles.stateSub}>ستظهر الطلبات الجديدة هنا.</Text></View> : null}
          </View>
        ) : null}

        {tab === 'catalog' || tab === 'orders' ? null : loading ? (
          <View style={styles.stateCard}><Text style={styles.stateTitle}>جارٍ تحميل البيانات...</Text></View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.primary} />
            <Text style={styles.stateTitle}>تعذر تحميل البيانات</Text>
            <Text style={styles.stateSub}>{getErrorMessage(error)}</Text>
            <Pressable onPress={() => void refresh()} style={styles.retryButton}><Text style={styles.retryText}>إعادة المحاولة</Text></Pressable>
          </View>
        ) : tab === 'drivers' ? (
          drivers.length ? drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              pending={driverMutationPending}
              onToggle={() => handleToggleDriver(driver)}
              onDelete={() => handleDeleteDriver(driver)}
            />
          )) : (
            <View style={styles.stateCard}>
              <Ionicons name="people-outline" size={30} color={colors.muted} />
              <Text style={styles.stateTitle}>لا توجد حسابات سائقين</Text>
              <Text style={styles.stateSub}>استخدم زر الإضافة لإنشاء أول حساب.</Text>
            </View>
          )
        ) : payments.length ? payments.map((payment) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            pending={confirmPayment.isPending || orderMutationPending}
            onConfirm={() => handleConfirmPayment(payment)}
          />
        )) : (
          <View style={styles.stateCard}>
            <Ionicons name="checkmark-done-circle-outline" size={31} color={colors.green} />
            <Text style={styles.stateTitle}>لا توجد مدفوعات معلّقة</Text>
            <Text style={styles.stateSub}>ستظهر التحويلات الجديدة هنا للمراجعة.</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <DriverForm
        visible={showDriverForm}
        draft={draft}
        pending={driverMutationPending}
        error={formError}
        onChange={(field, value) => setDraft((current) => ({ ...current, [field]: value }))}
        onCancel={() => { if (!driverMutationPending) setShowDriverForm(false); }}
        onSave={handleCreateDriver}
      />
      {adminDialog ? (
        <View style={styles.dialogOverlay} accessibilityViewIsModal>
          <Pressable style={styles.dialogBackdrop} onPress={() => setAdminDialog(null)} />
          <View style={styles.dialogCard}>
            <View style={styles.dialogIcon}><Ionicons name="information-circle" size={26} color={colors.primary} /></View>
            <Text style={styles.dialogTitle}>{adminDialog.title}</Text>
            <Text style={styles.dialogMessage}>{adminDialog.message}</Text>
            <View style={styles.dialogActions}>
              {adminDialog.onConfirm ? <Pressable onPress={() => { const action = adminDialog.onConfirm; setAdminDialog(null); void action?.(); }} style={styles.dialogConfirm}><Text style={styles.dialogConfirmText}>تأكيد</Text></Pressable> : null}
              <Pressable onPress={() => setAdminDialog(null)} style={[styles.dialogCancel, !adminDialog.onConfirm && styles.dialogCancelFull]}><Text style={styles.dialogCancelText}>{adminDialog.onConfirm ? 'إلغاء' : 'حسناً'}</Text></Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  dashboardBody: { flex: 1 },
  flex: { flex: 1 },
  header: { minHeight: 112, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'flex-start' },
  headerKicker: { color: 'rgba(255,255,255,0.66)', fontSize: 9, textAlign: 'left' },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 3, textAlign: 'left' },
  secureBadge: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18 },
  metricsRow: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  metricCard: { flex: 1, minHeight: 104, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 11, justifyContent: 'space-between' },
  metricCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  metricIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  metricIconGreen: { backgroundColor: colors.paleGreen },
  metricIconAmber: { backgroundColor: '#FFF1D6' },
  metricValue: { color: colors.primary, fontSize: 25, fontWeight: '800', textAlign: 'left', marginTop: 7 },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', textAlign: 'left' },
  metricHint: { color: colors.muted, fontSize: 8, textAlign: 'left', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, padding: 5, borderRadius: 16, backgroundColor: '#ECE6DD', marginBottom: 22 },
  tab: { minWidth: 112, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  catalogTypeTabs: { flexDirection: 'row', gap: 7, padding: 4, borderRadius: 14, backgroundColor: '#ECE6DD', marginBottom: 12 },
  catalogTypeTab: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catalogTypeTabActive: { backgroundColor: colors.primary },
  catalogTypeText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  catalogTypeTextActive: { color: '#fff' },
  catalogForm: { gap: 8, marginBottom: 14 },
  categoryChoices: { flexDirection: 'row', gap: 7, paddingVertical: 2 },
  categoryChoice: { minHeight: 36, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  categoryChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChoiceText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  categoryChoiceTextActive: { color: '#fff' },
  catalogFormActions: { flexDirection: 'row', gap: 8 },
  catalogEditButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  payoutRequestCard: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  payoutRequestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  payoutRequestDriver: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  payoutRequestAmount: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  payoutRequestMeta: { color: colors.muted, fontSize: 10, marginTop: 4, textAlign: 'left' },
  payoutRequestStatus: { color: colors.green, fontSize: 10, fontWeight: '700', marginTop: 8, textAlign: 'left' },
  payoutRequestButton: { minHeight: 40, borderRadius: 11, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  payoutRequestButtonText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  catalogRow: { minHeight: 66, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  catalogRowTitle: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'left' },
  catalogRowMeta: { color: colors.muted, fontSize: 9, marginTop: 3, textAlign: 'left' },
  orderAdminCard: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  orderAdminHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orderAdminNumber: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'left' },
  orderAdminDate: { color: colors.muted, fontSize: 9, marginTop: 3, textAlign: 'left' },
  orderAdminStatus: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FFF1D6' },
  orderAdminStatusDone: { backgroundColor: colors.paleGreen },
  orderAdminStatusText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  orderAdminRestaurant: { color: colors.ink, fontSize: 12, fontWeight: '700', marginTop: 11, textAlign: 'left' },
  orderAdminMeta: { color: colors.muted, fontSize: 9, marginTop: 4, textAlign: 'left' },
  orderAdminDriver: { color: colors.primary, fontSize: 9, fontWeight: '700', marginTop: 7, textAlign: 'left' },
  orderAdminActions: { flexDirection: 'row-reverse', gap: 5, marginTop: 12 },
  orderAdminAction: { flex: 1, minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  orderAdminActionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  orderAdminActionText: { color: colors.muted, fontSize: 8, fontWeight: '700' },
  orderAdminActionTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', textAlign: 'left' },
  sectionSub: { color: colors.muted, fontSize: 9, marginTop: 3, textAlign: 'left' },
  addButton: { minHeight: 38, paddingHorizontal: 13, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  refreshButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  driverCard: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  driverTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  avatarInactive: { backgroundColor: '#EEF0F1' },
  driverName: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  driverMeta: { color: colors.muted, fontSize: 9, marginTop: 2, textAlign: 'left' },
  statusPill: { minHeight: 27, paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  activePill: { backgroundColor: colors.paleGreen },
  inactivePill: { backgroundColor: '#EEF0F1' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 13, paddingTop: 11 },
  manageButton: { flex: 1, minHeight: 37, borderRadius: 11, backgroundColor: colors.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  manageButtonText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  deleteButton: { minWidth: 82, minHeight: 37, borderRadius: 11, borderWidth: 1, borderColor: '#F2C5CE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  deleteButtonText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  paymentCard: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  paymentTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  paymentIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  paymentOrder: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'left' },
  paymentMeta: { color: colors.muted, fontSize: 9, marginTop: 4, textAlign: 'left' },
  lastFour: { alignItems: 'flex-end' },
  lastFourLabel: { color: colors.muted, fontSize: 8 },
  lastFourValue: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 3, writingDirection: 'ltr' },
  confirmButton: { minHeight: 42, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 13 },
  confirmButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stateCard: { minHeight: 190, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  stateSub: { color: colors.muted, fontSize: 10, textAlign: 'center', lineHeight: 17, marginTop: 5 },
  retryButton: { marginTop: 14, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.primary },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  dialogOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  dialogBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,48,61,0.48)' },
  dialogCard: { width: '100%', maxWidth: 390, borderRadius: 22, backgroundColor: colors.cream, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: colors.border, elevation: 8 },
  dialogIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  dialogTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  dialogMessage: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  dialogActions: { width: '100%', flexDirection: 'row-reverse', gap: 8, marginTop: 18 },
  dialogConfirm: { flex: 1, minHeight: 45, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dialogConfirmText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dialogCancel: { flex: 0.75, minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dialogCancelFull: { flex: 1 },
  dialogCancelText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(24,48,61,0.48)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.cream, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', textAlign: 'left' },
  modalSub: { color: colors.muted, fontSize: 9, marginTop: 3, textAlign: 'left' },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#ECE6DD', alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { marginBottom: 13 },
  fieldLabel: { color: colors.ink, fontSize: 10, fontWeight: '700', textAlign: 'left', marginBottom: 6 },
  input: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 13, color: colors.ink, fontSize: 12, textAlign: 'right', writingDirection: 'ltr', fontFamily: 'IBMPlexSansArabic' },
  errorText: { color: colors.primary, fontSize: 10, textAlign: 'left', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 9, marginTop: 5 },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  primaryButton: { flex: 1.4, minHeight: 46, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});