import sys
from pathlib import Path

# Add project root to Python path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(PROJECT_ROOT))

from training.dataset import QuestionDataset

dataset = QuestionDataset(
    data_path="data/final/final_dataset.json",
    tokenizer_path="tokenizer/tokenizer.json"
)

x, y = dataset[0]

print("Input shape:", x.shape)
print("Target shape:", y.shape)
print("Sample input IDs:", x[:10])
print("Sample target IDs:", y[:10])
