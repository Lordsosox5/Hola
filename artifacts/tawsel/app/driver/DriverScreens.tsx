import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ArabicText as Text, ArabicTextInput as TextInput } from '@/components/ArabicText';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const DriverHeader = ({ title, subtitle, onBack, styles, colors, go }: any) => (
  <View style={[styles.driverHeader, { paddingTop: 12 }]}> 
    <Pressable onPress={onBack ?? (() => go('home'))} style={styles.driverHeaderButton}>
      <Ionicons name="chevron-back" size={21} color={colors.ink} />
    </Pressable>
    <View style={styles.driverHeaderCopy}>
      <Text style={styles.driverHeaderTitle}>{title}</Text>
      {subtitle ? <Text style={styles.driverHeaderSubtitle}>{subtitle}</Text> : null}
    </View>
    <View style={styles.driverHeaderButtonPlaceholder} />
  </View>
);

const DriverOrderStatusPill = ({ driverOrderStatus, styles, colors }: any) => (
  <View style={[styles.driverOrderStatusPill, driverOrderStatus === 'pending' && styles.driverOrderStatusPillPending]}>
    <Text style={styles.driverOrderStatusText}>{driverOrderStatus === 'pending' ? 'جديد' : 'نشط'}</Text>
  </View>
);

export const DriverDashboardScreen = ({ styles, colors, isEnglish, driverOnline, setDriverOnline, driverOrderStatus, go, money, setScreen }: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <DriverHeader title={isEnglish ? 'Driver center' : 'مركز السائق'} subtitle={isEnglish ? 'Deliver with Tawsel' : 'وصّل مع توصيل'} styles={styles} colors={colors} go={go} />
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
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: driverOnline }} onPress={() => setDriverOnline((current: boolean) => !current)} style={[styles.driverToggle, driverOnline && styles.driverToggleOn]}>
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
        <Pressable accessibilityLabel={isEnglish ? 'Review new order' : 'مراجعة الطلب الجديد'} onPress={() => go('driverOrder')} style={({ pressed }: any) => [styles.driverIncomingCard, pressed && styles.pressed]}>
          <View style={styles.driverIncomingTop}>
            <View style={styles.driverIncomingIcon}><Ionicons name="bag-handle-outline" size={23} color="#fff" /></View>
            <View style={styles.driverIncomingCopy}>
              <View style={styles.driverOrderTitleRow}><Text style={styles.driverOrderTitle}>{isEnglish ? 'New delivery request' : 'طلب توصيل جديد'}</Text><DriverOrderStatusPill driverOrderStatus={driverOrderStatus} styles={styles} colors={colors} /></View>
              <Text style={styles.driverRestaurantName}>{isEnglish ? 'Pizza Hut' : 'بيتزا هت'}</Text>
              <Text style={styles.driverRestaurantDetail}>{isEnglish ? 'University Street branch' : 'فرع شارع الجامعة'} · 12 min</Text>
            </View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.driverEmptyCard}><View style={styles.driverEmptyIcon}><Ionicons name={driverOnline ? 'checkmark-circle-outline' : 'moon-outline'} size={27} color={colors.primary} /></View><Text style={styles.driverEmptyTitle}>{driverOnline ? (isEnglish ? 'No active requests' : 'لا توجد طلبات حالياً') : (isEnglish ? 'You are offline' : 'أنت غير متصل')}</Text><Text style={styles.driverEmptySub}>{driverOnline ? (isEnglish ? 'New requests will appear here.' : 'ستظهر الطلبات الجديدة هنا.') : (isEnglish ? 'Go online to receive a delivery request.' : 'اتصل بالإنترنت لاستقبال طلب توصيل.')}</Text></View>
      )}
    </ScrollView>
  </View>
);

export const DriverDeliveriesScreen = ({ styles, colors, isEnglish, driverOrderStatus, go }: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <DriverHeader title={isEnglish ? 'Deliveries' : 'التوصيلات'} subtitle={isEnglish ? 'Manage your delivery requests' : 'إدارة طلبات التوصيل'} styles={styles} colors={colors} go={go} />
      <View style={styles.driverTabIntro}>
        <View>
          <Text style={styles.driverSectionEyebrow}>{isEnglish ? 'Today' : 'اليوم'}</Text>
          <Text style={styles.driverTabIntroTitle}>{isEnglish ? 'Your delivery activity' : 'نشاط التوصيل الخاص بك'}</Text>
        </View>
        <View style={styles.driverTabCount}><Text style={styles.driverTabCountValue}>8</Text><Text style={styles.driverTabCountLabel}>{isEnglish ? 'completed' : 'مكتملة'}</Text></View>
      </View>
      <Text style={styles.driverTabSectionTitle}>{isEnglish ? 'Current delivery' : 'التوصيلة الحالية'}</Text>
      <Pressable onPress={() => go(driverOrderStatus === 'pending' ? 'driverOrder' : 'driverMap')} style={({ pressed }: any) => [styles.driverDeliveryCard, pressed && styles.pressed]}>
        <View style={styles.driverDeliveryCardTop}>
          <View style={styles.driverDeliveryIcon}><Ionicons name="bicycle" size={22} color="#fff" /></View>
          <View style={styles.driverDeliveryCopy}>
            <Text style={styles.driverDeliveryTitle}>{driverOrderStatus === 'pending' ? (isEnglish ? 'New delivery request' : 'طلب توصيل جديد') : (isEnglish ? 'Active delivery' : 'التوصيلة الحالية')}</Text>
            <Text style={styles.driverDeliverySub}>{isEnglish ? 'Pizza Hut' : 'بيتزا هت'} · {isEnglish ? 'Mohammed' : 'محمد'}</Text>
          </View>
          <DriverOrderStatusPill driverOrderStatus={driverOrderStatus} styles={styles} colors={colors} />
        </View>
      </Pressable>
    </ScrollView>
  </View>
);

export const DriverEarningsScreen = ({ styles, colors, isEnglish, go }: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <DriverHeader title={isEnglish ? 'Earnings' : 'الأرباح'} subtitle={isEnglish ? 'Track your income' : 'تابع دخلك'} styles={styles} colors={colors} go={go} />
      <View style={styles.driverEarningsHero}>
        <View><Text style={styles.driverEarningsEyebrow}>{isEnglish ? 'Available balance' : 'الرصيد المتاح'}</Text><Text style={styles.driverEarningsValue}>1,240 <Text style={styles.driverEarningsCurrency}>SAR</Text></Text><Text style={styles.driverEarningsSub}>{isEnglish ? '+12% from last week' : '+12% من الأسبوع الماضي'}</Text></View>
        <View style={styles.driverEarningsIcon}><Ionicons name="wallet-outline" size={25} color="#fff" /></View>
      </View>
    </ScrollView>
  </View>
);

export const DriverAccountScreen = ({ styles, colors, isEnglish, name, phone, go, setIsEditingProfile, isEditingProfile, setName, setPhone }: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <DriverHeader title={isEnglish ? 'Account' : 'الحساب'} subtitle={isEnglish ? 'Your driver account' : 'حساب السائق الخاص بك'} styles={styles} colors={colors} go={go} />
      <View style={styles.driverProfileCard}>
        <View style={styles.driverProfileAvatar}><Ionicons name="person" size={30} color="#fff" /></View>
        <Text style={styles.driverProfileName}>{name.trim() || (isEnglish ? 'Mohammed Ahmed' : 'محمد أحمد')}</Text>
        <Text style={styles.driverProfilePhone}>{phone.trim() ? `+249 ${phone.trim()}` : '+249 912 345 678'}</Text>
        <View style={styles.driverRatingPill}><Ionicons name="star" size={14} color="#F3B43F" /><Text style={styles.driverRatingText}>4.9 · 128 {isEnglish ? 'reviews' : 'تقييماً'}</Text></View>
      </View>
      <Pressable accessibilityLabel={isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي'} style={({ pressed }: any) => [styles.driverEditProfileButton, pressed && styles.pressed]} onPress={() => setIsEditingProfile((current: boolean) => !current)}>
        <Ionicons name={isEditingProfile ? 'close-outline' : 'create-outline'} size={18} color={colors.primary} />
        <Text style={styles.driverEditProfileText}>{isEditingProfile ? (isEnglish ? 'Cancel editing' : 'إلغاء التعديل') : (isEnglish ? 'Edit profile' : 'تعديل الملف الشخصي')}</Text>
      </Pressable>
      {isEditingProfile ? (
        <View style={styles.driverProfileEditPanel}>
          <TextInput value={name} onChangeText={setName} placeholder={isEnglish ? 'Your name' : 'اسمك'} placeholderTextColor={colors.mutedForeground} style={styles.driverProfileInput} textAlign="right" />
          <TextInput value={phone} onChangeText={setPhone} placeholder={isEnglish ? 'Phone number' : 'رقم الهاتف'} placeholderTextColor={colors.mutedForeground} style={styles.driverProfileInput} keyboardType="phone-pad" textAlign="right" />
        </View>
      ) : null}
    </ScrollView>
  </View>
);

export const DriverSettingsScreen = ({ styles, colors, isEnglish, driverNotifications, setDriverNotifications, setIsEnglish, go, resetTo }: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <DriverHeader title={isEnglish ? 'Settings' : 'الإعدادات'} subtitle={isEnglish ? 'Control your driver preferences' : 'تحكم في تفضيلات السائق'} styles={styles} colors={colors} go={go} />
      <Text style={styles.driverSettingsSection}>{isEnglish ? 'Preferences' : 'التفضيلات'}</Text>
      <Pressable style={styles.driverSettingRow} onPress={() => setIsEnglish((current: boolean) => !current)}><View style={styles.driverSettingIcon}><Ionicons name="language-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Language' : 'اللغة'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'English' : 'العربية'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>
      <View style={styles.driverSettingRow}><View style={styles.driverSettingIcon}><Ionicons name="notifications-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Delivery notifications' : 'إشعارات التوصيل'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Receive new request alerts' : 'استقبل تنبيهات الطلبات الجديدة'}</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: driverNotifications }} onPress={() => setDriverNotifications((current: boolean) => !current)} style={[styles.driverToggle, driverNotifications && styles.driverToggleOn]}><View style={[styles.driverToggleKnob, driverNotifications && styles.driverToggleKnobOn]} /></Pressable></View>
      <Text style={styles.driverSettingsSection}>{isEnglish ? 'Support' : 'الدعم'}</Text>
      <Pressable style={styles.driverSettingRow} onPress={() => go('driverSupport')}><View style={styles.driverSettingIcon}><Ionicons name="help-circle-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Help center' : 'مركز المساعدة'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Get help with deliveries' : 'احصل على المساعدة في التوصيلات'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>
      <Pressable style={styles.driverSettingRow} onPress={() => resetTo('intro')}><View style={styles.driverSettingIcon}><Ionicons name="log-out-outline" size={20} color={colors.primary} /></View><View style={styles.driverSettingCopy}><Text style={styles.driverSettingTitle}>{isEnglish ? 'Log out' : 'تسجيل الخروج'}</Text><Text style={styles.driverSettingSub}>{isEnglish ? 'Switch account or role' : 'تبديل الحساب أو نوع المستخدم'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>
    </ScrollView>
  </View>
);

export const DriverSupportScreen = ({ styles, colors, isEnglish, go, driverSupportQuery, setDriverSupportQuery, driverSupportMessage, setDriverSupportMessage, driverSupportSent, setDriverSupportSent, setExpandedDriverFaq, expandedDriverFaq }: any) => (
  <View style={styles.screen}>
    <StatusBar style="dark" />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <DriverHeader title={isEnglish ? 'Support' : 'الدعم'} subtitle={isEnglish ? 'Driver help center' : 'مركز دعم السائق'} styles={styles} colors={colors} go={go} />
      <View style={styles.driverSupportSearch}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput value={driverSupportQuery} onChangeText={setDriverSupportQuery} placeholder={isEnglish ? 'Search help topics' : 'ابحث عن المواضيع'} placeholderTextColor={colors.mutedForeground} style={styles.driverSupportInput} />
      </View>
      {driverSupportSent ? <View style={styles.driverSupportSent}><Text style={styles.driverSupportSentText}>{isEnglish ? 'Message sent to support.' : 'تم إرسال الرسالة إلى الدعم.'}</Text></View> : null}
      <View style={styles.driverFaqList}>
        {[{ question: isEnglish ? 'How do I accept a delivery request?' : 'كيف أقبل طلب توصيل؟', answer: isEnglish ? 'Open the request and review the pickup details.' : 'افتح الطلب ثم راجع تفاصيل الاستلام.' }, { question: isEnglish ? 'Why am I not receiving new requests?' : 'لماذا لا تصلني طلبات جديدة؟', answer: isEnglish ? 'Make sure you are online and notifications are enabled.' : 'تأكد أنك متصل وأن الإشعارات مفعلة.' }].map((item: any, index: number) => (
          <Pressable key={index} onPress={() => setExpandedDriverFaq((current: number | null) => current === index ? null : index)} style={styles.driverFaqCard}>
            <View style={styles.driverFaqHeader}>
              <Text style={styles.driverFaqQuestion}>{item.question}</Text>
              <Ionicons name={expandedDriverFaq === index ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </View>
            {expandedDriverFaq === index ? <Text style={styles.driverFaqAnswer}>{item.answer}</Text> : null}
          </Pressable>
        ))}
      </View>
      <View style={styles.driverSupportMessageBox}>
        <TextInput value={driverSupportMessage} onChangeText={setDriverSupportMessage} placeholder={isEnglish ? 'Write your message...' : 'اكتب رسالتك...'} placeholderTextColor={colors.mutedForeground} multiline style={styles.driverSupportTextArea} />
        <Pressable onPress={() => setDriverSupportSent(true)} style={styles.driverSupportSendButton}><Text style={styles.driverSupportSendText}>{isEnglish ? 'Send' : 'إرسال'}</Text></Pressable>
      </View>
    </ScrollView>
  </View>
);
