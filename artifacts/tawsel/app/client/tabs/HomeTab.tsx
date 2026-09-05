import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const SectionTitle = ({ title, action, onPress, styles, colors }: any) => (
  <View style={styles.sectionTitleRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Pressable onPress={onPress}>
      <Text style={styles.sectionAction}>{action}</Text>
    </Pressable>
  </View>
);

const ProductCard = ({ item, onPress, onAdd, styles, colors, isEnglish, money }: any) => (
  <Pressable onPress={onPress} style={styles.productCard}>
    <View style={styles.productImageWrap}>
      <Image source={item.image} style={styles.productImage} />
      <Pressable onPress={onAdd} style={styles.addCircle}>
        <Ionicons name="add" size={18} color="#fff" />
      </Pressable>
    </View>
    <Text style={styles.productTitle}>{item.title}</Text>
    <Text style={styles.productSubtitle}>{item.subtitle}</Text>
    <View style={styles.productBottom}>
      <Text style={styles.price}>{money(item.price, isEnglish)}</Text>
      <View style={styles.miniRating}>
        <Ionicons name="star" size={12} color={colors.accent} />
        <Text style={styles.miniRatingText}>{item.rating}</Text>
      </View>
    </View>
  </Pressable>
);

export default function HomeTabRoute() {
  return null;
}

export const HomeTab = ({
  styles,
  colors,
  isEnglish,
  go,
  address,
  addToCart,
  chooseProduct,
  categoryFilter,
  setCategoryFilter,
  setCategoryQuery,
  setShowAllCategoryProducts,
  setShowCategoryFilters,
  products,
  productCategoryFilters,
  selectedRestaurant,
  setSelectedRestaurant,
  restaurants,
  money,
  cartCount,
  topPad,
  bottomPad,
  BottomTabs,
}: any) => {
  const homeFilterChips = productCategoryFilters.map((filter: string) => {
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
        style={({ pressed }: any) => [
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
              <Pressable onPress={() => go('addresses')} style={styles.locationLine}>
                <Ionicons name="location" size={15} color={colors.primary} />
                <Text style={styles.locationText}>{address || 'إضافة عنوان'}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable onPress={() => go('restaurant')} style={styles.promoCard}>
          <View style={styles.promoCopy}>
            <Text style={styles.promoEyebrow}>لفترة محدودة</Text>
            <Text style={styles.promoTitle}>خصم 20%<Text style={styles.promoTitleSmall}> على أول طلب</Text></Text>
            <Text style={styles.promoCode}>TAWSEL20</Text>
          </View>
          <View style={[styles.promoArrow, isEnglish ? styles.promoArrowEnglish : styles.promoArrowArabic]}>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </Pressable>

        <SectionTitle title="مطاعم مميزة" action="عرض الكل" onPress={() => go('categories')} styles={styles} colors={colors} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {restaurants.slice(0, 3).map((restaurant: any) => (
            <Pressable
              key={restaurant.name}
              onPress={() => {
                setSelectedRestaurant(restaurant);
                go('restaurant');
              }}
              style={styles.restaurantCard}
            >
              <View>
                <Image source={restaurant.image} style={styles.restaurantImage} />
                <View style={[styles.restaurantTag, { backgroundColor: restaurant.color }]}>
                  <Text style={styles.restaurantTagText}>توصيل سريع</Text>
                </View>
              </View>
              <View style={styles.restaurantMeta}>
                <View>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  <Text style={styles.restaurantType}>{restaurant.type} · {restaurant.eta}</Text>
                </View>
                <View style={styles.rating}>
                  <Ionicons name="star" size={13} color={colors.accent} />
                  <Text style={styles.ratingText}>{restaurant.rating}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="اختياراتنا لك" action="عرض الكل" onPress={() => go('categories')} styles={styles} colors={colors} />
        <Text style={styles.homeChoicesSubtitle}>{isEnglish ? 'Handpicked picks for your next order' : 'اختيارات مميزة لطلبك القادم'}</Text>
        <View style={styles.productGrid}>
          {products.slice(0, 4).map((item: any) => (
            <ProductCard
              key={item.id}
              item={item}
              onPress={() => chooseProduct(item)}
              onAdd={() => addToCart(item)}
              styles={styles}
              colors={colors}
              isEnglish={isEnglish}
              money={money}
            />
          ))}
        </View>
      </ScrollView>
      <BottomTabs />
    </View>
  );
};
