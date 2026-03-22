import torchaudio
import torch

TARGET_SAMPLE_RATE = 16000


def preprocess_audio(filepath):
    """
    Load audio file and resample to 16kHz.
    Returns waveform tensor.
    """

    waveform, sample_rate = torchaudio.load(filepath)

    # Convert to mono
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    # Resample if needed
    if sample_rate != TARGET_SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate,
            new_freq=TARGET_SAMPLE_RATE
        )
        waveform = resampler(waveform)

    # Normalize
    waveform = waveform / waveform.abs().max()

    return waveform