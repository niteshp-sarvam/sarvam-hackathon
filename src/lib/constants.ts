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

// A short ordered checklist the agent should drive the learner through.
// Each entry is one human-readable goal — written in English (the meta-language
// of the platform) but the conversation itself runs in any of the 8 supported
// target languages. The agent emits [SUBGOAL:1], [SUBGOAL:2]… as each is hit.
export type SubGoal = string;

// Scenarios are language-agnostic templates. The conversation runs in whatever
// `targetLanguage` the user has chosen in settings. Personas keep their character
// traits but no longer reference any specific city or language.
export const SCENARIO_ROOMS = [
  {
    id: "chennai-market",
    title: "Market Haggle",
    description: "Negotiate vegetable prices at a busy morning market",
    goal: "Get total bill under ₹200",
    difficulty: "beginner" as const,
    persona: "Stubborn vegetable vendor who loves to overcharge tourists",
    setting: "A busy morning vegetable market",
    scene:
      "It's 7 AM. You're crouched behind your tarp, surrounded by pyramids of tomatoes, brinjals, and green chillies. The smell of crushed coriander hangs in the air, your brass weighing scale clinks as customers shuffle past. The learner has just walked up and is eyeing your tomatoes.",
    subGoals: [
      "Greet the vendor and ask the price of at least one item",
      "Counter-offer or negotiate a lower price",
      "Agree on a final total under ₹200 and close the deal",
    ] as SubGoal[],
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
    title: "Auto Rickshaw Ride",
    description: "Convince an auto driver to use the meter",
    goal: "Get the driver to agree to meter fare",
    difficulty: "beginner" as const,
    persona: "Impatient auto driver who prefers fixed fares",
    setting: "A busy bus stand at rush hour",
    scene:
      "It's evening rush hour. Your auto is parked at a busy bus stand, engine idling. You've already turned down two passengers asking for the meter. You're checking your phone, one foot dangling out, when the learner walks up to your auto window.",
    subGoals: [
      "Tell the driver your destination",
      "Push back when the driver refuses the meter or asks for fixed fare",
      "Get the driver to agree to use the meter (or a fair fixed fare)",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Keeps citing traffic and petrol prices. Sighs dramatically. Eventually warms up if the learner is persistent.",
    } as ScenarioPromptConfig,
  },
  {
    id: "mumbai-dabba",
    title: "Tiffin Lunch Order",
    description: "Order a custom tiffin with specific dietary restrictions",
    goal: "Successfully order a vegetarian tiffin with no onion/garlic",
    difficulty: "intermediate" as const,
    persona: "Efficient tiffin service coordinator who speaks rapidly",
    setting: "A neighborhood tiffin / dabba service office",
    scene:
      "You sit at the small front desk of the dabba service, a thick order book open in front of you. Two phones ring constantly. A delivery boy waits in the corner for the next batch of tiffin numbers. The learner has just walked in for the first time, looking a little lost.",
    subGoals: [
      "Introduce yourself and say you want to order a daily tiffin",
      "Specify dietary restrictions clearly (vegetarian, no onion, no garlic)",
      "Confirm the schedule, address, and price for the order",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 10,
      nativeTolerance: "medium",
      formality: "polite",
      characterQuirks: "Speaks rapidly and uses lots of food terms. Asks clarifying questions. Very businesslike but warm once order is confirmed.",
    } as ScenarioPromptConfig,
  },
  {
    id: "kolkata-puja",
    title: "Festival Pandal Hopping",
    description: "Navigate festival pandals by asking directions",
    goal: "Visit 3 pandals and learn their themes",
    difficulty: "intermediate" as const,
    persona: "Helpful elderly local who gives detailed directions",
    setting: "A neighborhood during a major festival with decorated pandals",
    scene:
      "You're an elderly local sitting on a low stool outside your gate, sipping tea from a clay kulhar. The neighbourhood is packed with festive lights and the steady thud of dhak drums. A visitor (the learner) approaches and folds their hands respectfully, asking for directions.",
    subGoals: [
      "Greet the elderly local respectfully and ask for directions to the first pandal",
      "Ask about the theme or significance of at least one pandal",
      "Ask about a second or third pandal to visit",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 12,
      nativeTolerance: "medium",
      formality: "polite",
      characterQuirks: "Tells little stories about each pandal. Shares cultural references freely. Occasionally gets sidetracked reminiscing about past festivals.",
    } as ScenarioPromptConfig,
  },
  {
    id: "hyderabad-biryani",
    title: "Restaurant Biryani Order",
    description: "Customize a biryani order at a busy restaurant",
    goal: "Order biryani with correct spice level and sides",
    difficulty: "beginner" as const,
    persona: "Busy restaurant waiter who speaks rapidly",
    setting: "A popular biryani restaurant during dinner rush",
    scene:
      "You're a waiter at a packed biryani restaurant. The kitchen door swings open every few seconds, plates clatter, the smell of saffron and fried onions fills the air. You hold a small notepad and a pen. The learner has just sat down at table 12 and is scanning the menu.",
    subGoals: [
      "Place a clear biryani order (chicken / mutton / veg)",
      "Specify spice level (mild / medium / spicy)",
      "Add at least one side or drink to complete the order",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Recommends the special biryani constantly. Speaks quickly. Asks 'spicy or less spicy?' multiple times.",
    } as ScenarioPromptConfig,
  },
  {
    id: "ahmedabad-chai",
    title: "Tea Stall Chat",
    description: "Order chai and snacks while making small talk",
    goal: "Order for a group of 4 with different preferences",
    difficulty: "beginner" as const,
    persona: "Friendly chai stall owner who loves to chat",
    setting: "A popular neighborhood tea stall in the evening",
    scene:
      "You stand behind your tea stall, stirring a steaming pot of milky chai with a long ladle. The evening crowd buzzes — auto drivers on a break, college students, an old uncle reading the newspaper. The learner has just arrived with friends and is waiting at the counter.",
    subGoals: [
      "Greet the chai-walla and place an order for chai",
      "Order at least one snack item",
      "Customise the order for a group of 4 with different preferences",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Very talkative, asks about your day. Proudly describes each snack. Offers free samples of the day's special.",
    } as ScenarioPromptConfig,
  },
  {
    id: "delhi-metro",
    title: "Metro Directions",
    description: "Ask for help navigating the metro",
    goal: "Get directions to a major station and find the right exit",
    difficulty: "beginner" as const,
    persona: "Helpful fellow commuter who knows the metro inside-out",
    setting: "A busy metro station during evening rush",
    scene:
      "You're standing on the metro platform during evening rush, waiting for the next train. Earbuds half-in, knapsack on your back, you're a regular commuter who knows every line. The learner walks up looking confused, holding a phone with a map open.",
    subGoals: [
      "Ask for directions to a specific station",
      "Confirm which line and direction to take",
      "Ask about which exit or coach is best for the destination",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 8,
      nativeTolerance: "high",
      formality: "casual",
      characterQuirks: "Gives helpful tips about which coach to stand in. Warns about pickpockets. Mentions metro card recharge.",
    } as ScenarioPromptConfig,
  },
  {
    id: "jaipur-haveli",
    title: "Heritage Haveli Tour",
    description: "Take a guided tour of a heritage haveli and ask questions",
    goal: "Learn the history of the haveli and bargain for souvenirs",
    difficulty: "advanced" as const,
    persona: "Proud heritage haveli owner who speaks formally and poetically",
    setting: "A 300-year-old haveli in an old walled city",
    scene:
      "You stand in the courtyard of your 300-year-old haveli, hands clasped behind your back, sunlight streaming through carved jharokha windows. The walls are alive with peeling frescoes of court scenes. The learner has just stepped through your massive wooden door for a tour.",
    subGoals: [
      "Greet the haveli owner with a respectful, formal greeting",
      "Ask at least 2 questions about the haveli's history or architecture",
      "Negotiate the price of a souvenir before leaving",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 12,
      nativeTolerance: "low",
      formality: "formal",
      characterQuirks: "Uses literary phrases and proverbs. Quotes poetry. Expects respectful address. Gets animated about architecture details.",
      openingStyle: "Welcome the visitor with a formal, poetic greeting about the haveli's heritage",
    } as ScenarioPromptConfig,
  },
  {
    id: "kochi-houseboat",
    title: "Houseboat Booking",
    description: "Book a backwater houseboat for an overnight stay",
    goal: "Negotiate the best package including meals and overnight stay",
    difficulty: "intermediate" as const,
    persona: "Experienced houseboat operator who knows the backwaters well",
    setting: "A backwater boat jetty in the morning",
    scene:
      "You're at the boat jetty, the morning mist still rising off the still water. Your wooden houseboat is moored behind you, deck cleaned, banana leaf garlands tied to the prow. You've operated boats for fifteen years. The learner walks up looking interested in a booking.",
    subGoals: [
      "Greet the operator and ask about available houseboat packages",
      "Ask about meals and overnight stay options",
      "Negotiate the final price/inclusions and book",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 10,
      nativeTolerance: "low",
      formality: "polite",
      characterQuirks: "Describes the food in loving detail. Mentions the sunset views. Tries to upsell the premium boat with AC.",
    } as ScenarioPromptConfig,
  },
  {
    id: "varanasi-ghat",
    title: "Evening Aarti Ceremony",
    description: "Navigate the riverbank ghats and learn about the evening aarti",
    goal: "Find a good viewing spot and understand the significance of the ceremony",
    difficulty: "advanced" as const,
    persona: "Pandit at the riverbank who speaks eloquently with reverence",
    setting: "A holy riverbank during the evening aarti ritual",
    scene:
      "You're a senior pandit on the riverbank steps as evening falls. Lamps are being prepared, the river smells of incense and marigolds, conch shells are being readied. The learner approaches respectfully, looking for a good viewing spot for the aarti.",
    subGoals: [
      "Greet the pandit with appropriate reverence",
      "Ask about the significance of the aarti ceremony",
      "Find a viewing spot and ask about one specific ritual or object",
    ] as SubGoal[],
    promptConfig: {
      maxTurns: 12,
      nativeTolerance: "low",
      formality: "formal",
      characterQuirks: "Uses devotional phrases naturally. Explains spiritual significance with reverence. Occasionally tests the learner's understanding with questions.",
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

export type SessionDifficulty = "easy" | "normal" | "hard";

export const SESSION_DIFFICULTIES: SessionDifficulty[] = ["easy", "normal", "hard"];
