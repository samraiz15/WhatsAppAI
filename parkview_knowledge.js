const brain = require('./parkview_brain');

function flatten(obj, prefix = '') {
  const out = [];

  if (!obj || typeof obj !== 'object') return out;

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out.push(`${path}: ${value}`);
    } else if (Array.isArray(value)) {
      out.push(`${path}: ${value.join(', ')}`);
    } else if (value && typeof value === 'object') {
      out.push(...flatten(value, path));
    }
  }

  return out;
}

const KNOWLEDGE_TEXT = flatten(brain).join('\n');

function getParkViewContext(message = "", maxChars = 5000) {
  const q = String(message || "").toLowerCase();
  const lines = KNOWLEDGE_TEXT.split("\n");

  const rules = [
    {
      keys:["price","budget","cost","crore","lakh","5 marla","10 marla","house price"],
      exact:[
        "market.five_marla_house_current_observation.current_asking_observations",
        "market.price_factors",
        "market.valuation_method",
        "additional_market_and_property_facts.current_asking_price_signal",
        "additional_market_and_property_facts.current_market_signal.current_5_marla_house_inventory"
      ]
    },
    {
      keys:["gas","sui gas"],
      exact:[
        "utilities.gas",
        "additional_market_and_property_facts.gas_precision"
      ]
    },
    {
      keys:["electricity","water","sewerage","drainage","utility","utilities"],
      exact:[
        "utilities",
        "additional_market_and_property_facts.gas_precision"
      ]
    },
    {
      keys:["approval","lda","ruda","legal","documentation","transfer","possession"],
      exact:[
        "approval_and_legal",
        "additional_market_and_property_facts.approval_precision",
        "additional_market_and_property_facts.property_status_terms"
      ]
    },
    {
      keys:["location","road","multan","thokar","dha","canal","motorway","ring road","nearby"],
      exact:[
        "identity.location",
        "location",
        "surrounding_environment",
        "additional_market_and_property_facts.location_and_internal_access"
      ]
    },
    {
      keys:["school","mosque","park","commercial","restaurant","hospital","healthcare","amenities"],
      exact:[
        "surrounding_environment.facilities_and_activity",
        "additional_market_and_property_facts.amenities"
      ]
    },
    {
      keys:["buy","buying","purchase","check","seller","inspection","visit","construction","condition"],
      exact:[
        "site_visit_checklist",
        "negotiation",
        "additional_market_and_property_facts.buyer_decision_data"
      ]
    },
    {
      keys:["investment","investor","appreciation","roi","liquidity","holding"],
      exact:[
        "buyer_profiles.investor",
        "investor_vs_end_user",
        "additional_market_and_property_facts.rental_market_signal",
        "additional_market_and_property_facts.buyer_decision_data"
      ]
    },
    {
      keys:["living","family","security","street","parking","neighbors"],
      exact:[
        "buyer_profiles.end_user",
        "site_visit_checklist",
        "additional_market_and_property_facts.amenities"
      ]
    }
  ];

  const matched=rules.filter(r=>r.keys.some(k=>q.includes(k)));

  if(!matched.length){
    return KNOWLEDGE_TEXT.slice(0,maxChars);
  }

  const selected=[];
  const seen=new Set();

  function addLine(line){
    const n=line.replace(/\\s+/g," ").trim().toLowerCase();
    if(seen.has(n)) return false;

    if(
      n.includes("source_policy.") ||
      n.includes("realtor_strategy") ||
      n.includes("suitable_for") ||
      n.includes("behavior:")
    ) return false;

    seen.add(n);
    selected.push(line);
    return selected.join("\n").length>=maxChars;
  }

  for(const rule of matched){
    for(const path of rule.exact){
      const prefix=path.toLowerCase()+":";
      const childPrefix=path.toLowerCase()+".";

      for(const line of lines){
        const lower=line.toLowerCase();

        if(lower.startsWith(prefix) || lower.startsWith(childPrefix)){
          if(addLine(line)) return selected.join("\n").slice(0,maxChars);
        }
      }
    }
  }

  return selected.join("\n").slice(0,maxChars);
}

module.exports = {
  getParkViewContext,
  KNOWLEDGE_TEXT
};
