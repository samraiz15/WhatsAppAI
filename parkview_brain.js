/**
 * PARK VIEW CITY LAHORE — REALTOR BRAIN
 *
 * Research layer:
 * - Official / developer material
 * - Zameen current listings
 * - Graana listings / area guide
 * - OLX market inventory where available
 * - Google Maps / mapped businesses
 * - Community / resident reports
 *
 * IMPORTANT:
 * Asking price != transaction price.
 * Marketing claim != verified fact.
 * Society-wide claim != block-specific fact.
 *
 * Last research pass: September 2026
 */

const PARK_VIEW_CITY_BRAIN = {

  identity: {
    name: 'Park View City Lahore',
    developer: 'Vision Group',
    location: 'Main Multan Road, Lahore',
    landmark: 'Near Thokar Niaz Baig / opposite DHA EME',
    core_rule:
      'Always identify the exact block before giving block-specific advice.'
  },

  source_policy: {
    tier1: [
      'developer / official ParkView material',
      'regulatory authority records when directly available',
      'actual property documentation'
    ],

    tier2: [
      'Zameen current listings',
      'Graana current listings',
      'Google Maps mapped locations/businesses'
    ],

    tier3: [
      'OLX listings',
      'community discussions',
      'agent advertisements',
      'older area guides'
    ],

    rules: [
      'Never present an asking price as a sold price.',
      'Never infer market value from one listing.',
      'Never say every block has identical approval status.',
      'Never say every block has identical utility availability.',
      'Never invent availability.',
      'Never invent payment plans.',
      'Never promise appreciation or ROI.',
      'When sources conflict, disclose the conflict and recommend verification.'
    ]
  },

  location: {
    confirmed_positioning: [
      'Main Multan Road Lahore',
      'approximately 3 km from Thokar Niaz Baig according to multiple area sources',
      'near Canal Road',
      'near M-2 / motorway access',
      'opposite / near DHA EME'
    ],

    surrounding_areas: [
      'DHA EME',
      'LDA Avenue',
      'Bahria Town Lahore',
      'Bahria Orchard',
      'Johar Town',
      'WAPDA Town',
      'Canal Road corridor',
      'Raiwind Road corridor',
      'Thokar Niaz Baig',
      'Lahore Ring Road corridor'
    ],

    access_logic: {
      strong_for: [
        'Multan Road commuters',
        'Thokar Niaz Baig access',
        'motorway users',
        'Canal Road access',
        'southern/eastern Lahore movement'
      ],

      do_not_claim: [
        'exact travel time at all hours',
        'traffic-free commute',
        'exact distance unless source/date is known'
      ]
    },

    realtor_answer:
      'Park View City has a strong Multan Road/Thokar location and useful access toward Canal Road and the motorway. The exact commute depends heavily on time of day and destination, so I would not promise a fixed travel time.'
  },

  surrounding_environment: {
    nearby_context: [
      'DHA EME',
      'LDA Avenue 1',
      'Bahria Town',
      'Bahria Orchard',
      'Johar Town',
      'Canal Road',
      'Raiwind Road',
      'Thokar Niaz Baig',
      'M-2 corridor'
    ],

    facilities_and_activity: [
      'schools',
      'commercial areas',
      'restaurants',
      'parks',
      'mosques',
      'community facilities',
      'healthcare references'
    ],

    mapped_points: [
      'The National School & College',
      'ParkView main office',
      'ParkView Plaza',
      'Topaz Block Park'
    ],

    realtor_rule:
      'When a customer asks what is around Park View City, answer by category and direction rather than inventing exact travel times.'
  },

  master_plan: {
    known_blocks: [
      'Jade',
      'Jade Extension',
      'Jasmine',
      'Sapphire',
      'Topaz',
      'Topaz Extension',
      'Rose',
      'Tulip',
      'Tulip Extension',
      'Tulip Overseas',
      'Crystal',
      'Crystal Extension',
      'Diamond',
      'Platinum',
      'Silver',
      'Pearl',
      'Overseas',
      'Executive',
      'Imperial',
      'Orchard',
      'Golf Estate',
      'Premium',
      'Royal',
      'Paradise',
      'Downtown',
      'Broadway',
      'Prestige'
    ],

    rule:
      'Do not reduce Park View City to Crystal/Diamond/Platinum only.'
  },

  approval_and_legal: {
    critical_warning:
      'Approval status is block-specific and must be verified for the exact property.',

    public_source_positioning: [
      'Public ParkView-related sources describe Jade, Jasmine and Sapphire as LDA approved.',
      'Some sources describe other blocks as being under RUDA approval.',
      'Public sources are not fully consistent on the exact count/status of approved blocks.',
      'Therefore the agent must never generalize approval status across the entire society.'
    ],

    customer_answer:
      'Approval status can differ by block, so before purchase I would verify the exact block, plot/house documentation and current authority status rather than relying only on the society name.'
  },

  utilities: {
    gas: {
      important:
        'Gas availability should be checked block-by-block and property-by-property.',
      public_information:
        'Public ParkView-related material states Sui gas availability in Jade, Jasmine and Sapphire, with a separate claim for 10-marla Topaz; other blocks may rely on LPG/local supply.',
      agent_rule:
        'Never tell a buyer that the entire society has Sui gas.'
    },

    electricity: {
      important:
        'Do not promise uninterrupted electricity.',
      community_signal:
        'Resident reports mention voltage fluctuations / brief changeover interruptions in some areas.',
      agent_rule:
        'Ask the buyer whether electricity reliability is a critical requirement and recommend checking the exact street with current residents.'
    },

    water: {
      rule:
        'Confirm current supply for the exact block/property rather than making a society-wide guarantee.'
    },

    sewerage: {
      rule:
        'Confirm development status of the exact street/block.'
    }
  },

  market: {

    five_marla_house_current_observation: {
      zameen_current_inventory: {
        total_park_view_results:
          'Current Zameen search shows a large 5-marla house inventory.',
        crystal:
          'approximately 51 listings shown',
        platinum:
          'approximately 47 listings shown',
        diamond:
          'approximately 34-35 listings shown'
      },

      current_asking_observations: {
        crystal:
          'roughly 1.6 crore to 2.35+ crore observed across current listings, with many around 1.8-2.25 crore',
        diamond:
          'roughly 1.65 crore to 2.2 crore observed across current listings',
        platinum:
          'roughly 1.6 crore to 2.3 crore observed across current listings'
      },

      warning:
        'These are advertised asking prices and not verified transaction prices.'
    },

    graana_observation: {
      five_marla_houses:
        'Listings observed across roughly 1.1 crore to 2.1 crore depending on age, block, construction and condition.',
      rule:
        'Older listings cannot be treated as current market value.'
    },

    price_factors: [
      'block',
      'street',
      'plot position',
      'corner',
      'park facing',
      'main road proximity',
      'house age',
      'construction quality',
      'architectural design',
      'finishing quality',
      'grey structure versus completed house',
      'possession/development status',
      'utility availability',
      'documentation',
      'seller urgency',
      'asking price',
      'negotiation room'
    ],

    valuation_method:
      'Compare multiple recent listings of genuinely similar properties and then inspect the property physically. Do not value a house from marla size alone.'
  },

  block_profiles: {

    Crystal: {
      market_signal:
        'Strong current 5-marla house/listing activity on Zameen.',
      positioning:
        'Established and actively traded residential option.',
      suitable_for: [
        'end users comparing ready houses',
        'buyers seeking active resale inventory',
        'buyers whose exact-street search produces good value'
      ],
      caution:
        'Do not call Crystal automatically the best block; current listing prices vary significantly.'
    },

    Diamond: {
      market_signal:
        'Strong current 5-marla house inventory and active listing activity.',
      positioning:
        'Established residential option with meaningful resale inventory.',
      suitable_for: [
        'end users',
        'buyers comparing value against Crystal/Platinum',
        'buyers who prioritize exact street and house quality'
      ],
      caution:
        'Do not describe it as universally superior without comparing the actual properties.'
    },

    Platinum: {
      market_signal:
        'Strong current 5-marla house inventory and active listing activity.',
      positioning:
        'Marketed as a premium residential block by multiple property sources.',
      suitable_for: [
        'end users seeking a more premium-feeling residential environment',
        'buyers comparing newer/better-finished houses',
        'buyers prioritizing lifestyle alongside resale'
      ],
      caution:
        'Premium marketing language is not proof of superior investment return.'
    },

    Jade: {
      regulatory_note:
        'Public sources describe Jade as LDA approved.',
      utility_note:
        'Public sources also describe Sui gas availability.',
      positioning:
        'Important established block to include when legal/utility certainty is a major buyer priority.'
    },

    Jasmine: {
      regulatory_note:
        'Public sources describe Jasmine as LDA approved.',
      utility_note:
        'Public sources also describe Sui gas availability.',
      positioning:
        'Important established option for buyers who prioritize documentation/utility considerations.'
    },

    Sapphire: {
      regulatory_note:
        'Public sources describe Sapphire as LDA approved.',
      utility_note:
        'Public sources also describe Sui gas availability.',
      positioning:
        'Should be considered when approval/utility considerations dominate the decision.'
    },

    extensions_and_newer_blocks: {
      rule:
        'Treat newer/extension blocks separately from older established blocks.',
      questions_to_ask: [
        'Is possession available?',
        'Is development complete on the exact street?',
        'Which utilities are operational?',
        'What is the current approval status?',
        'How many occupied houses are nearby?',
        'What is the resale liquidity?'
      ]
    }
  },

  buyer_profiles: {

    end_user: {
      priorities: [
        'family comfort',
        'school access',
        'daily commute',
        'utilities',
        'security',
        'street environment',
        'house construction',
        'neighbors',
        'parking'
      ],
      behavior:
        'Usually cares more about the actual house and street than speculative future appreciation.',
      realtor_strategy:
        'Show fewer, better-matched properties and arrange physical visits.'
    },

    investor: {
      priorities: [
        'entry price',
        'liquidity',
        'future demand',
        'development status',
        'approval status',
        'holding period',
        'exit demand'
      ],
      behavior:
        'Often compares multiple blocks and asks for expected appreciation.',
      realtor_strategy:
        'Discuss scenarios and risks; never guarantee ROI.'
    },

    overseas_buyer: {
      priorities: [
        'documentation',
        'remote verification',
        'developer credibility',
        'transfer process',
        'property management',
        'rental/resale liquidity'
      ],
      behavior:
        'Needs more documentation and video/site verification.',
      realtor_strategy:
        'Provide a verification checklist before asking for commitment.'
    },

    first_time_buyer: {
      priorities: [
        'total budget',
        'monthly affordability',
        'hidden charges',
        'utility reliability',
        'house condition'
      ],
      realtor_strategy:
        'Explain total acquisition cost, not only asking price.'
    }
  },

  investor_vs_end_user: {
    key_difference:
      'A block that is attractive for speculative appreciation is not automatically the best place for a family to live.',

    agent_questions: [
      'Are you buying to live there or hold for resale?',
      'How long do you expect to hold it?',
      'Do you need possession immediately?',
      'Would you rather buy a finished house or a plot?',
      'How important are utilities and schools?'
    ]
  },

  professional_realtor_behavior: {

    principles: [
      'Listen before recommending.',
      'Ask one useful question at a time.',
      'Never overwhelm the customer with ten options.',
      'Never manufacture urgency.',
      'Never invent availability.',
      'Never invent a price.',
      'Never promise appreciation.',
      'Never hide legal/approval uncertainty.',
      'Distinguish asking price from market/transaction evidence.',
      'Admit when live verification is unavailable.',
      'Recommend physical inspection.',
      'Explain trade-offs honestly.',
      'Protect the customer from bad documentation.',
      'Do not disparage competitors without evidence.',
      'Follow up without harassment.'
    ],

    sales_style:
      'Consultative, calm, evidence-led, respectful and confident without being pushy.',

    ideal_sequence: [
      'qualify',
      'understand purpose',
      'identify constraints',
      'shortlist',
      'explain trade-offs',
      'verify documentation',
      'arrange viewing',
      'compare',
      'negotiate',
      'close'
    ]
  },

  frequently_asked_questions: {

    'which block is better': {
      answer:
        'There is no single best block. For a 5-marla house I would compare Crystal, Diamond and Platinum first, then choose based on exact street, house condition, utilities, location within the block, asking price and whether you are buying for living or resale.'
    },

    'which block is better for living': {
      answer:
        'For living, I would compare the actual streets in Crystal, Diamond and Platinum rather than rank the blocks blindly. Family comfort depends heavily on street environment, house quality, nearby activity, utilities, parking and access.'
    },

    'which block is better for resale': {
      answer:
        'For resale, I would focus on liquidity and buyer demand for the exact property rather than assuming one block always wins. Current listing activity is strong in Crystal, Diamond and Platinum, but actual resale depends on price, location, house condition and documentation.'
    },

    'what about crystal': {
      answer:
        'Crystal is worth shortlisting, especially because there is substantial current 5-marla house inventory. But I would compare the actual street, construction quality and asking price before calling a Crystal house a good deal.'
    },

    'what is around park view city': {
      answer:
        'Park View City is positioned on Main Multan Road near Thokar Niaz Baig and opposite/near DHA EME, with access toward Canal Road and the M-2 corridor. Nearby residential and commercial areas include DHA EME, LDA Avenue, Bahria Town, Bahria Orchard and Johar Town.'
    },

    'is 2 crore enough for 5 marla': {
      answer:
        'It can be workable for a 5-marla house based on current advertised inventory, but the exact answer depends on block, construction, age, street and seller expectation. Current listings in Crystal, Diamond and Platinum show substantial overlap around this budget.'
    },

    'what is the price of a 5 marla house': {
      answer:
        'There is no single price. Current advertised listings vary materially by block and condition. I would first identify the block and whether you want brand-new, used or grey structure, then compare similar properties.'
    },

    'is park view city good for investment': {
      answer:
        'It can be considered, but investment quality depends on the exact block, approval status, development, entry price, liquidity and holding period. I would not guarantee appreciation.'
    },

    'is park view city good for living': {
      answer:
        'It can suit families who value a gated-community environment and access to Multan Road, Thokar and surrounding amenities. Before buying, inspect the exact street and verify utilities and the current lived-in environment.'
    },

    'does park view have gas': {
      answer:
        'Gas availability is not something I would generalize across the whole society. Public sources identify specific blocks with Sui gas, so the exact block and property should be verified.'
    },

    'is park view lda approved': {
      answer:
        'Approval should be checked at block/property level. Public sources identify Jade, Jasmine and Sapphire as LDA-approved and describe other areas in relation to RUDA approval, so I would verify the exact property documentation before purchase.'
    },

    'what should i check before buying': {
      answer:
        'Check title/transfer documents, exact block approval status, possession, utility connections, outstanding dues, seller identity, plot dimensions, construction quality, street location and comparable asking prices. For a house, inspect structure and finishing with a qualified professional.'
    }
  },

  negotiation: {
    principles: [
      'Ask why the seller is selling.',
      'Ask how long the property has been listed.',
      'Compare at least 3 similar properties.',
      'Separate seller asking price from buyer offer.',
      'Check whether dues/charges are included.',
      'Check possession and transfer status.',
      'Do not claim a discount exists without seller confirmation.'
    ]
  },

  site_visit_checklist: [
    'exact block',
    'street number',
    'plot number',
    'road width',
    'corner / park facing / main road',
    'house age',
    'construction quality',
    'water',
    'electricity',
    'gas',
    'sewerage',
    'drainage',
    'parking',
    'noise',
    'nearby commercial activity',
    'school access',
    'mosque access',
    'security',
    'mobile signal',
    'internet',
    'neighbor occupancy',
    'seller documents',
    'outstanding dues',
    'transfer status'
  ],

  response_rules: [
    'Answer the question first.',
    'Then give one useful qualification point.',
    'Keep WhatsApp answers concise.',
    'Use exact numbers only when the source supports them.',
    'Use ranges when the market is heterogeneous.',
    'Use words such as advertised, observed, reported or verified appropriately.',
    'If data is stale, say so.',
    'If data conflicts, say so.',
    'Never pretend live inventory is available unless the system actually has live inventory.',
    'Never pretend a property is available because a portal lists it.'
  ]
};

module.exports = PARK_VIEW_CITY_BRAIN;

module.exports = PARK_VIEW_CITY_BRAIN;
