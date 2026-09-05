import { useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock3,
  Copy,
  CreditCard,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  TimerReset,
  X,
} from 'lucide-react';
import {
  getListAdminPaymentSubmissionsQueryKey,
  useConfirmAdminPaymentSubmission,
  useListAdminPaymentSubmissions,
  type PaymentSubmission,
} from '@workspace/api-client-react';

const pendingParams = { status: 'pending' as const };

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-SD', {
    style: 'currency',
    currency: 'SDG',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SD', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatAge(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function paymentMethodLabel(method: string) {
  const normalized = method.toLowerCase().replace(/[-\s]/g, '_');
  const labels: Record<string, string> = {
    bank_transfer: 'تحويل بنكي',
    mobile_money: 'محفظة إلكترونية',
    cash: 'دفع نقدي',
    card: 'بطاقة',
  };
  return labels[normalized] ?? method;
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'error' in error) {
    return String((error as { error: unknown }).error);
  }
  if (error instanceof Error) return error.message;
  return 'تعذر تحميل طلبات الدفع. حاول مرة أخرى.';
}

function Sidebar() {
  return (
    <aside className="relative flex min-h-[88px] w-full shrink-0 flex-col justify-between overflow-hidden bg-sidebar px-5 py-5 text-sidebar-foreground lg:min-h-dvh lg:w-[248px] lg:px-4 lg:py-6">
      <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full border-[20px] border-sidebar-accent/60" />
      <div className="pointer-events-none absolute -bottom-20 -right-14 h-44 w-44 rounded-full border-[18px] border-sidebar-accent/40" />
      <div className="relative">
        <div className="mb-9 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/10">
            <span className="font-mono text-xl font-bold tracking-[-0.12em]">طـ</span>
          </div>
          <div>
            <p className="text-[17px] font-bold leading-none text-sidebar-accent-foreground">طلباتي SD</p>
            <p className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/55">operations desk</p>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-sidebar-foreground/40">مساحة العمل</p>
          <div className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
        </div>
        <div className="rounded-2xl bg-sidebar-accent px-3 py-3.5 text-sidebar-accent-foreground shadow-inner shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold">مراجعة المدفوعات</p>
              <p className="mt-0.5 truncate text-[10px] text-sidebar-foreground/55">الطلبات المعلّقة</p>
            </div>
            <ChevronLeft className="h-4 w-4 text-sidebar-primary" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-sidebar-border pt-5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">ف</div>
            <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold">فريق العمليات</p>
            <p className="mt-0.5 text-[10px] text-sidebar-foreground/50">النظام متصل</p>
          </div>
        </div>
        <span className="font-mono text-[9px] tracking-[0.14em] text-sidebar-foreground/35">SD / 01</span>
      </div>
    </aside>
  );
}

function MetricCard({ label, value, note, icon: Icon, accent = false }: { label: string; value: string; note: string; icon: typeof Clock3; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${accent ? 'border-primary/20 bg-primary text-primary-foreground' : 'border-card-border bg-card'}`}>
      <div className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${accent ? 'bg-accent text-accent-foreground' : 'bg-secondary text-primary'}`}>
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </div>
      <p className={`text-[11px] font-medium ${accent ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{label}</p>
      <p className={`mt-1 font-mono text-[21px] font-bold tracking-[-0.06em] ${accent ? 'text-primary-foreground' : 'text-foreground'}`}>{value}</p>
      <p className={`mt-1 text-[10px] ${accent ? 'text-primary-foreground/55' : 'text-muted-foreground'}`}>{note}</p>
      {accent && <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full border-[12px] border-primary-foreground/10" />}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-border/70">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_112px] items-center gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="skeleton-fill h-10 w-10 rounded-xl" />
            <div className="space-y-2"><div className="skeleton-fill h-3 w-24 rounded" /><div className="skeleton-fill h-2.5 w-32 rounded" /></div>
          </div>
          <div className="skeleton-fill h-3 w-20 rounded" />
          <div className="skeleton-fill h-3 w-16 rounded" />
          <div className="skeleton-fill h-3 w-24 rounded" />
          <div className="skeleton-fill h-9 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-secondary text-primary">
        {filtered ? <Search className="h-7 w-7" strokeWidth={1.7} /> : <ShieldCheck className="h-7 w-7" strokeWidth={1.7} />}
      </div>
      <h3 className="text-base font-bold text-foreground">{filtered ? 'لا توجد نتائج مطابقة' : 'صندوق المراجعة فارغ'}</h3>
      <p className="mt-2 max-w-[290px] text-xs leading-6 text-muted-foreground">
        {filtered ? 'جرّب البحث برقم طلب مختلف أو بآخر أربعة أرقام.' : 'لا توجد مدفوعات بانتظار التأكيد حالياً. سيظهر أي إرسال جديد هنا.'}
      </p>
    </div>
  );
}

function PaymentRow({ payment, selected, onSelect, onConfirm }: { payment: PaymentSubmission; selected: boolean; onSelect: () => void; onConfirm: () => void }) {
  return (
    <div className={`grid grid-cols-1 gap-4 border-b border-border/70 px-4 py-4 transition-colors sm:grid-cols-[1.6fr_1fr_1fr_1fr_112px] sm:items-center sm:gap-4 sm:px-5 ${selected ? 'bg-secondary/60' : 'bg-card hover:bg-secondary/25'}`} data-testid={`row-payment-${payment.id}`}>
      <button type="button" onClick={onSelect} className="flex min-w-0 items-center gap-3 text-right" data-testid={`button-select-payment-${payment.id}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/25 text-sm font-bold text-primary">
          <CreditCard className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </div>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-[13px] font-bold text-foreground" dir="ltr">#{payment.orderId}</span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          </span>
          <span className="mt-1 block text-[10px] text-muted-foreground">{formatDate(payment.createdAt)}</span>
        </span>
      </button>
      <div className="flex items-center justify-between sm:block">
        <span className="text-[10px] text-muted-foreground sm:hidden">الطريقة</span>
        <span className="text-xs font-semibold text-foreground">{paymentMethodLabel(payment.paymentMethod)}</span>
      </div>
      <div className="flex items-center justify-between sm:block">
        <span className="text-[10px] text-muted-foreground sm:hidden">المبلغ</span>
        <span className="font-mono text-[13px] font-bold text-foreground">{formatMoney(payment.total)}</span>
      </div>
      <div className="flex items-center justify-between sm:block">
        <span className="text-[10px] text-muted-foreground sm:hidden">آخر المعاملة</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold tracking-[0.1em] text-primary" dir="ltr">
          <span className="text-muted-foreground">••••</span>{payment.transactionLast4}
        </span>
      </div>
      <button type="button" onClick={onConfirm} className="group flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 sm:w-[112px]" data-testid={`button-confirm-payment-${payment.id}`}>
        <Check className="h-4 w-4 transition-transform group-hover:scale-110" strokeWidth={2.5} />
        تأكيد الدفع
      </button>
    </div>
  );
}

function DetailPanel({ payment, onConfirm }: { payment?: PaymentSubmission; onConfirm: () => void }) {
  if (!payment) {
    return (
      <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
        <FileSearch className="mb-4 h-7 w-7 text-muted-foreground/60" strokeWidth={1.5} />
        <p className="text-sm font-bold text-foreground">اختر طلباً للمراجعة</p>
        <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">تفاصيل الإرسال وبيانات المعاملة ستظهر هنا.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm" data-testid={`panel-payment-detail-${payment.id}`}>
      <div className="border-b border-border/70 bg-primary px-5 py-5 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground/60">تفاصيل المعاملة</p>
            <p className="font-mono text-xl font-bold tracking-[-0.05em]" dir="ltr">#{payment.orderId}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1.5 text-[10px] font-bold text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
            قيد المراجعة
          </span>
        </div>
        <div className="mt-6">
          <p className="text-[11px] text-primary-foreground/60">المبلغ المطلوب تأكيده</p>
          <p className="mt-1 font-mono text-[27px] font-bold tracking-[-0.08em]">{formatMoney(payment.total)}</p>
        </div>
      </div>
      <div className="space-y-1 p-5">
        <DetailLine label="طريقة الدفع" value={paymentMethodLabel(payment.paymentMethod)} icon={<Banknote className="h-4 w-4" />} />
        <DetailLine label="آخر ٤ أرقام من المعاملة" value={payment.transactionLast4} icon={<CreditCard className="h-4 w-4" />} mono />
        <DetailLine label="وقت الإرسال" value={formatDate(payment.createdAt)} icon={<Clock3 className="h-4 w-4" />} />
        <DetailLine label="معرّف الإرسال" value={`#${payment.id}`} icon={<Copy className="h-4 w-4" />} mono />
      </div>
      <div className="border-t border-border/70 p-5">
        <button type="button" onClick={onConfirm} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90" data-testid={`button-confirm-detail-${payment.id}`}>
          <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2.1} />
          تأكيد وصول الدفع
          <ArrowLeft className="mr-auto h-4 w-4 opacity-60" />
        </button>
        <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground">تأكد من تطابق المبلغ وآخر أرقام المعاملة قبل التأكيد.</p>
      </div>
    </section>
  );
}

function DetailLine({ label, value, icon, mono = false }: { label: string; value: string; icon: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-2 py-3">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <span className={`text-left text-xs font-semibold text-foreground ${mono ? 'font-mono tracking-[0.08em]' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
    </div>
  );
}

function ConfirmDialog({ payment, pending, error, onCancel, onConfirm }: { payment: PaymentSubmission; pending: boolean; error?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 p-4 backdrop-blur-[3px]" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-[430px] overflow-hidden rounded-[22px] border border-card-border bg-card shadow-2xl animate-rise-in">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <p className="text-sm font-bold text-foreground" id="confirm-dialog-title">تأكيد الدفع</p>
          <button type="button" onClick={onCancel} disabled={pending} aria-label="إغلاق" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" data-testid="button-close-confirmation">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-2xl bg-accent/20 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">هل تطابق الدفع مع الطلب؟</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">سيتم نقل هذا الإرسال إلى المدفوعات المؤكدة.</p>
            </div>
          </div>
          <div className="mt-5 divide-y divide-border/70 rounded-2xl border border-border/70 px-4">
            <div className="flex items-center justify-between py-3.5"><span className="text-xs text-muted-foreground">رقم الطلب</span><span className="font-mono text-xs font-bold" dir="ltr">#{payment.orderId}</span></div>
            <div className="flex items-center justify-between py-3.5"><span className="text-xs text-muted-foreground">المبلغ</span><span className="font-mono text-xs font-bold">{formatMoney(payment.total)}</span></div>
            <div className="flex items-center justify-between py-3.5"><span className="text-xs text-muted-foreground">آخر المعاملة</span><span className="font-mono text-xs font-bold tracking-[0.12em]" dir="ltr">•••• {payment.transactionLast4}</span></div>
          </div>
          {error && <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs leading-5 text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onCancel} disabled={pending} className="h-11 flex-1 rounded-xl border border-border bg-card text-xs font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-50" data-testid="button-cancel-confirmation">ليس بعد</button>
            <button type="button" onClick={onConfirm} disabled={pending} className="flex h-11 flex-[1.35] items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-75" data-testid="button-submit-confirmation">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.6} />}
              {pending ? 'جارٍ التأكيد...' : 'نعم، تأكيد الدفع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentReview() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<PaymentSubmission | null>(null);
  const [confirmationError, setConfirmationError] = useState('');
  const [success, setSuccess] = useState<PaymentSubmission | null>(null);
  const pendingQueryKey = useMemo(() => getListAdminPaymentSubmissionsQueryKey(pendingParams), []);
  const listQuery = useListAdminPaymentSubmissions(pendingParams, { query: { queryKey: pendingQueryKey } });
  const confirmMutation = useConfirmAdminPaymentSubmission();
  const payments = listQuery.data ?? [];
  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;
    return payments.filter((payment) => payment.orderId.toLowerCase().includes(query) || payment.transactionLast4.includes(query) || payment.paymentMethod.toLowerCase().includes(query));
  }, [payments, search]);
  const selectedPayment = payments.find((payment) => payment.id === selectedId) ?? filteredPayments[0];
  const totalValue = payments.reduce((sum, payment) => sum + payment.total, 0);
  const oldestPayment = payments.reduce<PaymentSubmission | undefined>((oldest, payment) => {
    if (!oldest) return payment;
    return new Date(payment.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? payment : oldest;
  }, undefined);

  const handleConfirm = () => {
    if (!confirming || confirmMutation.isPending) return;
    setConfirmationError('');
    confirmMutation.mutate({ id: confirming.id }, {
      onSuccess: (updated) => {
        setSuccess(updated);
        setConfirming(null);
        setSelectedId(null);
        queryClient.invalidateQueries({ queryKey: pendingQueryKey });
      },
      onError: (error) => setConfirmationError(errorMessage(error)),
    });
  };

  const handleRefresh = () => {
    setSuccess(null);
    void listQuery.refetch();
  };

  const openConfirm = (payment: PaymentSubmission) => {
    setConfirmationError('');
    setConfirming(payment);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground" dir="rtl">
      <div className="flex min-h-[100dvh] flex-col lg:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden">
          <header className="flex h-[72px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-sm sm:px-8">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">طلباتي / المدفوعات</p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">صندوق العمليات</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="hidden sm:inline">يتم تحديث القائمة عند كل تأكيد</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </header>

          <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="animate-rise-in">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/45 bg-accent/15 px-3 py-1.5 text-[10px] font-bold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground" />
                  مراجعة مباشرة
                </div>
                <h1 className="text-[28px] font-bold tracking-[-0.05em] text-foreground sm:text-[34px]">المدفوعات بانتظارك</h1>
                <p className="mt-2 text-sm text-muted-foreground">تحقق من كل إرسال، ثم ثبّت الدفع للطلب الصحيح.</p>
              </div>
              <button type="button" onClick={handleRefresh} disabled={listQuery.isFetching} className="flex h-10 w-fit items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-secondary disabled:cursor-wait disabled:opacity-60" data-testid="button-refresh-payments">
                <RefreshCw className={`h-4 w-4 text-primary ${listQuery.isFetching ? 'animate-spin' : ''}`} />
                تحديث القائمة
              </button>
            </div>

            {success && (
              <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-900 animate-rise-in" role="status" data-testid="status-confirmation-success">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" strokeWidth={2.8} /></div>
                  <div><p className="text-xs font-bold">تم تأكيد الدفع</p><p className="mt-0.5 text-[10px] text-emerald-800/70">الطلب <span className="font-mono font-bold" dir="ltr">#{success.orderId}</span> أصبح مدفوعاً.</p></div>
                </div>
                <button type="button" onClick={() => setSuccess(null)} aria-label="إخفاء رسالة النجاح" className="rounded-lg p-1.5 text-emerald-800/55 hover:bg-emerald-100" data-testid="button-dismiss-success"><X className="h-4 w-4" /></button>
              </div>
            )}

            <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="animate-rise-in"><MetricCard label="قيد المراجعة" value={String(payments.length)} note="طلبات تنتظر التحقق" icon={TimerReset} accent /></div>
              <div className="animate-rise-in delay-1"><MetricCard label="إجمالي القيمة" value={formatMoney(totalValue)} note="للقائمة الحالية" icon={Banknote} /></div>
              <div className="animate-rise-in delay-2"><MetricCard label="أقدم إرسال" value={oldestPayment ? formatAge(oldestPayment.createdAt) : '—'} note={oldestPayment ? formatDate(oldestPayment.createdAt) : 'لا توجد بيانات'} icon={Clock3} /></div>
              <div className="animate-rise-in delay-3"><MetricCard label="درجة الانتباه" value={payments.length ? 'مطلوب' : 'مستقر'} note={payments.length ? 'راجع المبالغ قبل التأكيد' : 'لا توجد إجراءات معلّقة'} icon={ShieldCheck} /></div>
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm" data-testid="section-payment-queue">
                <div className="border-b border-border/70 px-4 py-4 sm:px-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-bold text-foreground">قائمة التحقق</h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-primary" data-testid="text-pending-count">{payments.length}</span>
                    </div>
                    <label className="relative block w-full sm:w-[230px]">
                      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث برقم الطلب أو المعاملة" className="h-9 w-full rounded-xl border border-input bg-background pl-3 pr-9 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/20" data-testid="input-search-payments" />
                    </label>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" />قيد المراجعة</span>
                    <span className="text-[10px] text-muted-foreground">الافتراضي: الأحدث أولاً</span>
                  </div>
                </div>
                <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_112px] gap-4 border-b border-border/70 bg-secondary/35 px-5 py-3 text-[10px] font-bold text-muted-foreground sm:grid">
                  <span>الطلب</span><span>الطريقة</span><span>المبلغ</span><span>آخر المعاملة</span><span />
                </div>
                {listQuery.isLoading ? <LoadingState /> : listQuery.isError ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center" data-testid="state-payment-error">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="h-7 w-7" /></div>
                    <h3 className="text-sm font-bold">تعذر تحميل القائمة</h3>
                    <p className="mt-2 max-w-[300px] text-xs leading-5 text-muted-foreground">{errorMessage(listQuery.error)}</p>
                    <button type="button" onClick={() => void listQuery.refetch()} className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90" data-testid="button-retry-payments"><RefreshCw className="h-3.5 w-3.5" />إعادة المحاولة</button>
                  </div>
                ) : filteredPayments.length === 0 ? <EmptyState filtered={Boolean(search.trim())} /> : (
                  <div data-testid="list-payment-submissions">
                    {filteredPayments.map((payment) => <PaymentRow key={payment.id} payment={payment} selected={payment.id === selectedPayment?.id} onSelect={() => setSelectedId(payment.id)} onConfirm={() => openConfirm(payment)} />)}
                  </div>
                )}
              </section>
              <div className="xl:sticky xl:top-6">
                <DetailPanel payment={selectedPayment} onConfirm={() => selectedPayment && openConfirm(selectedPayment)} />
              </div>
            </div>

            <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 text-[10px] text-muted-foreground sm:flex-row">
              <span>بيانات الدفع محمية ومخصصة لفريق العمليات.</span>
              <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> طلباتي SD · لوحة الإدارة</span>
            </footer>
          </div>
        </main>
      </div>
      {confirming && <ConfirmDialog payment={confirming} pending={confirmMutation.isPending} error={confirmationError} onCancel={() => { if (!confirmMutation.isPending) setConfirming(null); }} onConfirm={handleConfirm} />}
    </div>
  );
}