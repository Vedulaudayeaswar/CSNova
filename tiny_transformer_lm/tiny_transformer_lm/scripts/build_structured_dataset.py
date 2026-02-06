import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = BASE_DIR / "data/structured"
OUT_DIR.mkdir(exist_ok=True)

FINAL_OUT = OUT_DIR / "structured_corpus.txt"

DATASETS = [
    BASE_DIR / "data/generated/emotional_dataset.json",
    BASE_DIR / "data/generated/reasoning_dataset.json",
    BASE_DIR / "data/generated/academic_dataset.json"
]

def build_block(item):
    lines = []
    lines.append(f"<LEVEL> {item['level']}")
    lines.append(f"<QUESTION> {item['question']}")

    for i, opt in enumerate(item["options"]):
        label = chr(ord('A') + i)
        lines.append(f"<OPTION_{label}> {opt['text']}")

    lines.append("<END>")
    return "\n".join(lines)

with open(FINAL_OUT, "w", encoding="utf-8") as out:
    count = 0
    for path in DATASETS:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for item in data:
            block = build_block(item)
            out.write(block + "\n\n")
            count += 1

print(f"✅ Structured dataset created with {count} samples")
print(f"📄 Saved to {FINAL_OUT}")
