from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.trainers import BpeTrainer
from tokenizers.pre_tokenizers import Whitespace
from pathlib import Path

# ================= PATHS =================
BASE_DIR = Path(__file__).resolve().parent.parent
CORPUS_PATH = BASE_DIR / "data/structured/structured_corpus.txt"
TOKENIZER_DIR = BASE_DIR / "tokenizer"
TOKENIZER_DIR.mkdir(exist_ok=True)

# ================= SPECIAL TOKENS =================
SPECIAL_TOKENS = [
    "[PAD]",
    "[UNK]",
    "<LEVEL>",
    "<QUESTION>",
    "<OPTION_A>",
    "<OPTION_B>",
    "<OPTION_C>",
    "<OPTION_D>",
    "<END>"
]

# ================= TOKENIZER =================
tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
tokenizer.pre_tokenizer = Whitespace()

trainer = BpeTrainer(
    vocab_size=6000,
    min_frequency=2,
    special_tokens=SPECIAL_TOKENS
)

tokenizer.train([str(CORPUS_PATH)], trainer)

# ================= SAVE =================
tokenizer.save(str(TOKENIZER_DIR / "tokenizer.json"))

with open(TOKENIZER_DIR / "vocab.txt", "w", encoding="utf-8") as f:
    for token in tokenizer.get_vocab().keys():
        f.write(token + "\n")

print("✅ Structured tokenizer trained successfully")
print(f"📄 Tokenizer saved to {TOKENIZER_DIR}")
