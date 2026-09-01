import React from 'react';
import { Pressable, ScrollView, View, Image } from 'react-native';
import { ArabicText as Text } from '@/components/ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export const OrdersTab = ({
  styles,
  colors,
  isEnglish,
  orderFilter,
  setOrderFilter,
  setExpandedOrderId,
  tap,
  expandedOrderId,
  products,
  addToCart,
  money,
  go,
  topPad,
  bottomPad,
  BottomTabs,
}: any) => {
  const orders: any[] = [
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

  const visibleOrders = orders.filter((order: any) => orderFilter === 'all' || order.status === orderFilter);
  const activeOrder = orders.find((order: any) => order.status === 'active');
  const filterTabs = [
    { id: 'all', label: 'الكل', count: orders.length },
    { id: 'active', label: 'الجارية', count: orders.filter((order: any) => order.status === 'active').length },
    { id: 'past', label: 'السابقة', count: orders.filter((order: any) => order.status === 'completed').length },
  ];

  const reorder = (items: any[]) => {
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
            style={({ pressed }: any) => [styles.activeOrderBanner, pressed && styles.pressed]}
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
          {filterTabs.map((tab: any) => {
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
                style={({ pressed }: any) => [
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

        {visibleOrders.length > 0 ? visibleOrders.map((order: any) => {
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
                style={({ pressed }: any) => [styles.orderCardTop, pressed && styles.pressed]}
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
                {order.items.slice(0, 2).map((item: any, index: number) => (
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
                  {order.items.map((item: any) => (
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
            <Pressable accessibilityLabel="استكشف الأقسام" onPress={() => go('categories')} style={({ pressed }: any) => [styles.emptyReset, pressed && styles.pressed]}>
              <Text style={styles.emptyResetText}>استكشف الأقسام</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <BottomTabs />
    </View>
  );
};
