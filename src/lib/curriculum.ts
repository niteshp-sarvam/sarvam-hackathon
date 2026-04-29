import type { LanguageCode } from "./constants";
import type { FSRSCard } from "./fsrs";

export interface VocabSeed {
  word: string;
  translation: string;
  category: FSRSCard["category"];
  /** Native script form (Devanagari, Tamil, etc). When omitted the UI fetches
   *  it lazily via the transliterate API and caches the result. */
  nativeText?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: "vocab" | "listen" | "speak" | "scenario";
  xpReward: number;
  durationMin: number;
  linkedScenarioId?: string;
  vocabSeeds?: VocabSeed[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  lessons: Lesson[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "path" | "streak" | "mastery" | "scenario" | "xp";
  check: (ctx: MilestoneContext) => boolean;
}

export interface MilestoneContext {
  completedLessons: string[];
  completedUnits: string[];
  streak: number;
  totalXp: number;
  gardenCards: FSRSCard[];
  scenarioStars: Record<string, number>;
  totalScenariosCompleted: number;
}

export type LessonStatus = "locked" | "available" | "started" | "completed";

export interface LessonProgress {
  status: LessonStatus;
  completedAt?: string;
  xpEarned?: number;
}

const VOCAB_BANK: Record<string, Record<string, VocabSeed[]>> = {
  ta: {
    greetings: [
      { word: "vanakkam", translation: "hello / greeting", category: "vocabulary" },
      { word: "nandri", translation: "thank you", category: "vocabulary" },
      { word: "eppadi irukeenga", translation: "how are you", category: "grammar" },
      { word: "seri", translation: "okay / alright", category: "vocabulary" },
      { word: "poytu varein", translation: "I'll go and come back", category: "grammar" },
    ],
    market: [
      { word: "enna vilai", translation: "what is the price", category: "vocabulary" },
      { word: "konjam", translation: "a little", category: "vocabulary" },
      { word: "romba", translation: "very much", category: "vocabulary" },
      { word: "kammi pannunga", translation: "reduce the price", category: "grammar" },
      { word: "enakku vendaam", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "enga", translation: "where", category: "vocabulary" },
      { word: "valadu", translation: "right", category: "vocabulary" },
      { word: "idadu", translation: "left", category: "vocabulary" },
      { word: "nera", translation: "straight", category: "vocabulary" },
      { word: "evvalavu dhooram", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "saapadu", translation: "food / meal", category: "vocabulary" },
      { word: "thanni", translation: "water", category: "vocabulary" },
      { word: "kaaram", translation: "spicy", category: "vocabulary" },
      { word: "saaptu aachchu", translation: "done eating", category: "grammar" },
      { word: "oru plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "amma", translation: "mother", category: "vocabulary" },
      { word: "appa", translation: "father", category: "vocabulary" },
      { word: "anna", translation: "elder brother", category: "vocabulary" },
      { word: "akka", translation: "elder sister", category: "vocabulary" },
      { word: "nanbaa", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "kovil", translation: "temple", category: "vocabulary" },
      { word: "pongal", translation: "harvest festival", category: "vocabulary" },
      { word: "kolam", translation: "floor art / rangoli", category: "vocabulary" },
      { word: "bharatanatyam", translation: "classical dance", category: "vocabulary" },
      { word: "thiruvizha", translation: "festival celebration", category: "vocabulary" },
    ],
  },
  hi: {
    greetings: [
      { word: "namaste", nativeText: "नमस्ते", translation: "hello / greeting", category: "vocabulary" },
      { word: "dhanyavaad", nativeText: "धन्यवाद", translation: "thank you", category: "vocabulary" },
      { word: "aap kaise hain", nativeText: "आप कैसे हैं", translation: "how are you", category: "grammar" },
      { word: "theek hai", nativeText: "ठीक है", translation: "okay / alright", category: "vocabulary" },
      { word: "phir milenge", nativeText: "फिर मिलेंगे", translation: "see you again", category: "grammar" },
    ],
    market: [
      { word: "kitna hai", nativeText: "कितना है", translation: "how much is it", category: "vocabulary" },
      { word: "thoda", nativeText: "थोड़ा", translation: "a little", category: "vocabulary" },
      { word: "bahut", nativeText: "बहुत", translation: "very much", category: "vocabulary" },
      { word: "daam kam karo", nativeText: "दाम कम करो", translation: "reduce the price", category: "grammar" },
      { word: "mujhe nahi chahiye", nativeText: "मुझे नहीं चाहिए", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "kidhar", nativeText: "किधर", translation: "where", category: "vocabulary" },
      { word: "daayein", nativeText: "दाएं", translation: "right", category: "vocabulary" },
      { word: "baayein", nativeText: "बाएं", translation: "left", category: "vocabulary" },
      { word: "seedha", nativeText: "सीधा", translation: "straight", category: "vocabulary" },
      { word: "kitni door", nativeText: "कितनी दूर", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "khaana", nativeText: "खाना", translation: "food / meal", category: "vocabulary" },
      { word: "paani", nativeText: "पानी", translation: "water", category: "vocabulary" },
      { word: "teekha", nativeText: "तीखा", translation: "spicy", category: "vocabulary" },
      { word: "kha liya", nativeText: "खा लिया", translation: "done eating", category: "grammar" },
      { word: "ek plate", nativeText: "एक प्लेट", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "maa", nativeText: "माँ", translation: "mother", category: "vocabulary" },
      { word: "pitaji", nativeText: "पिताजी", translation: "father", category: "vocabulary" },
      { word: "bhaiya", nativeText: "भैया", translation: "elder brother", category: "vocabulary" },
      { word: "didi", nativeText: "दीदी", translation: "elder sister", category: "vocabulary" },
      { word: "dost", nativeText: "दोस्त", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "mandir", nativeText: "मंदिर", translation: "temple", category: "vocabulary" },
      { word: "diwali", nativeText: "दिवाली", translation: "festival of lights", category: "vocabulary" },
      { word: "rangoli", nativeText: "रंगोली", translation: "floor art", category: "vocabulary" },
      { word: "mehendi", nativeText: "मेहंदी", translation: "henna art", category: "vocabulary" },
      { word: "tyohaar", nativeText: "त्योहार", translation: "festival", category: "vocabulary" },
    ],
  },
  kn: {
    greetings: [
      { word: "namaskara", translation: "hello / greeting", category: "vocabulary" },
      { word: "dhanyavaadagalu", translation: "thank you", category: "vocabulary" },
      { word: "hēgiddīra", translation: "how are you", category: "grammar" },
      { word: "sari", translation: "okay / alright", category: "vocabulary" },
      { word: "hōgi baruttēne", translation: "I'll go and come back", category: "grammar" },
    ],
    market: [
      { word: "ēnu bele", translation: "what is the price", category: "vocabulary" },
      { word: "svalpa", translation: "a little", category: "vocabulary" },
      { word: "thumba", translation: "very much", category: "vocabulary" },
      { word: "bele kammi māḍi", translation: "reduce the price", category: "grammar" },
      { word: "nanage bēḍa", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "elli", translation: "where", category: "vocabulary" },
      { word: "balakke", translation: "right", category: "vocabulary" },
      { word: "edakke", translation: "left", category: "vocabulary" },
      { word: "nēra", translation: "straight", category: "vocabulary" },
      { word: "ēṣṭu dūra", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "ūṭa", translation: "food / meal", category: "vocabulary" },
      { word: "nīru", translation: "water", category: "vocabulary" },
      { word: "khāra", translation: "spicy", category: "vocabulary" },
      { word: "ūṭa āytu", translation: "done eating", category: "grammar" },
      { word: "ondu plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "amma", translation: "mother", category: "vocabulary" },
      { word: "appa", translation: "father", category: "vocabulary" },
      { word: "anna", translation: "elder brother", category: "vocabulary" },
      { word: "akka", translation: "elder sister", category: "vocabulary" },
      { word: "geleya", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "dēvālaya", translation: "temple", category: "vocabulary" },
      { word: "dasara", translation: "Dasara festival", category: "vocabulary" },
      { word: "rangōli", translation: "floor art", category: "vocabulary" },
      { word: "yakṣagāna", translation: "folk theatre", category: "vocabulary" },
      { word: "habba", translation: "festival", category: "vocabulary" },
    ],
  },
  te: {
    greetings: [
      { word: "namaskaram", translation: "hello / greeting", category: "vocabulary" },
      { word: "dhanyavaadaalu", translation: "thank you", category: "vocabulary" },
      { word: "meeru ela unnaru", translation: "how are you", category: "grammar" },
      { word: "sare", translation: "okay / alright", category: "vocabulary" },
      { word: "velli vastanu", translation: "I'll go and come back", category: "grammar" },
    ],
    market: [
      { word: "entha dhara", translation: "what is the price", category: "vocabulary" },
      { word: "konchem", translation: "a little", category: "vocabulary" },
      { word: "chaala", translation: "very much", category: "vocabulary" },
      { word: "thagginchandhi", translation: "reduce the price", category: "grammar" },
      { word: "naaku vaddu", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "ekkada", translation: "where", category: "vocabulary" },
      { word: "kudi vaipuku", translation: "right", category: "vocabulary" },
      { word: "edama vaipuku", translation: "left", category: "vocabulary" },
      { word: "thinnaga", translation: "straight", category: "vocabulary" },
      { word: "entha dhooram", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "bhojanam", translation: "food / meal", category: "vocabulary" },
      { word: "neellu", translation: "water", category: "vocabulary" },
      { word: "karam", translation: "spicy", category: "vocabulary" },
      { word: "tinnaanu", translation: "done eating", category: "grammar" },
      { word: "oka plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "amma", translation: "mother", category: "vocabulary" },
      { word: "naanna", translation: "father", category: "vocabulary" },
      { word: "anna", translation: "elder brother", category: "vocabulary" },
      { word: "akka", translation: "elder sister", category: "vocabulary" },
      { word: "snehithudu", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "gudi", translation: "temple", category: "vocabulary" },
      { word: "sankranthi", translation: "harvest festival", category: "vocabulary" },
      { word: "muggu", translation: "floor art / rangoli", category: "vocabulary" },
      { word: "kuchipudi", translation: "classical dance", category: "vocabulary" },
      { word: "panduga", translation: "festival", category: "vocabulary" },
    ],
  },
  bn: {
    greetings: [
      { word: "nomoshkar", translation: "hello / greeting", category: "vocabulary" },
      { word: "dhonnobad", translation: "thank you", category: "vocabulary" },
      { word: "kemon achhen", translation: "how are you", category: "grammar" },
      { word: "thik achhe", translation: "okay / alright", category: "vocabulary" },
      { word: "aashi", translation: "I'll come back", category: "grammar" },
    ],
    market: [
      { word: "koto dam", translation: "what is the price", category: "vocabulary" },
      { word: "ektu", translation: "a little", category: "vocabulary" },
      { word: "onek", translation: "very much", category: "vocabulary" },
      { word: "dam komao", translation: "reduce the price", category: "grammar" },
      { word: "amar lagbe na", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "kothay", translation: "where", category: "vocabulary" },
      { word: "dan dike", translation: "right", category: "vocabulary" },
      { word: "bam dike", translation: "left", category: "vocabulary" },
      { word: "soja", translation: "straight", category: "vocabulary" },
      { word: "koto dur", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "khabar", translation: "food / meal", category: "vocabulary" },
      { word: "jol", translation: "water", category: "vocabulary" },
      { word: "jhal", translation: "spicy", category: "vocabulary" },
      { word: "kheye niyechi", translation: "done eating", category: "grammar" },
      { word: "ek plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "maa", translation: "mother", category: "vocabulary" },
      { word: "baba", translation: "father", category: "vocabulary" },
      { word: "dada", translation: "elder brother", category: "vocabulary" },
      { word: "didi", translation: "elder sister", category: "vocabulary" },
      { word: "bondhu", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "mondir", translation: "temple", category: "vocabulary" },
      { word: "durga pujo", translation: "Durga Puja festival", category: "vocabulary" },
      { word: "alpona", translation: "floor art", category: "vocabulary" },
      { word: "rabindra sangeet", translation: "Tagore songs", category: "vocabulary" },
      { word: "utsob", translation: "festival", category: "vocabulary" },
    ],
  },
  mr: {
    greetings: [
      { word: "namaskar", translation: "hello / greeting", category: "vocabulary" },
      { word: "dhanyavaad", translation: "thank you", category: "vocabulary" },
      { word: "kasa aahat", translation: "how are you", category: "grammar" },
      { word: "theek aahe", translation: "okay / alright", category: "vocabulary" },
      { word: "yeto", translation: "I'll come back", category: "grammar" },
    ],
    market: [
      { word: "kay bhaav aahe", translation: "what is the price", category: "vocabulary" },
      { word: "thoda", translation: "a little", category: "vocabulary" },
      { word: "khoop", translation: "very much", category: "vocabulary" },
      { word: "kami kara", translation: "reduce the price", category: "grammar" },
      { word: "mala nako", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "kuthe", translation: "where", category: "vocabulary" },
      { word: "ujvikade", translation: "right", category: "vocabulary" },
      { word: "davikade", translation: "left", category: "vocabulary" },
      { word: "saral", translation: "straight", category: "vocabulary" },
      { word: "kiti laamb", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "jevaan", translation: "food / meal", category: "vocabulary" },
      { word: "paani", translation: "water", category: "vocabulary" },
      { word: "tikhat", translation: "spicy", category: "vocabulary" },
      { word: "jevla", translation: "done eating", category: "grammar" },
      { word: "ek plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "aai", translation: "mother", category: "vocabulary" },
      { word: "baba", translation: "father", category: "vocabulary" },
      { word: "dada", translation: "elder brother", category: "vocabulary" },
      { word: "tai", translation: "elder sister", category: "vocabulary" },
      { word: "mitra", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "mandir", translation: "temple", category: "vocabulary" },
      { word: "ganpati", translation: "Ganesh festival", category: "vocabulary" },
      { word: "rangoli", translation: "floor art", category: "vocabulary" },
      { word: "lavani", translation: "folk dance", category: "vocabulary" },
      { word: "saan", translation: "festival / celebration", category: "vocabulary" },
    ],
  },
  ml: {
    greetings: [
      { word: "namaskaram", translation: "hello / greeting", category: "vocabulary" },
      { word: "nanni", translation: "thank you", category: "vocabulary" },
      { word: "sugham aano", translation: "how are you", category: "grammar" },
      { word: "shari", translation: "okay / alright", category: "vocabulary" },
      { word: "poyi varaam", translation: "I'll go and come back", category: "grammar" },
    ],
    market: [
      { word: "entha vila", translation: "what is the price", category: "vocabulary" },
      { word: "konjam", translation: "a little", category: "vocabulary" },
      { word: "valare", translation: "very much", category: "vocabulary" },
      { word: "vila kurakku", translation: "reduce the price", category: "grammar" },
      { word: "enikku venda", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "evide", translation: "where", category: "vocabulary" },
      { word: "valathu", translation: "right", category: "vocabulary" },
      { word: "idathu", translation: "left", category: "vocabulary" },
      { word: "nere", translation: "straight", category: "vocabulary" },
      { word: "ethra dhooram", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "bhakshanam", translation: "food / meal", category: "vocabulary" },
      { word: "vellam", translation: "water", category: "vocabulary" },
      { word: "erivulla", translation: "spicy", category: "vocabulary" },
      { word: "kazhicchu", translation: "done eating", category: "grammar" },
      { word: "oru plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "amma", translation: "mother", category: "vocabulary" },
      { word: "achan", translation: "father", category: "vocabulary" },
      { word: "chettan", translation: "elder brother", category: "vocabulary" },
      { word: "chechi", translation: "elder sister", category: "vocabulary" },
      { word: "kootukaran", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "kshetram", translation: "temple", category: "vocabulary" },
      { word: "onam", translation: "harvest festival", category: "vocabulary" },
      { word: "pookkalam", translation: "flower rangoli", category: "vocabulary" },
      { word: "kathakali", translation: "classical dance-drama", category: "vocabulary" },
      { word: "ulsavam", translation: "festival", category: "vocabulary" },
    ],
  },
  gu: {
    greetings: [
      { word: "kem cho", translation: "hello / how are you", category: "vocabulary" },
      { word: "aabhaar", translation: "thank you", category: "vocabulary" },
      { word: "majama", translation: "I'm fine", category: "grammar" },
      { word: "bahu saaru", translation: "very good", category: "vocabulary" },
      { word: "aavjo", translation: "goodbye / see you", category: "grammar" },
    ],
    market: [
      { word: "ketla nu", translation: "how much is it", category: "vocabulary" },
      { word: "thoduk", translation: "a little", category: "vocabulary" },
      { word: "ghanu", translation: "very much", category: "vocabulary" },
      { word: "bhaav ochi karo", translation: "reduce the price", category: "grammar" },
      { word: "mane nathi joitu", translation: "I don't need it", category: "grammar" },
    ],
    directions: [
      { word: "kya", translation: "where", category: "vocabulary" },
      { word: "jamne", translation: "right", category: "vocabulary" },
      { word: "daabbe", translation: "left", category: "vocabulary" },
      { word: "seedhu", translation: "straight", category: "vocabulary" },
      { word: "ketlu dur", translation: "how far", category: "grammar" },
    ],
    food: [
      { word: "jaman", translation: "food / meal", category: "vocabulary" },
      { word: "paani", translation: "water", category: "vocabulary" },
      { word: "tikhu", translation: "spicy", category: "vocabulary" },
      { word: "jami lidhu", translation: "done eating", category: "grammar" },
      { word: "ek plate", translation: "one plate", category: "vocabulary" },
    ],
    people: [
      { word: "ba", translation: "mother", category: "vocabulary" },
      { word: "bapu", translation: "father", category: "vocabulary" },
      { word: "bhai", translation: "elder brother", category: "vocabulary" },
      { word: "ben", translation: "elder sister", category: "vocabulary" },
      { word: "dost", translation: "friend", category: "vocabulary" },
    ],
    culture: [
      { word: "mandir", translation: "temple", category: "vocabulary" },
      { word: "navratri", translation: "nine nights festival", category: "vocabulary" },
      { word: "rangoli", translation: "floor art", category: "vocabulary" },
      { word: "garba", translation: "traditional dance", category: "vocabulary" },
      { word: "teehar", translation: "festival", category: "vocabulary" },
    ],
  },
};

function getVocab(lang: string, topic: string): VocabSeed[] {
  return VOCAB_BANK[lang]?.[topic] ?? [];
}

function buildUnits(lang: LanguageCode): Unit[] {
  const scenarioMap: Record<LanguageCode, string[]> = {
    ta: ["chennai-market"],
    kn: ["bengaluru-auto"],
    mr: ["mumbai-dabba"],
    bn: ["kolkata-puja"],
    te: ["hyderabad-biryani"],
    gu: ["ahmedabad-chai"],
    hi: ["delhi-metro", "jaipur-haveli", "varanasi-ghat"],
    ml: ["kochi-houseboat"],
  };
  const scenarios = scenarioMap[lang] ?? [];

  return [
    {
      id: `${lang}-u1`,
      title: "Sounds & Greetings",
      description: "Master basic sounds, greetings, and polite expressions",
      icon: "chat",
      difficulty: "beginner",
      lessons: [
        {
          id: `${lang}-u1-l1`,
          title: "Hello & Goodbye",
          description: "Learn the essential greetings used every day",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "greetings").slice(0, 3),
        },
        {
          id: `${lang}-u1-l2`,
          title: "Listen to Greetings",
          description: "Recognize greetings in natural conversation",
          type: "listen",
          xpReward: 10,
          durationMin: 4,
          vocabSeeds: getVocab(lang, "greetings"),
        },
        {
          id: `${lang}-u1-l3`,
          title: "Say It Right",
          description: "Practice pronouncing greetings clearly",
          type: "speak",
          xpReward: 15,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "greetings").slice(0, 3),
        },
        {
          id: `${lang}-u1-l4`,
          title: "Polite Phrases",
          description: "Thank you, please, and other courtesies",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "greetings").slice(3),
        },
      ],
    },
    {
      id: `${lang}-u2`,
      title: "Market & Numbers",
      description: "Navigate shops, bargain, and handle money",
      icon: "invoice",
      difficulty: "beginner",
      lessons: [
        {
          id: `${lang}-u2-l1`,
          title: "Shopping Basics",
          description: "Essential words for buying and selling",
          type: "vocab",
          xpReward: 15,
          durationMin: 4,
          vocabSeeds: getVocab(lang, "market").slice(0, 2),
        },
        {
          id: `${lang}-u2-l2`,
          title: "How Much?",
          description: "Ask and understand prices",
          type: "listen",
          xpReward: 10,
          durationMin: 4,
          vocabSeeds: getVocab(lang, "market"),
        },
        {
          id: `${lang}-u2-l3`,
          title: "Bargaining Basics",
          description: "Learn to negotiate politely",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "market").slice(2),
        },
        {
          id: `${lang}-u2-l4`,
          title: "Market Practice",
          description: "Shadow a market conversation",
          type: "speak",
          xpReward: 20,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "market").slice(0, 3),
        },
        ...(scenarios[0]
          ? [
              {
                id: `${lang}-u2-l5`,
                title: "Market Challenge",
                description: "Put your skills to the test in a real scenario",
                type: "scenario" as const,
                xpReward: 30,
                durationMin: 8,
                linkedScenarioId: scenarios[0],
              },
            ]
          : []),
      ],
    },
    {
      id: `${lang}-u3`,
      title: "Directions & Transport",
      description: "Ask for directions and navigate public transport",
      icon: "shuffle",
      difficulty: "beginner",
      lessons: [
        {
          id: `${lang}-u3-l1`,
          title: "Left, Right, Straight",
          description: "Learn directional words",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "directions").slice(0, 4),
        },
        {
          id: `${lang}-u3-l2`,
          title: "Where Is...?",
          description: "Ask for locations and understand responses",
          type: "listen",
          xpReward: 10,
          durationMin: 4,
          vocabSeeds: getVocab(lang, "directions"),
        },
        {
          id: `${lang}-u3-l3`,
          title: "Auto & Bus Talk",
          description: "Phrases for getting around by auto or bus",
          type: "speak",
          xpReward: 15,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "directions").slice(4),
        },
        {
          id: `${lang}-u3-l4`,
          title: "Navigation Shadow",
          description: "Shadow someone asking for directions",
          type: "speak",
          xpReward: 20,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "directions").slice(0, 3),
        },
      ],
    },
    {
      id: `${lang}-u4`,
      title: "Food & Ordering",
      description: "Order food, express preferences, and handle restaurants",
      icon: "gift",
      difficulty: "intermediate",
      lessons: [
        {
          id: `${lang}-u4-l1`,
          title: "Food Vocabulary",
          description: "Common food items and flavors",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "food").slice(0, 3),
        },
        {
          id: `${lang}-u4-l2`,
          title: "Restaurant Phrases",
          description: "Ordering, asking for the bill, and special requests",
          type: "vocab",
          xpReward: 15,
          durationMin: 4,
          vocabSeeds: getVocab(lang, "food").slice(3),
        },
        {
          id: `${lang}-u4-l3`,
          title: "Eavesdrop at a Restaurant",
          description: "Listen to a real restaurant conversation",
          type: "listen",
          xpReward: 10,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "food"),
        },
        {
          id: `${lang}-u4-l4`,
          title: "Order Like a Local",
          description: "Practice ordering with correct pronunciation",
          type: "speak",
          xpReward: 20,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "food").slice(0, 3),
        },
      ],
    },
    {
      id: `${lang}-u5`,
      title: "People & Relationships",
      description: "Talk about family, friends, and introduce yourself",
      icon: "chat-multiple",
      difficulty: "intermediate",
      lessons: [
        {
          id: `${lang}-u5-l1`,
          title: "Family Words",
          description: "Learn words for family members",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "people").slice(0, 3),
        },
        {
          id: `${lang}-u5-l2`,
          title: "Introductions",
          description: "Introduce yourself and your family",
          type: "speak",
          xpReward: 15,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "people").slice(3),
        },
        {
          id: `${lang}-u5-l3`,
          title: "Family Conversations",
          description: "Listen to a family discussion",
          type: "listen",
          xpReward: 10,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "people"),
        },
        {
          id: `${lang}-u5-l4`,
          title: "Small Talk Practice",
          description: "Have a casual conversation about people",
          type: "speak",
          xpReward: 20,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "people").slice(0, 3),
        },
      ],
    },
    {
      id: `${lang}-u6`,
      title: "Culture & Festivals",
      description: "Understand local culture, festivals, and traditions",
      icon: "news",
      difficulty: "intermediate",
      lessons: [
        {
          id: `${lang}-u6-l1`,
          title: "Festival Vocabulary",
          description: "Words for local celebrations and traditions",
          type: "vocab",
          xpReward: 15,
          durationMin: 3,
          vocabSeeds: getVocab(lang, "culture").slice(0, 3),
        },
        {
          id: `${lang}-u6-l2`,
          title: "Cultural Phrases",
          description: "Expressions used during festivals",
          type: "vocab",
          xpReward: 15,
          durationMin: 4,
          vocabSeeds: getVocab(lang, "culture").slice(3),
        },
        {
          id: `${lang}-u6-l3`,
          title: "Festival Sounds",
          description: "Listen to conversations during a festival",
          type: "listen",
          xpReward: 10,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "culture"),
        },
        {
          id: `${lang}-u6-l4`,
          title: "Celebrate Together",
          description: "Practice festival greetings and conversations",
          type: "speak",
          xpReward: 20,
          durationMin: 5,
          vocabSeeds: getVocab(lang, "culture").slice(0, 3),
        },
      ],
    },
  ];
}

const curriculumCache = new Map<LanguageCode, Unit[]>();

export function getCurriculum(lang: LanguageCode): Unit[] {
  if (!curriculumCache.has(lang)) {
    curriculumCache.set(lang, buildUnits(lang));
  }
  return curriculumCache.get(lang)!;
}

export function getLessonById(
  lang: LanguageCode,
  lessonId: string
): { unit: Unit; lesson: Lesson } | null {
  for (const unit of getCurriculum(lang)) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return null;
}

export function getUnitProgress(
  unit: Unit,
  lessonProgress: Record<string, LessonProgress>
): { completed: number; total: number; percent: number } {
  const total = unit.lessons.length;
  const completed = unit.lessons.filter(
    (l) => lessonProgress[l.id]?.status === "completed"
  ).length;
  return { completed, total, percent: total > 0 ? (completed / total) * 100 : 0 };
}

export function isUnitCompleted(
  unit: Unit,
  lessonProgress: Record<string, LessonProgress>
): boolean {
  return unit.lessons.every((l) => lessonProgress[l.id]?.status === "completed");
}

export function computeLessonStatuses(
  lang: LanguageCode,
  lessonProgress: Record<string, LessonProgress>
): Record<string, LessonStatus> {
  const result: Record<string, LessonStatus> = {};
  const units = getCurriculum(lang);

  for (let ui = 0; ui < units.length; ui++) {
    const unit = units[ui];
    const prevUnitDone =
      ui === 0 || isUnitCompleted(units[ui - 1], lessonProgress);

    for (let li = 0; li < unit.lessons.length; li++) {
      const lesson = unit.lessons[li];
      const saved = lessonProgress[lesson.id];

      if (saved?.status === "completed") {
        result[lesson.id] = "completed";
      } else if (saved?.status === "started") {
        result[lesson.id] = "started";
      } else {
        const prevLessonDone =
          li === 0
            ? prevUnitDone
            : result[unit.lessons[li - 1].id] === "completed";
        result[lesson.id] = prevLessonDone ? "available" : "locked";
      }
    }
  }
  return result;
}

export const MILESTONES: Milestone[] = [
  {
    id: "first-lesson",
    title: "First Steps",
    description: "Complete your first lesson",
    icon: "play",
    category: "path",
    check: (ctx) => ctx.completedLessons.length >= 1,
  },
  {
    id: "unit-1-done",
    title: "Greetings Master",
    description: "Complete the Sounds & Greetings unit",
    icon: "chat",
    category: "path",
    check: (ctx) => ctx.completedUnits.length >= 1,
  },
  {
    id: "unit-3-done",
    title: "Navigator",
    description: "Complete 3 units",
    icon: "shuffle",
    category: "path",
    check: (ctx) => ctx.completedUnits.length >= 3,
  },
  {
    id: "all-units-done",
    title: "Curriculum Complete",
    description: "Complete all 6 units",
    icon: "briefcase",
    category: "path",
    check: (ctx) => ctx.completedUnits.length >= 6,
  },
  {
    id: "streak-3",
    title: "Getting Consistent",
    description: "Maintain a 3-day streak",
    icon: "activity",
    category: "streak",
    check: (ctx) => ctx.streak >= 3,
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "ai-magic",
    category: "streak",
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: "streak-30",
    title: "Monthly Legend",
    description: "Maintain a 30-day streak",
    icon: "favourite",
    category: "streak",
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: "garden-10",
    title: "Growing Garden",
    description: "Have 10 words in your garden",
    icon: "plant",
    category: "mastery",
    check: (ctx) => ctx.gardenCards.length >= 10,
  },
  {
    id: "garden-blooming-5",
    title: "Green Thumb",
    description: "Get 5 words to blooming stage",
    icon: "like",
    category: "mastery",
    check: (ctx) =>
      ctx.gardenCards.filter((c) => c.gardenStage === "blooming" || c.gardenStage === "harvested").length >= 5,
  },
  {
    id: "garden-harvested-10",
    title: "Master Gardener",
    description: "Harvest 10 words completely",
    icon: "success",
    category: "mastery",
    check: (ctx) =>
      ctx.gardenCards.filter((c) => c.gardenStage === "harvested").length >= 10,
  },
  {
    id: "first-scenario",
    title: "Scene Starter",
    description: "Complete your first scenario room",
    icon: "chat",
    category: "scenario",
    check: (ctx) => ctx.totalScenariosCompleted >= 1,
  },
  {
    id: "scenario-3-stars",
    title: "Perfect Performance",
    description: "Get 3 stars in any scenario",
    icon: "favourite",
    category: "scenario",
    check: (ctx) => Object.values(ctx.scenarioStars).some((s) => s >= 3),
  },
  {
    id: "xp-100",
    title: "100 XP Club",
    description: "Earn 100 total XP",
    icon: "ai-magic",
    category: "xp",
    check: (ctx) => ctx.totalXp >= 100,
  },
  {
    id: "xp-500",
    title: "Dedicated Learner",
    description: "Earn 500 total XP",
    icon: "arrow-up",
    category: "xp",
    check: (ctx) => ctx.totalXp >= 500,
  },
  {
    id: "xp-2000",
    title: "Language Hero",
    description: "Earn 2000 total XP",
    icon: "brain",
    category: "xp",
    check: (ctx) => ctx.totalXp >= 2000,
  },
];
