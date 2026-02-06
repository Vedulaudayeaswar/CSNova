import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

from training.structured_dataset import StructuredDataset
from model.tiny_transformer import TinyTransformerLM
from tokenizers import Tokenizer

# ================= CONFIG =================
BATCH_SIZE = 8            # structured sequences are long
EPOCHS = 5                # DRY RUN FIRST
LR = 3e-4
MAX_LENGTH = 256

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ================= PATHS =================
CORPUS_PATH = "data/structured/structured_corpus.txt"
TOKENIZER_PATH = "tokenizer/tokenizer.json"
CHECKPOINT_DIR = Path("checkpoints_structured")
CHECKPOINT_DIR.mkdir(exist_ok=True)

# ================= LOAD TOKENIZER =================
tokenizer = Tokenizer.from_file(TOKENIZER_PATH)
vocab_size = tokenizer.get_vocab_size()
pad_id = tokenizer.token_to_id("[PAD]")

print("Vocab size:", vocab_size)

# ================= DATASET =================
dataset = StructuredDataset(
    corpus_path=CORPUS_PATH,
    tokenizer_path=TOKENIZER_PATH,
    max_length=MAX_LENGTH
)

loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

# ================= MODEL =================
model = TinyTransformerLM(
    vocab_size=vocab_size,
    max_len=MAX_LENGTH
).to(DEVICE)

# ================= TRAINING SETUP =================
criterion = nn.CrossEntropyLoss(ignore_index=pad_id)
optimizer = optim.AdamW(model.parameters(), lr=LR)

# ================= TRAIN LOOP =================
for epoch in range(1, EPOCHS + 1):
    model.train()
    total_loss = 0.0

    for step, (x, y) in enumerate(loader):
        x = x.to(DEVICE)
        y = y.to(DEVICE)

        optimizer.zero_grad()
        logits = model(x)

        loss = criterion(
            logits.view(-1, vocab_size),
            y.view(-1)
        )

        loss.backward()
        optimizer.step()

        total_loss += loss.item()

        if step % 100 == 0:
            print(
                f"Epoch [{epoch}/{EPOCHS}] "
                f"Step {step} "
                f"Loss: {loss.item():.4f}"
            )

    avg_loss = total_loss / len(loader)
    print(f"\n✅ Epoch {epoch} completed | Avg Loss: {avg_loss:.4f}\n")

    ckpt_path = CHECKPOINT_DIR / f"structured_epoch_{epoch}.pt"
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "loss": avg_loss
        },
        ckpt_path
    )

    print(f"💾 Saved checkpoint: {ckpt_path}")
