import React from 'react';
import { Pressable, ScrollView, View, Image } from 'react-native';
import { ArabicText as Text, ArabicTextInput as TextInput } from '@/components/ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export const CartTab = ({
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
}: any) => {
  const subtotal = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const delivery = cart.length ? 15 : 0;
  const total = subtotal + delivery;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 190 }}
      >
        <View style={styles.pageTop}>
          <Text style={styles.pageTitle}>السلة</Text>
          <Text style={styles.pageSubtitle}>{cartCount} عناصر</Text>
        </View>
        {cart.length ? (
          <>
            <View style={styles.cartRestaurant}>
              <View style={styles.smallAvatar}><Text style={styles.avatarLetter}>ت</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartRestaurantTitle}>بيتزا هت</Text>
                <Text style={styles.cartRestaurantSub}>توصيل من المطعم</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.cartItems}>
              {cart.map((item: any) => (
                <View key={item.id} style={styles.cartItem}>
                  <Image source={item.image} style={styles.cartImage} />
                  <View style={styles.cartCopy}>
                    <Text style={styles.cartTitle}>{item.title}</Text>
                    <Text style={styles.cartSub}>{item.subtitle}</Text>
                    <Text style={styles.cartPrice}>{money(item.price * item.quantity, isEnglish)}</Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <Pressable accessibilityLabel={`زيادة كمية ${item.title}`} onPress={() => changeQuantity(item.id, 1)} style={({ pressed }: any) => [styles.miniQty, pressed && styles.pressed]}>
                      <Ionicons name="add" size={14} color={colors.ink} />
                    </Pressable>
                    <Text style={styles.miniQtyValue}>{item.quantity}</Text>
                    <Pressable accessibilityLabel={`تقليل كمية ${item.title}`} onPress={() => changeQuantity(item.id, -1)} style={({ pressed }: any) => [styles.miniQty, pressed && styles.pressed]}>
                      <Ionicons name="remove" size={14} color={colors.ink} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.promoInput}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              <TextInput value={promo} onChangeText={setPromo} placeholder="لديك كوبون خصم؟" placeholderTextColor={colors.mutedForeground} style={styles.promoTextInput} textAlign="right" />
              <Text style={styles.applyText}>تطبيق</Text>
            </View>
            <Summary styles={styles} subtotal={subtotal} delivery={delivery} total={total} money={money} />
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
        <View style={[styles.stickyCta, { bottom: bottomPad + 82, paddingBottom: 12, flexDirection: 'row-reverse' }]}>
          <PrimaryButton fullWidth label="المتابعة للدفع" onPress={() => go('address')} />
        </View>
      ) : null}
      <BottomTabs />
    </View>
  );
};

const Summary = ({ styles, subtotal: sub, delivery: del, total: final, money }: any) => (
  <View style={styles.summary}>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryMuted}>المجموع الفرعي</Text>
      <Text style={styles.summaryValue}>{money(sub)}</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryMuted}>رسوم التوصيل</Text>
      <Text style={styles.summaryValue}>{money(del)}</Text>
    </View>
    <View style={styles.summaryDivider} />
    <View style={styles.summaryRow}>
      <Text style={styles.summaryTotalLabel}>الإجمالي</Text>
      <Text style={styles.summaryTotal}>{money(final)}</Text>
    </View>
  </View>
);

export const CheckoutHeader = ({ styles, colors, topPad, step, title, go }: any) => (
  <>
    <View style={[styles.checkoutHeader, { paddingTop: topPad + 8 }]}>
      <View style={styles.headerSide}>
        <Pressable
          accessibilityLabel="العودة"
          hitSlop={10}
          onPress={() => go(step === 1 ? 'cart' : step === 2 ? 'address' : 'payment')}
          style={styles.headerIcon}
        >
          <Ionicons name="chevron-back" size={21} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>إتمام الطلب</Text>
      </View>

      <View style={styles.headerSide}>
        <View style={styles.stepBubble}>
          <Text style={styles.stepText}>{step}/3</Text>
        </View>
      </View>
    </View>

    <View style={styles.stepsLine}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={[styles.stepPill, item <= step && styles.stepPillActive]} />
      ))}
    </View>
  </>
);

export const AddressScreen = ({
  styles,
  colors,
  topPad,
  bottomPad,
  address,
  go,
  PrimaryButton,
}: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}>
      <CheckoutHeader styles={styles} colors={colors} topPad={topPad} step={1} title="العنوان" go={go} />
      <View style={styles.checkoutBody}>
        <Text style={styles.checkoutLabel}>اختر عنوان التوصيل</Text>
        <Pressable style={styles.selectedAddress}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressTitle}>المنزل</Text>
            <Text style={styles.addressText}>{address}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={23} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.addAddressRow} onPress={() => go('addresses')}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addAddressText}>إضافة عنوان جديد</Text>
        </Pressable>
        <View style={styles.deliveryNote}>
          <Ionicons name="information-circle-outline" size={19} color={colors.mutedForeground} />
          <Text style={styles.deliveryNoteText}>سيصل طلبك خلال 25–30 دقيقة تقريباً</Text>
        </View>
      </View>
    </ScrollView>
    <View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}>
      <PrimaryButton label="التالي" onPress={() => go('payment')} />
    </View>
  </View>
);

export const PaymentScreen = ({
  styles,
  colors,
  topPad,
  bottomPad,
  paymentMethod,
  setPaymentMethod,
  go,
  PrimaryButton,
}: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}>
      <CheckoutHeader styles={styles} colors={colors} topPad={topPad} step={2} title="طريقة الدفع" go={go} />
      <View style={styles.checkoutBody}>
        <Text style={styles.checkoutLabel}>اختر طريقة الدفع</Text>
        {[
          { id: 'cash', title: 'الدفع نقداً', sub: 'ادفع عند الاستلام', icon: 'cash-outline' as const },
          { id: 'card', title: 'بطاقة بنكية', sub: 'فيزا / ماستركارد', icon: 'card-outline' as const },
          { id: 'mada', title: 'مدى', sub: 'بطاقة مدى', icon: 'wallet-outline' as const },
          { id: 'apple', title: 'أبل باي', sub: 'الدفع السريع', icon: 'logo-apple' as const },
        ].map((method: any) => (
          <Pressable
            key={method.id}
            onPress={() => setPaymentMethod(method.id)}
            style={[
              styles.paymentOption,
              { flexDirection: 'row-reverse', direction: 'rtl', writingDirection: 'rtl', justifyContent: 'flex-end' },
              paymentMethod === method.id && styles.paymentOptionActive,
            ]}
          >
            <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]}>
              {paymentMethod === method.id ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ textAlign: 'right', alignSelf: 'flex-end', writingDirection: 'rtl', direction: 'rtl' }}>{method.title}</Text>
              <Text style={{ textAlign: 'right', alignSelf: 'flex-end', writingDirection: 'rtl', direction: 'rtl', color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>{method.sub}</Text>
            </View>
            <View style={styles.paymentIcon}>
              <Ionicons
                name={method.icon}
                size={21}
                color={paymentMethod === method.id ? colors.primary : colors.mutedForeground}
              />
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => go('payments')} style={styles.addAddressRow}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addAddressText}>إضافة بطاقة جديدة</Text>
        </Pressable>
      </View>
    </ScrollView>
    <View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}>
      <PrimaryButton label="التالي" onPress={() => go('review')} />
    </View>
  </View>
);

export const ReviewScreen = ({
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
}: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 30 }}>
      <CheckoutHeader styles={styles} colors={colors} topPad={topPad} step={3} title="مراجعة الطلب" go={go} />
      <View style={styles.checkoutBody}>
        <Text style={styles.checkoutLabel}>تفاصيل الطلب</Text>
        <View style={styles.reviewCard}>
          {cart.map((item: any) => (
            <View key={item.id} style={styles.reviewItem}>
              <Image source={item.image} style={styles.reviewImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewTitle}>{item.title}</Text>
                <Text style={styles.reviewSub}>الكمية: {item.quantity}</Text>
              </View>
              <Text style={styles.reviewPrice}>{money(item.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <Summary styles={styles} subtotal={subtotal} delivery={delivery} total={total} money={money} />
        </View>
        <Text style={styles.checkoutLabel}>عنوان التوصيل</Text>
        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={19} color={colors.primary} />
          <Text style={styles.infoCardText}>{address}</Text>
          <Ionicons name="chevron-back" size={17} color={colors.mutedForeground} />
        </View>
        <Text style={styles.checkoutLabel}>طريقة الدفع</Text>
        <View style={styles.infoCard}>
          <Ionicons name={paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'} size={19} color={colors.primary} />
          <Text style={styles.infoCardText}>
            {paymentMethod === 'cash' ? 'الدفع نقداً عند الاستلام' : 'بطاقة بنكية'}
          </Text>
          <Ionicons name="chevron-back" size={17} color={colors.mutedForeground} />
        </View>
      </View>
    </ScrollView>
    <View style={[styles.stickyCta, { paddingBottom: bottomPad + 12 }]}>
      <PrimaryButton
        label="تأكيد الطلب"
        onPress={() => {
          setDriverOrderStatus('pending');
          setScreen('track');
          setCart([]);
        }}
      />
    </View>
  </View>
);
