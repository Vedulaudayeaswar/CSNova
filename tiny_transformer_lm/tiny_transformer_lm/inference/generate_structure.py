import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import torch
import torch.nn.functional as F
from tokenizers import Tokenizer

from model.tiny_transformer import TinyTransformerLM

# ================= CONFIG =================
CHECKPOINT_PATH = "checkpoints_structured/structured_epoch_5.pt"
MAX_NEW_TOKENS = 200
TEMPERATURE = 0.7
TOP_K = 30
MAX_LEN = 256

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ================= LOAD TOKENIZER =================
tokenizer = Tokenizer.from_file("tokenizer/tokenizer.json")
vocab_size = tokenizer.get_vocab_size()

END_ID = tokenizer.token_to_id("<END>")

# ================= LOAD MODEL =================
model = TinyTransformerLM(
    vocab_size=vocab_size,
    max_len=MAX_LEN
)
checkpoint = torch.load(CHECKPOINT_PATH, map_location=DEVICE)
model.load_state_dict(checkpoint["model_state_dict"])
model.to(DEVICE)
model.eval()

# ================= GENERATION =================
def generate_structured(prompt):
    encoding = tokenizer.encode(prompt)
    input_ids = torch.tensor([encoding.ids], device=DEVICE)

    for _ in range(MAX_NEW_TOKENS):
        with torch.no_grad():
            logits = model(input_ids)
            next_logits = logits[0, -1] / TEMPERATURE

            topk_logits, topk_indices = torch.topk(next_logits, TOP_K)
            probs = F.softmax(topk_logits, dim=-1)
            next_pos = torch.multinomial(probs, 1).item()
            next_id = topk_indices[next_pos].item()

        input_ids = torch.cat(
            [input_ids, torch.tensor([[next_id]], device=DEVICE)],
            dim=1
        )

        # HARD STOP
        if next_id == END_ID:
            break

    decoded = tokenizer.decode(input_ids[0].tolist())

    # Safety trim
    if "<END>" in decoded:
        decoded = decoded.split("<END>")[0] + "<END>"

    return decoded

# ================= PARSER =================
def parse_block(text):
    question = ""
    options = []

    # Extract question
    if "<QUESTION>" in text:
        q = text.split("<QUESTION>", 1)[1]
        for tag in ["<OPTION_A>", "<OPTION_B>", "<OPTION_C>", "<OPTION_D>"]:
            if tag in q:
                q = q.split(tag, 1)[0]
                break
        question = q.strip()

    # Extract options
    for tag in ["<OPTION_A>", "<OPTION_B>", "<OPTION_C>", "<OPTION_D>"]:
        if tag in text:
            part = text.split(tag, 1)[1]
            for stop in ["<OPTION_A>", "<OPTION_B>", "<OPTION_C>", "<OPTION_D>", "<END>"]:
                if stop in part:
                    part = part.split(stop, 1)[0]
            options.append(part.strip())

    return question, options

# ================= RUN =================
if __name__ == "__main__":
    print("\nChoose level: emotional / reasoning / academic")
    level = input(">> ").strip()

    # 🔒 STRONG STRUCTURED PROMPT (CRITICAL)
    prompt = (
        f"<LEVEL> {level}\n"
        f"<QUESTION> "
        f"<OPTION_A> "
        f"<OPTION_B> "
        f"<OPTION_C> "
        f"<OPTION_D> "
    )

    output = generate_structured(prompt)

    # Debug (keep for now)
    print("\nRAW MODEL OUTPUT:\n")
    print(output)

    question, options = parse_block(output)

    print("\n===== GENERATED QUESTION =====\n")
    print(question if question else "[Question not parsed]")

    print("\n===== OPTIONS =====")
    if options:
        for i, opt in enumerate(options, 1):
            print(f"{i}. {opt}")
    else:
        print("[Options not parsed]")

    print("\n==============================")
