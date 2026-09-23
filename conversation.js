const { getOrCreateLead, updateLeadInfo, addMessage, searchGroupMessages } = require('./db');
const { addMonitoredGroup, getMonitoredGroups, disableMonitoredGroup, setCommandState, getCommandState } = require('./groups');
const { findFAQ } = require('./agent');
const { routeParkViewQuestion } = require('./router');
const { askOllama } = require('./ollama');

function detectInterest(message) {
  const text = String(message || '').toLowerCase();

  if (/\b(?:plot|plots|land|parcel)\b/.test(text)) return 'Plot';
  if (/\b(?:house|home|villa|bungalow|farmhouse)\b/.test(text)) return 'House';
  if (/\b(?:apartment|apartments|flat|flats|penthouse)\b/.test(text)) return 'Apartment';
  if (/\b(?:office|offices)\b/.test(text)) return 'Office';
  if (/\b(?:shop|shops|showroom|showrooms|store|stores)\b/.test(text)) return 'Shop';
  if (/\b(?:building|buildings|plaza|plazas|tower|towers)\b/.test(text)) return 'Building';

  return null;
}

function detectBudget(message) {
  const match = message.match(
    /(?:budget\s*(?:is|of)?\s*)?([\d,.]+)\s*(crore|crores|corror|coror|crorr|cororr|cr|lakh|lakhs|lac)\b/i
  );

  return match ? `${match[1]} ${match[2]}` : null;
}

function parseBudgetNumeric(budget) {
  if (!budget) return null;

  const match = budget.match(
    /([\d,.]+)\s*(crore|crores|corror|coror|crorr|cororr|cr|lakh|lakhs|lac)\b/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(amount)) return null;

  const unit = match[2].toLowerCase();

  if (['crore', 'crores', 'corror', 'coror', 'crorr', 'cororr', 'cr'].includes(unit)) {
    return Math.round(amount * 10000000);
  }

  return Math.round(amount * 100000);
}

function detectTimeline(message) {
  const text = message.trim().toLowerCase();

  if (/\b(as\s+soon\s+as\s+possible|soon\s+as\s+possible|asap|soon)\b/i.test(text)) {
    return 'As soon as possible';
  }

  const numbers = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10'
  };

  const match = text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|week|weeks|month|months|year|years)\b/i);

  if (!match) return null;

  const value = numbers[match[1].toLowerCase()] || match[1];
  return `${value} ${match[2]}`;
}

function detectSearchBlock(message) {
  const text = normalizePropertyText(message);
  const blocks = [
    ["crystal extension", "crystal extension"],
    ["tulip extension", "tulip extension"],
    ["tulip overseas", "tulip overseas"],
    ["silver block", "silver"],
    ["platinum block", "platinum"],
    ["crystal block", "crystal"],
    ["pearl block", "pearl"],
    ["diamond block", "diamond"],
    ["platinum", "platinum"],
    ["crystal", "crystal"],
    ["silver", "silver"],
    ["tulip", "tulip"],
    ["diamond", "diamond"],
    ["pearl", "pearl"]
  ];
  for (const [alias, canonical] of blocks) {
    if (text.includes(normalizePropertyText(alias))) return canonical;
  }
  return null;
}

function extractMatchingPropertySection(message, searchBlock) {
  const raw = String(message || '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!raw || !searchBlock) {
    return raw;
  }

  const target = String(searchBlock).toLowerCase().trim();

  const escapeRegex = value =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const startRegex = new RegExp(
    '^\\s*[*_#•🔹\\-\\s]*' +
    escapeRegex(target) +
    '(?:\\s+block)?\\b.*$',
    'im'
  );

  const startMatch = raw.match(startRegex);

  if (!startMatch || startMatch.index === undefined) {
    return raw;
  }

  const startIndex = startMatch.index;

  const blockHeaderRegex =
    /^\s*[-*_#•🔹 ]*(?:crystal extension|tulip extension|tulip overseas|silver block|platinum block|crystal block|pearl block|diamond block|imperial block|overseas block|silver|platinum|crystal|tulip|diamond|pearl)\b.*$/im;

  const remaining =
    raw.slice(startIndex + startMatch[0].length);

  const nextMatch = remaining.match(blockHeaderRegex);

  const sectionEnd = nextMatch
    ? startIndex + startMatch[0].length + nextMatch.index
    : raw.length;

  let section = raw.slice(startIndex, sectionEnd).trim();

  const contactMatch = section.match(
    /\n\s*(?:📞|contact\s*:|call\s*:|whatsapp\s*:)/i
  );

  if (contactMatch && contactMatch.index !== undefined) {
    section = section.slice(0, contactMatch.index).trim();
  }

  return section;
}

function detectArea(message) {
  if (detectTimeline(message)) return null;

  const knownAreas = [
    "DHA Lahore",
    "Bahria Town",
    "Gulberg",
    "Johar Town",
    "Model Town",
    "Park View City",
    "ParkView City",
    "Park View",
    "Platinum",
    "Crystal",
    "Crystal Extension",
    "Silver",
    "Silver Block",
    "Tulip",
    "Tulip Extension",
    "Tulip Overseas",
    "Diamond"
  ];

  const text = String(message || "").toLowerCase();

  for (const area of knownAreas) {
    if (text.includes(area.toLowerCase())) {
      return area;
    }
  }

  const match = String(message || "").match(
    /\b(?:in|at|near)\s+([a-zA-Z][a-zA-Z\s-]{2,40})$/i
  );

  return match ? match[1].trim() : null;
}
function detectName(message) {
  const match = message.match(
    /^(?:my name is|i am|i'm|this is)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})$/i
  );

  return match ? match[1].trim() : null;
}

function detectPropertySize(message) {
  const match = String(message || '').match(
    /\b(3\.5|5|7|10|15|20)\s*marla\b|\b(1|2)\s*kanal\b/i
  );

  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

function getCommandMenu() {
  return `WhatsAppAI

Available commands:

1. LIST - Show commands
2. ADD GROUP - Add a WhatsApp group
3. GROUPS - Show monitored groups
4. SEARCH - Find property/deal
5. LEADS - Show matched leads
6. PARKVIEW - Park View information
7. STATUS - Agent status

You can also simply ask me normally.`;
}


function normalizePropertyText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(3\.5|5|7|10|15|20)\s*-?\s*m(?:arla)?\b/g, '$1 marla')
    .replace(/\b(1|2)\s*-?\s*k(?:anal)?\b/g, '$1 kanal')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSearchPropertyType(text) {
  const value = normalizePropertyText(text);

  // Explicit house/home/villa terminology must take priority.
  // Listing formats such as F.P+R.P can otherwise be mistaken for plots.
  if (/\b(?:house|home|villa|bungalow)\b/i.test(value)) {
    return "House";
  }

  // Explicit plot terminology
  if (
    /\b(?:plot|plots|land|parcel)\b/.test(value) ||
    /\bplot\s*#?\s*\d+\b/.test(value) ||
    /\bplot\s+no\.?\s*\d+\b/.test(value)
  ) {
    return 'Plot';
  }

  // Common plot-listing format:
  // 5M + F.P/R.P/H.P/T.F + possession/payment/offer terminology
  if (
    /\b(?:3\.5|5|7|10|15|20)\s*marla\b/.test(value) &&
    /\b(?:fp|f\.p|rp|r\.p|hp|h\.p|tf|t\.f|ndc|possession|paid|offer|required)\b/.test(value)
  ) {
    return 'Plot';
  }

  if (
    /\b(?:house|houses|home|homes|villa|villas|bungalow|bungalows|farmhouse)\b/.test(value)
  ) {
    return 'House';
  }

  if (
    /\b(?:apartment|apartments|flat|flats|penthouse)\b/.test(value)
  ) {
    return 'Apartment';
  }

  if (/\b(?:office|offices)\b/.test(value)) {
    return 'Office';
  }

  if (
    /\b(?:shop|shops|showroom|showrooms|store|stores)\b/.test(value)
  ) {
    return 'Shop';
  }

  if (
    /\b(?:building|buildings|plaza|plazas|tower|towers)\b/.test(value)
  ) {
    return 'Building';
  }

  return null;
}

function detectSearchSize(text) {
  const value = normalizePropertyText(text);

  const match = value.match(
    /\b(3\.5|5|7|10|15|20)\s*-?\s*(?:marla|m)\b/i
  );

  return match ? Number(match[1]) : null;
}

function detectSearchBudget(text) {
  const value = String(text || '').toLowerCase();

  const match = value.match(
    /([\d,.]+)\s*(crore|crores|corror|coror|crorr|cororr|cr|lakh|lakhs|lac)\b/i
  );

  if (!match) return null;

  const amount = Number(match[1].replace(/,/g, ''));

  if (!Number.isFinite(amount)) return null;

  const unit = match[2];

  if (/^(crore|crores|corror|coror|crorr|cororr|cr)$/.test(unit)) {
    return amount * 10000000;
  }

  return amount * 100000;
}


function detectImplicitListingBudget(text) {
  const value = String(text || '')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const match = value.match(
    /\b(?:3\.5|5|7|10|15|20)\s*-?\s*M(?:arla)?\b[\s\S]{0,120}?(?:F\.P(?:\+R\.P)?|H\.P(?:\s+Only)?|T\.F(?:\s+Only)?)[\s\S]{0,50}?\b(\d+(?:\.\d+)?)\b/i
  );

  if (!match) return null;

  const amount = Number(match[1]);

  return Number.isFinite(amount) ? amount * 100000 : null;
}

function propertyTypeMatches(searchType, listingText) {
  if (!searchType) return true;

  const type = detectSearchPropertyType(listingText);

  if (type === searchType) return true;

  return false;
}

function isUnderBudgetSearch(text) {
  return /\b(?:under|below|less\s+than|up\s+to|max(?:imum)?|within)\b/i.test(
    String(text || '')
  );
}

function scorePropertyMatch(query, listing) {
  const searchType = detectSearchPropertyType(query);
  const searchSize = detectSearchSize(query);
  const searchBudget = detectSearchBudget(query);
  const searchBlock = detectSearchBlock(query);
  const text = normalizePropertyText(listing.message);
  const listingBlock = searchBlock ? detectSearchBlock(text) : null;

  if (searchType && !propertyTypeMatches(searchType, text)) return -1;
  if (searchSize && detectSearchSize(text) !== searchSize) return -1;
  if (searchBlock && listingBlock !== searchBlock) return -1;

  if (searchBudget) {
    const listingBudget =
      detectSearchBudget(text) ??
      detectImplicitListingBudget(text);

    if (listingBudget === null || listingBudget > searchBudget) return -1;
  }

  let score = 0;
  if (searchType) score += 50;
  if (searchSize) score += 30;
  if (searchBlock) score += 40;

  if (searchBudget) {
    const listingBudget =
      detectSearchBudget(text) ??
      detectImplicitListingBudget(text);

    if (listingBudget !== null) {
      score += 20 * (listingBudget / searchBudget);
    }
  }

  return score;
}


function extractPropertyCandidates(message) {
  const raw = String(message || '')
    .replace(/\r\n/g, '\n')
    .replace(/\uFFFD/g, '')
    .trim();

  if (!raw) return [];

  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const candidates = [];
  let current = [];

  const numberedListingRegex =
    /^\s*(?:plot\s*)?#?\d{1,6}[.,:]?\s+/i;

  const propertyStartRegex =
    /\b(?:plot|plots|house|home|villa|bungalow|apartment|flat|shop|office|building|plaza|tower|land|parcel|portion)\b/i;

  const propertySizeRegex =
    /\b(?:3\.5|5|7|10|15|20)\s*-?\s*(?:marla|m)\b|\b(?:1|2)\s*-?\s*(?:kanal|k)\b/i;

  const blockRegex =
    /\b(?:crystal extension|tulip extension|tulip overseas|silver block|platinum block|crystal block|pearl block|diamond block|imperial block|overseas block|silver|platinum|crystal|tulip|diamond|pearl)\b/i;

  const listingMarkerRegex =
    /\b(?:for sale|for rent|available|demand|offer required|transfer free|full paid|half paid|all dues clear|possession)\b/i;

  const flush = () => {
    if (!current.length) return;

    const text = current.join('\n').trim();

    if (text) {
      candidates.push({
        text,
        lines: [...current]
      });
    }

    current = [];
  };

  for (const line of lines) {
    const startsNumberedListing =
      numberedListingRegex.test(line) &&
      (
        propertySizeRegex.test(line) ||
        propertyStartRegex.test(line) ||
        blockRegex.test(line)
      );

    const startsPropertyListing =
      current.length > 0 &&
      (
        startsNumberedListing ||
        (
          propertySizeRegex.test(line) &&
          (
            blockRegex.test(line) ||
            listingMarkerRegex.test(line) ||
            propertyStartRegex.test(line)
          )
        )
      );

    if (startsPropertyListing) {
      flush();
    }

    current.push(line);
  }

  flush();

  return candidates;
}

function rankPropertySearchResults(query, results) {
  const searchBudget = detectSearchBudget(query);
  const searchBlock = detectSearchBlock(query);
  const searchType = detectSearchPropertyType(query);
  const searchSize = detectSearchSize(query);

  const candidates = [];

  for (const row of results) {
    const sections = extractPropertyCandidates(row.message);

    const usableSections = sections.length
      ? sections
      : [{
          text: row.message,
          lines: String(row.message || '').split('\n')
        }];

    for (const section of usableSections) {
      candidates.push({
        ...row,
        message: section.text,
        originalMessage: row.message,
        propertySection: section.text
      });
    }
  }

  return candidates
    .map((row, originalIndex) => {
      const text = normalizePropertyText(row.message);
      const listingBlock = detectSearchBlock(text);
      const listingSize = detectSearchSize(text);

      const match_score = scorePropertyMatch(query, {
        ...row,
        message: text
      });

      if (searchBlock && listingBlock !== searchBlock) {
        return null;
      }

      if (searchSize && listingSize !== searchSize) {
        return null;
      }

      if (
        searchType &&
        !propertyTypeMatches(searchType, text)
      ) {
        return null;
      }

      const listingBudget =
        detectSearchBudget(text) ??
        detectImplicitListingBudget(text);

      if (
        searchBudget !== null &&
        (
          listingBudget === null ||
          listingBudget > searchBudget
        )
      ) {
        return null;
      }

      if (match_score <= 0) {
        return null;
      }

      return {
        ...row,
        match_score,
        _originalIndex: originalIndex
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (isUnderBudgetSearch(query)) {
        const aBudget =
          detectSearchBudget(a.message) ??
          detectImplicitListingBudget(a.message);

        const bBudget =
          detectSearchBudget(b.message) ??
          detectImplicitListingBudget(b.message);

        if (
          aBudget !== null &&
          bBudget !== null &&
          aBudget !== bBudget
        ) {
          return aBudget - bBudget;
        }
      }

      return (
        b.match_score - a.match_score ||
        a._originalIndex - b._originalIndex
      );
    })
    .map(row => {
      const clean = { ...row };
      delete clean._originalIndex;
      return clean;
    });
}


async function processMessage(phone, message, options = {}) {
  const isOwner = options.isOwner === true;
  const ownerPhone = options.ownerPhone || phone;
  const text = String(message || '').trim();

  const ownerCommandMap = {
    '0': 'open connection',
    '1': 'list',
    '2': 'add group',
    '3': 'groups',
    '4': 'search',
    '5': 'leads',
    '6': 'parkview',
    '7': 'status'
  };

  const ownerCommandText =
    isOwner && ownerCommandMap[text]
      ? ownerCommandMap[text]
      : text;

  const ownerCommand =
    /^(open connection|list|add group|remove group|groups|search|leads|parkview|status)$/i.test(ownerCommandText);

  const commandState = getCommandState(phone);

  const pendingGroupAdd =
    commandState === "pending_group_add";

  const pendingGroupRemove =
    commandState === "pending_group_remove";

  const pendingSearch =
    commandState === "pending_search";

  const hasSearchCriteria =
    detectSearchPropertyType(text) !== null ||
    detectSearchSize(text) !== null ||
    detectSearchBudget(text) !== null;

  const implicitSearch =
    isOwner && hasSearchCriteria;

  if (
    isOwner &&
    !ownerCommand &&
    !pendingGroupAdd &&
    !pendingGroupRemove &&
    !pendingSearch
    && !(
      detectSearchPropertyType(text) ||
      detectSearchSize(text) ||
      detectSearchBudget(text)
    ) &&
    !implicitSearch
  ) {
    console.log('OWNER NON-COMMAND IGNORED:', text);
    return {
      reply: null,
      lead: null
    };
  }

  if (!isOwner) {
    getOrCreateLead(phone);
  }
  if (isOwner && /^open connection$/i.test(ownerCommandText)) {
    setCommandState(phone, null);

    const reply = "Opening WhatsApp connection...";

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead: null,
      action: 'open_connection'
    };
  }

  // OWNER STATUS MUST NEVER ENTER THE LEAD FLOW
  if (isOwner && /^status$/i.test(ownerCommandText)) {
    setCommandState(phone, null);

    const groups = getMonitoredGroups(phone);

    const reply =
      `WhatsAppAI Status\n\n` +
      `Owner mode: ACTIVE\n` +
      `Monitored groups: ${groups.length}\n` +
      `Lead mode: DISABLED for owner`;

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead: null
    };
  }

  if (pendingSearch || implicitSearch) {
    const searchText = text;

    if (!searchText) {
      const reply =
        "Please send the property, deal, area, plot size, or budget you want me to search for.";

      addMessage(phone, "outgoing", reply);

      return {
        reply,
        lead: null
      };
    }

    const searchCandidates =
      searchGroupMessages(ownerPhone, '', 500);

    const results =
      rankPropertySearchResults(searchText, searchCandidates)
        .slice(0, 10);

    setCommandState(phone, null);

    let reply;

    if (!results.length) {
      reply =
        `No suitable property/deal matches found for "${searchText}".`;
    } else {
      const searchBlock = detectSearchBlock(searchText);

      const resultLines = results.map((row, index) => {
        const sender =
          row.sender_name ||
          "Unknown sender";

        const senderPhone =
          String(row.sender_phone || "")
            .split("@")[0]
            .split(":")[0]
            .trim();

        const messageText =
          String(row.message || "").trim();

        const propertyDetails =
          extractMatchingPropertySection(
            messageText,
            searchBlock
          );

        const shortened =
          propertyDetails.length > 700
            ? propertyDetails.slice(0, 700) + "..."
            : propertyDetails;

        return (
          `${index + 1}️⃣ ${sender}\n` +
          (senderPhone ? "PHONE: " + senderPhone + "\n" : "") +
          shortened
        );
      });

      reply =
        `🔎 Found ${results.length} matching properties/deals\n\n` +
        resultLines.join("\n\n");
    }

    addMessage(phone, "incoming", message);
    addMessage(phone, "outgoing", reply);

    return {
      reply,
      lead: null
    };
  }

  if (getCommandState(phone) === "pending_group_remove") {
    const groupName = text;

    if (!groupName) {
      const reply = "Please send the exact WhatsApp group name to remove.";
      addMessage(phone, "outgoing", reply);

      return {
        reply,
        lead: null
      };
    }

    if (/^(list|add group|remove group|groups|search|leads|parkview|status)$/i.test(groupName)) {
      setCommandState(phone, null);
      return {
        reply: null,
        lead: null
      };
    }

    const result = disableMonitoredGroup(phone, groupName);
    setCommandState(phone, null);

    const reply = result.changes
      ? `Group removed: ${groupName}`
      : `Group not found: ${groupName}`;

    addMessage(phone, "incoming", message);
    addMessage(phone, "outgoing", reply);

    return {
      reply,
      lead: null
    };
  }

  if (getCommandState(phone) === "pending_group_add") {
    const groupName = text;

    if (/^(list|add group|remove group|groups|search|leads|parkview|status)$/i.test(groupName)) {
      setCommandState(phone, null);
    } else {
      if (!groupName) {
        const reply = "Please send the WhatsApp group name.";
        addMessage(phone, "outgoing", reply);
        return { reply, lead: null };
      }

      const group = addMonitoredGroup(phone, groupName);
      setCommandState(phone, null);

      const reply = `Group registered: ${group.group_name}`;

      addMessage(phone, "incoming", message);
      addMessage(phone, "outgoing", reply);

      return {
        reply,
        lead: null
      };
    }
  }

  if (/^add group$/i.test(ownerCommandText)) {
    const reply = "Send me the exact WhatsApp group name you want me to monitor.";

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    setCommandState(phone, "pending_group_add");

    return {
      reply,
      lead: null
    };
  }

  if (/^remove group$/i.test(ownerCommandText)) {
    const reply = "Send me the exact WhatsApp group name you want me to remove.";

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    setCommandState(phone, "pending_group_remove");

    return {
      reply,
      lead: null
    };
  }

  if (/^groups$/i.test(ownerCommandText)) {
    const groups = getMonitoredGroups(phone);

    const reply = groups.length
      ? "Monitored WhatsApp Groups\n\n" +
        groups.map((group, i) =>
          `${i + 1}. ${group.group_name}${group.group_jid ? " ✓ linked" : " — waiting for first message"}`
        ).join("\n")
      : "No monitored WhatsApp groups yet.";

    addMessage(phone, "incoming", message);
    addMessage(phone, "outgoing", reply);

    return {
      reply,
      lead: null
    };
  }

  if (/^list$/i.test(ownerCommandText)) {
    const reply = getCommandMenu();

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead: null
    };
  }


  if (isOwner && /^search$/i.test(ownerCommandText)) {
    setCommandState(phone, "pending_search");

    const reply =
      "Send me the property/deal details you want to search for.\n\n" +
      "Example: 5 marla Park View house under 2 crore";

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead: null
    };
  }

  if (isOwner && /^leads$/i.test(ownerCommandText)) {
    setCommandState(phone, null);

    const reply =
      "Lead search is ready. Send the property type, area, budget or other requirement you want to match.";

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead: null
    };
  }

  if (isOwner && /^parkview$/i.test(ownerCommandText)) {
    setCommandState(phone, null);

    const routed = await routeParkViewQuestion("Park View City", null);

    if (routed && routed.answer) {
      const reply = routed.answer;

      addMessage(phone, 'incoming', message);
      addMessage(phone, 'outgoing', reply);

      return {
        reply,
        source: routed.source,
        lead: null
      };
    }

    const fallback =
      "What would you like to know about Park View City?";

    addMessage(phone, 'incoming', message);
    addMessage(phone, 'outgoing', fallback);

    return {
      reply: fallback,
      lead: null
    };
  }

  if (isOwner && ownerCommand) {
    console.log('OWNER COMMAND UNHANDLED:', text);
    return {
      reply: null,
      lead: null
    };
  }

  const info = {
    name: detectName(message),
    interest: detectInterest(message),
    budget: detectBudget(message),
    budget_numeric: parseBudgetNumeric(detectBudget(message)),
    area: detectArea(message),
    timeline: detectTimeline(message),
    property_size: detectPropertySize(message),
    notes: null
  };

  updateLeadInfo(phone, info);

  addMessage(phone, 'incoming', message);

  const faq = findFAQ(message);

  if (faq) {
    addMessage(phone, 'outgoing', faq);
    return {
      reply: faq,
      lead: getOrCreateLead(phone)
    };
  }

  const lead = getOrCreateLead(phone);

  if (/park\s*view(?:\s*city)?/i.test(String(message || '')) ||
      /\b(?:amenities|amenity|facilities|facility|park|mosque|school|schools|commercial|location|located|payment plan|installments?|prices?|availability|available|blocks?)\b/i.test(String(message || ''))) {
    const routed = await routeParkViewQuestion(message, lead);

    if (routed && routed.answer) {
      const parkViewReply = routed.answer;

      addMessage(phone, 'outgoing', parkViewReply);

      return {
        reply: parkViewReply,
        source: routed.source,
        lead
      };
    }
  }

  if (lead.name && lead.interest && lead.budget && lead.area && lead.timeline) {
    const reply =
      `Perfect, ${lead.name}. I've noted your ${lead.property_size ? lead.property_size + ' ' : ''}` +
      `${lead.interest} requirement in ${lead.area} with a ${lead.budget} budget and ` +
      `${lead.timeline} timeline.`;

    addMessage(phone, 'outgoing', reply);

    return {
      reply,
      lead
    };
  }

  const questions = {
    interest: 'What type of property are you looking for?',
    budget: 'What is your approximate budget?',
    area: 'Which area are you interested in?',
    timeline: 'When are you planning to buy or invest?',
    name: 'May I know your name?'
  };

  for (const field of ['interest', 'budget', 'area', 'timeline', 'name']) {
    if (!lead[field]) {
      const reply = questions[field];

      addMessage(phone, 'outgoing', reply);

      return {
        reply,
        lead
      };
    }
  }

  let reply;

  try {
    reply = await askOllama(
      `You are the customer assistant for ${require('./agent').config.business.name}.
Tone: ${require('./agent').config.business.tone}.

Customer message:
${message}

Customer lead information:
${JSON.stringify(lead)}

Reply naturally in 1-2 short sentences. Do not invent property listings, prices,
availability, locations, or business policies.`
    );
  } catch {
    reply =
      `Thanks ${lead.name}. I have your requirements and we'll help you with the next steps.`;
  }

  addMessage(phone, 'outgoing', reply);

  return {
    reply,
    lead
  };
}

module.exports = {
  detectInterest,
  processMessage,
  detectArea,
  detectBudget,
  detectTimeline,
  detectPropertySize,
  parseBudgetNumeric,
  normalizePropertyText,
  detectSearchPropertyType,
  detectSearchBlock,
  detectSearchSize,
  detectSearchBudget,
  propertyTypeMatches,
  scorePropertyMatch,
  rankPropertySearchResults
};
