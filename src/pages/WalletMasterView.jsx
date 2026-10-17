import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../supabase';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';
import {
  buildWalletIntelligenceKpis,
  enrichWalletCustomer,
  formatWalletCurrency,
  getWalletPeriodStart,
  getWalletTrendDirection,
} from '../utils/walletIntelligence';

const PERIODS = ['Lifetime', '30 Days', '90 Days', '6 Months', '1 Year'];
const CUSTOMER_TYPES = ['All', 'High Value', 'Regular', 'New', 'Inactive'];
const CREDIT_STATUSES = ['All', 'Credit Eligible', 'Review', 'Not Recommended'];
const ACTIVITY_STATUSES = ['All', 'Active', 'Low Activity', 'Inactive'];
const PAYMENT_HISTORIES = ['All', 'Excellent', 'Good', 'Fair', 'Poor', 'No History'];

const sortOptions = [
  ['lifetime_shopping', 'Lifetime Shopping'],
  ['orders_count', 'Orders'],
  ['spend_30d', '30D Spend'],
  ['spend_90d', '90D Spend'],
  ['last_purchase', 'Last Purchase'],
  ['wallet_balance', 'Wallet Balance'],
  ['outstanding_credit', 'Outstanding'],
  ['suggested_limit', 'Credit Limit'],
  ['score', 'Customer Score'],
];

const activityStyle = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  low_activity: 'bg-amber-50 text-amber-700 ring-amber-200',
  inactive: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const recommendationStyle = {
  eligible: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  review: 'bg-amber-50 text-amber-800 ring-amber-200',
  not_recommended: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const paymentStyle = {
  Excellent: 'bg-emerald-50 text-emerald-700',
  Good: 'bg-blue-50 text-blue-700',
  Fair: 'bg-amber-50 text-amber-700',
  Poor: 'bg-rose-50 text-rose-700',
  'No History': 'bg-slate-100 text-slate-600',
};

const titleCase = (value = '') => String(value)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const timeSince = (value) => {
  if (!value) return 'No purchase history';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '—';
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const TableEmpty = ({ children, columns = 5 }) => (
  <tr>
    <td colSpan={columns} className="px-4 py-10 text-center text-xs font-semibold text-slate-400">
      {children}
    </td>
  </tr>
);

const KpiCard = ({ title, value, icon: Icon, helper, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <article className="min-h-[66px] rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5 lg:min-h-0 lg:p-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[8px] font-black uppercase leading-tight tracking-wide text-slate-500 sm:text-[9px]">{title}</p>
        <span className={`rounded-md p-1 lg:p-1 ${tones[tone]}`}><Icon size={10} /></span>
      </div>
      <p className="mt-1 text-base font-black leading-none tracking-tight text-slate-900 sm:text-lg lg:mt-0.5 lg:text-base lg:leading-5">{value}</p>
      {helper && <p className="mt-1 line-clamp-1 text-[8px] leading-tight text-slate-400 lg:mt-0.5">{helper}</p>}
    </article>
  );
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ring-1 ring-inset ${className}`}>
    {children}
  </span>
);

const WalletMasterView = () => {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loginCandidates, setLoginCandidates] = useState([]);
  const [customerCandidates, setCustomerCandidates] = useState([]);
  const [linkLoadErrors, setLinkLoadErrors] = useState({ login: '', customer: '' });
  const [selectedLoginId, setSelectedLoginId] = useState('');
  const [selectedLinkUserId, setSelectedLinkUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState('Lifetime');
  const [customerType, setCustomerType] = useState('All');
  const [creditStatus, setCreditStatus] = useState('All');
  const [activity, setActivity] = useState('All');
  const [paymentHistoryFilter, setPaymentHistoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('lifetime_shopping');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [customerDetailError, setCustomerDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState(12);
  const [detailTab, setDetailTab] = useState('overview');
  const [walletType, setWalletType] = useState('credit');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [pendingAdjustment, setPendingAdjustment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [customerListError, setCustomerListError] = useState('');
  const [analyticsWarning, setAnalyticsWarning] = useState('');
  const linkSectionRef = useRef(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setCustomerListError('');
    setAnalyticsWarning('');
    setLinkLoadErrors({ login: '', customer: '' });
    const [linkedCustomersResult, intelligenceResult, loginResult, linkCustomerResult] = await Promise.allSettled([
      supabase.rpc('admin_list_wallet_customers'),
      supabase.rpc('admin_wallet_intelligence'),
      supabase.rpc('admin_list_wallet_login_candidates'),
      supabase.rpc('admin_list_wallet_link_customers'),
    ]);
    const resultError = (result) => (result.status === 'rejected'
      ? result.reason
      : result.value.error);
    const linkedCustomersError = resultError(linkedCustomersResult);
    const linkedCustomersData = linkedCustomersResult.status === 'fulfilled'
      ? linkedCustomersResult.value.data
      : null;
    if (linkedCustomersError || !Array.isArray(linkedCustomersData)) {
      setCustomers([]);
      setCustomerListError(
        linkedCustomersError?.message || 'Linked customer list returned an invalid response',
      );
      setSelectedCustomer(null);
    }

    const intelligenceError = resultError(intelligenceResult);
    const intelligenceData = intelligenceResult.status === 'fulfilled'
      ? intelligenceResult.value.data
      : null;
    let analyticsRows = [];
    if (intelligenceError || !Array.isArray(intelligenceData?.customers)) {
      setAnalyticsWarning(
        intelligenceError?.message || 'Wallet intelligence returned an invalid response',
      );
      setSummary(null);
    } else {
      analyticsRows = intelligenceData.customers;
      setSummary(intelligenceData.summary || null);
    }

    if (!linkedCustomersError && Array.isArray(linkedCustomersData)) {
      const analyticsByCustomer = new Map(analyticsRows.map((row) => [
        `${row.tenant_id}:${row.user_id}`,
        row,
      ]));
      const rows = linkedCustomersData.map((linkedCustomer) => {
        const analytics = analyticsByCustomer.get(
          `${linkedCustomer.tenant_id}:${linkedCustomer.user_id}`,
        );
        return {
          lifetime_shopping: null,
          orders_count: null,
          average_order: null,
          spend_30d: null,
          spend_90d: null,
          spend_1y: null,
          last_purchase: null,
          outstanding_credit: null,
          score: null,
          recommendation: null,
          suggested_limit: null,
          activity_status: null,
          payment_history: null,
          ...analytics,
          ...linkedCustomer,
          account_linked: true,
          analytics_available: Boolean(analytics),
          wallet_balance: linkedCustomer.wallet_balance,
        };
      });
      setCustomers(rows);
      setSelectedCustomer((current) => current
        ? rows.find((row) => String(row.user_id) === String(current.user_id)
          && String(row.tenant_id) === String(current.tenant_id)) || null
        : null);
    }

    const loginError = resultError(loginResult);
    const loginData = loginResult.status === 'fulfilled' ? loginResult.value.data : null;
    if (loginError || !Array.isArray(loginData)) {
      setLoginCandidates([]);
      setSelectedLoginId('');
      setLinkLoadErrors((current) => ({
        ...current,
        login: loginError?.message || 'Signed-in account list returned an invalid response',
      }));
    } else {
      setLoginCandidates(loginData);
      setSelectedLoginId((current) => loginData.some((login) => login.auth_user_id === current)
        ? current
        : '');
    }

    const customerError = resultError(linkCustomerResult);
    const customerData = linkCustomerResult.status === 'fulfilled'
      ? linkCustomerResult.value.data
      : null;
    if (customerError || !Array.isArray(customerData)) {
      setCustomerCandidates([]);
      setSelectedLinkUserId('');
      setLinkLoadErrors((current) => ({
        ...current,
        customer: customerError?.message || 'Existing customer list returned an invalid response',
      }));
    } else {
      setCustomerCandidates(customerData);
      setSelectedLinkUserId((current) => customerData.some(
        (customer) => String(customer.user_id) === current,
      ) ? current : '');
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let refreshTimer;
    const handleResourceInvalidation = (event) => {
      const resources = event.detail?.resources || [];
      if (!resources.some((resource) => [
        'customer_auth_links',
        'users',
        'wallet_master',
        'wallet_transactions',
        'orders',
        'order_items'
      ].includes(resource))) return;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => loadData({ silent: true }), 180);
    };
    window.addEventListener('nm:resource-invalidated', handleResourceInvalidation);
    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener('nm:resource-invalidated', handleResourceInvalidation);
    };
  }, [loadData]);

  const enrichedCustomers = useMemo(() => {
    const enriched = customers.map((customer) => (customer.analytics_available
      ? enrichWalletCustomer(customer, customers)
      : { ...customer, customer_type: 'unknown' }));
    const ranked = enriched
      .filter((customer) => Number(customer.orders_count) > 0)
      .sort((left, right) => Number(right.lifetime_shopping) - Number(left.lifetime_shopping));
    const highValueCount = ranked.length ? Math.max(1, Math.ceil(ranked.length * 0.25)) : 0;
    const highValueIds = new Set(ranked.slice(0, highValueCount).map((customer) =>
      `${customer.tenant_id}:${customer.user_id}`));
    return enriched.map((customer) => ({
      ...customer,
      customer_type: !customer.analytics_available
        ? 'unknown'
        : customer.activity_status === 'inactive' && !customer.last_purchase
          ? 'inactive'
          : customer.orders_count === 1
            ? 'new'
            : highValueIds.has(`${customer.tenant_id}:${customer.user_id}`)
              ? 'high_value'
              : customer.orders_count > 1
                ? 'regular'
                : 'new',
    }));
  }, [customers]);

  const kpis = useMemo(() => {
    const computed = buildWalletIntelligenceKpis(enrichedCustomers);
    return { ...computed, ...summary };
  }, [enrichedCustomers, summary]);

  const visibleCustomers = useMemo(() => {
    const start = getWalletPeriodStart(period);
    const query = searchTerm.trim().toLowerCase();
    const rows = enrichedCustomers.filter((customer) => {
      const searchValue = [
        customer.customer_name,
        customer.customer_phone,
        customer.customer_email,
        customer.user_id,
        customer.company_code,
      ].filter(Boolean).join(' ').toLowerCase();
      if (query && !searchValue.includes(query)) return false;
      if (start && customer.analytics_available
        && (!customer.last_purchase || new Date(customer.last_purchase) < start)) return false;
      const selectedType = customerType.toLowerCase().replace(' ', '_');
      if (customerType !== 'All' && customer.customer_type !== selectedType) return false;
      const selectedCredit = creditStatus === 'Credit Eligible'
        ? 'eligible'
        : creditStatus.toLowerCase().replaceAll(' ', '_');
      if (creditStatus !== 'All' && customer.recommendation !== selectedCredit) return false;
      const selectedActivity = activity.toLowerCase().replaceAll(' ', '_');
      if (activity !== 'All' && customer.activity_status !== selectedActivity) return false;
      if (paymentHistoryFilter !== 'All' && customer.payment_history !== paymentHistoryFilter) return false;
      return true;
    });
    rows.sort((left, right) => {
      const leftValue = left[sortBy];
      const rightValue = right[sortBy];
      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;
      if (sortBy === 'last_purchase') return new Date(rightValue) - new Date(leftValue);
      return Number(rightValue) - Number(leftValue);
    });
    return rows;
  }, [activity, creditStatus, customerType, enrichedCustomers, paymentHistoryFilter, period, searchTerm, sortBy]);

  const fetchCustomerDetail = useCallback(async (customer, months = detailPeriod) => {
    if (!customer) return;
    setDetailLoading(true);
    setCustomerDetailError('');
    try {
      const { data, error: detailError } = await supabase.rpc('admin_wallet_customer_profile', {
        p_user_id: customer.user_id,
        p_tenant_id: customer.tenant_id,
        p_company_code: customer.company_code,
        p_months: months,
      });
      if (detailError) throw detailError;
      if (!data || !Array.isArray(data.orders) || !Array.isArray(data.wallet_transactions) || !Array.isArray(data.spending_trend)) {
        throw new Error('Customer history returned an invalid response');
      }
      setCustomerDetail(data);
    } catch (detailError) {
      setCustomerDetail({
        orders: [],
        wallet_transactions: [],
        spending_trend: [],
      });
      setCustomerDetailError(detailError?.message || 'Customer profile details could not load');
    } finally {
      setDetailLoading(false);
    }
  }, [detailPeriod]);

  const openCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDetail(null);
    setCustomerDetailError('');
    setDetailTab('overview');
    setDetailPeriod(12);
    fetchCustomerDetail(customer, 12);
  };

  const linkCustomerLogin = async () => {
    const customer = customerCandidates.find((candidate) =>
      String(candidate.user_id) === selectedLinkUserId);
    const login = loginCandidates.find((candidate) =>
      candidate.auth_user_id === selectedLoginId);
    if (!customer || !login) {
      toast.error('Select both a signed-in account and an existing customer');
      return;
    }
    const loginLabel = login.login_email || login.login_phone || login.auth_user_id;
    const customerLabel = customer.customer_name || `Customer #${customer.user_id}`;
    if (!window.confirm(`Link ${loginLabel} to ${customerLabel} (${customer.company_code})?`)) return;
    setLinking(true);
    try {
      const { data, error: linkError } = await supabase.rpc('admin_link_wallet_customer', {
        p_auth_user_id: login.auth_user_id,
        p_user_id: customer.user_id,
        p_tenant_id: customer.tenant_id,
        p_company_code: customer.company_code,
      });
      if (linkError) throw linkError;
      if (data !== true) throw new Error('The customer link was not confirmed by Supabase');
      toast.success('Account successfully linked to customer');
      setSelectedLoginId('');
      setSelectedLinkUserId('');
      await loadData();
    } catch (linkError) {
      toast.error(linkError?.message || 'Unable to link customer account');
    } finally {
      setLinking(false);
    }
  };

  const requestAdjustment = () => {
    const amount = Number(walletAmount);
    if (!selectedCustomer || !Number.isFinite(amount) || amount <= 0 || !walletReason.trim()) {
      toast.error('Enter a positive amount and a reason');
      return;
    }
    const balance = Number(selectedCustomer.wallet_balance) || 0;
    if (walletType === 'debit' && amount > balance) {
      toast.error('Debit amount cannot exceed the current wallet balance');
      return;
    }
    setPendingAdjustment({
      customer: selectedCustomer,
      amount,
      type: walletType,
      reason: walletReason.trim(),
      currentBalance: balance,
      newBalance: balance + (walletType === 'credit' ? amount : -amount),
    });
  };

  const confirmAdjustment = async () => {
    if (!pendingAdjustment) return;
    const adjustment = pendingAdjustment;
    setSaving(true);
    try {
      const result = await dbSync.executeAtomic('admin_adjust_wallet_atomic', {
        p_user_id: adjustment.customer.user_id,
        p_tenant_id: adjustment.customer.tenant_id,
        p_company_code: adjustment.customer.company_code,
        p_amount: adjustment.amount,
        p_type: adjustment.type,
        p_reason: adjustment.reason,
      }, DB_SCHEMA.WALLET_MASTER.table, 'ADMIN_WALLET_ADJUST');
      if (result !== true) throw new Error('Wallet update was not confirmed by the backend');
      toast.success(`Wallet ${adjustment.type} completed successfully`);
      setWalletAmount('');
      setWalletReason('');
      setPendingAdjustment(null);
      await loadData();
      await fetchCustomerDetail(adjustment.customer, detailPeriod);
    } catch (adjustmentError) {
      toast.error(adjustmentError?.message || 'Wallet adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  const kpiCards = [
    { title: 'Total Customers', value: String(kpis?.total_customers ?? enrichedCustomers.length), icon: Users, tone: 'blue' },
    { title: 'Active Customers', value: summary ? String(kpis?.active_customers ?? 0) : '—', icon: Activity, tone: 'emerald', helper: 'Delivered purchase in last 30 days' },
    { title: 'Low Activity', value: summary ? String(kpis?.low_activity_customers ?? 0) : '—', icon: Activity, tone: 'amber', helper: 'Delivered purchase in the last 31–90 days' },
    { title: 'Inactive Customers', value: summary ? String(kpis?.inactive_customers ?? 0) : '—', icon: Users, tone: 'rose', helper: 'No completed purchase in the last 90 days' },
    { title: 'Total Wallet Balance', value: formatWalletCurrency(kpis?.wallet_balance ?? kpis?.totalWalletBalance), icon: Wallet, tone: 'blue' },
    { title: 'Outstanding Credit', value: formatWalletCurrency(kpis?.outstanding_credit ?? kpis?.outstandingCredit), icon: CircleDollarSign, tone: 'amber', helper: 'Requires a verified repayment ledger' },
    { title: 'Credit Eligible', value: summary && kpis?.credit_eligible != null ? String(kpis.credit_eligible) : '—', icon: Check, tone: 'emerald' },
    { title: 'Customers Needing Review', value: summary ? String(kpis?.needs_review ?? enrichedCustomers.length) : '—', icon: ShieldAlert, tone: 'amber' },
    { title: 'Not Recommended', value: summary && kpis?.not_recommended != null ? String(kpis.not_recommended) : '—', icon: CreditCard, tone: 'rose' },
    { title: 'Total Shopping Value', value: formatWalletCurrency(kpis?.shopping_value ?? (enrichedCustomers.every((customer) => customer.analytics_available) ? kpis?.totalShoppingValue : null)), icon: ShoppingBag, tone: 'slate' },
  ];

  return (
    <div className="min-h-0 space-y-3 pb-6 lg:flex lg:h-full lg:flex-col lg:gap-2 lg:space-y-0 lg:overflow-hidden lg:pb-1">
      <header className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center lg:min-h-[58px] lg:shrink-0 lg:py-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 sm:text-base">Customer Wallet &amp; Credit Intelligence</h2>
          <p className="mt-0.5 text-[9px] leading-tight text-slate-500 sm:text-[10px]">Manage wallets, shopping behaviour and credit review.</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {customerListError && (
        <div role="alert" className="flex shrink-0 items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-[10px] text-rose-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <div><p className="font-bold">Linked customers could not load.</p><p className="break-words">{customerListError}</p></div>
        </div>
      )}
      {analyticsWarning && (
        <div role="status" className="flex shrink-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0"><p className="font-bold">Credit intelligence temporarily unavailable.</p><p className="truncate">{analyticsWarning}</p></div>
        </div>
      )}

      <section aria-label="Wallet summary" className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5 lg:gap-1.5">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} {...card} value={summary ? card.value : '—'} />
        ))}
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex-1">
        <div className="shrink-0 space-y-2 border-b border-slate-200 p-2 sm:p-3 lg:space-y-1.5 lg:p-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search customer by name, phone, email or customer ID..." className="h-9 w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-[11px] outline-none focus:border-blue-500 lg:h-8" />
            </label>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
              Sort
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold normal-case text-slate-700 lg:h-8">
                {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5 lg:gap-1.5">
            <FilterSelect label="Period" value={period} values={PERIODS} onChange={setPeriod} />
            <FilterSelect label="Customer Type" value={customerType} values={CUSTOMER_TYPES} onChange={setCustomerType} />
            <FilterSelect label="Credit Status" value={creditStatus} values={CREDIT_STATUSES} onChange={setCreditStatus} />
            <FilterSelect label="Activity" value={activity} values={ACTIVITY_STATUSES} onChange={setActivity} />
            <FilterSelect label="Payment History" value={paymentHistoryFilter} values={PAYMENT_HISTORIES} onChange={setPaymentHistoryFilter} />
          </div>
          {customerType === 'High Value' && <p className="text-[9px] text-slate-400">High Value represents the top quarter of linked customers by lifetime shopping value in the current tenant.</p>}
        </div>

        {enrichedCustomers.length === 0 && !loading && !customerListError ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-5 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Wallet size={23} /></span>
            <h3 className="mt-2 text-sm font-black uppercase tracking-wider text-slate-800">Customer Wallet Intelligence</h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">No linked active customers are available in this tenant/company. Link a signed-in account to an existing customer to start managing wallet and credit.</p>
            <button type="button" onClick={() => linkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-[10px] font-black uppercase text-white">Link Customer</button>
          </div>
        ) : (
          <>
            <div className="hidden min-h-0 overflow-x-auto md:block lg:flex-1 lg:overflow-y-auto">
              <table className="w-full min-w-[1600px] text-left">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>{['Customer', 'Phone', 'Lifetime Shopping', 'Orders', 'Average Order', '30D Spend', '90D Spend', '1Y Spend', 'Last Purchase', 'Wallet Balance', 'Outstanding', 'Score', 'Recommendation', 'Suggested Limit', 'Activity', 'Action'].map((label) => <th key={label} className="whitespace-nowrap px-2 py-2 text-[8px] font-black uppercase tracking-wide text-slate-500">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 [&_td]:py-2">
                  {loading && <TableEmpty columns={16}>Loading customer intelligence...</TableEmpty>}
                  {!loading && visibleCustomers.map((customer) => (
                    <CustomerTableRow key={`${customer.tenant_id}-${customer.user_id}`} customer={customer} onOpen={openCustomer} />
                  ))}
                  {!loading && visibleCustomers.length === 0 && !customerListError && <TableEmpty columns={16}>No customers match the selected search and filters.</TableEmpty>}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {loading && <p className="p-8 text-center text-xs text-slate-400">Loading customer intelligence...</p>}
              {!loading && visibleCustomers.map((customer) => (
                <CustomerCard key={`${customer.tenant_id}-${customer.user_id}`} customer={customer} onOpen={openCustomer} />
              ))}
              {!loading && visibleCustomers.length === 0 && !customerListError && <p className="p-8 text-center text-xs text-slate-400">No customers match the selected search and filters.</p>}
            </div>
          </>
        )}
      </section>

      <section ref={linkSectionRef} className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:px-3 lg:py-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <span className="hidden rounded-lg bg-blue-50 p-2 text-blue-700 md:inline-flex"><Link2 size={16} /></span>
          <div className="min-w-0 md:w-52 md:shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">Link Customer Account</h3>
            <p className="mt-0.5 hidden text-[9px] leading-tight text-slate-500 xl:block">Link a login to an existing customer.</p>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <select aria-label="Signed-in customer account" value={selectedLoginId} onChange={(event) => setSelectedLoginId(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] lg:h-8">
                <option value="">Select signed-in account</option>
                {loginCandidates.map((login) => (
                  <option key={login.auth_user_id} value={login.auth_user_id}>
                    {[login.login_email, login.login_phone, `Login ${formatDate(login.last_login_at)}`].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
              <select aria-label="Existing customer to link" value={selectedLinkUserId} onChange={(event) => setSelectedLinkUserId(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] lg:h-8">
                <option value="">Select existing customer</option>
                {customerCandidates.map((customer) => (
                  <option key={`${customer.tenant_id}-${customer.user_id}`} value={String(customer.user_id)}>
                    {[customer.customer_name, customer.customer_phone, customer.company_code].filter(Boolean).join(' · ')}
                  </option>
                ))}
              </select>
              <button type="button" onClick={linkCustomerLogin} disabled={linking || !selectedLoginId || !selectedLinkUserId} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-[10px] font-black uppercase text-white disabled:opacity-50 lg:h-8">
                {linking ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {linking ? 'Linking...' : 'Link Account'}
              </button>
            </div>
            {!loading && linkLoadErrors.login && (
              <p role="alert" className="mt-2 text-[10px] text-rose-700">Signed-in accounts could not load: {linkLoadErrors.login}</p>
            )}
            {!loading && linkLoadErrors.customer && (
              <p role="alert" className="mt-2 text-[10px] text-rose-700">Existing customers could not load: {linkLoadErrors.customer}</p>
            )}
            {!loading && !linkLoadErrors.customer && customerCandidates.length === 0 && loginCandidates.length > 0 && (
              <p className="mt-2 text-[10px] text-amber-700">No unlinked active customer records are available in the Super Admin tenant/company scope.</p>
            )}
            {!loading && !linkLoadErrors.login && loginCandidates.length === 0 && (
              <p className="mt-2 text-[10px] text-slate-500">All eligible signed-in accounts are linked, or there are no signed-in customer accounts to link.</p>
            )}
        </div>
      </section>

      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDrawer
            customer={selectedCustomer}
            detail={customerDetail}
            loading={detailLoading}
            detailError={customerDetailError}
            detailPeriod={detailPeriod}
            detailTab={detailTab}
            setDetailPeriod={(months) => {
              setDetailPeriod(months);
              fetchCustomerDetail(selectedCustomer, months);
            }}
            setDetailTab={setDetailTab}
            onClose={() => { setSelectedCustomer(null); setCustomerDetail(null); }}
            walletType={walletType}
            setWalletType={setWalletType}
            walletAmount={walletAmount}
            setWalletAmount={setWalletAmount}
            walletReason={walletReason}
            setWalletReason={setWalletReason}
            onAdjust={requestAdjustment}
            saving={saving}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingAdjustment && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} role="dialog" aria-modal="true" aria-labelledby="wallet-confirm-title" className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
              <div className="flex items-start justify-between">
                <div><h3 id="wallet-confirm-title" className="text-sm font-black uppercase tracking-wider text-slate-900">Confirm wallet adjustment?</h3><p className="mt-1 text-xs text-slate-500">{pendingAdjustment.customer.customer_name}</p></div>
                <button type="button" onClick={() => setPendingAdjustment(null)} aria-label="Cancel wallet adjustment" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
              </div>
              <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
                <ConfirmRow label="Type" value={titleCase(pendingAdjustment.type)} />
                <ConfirmRow label="Amount" value={formatWalletCurrency(pendingAdjustment.amount, { decimals: 2 })} />
                <ConfirmRow label="Current Balance" value={formatWalletCurrency(pendingAdjustment.currentBalance, { decimals: 2 })} />
                <ConfirmRow label="New Balance" value={formatWalletCurrency(pendingAdjustment.newBalance, { decimals: 2 })} />
                <ConfirmRow label="Reason" value={pendingAdjustment.reason} />
              </dl>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setPendingAdjustment(null)} disabled={saving} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase text-slate-700">Cancel</button>
                <button type="button" onClick={confirmAdjustment} disabled={saving} className="flex-1 rounded-lg bg-blue-700 px-4 py-2.5 text-[10px] font-black uppercase text-white disabled:opacity-50">{saving ? 'Saving...' : 'Confirm'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterSelect = ({ label, value, values, onChange }) => (
  <label className="min-w-0">
    <span className="mb-0.5 block text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</span>
    <span className="relative block">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-2 pr-7 text-[10px] font-bold text-slate-700">
        {values.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </span>
  </label>
);

const CustomerTableRow = ({ customer, onOpen }) => (
  <tr className="cursor-pointer transition-colors hover:bg-blue-50/40" onClick={() => onOpen(customer)}>
    <td className="px-2 py-2"><p className="max-w-40 truncate text-[10px] font-bold text-slate-800">{customer.customer_name || `Customer #${customer.user_id}`}</p>{customer.account_linked && <p className="mt-0.5 inline-flex items-center gap-1 text-[8px] font-bold text-emerald-700"><Check size={10} /> Account Linked</p>}<p className="text-[8px] text-slate-400">ID {customer.user_id} · {customer.company_code}</p></td>
    <td className="px-2 py-2 text-[9px] text-slate-600">{customer.customer_phone || '—'}</td>
    <td className="px-2 py-2 text-[9px] font-bold text-slate-800">{formatWalletCurrency(customer.lifetime_shopping)}</td>
    <td className="px-2 py-2 text-[9px] text-slate-700">{customer.orders_count ?? '—'}</td>
    <td className="px-2 py-2 text-[9px] text-slate-700">{formatWalletCurrency(customer.average_order)}</td>
    <td className="px-2 py-2 text-[9px] text-slate-700">{formatWalletCurrency(customer.spend_30d)}</td>
    <td className="px-2 py-2 text-[9px] text-slate-700">{formatWalletCurrency(customer.spend_90d)}</td>
    <td className="px-2 py-2 text-[9px] text-slate-700">{formatWalletCurrency(customer.spend_1y)}</td>
    <td className="px-2 py-2 text-[9px] text-slate-600">{customer.analytics_available ? timeSince(customer.last_purchase) : '—'}</td>
    <td className="px-2 py-2 text-[9px] font-bold text-slate-800">{formatWalletCurrency(customer.wallet_balance)}</td>
    <td className="px-2 py-2 text-[9px] text-slate-500">{formatWalletCurrency(customer.outstanding_credit)}</td>
    <td className="px-2 py-2 text-[9px] font-black text-slate-700">{customer.score == null ? '—' : `${customer.score}/100`}</td>
    <td className="px-2 py-2">{customer.recommendation ? <Badge className={recommendationStyle[customer.recommendation] || recommendationStyle.review}>{titleCase(customer.recommendation)}</Badge> : '—'}</td>
    <td className="px-2 py-2 text-[9px] text-slate-500">{customer.suggested_limit == null ? 'Insufficient Data' : formatWalletCurrency(customer.suggested_limit)}</td>
    <td className="px-2 py-2">{customer.activity_status ? <Badge className={activityStyle[customer.activity_status]}>{titleCase(customer.activity_status)}</Badge> : '—'}</td>
    <td className="px-2 py-2">
      <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(customer); }} className="rounded-md border border-slate-200 px-2 py-1 text-[8px] font-black uppercase text-blue-700 hover:bg-blue-50">
        View Profile
      </button>
    </td>
  </tr>
);

const CustomerCard = ({ customer, onOpen }) => (
  <button type="button" onClick={() => onOpen(customer)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-blue-50">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="truncate text-xs font-black text-slate-900">{customer.customer_name || `Customer #${customer.user_id}`}</p>{customer.account_linked && <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700"><Check size={11} /> Account Linked</p>}<p className="mt-1 text-[10px] text-slate-500">{customer.customer_phone || customer.customer_email || `ID ${customer.user_id}`}</p></div>
      {customer.activity_status ? <Badge className={activityStyle[customer.activity_status]}>{titleCase(customer.activity_status)}</Badge> : <span className="text-[10px] text-slate-400">—</span>}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
      <Metric label="Lifetime Shopping" value={formatWalletCurrency(customer.lifetime_shopping)} />
      <Metric label="Orders" value={String(customer.orders_count ?? '—')} />
      <Metric label="Average Order" value={formatWalletCurrency(customer.average_order)} />
      <Metric label="1Y Spend" value={formatWalletCurrency(customer.spend_1y)} />
      <Metric label="Wallet Balance" value={formatWalletCurrency(customer.wallet_balance)} />
      <Metric label="Score" value={customer.score == null ? '—' : `${customer.score}/100`} />
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      {customer.recommendation
        ? <Badge className={recommendationStyle[customer.recommendation] || recommendationStyle.review}>{titleCase(customer.recommendation)}</Badge>
        : <span className="text-[9px] font-semibold text-slate-500">Credit Review —</span>}
      <span className="text-[9px] font-bold text-blue-700">View profile</span>
    </div>
  </button>
);

const Metric = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-black text-slate-800">{value}</p></div>
);

const ConfirmRow = ({ label, value }) => (
  <div className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="max-w-[65%] break-words text-right font-bold text-slate-800">{value}</dd></div>
);

const CustomerDrawer = ({
  customer,
  detail,
  loading,
  detailError,
  detailPeriod,
  detailTab,
  setDetailPeriod,
  setDetailTab,
  onClose,
  walletType,
  setWalletType,
  walletAmount,
  setWalletAmount,
  walletReason,
  setWalletReason,
  onAdjust,
  saving,
}) => {
  const chartData = (detail?.spending_trend || []).map((row) => ({
    month: new Date(row.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    amount: Number(row.amount) || 0,
  }));
  const trendDirection = !detail || detailError
    ? 'insufficient_data'
    : getWalletTrendDirection(detail.spending_trend || []);
  const trendLabel = {
    increasing: 'Increasing',
    stable: 'Stable',
    decreasing: 'Decreasing',
    inactive: 'No completed shopping activity',
    insufficient_data: 'Insufficient data',
  }[trendDirection];
  const scoreParts = [
    ['Shopping Frequency', customer.score_components?.shoppingFrequency],
    ['Recent Spending', customer.score_components?.recentSpending],
    ['Customer Value', customer.score_components?.customerValue],
    ['Purchase Recency', customer.score_components?.recency],
  ];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} role="dialog" aria-modal="true" aria-label="Customer credit profile" className="flex h-full w-full max-w-3xl flex-col bg-slate-50 shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-700">Customer Credit Profile</p>
            <h2 className="mt-1 truncate text-base font-black text-slate-900">{customer.customer_name || `Customer #${customer.user_id}`}</h2>
            <p className="mt-1 text-[10px] text-slate-500">{customer.customer_phone || 'Phone unavailable'} · Customer ID {customer.user_id} · {customer.company_code}</p>
            <p className="mt-1 text-[10px] text-slate-500">{detail?.customer_email || customer.customer_email || 'Email unavailable'} · Customer since {formatDate(detail?.customer_since || customer.created_at)} · {detail?.customer_status || (customer.is_active === false ? 'Inactive' : 'Active')}</p>
            <p className="mt-1 text-[10px] font-semibold text-emerald-700">✓ Account Linked · Login: {detail?.linked_login_email || 'No data available'}</p>
            {detail?.linked_login_phone && <p className="mt-1 text-[10px] text-slate-500">Login phone: {detail.linked_login_phone}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close customer profile" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"><X size={17} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {detailError && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Customer history is temporarily unavailable. Customer and wallet details remain available.</p>}
          <div className="flex flex-wrap gap-2">
            {customer.activity_status
              ? <Badge className={activityStyle[customer.activity_status]}>{titleCase(customer.activity_status)}</Badge>
              : <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Activity —</Badge>}
            {customer.recommendation
              ? <Badge className={recommendationStyle[customer.recommendation] || recommendationStyle.review}>{titleCase(customer.recommendation)}</Badge>
              : <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Credit Review</Badge>}
            <Badge className={paymentStyle[customer.payment_history] || paymentStyle['No History']}>{customer.payment_history || 'No data available'}</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Lifetime Shopping" value={formatWalletCurrency(customer.lifetime_shopping)} />
            <Metric label="Orders" value={String(customer.orders_count ?? '—')} />
            <Metric label="Average Order" value={formatWalletCurrency(customer.average_order)} />
            <Metric label="Last Purchase" value={customer.analytics_available ? timeSince(customer.last_purchase) : '—'} />
            <Metric label="30 Days" value={formatWalletCurrency(customer.spend_30d)} />
            <Metric label="90 Days" value={formatWalletCurrency(customer.spend_90d)} />
            <Metric label="1 Year" value={formatWalletCurrency(customer.spend_1y)} />
            <Metric label="Wallet Balance" value={formatWalletCurrency(customer.wallet_balance ?? 0, { decimals: 2 })} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-700"><BarChart3 size={14} /> Customer Score</h3>
              <div className="mt-3 flex items-end gap-2"><span className="text-3xl font-black text-slate-900">{customer.score == null ? '—' : customer.score}</span>{customer.score != null && <span className="pb-1 text-xs font-bold text-slate-400">/ 100</span>}</div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Shopping-behaviour indicator only, not a credit score or approval. Four purchase-activity components contribute up to 25 points each; three scale against the highest linked customer, while recency fades over one year. Payment and repayment history are not scored.</p>
              <div className="mt-3 space-y-2">
                {scoreParts.map(([label, value]) => <div key={label} className="flex justify-between text-[10px]"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-700">{value == null ? '—' : `${Math.round(value)}/25`}</span></div>)}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-700"><CreditCard size={14} /> Payment &amp; Credit</h3>
              <div className="mt-3 space-y-3">
                <Metric label="Payment History" value="No History Available" />
                <Metric label="Previous Credit" value={formatWalletCurrency(customer.previous_credit)} />
                <Metric label="Repaid" value={formatWalletCurrency(customer.repaid)} />
                <Metric label="Outstanding Credit" value={formatWalletCurrency(customer.outstanding_credit)} />
                <Metric label="Suggested Limit" value={customer.suggested_limit == null ? 'Insufficient Data' : formatWalletCurrency(customer.suggested_limit)} />
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-amber-800">{customer.recommendation_reason || 'Credit intelligence temporarily unavailable.'}</p>
            </section>
          </div>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2"><h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-700"><TrendingUp size={14} /> Shopping Trend</h3><Badge className="bg-blue-50 text-blue-700 ring-blue-200">{trendLabel}</Badge></div>
              <div className="flex gap-1">{[[1, '30D'], [3, '90D'], [6, '6M'], [12, '1Y']].map(([months, label]) => <button key={months} type="button" onClick={() => setDetailPeriod(months)} className={`rounded-md px-2 py-1 text-[9px] font-black ${detailPeriod === months ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{label}</button>)}</div>
            </div>
            {loading ? <LoadingBox /> : chartData.length > 1 && chartData.some((row) => row.amount > 0) ? (
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={48} tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Tooltip formatter={(value) => formatWalletCurrency(value, { decimals: 2 })} />
                    <Line type="monotone" dataKey="amount" name="Shopping" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-12 text-center text-xs text-slate-400">Not enough data for trend.</p>}
          </section>

          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex border-b border-slate-200">
              {[['overview', 'Overview'], ['orders', 'Order History'], ['wallet', 'Wallet History']].map(([tab, label]) => <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={`border-b-2 px-3 py-3 text-[9px] font-black uppercase tracking-wide sm:px-4 ${detailTab === tab ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-400'}`}>{label}</button>)}
            </div>
            {loading ? <LoadingBox /> : detailTab === 'orders' ? (
              <HistoryTable headers={['Date', 'Order Number', 'Amount', 'Payment', 'Order Status']} empty="No order history available.">
                {(detail?.orders || []).map((order, index) => <tr key={`${order.order_number}-${index}`} className="border-t border-slate-100"><td>{formatDate(order.created_at)}</td><td>{order.order_number}</td><td>{formatWalletCurrency(order.amount, { decimals: 2 })}</td><td>{titleCase(order.payment_status)}</td><td>{titleCase(order.order_status)}</td></tr>)}
              </HistoryTable>
            ) : detailTab === 'wallet' ? (
              <HistoryTable headers={['Date', 'Type', 'Amount', 'Balance After', 'Reason', 'Reference']} empty="No wallet history available.">
                {(detail?.wallet_transactions || []).map((transaction, index) => <tr key={`${transaction.created_at}-${index}`} className="border-t border-slate-100"><td>{formatDate(transaction.created_at)}</td><td><Badge className={String(transaction.type).toLowerCase() === 'credit' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}>{titleCase(transaction.type)}</Badge></td><td className="font-bold">{formatWalletCurrency(transaction.amount, { decimals: 2 })}</td><td>{formatWalletCurrency(transaction.balance_after, { decimals: 2 })}</td><td className="max-w-40 truncate">{transaction.reason || '—'}</td><td>{transaction.reference || '—'}</td></tr>)}
              </HistoryTable>
            ) : (
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <Metric label="Orders in history" value={String(customer.orders_count ?? '—')} />
                <Metric label="Wallet transactions" value={String(detail?.wallet_transaction_count ?? customer.wallet_transaction_count ?? '—')} />
                <Metric label="Wallet credits" value={formatWalletCurrency(detail?.wallet_credit_total)} />
                <Metric label="Wallet debits" value={formatWalletCurrency(detail?.wallet_debit_total)} />
                <Metric label="Last wallet activity" value={formatDate(detail?.last_transaction_at ?? customer.last_transaction_at)} />
                <Metric label="Credit assessment" value="Review — repayment ledger unavailable" />
              </div>
            )}
          </section>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-700"><BadgeIndianRupee size={14} /> Adjust Customer Wallet</h3>
            <p className="mt-1 text-[10px] text-slate-500">Writes use the existing secured wallet RPC and wallet ledger. No sales order is created.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select aria-label="Wallet transaction type" value={walletType} onChange={(event) => setWalletType(event.target.value)} className="rounded-lg border border-slate-200 p-2.5 text-xs"><option value="credit">Credit</option><option value="debit">Debit</option></select>
              <input aria-label="Wallet adjustment amount" type="number" min="0.01" step="0.01" value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} placeholder="Amount (₹)" className="rounded-lg border border-slate-200 p-2.5 text-xs" />
              <input aria-label="Wallet adjustment reason" value={walletReason} onChange={(event) => setWalletReason(event.target.value)} placeholder="Reason" className="rounded-lg border border-slate-200 p-2.5 text-xs sm:col-span-2" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold text-slate-600">Current Balance: {formatWalletCurrency(customer.wallet_balance, { decimals: 2 })}</p>
              <button type="button" onClick={onAdjust} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-[10px] font-black uppercase text-white disabled:opacity-50">{saving && <Loader2 size={13} className="animate-spin" />}{walletType === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}</button>
            </div>
          </section>
        </div>
      </motion.aside>
    </div>
  );
};

const LoadingBox = () => <div className="flex min-h-28 items-center justify-center gap-2 text-xs text-slate-400"><Loader2 size={15} className="animate-spin" /> Loading history...</div>;

const HistoryTable = ({ headers, empty, children }) => {
  const rows = React.Children.count(children);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-[10px]">
        <thead className="bg-slate-50 text-[8px] font-black uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-3 py-2.5">{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100 text-slate-600">{rows ? children : <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
};

export default WalletMasterView;
