import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from training.structured_dataset import StructuredDataset

dataset = StructuredDataset(
    corpus_path="data/structured/structured_corpus.txt",
    tokenizer_path="tokenizer/tokenizer.json"
)

x, y = dataset[0]

print("Input shape:", x.shape)
print("Target shape:", y.shape)
print("First 30 input IDs:", x[:30])
