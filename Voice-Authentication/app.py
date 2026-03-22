import os
import sys
import logging
import subprocess
import tempfile
import io
import numpy as np
import torch
import torch.nn.functional as F
import soundfile as sf
import librosa
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.metrics.pairwise import cosine_similarity
from werkzeug.utils import secure_filename
from speechbrain.inference import EncoderClassifier
import urllib.request
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
from supabase import create_client, Client

# ==========================================================
# LOAD ENV
# ==========================================================

load_dotenv()

# ==========================================================
# CLOUDINARY CONFIG
# ==========================================================

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)

# ==========================================================
# SUPABASE CONFIG
# ==========================================================

SUPABASE_URL: str = os.getenv("SUPABASE_URL")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
supabase: Client  = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================================
# APP CONFIG
# ==========================================================

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "audio")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MODEL_VARIANT = "AASIST"
MODEL_PATH    = os.path.join(BASE_DIR, "aasist", "models", "weights", f"{MODEL_VARIANT}.pth")

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

SPEAKER_THRESHOLD  = 0.60
FAKE_THRESHOLD     = 85.0
MIN_CONFIDENCE_GAP = 20.0
TARGET_LEN         = 4 * 16000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ==========================================================
# FFMPEG CONVERSION
# ==========================================================

def convert_to_wav(input_path: str) -> str:
    wav_path = os.path.splitext(input_path)[0] + "_converted.wav"
    if os.path.exists(wav_path):
        os.remove(wav_path)
    cmd = [
        os.getenv("FFMPEG_PATH", "ffmpeg"),
        "-y", "-i", input_path,
        "-ar", "16000", "-ac", "1", "-sample_fmt", "s16", wav_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(
            "ffmpeg failed.\n"
            f"{result.stderr.decode(errors='replace')[:300]}"
        )
    logger.info(f"Converted → {os.path.basename(wav_path)}")
    return wav_path


def load_audio(path: str) -> np.ndarray:
    ext = os.path.splitext(path)[1].lower()
    if ext in (".webm", ".ogg", ".mp4", ".m4a", ".opus"):
        path = convert_to_wav(path)
    try:
        data, sr = sf.read(path, dtype="float32", always_2d=False)
        if data.ndim > 1:
            data = data.mean(axis=1)
        if sr != 16000:
            data = librosa.resample(data, orig_sr=sr, target_sr=16000)
        return data.astype(np.float32)
    except Exception as e:
        logger.warning(f"soundfile failed ({e}), using librosa fallback")
        y, _ = librosa.load(path, sr=16000, mono=True)
        return y

# ==========================================================
# LOAD ECAPA
# ==========================================================

logger.info("Loading ECAPA-TDNN...")
ecapa = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="pretrained_models/EncoderClassifier"
)
logger.info("ECAPA loaded.")

# ==========================================================
# LOAD AASIST
# ==========================================================

sys.path.append(os.path.join(BASE_DIR, "aasist"))
from aasist.models.AASIST import Model as AASISTModel

d_args = {
    "first_conv":   70,
    "in_channels":  1,
    "filts":        [70, [1, 32], [32, 32], [32, 64], [64, 64]],
    "gat_dims":     [64, 32],
    "pool_ratios":  [0.4, 0.4, 0.4, 0.4],
    "temperatures": [2.0, 2.0, 100.0, 100.0],
}

aasist_model  = AASISTModel(d_args).to(DEVICE)
AASIST_LOADED = False

aasist_model.conv_time.padding = 35
logger.info("Patched SincConv padding → 35")

if os.path.exists(MODEL_PATH):
    try:
        checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
        if isinstance(checkpoint, dict):
            for key in ("model_state_dict", "state_dict", "model"):
                if key in checkpoint:
                    state_dict = checkpoint[key]
                    break
            else:
                state_dict = checkpoint
        else:
            state_dict = checkpoint

        state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
        model_keys = set(aasist_model.state_dict().keys())
        matched    = model_keys & set(state_dict.keys())
        match_pct  = len(matched) / len(model_keys) * 100

        logger.info(f"AASIST: {len(matched)}/{len(model_keys)} keys matched ({match_pct:.1f}%)")
        aasist_model.load_state_dict(state_dict, strict=False)
        aasist_model.eval()
        AASIST_LOADED = (match_pct >= 80)
        if AASIST_LOADED:
            logger.info("AASIST ready ✅")
    except Exception as e:
        logger.error(f"AASIST load FAILED: {e}")
else:
    logger.error(f"AASIST not found: {MODEL_PATH}")

# ==========================================================
# SUPABASE HELPERS
# ==========================================================

def db_get_user(username: str):
    """Fetch a user row from Supabase by username. Returns None if not found."""
    res = supabase.table("users").select("*").eq("username", username).execute()
    return res.data[0] if res.data else None


def db_insert_user(username: str, embedding: str, audio_url: str):
    """Insert a brand new user. Raises exception if username already exists."""
    supabase.table("users").insert({
        "username":  username,
        "embedding": embedding,
        "audio_url": audio_url,
    }).execute()

# ==========================================================
# AUDIO / ML HELPERS
# ==========================================================

def extract_embedding(path: str) -> np.ndarray:
    y      = load_audio(path)
    signal = torch.tensor(y, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        emb = ecapa.encode_batch(signal)
    emb = F.normalize(emb.squeeze(), p=2, dim=0)
    return emb.cpu().numpy()


def debug_similarity(reg_emb, login_emb, username) -> float:
    sim  = cosine_similarity([reg_emb], [login_emb])[0][0]
    dist = np.linalg.norm(reg_emb - login_emb)
    logger.info(
        f"Speaker sim: {sim*100:.2f}% | dist: {dist:.4f} | "
        f"{'✅ PASS' if sim >= SPEAKER_THRESHOLD else '❌ FAIL'}"
    )
    return sim


def upload_image_to_cloudinary(fig, public_id: str, folder: str) -> str:
    """Save a matplotlib figure to a temp file, upload to Cloudinary, delete temp."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        fig.savefig(tmp.name, dpi=100)
        tmp_path = tmp.name
    try:
        result = cloudinary.uploader.upload(
            tmp_path,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )
    finally:
        os.unlink(tmp_path)
    return result["secure_url"]


def generate_spectrogram(audio_path: str, public_id: str) -> str:
    """Generate mel spectrogram, upload to Cloudinary, return URL."""
    y   = load_audio(audio_path)
    mel = librosa.power_to_db(
        librosa.feature.melspectrogram(y=y, sr=16000, n_mels=128), ref=np.max
    )
    fig, ax = plt.subplots(figsize=(6, 4))
    img = librosa.display.specshow(
        mel, sr=16000, x_axis="time", y_axis="mel", fmax=8000, ax=ax
    )
    fig.colorbar(img, ax=ax, format="%+2.0f dB")
    ax.set_title(public_id.replace("_", " "))
    fig.tight_layout()
    url = upload_image_to_cloudinary(fig, public_id=public_id, folder="spectrograms")
    plt.close(fig)
    return url


def deepfake_check(audio_path: str):
    if not AASIST_LOADED:
        return 0.0, 0.0, False
    waveform = load_audio(audio_path)
    waveform, _ = librosa.effects.trim(waveform, top_db=20)
    waveform = np.append(waveform[0], waveform[1:] - 0.97 * waveform[:-1])
    waveform = waveform / (np.max(np.abs(waveform)) + 1e-6)
    if len(waveform) >= TARGET_LEN:
        start    = (len(waveform) - TARGET_LEN) // 2
        waveform = waveform[start: start + TARGET_LEN]
    else:
        waveform = np.pad(waveform, (0, TARGET_LEN - len(waveform)))
    waveform = waveform[:TARGET_LEN]
    x = torch.tensor(waveform, dtype=torch.float32).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = aasist_model(x)
    logits    = output[1] if isinstance(output, tuple) else output
    probs     = torch.softmax(logits, dim=1)
    real_prob = probs[0][0].item() * 100
    fake_prob = probs[0][1].item() * 100
    if real_prob + fake_prob < 5.0:
        return 0.0, 0.0, False
    return real_prob, fake_prob, True


def generate_lime(audio_path: str, username: str):
    if not AASIST_LOADED:
        return None
    y          = load_audio(audio_path)
    num_splits = 20
    chunks     = np.array_split(y, num_splits)
    scores     = []
    for i in range(num_splits):
        temp    = [c.copy() for c in chunks]
        temp[i] = np.zeros_like(temp[i])
        test    = np.concatenate(temp)
        test    = test[:TARGET_LEN] if len(test) >= TARGET_LEN else np.pad(test, (0, TARGET_LEN - len(test)))
        test    = test / (np.max(np.abs(test)) + 1e-6)
        x       = torch.tensor(test, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            out = aasist_model(x)
        logits = out[1] if isinstance(out, tuple) else out
        probs  = torch.softmax(logits, dim=1)
        scores.append(probs[0][1].item())

    scores = np.array(scores) / (np.max(scores) + 1e-6)
    colors = ["#ef4444" if s > 0.6 else "#3b82f6" for s in scores]

    fig = plt.figure(figsize=(10, 2.5))
    plt.bar(range(num_splits), scores, color=colors)
    plt.axhline(y=0.6, color="red", linestyle="--", linewidth=0.8, label="High suspicion")
    plt.title("LIME — Fake Influence per Segment")
    plt.xlabel("Segment (time →)")
    plt.ylabel("Normalised fake score")
    plt.legend()
    plt.tight_layout()

    url = upload_image_to_cloudinary(fig, public_id=f"{username}_lime", folder="spectrograms")
    plt.close(fig)
    return url


def generate_report(username, similarity, real_prob, fake_prob, reason,
                    reg_spec_url=None, login_spec_url=None, lime_url=None) -> str:
    """
    Build PDF to a real temp FILE (not BytesIO),
    embed images, upload to Cloudinary as a proper PDF so it
    opens in the browser instead of downloading.
    """
    img_tmp_paths = []   # track downloaded image temps for cleanup

    # ── Write PDF to a real temp file so Cloudinary reads it correctly ──
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as pdf_tmp:
        pdf_path = pdf_tmp.name

    try:
        doc    = SimpleDocTemplate(pdf_path, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        # ── Text content ────────────────────────────────────
        elements.append(Paragraph("VOICE AUTHENTICATION FORENSIC REPORT", styles["Heading1"]))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"User: {username}", styles["Normal"]))
        elements.append(Paragraph(f"Speaker Similarity: {similarity:.2f}%", styles["Normal"]))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Deepfake Detection:", styles["Heading2"]))
        elements.append(Paragraph(f"Real Probability: {real_prob:.2f}%", styles["Normal"]))
        elements.append(Paragraph(f"Fake Probability: {fake_prob:.2f}%", styles["Normal"]))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Final Decision:", styles["Heading2"]))
        elements.append(Paragraph(reason, styles["Normal"]))
        elements.append(Spacer(1, 10))

        gap    = abs(real_prob - fake_prob)
        interp = (
            f"Audio analyzed with ECAPA-TDNN + AASIST. "
            f"Detected: {'synthetic artifacts' if fake_prob > real_prob else 'natural speech'}. "
            f"Confidence gap: {gap:.2f}%."
        )
        elements.append(Paragraph("Analysis:", styles["Heading2"]))
        elements.append(Paragraph(interp, styles["Normal"]))

        # ── Download spectrogram / LIME images and embed ─────
        # IMPORTANT: download ALL images first, THEN build the PDF.
        # ReportLab reads image files at build time — they must exist.
        for label, img_url in [
            ("Registered Voice Spectrogram", reg_spec_url),
            ("Login Voice Spectrogram",      login_spec_url),
            ("LIME Explanation",             lime_url),
        ]:
            if not img_url:
                continue
            try:
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as img_tmp:
                    urllib.request.urlretrieve(img_url, img_tmp.name)
                    img_tmp_paths.append(img_tmp.name)
                elements.append(Spacer(1, 14))
                elements.append(Paragraph(label, styles["Heading2"]))
                elements.append(Spacer(1, 6))
                elements.append(RLImage(img_tmp_paths[-1], width=460, height=230))
            except Exception as e:
                logger.warning(f"Could not embed image ({label}): {e}")

        # ── Build PDF — images must still exist at this point ─
        doc.build(elements)

        # ── Upload the PDF file to Cloudinary ────────────────
        # Use resource_type="image" + format="pdf" so Cloudinary
        # serves it with Content-Type: application/pdf and the
        # browser opens it inline instead of downloading it.
        with open(pdf_path, "rb") as pdf_file:
            upload_result = cloudinary.uploader.upload(
                pdf_file,
                folder="reports",
                public_id=f"{username}_report",
                overwrite=True,
                resource_type="raw",
                format="pdf",
            )

        return upload_result["secure_url"]

    finally:
        # Clean up the local PDF temp file
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
        # Clean up all downloaded image temp files
        for p in img_tmp_paths:
            try:
                os.unlink(p)
            except Exception:
                pass


# ==========================================================
# ROUTES
# ==========================================================

@app.route("/")
def home():
    return jsonify({"message": "Voice Authentication API is running ✅"})


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return jsonify({"message": "POST audio + username to register"})

    username = request.form.get("username", "").strip()
    file     = request.files.get("audio")

    if not username or not file:
        return jsonify({"success": False, "message": "Username and audio are required"}), 400

    tmp_path = None
    try:
        # ── Block duplicate usernames ──────────────────────
        existing = db_get_user(username)
        if existing:
            return jsonify({
                "success": False,
                "message": f"Username '{username}' is already registered. Please use a different name."
            }), 409

        # Save audio to temp file for processing
        ext = os.path.splitext(secure_filename(file.filename))[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Extract speaker embedding
        emb        = extract_embedding(tmp_path)
        emb_string = ",".join(map(str, emb))

        # Upload registered voice to Cloudinary
        audio_result = cloudinary.uploader.upload(
            tmp_path,
            folder="registered_voices",
            public_id=f"{username}_voice",
            overwrite=True,
            resource_type="raw",
        )
        audio_url = audio_result["secure_url"]

        # Insert new user into Supabase
        db_insert_user(username, emb_string, audio_url)

        logger.info(f"Registered '{username}' — embedding dim {len(emb)}")
        return jsonify({
            "success": True,
            "message": f"Voice registered successfully for '{username}' ✅"
        })

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"success": False, "message": f"Registration failed: {str(e)}"}), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.route("/authenticate", methods=["POST"])
def authenticate():
    username = request.form.get("username", "").strip()
    file     = request.files.get("audio")

    if not username or not file:
        return jsonify({"success": False, "message": "Invalid input"}), 400

    login_path = None

    try:
        # Save login audio to temp file — NOT uploaded to Cloudinary
        ext = os.path.splitext(secure_filename(file.filename))[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            file.save(tmp.name)
            login_path = tmp.name

        # Fetch user from Supabase
        user = db_get_user(username)
        if not user:
            return jsonify({
                "success": False,
                "message": f"User '{username}' not found. Please register first."
            }), 404

        # Load registered embedding from Supabase
        reg_emb   = np.array(list(map(float, user["embedding"].split(","))))
        login_emb = extract_embedding(login_path)

        similarity         = debug_similarity(reg_emb, login_emb, username)
        similarity_percent = similarity * 100
        distance           = float(np.linalg.norm(reg_emb - login_emb))

        # Generate spectrograms
        reg_spec_url   = None
        login_spec_url = None

        if user.get("audio_url"):
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as reg_tmp:
                urllib.request.urlretrieve(user["audio_url"], reg_tmp.name)
                reg_tmp_path = reg_tmp.name
            try:
                reg_spec_url = generate_spectrogram(reg_tmp_path, f"{username}_reg")
            finally:
                os.unlink(reg_tmp_path)

        login_spec_url = generate_spectrogram(login_path, f"{username}_login")

        # Stage 1 — Speaker verification
        if similarity < SPEAKER_THRESHOLD:
            status    = "Speaker Mismatch"
            access    = "Denied"
            reason    = f"Similarity {similarity_percent:.2f}% below threshold {SPEAKER_THRESHOLD*100:.0f}%"
            real_prob = 0.0
            fake_prob = 0.0
            lime_url  = None

        else:
            # Stage 2 — Deepfake detection
            real_prob, fake_prob, trusted = deepfake_check(login_path)
            lime_url = generate_lime(login_path, username) if trusted else None

            if not trusted:
                status = "Authentication Successful"
                access = "Granted"
                reason = "Voice matched. ⚠️ Deepfake model unavailable (speaker-only mode)"
            else:
                gap = abs(real_prob - fake_prob)
                if gap < MIN_CONFIDENCE_GAP:
                    status = "Uncertain Audio"
                    access = "Denied"
                    reason = f"Model confidence too low (gap {gap:.2f}%). Speak clearly for 5+ seconds."
                elif fake_prob > FAKE_THRESHOLD:
                    status = "Fake Voice Detected"
                    access = "Denied"
                    reason = f"High fake probability ({fake_prob:.2f}%)"
                else:
                    status = "Authentication Successful"
                    access = "Granted"
                    reason = f"Voice verified as real ({real_prob:.2f}% real, {fake_prob:.2f}% fake)"

        # Generate and upload report
        report_url = generate_report(
            username, similarity_percent, real_prob, fake_prob, reason,
            reg_spec_url, login_spec_url, lime_url
        )

        return jsonify({
            "success":       True,
            "username":      username,
            "status":        status,
            "access":        access,
            "similarity":    round(float(similarity_percent), 2),
            "distance":      round(float(distance), 4),
            "real_prob":     round(float(real_prob), 2),
            "fake_prob":     round(float(fake_prob), 2),
            "reason":        reason,
            "reg_spec":      reg_spec_url,
            "login_spec":    login_spec_url,
            "lime_img":      lime_url,
            "report":        report_url,
            "aasist_loaded": AASIST_LOADED,
        })

    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return jsonify({"success": False, "message": f"Authentication failed: {str(e)}"}), 500

    finally:
        # Always delete login audio — never stored permanently
        if login_path and os.path.exists(login_path):
            os.unlink(login_path)


if __name__ == "__main__":
    print(f"\n{'='*55}")
    print(f"  Model variant   : {MODEL_VARIANT}")
    print(f"  Model path      : {MODEL_PATH}")
    print(f"  AASIST loaded   : {AASIST_LOADED}")
    print(f"  Device          : {DEVICE}")
    print(f"  Target length   : {TARGET_LEN} samples (4s @ 16kHz)")
    print(f"  Speaker thresh  : {SPEAKER_THRESHOLD*100:.0f}%")
    print(f"  Fake threshold  : {FAKE_THRESHOLD}%")
    print(f"{'='*55}\n")
    app.run(debug=True)