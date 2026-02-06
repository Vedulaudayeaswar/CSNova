import torch
import torch.nn.functional as F
from tokenizers import Tokenizer
from model.tiny_transformer import TinyTransformerLM

class OptionSelector:
    def __init__(self, model, tokenizer, device):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device

    def score_option(self, question, option_text):
        """
        Score how well an option fits a question
        using negative log-likelihood.
        """
        combined = question + " " + option_text
        encoding = self.tokenizer.encode(combined)

        ids = torch.tensor([encoding.ids], device=self.device)
        input_ids = ids[:, :-1]
        target_ids = ids[:, 1:]

        with torch.no_grad():
            logits = self.model(input_ids)
            log_probs = F.log_softmax(logits, dim=-1)

        score = 0.0
        for i in range(target_ids.size(1)):
            score += log_probs[0, i, target_ids[0, i]].item()

        return score

    def select_best(self, question, options, top_k=4):
        scored = []
        for opt in options:
            s = self.score_option(question, opt["text"])
            scored.append((s, opt))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [opt for _, opt in scored[:top_k]]
