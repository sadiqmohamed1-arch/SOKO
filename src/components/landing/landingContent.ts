import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  Lightbulb,
  Megaphone,
  Network,
  Package,
  Truck,
  User,
  type LucideIcon,
} from 'lucide-react';

export type AudienceId = 'buyers' | 'suppliers' | 'contractors';

export interface Audience {
  id: AudienceId;
  label: string;
  navLabel: string;
  headline: string;
  summary: string;
  points: string[];
  modules: string[];
}

export const AUDIENCES: Audience[] = [
  {
    id: 'buyers',
    label: 'Buyers & Professionals',
    navLabel: 'For Buyers',
    headline: 'A portable professional network that moves with you.',
    summary: 'Your SOKO identity belongs to you, not to your employer. Keep your card, contacts and saved products as your career moves between companies.',
    points: [
      'Create and share a digital business card',
      'Discover companies and professional contacts',
      'Save and organize connections',
      'Explore construction products',
      'Build a portable professional network',
    ],
    modules: ['Business Card', 'Network', 'Product Discovery', 'Market Hub'],
  },
  {
    id: 'suppliers',
    label: 'Suppliers & Manufacturers',
    navLabel: 'For Suppliers',
    headline: 'Be discoverable by the people who specify and buy.',
    summary: 'Publish one company profile with your products, capabilities and representatives, and keep it current for every contractor that looks you up.',
    points: [
      'Establish a discoverable company profile',
      'Showcase products and capabilities',
      'Manage company representatives',
      'Connect with buyers and contractors',
      'Receive supplier visits and discover relevant opportunities',
      'Build credibility through SOKO verification where eligible',
    ],
    modules: ['Company Profile', 'Products', 'Team', 'Visits', 'Market Hub'],
  },
  {
    id: 'contractors',
    label: 'Contractors & Developers',
    navLabel: 'For Contractors',
    headline: 'Run your supplier relationships from one workspace.',
    summary: 'Register suppliers, track their compliance documents and coordinate visits, all with records that stay inside your company.',
    points: [
      'Discover and register suppliers',
      'Manage internal vendor relationships',
      'Track compliance documents',
      'Coordinate supplier visits',
      'Organize company contacts',
      'Publish opportunities through Market Hub',
      'Access actionable supplier intelligence',
    ],
    modules: ['Vendor Directory', 'Documents', 'Visits', 'Contacts', 'Market Hub', 'Intelligence'],
  },
];

export interface PreviewRow {
  label: string;
  value: string;
  tone?: 'blue' | 'ink' | 'muted';
}

export interface Capability {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
  wide?: boolean;
  preview: { title: string; rows: PreviewRow[] };
}

export const CAPABILITIES: Capability[] = [
  {
    id: 'cards',
    title: 'Digital Business Cards',
    body: 'One professional identity that can be shared and maintained across company relationships.',
    icon: CreditCard,
    wide: true,
    preview: {
      title: 'Ahmed Khan · Commercial Manager',
      rows: [
        { label: 'Company', value: 'ABC Waterproofing LLC' },
        { label: 'Share', value: 'QR code · link · vCard', tone: 'blue' },
        { label: 'Workspaces', value: '2 company memberships', tone: 'muted' },
      ],
    },
  },
  {
    id: 'network',
    title: 'Supplier Network',
    body: 'Discover suppliers by trade, capabilities, location and verification status.',
    icon: Network,
    preview: {
      title: 'Waterproofing · Dubai',
      rows: [
        { label: 'Trade', value: 'Waterproofing' },
        { label: 'Status', value: 'SOKO Verified', tone: 'blue' },
      ],
    },
  },
  {
    id: 'products',
    title: 'Product Discovery',
    body: 'Explore supplier-published construction products and technical information.',
    icon: Package,
    preview: {
      title: 'Bituminous Membrane 4mm',
      rows: [
        { label: 'Spec sheet', value: 'Published by supplier' },
        { label: 'Saved', value: 'To your product list', tone: 'muted' },
      ],
    },
  },
  {
    id: 'vendors',
    title: 'Vendor Management',
    body: 'Manage contractor-specific vendor relationships, approval statuses and compliance.',
    icon: ClipboardCheck,
    preview: {
      title: 'Vendor record',
      rows: [
        { label: 'Approval', value: 'Approved vendor', tone: 'ink' },
        { label: 'Documents', value: 'Trade licence expiring', tone: 'muted' },
      ],
    },
  },
  {
    id: 'visits',
    title: 'Supplier Visits',
    body: 'Coordinate visits and connect in-person interactions with company relationships.',
    icon: CalendarCheck,
    preview: {
      title: 'Visit request',
      rows: [
        { label: 'Host', value: 'Procurement team' },
        { label: 'Status', value: 'Scheduled', tone: 'blue' },
      ],
    },
  },
  {
    id: 'market',
    title: 'Market Hub',
    body: 'Discover and publish construction opportunities and connect with relevant businesses.',
    icon: Megaphone,
    preview: {
      title: 'Opportunity',
      rows: [
        { label: 'Visibility', value: 'Confidential publisher' },
        { label: 'Responses', value: 'Reviewed by the publisher', tone: 'muted' },
      ],
    },
  },
  {
    id: 'intelligence',
    title: 'SOKO Intelligence',
    body: 'Turn connected supplier, product, document and interaction records into actionable insights.',
    icon: Lightbulb,
    wide: true,
    preview: {
      title: 'This week',
      rows: [
        { label: 'Compliance', value: 'Documents expiring within 60 days', tone: 'ink' },
        { label: 'Vendors', value: 'Suppliers awaiting approval', tone: 'muted' },
        { label: 'Visits', value: 'Visit requests without a response', tone: 'muted' },
      ],
    },
  },
];

export interface ChainNode {
  id: string;
  type: string;
  icon: LucideIcon;
  title: string;
  meta: string;
  detail: { label: string; value: string }[];
}

export const CHAIN: ChainNode[] = [
  {
    id: 'person',
    type: 'Person',
    icon: User,
    title: 'Ahmed Khan',
    meta: 'Commercial Manager',
    detail: [
      { label: 'Identity', value: 'One permanent SOKO account' },
      { label: 'Card', value: 'Shared by QR and link' },
    ],
  },
  {
    id: 'company',
    type: 'Company',
    icon: Building2,
    title: 'ABC Waterproofing LLC',
    meta: 'Company workspace',
    detail: [
      { label: 'Role', value: 'Company Admin' },
      { label: 'Representatives', value: 'Managed by the company' },
    ],
  },
  {
    id: 'supplier',
    type: 'Supplier',
    icon: Truck,
    title: 'Waterproofing supplier',
    meta: 'Registered on SOKO',
    detail: [
      { label: 'Trade', value: 'Waterproofing systems' },
      { label: 'Coverage', value: 'United Arab Emirates' },
    ],
  },
  {
    id: 'product',
    type: 'Product',
    icon: Package,
    title: 'Bituminous Membrane 4mm',
    meta: 'Published product',
    detail: [
      { label: 'Technical data', value: 'Specification sheet attached' },
      { label: 'Source', value: 'Published by the supplier' },
    ],
  },
  {
    id: 'certification',
    type: 'Certification',
    icon: BadgeCheck,
    title: 'ISO 9001 certificate',
    meta: 'Shared document',
    detail: [
      { label: 'Shared with', value: 'Selected contractors only' },
      { label: 'Expiry', value: 'Tracked with reminders' },
    ],
  },
  {
    id: 'visit',
    type: 'Visit',
    icon: CalendarCheck,
    title: 'Product presentation',
    meta: 'Supplier visit',
    detail: [
      { label: 'Host', value: 'Contractor procurement team' },
      { label: 'Linked to', value: 'Vendor relationship record' },
    ],
  },
  {
    id: 'opportunity',
    type: 'Opportunity',
    icon: Megaphone,
    title: 'Podium waterproofing package',
    meta: 'Market Hub',
    detail: [
      { label: 'Publisher', value: 'Shown once a connection is approved' },
      { label: 'Response', value: 'Expression of interest' },
    ],
  },
  {
    id: 'intelligence',
    type: 'Intelligence',
    icon: BarChart3,
    title: 'Certificate expires in 45 days',
    meta: 'Actionable insight',
    detail: [
      { label: 'Derived from', value: 'Document and vendor records' },
      { label: 'Next step', value: 'Request an updated certificate' },
    ],
  },
];

export const STEPS = [
  {
    title: 'Create your SOKO identity',
    body: 'Register once as yourself, then join your company or establish its workspace.',
  },
  {
    title: 'Discover and connect',
    body: 'Find professionals, suppliers and products, and save the connections that matter.',
  },
  {
    title: 'Manage and act',
    body: 'Keep relationships, documents and visits organized, and act on what the records show.',
  },
];
