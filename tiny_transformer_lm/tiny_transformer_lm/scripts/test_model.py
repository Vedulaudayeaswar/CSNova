import sys
from pathlib import Path

# Add project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT))

import torch
from tokenizers import Tokenizer
from model.tiny_transformer import TinyTransformerLM

# Load tokenizer
tokenizer = Tokenizer.from_file("tokenizer/tokenizer.json")
vocab_size = tokenizer.get_vocab_size()

# Create model
model = TinyTransformerLM(vocab_size=vocab_size)

# Dummy input (batch_size=2, seq_len=10)
dummy_input = torch.randint(0, vocab_size, (2, 10))

# Forward pass
logits = model(dummy_input)

print("Model forward pass successful")
print("Logits shape:", logits.shape)
