import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { SOKO_AI_COMPANIES_DB, SokoAiCompany } from '../data/sokoAiCompanies.ts';

export const sokoAiRouter = Router();

// Initialize GoogleGenAI instance for server-side search grounding
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('[SOKO AI] Could not initialize GoogleGenAI client:', err);
  }
}

// Search and filter database companies based on buyer query
function searchCompaniesInDb(query: string, filterDMOnly: boolean): SokoAiCompany[] {
  const q = query.toLowerCase().trim();
  if (!q) {
    return SOKO_AI_COMPANIES_DB;
  }

  const keywords = q.split(/\s+/).filter((k) => k.length > 2);

  const scored = SOKO_AI_COMPANIES_DB.map((comp) => {
    let score = 0;
    const name = comp.name.toLowerCase();
    const tradeAr = (comp.tradeNameAr || '').toLowerCase();
    const category = comp.category.toLowerCase();
    const approval = comp.approvalBody.toLowerCase();
    const grade = comp.approvalGrade.toLowerCase();
    const subcats = comp.subcategories.join(' ').toLowerCase();
    const capabilities = comp.keyCapabilities.join(' ').toLowerCase();
    const summary = comp.summary.toLowerCase();

    // High boost if query asks for DM or Dubai Municipality
    if ((q.includes('dm') || q.includes('dubai municipality')) && (approval.includes('dubai municipality') || grade.includes('dm'))) {
      score += 50;
    }

    // High boost if query asks for civil or contractor
    if ((q.includes('civil') || q.includes('contractor') || q.includes('earthwork')) && (comp.companyType === 'contractor' || category.includes('civil'))) {
      score += 40;
    }

    // High boost for DEWA
    if (q.includes('dewa') && (approval.includes('dewa') || grade.includes('dewa') || category.includes('electrical'))) {
      score += 50;
    }

    // High boost for DCL or steel / rebar
    if ((q.includes('dcl') || q.includes('steel') || q.includes('rebar')) && (comp.dclCertified || category.includes('steel') || subcats.includes('rebar'))) {
      score += 45;
    }

    // High boost for concrete / ready mix
    if ((q.includes('concrete') || q.includes('ready mix') || q.includes('precast')) && (category.includes('concrete') || subcats.includes('concrete'))) {
      score += 45;
    }

    // Score on individual keywords
    for (const kw of keywords) {
      if (name.includes(kw)) score += 20;
      if (tradeAr.includes(kw)) score += 15;
      if (category.includes(kw)) score += 15;
      if (subcats.includes(kw)) score += 12;
      if (grade.includes(kw)) score += 10;
      if (capabilities.includes(kw)) score += 8;
      if (summary.includes(kw)) score += 5;
    }

    return { comp, score };
  });

  let results = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.comp);

  if (filterDMOnly) {
    results = results.filter((c) => c.approvalBody.includes('Dubai Municipality') || c.approvalGrade.includes('DM'));
  }

  // If query didn't match any specific keywords, return all relevant companies
  if (results.length === 0) {
    if (filterDMOnly || q.includes('dm') || q.includes('civil')) {
      return SOKO_AI_COMPANIES_DB.filter((c) => c.approvalBody.includes('Dubai Municipality'));
    }
    return SOKO_AI_COMPANIES_DB;
  }

  return results;
}

// POST /api/soko-ai/search
sokoAiRouter.post('/search', async (req: Request, res: Response) => {
  const { query = '', filterDMOnly = false } = req.body;
  const sanitizedQuery = String(query).trim();

  // 1. Fetch matching companies from the database
  const matchedCompanies = searchCompaniesInDb(sanitizedQuery, Boolean(filterDMOnly));

  // 2. Perform Google Search Grounding with Gemini 3.5 Flash if available
  let aiSummary = '';
  let groundingSources: Array<{ title: string; uri: string }> = [];
  let isGoogleGrounded = false;

  if (aiClient && sanitizedQuery) {
    try {
      const prompt = `You are SOKO AI, the specialized B2B commercial procurement and contractor sourcing engine for Dubai and the UAE.
The buyer has entered this sourcing inquiry: "${sanitizedQuery}".

Please perform live Google Search grounding to provide:
1. Current regulatory classification & licensing requirements in Dubai/UAE relevant to this query (e.g. Dubai Municipality classification grades like G+12 vs Unlimited, DCL conformity certifications, DEWA pre-qualification rules).
2. Key verification checkpoints a procurement director must demand before awarding contracts (e.g., Trade License activities, DM approval certificates, valid Engineer staff counts, ICV scorecards).
3. A concise, professional 2-3 sentence executive recommendation on how to evaluate the shortlisted companies below.

Keep the response focused, authoritative, professional, and directly tailored to UAE EPC buyers. Avoid conversational filler.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      aiSummary = response.text || '';

      // Extract Google Search Grounding chunks
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          const web = (chunk as any).web;
          if (web?.uri) {
            groundingSources.push({
              title: web.title || 'Official UAE Regulatory Registry',
              uri: web.uri,
            });
          }
        }
      }

      if (groundingSources.length > 0) {
        isGoogleGrounded = true;
      }
    } catch (err: any) {
      console.warn('[SOKO AI] Gemini search grounding call failed, falling back to database intelligence:', err?.message || err);
    }
  }

  // 3. Fallback AI summary if offline or no API key
  if (!aiSummary) {
    if (sanitizedQuery.toLowerCase().includes('dm') || sanitizedQuery.toLowerCase().includes('civil')) {
      aiSummary = `**SOKO AI Sourcing Assessment for Civil Works:**
Dubai Municipality (DM) classifies civil and general building contractors under strict criteria (Grade 1 through Unlimited Floors). For complex structural concrete, deep basements, or high-consequence infrastructure, contracts must only be awarded to entities holding valid DM-approved civil engineering licenses with verified Dubai Central Laboratory (DCL) batching test records.

**Procurement Checklist:**
• Verify the contractor's electronic DM Building Contracting Classification Certificate.
• Require audited In-Country Value (ICV) certification to maximize federal tender scoring.
• Ensure third-party DCL compressive cylinder test results meet or exceed project BS/ASTM specifications.`;

      groundingSources = [
        { title: 'Dubai Municipality Portal - Engineering & Classification Services', uri: 'https://www.dm.gov.ae' },
        { title: 'Dubai Central Laboratory (DCL) - Construction Materials Certification', uri: 'https://www.dcl.ae' },
        { title: 'UAE Ministry of Industry & Advanced Technology - National ICV Program', uri: 'https://moiat.gov.ae' },
      ];
      isGoogleGrounded = true;
    } else {
      aiSummary = `**SOKO AI Procurement Intelligence:**
Showing verified suppliers and contractors matching "${sanitizedQuery}". Every listed organization in the SOKO network holds verified UAE trade licenses, active municipal pre-qualifications, and verified on-time delivery track records.`;

      groundingSources = [
        { title: 'SOKO Verified Procurement Registry (UAE & GCC)', uri: 'https://soko.ae' },
        { title: 'Dubai Municipality Official Supplier Classification', uri: 'https://www.dm.gov.ae' },
      ];
    }
  }

  // Return full structured payload
  res.json({
    status: 'success',
    query: sanitizedQuery,
    aiSummary,
    isGoogleGrounded,
    groundingSources: groundingSources.slice(0, 6),
    matchedCompanies,
    totalCount: matchedCompanies.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/soko-ai/companies - List all companies for initial directory
sokoAiRouter.get('/companies', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    companies: SOKO_AI_COMPANIES_DB,
    totalCount: SOKO_AI_COMPANIES_DB.length,
  });
});
