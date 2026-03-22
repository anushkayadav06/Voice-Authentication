import torch
import torchaudio
import numpy as np
from speechbrain.pretrained import EncoderClassifier


# ---------------------------
# Deepfake Feature Extraction
# (Adapt to your CNN training pipeline)
# ---------------------------

def extract_features(waveform):
    """
    Extract mel spectrogram (modify if using LFCC/phase).
    Returns tensor ready for CNN.
    """

    mel_transform = torchaudio.transforms.MelSpectrogram(
        sample_rate=16000,
        n_mels=128
    )

    mel = mel_transform(waveform)
    mel = torch.log(mel + 1e-9)

    # Add batch dimension
    return mel.unsqueeze(0)


# ---------------------------
# Speaker Embedding Model
# ---------------------------

speaker_classifier = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="models/ecapa_model"
)


def extract_speaker_embedding(waveform):
    """
    Extract 192-d ECAPA speaker embedding.
    Returns numpy array.
    """

    with torch.no_grad():
        embedding = speaker_classifier.encode_batch(waveform)

    return embedding.view(-1).cpu().numpy()