from huggingface_hub import snapshot_download
import os
snapshot_download(repo_id="Systran/faster-whisper-small",
                  local_dir=os.environ["LOCAL_ASR_MODEL_PATH"],
                  allow_patterns=["model.bin", "config.json", "tokenizer.json",
                                  "vocabulary.json", "vocabulary.txt", "preprocessor_config.json"])
print("Local ASR model ready. Inference uses only the downloaded files.")
