import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Star,
  Award,
  Sparkles,
  MessageSquare,
  FileCheck,
  Phone,
  PhoneCall,
  Mail,
  ExternalLink,
  ChevronRight,
  Clock,
  Layers,
  Building,
  Building2,
  Send,
  Check,
  Copy,
  X,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Download,
  Eye,
  Users,
  ArrowUpRight,
  Activity,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Flame,
  LayoutGrid,
  List,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  Square,
  Printer,
  Table,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SupplierItem, UserProfile } from '../types';

// Authentic WhatsApp SVG Icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM9.11 7.44C8.95 7.44 8.76 7.48 8.6 7.67C8.44 7.86 7.95 8.32 7.95 9.27C7.95 10.22 8.64 11.13 8.74 11.26C8.84 11.39 10.06 13.27 11.96 14.09C13.55 14.77 13.87 14.64 14.22 14.61C14.57 14.58 15.34 14.15 15.5 13.71C15.66 13.27 15.66 12.89 15.61 12.81C15.56 12.73 15.42 12.68 15.21 12.58C15 12.48 13.98 11.98 13.79 11.91C13.6 11.84 13.46 11.8 13.32 12.01C13.18 12.22 12.79 12.68 12.67 12.81C12.55 12.94 12.43 12.96 12.22 12.86C12.01 12.76 11.33 12.54 10.53 11.82C9.9 11.26 9.48 10.57 9.36 10.36C9.24 10.15 9.35 10.04 9.45 9.94C9.55 9.84 9.67 9.68 9.77 9.56C9.88 9.44 9.91 9.35 9.98 9.21C10.05 9.07 10.01 8.95 9.96 8.85C9.91 8.75 9.5 7.74 9.33 7.33C9.16 6.93 8.99 6.99 8.86 6.98L8.46 6.98C8.3 6.98 8.04 7.04 7.82 7.28C7.6 7.52 6.98 8.1 6.98 9.27C6.98 10.44 7.83 11.56 7.95 11.72C8.07 11.88 9.63 14.28 12.03 15.32C14.03 16.18 14.44 16.02 14.89 15.98C15.34 15.94 16.33 15.4 16.53 14.84C16.73 14.28 16.73 13.8 16.67 13.7C16.61 13.6 16.45 13.54 16.24 13.44" />
  </svg>
);

// Company Logo Component to replace individual personal profile pics with company logos
const CompanyLogo: React.FC<{ company: string; logoUrl?: string; size?: string }> = ({
  company,
  logoUrl,
  size = 'w-16 h-16',
}) => {
  const [imgError, setImgError] = useState(false);
  const initials =
    company
      .split(' ')
      .filter((w) => !['&', 'and', 'the', 'llc', 'fze', 'gmbh', 'inc'].includes(w.toLowerCase()))
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'CO';

  const bgGradients = [
    'from-slate-900 via-blue-950 to-slate-900',
    'from-blue-900 via-indigo-950 to-slate-900',
    'from-slate-800 via-slate-900 to-indigo-950',
    'from-indigo-900 via-slate-900 to-blue-950',
  ];
  const hash = company.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradient = bgGradients[hash % bgGradients.length];

  return (
    <div
      className={`${size} rounded-2xl border-4 border-white bg-white shadow-md p-1 flex items-center justify-center overflow-hidden shrink-0`}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={`${company} Logo`}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div
          className={`w-full h-full rounded-xl bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white font-black shadow-inner`}
        >
          <Building2 className="w-4 h-4 text-blue-200 mb-0.5" />
          <span className="text-[10px] tracking-tight">{initials}</span>
        </div>
      )}
    </div>
  );
};

export type DateRangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'ytd'
  | 'custom';

interface CategoryTrafficMetric {
  id: string;
  name: string;
  rawCategories: string[];
  baseVisits: number;
  growth: number;
  inquiries: number;
  conversion: number;
  topSupplier: string;
  topSupplierId: string;
  color: string;
  barColor: string;
  textColor: string;
}

const CATEGORY_BASE_METRICS: CategoryTrafficMetric[] = [
  {
    id: 'metals',
    name: 'Structural Steel & Metals',
    rawCategories: ['Structural Steel & Metals', 'Raw Materials & Metals'],
    baseVisits: 16420,
    growth: 24.5,
    inquiries: 1480,
    conversion: 9.0,
    topSupplier: 'Apex Castings & Forgings Corp.',
    topSupplierId: 'sup_01',
    color: 'bg-blue-500',
    barColor: 'from-blue-600 to-indigo-600',
    textColor: 'text-blue-700',
  },
  {
    id: 'piping',
    name: 'HVAC & Piping',
    rawCategories: ['HVAC & Piping', 'Piping, Valves & Actuators'],
    baseVisits: 11890,
    growth: 31.8,
    inquiries: 1120,
    conversion: 9.4,
    topSupplier: 'Gulf Coast Industrial Valve & Actuation',
    topSupplierId: 'sup_05',
    color: 'bg-emerald-500',
    barColor: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-700',
  },
  {
    id: 'power',
    name: 'Electrical & Power Systems',
    rawCategories: ['Electrical & Power Systems', 'Electrical & Substations'],
    baseVisits: 9240,
    growth: 14.2,
    inquiries: 780,
    conversion: 8.4,
    topSupplier: 'VoltGrid Technologies GmbH',
    topSupplierId: 'sup_03',
    color: 'bg-amber-500',
    barColor: 'from-amber-500 to-orange-600',
    textColor: 'text-amber-700',
  },
  {
    id: 'machinery',
    name: 'Heavy Machinery & Fleet',
    rawCategories: ['Heavy Machinery & Fleet', 'Heavy Equipment & Fleet'],
    baseVisits: 6850,
    growth: 18.9,
    inquiries: 690,
    conversion: 10.1,
    topSupplier: 'Andes Heavy Civil Equipment & Fleet',
    topSupplierId: 'sup_04',
    color: 'bg-purple-500',
    barColor: 'from-purple-600 to-pink-600',
    textColor: 'text-purple-700',
  },
  {
    id: 'polymers',
    name: 'Chemicals & Polymers',
    rawCategories: ['Chemicals & Polymers', 'Plastics & Polymers'],
    baseVisits: 4520,
    growth: 9.7,
    inquiries: 380,
    conversion: 8.4,
    topSupplier: 'Precision PolyFlow Components',
    topSupplierId: 'sup_02',
    color: 'bg-cyan-500',
    barColor: 'from-cyan-500 to-blue-500',
    textColor: 'text-cyan-700',
  },
];

interface SupplierSearchViewProps {
  suppliers: SupplierItem[];
  currentUser: UserProfile;
  onStartMessageWith: (supplierId: string, supplierName: string) => void;
  onOpenRFQForSupplier: (supplier: SupplierItem) => void;
  onViewSupplierCard: (supplier: SupplierItem) => void;
}

export const SupplierSearchView: React.FC<SupplierSearchViewProps> = ({
  suppliers,
  currentUser,
  onStartMessageWith,
  onOpenRFQForSupplier,
  onViewSupplierCard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedCert, setSelectedCert] = useState('All');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'otd' | 'contracts'>('rating');
  const [contactModalSupplier, setContactModalSupplier] = useState<SupplierItem | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Supplier list view mode (Grid Cards vs Table List) - defaults to grid (cards) across all logins
  const [supplierViewMode, setSupplierViewMode] = useState<'table' | 'grid'>('grid');

  // Supplier selection and Range selection state
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set());
  const [rangePreset, setRangePreset] = useState<'all' | 'top5' | 'top10' | 'top25' | 'custom'>('all');
  const [customRangeStart, setCustomRangeStart] = useState<number>(1);
  const [customRangeEnd, setCustomRangeEnd] = useState<number>(10);
  const [showCustomRangeInput, setShowCustomRangeInput] = useState<boolean>(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Date Range and Visitor Analytics state
  const [dateRange, setDateRange] = useState<DateRangePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-26');
  const [isReportExpanded, setIsReportExpanded] = useState(true);
  const [chartViewMode, setChartViewMode] = useState<'ranked' | 'share' | 'table'>('ranked');
  const [exportNotification, setExportNotification] = useState<string | null>(null);
  const isBuyerOrSupplier = currentUser?.role === 'buyer' || currentUser?.role === 'supplier';

  // Extract unique supplier categories dynamically from data plus defaults
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    CATEGORY_BASE_METRICS.forEach((m) => set.add(m.name));
    suppliers.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [suppliers]);

  const tiers = ['All', 'Tier 1 Global', 'Tier 2 Regional', 'Certified SME', 'Specialty Fabricator'];
  const certifications = ['All', 'ISO 9001', 'ISO 14001', 'IATF 16949', 'AISC Certified', 'API Spec Q1'];

  // Multiplier calculation based on Date Range
  const dateRangeMultiplier = useMemo(() => {
    switch (dateRange) {
      case 'this_month':
        return 1.0; // Sep 2026 MTD (approx 48,920 visits)
      case 'last_month':
        return 0.86; // Aug 2026 (approx 42,070 visits)
      case 'last_30_days':
        return 1.06; // 30-day rolling (approx 51,850 visits)
      case 'last_90_days':
        return 2.82; // Q3 2026 (approx 137,950 visits)
      case 'ytd':
        return 8.15; // Jan - Sep 2026 (approx 398,700 visits)
      case 'custom': {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime();
        const diffDays = Math.max(1, Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)));
        return Math.max(0.1, Number((diffDays / 26).toFixed(2)));
      }
      default:
        return 1.0;
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Date range human-readable label
  const dateRangeLabel = useMemo(() => {
    switch (dateRange) {
      case 'this_month':
        return 'September 2026 (Month to Date)';
      case 'last_month':
        return 'August 2026 (Previous Month)';
      case 'last_30_days':
        return 'Last 30 Days (Rolling)';
      case 'last_90_days':
        return 'Q3 2026 (Jul 1 – Sep 26, 2026)';
      case 'ytd':
        return 'Year to Date 2026 (Jan 1 – Sep 26)';
      case 'custom':
        return `${customStartDate} to ${customEndDate}`;
      default:
        return 'September 2026';
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Computed Category Traffic Metrics for the selected date range
  const categoryTrafficData = useMemo(() => {
    const items = CATEGORY_BASE_METRICS.map((cat) => {
      const visits = Math.round(cat.baseVisits * dateRangeMultiplier);
      const inquiries = Math.round(cat.inquiries * dateRangeMultiplier);
      return {
        ...cat,
        visits,
        inquiries,
      };
    });

    const totalVisits = items.reduce((sum, item) => sum + item.visits, 0);

    return items
      .map((item) => ({
        ...item,
        percentage: totalVisits > 0 ? Number(((item.visits / totalVisits) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.visits - a.visits);
  }, [dateRangeMultiplier]);

  // Overall KPI statistics
  const totalMonthlyVisits = useMemo(() => {
    return categoryTrafficData.reduce((sum, item) => sum + item.visits, 0);
  }, [categoryTrafficData]);

  const uniqueBuyersCount = useMemo(() => {
    return Math.round(totalMonthlyVisits * 0.312);
  }, [totalMonthlyVisits]);

  const totalInquiriesCount = useMemo(() => {
    return categoryTrafficData.reduce((sum, item) => sum + item.inquiries, 0);
  }, [categoryTrafficData]);

  const overallConversionRate = useMemo(() => {
    return totalMonthlyVisits > 0
      ? ((totalInquiriesCount / totalMonthlyVisits) * 100).toFixed(1)
      : '0.0';
  }, [totalMonthlyVisits, totalInquiriesCount]);

  // Top categories for callouts
  const topCategory = categoryTrafficData[0] || CATEGORY_BASE_METRICS[0];
  const fastestGrowingCategory =
    [...categoryTrafficData].sort((a, b) => b.growth - a.growth)[0] || categoryTrafficData[0];
  const highestConvertingCategory =
    [...categoryTrafficData].sort((a, b) => b.conversion - a.conversion)[0] || categoryTrafficData[0];

  // Export report to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['SOKO Construction B2B Directory - Supplier Category Visits Report'],
      [`Date Range: ${dateRangeLabel}`],
      [`Generated On: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`],
      [`Total Directory Visits: ${totalMonthlyVisits.toLocaleString()}`],
      [`Unique Buyers: ${uniqueBuyersCount.toLocaleString()}`],
      [`Direct Contacts & RFQs: ${totalInquiriesCount.toLocaleString()}`],
      [],
      ['Rank', 'Category', 'Visits', 'Traffic Share %', 'MoM Growth %', 'Inquiries Generated', 'Conversion %', 'Top Supplier in Category'],
      ...categoryTrafficData.map((cat, idx) => [
        `#${idx + 1}`,
        `"${cat.name}"`,
        cat.visits,
        `${cat.percentage}%`,
        `+${cat.growth}%`,
        cat.inquiries,
        `${cat.conversion}%`,
        `"${cat.topSupplier}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `soko_supplier_category_visits_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotification(`Report downloaded for ${dateRangeLabel}`);
    setTimeout(() => setExportNotification(null), 3500);
  };

  // Filtered Suppliers list
  const filteredSuppliers = suppliers
    .filter((s) => {
      const matchesSearch =
        s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.capabilities.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.subcategories.some((sc) => sc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.location.toLowerCase().includes(searchTerm.toLowerCase());

      // Flexible category check matching both exact name or related names
      const matchesCategory =
        selectedCategory === 'All' ||
        s.category === selectedCategory ||
        CATEGORY_BASE_METRICS.some(
          (m) =>
            m.name === selectedCategory &&
            (m.rawCategories.includes(s.category) || s.category.includes(m.name))
        ) ||
        (selectedCategory === 'Structural Steel & Metals' &&
          (s.category.includes('Steel') || s.category.includes('Metals') || s.category.includes('Raw Materials'))) ||
        (selectedCategory === 'HVAC & Piping' &&
          (s.category.includes('Piping') || s.category.includes('HVAC') || s.category.includes('Valve'))) ||
        (selectedCategory === 'Electrical & Power Systems' &&
          (s.category.includes('Power') || s.category.includes('Electrical'))) ||
        (selectedCategory === 'Heavy Machinery & Fleet' &&
          (s.category.includes('Heavy') || s.category.includes('Fleet') || s.category.includes('Machinery'))) ||
        (selectedCategory === 'Chemicals & Polymers' &&
          (s.category.includes('Polymers') || s.category.includes('Chemicals')));

      const matchesTier = selectedTier === 'All' || s.tier === selectedTier;
      const matchesCert =
        selectedCert === 'All' || s.isoCertifications.some((c) => c.includes(selectedCert));
      const matchesRating = s.rating >= minRating;

      return matchesSearch && matchesCategory && matchesTier && matchesCert && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'otd') return b.otdRate - a.otdRate;
      if (sortBy === 'contracts') return b.completedContracts - a.completedContracts;
      return 0;
    });

  // Helper to get estimated visits for individual supplier card
  const getSupplierVisits = (supplier: SupplierItem) => {
    const matchedCategory = CATEGORY_BASE_METRICS.find(
      (m) =>
        m.rawCategories.includes(supplier.category) ||
        supplier.category.includes(m.name) ||
        (m.id === 'metals' && supplier.company.includes('Apex')) ||
        (m.id === 'piping' && supplier.company.includes('Gulf Coast')) ||
        (m.id === 'power' && supplier.company.includes('VoltGrid')) ||
        (m.id === 'machinery' && supplier.company.includes('Andes')) ||
        (m.id === 'polymers' && supplier.company.includes('PolyFlow'))
    );

    const base = matchedCategory ? matchedCategory.baseVisits : 5200;
    return Math.round(base * dateRangeMultiplier);
  };

  // Handle Range Selection
  const handleSelectRange = (
    type: 'all' | 'top5' | 'top10' | 'top25' | 'none' | 'custom',
    customStart?: number,
    customEnd?: number
  ) => {
    if (type === 'none') {
      setSelectedSupplierIds(new Set());
      setRangePreset('all');
      return;
    }
    if (type === 'all') {
      setSelectedSupplierIds(new Set(filteredSuppliers.map((s) => s.id)));
      setRangePreset('all');
      return;
    }

    let count = 5;
    if (type === 'top5') count = 5;
    if (type === 'top10') count = 10;
    if (type === 'top25') count = 25;

    if (type === 'custom') {
      const start = Math.max(1, customStart ?? customRangeStart) - 1;
      const end = Math.min(filteredSuppliers.length, customEnd ?? customRangeEnd);
      const ids = new Set<string>();
      filteredSuppliers.slice(start, end).forEach((s) => ids.add(s.id));
      setSelectedSupplierIds(ids);
      setRangePreset('custom');
      return;
    }

    const ids = new Set<string>();
    filteredSuppliers.slice(0, count).forEach((s) => ids.add(s.id));
    setSelectedSupplierIds(ids);
    setRangePreset(type);
  };

  const toggleSupplierSelection = (id: string) => {
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSupplierIds.size === filteredSuppliers.length && filteredSuppliers.length > 0) {
      setSelectedSupplierIds(new Set());
    } else {
      setSelectedSupplierIds(new Set(filteredSuppliers.map((s) => s.id)));
    }
  };

  // Helper to get suppliers to export
  const getSuppliersToExport = () => {
    if (selectedSupplierIds.size > 0) {
      return filteredSuppliers.filter((s) => selectedSupplierIds.has(s.id));
    }
    return filteredSuppliers;
  };

  // Download as Excel (.xlsx)
  const handleDownloadExcel = () => {
    const targetSuppliers = getSuppliersToExport();
    if (targetSuppliers.length === 0) return;

    const summaryRows = [
      ['SOKO B2B CONSTRUCTION NETWORK - VERIFIED SUPPLIERS DIRECTORY'],
      [`Date Range: ${dateRangeLabel}`],
      [`Generated On: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
      [`Total Selected Suppliers: ${targetSuppliers.length}`],
      [`Total Directory Profile Views: ${totalMonthlyVisits.toLocaleString()}`],
      [],
    ];

    const headers = [
      '# Rank',
      'Company Name',
      'Category',
      'Tier Level',
      'Location',
      `Profile Views (${dateRange === 'this_month' ? 'Sep 2026 MTD' : dateRangeLabel})`,
      'Rating (out of 5)',
      'Verified Reviews',
      'On-Time Delivery Rate (%)',
      'Completed Contracts',
      'ISO Certifications',
      'Contact Phone',
      'Capabilities',
      'Verification Status',
    ];

    const dataRows = targetSuppliers.map((s, idx) => [
      idx + 1,
      s.company,
      s.category,
      s.tier,
      s.location,
      getSupplierVisits(s),
      s.rating,
      s.reviewCount,
      `${s.otdRate}%`,
      s.completedContracts,
      s.isoCertifications.join(', '),
      s.phone || '+971 4 881 2290',
      s.capabilities.join(', '),
      s.verified ? 'Verified & Audited' : 'Standard Registered',
    ]);

    const allSheetData = [...summaryRows, headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(allSheetData);

    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 34 },
      { wch: 26 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 20 },
      { wch: 38 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers Directory');

    const filename = `soko_suppliers_${dateRange}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);

    setExportFeedback(`Successfully downloaded Excel file (${targetSuppliers.length} suppliers)`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  // Download as PDF (.pdf)
  const handleDownloadPDF = () => {
    const targetSuppliers = getSuppliersToExport();
    if (targetSuppliers.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dark Navy Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 60, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('SOKO B2B CONSTRUCTION DIRECTORY', 30, 26);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(147, 197, 253); // blue-300
    doc.text('VERIFIED SUPPLIER DIRECTORY & TRAFFIC DEMAND REPORT', 30, 44);

    // Meta right-aligned
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text(`Period: ${dateRangeLabel}`, pageWidth - 30, 26, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - 30, 42, { align: 'right' });

    // Summary Metric Highlights Bar
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(30, 70, pageWidth - 60, 38, 6, 6, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    const totalPeriodVisits = targetSuppliers.reduce((acc, s) => acc + getSupplierVisits(s), 0);
    const avgRating = (targetSuppliers.reduce((acc, s) => acc + s.rating, 0) / targetSuppliers.length).toFixed(1);
    const avgOtd = (targetSuppliers.reduce((acc, s) => acc + s.otdRate, 0) / targetSuppliers.length).toFixed(1);

    const colStep = (pageWidth - 60) / 4;
    doc.text(`Suppliers: ${targetSuppliers.length} selected`, 45, 93);
    doc.text(`Period Views: ${totalPeriodVisits.toLocaleString()} visits`, 45 + colStep, 93);
    doc.text(`Average Rating: ${avgRating} / 5.0 Stars`, 45 + colStep * 2, 93);
    doc.text(`Average On-Time Delivery: ${avgOtd}%`, 45 + colStep * 3, 93);

    // Table Data
    const tableData = targetSuppliers.map((s, idx) => [
      `#${idx + 1}`,
      s.company,
      s.category,
      s.tier,
      s.location,
      `${getSupplierVisits(s).toLocaleString()}`,
      `${s.rating} ★ (${s.reviewCount})`,
      `${s.otdRate}%`,
      `${s.completedContracts}`,
      s.isoCertifications.join(', '),
      s.phone || '+971 4 881 2290',
    ]);

    autoTable(doc, {
      startY: 118,
      head: [[
        '#',
        'Supplier Company',
        'Category',
        'Tier',
        'Location',
        'Views',
        'Rating',
        'OTD %',
        'Contracts',
        'Certifications',
        'Direct Phone',
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 5,
        valign: 'middle',
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [30, 58, 138], // blue-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      columnStyles: {
        0: { cellWidth: 26, halign: 'center' },
        1: { cellWidth: 140, fontStyle: 'bold' },
        2: { cellWidth: 95 },
        3: { cellWidth: 65 },
        4: { cellWidth: 80 },
        5: { cellWidth: 55, halign: 'right' },
        6: { cellWidth: 65 },
        7: { cellWidth: 45, halign: 'center' },
        8: { cellWidth: 50, halign: 'center' },
        9: { cellWidth: 95 },
        10: { cellWidth: 85 },
      },
      didDrawPage: (data) => {
        const str = `Page ${doc.getNumberOfPages()} | Confidential • SOKO Construction B2B Directory`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
      },
    });

    const filename = `soko_suppliers_report_${dateRange}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    setExportFeedback(`Successfully downloaded PDF file (${targetSuppliers.length} suppliers)`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            Verified B2B Supplier Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Supplier Directory {isBuyerOrSupplier ? '' : '& Market Demand'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            {isBuyerOrSupplier
              ? 'Find verified industrial suppliers, inspect audited trade licenses and ISO certifications, and review technical fabrication capabilities.'
              : 'Find verified industrial suppliers, review live buyer traffic analytics, and inspect which product categories attract the highest procurement visits.'}
          </p>
        </div>

        {/* Global Directory Search Bar */}
        <div className="mt-6 bg-white rounded-xl p-2 shadow-lg flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-slate-50 sm:bg-transparent rounded-lg">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              id="supplier-search-input"
              type="text"
              placeholder="Search by material (ASTM A36, transformers, CNC), company, or standard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              id="supplier-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-100 rounded-lg text-slate-700 border-none cursor-pointer focus:outline-hidden"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: DATE RANGE SELECTOR & MONTHLY VISITS COUNT BOX & CATEGORY REPORT */}
      {/* ========================================================================= */}
      {!isBuyerOrSupplier && (
        <div className="space-y-4">
          {/* Metric Overview & Controls Header Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100">
            {/* Monthly Visits Box */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Eye className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {dateRange === 'this_month' ? 'Monthly Directory Visits' : 'Selected Period Visits'}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    +18.7% vs prev period
                  </span>
                </div>

                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {totalMonthlyVisits.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    verified supplier profile views
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Traffic window: <strong className="text-slate-700">{dateRangeLabel}</strong>
                </p>
              </div>
            </div>

            {/* Date Range Selector Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold px-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Date Range:</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  id="supplier-date-range-select"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="this_month">This Month (Sep 2026)</option>
                  <option value="last_month">Last Month (Aug 2026)</option>
                  <option value="last_30_days">Last 30 Days (Rolling)</option>
                  <option value="last_90_days">Last 90 Days (Q3 2026)</option>
                  <option value="ytd">Year to Date (2026)</option>
                  <option value="custom">Custom Date Range...</option>
                </select>

                {dateRange === 'custom' && (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium"
                      title="Start Date"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium"
                      title="End Date"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Download CSV visitor report"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Export</span> Report
                </button>
              </div>
            </div>
          </div>

          {/* Sub-KPI Highlights Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Unique Buyers</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {uniqueBuyersCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400">Estimators & EPC engineers</div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Contacts & RFQs</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {totalInquiriesCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium">+21.2% MoM growth</div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                <span>Contact Conversion</span>
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {overallConversionRate}%
              </div>
              <div className="text-[10px] text-slate-400">Visits to direct action</div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>#1 Most Visited</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900 mt-1 truncate" title={topCategory.name}>
                {topCategory.name}
              </div>
              <div className="text-[10px] text-slate-500">{topCategory.percentage}% of all traffic</div>
            </div>
          </div>

          {/* Toggle Deep Category Report Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsReportExpanded(!isReportExpanded)}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>
                {isReportExpanded
                  ? 'Collapse Category Traffic Report & Chart'
                  : 'View Most Visited Supplier Categories Report & Chart'}
              </span>
              {isReportExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {exportNotification && (
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full animate-in fade-in duration-200">
                ✓ {exportNotification}
              </span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CATEGORY VISITS REPORT & INTERACTIVE VISUAL CHART */}
        {/* ========================================================================= */}
        {isReportExpanded && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Report Header & Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                    Live Market Intelligence
                  </span>
                  <span className="text-xs text-slate-400">• Updated for {dateRangeLabel}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  Supplier Category Traffic & Demand Report
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  See which supplier specializations buyers visit most. Click any category bar to filter the directory.
                </p>
              </div>

              {/* Chart Mode Controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartViewMode('ranked')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartViewMode === 'ranked'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Ranked Chart</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('share')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartViewMode === 'share'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Share Breakdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartViewMode === 'table'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Data Table</span>
                </button>
              </div>
            </div>

            {/* VIEW 1: RANKED HORIZONTAL BAR CHART */}
            {chartViewMode === 'ranked' && (
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Category & Traffic Share</span>
                  <span>Visits & MoM Trend</span>
                </div>

                <div className="space-y-3">
                  {categoryTrafficData.map((cat, index) => {
                    const isSelected =
                      selectedCategory === cat.name ||
                      (selectedCategory !== 'All' &&
                        cat.rawCategories.some((rc) => rc === selectedCategory));
                    const widthPercent = Math.max(10, Math.min(100, cat.percentage * 2.8));

                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategory('All');
                          } else {
                            setSelectedCategory(cat.name);
                          }
                        }}
                        className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                index === 0
                                  ? 'bg-amber-400 text-slate-900 shadow-xs'
                                  : index === 1
                                  ? 'bg-slate-300 text-slate-800'
                                  : index === 2
                                  ? 'bg-amber-700/30 text-amber-900'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              #{index + 1}
                            </span>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                                  {cat.name}
                                </span>
                                {index === 0 && (
                                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                    Most Visited
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Top Supplier:</span>
                                <strong className="text-slate-700 font-semibold">{cat.topSupplier}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-900">
                                {cat.visits.toLocaleString()} <span className="text-xs font-normal text-slate-500">visits</span>
                              </div>
                              <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 justify-end">
                                <ArrowUpRight className="w-3 h-3" />
                                +{cat.growth}%
                              </div>
                            </div>

                            <span
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-800'
                              }`}
                            >
                              {isSelected ? 'Filtered ✓' : 'Filter by Category'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Bar representation */}
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex items-center">
                          <div
                            className={`h-full bg-gradient-to-r ${cat.barColor} rounded-full transition-all duration-500 relative`}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>

                        {/* Percentage and conversion footer note */}
                        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                          <span>
                            Market Share: <strong className="text-slate-800">{cat.percentage}%</strong> of directory traffic
                          </span>
                          <span>
                            {cat.inquiries.toLocaleString()} RFQs / contacts (
                            <strong className="text-slate-700">{cat.conversion}% conv</strong>)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: SHARE PROPORTIONAL BREAKDOWN */}
            {chartViewMode === 'share' && (
              <div className="space-y-5">
                {/* Multi-segment stacked progress bar */}
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">
                    Proportional Traffic Distribution (100% Total)
                  </div>
                  <div className="h-6 rounded-xl overflow-hidden flex shadow-inner bg-slate-100 p-0.5 gap-0.5">
                    {categoryTrafficData.map((cat) => (
                      <div
                        key={cat.id}
                        style={{ width: `${cat.percentage}%` }}
                        className={`${cat.color} hover:brightness-110 transition-all cursor-pointer relative group flex items-center justify-center text-white text-[10px] font-black`}
                        title={`${cat.name}: ${cat.visits.toLocaleString()} visits (${cat.percentage}%)`}
                        onClick={() => setSelectedCategory(cat.name)}
                      >
                        {cat.percentage > 10 && `${cat.percentage}%`}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Share Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryTrafficData.map((cat, idx) => (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedCategory === cat.name
                          ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                        <span className="text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {cat.percentage}%
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm truncate">{cat.name}</div>
                      <div className="text-base font-black text-slate-800 mt-1">
                        {cat.visits.toLocaleString()} <span className="text-xs font-normal text-slate-500">visits</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span>Direct Inquiries:</span>
                        <strong className="text-slate-800 font-bold">{cat.inquiries.toLocaleString()}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: DETAILED DATA TABLE */}
            {chartViewMode === 'table' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Visits</th>
                      <th className="py-3 px-4 text-right">Share %</th>
                      <th className="py-3 px-4 text-right">MoM Growth</th>
                      <th className="py-3 px-4 text-right">Contacts</th>
                      <th className="py-3 px-4">Top Visited Supplier</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryTrafficData.map((cat, idx) => (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          selectedCategory === cat.name ? 'bg-blue-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-black text-slate-500">#{idx + 1}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{cat.name}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          {cat.visits.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-700">{cat.percentage}%</td>
                        <td className="py-3 px-4 text-right text-emerald-700 font-bold">+{cat.growth}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">{cat.inquiries.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-700">{cat.topSupplier}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(cat.name)}
                            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                          >
                            Filter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Key Market Intelligence Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Flame className="w-4 h-4 text-blue-600" />
                  <span>Heavy Tender Demand</span>
                </div>
                <p className="text-xs text-blue-950 leading-relaxed">
                  <strong>{topCategory.name}</strong> dominates with <strong>{topCategory.percentage}%</strong> of buyer inquiries, driven by structural specifications for Q3/Q4 megaprojects.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Fastest Surge</span>
                </div>
                <p className="text-xs text-emerald-950 leading-relaxed">
                  <strong>{fastestGrowingCategory.name}</strong> jumped <strong>+{fastestGrowingCategory.growth}%</strong> this period due to accelerated piping and valve retrofits.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/60 border border-purple-200/70 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>Top RFQ Conversion</span>
                </div>
                <p className="text-xs text-purple-950 leading-relaxed">
                  <strong>{highestConvertingCategory.name}</strong> leads with a <strong>{highestConvertingCategory.conversion}%</strong> inquiry rate through direct WhatsApp and dispatch calls.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* FILTER BAR & ACTIVE CHIPS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Tier Filter */}
          <select
            id="supplier-tier-filter"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md px-2.5 py-1.5 font-medium text-slate-700 cursor-pointer"
          >
            <option value="All">All Tiers</option>
            {tiers.filter((t) => t !== 'All').map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* ISO Certification Filter */}
          <select
            id="supplier-cert-filter"
            value={selectedCert}
            onChange={(e) => setSelectedCert(e.target.value)}
            className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md px-2.5 py-1.5 font-medium text-slate-700 cursor-pointer"
          >
            <option value="All">All Certifications</option>
            {certifications.filter((c) => c !== 'All').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Min Rating */}
          <select
            id="supplier-rating-filter"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md px-2.5 py-1.5 font-medium text-slate-700 cursor-pointer"
          >
            <option value={0}>Any Rating</option>
            <option value={4.5}>4.5+ Stars</option>
            <option value={4.8}>4.8+ Stars</option>
          </select>

          {/* Active Category Filter Chip */}
          {selectedCategory !== 'All' && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
              <span>Category: {selectedCategory}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="hover:text-blue-900 cursor-pointer"
                title="Clear category filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Sort selector & Count */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Sort By:</span>
          <select
            id="supplier-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-800 cursor-pointer"
          >
            <option value="rating">Highest Rating</option>
            <option value="otd">On-Time Delivery %</option>
            <option value="contracts">Completed Contracts</option>
          </select>
          <span className="text-slate-400 text-xs pl-2">
            Showing <strong className="text-slate-800">{filteredSuppliers.length}</strong> verified suppliers
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUPPLIER CONTROLS TOOLBAR: RANGE SELECTOR, EXCEL & PDF EXPORT */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: View Mode Switcher (Cards vs Table) & Range Selection */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSupplierViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  supplierViewMode === 'grid'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards View</span>
              </button>
              <button
                type="button"
                onClick={() => setSupplierViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  supplierViewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg hidden sm:inline">
              {filteredSuppliers.length} Verified
            </span>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Range Selection Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-bold">Select Range:</span>
              <button
                type="button"
                onClick={() => handleSelectRange('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                  rangePreset === 'all' && selectedSupplierIds.size === filteredSuppliers.length && filteredSuppliers.length > 0
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({filteredSuppliers.length})
              </button>

              <button
                type="button"
                onClick={() => handleSelectRange('top5')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                  rangePreset === 'top5'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Top 5
              </button>

              <button
                type="button"
                onClick={() => handleSelectRange('top10')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                  rangePreset === 'top10'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Top 10
              </button>

              <button
                type="button"
                onClick={() => handleSelectRange('top25')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                  rangePreset === 'top25'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Top 25
              </button>

              <button
                type="button"
                onClick={() => setShowCustomRangeInput(!showCustomRangeInput)}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
                  showCustomRangeInput || rangePreset === 'custom'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Custom...
              </button>

              {selectedSupplierIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectRange('none')}
                  className="px-2 py-1 text-xs rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Clear ({selectedSupplierIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Right: Export Downloads (Excel & PDF) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Export {selectedSupplierIds.size > 0 ? `${selectedSupplierIds.size} selected` : `all ${filteredSuppliers.length}`}:
            </span>

            {/* Excel Download Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer hover:shadow-xs active:scale-98"
              title="Download formatted Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel</span>
            </button>

            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer hover:shadow-xs active:scale-98"
              title="Download professional PDF report (.pdf)"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Download PDF</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
              title="Print table"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Range Input Row */}
        {showCustomRangeInput && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs flex-wrap animate-in fade-in duration-150">
            <span className="text-slate-600 font-semibold">Select Suppliers from Row:</span>
            <input
              type="number"
              min={1}
              max={filteredSuppliers.length || 1}
              value={customRangeStart}
              onChange={(e) => setCustomRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold text-center"
            />
            <span className="text-slate-400">to</span>
            <input
              type="number"
              min={1}
              max={filteredSuppliers.length || 1}
              value={customRangeEnd}
              onChange={(e) => setCustomRangeEnd(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold text-center"
            />
            <button
              type="button"
              onClick={() => handleSelectRange('custom', customRangeStart, customRangeEnd)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-2xs"
            >
              Apply Range
            </button>
            <span className="text-slate-400 text-[11px]">
              (Selects rows {customRangeStart} through {Math.min(customRangeEnd, filteredSuppliers.length)})
            </span>
          </div>
        )}

        {/* Export Feedback Notification */}
        {exportFeedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{exportFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUPPLIERS DATA DISPLAY: CARDS GRID (DEFAULT ACROSS ALL LOGINS) OR TABLE */}
      {/* ========================================================================= */}
      {supplierViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((supplier, idx) => {
            const supplierViews = getSupplierVisits(supplier);
            const isTopInCategory =
              supplier.company === topCategory.topSupplier ||
              supplier.id === 'sup_01' ||
              supplierViews > 10000;
            const isSelected = selectedSupplierIds.has(supplier.id);

            return (
              <div
                key={supplier.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar: Checkbox, Rank, Verification & Views */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSupplierSelection(supplier.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                        title="Select for export"
                      />
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-black inline-flex items-center justify-center ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-900 shadow-xs'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-800/20 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTopInCategory && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Trending
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        {supplierViews.toLocaleString()} views
                      </span>
                    </div>
                  </div>

                  {/* Company Header */}
                  <div className="flex items-start gap-3.5">
                    <CompanyLogo
                      company={supplier.company}
                      logoUrl={supplier.logo || supplier.avatar}
                      size="w-12 h-12"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug hover:text-blue-600 transition-colors truncate">
                          {supplier.company}
                        </h3>
                        {supplier.verified && (
                          <span title="SOKO Audited & Verified Corporate Seller">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {supplier.location}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px] shrink-0">
                          {supplier.tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <a
                      href={`tel:${(supplier.phone || '+971 4 881 2290').replace(/\s+/g, '')}`}
                      className="flex-1 min-w-0 flex items-center gap-2 text-xs font-bold text-slate-900 hover:text-blue-700 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{supplier.phone || '+971 4 881 2290'}</span>
                    </a>
                    <a
                      href={`https://wa.me/${(supplier.phone || '971508812290').replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello ${supplier.company}, I am contacting you via SOKO Directory.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 flex items-center justify-center transition-colors shrink-0"
                      title="Chat on WhatsApp"
                    >
                      <img src="/image.png" alt="WhatsApp" className="w-8 h-8 rounded-lg object-contain" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onViewSupplierCard(supplier)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-blue-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Category & Capabilities */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      {supplier.category}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {supplier.capabilities.slice(0, 3).map((cap) => (
                        <span
                          key={cap}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                        >
                          {cap}
                        </span>
                      ))}
                      {supplier.capabilities.length > 3 && (
                        <span className="text-[11px] text-slate-400 px-1 py-0.5 font-medium">
                          +{supplier.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ISO Certifications */}
                  {supplier.isoCertifications.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {supplier.isoCertifications.map((cert) => (
                        <span
                          key={cert}
                          className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer: Direct Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${(supplier.phone || '+971 4 881 2290').replace(/\s+/g, '')}`}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 flex items-center justify-center transition-colors shadow-2xs"
                      title={`Call: ${supplier.phone || '+971 4 881 2290'}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={`https://wa.me/${(supplier.phone || '971508812290').replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello ${supplier.company}, I am contacting you via SOKO Directory.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 flex items-center justify-center transition-colors shadow-2xs"
                      title="Chat on WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    </a>

                    <button
                      type="button"
                      onClick={() => onViewSupplierCard(supplier)}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      title="View Digital Business Card"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setContactModalSupplier(supplier)}
                    className="flex-1 max-w-[130px] py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Contact</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="w-12 px-3 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedSupplierIds.size === filteredSuppliers.length &&
                        filteredSuppliers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Select all suppliers"
                    />
                  </th>
                  <th className="w-14 px-3 py-3.5 text-center"># Rank</th>
                  <th className="px-4 py-3.5 min-w-[220px]">Supplier Company</th>
                  <th className="px-4 py-3.5 min-w-[180px]">Category & Capabilities</th>
                  <th className="px-4 py-3.5 text-right min-w-[120px]">
                    Views ({dateRange === 'this_month' ? 'Sep MTD' : 'Window'})
                  </th>
                  <th className="px-4 py-3.5 text-center min-w-[90px]">Rating</th>
                  <th className="px-4 py-3.5 text-center min-w-[80px]">OTD %</th>
                  <th className="px-4 py-3.5 text-center min-w-[90px]">Contracts</th>
                  <th className="px-4 py-3.5 min-w-[140px]">Certifications</th>
                  <th className="px-4 py-3.5 text-center min-w-[180px]">Direct Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier, idx) => {
                  const supplierViews = getSupplierVisits(supplier);
                  const isTopInCategory =
                    supplier.company === topCategory.topSupplier ||
                    supplier.id === 'sup_01' ||
                    supplierViews > 10000;
                  const isSelected = selectedSupplierIds.has(supplier.id);

                  return (
                    <tr
                      key={supplier.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSupplierSelection(supplier.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Rank */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-black inline-flex items-center justify-center ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-800/20 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>

                      {/* Company Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CompanyLogo
                            company={supplier.company}
                            logoUrl={supplier.logo || supplier.avatar}
                            size="w-10 h-10"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-xs sm:text-sm hover:text-blue-600 transition-colors">
                                {supplier.company}
                              </span>
                              {supplier.verified && (
                                <span title="SOKO Audited & Verified Corporate Seller">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                {supplier.location}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                {supplier.tier}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Capabilities */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 text-xs">{supplier.category}</div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {supplier.capabilities.slice(0, 2).map((cap) => (
                            <span
                              key={cap}
                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              {cap}
                            </span>
                          ))}
                          {supplier.capabilities.length > 2 && (
                            <span className="text-[10px] text-slate-400">
                              +{supplier.capabilities.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Views in Period */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-black text-slate-900 text-xs sm:text-sm">
                          {supplierViews.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          {isTopInCategory ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Trending
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">views</span>
                          )}
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold text-amber-800">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{supplier.rating}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ({supplier.reviewCount})
                        </div>
                      </td>

                      {/* OTD % */}
                      <td className="px-4 py-3 text-center">
                        <div className="font-bold text-emerald-700 text-xs">
                          {supplier.otdRate}%
                        </div>
                        <div className="w-12 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${supplier.otdRate}%` }}
                          />
                        </div>
                      </td>

                      {/* Completed Contracts */}
                      <td className="px-4 py-3 text-center">
                        <div className="font-black text-slate-900 text-xs">
                          {supplier.completedContracts}
                        </div>
                        <div className="text-[10px] text-slate-400">contracts</div>
                      </td>

                      {/* Certifications */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {supplier.isoCertifications.map((cert) => (
                            <span
                              key={cert}
                              className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`tel:${(supplier.phone || '+971 4 881 2290').replace(/\s+/g, '')}`}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors"
                            title={`Call: ${supplier.phone || '+971 4 881 2290'}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          <a
                            href={`https://wa.me/${(supplier.phone || '971508812290').replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hello ${supplier.company}, I am contacting you via SOKO Directory.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setContactModalSupplier(supplier)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            title="All Contact Channels (Mobile, WhatsApp, SOKO Chat)"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Contact</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onViewSupplierCard(supplier)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="View Digital Card"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Suppliers Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No verified suppliers match your current filter criteria. Try resetting category or search keywords.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedTier('All');
              setSelectedCert('All');
              setMinRating(0);
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTACT OPTIONS MODAL (Mobile, WhatsApp, SOKO Messaging) */}
      {/* ========================================================================= */}
      {contactModalSupplier && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <CompanyLogo
                  company={contactModalSupplier.company}
                  logoUrl={contactModalSupplier.logo || contactModalSupplier.avatar}
                  size="w-14 h-14"
                />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {contactModalSupplier.company}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {contactModalSupplier.category} • {contactModalSupplier.location}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Corporate Seller</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setContactModalSupplier(null);
                  setCopiedPhone(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction banner */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Direct Communication Channels:</span> Connect directly with the sales & estimating team at {contactModalSupplier.company}.
            </div>

            {/* The 3 Options: Mobile, WhatsApp, and Messaging */}
            <div className="space-y-3">
              {/* Option 1: Mobile Call */}
              <div className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all bg-white shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Mobile & Direct Phone Call
                      </div>
                      <div className="text-xs font-mono font-bold text-blue-700">
                        {contactModalSupplier.phone || '+971 4 881 2290'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    Voice Call
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <a
                    href={`tel:${(contactModalSupplier.phone || '+971 4 881 2290').replace(/\s+/g, '')}`}
                    className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(contactModalSupplier.phone || '+971 4 881 2290');
                      setCopiedPhone(true);
                      setTimeout(() => setCopiedPhone(false), 2000);
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Number</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: WhatsApp Chat */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all bg-white shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        WhatsApp Business Chat
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Instant chat with technical sales desk
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Fast Response
                  </span>
                </div>

                <a
                  href={`https://wa.me/${(contactModalSupplier.phone || '971508812290').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${contactModalSupplier.company}, I found your profile on SOKO Directory and would like to inquire about your products & services.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Start WhatsApp Chat</span>
                </a>
              </div>

              {/* Option 3: SOKO In-App Messaging */}
              <div className="p-3.5 rounded-2xl border border-purple-200 hover:border-purple-400 hover:bg-purple-50/30 transition-all bg-white shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        SOKO In-App Messaging
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Track quotes, attach RFQ drawings & live chat
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    Audit Trail
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const sup = contactModalSupplier;
                    setContactModalSupplier(null);
                    onStartMessageWith(sup.id, sup.company);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open SOKO Chat Thread</span>
                </button>
              </div>
            </div>

            {/* Optional RFQ Fallback */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Need a formal RFQ quotation?</span>
              <button
                type="button"
                onClick={() => {
                  const sup = contactModalSupplier;
                  setContactModalSupplier(null);
                  onOpenRFQForSupplier(sup);
                }}
                className="text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Submit RFQ Document</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
