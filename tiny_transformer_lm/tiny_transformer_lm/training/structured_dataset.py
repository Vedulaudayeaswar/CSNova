import torch
from torch.utils.data import Dataset
from tokenizers import Tokenizer
from pathlib import Path

class StructuredDataset(Dataset):
    def __init__(self, corpus_path, tokenizer_path, max_length=256):
        self.tokenizer = Tokenizer.from_file(tokenizer_path)
        self.max_length = max_length

        with open(corpus_path, "r", encoding="utf-8") as f:
            raw_text = f.read()

        # Split blocks by double newline
        self.samples = [
            block.strip()
            for block in raw_text.split("\n\n")
            if block.strip()
        ]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        encoding = self.tokenizer.encode(self.samples[idx])
        ids = encoding.ids[: self.max_length]

        pad_id = self.tokenizer.token_to_id("[PAD]")
        if len(ids) < self.max_length:
            ids += [pad_id] * (self.max_length - len(ids))

        input_ids = torch.tensor(ids[:-1], dtype=torch.long)
        target_ids = torch.tensor(ids[1:], dtype=torch.long)

        return input_ids, target_ids
