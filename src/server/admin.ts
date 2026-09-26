import express from 'express';
import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from './auth.ts';
import { userDb } from './db.ts';

export const adminRouter = express.Router();

// Middleware: Require Super Admin role
function requireAdmin(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Administrator privileges required.',
    });
  }
  next();
}

// In-memory persistent mock data for Super Admin portal
let companyAudits = [
  {
    id: 'comp_1',
    companyName: 'Vance Infrastructure Group UAE',
    contactPerson: 'Marcus Vance',
    role: 'buyer',
    email: 'buyer@soko.ae',
    phone: '+971 4 388 9100',
    location: 'Downtown Dubai, UAE',
    dunsNumber: '08-412-9843',
    tradeLicenseNo: 'CN-1092831',
    vatTrn: '100293847500003',
    isVerified: true,
    status: 'active',
    icvScore: 84.5,
    riskRating: 'low',
    rating: 4.9,
    registeredDate: '2026-01-10',
    lastActive: '10m ago',
    complianceCertCount: 5,
    annualProcureVolume: 'AED 180M+',
    auditNotes: 'FIDIC compliant, ICV certified tier-1 civil developer.',
  },
  {
    id: 'comp_2',
    companyName: 'Apex Industrial Castings & Alloys',
    contactPerson: 'Elena Rostova',
    role: 'supplier',
    email: 'supplier@soko.ae',
    phone: '+971 4 881 4099',
    location: 'JAFZA, Dubai',
    dunsNumber: '11-902-3341',
    tradeLicenseNo: 'CN-4491028',
    vatTrn: '100394857600003',
    isVerified: true,
    status: 'active',
    icvScore: 78.2,
    riskRating: 'low',
    rating: 4.8,
    registeredDate: '2026-01-15',
    lastActive: '25m ago',
    complianceCertCount: 6,
    annualProcureVolume: 'AED 95M+',
    auditNotes: 'CARES UK & ASTM certified structural steel & alloy mill.',
  },
  {
    id: 'comp_3',
    companyName: 'Apex Industrial Mechanical GC',
    contactPerson: 'Sarah Jenkins',
    role: 'contractor',
    email: 'contractor@soko.ae',
    phone: '+971 2 677 3400',
    location: 'Al Maryah Island, Abu Dhabi',
    dunsNumber: '15-449-0128',
    tradeLicenseNo: 'CN-8819201',
    vatTrn: '100882736400003',
    isVerified: true,
    status: 'active',
    icvScore: 81.0,
    riskRating: 'low',
    rating: 4.9,
    registeredDate: '2026-02-01',
    lastActive: '1h ago',
    complianceCertCount: 4,
    annualProcureVolume: 'AED 140M+',
    auditNotes: 'Lead contractor for regional energy corridors & MEP packages.',
  },
  {
    id: 'comp_4',
    companyName: 'Gulf Steel Mills PJSC',
    contactPerson: 'Rashid Al-Khouri',
    role: 'supplier',
    email: 'r.khouri@gulfsteel.ae',
    phone: '+971 2 550 1200',
    location: 'Musaffah ICAD, Abu Dhabi',
    dunsNumber: '02-771-4820',
    tradeLicenseNo: 'AD-9920182',
    vatTrn: '100998877600003',
    isVerified: true,
    status: 'active',
    icvScore: 89.4,
    riskRating: 'low',
    rating: 4.7,
    registeredDate: '2026-02-14',
    lastActive: '3h ago',
    complianceCertCount: 7,
    annualProcureVolume: 'AED 220M+',
    auditNotes: 'Direct rebar billet supplier. Active ICV federal certification.',
  },
  {
    id: 'comp_5',
    companyName: 'Emirates Turnkey EPC Contractors',
    contactPerson: 'David Sterling',
    role: 'contractor',
    email: 'd.sterling@emirates-epc.ae',
    phone: '+971 4 450 8822',
    location: 'Business Bay, Dubai',
    dunsNumber: '19-382-7719',
    tradeLicenseNo: 'DXB-559281',
    vatTrn: '100445566700003',
    isVerified: false,
    status: 'pending_verification',
    icvScore: 62.0,
    riskRating: 'medium',
    rating: 4.3,
    registeredDate: '2026-03-01',
    lastActive: '5h ago',
    complianceCertCount: 2,
    annualProcureVolume: 'AED 65M+',
    auditNotes: 'Submitted trade license; ISO 9001 documentation pending auditor review.',
  },
  {
    id: 'comp_6',
    companyName: 'Hyperion Modular Substations Ltd',
    contactPerson: 'Klaus Meyer',
    role: 'supplier',
    email: 'klaus.meyer@hyperion-grid.de',
    phone: '+49 89 2201 44',
    location: 'Munich, Germany & JAFZA Branch',
    dunsNumber: '31-882-9901',
    tradeLicenseNo: 'FZ-399281',
    vatTrn: '100112233400003',
    isVerified: true,
    status: 'active',
    icvScore: 71.5,
    riskRating: 'low',
    rating: 4.9,
    registeredDate: '2026-03-12',
    lastActive: '1d ago',
    complianceCertCount: 5,
    annualProcureVolume: 'AED 110M+',
    auditNotes: 'IEC 62271 certified high-voltage switchgear & substations.',
  },
  {
    id: 'comp_7',
    companyName: 'Al-Madar General Trading FZE',
    contactPerson: 'Sami Haddad',
    role: 'supplier',
    email: 's.haddad@almadar-fze.com',
    phone: '+971 6 528 9011',
    location: 'Hamriyah Free Zone, Sharjah',
    dunsNumber: '07-339-1829',
    tradeLicenseNo: 'SHJ-88210',
    vatTrn: '100667788900003',
    isVerified: false,
    status: 'pending_verification',
    icvScore: 45.0,
    riskRating: 'high',
    rating: 3.8,
    registeredDate: '2026-03-20',
    lastActive: '2d ago',
    complianceCertCount: 1,
    annualProcureVolume: 'AED 12M+',
    auditNotes: 'Pending Material Test Report validation; price variances flagged by buyer.',
  },
  {
    id: 'comp_8',
    companyName: 'Falcon Heavy Civil Contracting LLC',
    contactPerson: 'Tariq Mansoor',
    role: 'buyer',
    email: 't.mansoor@falconheavy.ae',
    phone: '+971 2 449 8811',
    location: 'Khalifa Industrial Zone (KIZAD), Abu Dhabi',
    dunsNumber: '12-993-8472',
    tradeLicenseNo: 'AD-773920',
    vatTrn: '100332211400003',
    isVerified: true,
    status: 'active',
    icvScore: 88.0,
    riskRating: 'low',
    rating: 4.8,
    registeredDate: '2026-02-18',
    lastActive: '4h ago',
    complianceCertCount: 6,
    annualProcureVolume: 'AED 240M+',
    auditNotes: 'Major marine infrastructure buyer; AED 45M tender currently active.',
  },
];

let moderationReports = [
  {
    id: 'mod_1',
    targetType: 'rfq',
    targetId: 'rfq_883',
    targetTitle: 'RFQ: 850 MT High-Tensile Rebar (ASTM A615 Grade 60)',
    reportedBy: 'Elena Rostova',
    reporterCompany: 'Apex Industrial Castings & Alloys',
    reason: 'Unrealistic Target Pricing & Delivery Milestone',
    details: 'Target price is 42% below regional Platts index with a 4-day delivery timeline to remote site. Potential spam or non-serious quotation harvester.',
    timestamp: '2h ago',
    severity: 'medium',
    status: 'pending',
  },
  {
    id: 'mod_2',
    targetType: 'proposal',
    targetId: 'prop_204',
    targetTitle: 'Subcontract Proposal: MEP Tunnel Chiller Package',
    reportedBy: 'Sarah Jenkins',
    reporterCompany: 'Apex Industrial Mechanical GC',
    reason: 'Suspected Counterfeit Mill Certification',
    details: 'Material Test Report QR code redirects to an unverified domain; heat numbers do not match CARES database registry.',
    timestamp: '5h ago',
    severity: 'critical',
    status: 'pending',
  },
  {
    id: 'mod_3',
    targetType: 'post',
    targetId: 'post_comm_dump',
    targetTitle: 'Surplus Warehouse Dump: 12x Industrial Transformers',
    reportedBy: 'Marcus Vance',
    reporterCompany: 'Vance Infrastructure Group UAE',
    reason: 'Misleading Certification Claims',
    details: 'Seller claims IEEE C57 compliance but refuses site inspection and escrow holding prior to 100% advance wire.',
    timestamp: '1d ago',
    severity: 'high',
    status: 'resolved',
    actionNote: 'Warning issued to supplier; escrow mandate enforced on post.',
  },
  {
    id: 'mod_4',
    targetType: 'profile',
    targetId: 'comp_7',
    targetTitle: 'Company Profile: Al-Madar General Trading FZE',
    reportedBy: 'David Sterling',
    reporterCompany: 'Sterling EPC Contractors',
    reason: 'Incorrect TRN Registration Tax Number',
    details: 'TRN appears to belong to a dissolved mainland entity. Profile verification flagged for manual inspection.',
    timestamp: '2d ago',
    severity: 'medium',
    status: 'pending',
  },
];

let activityLogs = [
  {
    id: 'log_1',
    adminName: 'Zackary Al-Hassan',
    action: 'Verified Company Profile',
    entity: 'Gulf Steel Mills PJSC',
    timestamp: 'Today at 09:30 AM',
    status: 'success',
  },
  {
    id: 'log_2',
    adminName: 'Zackary Al-Hassan',
    action: 'Resolved Moderation Report',
    entity: 'Post #post_comm_dump',
    timestamp: 'Yesterday at 04:15 PM',
    status: 'warning',
  },
  {
    id: 'log_3',
    adminName: 'Zackary Al-Hassan',
    action: 'Approved Escrow Release ($1.2M)',
    entity: 'Vance Infra / Apex Castings Milestone 2',
    timestamp: 'Yesterday at 01:20 PM',
    status: 'success',
  },
  {
    id: 'log_4',
    adminName: 'Zackary Al-Hassan',
    action: 'Audited ICV Compliance Rating',
    entity: 'Apex Industrial Mechanical GC (81.0%)',
    timestamp: '2 days ago',
    status: 'success',
  },
];

// GET /api/admin/stats
adminRouter.get('/stats', (req: Request, res: Response) => {
  const verifiedCount = companyAudits.filter((c) => c.isVerified).length;
  const suppliersCount = companyAudits.filter((c) => c.role === 'supplier').length;
  const buyersCount = companyAudits.filter((c) => c.role === 'buyer').length;
  const contractorsCount = companyAudits.filter((c) => c.role === 'contractor').length;
  const pendingReports = moderationReports.filter((r) => r.status === 'pending').length;

  return res.json({
    success: true,
    stats: {
      totalGrossSourcingValue: 'AED 284.5M',
      totalProfiles: companyAudits.length + 50, // including directory items
      verifiedCompaniesCount: verifiedCount + 44,
      activeTendersCount: 34,
      activeTendersValue: 'AED 68.2M',
      reportedItemsCount: pendingReports,
      disputedEscrowsCount: 1,
      suppliersCount: suppliersCount + 20,
      buyersCount: buyersCount + 14,
      contractorsCount: contractorsCount + 16,
      monthlyGrowthRate: '+14.2%',
      compliancePassRate: '98.8%',
    },
  });
});

// GET /api/admin/companies
adminRouter.get('/companies', (req: Request, res: Response) => {
  return res.json({
    success: true,
    companies: companyAudits,
  });
});

// POST /api/admin/verify-company
adminRouter.post('/verify-company', (req: Request, res: Response) => {
  const { companyId, isVerified } = req.body;
  const comp = companyAudits.find((c) => c.id === companyId);
  if (!comp) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  comp.isVerified = isVerified;
  comp.status = isVerified ? 'active' : 'pending_verification';

  // Log activity
  activityLogs.unshift({
    id: `log_${Date.now()}`,
    adminName: 'Zackary Al-Hassan',
    action: isVerified ? 'Verified Company Profile' : 'Revoked Verification Badge',
    entity: comp.companyName,
    timestamp: 'Just now',
    status: isVerified ? 'success' : 'warning',
  });

  return res.json({
    success: true,
    message: `${comp.companyName} verification updated successfully.`,
    company: comp,
  });
});

// POST /api/admin/update-company-status
adminRouter.post('/update-company-status', (req: Request, res: Response) => {
  const { companyId, status, auditNotes, icvScore, riskRating } = req.body;
  const comp = companyAudits.find((c) => c.id === companyId);
  if (!comp) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  if (status) comp.status = status;
  if (auditNotes !== undefined) comp.auditNotes = auditNotes;
  if (icvScore !== undefined) comp.icvScore = Number(icvScore);
  if (riskRating) comp.riskRating = riskRating;

  activityLogs.unshift({
    id: `log_${Date.now()}`,
    adminName: 'Zackary Al-Hassan',
    action: `Updated Status to ${status.toUpperCase()}`,
    entity: comp.companyName,
    timestamp: 'Just now',
    status: status === 'suspended' ? 'alert' : 'success',
  });

  return res.json({
    success: true,
    message: `${comp.companyName} profile updated.`,
    company: comp,
  });
});

// GET /api/admin/moderation
adminRouter.get('/moderation', (req: Request, res: Response) => {
  return res.json({
    success: true,
    reports: moderationReports,
  });
});

// POST /api/admin/resolve-moderation
adminRouter.post('/resolve-moderation', (req: Request, res: Response) => {
  const { reportId, status, actionNote } = req.body;
  const report = moderationReports.find((r) => r.id === reportId);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  report.status = status;
  if (actionNote) report.actionNote = actionNote;

  activityLogs.unshift({
    id: `log_${Date.now()}`,
    adminName: 'Zackary Al-Hassan',
    action: `Moderation Action: ${status.toUpperCase()}`,
    entity: report.targetTitle,
    timestamp: 'Just now',
    status: status === 'action_taken' ? 'alert' : 'success',
  });

  return res.json({
    success: true,
    message: 'Moderation incident resolved.',
    report,
  });
});

// GET /api/admin/activities
adminRouter.get('/activities', (req: Request, res: Response) => {
  return res.json({
    success: true,
    logs: activityLogs,
  });
});
