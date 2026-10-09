# Local automatic transcription

The local preview uses Faster Whisper small, CPU inference and int8 weights. No API key is needed. Model files are downloaded once; inference sets offline flags, loads local files and does not send recordings to an endpoint.

English and Hindi are supported. Whisper's language vocabulary does not include Odia. The app blocks Odia transcription in this mode rather than silently processing it as another language. Sources: [Faster Whisper](https://github.com/SYSTRAN/faster-whisper), [Whisper language vocabulary](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py).

## Reproduce the setup

Use Python 3.12 to create a virtual environment in `.data/asr-env`, then install `scripts/requirements-asr.txt`. PyAV is pinned because its newer API is incompatible with this Faster Whisper version.

Set LOCAL_ASR_MODEL_PATH to an absolute directory inside the project, then run `scripts/setup-local-asr.py` using that environment's Python. Model download needs internet. The small model weights occupy approximately 484 MB; the Python environment requires additional space.

Set these in the ignored local environment file:

- ASR_MODE: local
- LOCAL_ASR_PYTHON: absolute path to the environment's Python executable
- LOCAL_ASR_MODEL_PATH: absolute path to the downloaded model directory

The committed environment template lists these names with empty values. Restart the app after changes.

## Runtime behavior

The recorder explicitly selects a supported WebM format. Server validation accepts codec parameters but still checks the underlying WebM signature. CPU inference accepts clips up to two minutes and permits one transcription at a time. The worker has a two-minute timeout and removes its temporary audio on completion. Silence and unsupported languages return specific errors.

Confidence derived from model log probabilities is not calibrated accuracy. Staff must play the original clip and verify the transcript before saving. This model has not been clinically validated, and the production profile still requires an approved enterprise provider.

Verification includes decoding a synthetic Windows speech recording containing “I have a cough and a headache.” through the real model and through the authenticated browser API. This is an engineering smoke test, not a language accuracy evaluation.
