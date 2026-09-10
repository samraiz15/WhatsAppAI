/*
 * PARK VIEW CITY LAHORE — MASTER KNOWLEDGE
 *
 * Purpose:
 * - Permanent domain knowledge for the WhatsApp real-estate agent.
 * - Lahore-first, but architecture remains reusable for other cities.
 * - Stable facts are stored here.
 * - Live facts such as current price, inventory, possession and payment
 *   plans MUST be verified before being quoted to a customer.
 *
 * Research basis:
 * - ParkView City official material
 * - ParkView City master-plan material
 * - Zameen marketplace/listing data
 * - Graana area guide
 * - OLX marketplace/listing data
 * - map/location information
 *
 * IMPORTANT:
 * Marketplace listings are market signals, NOT guaranteed inventory
 * belonging to our business.
 */

const PARKVIEW_KNOWLEDGE = {
  identity: {
    canonicalName: 'Park View City Lahore',
    aliases: [
      'Park View',
      'ParkView',
      'Park View City',
      'Park View Lahore',
      'ParkView Lahore',
      'PVC Lahore'
    ],
    developer: 'Vision Group',
    city: 'Lahore',
    province: 'Punjab, Pakistan',
    projectType: 'Residential and commercial real-estate development'
  },

  location: {
    primaryDescription:
      'Park View City Lahore is located on/near Multan Road in Lahore, in the Thokar Niaz Baig / Canal Road side of the city.',
    commonlyReferencedLocation:
      'Approximately 3 km from Thokar Niaz Baig according to area-guide and project-location material.',
    nearbyContext: [
      'Multan Road',
      'Thokar Niaz Baig',
      'Canal Road',
      'M-2 Motorway access',
      'Lahore Ring Road access',
      'Raiwind Road area',
      'DHA EME is in the surrounding geographic context'
    ],
    locationRule:
      'Do not give exact driving time unless current map routing is available.'
  },

  geography: {
    importantTerms: [
      'Multan Road',
      'Thokar Niaz Baig',
      'Canal Road',
      'Lahore Ring Road',
      'M-2 Motorway',
      'Raiwind Road',
      'DHA EME'
    ],
    rule:
      'Understand these as geographic references around Park View City, but do not claim exact distances or travel times without live map verification.'
  },

  blocks: {
    knownResidentialAndProjectAreas: [
      'Crystal Block',
      'Crystal Block Extension',
      'Diamond Block',
      'Emerald Block',
      'Executive Block',
      'Imperial Block',
      'Jade Block',
      'Jade Extension Block',
      'Jasmine Block',
      'Opal Block',
      'Orchard Block',
      'Overseas Block',
      'Pearl Block',
      'Platinum Block',
      'Rose Block',
      'Sapphire Block',
      'Silver Block',
      'Topaz Block',
      'Topaz Extension Block',
      'Tulip Block',
      'Tulip Extension Block',
      'Tulip Overseas'
    ],

    commercialAreas: [
      'Broadway Commercial',
      'The Walk Commercial',
      'Downtown',
      'Rose Market'
    ],

    masterPlanTerms: [
      'Diamond',
      'Platinum',
      'Tulip',
      'Crystal',
      'Topaz',
      'Rose',
      'Sapphire',
      'Emerald',
      'Ruby',
      'Opal',
      'Jade',
      'Silver',
      'Pearl',
      'Orchard',
      'Executive',
      'Imperial',
      'Overseas',
      'Jasmine'
    ],

    rule:
      'Block names can overlap between official/project material and marketplace terminology. If the customer asks about a specific block, preserve the exact name they used and verify current block-specific information before making a factual claim.'
  },

  propertyTypes: {
    residential: [
      'Residential plot',
      'House',
      'Apartment/flat where actually offered',
      'Villa/house'
    ],
    commercial: [
      'Commercial plot',
      'Shop',
      'Office',
      'Commercial unit'
    ],
    commonSizes: [
      '3.5 Marla',
      '5 Marla',
      '10 Marla',
      '1 Kanal'
    ],
    rule:
      'Do not assume every size exists in every block. Block and product must be verified.'
  },

  customerLanguage: {
    romanUrdu: [
      'ghar',
      'makan',
      'plot',
      'zameen',
      'commercial',
      'dukan',
      'shop',
      'office',
      'file',
      'possession',
      'on ground',
      'installment',
      'cash',
      'down payment',
      'booking',
      'transfer',
      'registry',
      'corner',
      'park facing',
      'main boulevard',
      'road facing',
      'prime location'
    ],

    commonTypos: {
      crore: [
        'crore',
        'crores',
        'corror',
        'coror',
        'coror',
        'correr',
        'corre',
        'croor',
        'cr'
      ],
      lakh: [
        'lakh',
        'lakhs',
        'lac',
        'lacs'
      ],
      marla: [
        'marla',
        'marlaa',
        'mrla'
      ],
      parkView: [
        'park view',
        'parkview',
        'park view city',
        'parkview city',
        'park view lahore'
      ]
    },

    examples: [
      '"5 marla house" = residential house requirement',
      '"5 marla plot" = residential plot requirement unless commercial is explicitly stated',
      '"2 crore" = approximately PKR 20,000,000',
      '"50 lakh" = approximately PKR 5,000,000',
      '"in one month" = purchase/investment timeline of approximately one month',
      '"jaldi" / "soon" / "asap" = urgent timeline'
    ]
  },

  buyerQualification: {
    requiredFields: [
      'name',
      'property type',
      'budget',
      'area/block',
      'timeline'
    ],

    usefulOptionalFields: [
      'plot/house size',
      'cash or installment preference',
      'purpose: living or investment',
      'preferred block',
      'corner preference',
      'park-facing preference',
      'main-road preference',
      'possession requirement',
      'number of bedrooms for a house',
      'commercial use',
      'contact preference'
    ],

    questionOrder: [
      'property type',
      'budget',
      'area/block',
      'timeline',
      'name'
    ],

    behavior:
      'Ask only one missing high-value question at a time. If the customer provides several answers in one message, save all of them and skip those questions.'
  },

  salesConversation: {
    principles: [
      'Talk like a professional Pakistani property consultant, not a questionnaire.',
      'Understand short WhatsApp messages.',
      'Understand Roman Urdu and common spelling mistakes.',
      'Do not repeat a question when the customer already answered it.',
      'If the customer answers a different field, save that answer and continue with the next missing field.',
      'If the customer changes requirements, update the lead instead of treating the old requirement as current.',
      'Do not pressure the customer.',
      'Do not promise guaranteed profit or appreciation.',
      'Do not invent listings.',
      'Do not invent prices.',
      'Do not invent possession status.',
      'Do not invent approvals or NOCs.',
      'Do not invent payment plans.',
      'Do not claim an online marketplace listing belongs to our company.',
      'Offer a site visit or human-agent handoff when appropriate.'
    ],

    naturalReplies: {
      greeting:
        'Respond warmly and then move naturally toward understanding the property requirement.',
      buyer:
        'Identify property type, budget, preferred area/block and timeline.',
      investor:
        'Understand budget, preferred size/block, investment horizon and whether the customer wants possession or investment-oriented property.',
      unclear:
        'Ask a short clarification rather than guessing.',
      frustrated:
        'Acknowledge the concern and offer human assistance.',
      humanRequest:
        'Respectfully hand the lead to a human agent.'
    }
  },

  blockInterpretation: {
    crystal:
      'A named Park View City block appearing frequently in current marketplace listings. Do not infer exact current pricing or possession without verification.',
    platinum:
      'A named Park View City block appearing frequently in current marketplace listings. Do not infer exact current pricing or possession without verification.',
    diamond:
      'A named Park View City block appearing frequently in current marketplace listings. Do not infer exact current pricing or possession without verification.',
    tulip:
      'A named Park View City residential area/block. Clarify whether the customer means Tulip, Tulip Extension or Tulip Overseas when necessary.',
    tulipExtension:
      'A named Park View City area/block. Current listings commonly use the name Tulip Extension.',
    tulipOverseas:
      'A named Park View City area/block commonly used in current marketplace listings.',
    jade:
      'A named Park View City block. Clarify Jade versus Jade Extension when necessary.',
    topaz:
      'A named Park View City block. Clarify Topaz versus Topaz Extension when necessary.',
    overseas:
      'A named Park View City block/product area. Do not assume that "Overseas" means the customer is overseas; ask if context is unclear.',
    executive:
      'A named Park View City block/product area.',
    imperial:
      'A named Park View City block/product area.',
    rose:
      'A named Park View City block/product area; Rose Market is a separate commercial terminology.',
    commercial:
      'Clarify whether the customer wants a commercial plot, shop, office or another commercial unit and which commercial area they mean.'
  },

  marketKnowledge: {
    sourcesObserved: [
      'Zameen',
      'Graana',
      'OLX'
    ],

    marketplacePattern:
      'Current marketplace listings show active secondary-market activity for plots and houses across multiple Park View City blocks.',

    observedPlotBlocks: [
      'Crystal Block',
      'Tulip Overseas',
      'Platinum Block',
      'Tulip Extension Block',
      'Diamond Block',
      'Silver Block',
      'Overseas Block',
      'Imperial Block',
      'Executive Block',
      'Tulip Block',
      'Rose Block',
      'Broadway Commercial',
      'Orchard Block',
      'Topaz Block',
      'Pearl Block',
      'Jade Extension Block',
      'Topaz Extension Block',
      'Jade Block',
      'Crystal Block Extension',
      'Jasmine Block',
      'The Walk Commercial',
      'Sapphire Block'
    ],

    observedHouseBlocks: [
      'Tulip Overseas',
      'Tulip Extension Block',
      'Executive Block',
      'Tulip Block',
      'Crystal Block',
      'Platinum Block',
      'Jade Extension Block',
      'Diamond Block',
      'Rose Block',
      'Overseas Block',
      'Jade Block',
      'Topaz Extension Block',
      'Topaz Block',
      'Imperial Block',
      'Sapphire Block',
      'Jasmine Block'
    ],

    rule:
      'Marketplace counts and listings are dynamic. Never present them as guaranteed inventory or permanent market facts.'
  },

  amenitiesAndLifestyle: {
    commonlyReferencedFacilities: [
      'Parks',
      'Green areas',
      'Mosques',
      'Commercial areas',
      'Road network',
      'Security',
      'Utilities',
      'Schools/educational facilities',
      'Medical/healthcare facilities',
      'Recreational areas',
      'Food and retail facilities'
    ],

    officialOrProjectMaterialTerms: [
      'Grand Jamia Mosque',
      'Central Park',
      'Jogging/cycling track',
      'International school',
      'Medical complex',
      'Commercial markaz',
      'Supermarket',
      'Kids play area',
      'Food court',
      'Water filtration',
      'Underground utilities',
      'Sewerage and drainage',
      'Backup power',
      'CCTV/security'
    ],

    rule:
      'Availability, operating status and exact location of any facility can change. Do not promise that a particular facility is operational or immediately available unless verified.'
  },

  roadsAndLocationSalesLanguage: {
    usefulTerms: [
      'main boulevard',
      'wide road',
      'road facing',
      'park facing',
      'corner',
      'near commercial',
      'near mosque',
      'near park',
      'prime location'
    ],

    rule:
      'These are property-position descriptors, not guarantees of value. Never state that a feature guarantees appreciation.'
  },

  financialKnowledge: {
    units: {
      lakh: '1 lakh = 100,000 PKR',
      crore: '1 crore = 10,000,000 PKR',
      oneCrore: '10 million PKR',
      oneKanal: 'Do not convert to square feet without stating the convention being used.',
      marla:
        'Marla size varies by convention and locality. Do not assume a universal square-foot conversion.'
    },

    examples: {
      '2 crore': 'PKR 20,000,000',
      '1 crore': 'PKR 10,000,000',
      '50 lakh': 'PKR 5,000,000',
      '25 lakh': 'PKR 2,500,000'
    },

    rule:
      'A customer saying "2 crore" should be understood as a budget, even if spelling is incorrect such as "2 corror".'
  },

  liveInformation: {
    alwaysVerify: [
      'current asking price',
      'current market price',
      'current official price',
      'current inventory',
      'availability',
      'payment plan',
      'booking amount',
      'monthly installment',
      'development charges',
      'possession status',
      'transfer charges',
      'transfer-free status',
      'dues status',
      'development status',
      'NOC/approval status',
      'exact plot number',
      'exact location of a listing',
      'seller identity',
      'current discounts',
      'current promotions'
    ],

    responseRule:
      'If live verification is unavailable, say that the information needs to be verified rather than guessing.'
  },

  verificationAndTrust: {
    neverClaimWithoutEvidence: [
      'LDA/RUDA approval',
      'NOC',
      'possession',
      'legal ownership',
      'developer inventory',
      'official price',
      'guaranteed return',
      'guaranteed appreciation',
      'guaranteed rental yield',
      'guaranteed resale',
      'guaranteed payment plan'
    ],

    customerProtection: [
      'Encourage verification of ownership and documentation.',
      'For a specific property, verify plot number, block, size, status, dues and seller/dealer information.',
      'Do not tell a customer to transfer money solely because a listing appears online.',
      'Escalate legal/document disputes to a human professional.'
    ]
  },

  commonCustomerQuestions: [
    'What is the price of a 5 marla plot?',
    'What is the price of a 10 marla plot?',
    'Which block is best?',
    'Which block is best for investment?',
    'Which block is best for living?',
    'Do you have possession plots?',
    'Do you have 5 marla houses?',
    'Do you have 10 marla houses?',
    'Do you have installment plots?',
    'Which blocks have houses?',
    'Which blocks have plots?',
    'Where is Park View City?',
    'How far is it from Thokar Niaz Baig?',
    'How do I reach Park View City?',
    'Is Crystal Block good?',
    'Is Diamond Block good?',
    'Is Platinum Block good?',
    'What is Tulip Overseas?',
    'What is Tulip Extension?',
    'What is Jade Extension?',
    'What is Topaz Extension?',
    'Do you have commercial plots?',
    'Do you have a corner plot?',
    'Do you have a park-facing plot?',
    'Can I visit the site?',
    'Can I speak to an agent?'
  ],

  responsePatterns: {
    priceQuestion:
      'Ask size, block and whether the customer wants a plot/house/commercial property if those details are missing. Never invent a current price.',
    bestBlockQuestion:
      'Do not declare one block universally best. Ask whether the customer prioritizes living, possession, budget, resale, investment, road access or commercial activity.',
    listingQuestion:
      'Ask for the exact property requirements and use live listing data when available.',
    mapQuestion:
      'Explain the general location and major road context. Use live maps for exact navigation.',
    approvalQuestion:
      'Do not make an unsupported approval claim. Say that approval/status should be verified from current official records.',
    paymentQuestion:
      'Payment plans are time-sensitive. Verify the current plan before quoting booking, installments or total price.'
  }
};

function getParkViewKnowledge() {
  return PARKVIEW_KNOWLEDGE;
}

function getParkViewContext(message = '', maxChars = 5200) {
  const text = String(message).toLowerCase();

  const sections = [];

  sections.push({
    priority: 1,
    data: PARKVIEW_KNOWLEDGE.identity
  });

  sections.push({
    priority: 2,
    data: PARKVIEW_KNOWLEDGE.location
  });

  if (
    /\b(plot|house|home|makan|ghar|marla|kanal|commercial|shop|office|apartment|flat)\b/i.test(text)
  ) {
    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.propertyTypes
    });
  }

  if (
    /\b(block|crystal|platinum|diamond|tulip|jade|topaz|rose|silver|overseas|executive|imperial|jasmine|sapphire|pearl|orchard)\b/i.test(text)
  ) {
    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.blocks
    });
  }

  if (
    /\b(price|budget|crore|crores|corror|coror|correr|lakh|lac|lacs|installment|cash|booking)\b/i.test(text)
  ) {
    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.financialKnowledge
    });

    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.liveInformation
    });
  }

  if (
    /\b(possession|approved|approval|noc|dues|transfer|registry|document|legal)\b/i.test(text)
  ) {
    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.verificationAndTrust
    });

    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.liveInformation
    });
  }

  if (
    /\b(park|mosque|school|hospital|medical|commercial|road|facility|amenit|security)\b/i.test(text)
  ) {
    sections.push({
      priority: 2,
      data: PARKVIEW_KNOWLEDGE.amenitiesAndLifestyle
    });
  }

  if (
    /\b(best|investment|invest|living|resale|return|profit|appreciation)\b/i.test(text)
  ) {
    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.salesConversation
    });

    sections.push({
      priority: 1,
      data: PARKVIEW_KNOWLEDGE.liveInformation
    });
  }

  sections.push({
    priority: 1,
    data: PARKVIEW_KNOWLEDGE.salesConversation
  });

  sections.push({
    priority: 1,
    data: PARKVIEW_KNOWLEDGE.verificationAndTrust
  });

  const seen = new Set();
  const ordered = [];

  for (const section of sections.sort((a, b) => a.priority - b.priority)) {
    const serialized = JSON.stringify(section.data);

    if (!seen.has(serialized)) {
      seen.add(serialized);
      ordered.push(section.data);
    }
  }

  let output = '';

  for (const section of ordered) {
    const chunk = JSON.stringify(section, null, 0);

    if ((output + chunk).length > maxChars) break;

    output += chunk + '\n';
  }

  return output.trim();
}

module.exports = {
  PARKVIEW_KNOWLEDGE,
  getParkViewKnowledge,
  getParkViewContext
};
