import json
import random
from pathlib import Path

# ================= CONFIG =================
LEVEL = "academic"     # emotional | reasoning | academic
TOTAL_QUESTIONS = 2000

# ================= PATHS =================
BASE_DIR = Path(__file__).resolve().parent.parent
SEEDS_DIR = BASE_DIR / "data/seeds"
RULES_DIR = BASE_DIR / "data/rules"
OUTPUT_DIR = BASE_DIR / "data/generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ================= ACADEMIC SLOT POOLS =================

PHENOMENA = [
    "reflection of light",
    "refraction of light",
    "electric current flow",
    "magnetic effect of current",
    "thermal expansion",
    "pressure in liquids"
]

CONDITIONS = [
    "temperature increases",
    "pressure increases",
    "voltage is increased",
    "resistance decreases",
    "load is applied",
    "environment changes"
]

SYSTEMS = [
    "simple circuits",
    "human body",
    "plants",
    "electrical devices",
    "machines",
    "natural environment"
]

QUANTITIES = [
    "speed",
    "current",
    "voltage",
    "energy",
    "power",
    "pressure"
]

CHEMICAL_PROCESSES = [
    "rusting",
    "combustion",
    "neutralization",
    "photosynthesis",
    "respiration"
]

BIOLOGICAL_PROCESSES = [
    "digestion",
    "respiration",
    "circulation",
    "excretion",
    "growth"
]

BODY_SYSTEMS = [
    "digestive system",
    "respiratory system",
    "circulatory system",
    "nervous system"
]

MATH_CONCEPTS = [
    "linear equations",
    "quadratic equations",
    "probability",
    "trigonometry",
    "statistics"
]

CS_CONCEPTS = [
    "algorithms",
    "loops",
    "conditions",
    "variables",
    "flowcharts"
]

CS_STRUCTURES = [
    "for loop",
    "while loop",
    "if statement",
    "nested loop"
]

TECHNOLOGIES = [
    "internet",
    "mobile phones",
    "computers",
    "artificial intelligence",
    "automation"
]

COMPONENTS = [
    "resistor",
    "capacitor",
    "battery",
    "switch",
    "LED"
]

ENVIRONMENTAL_FACTORS = [
    "air pollution",
    "water pollution",
    "deforestation",
    "global warming",
    "plastic waste"
]

SUBJECTS = [
    "physics",
    "chemistry",
    "biology",
    "mathematics",
    "computer science"
]

ACADEMIC_VARIATIONS = [
    "in daily life",
    "in school experiments",
    "in real-life situations",
    "during exams",
    "in practical applications"
]

# ================= OPTIONS =================

ACADEMIC_OPTIONS = [
    {
        "text": "Recall the basic concept",
        "effects": {"conceptual": 2}
    },
    {
        "text": "Apply the formula or rule",
        "effects": {"application": 2}
    },
    {
        "text": "Think using a real-life example",
        "effects": {"understanding": 2}
    },
    {
        "text": "Memorize without understanding",
        "effects": {"conceptual": -1}
    }
]

# ================= LOAD FILES =================

seeds = json.load(open(SEEDS_DIR / "academic_seeds.json", encoding="utf-8"))
rules = json.load(open(RULES_DIR / "academic_rules.json", encoding="utf-8"))

# ================= HELPERS =================

def assign_tags(question):
    q = question.lower()
    tags = {}
    for tag, keywords in rules.items():
        tags[tag] = "high" if any(k in q for k in keywords) else "low"
    return tags

def difficulty_level(question):
    if "why" in question.lower() or "how" in question.lower():
        return "medium"
    return "easy"

# ================= GENERATION =================

dataset = []
seen = set()
qid = 1
attempts = 0
MAX_ATTEMPTS = TOTAL_QUESTIONS * 50

while len(dataset) < TOTAL_QUESTIONS and attempts < MAX_ATTEMPTS:
    attempts += 1
    seed = random.choice(seeds)
    template = random.choice(seed["templates"])

    question = template.format(
        phenomenon=random.choice(PHENOMENA),
        condition=random.choice(CONDITIONS),
        system=random.choice(SYSTEMS),
        quantity=random.choice(QUANTITIES),
        chemical_process=random.choice(CHEMICAL_PROCESSES),
        biological_process=random.choice(BIOLOGICAL_PROCESSES),
        body_system=random.choice(BODY_SYSTEMS),
        math_concept=random.choice(MATH_CONCEPTS),
        cs_concept=random.choice(CS_CONCEPTS),
        cs_structure=random.choice(CS_STRUCTURES),
        technology=random.choice(TECHNOLOGIES),
        component=random.choice(COMPONENTS),
        environmental_factor=random.choice(ENVIRONMENTAL_FACTORS),
        subject=random.choice(SUBJECTS),
        concept=random.choice(
            MATH_CONCEPTS + CS_CONCEPTS + BIOLOGICAL_PROCESSES
        )
    )

    question = question + " " + random.choice(ACADEMIC_VARIATIONS)

    if question in seen:
        continue

    seen.add(question)

    dataset.append({
        "id": qid,
        "level": LEVEL,
        "difficulty": difficulty_level(question),
        "tags": assign_tags(question),
        "question": question,
        "options": ACADEMIC_OPTIONS
    })

    qid += 1

# ================= SAVE =================

with open(OUTPUT_DIR / "academic_dataset.json", "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2)

print(f"✅ Generated {len(dataset)} academic questions")
