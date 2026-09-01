import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ArabicText as Text } from '@/components/ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export const AccountTab = ({
  styles,
  colors,
  isEnglish,
  name,
  phone,
  offerNotifications,
  setOfferNotifications,
  go,
  setIsEditingProfile,
  isEditingProfile,
  setName,
  setPhone,
  topPad,
  bottomPad,
  BottomTabs,
}: any) => {
  const displayName = name.trim() || (isEnglish ? 'Mohammed Ahmed' : 'محمد أحمد');
  const displayPhone = phone.trim() ? `+249 ${phone.trim()}` : '+249 912 345 678';

  const quickActions = [
    { label: isEnglish ? 'Favorites' : 'المفضلة', sub: isEnglish ? '8 saved dishes' : '8 أطباق محفوظة', icon: 'heart-outline', target: 'favorites' },
    { label: isEnglish ? 'Addresses' : 'العناوين', sub: isEnglish ? '2 saved places' : 'مكانان محفوظان', icon: 'location-outline', target: 'addresses' },
    { label: isEnglish ? 'Payments' : 'الدفع', sub: isEnglish ? '2 methods' : 'طريقتان محفوظتان', icon: 'card-outline', target: 'payments' },
  ];

  const accountRows = [
    {
      title: isEnglish ? 'Notifications' : 'الإشعارات',
      sub: offerNotifications ? (isEnglish ? 'Offers and order updates are on' : 'العروض وتحديثات الطلب مفعّلة') : (isEnglish ? 'Offers are off' : 'العروض غير مفعّلة'),
      icon: 'notifications-outline',
      onPress: () => setOfferNotifications((current: boolean) => !current),
      trailing: (
        <View style={[styles.accountToggle, offerNotifications && styles.accountToggleOn]}>
          <View style={[styles.accountToggleKnob, offerNotifications && styles.accountToggleKnobOn]} />
        </View>
      ),
    },
    {
      title: isEnglish ? 'Settings' : 'الإعدادات',
      sub: isEnglish ? 'Language, privacy and more' : 'اللغة والخصوصية والمزيد',
      icon: 'settings-outline',
      onPress: () => go('settings'),
      trailing: <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />,
    },
    {
      title: isEnglish ? 'Help & support' : 'المساعدة والدعم',
      sub: isEnglish ? 'We are here whenever you need us' : 'نحن هنا متى احتجت إلينا',
      icon: 'help-circle-outline',
      onPress: () => go('support'),
      trailing: <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />,
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: topPad + 10, paddingBottom: bottomPad + 100 }}>
        <View style={styles.pageTop}>
          <Text style={styles.pageTitle}>{isEnglish ? 'My account' : 'حسابي'}</Text>
          <Text style={styles.pageSubtitle}>{isEnglish ? 'Everything you need, in one place' : 'كل ما يخصك في مكان واحد'}</Text>
        </View>

        <LinearGradient colors={['#F97316', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.accountProfileCard}>
          <View style={styles.accountProfileHeader}>
            <View style={styles.accountAvatar}>
              <Ionicons name="person" size={29} color="#fff" />
              <View style={styles.accountVerified}><Ionicons name="checkmark" size={10} color={colors.primary} /></View>
            </View>
            <Pressable
              accessibilityLabel={isEnglish ? 'Open notifications' : 'فتح الإشعارات'}
              onPress={() => go('notifications')}
              style={styles.accountNotificationPill}
            >
              <Ionicons name="notifications-outline" size={16} color="#fff" />
              <View style={styles.accountNotificationDot} />
            </Pressable>
          </View>

          <View style={styles.accountProfileTop}>
            <View style={styles.accountProfileCopy}>
              <Text style={styles.accountNameLight}>{displayName}</Text>
              <Text style={styles.accountMetaLight}>{displayPhone}</Text>
            </View>
          </View>

          <View style={styles.accountProfileFooter}>
            <View style={styles.accountBadge}><Text style={styles.accountBadgeText}>{isEnglish ? 'Verified' : 'موثّق'}</Text></View>
            <Text style={styles.accountStatus}>{isEnglish ? 'Member since 2023' : 'عضو منذ 2023'}</Text>
          </View>
        </LinearGradient>

        <View style={styles.accountQuickActions}>
          {quickActions.map((item: any) => (
            <Pressable key={item.label} onPress={() => go(item.target)} style={styles.accountQuickCard}>
              <View style={styles.accountQuickIcon}><Ionicons name={item.icon} size={20} color={colors.primary} /></View>
              <Text style={styles.accountQuickTitle}>{item.label}</Text>
              <Text style={styles.accountQuickSub}>{item.sub}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.accountList}>
          {accountRows.map((item: any) => (
            <Pressable key={item.title} onPress={item.onPress} style={styles.accountRow}>
              <View style={styles.accountRowIcon}><Ionicons name={item.icon} size={20} color={colors.primary} /></View>
              <View style={styles.accountRowCopy}>
                <Text style={styles.accountRowTitle}>{item.title}</Text>
                <Text style={styles.accountRowSub}>{item.sub}</Text>
              </View>
              {item.trailing}
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityLabel={isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي'}
          style={({ pressed }: any) => [styles.driverEditProfileButton, pressed && styles.pressed]}
          onPress={() => setIsEditingProfile((current: boolean) => !current)}
        >
          <Ionicons name={isEditingProfile ? 'close-outline' : 'create-outline'} size={18} color={colors.primary} />
          <Text style={styles.driverEditProfileText}>{isEditingProfile ? (isEnglish ? 'Cancel editing' : 'إلغاء التعديل') : (isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي')}</Text>
        </Pressable>

        {isEditingProfile ? (
          <View style={styles.driverProfileEditPanel}>
            <Text style={styles.driverProfileInputLabel}>{isEnglish ? 'Full name' : 'الاسم الكامل'}</Text>
            <View style={styles.driverProfileInputWrap}>
              <Text onPress={() => setName('')} style={styles.driverProfileClear}>×</Text>
              <Text onPress={() => setName(name)} style={styles.driverProfileInputText}>{name || (isEnglish ? 'Mohammed Ahmed' : 'محمد أحمد')}</Text>
            </View>
            <Text style={styles.driverProfileInputLabel}>{isEnglish ? 'Phone number' : 'رقم الهاتف'}</Text>
            <View style={styles.driverProfileInputWrap}>
              <Text onPress={() => setPhone('')} style={styles.driverProfileClear}>×</Text>
              <Text onPress={() => setPhone(phone)} style={styles.driverProfileInputText}>{phone || '+249 912 345 678'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <BottomTabs />
    </View>
  );
};
