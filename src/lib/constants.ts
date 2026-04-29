export const SUPPORTED_LANGUAGES = [
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", script: "Devanagari", speakers: "528M" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", script: "Tamil", speakers: "75M" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", script: "Telugu", speakers: "83M" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada", speakers: "44M" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", script: "Bengali", speakers: "97M" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", script: "Devanagari", speakers: "83M" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", script: "Malayalam", speakers: "35M" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", script: "Gujarati", speakers: "55M" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const IDENTITY_LEVELS = [
  { level: 1, name: "Newcomer", minXp: 0 },
  { level: 2, name: "Neighbor", minXp: 500 },
  { level: 3, name: "Local", minXp: 2000 },
  { level: 4, name: "Native", minXp: 5000 },
] as const;

export interface ScenarioPromptConfig {
  maxTurns: number;
  nativeTolerance: "high" | "medium" | "low";
  formality: "casual" | "polite" | "formal";
  characterQuirks?: string;
  openingStyle?: string;
}

export const SCENARIO_ROOMS = [
  {
    id: "chennai-market",
    title: "Chennai Market Haggle",
    language: "ta" as LanguageCode,
    description: "Negotiate vegetable prices at a busy Chennai market",
    goal: "Get total bill under ₹200",
    difficulty: "beginner" as const,
    persona: "Stubborn vegetable vendor who loves to overcharge tourists",
    setting: "T. Nagar Ranganathan Street morning market",
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Throws in random vegetables you didn't ask for. Uses exaggerated prices first. Occasionally compliments the learner to soften them up.",
      openingStyle: "Shout out your best deals to attract the customer",
    } as ScenarioPromptConfig,
  },
  {
    id: "bengaluru-auto",
    title: "Bengaluru Auto Rickshaw",
    language: "kn" as LanguageCode,
    description: "Convince an auto driver to use the meter",
    goal: "Get the driver to agree to meter fare",
    difficulty: "beginner" as const,
    persona: "Impatient auto driver who prefers fixed fares",
    setting: "Majestic bus stand, rush hour",
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Keeps citing traffic and petrol prices. Sighs dramatically. Eventually warms up if the learner is persistent.",
    } as ScenarioPromptConfig,
  },
  {
    id: "mumbai-dabba",
    title: "Mumbai Dabba Service",
    language: "mr" as LanguageCode,
    description: "Order a custom tiffin with specific dietary restrictions",
    goal: "Successfully order a vegetarian dabba with no onion/garlic",
    difficulty: "intermediate" as const,
    persona: "Efficient dabba service coordinator who speaks fast Marathi",
    setting: "Local dabba service office in Dadar",
    promptConfig: {
      maxTurns: 10,
      nativeTolerance: "medium",
      formality: "polite",
      characterQuirks: "Speaks rapidly and uses lots of Marathi food terms. Asks clarifying questions. Very businesslike but warm once order is confirmed.",
    } as ScenarioPromptConfig,
  },
  {
    id: "kolkata-puja",
    title: "Kolkata Durga Puja",
    language: "bn" as LanguageCode,
    description: "Navigate pandal hopping by asking directions in Bengali",
    goal: "Visit 3 pandals and learn their themes",
    difficulty: "intermediate" as const,
    persona: "Helpful elderly local who gives detailed directions",
    setting: "South Kolkata during Durga Puja festivities",
    promptConfig: {
      maxTurns: 12,
      nativeTolerance: "medium",
      formality: "polite",
      characterQuirks: "Tells little stories about each pandal. Uses Bengali cultural references freely. Occasionally gets sidetracked reminiscing about past Pujas.",
    } as ScenarioPromptConfig,
  },
  {
    id: "hyderabad-biryani",
    title: "Hyderabad Biryani Order",
    language: "te" as LanguageCode,
    description: "Customize a biryani order at a busy restaurant",
    goal: "Order biryani with correct spice level and sides in Telugu",
    difficulty: "beginner" as const,
    persona: "Busy restaurant waiter who speaks rapid Telugu",
    setting: "Paradise Restaurant, Secunderabad",
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Recommends the special biryani constantly. Speaks quickly. Asks 'spicy or less spicy?' multiple times.",
    } as ScenarioPromptConfig,
  },
  {
    id: "ahmedabad-chai",
    title: "Ahmedabad Chai Stall",
    language: "gu" as LanguageCode,
    description: "Order chai and snacks while making small talk",
    goal: "Order for a group of 4 with different preferences",
    difficulty: "beginner" as const,
    persona: "Friendly chaiwala who loves to chat",
    setting: "Famous chai stall near Law Garden",
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Very talkative, asks about your day. Proudly describes each snack. Offers free samples of the day's special.",
    } as ScenarioPromptConfig,
  },
  {
    id: "delhi-metro",
    title: "Delhi Metro Directions",
    language: "hi" as LanguageCode,
    description: "Ask for help navigating the Delhi Metro in Hindi",
    goal: "Get directions from Rajiv Chowk to Chandni Chowk and find the right exit",
    difficulty: "beginner" as const,
    persona: "Helpful fellow commuter who knows the metro inside-out",
    setting: "Rajiv Chowk Metro station during evening rush",
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Gives helpful tips about which coach to stand in. Warns about pickpockets. Mentions metro card recharge.",
    } as ScenarioPromptConfig,
  },
  {
    id: "jaipur-haveli",
    title: "Jaipur Heritage Walk",
    language: "hi" as LanguageCode,
    description: "Take a guided tour of a Jaipur haveli and ask questions in Hindi",
    goal: "Learn the history of the haveli and bargain for souvenirs",
    difficulty: "advanced" as const,
    persona: "Proud haveli owner who speaks formal, literary Hindi",
    setting: "A 300-year-old haveli in the walled city of Jaipur",
    promptConfig: {
      maxTurns: 12,
      nativeTolerance: "low",
      formality: "formal",
      characterQuirks: "Uses Urdu-Hindi literary phrases. Quotes poetry. Expects respectful address. Gets animated about architecture details.",
      openingStyle: "Welcome the visitor with a formal, poetic greeting about the haveli's heritage",
    } as ScenarioPromptConfig,
  },
  {
    id: "kochi-houseboat",
    title: "Kerala Houseboat Booking",
    language: "ml" as LanguageCode,
    description: "Book a backwater houseboat in Alleppey speaking Malayalam",
    goal: "Negotiate the best package including meals and overnight stay",
    difficulty: "intermediate" as const,
    persona: "Experienced houseboat operator who only speaks Malayalam",
    setting: "Alleppey backwater jetty, morning",
    promptConfig: {
      maxTurns: 10,
      nativeTolerance: "low",
      formality: "polite",
      characterQuirks: "Describes the food in loving detail. Mentions the sunset views. Tries to upsell the premium boat with AC.",
    } as ScenarioPromptConfig,
  },
  {
    id: "varanasi-ghat",
    title: "Varanasi Evening Aarti",
    language: "hi" as LanguageCode,
    description: "Navigate the ghats and learn about the Ganga Aarti ritual in Hindi",
    goal: "Find a good viewing spot and understand the significance of the ceremony",
    difficulty: "advanced" as const,
    persona: "Pandit at Dashashwamedh Ghat who speaks eloquent Hindi with Sanskrit terms",
    setting: "Dashashwamedh Ghat during evening Ganga Aarti",
    promptConfig: {
      maxTurns: 12,
      nativeTolerance: "low",
      formality: "formal",
      characterQuirks: "Uses Sanskrit shlokas naturally. Explains spiritual significance with reverence. Occasionally tests the learner's understanding with questions.",
      openingStyle: "Begin with a spiritual greeting appropriate for the sacred setting",
    } as ScenarioPromptConfig,
  },
] as const;

export const GREETING_SUGGESTIONS: Record<string, { phrase: string; meaning: string }[]> = {
  hi: [
    { phrase: "Namaste", meaning: "Hello" },
    { phrase: "Kaise ho?", meaning: "How are you?" },
    { phrase: "Haan ji", meaning: "Yes" },
  ],
  ta: [
    { phrase: "Vanakkam", meaning: "Hello" },
    { phrase: "Eppadi irukkeenga?", meaning: "How are you?" },
    { phrase: "Sari", meaning: "Okay" },
  ],
  te: [
    { phrase: "Namaskaram", meaning: "Hello" },
    { phrase: "Ela unnaru?", meaning: "How are you?" },
    { phrase: "Avunu", meaning: "Yes" },
  ],
  kn: [
    { phrase: "Namaskara", meaning: "Hello" },
    { phrase: "Hege iddira?", meaning: "How are you?" },
    { phrase: "Howdu", meaning: "Yes" },
  ],
  bn: [
    { phrase: "Nomoshkar", meaning: "Hello" },
    { phrase: "Kemon acho?", meaning: "How are you?" },
    { phrase: "Hyan", meaning: "Yes" },
  ],
  mr: [
    { phrase: "Namaskar", meaning: "Hello" },
    { phrase: "Kasa aahat?", meaning: "How are you?" },
    { phrase: "Ho", meaning: "Yes" },
  ],
  ml: [
    { phrase: "Namaskaram", meaning: "Hello" },
    { phrase: "Sukhamano?", meaning: "How are you?" },
    { phrase: "Athe", meaning: "Yes" },
  ],
  gu: [
    { phrase: "Namaste", meaning: "Hello" },
    { phrase: "Kem cho?", meaning: "How are you?" },
    { phrase: "Ha", meaning: "Yes" },
  ],
};

export const EAVESDROP_CONTEXTS = [
  "family",
  "work",
  "street",
  "market",
  "festival",
  "food",
  "transport",
  "comedy",
] as const;

export const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
