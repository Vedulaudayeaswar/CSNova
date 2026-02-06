import json
from pathlib import Path
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.trainers import BpeTrainer
from tokenizers.pre_tokenizers import Whitespace

# ================= PATHS =================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data/final/final_dataset.json"
TOKENIZER_DIR = BASE_DIR / "tokenizer"
TOKENIZER_DIR.mkdir(exist_ok=True)

# ================= LOAD DATA =================
texts = []

with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    texts.append(item["question"])

print(f"Loaded {len(texts)} questions for tokenizer training")

# ================= TOKENIZER (FROM SCRATCH) =================
tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
tokenizer.pre_tokenizer = Whitespace()

trainer = BpeTrainer(
    vocab_size=4000,   # ideal for your dataset size
    min_frequency=2,
    special_tokens=["[PAD]", "[UNK]", "[CLS]", "[SEP]", "[MASK]"]
)

tokenizer.train_from_iterator(texts, trainer)

# ================= SAVE =================
tokenizer.save(str(TOKENIZER_DIR / "tokenizer.json"))

with open(TOKENIZER_DIR / "vocab.txt", "w", encoding="utf-8") as f:
    for token in tokenizer.get_vocab().keys():
        f.write(token + "\n")

print("✅ Tokenizer training completed successfully")
