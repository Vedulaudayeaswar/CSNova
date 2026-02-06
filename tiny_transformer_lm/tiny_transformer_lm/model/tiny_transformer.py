import torch
import torch.nn as nn
import math

class TinyTransformerLM(nn.Module):
    def __init__(
        self,
        vocab_size,
        embed_dim=128,
        num_heads=4,
        num_layers=2,
        max_len=128,
        dropout=0.1
    ):
        super().__init__()

        self.token_embedding = nn.Embedding(vocab_size, embed_dim)
        self.position_embedding = nn.Embedding(max_len, embed_dim)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            dropout=dropout,
            batch_first=True
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )

        self.lm_head = nn.Linear(embed_dim, vocab_size)

        self.dropout = nn.Dropout(dropout)

    def forward(self, input_ids):
        """
        input_ids: (batch_size, seq_len)
        """
        batch_size, seq_len = input_ids.size()

        positions = torch.arange(0, seq_len, device=input_ids.device)
        positions = positions.unsqueeze(0).expand(batch_size, seq_len)

        x = self.token_embedding(input_ids) + self.position_embedding(positions)
        x = self.dropout(x)

        x = self.transformer(x)

        logits = self.lm_head(x)
        return logits
