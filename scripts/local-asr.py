import json, math, os, sys
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

def main():
    audio_path, language = sys.argv[1:3]
    if language not in ("en", "hi"):
        raise ValueError("ASR_LANGUAGE_UNSUPPORTED")
    model_path = os.environ.get("LOCAL_ASR_MODEL_PATH", "")
    if not model_path or not os.path.isfile(os.path.join(model_path, "model.bin")):
        raise ValueError("ASR_NOT_CONFIGURED")
    audio = decode_audio(audio_path, sampling_rate=16000)
    if len(audio) > 120 * 16000:
        raise ValueError("ASR_AUDIO_TOO_LONG")
    if not len(audio) or float((audio ** 2).mean()) < 0.000001:
        raise ValueError("ASR_NO_SPEECH")
    model = WhisperModel(model_path, device="cpu", compute_type="int8",
                         cpu_threads=4, num_workers=1, local_files_only=True)
    segments, info = model.transcribe(audio, language=language, task="transcribe",
                                     beam_size=5, vad_filter=True,
                                     condition_on_previous_text=False)
    result = []
    for segment in segments:
        if segment.no_speech_prob > 0.6 or not segment.text.strip():
            continue
        result.append({"text": segment.text.strip(), "start": segment.start,
                       "end": segment.end,
                       "confidence": round(max(0, min(1, math.exp(segment.avg_logprob))), 3)})
    if not result:
        raise ValueError("ASR_NO_SPEECH")
    print(json.dumps({"text": " ".join(s["text"] for s in result),
                      "language": language, "segments": result}, ensure_ascii=True))

try:
    main()
except Exception as error:
    code = str(error) if str(error).startswith("ASR_") else "ASR_FAILED"
    print(json.dumps({"error": code}))
    sys.exit(1)
