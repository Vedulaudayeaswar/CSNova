import json
import torch
from torch.utils.data import Dataset
from tokenizers import Tokenizer
from pathlib import Path

class QuestionDataset(Dataset):
    def __init__(self, data_path, tokenizer_path, max_length=64):
        self.tokenizer = Tokenizer.from_file(tokenizer_path)
        self.max_length = max_length

        with open(data_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)

        self.texts = [item["question"] for item in self.data]

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer.encode(self.texts[idx])

        ids = encoding.ids[: self.max_length]

        # Pad if needed
        pad_id = self.tokenizer.token_to_id("[PAD]")
        if len(ids) < self.max_length:
            ids += [pad_id] * (self.max_length - len(ids))

        input_ids = torch.tensor(ids[:-1], dtype=torch.long)
        target_ids = torch.tensor(ids[1:], dtype=torch.long)

        return input_ids, target_ids
