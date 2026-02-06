import sys
from pathlib import Path

# Add project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT))

import torch
import torch.nn.functional as F
from tokenizers import Tokenizer

from model.tiny_transformer import TinyTransformerLM
from inference.option_selector import OptionSelector


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load tokenizer & model
tokenizer = Tokenizer.from_file("tokenizer/tokenizer.json")
vocab_size = tokenizer.get_vocab_size()

model = TinyTransformerLM(vocab_size=vocab_size)
checkpoint = torch.load("checkpoints/tiny_transformer_epoch_5.pt", map_location=DEVICE)
model.load_state_dict(checkpoint["model_state_dict"])
model.to(DEVICE)
model.eval()

def generate_question(base_prompt, max_new_tokens=20):
    encoding = tokenizer.encode(base_prompt)
    input_ids = torch.tensor([encoding.ids], dtype=torch.long).to(DEVICE)

    for _ in range(max_new_tokens):
        with torch.no_grad():
            logits = model(input_ids)
            next_token_logits = logits[0, -1] / 0.7
            probs = F.softmax(next_token_logits, dim=-1)
            next_token_id = torch.multinomial(probs, 1).item()

        input_ids = torch.cat(
            [input_ids, torch.tensor([[next_token_id]], device=DEVICE)],
            dim=1
        )

        token = tokenizer.decode([next_token_id]).strip()
        if token in ["?", "."]:
            break

    return tokenizer.decode(input_ids[0].tolist())

def serve_question(level):
    prompts = {
        "emotional": "How do you feel when",
        "reasoning": "What happens when",
        "academic": "Why does"
    }

    question = generate_question(prompts[level])
    options = OPTIONS[level]

    return {
        "level": level,
        "question": question,
        "options": options
    }

if __name__ == "__main__":
    level = input("Enter level (emotional/reasoning/academic): ").strip()
    q = serve_question(level)

    print("\nQUESTION:")
    print(q["question"])
    print("\nOPTIONS:")
    for i, opt in enumerate(q["options"], 1):
        print(f"{i}. {opt['text']}")
