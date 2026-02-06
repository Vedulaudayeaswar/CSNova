import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import torch
from torch.utils.data import DataLoader
import torch.nn as nn
import torch.optim as optim

from training.dataset import QuestionDataset
from model.tiny_transformer import TinyTransformerLM
from tokenizers import Tokenizer

# ================= CONFIG =================
BATCH_SIZE = 16
EPOCHS = 5                # You can increase to 8–10 later
LR = 3e-4
MAX_LENGTH = 64

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ================= PATHS =================
CHECKPOINT_DIR = Path("checkpoints")
CHECKPOINT_DIR.mkdir(exist_ok=True)

# ================= LOAD TOKENIZER =================
tokenizer = Tokenizer.from_file("tokenizer/tokenizer.json")
vocab_size = tokenizer.get_vocab_size()
pad_id = tokenizer.token_to_id("[PAD]")

# ================= LOAD DATASET =================
dataset = QuestionDataset(
    data_path="data/final/final_dataset.json",
    tokenizer_path="tokenizer/tokenizer.json",
    max_length=MAX_LENGTH
)

loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

# ================= MODEL =================
model = TinyTransformerLM(vocab_size=vocab_size)
model.to(DEVICE)

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

    # ================= SAVE CHECKPOINT =================
    checkpoint_path = CHECKPOINT_DIR / f"tiny_transformer_epoch_{epoch}.pt"
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "loss": avg_loss
        },
        checkpoint_path
    )

    print(f"💾 Saved checkpoint: {checkpoint_path}")
