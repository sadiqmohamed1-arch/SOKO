import { OpportunityItem } from '../types';

export interface CategoryBlockItem {
  id: string;
  name: string;
  count: number;
  description: string;
  iconName: string;
  tags: string[];
}

export const OPPORTUNITY_12_CATEGORIES: CategoryBlockItem[] = [
  {
    id: 'manpower',
    name: 'Manpower',
    count: 12,
    description: 'Certified steel fixers, shuttering carpenters, 6G welders & civil site labor supply.',
    iconName: 'Users',
    tags: ['Skilled Labor', 'Steel Fixers', 'Carpenters', 'Masons', 'Welders'],
  },
  {
    id: 'scrap',
    name: 'Scrap',
    count: 9,
    description: 'Demolition steel scrap, rebar offcuts, copper cables & surplus metal recovery lots.',
    iconName: 'Coins',
    tags: ['Steel Scrap', 'Copper Scrap', 'Rebar Offcuts', 'Plant Decommissioning', 'Bulk Metal'],
  },
  {
    id: 'rental',
    name: 'Rental',
    count: 15,
    description: 'Excavators, 50-ton mobile cranes, telehandlers, dewatering pumps & boom lifts.',
    iconName: 'Truck',
    tags: ['Heavy Plant', 'Mobile Cranes', 'Excavators', 'Dewatering Pumps', 'Telehandlers'],
  },
  {
    id: 'tile_subcon',
    name: 'Tile Subcon',
    count: 8,
    description: 'Commercial porcelain, ceramic floor & wall tiling, marble cladding & screed laying.',
    iconName: 'Layers',
    tags: ['Porcelain Tiling', 'Marble Cladding', 'Granite Paving', 'Screed Works', 'Terrazzo'],
  },
  {
    id: 'block_subcon',
    name: 'Block Subcon',
    count: 11,
    description: 'AAC thermal blocks, hollow concrete blockwork, lintel installation & partition walls.',
    iconName: 'Building2',
    tags: ['AAC Blocks', 'Concrete Blockwork', 'Solid Blocks', 'Masonry', 'Fire Walls'],
  },
  {
    id: 'mep_subcon',
    name: 'MEP Subcon',
    count: 14,
    description: 'HVAC ducting, chilled water piping, electrical containment & fire-fighting packages.',
    iconName: 'Zap',
    tags: ['HVAC Ducting', 'Chilled Water', 'Fire Fighting', '11kV Substation', 'Drainage'],
  },
  {
    id: 'plaster_paint',
    name: 'Plaster & Paint',
    count: 7,
    description: 'Internal gypsum plastering, external facade rendering, texture paint & epoxy floors.',
    iconName: 'Paintbrush',
    tags: ['Gypsum Plaster', 'External Rendering', 'Epoxy Flooring', 'Texture Coating', 'Primer'],
  },
  {
    id: 'waterproofing',
    name: 'Waterproofing',
    count: 6,
    description: 'Basement tanking, SBS bituminous membrane, combo roof insulation & wet area seal.',
    iconName: 'ShieldCheck',
    tags: ['Basement Tanking', 'Roof Waterproofing', 'SBS Membrane', 'Injection Grouting', 'Insulation'],
  },
  {
    id: 'steel_rebar',
    name: 'Steel & Rebar',
    count: 16,
    description: 'Cut & bend ASTM A615 rebar, structural steel frame erection & embedded plates.',
    iconName: 'Hammer',
    tags: ['Cut & Bend', 'ASTM A615 Rebar', 'Structural Steel', 'Beams & Columns', 'Purlins'],
  },
  {
    id: 'concrete_works',
    name: 'Concrete Works',
    count: 10,
    description: 'Ready-mix concrete supply, mass raft continuous pours & high-altitude pumping.',
    iconName: 'HardHat',
    tags: ['Ready Mix', 'Self-Compacting', 'High Rise Pumping', 'Green Concrete', 'Precast'],
  },
  {
    id: 'fitout_joinery',
    name: 'Fitout & Joinery',
    count: 8,
    description: 'Architectural joinery, fire-rated acoustic doors, ceiling baffles & reception desks.',
    iconName: 'Compass',
    tags: ['Fire Rated Doors', 'Architectural Joinery', 'Ceiling Baffles', 'Wall Paneling', 'Partitions'],
  },
  {
    id: 'earthworks',
    name: 'Earthworks',
    count: 10,
    description: 'Bulk site excavation, contiguous shoring, dewatering networks & soil stabilization.',
    iconName: 'Activity',
    tags: ['Bulk Excavation', 'Secant Piling', 'Dewatering System', 'Ground Anchors', 'Soil Leveling'],
  },
];

// Generates rich pre-populated opportunities for all 12 categories
export function generateCategoryOpportunities(categoryId: string): OpportunityItem[] {
  const cat = OPPORTUNITY_12_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];

  const locations = [
    'Dubai South Logistics District, UAE',
    'Dubai Creek Harbour Phase 3, UAE',
    'Jebel Ali Industrial Area 1, Dubai',
    'Al Quoz Heavy Industrial Yard 3, Dubai',
    'Business Bay Mixed-Use Tower Site, Dubai',
    'Dubai Hills Estate Infrastructure Plot, UAE',
    'Expo City Residential Quarter, Dubai',
    'ICAD Industrial City, Abu Dhabi',
  ];

  const items: OpportunityItem[] = [];

  for (let i = 1; i <= cat.count; i++) {
    const loc = locations[(i - 1) % locations.length];
    const rfqNum = `RFQ-${cat.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)}-2026-${String(100 + i).padStart(4, '0')}`;

    let title = '';
    let budget = 'AED 450,000';
    let estVal = 450000;
    let qty = 'Full Package';
    let desc = '';
    let specs: string[] = [];

    switch (categoryId) {
      case 'manpower':
        title = `Subcontract Package #${i}: ${i % 2 === 0 ? '50 Skilled Steel Fixers & Carpenters' : '35 Certified 6G Pipe Welders & Riggers'} for 6-Month Fast-Track Project`;
        budget = `AED ${350000 + i * 45000}`;
        estVal = 350000 + i * 45000;
        qty = `${30 + i * 5} Certified Personnel`;
        desc = `Immediate mobilization required for ongoing structural works in ${loc}. All personnel must possess valid UAE residence visas, MOHRE work permits, and mandatory safety passport cards.`;
        specs = [
          'Direct payroll and insurance covered by manpower provider under UAE labor law',
          'Accommodated in compliant industrial camp with daily site transport included',
          'Valid 6-month extendable supply agreement with guaranteed replacement within 48h',
        ];
        break;

      case 'scrap':
        title = `Surplus Salvage Lot #${i}: ${200 + i * 65} Metric Tons Industrial Steel Scrap & Cut-Off Offcuts`;
        budget = `AED ${(200 + i * 65) * 1150}`;
        estVal = (200 + i * 65) * 1150;
        qty = `${200 + i * 65} MT Bulk Weight`;
        desc = `Direct yard release of demolition structural steel beams, heavy plate trimmings, and rebar offcuts in ${loc}. Clean grade scrap sorted and ready for immediate flatbed collection.`;
        specs = [
          'Certified weighbridge ticket provided at export gate',
          'Payment terms: 100% advance or approved bank letter of credit',
          'Loading crane available on site at no extra charge',
        ];
        break;

      case 'rental':
        title = `Equipment Rental #${i}: ${i % 3 === 0 ? '50-Ton Mobile Crane (Tadano/Kato)' : i % 3 === 1 ? 'CAT 349D Hydraulic Excavator with Breaker' : '17m JCB Telescopic Telehandler'} (Monthly Rate)`;
        budget = `AED ${28000 + i * 4200} / Month`;
        estVal = (28000 + i * 4200) * 3;
        qty = '1 Unit with Certified Operator & Fuel Option';
        desc = `Monthly equipment rental package needed for civil construction in ${loc}. Third-party safety inspection certificate (DCL / Bureau Veritas) mandatory.`;
        specs = [
          'Third-party calibrated load testing certification included',
          'Experienced operator with valid UAE heavy equipment license',
          'Full maintenance and replacement backup within 12 hours of breakdown',
        ];
        break;

      case 'tile_subcon':
        title = `Tiling Subcontract Package #${i}: ${12000 + i * 2500} m² Porcelain Floor & Wall Tiling`;
        budget = `AED ${240000 + i * 55000}`;
        estVal = 240000 + i * 55000;
        qty = `${12000 + i * 2500} m² Net Area`;
        desc = `Turnkey labor and adhesive installation subcontract for residential corridors and wet areas in ${loc}. Subcontractor must provide sample mockups and verified previous GC references.`;
        specs = [
          'Laser leveled screed preparation and anti-crack uncoupling membranes',
          'Strict 2mm joint spacing with epoxy grout in wet areas',
          'Milestone payments: 20% mobilization -> 40% intermediate floor signoff -> 40% final QA',
        ];
        break;

      case 'block_subcon':
        title = `Blockwork Subcontract #${i}: ${18000 + i * 3200} m² AAC Lightweight Thermal Block Laying`;
        budget = `AED ${190000 + i * 38000}`;
        estVal = 190000 + i * 38000;
        qty = `${18000 + i * 3200} m² Wall Area`;
        desc = `Execution of 100mm, 150mm, and 200mm thermal block partition masonry for commercial structure in ${loc}. Dubai Municipality approved materials supplied by main contractor.`;
        specs = [
          'Installation of galvanized wire mesh ties every two courses',
          'Cast-in-situ reinforced concrete stiffener columns and lintels over openings',
          'Daily joint raking and vertical plumb verification by GC inspection engineer',
        ];
        break;

      case 'mep_subcon':
        title = `MEP Subcontract #${i}: Complete HVAC Chilled Water Piping & Fire-Fighting Sprinkler Distribution`;
        budget = `AED ${680000 + i * 110000}`;
        estVal = 680000 + i * 110000;
        qty = 'Complete Mechanical Floor Package';
        desc = `Turnkey MEP package including fabrication and erection of pre-insulated chilled water lines, fire protection pumps, and electrical containment in ${loc}. DEWA and Civil Defense compliant.`;
        specs = [
          'Hydrostatic pressure testing at 1.5x design pressure witnessed by consultant',
          'Full shop drawings and BIM Level 2 coordination files provided by subcon',
          '12-month DLP warranty with 10% retention bank guarantee',
        ];
        break;

      case 'plaster_paint':
        title = `Plastering & Painting Subcontract #${i}: ${22000 + i * 4000} m² Internal Gypsum & Facade Coating`;
        budget = `AED ${175000 + i * 32000}`;
        estVal = 175000 + i * 32000;
        qty = `${22000 + i * 4000} m² Finished Surface`;
        desc = `Internal machine spray plastering and exterior weather-resistant acrylic texture painting for mid-rise tower in ${loc}.`;
        specs = [
          'Pre-plaster bonding agent (PVA/SBR) application and galvanized angle beads',
          'Three-coat internal emulsion paint system to RAL specification',
          'External anti-carbonation crack-bridging elastomeric facade coating',
        ];
        break;

      case 'waterproofing':
        title = `Waterproofing Subcontract #${i}: ${8500 + i * 1500} m² Substructure Basement Tanking & Combo Roof`;
        budget = `AED ${220000 + i * 48000}`;
        estVal = 220000 + i * 48000;
        qty = `${8500 + i * 1500} m² Membrane Area`;
        desc = `Double-layer 4mm SBS bituminous torch-applied membrane tanking for deep basement retaining walls and raft foundation in ${loc}. 10-year manufacturer warranty required.`;
        specs = [
          'Substrate primer, 4mm SBS membrane with polyester reinforcement',
          'Extruded polystyrene protection board (XPS 50mm) against backfill damage',
          'Electronic leak detection testing and water flood test on roof slabs',
        ];
        break;

      case 'steel_rebar':
        title = `Rebar & Steel Package #${i}: ${450 + i * 90} Metric Tons Cut & Bend Deformed Rebar (BS 4449 Grade B500B)`;
        budget = `AED ${(450 + i * 90) * 2580}`;
        estVal = (450 + i * 90) * 2580;
        qty = `${450 + i * 90} MT Bar Bending Schedule (BBS)`;
        desc = `Factory automated cut-and-bend rebar with mill test certificates conforming to Dubai Central Laboratory (DCL) for ongoing commercial structural frame in ${loc}.`;
        specs = [
          'Delivery in phased tag-coded batches matching structural pour sequences',
          'Third-party tensile and 180-degree bend test certificates with every batch',
          'Net 45-day payment terms against engineer verified site delivery notes',
        ];
        break;

      case 'concrete_works':
        title = `Ready-Mix Concrete Deal #${i}: ${3500 + i * 600} m³ High-Strength C50/60 Green Concrete`;
        budget = `AED ${(3500 + i * 600) * 245}`;
        estVal = (3500 + i * 600) * 245;
        qty = `${3500 + i * 600} m³ Liquid Delivery`;
        desc = `Dubai Municipality Al Sa’fat compliant low-carbon slag mix ready-mix concrete with chilled temperature control (<28°C discharge) for thick foundation raft in ${loc}.`;
        specs = [
          'Dedicated on-site stationary concrete boom pumps included with supply',
          'Cube sampling: 6 cubes per 50 m³ with 7-day and 28-day break tests',
          'Continuous night pour logistical coordination with traffic police escort',
        ];
        break;

      case 'fitout_joinery':
        title = `Architectural Joinery Subcontract #${i}: ${120 + i * 25} Fire-Rated Acoustic Doors & Wall Cladding`;
        budget = `AED ${310000 + i * 62000}`;
        estVal = 310000 + i * 62000;
        qty = `${120 + i * 25} Fire-Rated Door Units`;
        desc = `Supply and installation of 60-minute and 120-minute Civil Defense approved timber flush doors with stainless steel ironmongery and matching timber veneer wall paneling in ${loc}.`;
        specs = [
          'Civil Defense certificate of conformity and label on door leaf',
          'Heavy-duty concealed ball-bearing hinges and mortise locksets',
          'Factory PU lacquered finish with site touchup and commissioning signoff',
        ];
        break;

      case 'earthworks':
        title = `Deep Excavation & Shoring #${i}: ${45000 + i * 8000} m³ Bulk Excavation & Dewatering System`;
        budget = `AED ${540000 + i * 85000}`;
        estVal = 540000 + i * 85000;
        qty = `${45000 + i * 8000} m³ Soil Cut & Cart Away`;
        desc = `Bulk basement excavation to -12.5m depth with perimeter secant pile wall, ground tieback anchors, and active deep well dewatering scheme in ${loc}.`;
        specs = [
          'Discharge permit coordination with Dubai Municipality sewerage department',
          'Inclinometer monitoring and weekly geotechnical movement reports',
          'Fleet of 25 heavy tipper trucks with valid road transport permits',
        ];
        break;

      default:
        title = `Special Sourcing Tender #${i}: Package in ${cat.name}`;
        budget = `AED 500,000`;
        estVal = 500000;
        qty = 'Full Scope';
        desc = `Open commercial tender requirement under category ${cat.name} in ${loc}.`;
        specs = ['Dubai Municipality compliant submittals required'];
    }

    items.push({
      id: `cat_opp_${categoryId}_${i}`,
      rfqNumber: rfqNum,
      title: title,
      issuerName: i % 2 === 0 ? 'Eng. Zaid Al-Najjar' : 'Sarah Jenkins',
      issuerCompany: i % 2 === 0 ? 'Al Naboodah Civil Infrastructure GC' : 'Apex Heavy Civil & Substructures',
      issuerRole: 'contractor',
      issuerAvatar: i % 2 === 0
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      verified: true,
      category: cat.name,
      budgetRange: budget,
      estimatedValue: estVal,
      quantity: qty,
      targetPrice: budget,
      location: loc,
      deadline: `Nov ${10 + (i % 18)}, 2026`,
      daysLeft: 20 + (i % 25),
      status: 'open',
      description: desc,
      specifications: specs,
      proposalsCount: 2 + (i % 5),
      myProposalSubmitted: false,
      paymentTerms: 'Milestone escrow releases against consultant validated inspection',
      opportunityType: 'buyer_campaign',
      campaignCategory: cat.name,
      targetedSuppliersCount: 150 + i * 12,
      proposals: [
        {
          id: `prop_${categoryId}_${i}_1`,
          opportunityId: `cat_opp_${categoryId}_${i}`,
          supplierId: `sup_${categoryId}_1`,
          supplierName: 'Klaus Meyer',
          supplierCompany: 'Emirates Pre-Qualified Trade Contractors',
          supplierAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          supplierRole: 'supplier',
          unitPrice: Math.round(estVal * 0.94),
          totalPrice: Math.round(estVal * 0.94),
          currency: 'AED',
          leadTimeDays: 7,
          paymentTerms: 'Net 30 days',
          notes: `Submitted formal technical and commercial bid for ${cat.name}. Verified team ready to mobilize.`,
          submittedAt: 'Today at 09:15 AM',
          status: 'shortlisted',
        },
      ],
    });
  }

  return items;
}
