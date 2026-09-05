import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { ArabicText as Text, ArabicTextInput as TextInput } from '@/components/ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function CategoriesTabRoute() {
  return null;
}

export const CategoriesTab = ({
  styles,
  colors,
  isEnglish,
  categoryQuery,
  setCategoryQuery,
  categoryFilter,
  setCategoryFilter,
  sortOption,
  setSortOption,
  setShowAllCategoryProducts,
  showAllCategoryProducts,
  setShowCategoryFilters,
  showCategoryFilters,
  focusCategorySearch,
  setFocusCategorySearch,
  products,
  productCategoryFilters,
  tap,
  chooseProduct,
  addToCart,
  money,
  topPad,
  bottomPad,
  BottomTabs,
}: any) => {
  const categoryCards = [
    { title: 'مطاعم', sub: 'وجبات تحبها', filter: 'مطاعم', icon: 'restaurant-outline', tint: '#FBE1DF' },
    { title: 'بقالة', sub: 'طازج كل يوم', filter: 'بقالة', icon: 'basket-outline', tint: '#E5F3E9' },
    { title: 'مخبوزات', sub: 'مخبوزة بحب', filter: 'مخبوزات', icon: 'cafe-outline', tint: '#F7EED9' },
    { title: 'مشروبات', sub: 'باردة وساخنة', filter: 'مشروبات', icon: 'wine-outline', tint: '#E4EFFA' },
    { title: 'معدات بناء وكهرباء', sub: 'أدوات ومستلزمات', filter: 'معدات بناء وكهرباء', icon: 'construct-outline', tint: '#F3E8D2' },
    { title: 'صيدليات', sub: 'أدوية وعناية', filter: 'صيدليات', icon: 'medkit-outline', tint: '#E5F3E9' },
    { title: 'مستشفيات', sub: 'رعاية صحية', filter: 'مستشفيات', icon: 'business-outline', tint: '#E4EFFA' },
    { title: 'هواتف واكسسوارات', sub: 'أجهزة وملحقات', filter: 'هواتف واكسسوارات', icon: 'phone-portrait-outline', tint: '#EDE7F6' },
    { title: 'بوتيكات وادوات تجميل', sub: 'أزياء وعناية', filter: 'بوتيكات وادوات تجميل', icon: 'color-palette-outline', tint: '#FBE1DF' },
    { title: 'هدايا', sub: 'مناسبات وفرح', filter: 'هدايا', icon: 'gift-outline', tint: '#F7EED9' },
    { title: 'شقق وفنادق', sub: 'إقامة مريحة', filter: 'شقق وفنادق', icon: 'bed-outline', tint: '#E4EFFA' },
    { title: 'أخرى', sub: 'خدمات متنوعة', filter: 'أخرى', icon: 'grid-outline', tint: '#F4F1EE' },
  ];

  const filterOptions = productCategoryFilters;
  const normalizeSearch = (value: string) => value
    .trim()
    .toLowerCase()
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
  const normalizedQuery = normalizeSearch(categoryQuery);
  const filteredProducts = products.filter((item: any) => {
    const matchesFilter = categoryFilter === 'الكل' || item.category === categoryFilter;
    const matchesQuery = !normalizedQuery
      || normalizeSearch(item.title).includes(normalizedQuery)
      || normalizeSearch(item.subtitle).includes(normalizedQuery)
      || normalizeSearch(item.category).includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });
  const sortedProducts = [...filteredProducts].sort((first: any, second: any) => {
    if (sortOption === 'price-low') return first.price - second.price;
    if (sortOption === 'price-high') return second.price - first.price;
    if (sortOption === 'alphabetical') return normalizeSearch(first.title).localeCompare(normalizeSearch(second.title), 'ar');
    return products.indexOf(first) - products.indexOf(second);
  });
  const visibleProducts = showAllCategoryProducts ? sortedProducts : sortedProducts.slice(0, 6);
  const visibleCategories = categoryCards.filter((item) => {
    if (!normalizedQuery) return true;
    return normalizeSearch(`${item.title} ${item.sub}`).includes(normalizedQuery);
  });

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

  const filterChips = filterOptions.map((filter: string) => {
    const isActive = categoryFilter === filter;
    return (
      <Pressable
        accessibilityLabel={`عرض ${filter}`}
        key={filter}
        onPress={() => selectFilter(filter)}
        style={({ pressed }: any) => [
          styles.categoryFilter,
          { flexDirection: 'row' },
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
            onChangeText={(value: string) => {
              setCategoryQuery(value);
              setShowAllCategoryProducts(false);
            }}
            placeholder="ابحث في الوجبات والأقسام"
            placeholderTextColor={colors.mutedForeground}
            style={styles.searchInput}
            textAlign="right"
            returnKeyType="search"
            onSubmitEditing={() => setShowAllCategoryProducts(true)}
            autoFocus={focusCategorySearch}
            onFocus={() => setFocusCategorySearch(false)}
          />
          {categoryQuery.trim() ? (
            <Pressable
              accessibilityLabel="مسح البحث"
              onPress={() => {
                setCategoryQuery('');
                setShowAllCategoryProducts(false);
              }}
              style={({ pressed }: any) => [styles.searchClearButton, pressed && styles.pressed]}
            >
              <Ionicons name="close-circle" size={19} color={colors.mutedForeground} />
            </Pressable>
          ) : null}

        </View>

        <Pressable
          accessibilityLabel="فتح فلاتر الأقسام"
          accessibilityState={{ selected: showCategoryFilters }}
          onPress={() => {
            setShowCategoryFilters((current: boolean) => !current);
            tap();
          }}
          style={({ pressed }: any) => [
            styles.categoryFilterButton,
            { flexDirection: 'row' },
            showCategoryFilters && styles.categoryFilterButtonActive,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.categoryFilterButtonIcon}>
            <Ionicons name={showCategoryFilters ? 'options' : 'options-outline'} size={18} color={showCategoryFilters ? '#FFFFFF' : colors.primary} />
          </View>
          <View style={styles.categoryFilterButtonCopy}>
            <Text style={[styles.categoryFilterButtonTitle, showCategoryFilters && styles.categoryFilterButtonTitleActive]}>فلترة الأقسام</Text>
            <Text style={[styles.categoryFilterButtonSub, showCategoryFilters && styles.categoryFilterButtonSubActive]}>{categoryFilter === 'الكل' ? 'عرض جميع الأقسام' : `القسم المحدد: ${categoryFilter}`}</Text>
          </View>
          <Ionicons name={showCategoryFilters ? 'chevron-up' : 'chevron-down'} size={18} color={showCategoryFilters ? '#FFFFFF' : colors.mutedForeground} />
        </Pressable>

        <View style={styles.categoryGrid}>
          {visibleCategories.map((item: any) => {
            const isActive = categoryFilter === item.filter;
            return (
              <Pressable
                key={item.filter}
                onPress={() => {
                  setCategoryFilter(item.filter);
                  setShowCategoryFilters(false);
                  setShowAllCategoryProducts(false);
                  setCategoryQuery('');
                }}
                style={({ pressed }: any) => [
                  styles.categoryGridItem,
                  isActive && styles.categoryGridItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.categoryGridIcon, { backgroundColor: isActive ? colors.primary : item.tint }]}>
                  <Ionicons name={item.icon} size={22} color={isActive ? '#FFFFFF' : colors.primary} />
                </View>
                <Text style={[styles.categoryGridTitle, isActive && styles.categoryGridTitleActive]}>{item.title}</Text>
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
              accessibilityLabel="إغلاق فلاتر الأقسام"
              onPress={() => setShowCategoryFilters(false)}
              style={styles.categoryFilterBackdrop}
            />
            <View style={styles.categoryFilterSheet}>
              <View style={styles.categoryFilterSheetHandle} />
              <View style={styles.categoryFilterSheetHeader}>
                <View>
                  <Text style={styles.categoryFilterSheetTitle}>فلترة الأقسام</Text>
                  <Text style={styles.categoryFilterSheetSubtitle}>اختر القسم لعرض المنتجات المناسبة</Text>
                </View>
                <Pressable
                  accessibilityLabel="إغلاق فلاتر الأقسام"
                  onPress={() => setShowCategoryFilters(false)}
                  style={({ pressed }: any) => [styles.categoryFilterSheetClose, pressed && styles.pressed]}
                >
                  <Ionicons name="close" size={20} color={colors.ink} />
                </Pressable>
              </View>
              <View style={styles.categoryFilterCurrent}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={styles.categoryFilterCurrentText}>{categoryFilter === 'الكل' ? 'كل الأقسام محددة' : `القسم الحالي: ${categoryFilter}`}</Text>
              </View>
              <Text style={styles.categoryFilterModalSectionTitle}>{isEnglish ? 'Sort products' : 'ترتيب المنتجات'}</Text>
              <View style={styles.categorySortList}>
                {sortOptions.map((option) => {
                  const isSelected = sortOption === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        setSortOption(option.id);
                        setShowAllCategoryProducts(false);
                      }}
                      style={({ pressed }: any) => [
                        styles.categorySortOption,
                        { flexDirection: 'row-reverse' },
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
              <Text style={styles.categoryFilterModalSectionTitle}>{isEnglish ? 'Filter by category' : 'التصفية حسب القسم'}</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryFilterModalList}
              >
                {filterChips}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={styles.categorySectionHeader}>
          <Text style={styles.sectionTitle}>{isEnglish ? 'Popular picks' : 'منتجات شائعة'}</Text>
          <Text style={styles.sectionAction}>{filteredProducts.length} {isEnglish ? 'results' : 'نتيجة'}</Text>
        </View>

        {visibleProducts.length > 0 ? (
          <View style={styles.productGrid}>
            {visibleProducts.map((item: any) => (
            <Pressable
              key={item.id}
              onPress={() => chooseProduct(item)}
              style={styles.productCard}
            >
              <View style={styles.productImageWrap}>
                <Text style={styles.productImagePlaceholder}>{item.title.slice(0, 1)}</Text>
                <Pressable onPress={() => addToCart(item)} style={styles.addCircle}>
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
            ))}
          </View>
        ) : (
          <View style={styles.categoryEmpty}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={30} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>{isEnglish ? 'No results found' : 'ما لقينا نتائج'}</Text>
            <Text style={styles.emptySub}>{isEnglish ? 'Try another word or category' : 'جرّب كلمة ثانية أو قسماً مختلفاً'}</Text>
            <Pressable
              accessibilityLabel={isEnglish ? 'Clear category search' : 'مسح بحث الأقسام'}
              onPress={() => {
                setCategoryQuery('');
                setCategoryFilter('الكل');
                setShowAllCategoryProducts(false);
              }}
              style={({ pressed }: any) => [styles.emptyReset, pressed && styles.pressed]}
            >
              <Text style={styles.emptyResetText}>{isEnglish ? 'Show all products' : 'عرض كل المنتجات'}</Text>
            </Pressable>
          </View>
        )}
        {visibleProducts.length < filteredProducts.length ? (
          <Pressable
            accessibilityLabel={isEnglish ? 'Show all category results' : 'عرض كل نتائج القسم'}
            onPress={() => setShowAllCategoryProducts(true)}
            style={({ pressed }: any) => [styles.loadMoreButton, pressed && styles.pressed]}
          >
            <Text style={styles.loadMoreText}>{isEnglish ? 'Show all results' : 'عرض كل النتائج'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </ScrollView>
      <BottomTabs />
    </View>
  );
};
