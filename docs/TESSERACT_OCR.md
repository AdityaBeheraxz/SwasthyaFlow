# Local Tesseract OCR

The local preview uses `OCR_MODE=tesseract` and `OCR_LANGUAGES=eng+hin+ori`. Upload prescriptions and reports in their separate file fields (PNG, JPEG or PDF); the camera capture controls have been removed. Click Extract for each document, compare the extracted text with its original, correct mistakes, and confirm each source separately. Extraction does not automatically verify clinical values or recommend treatment.

Tesseract loads uncompressed `eng.traineddata`, `hin.traineddata` and `ori.traineddata` from `.data/ocr-cache`, or the local directory specified by `OCR_MODEL_PATH`. Provision the models before use; runtime document processing does not download models or send documents to an OCR service. No OCR API key is needed. A missing configured model stops extraction with an explicit setup error. The current local preview has all three models installed; language files are ignored runtime assets, not committed patient data.

Official language models: https://github.com/tesseract-ocr/tessdata_fast (LSTM models; Apache 2.0). Tesseract.js options: https://github.com/naptha/tesseract.js/blob/master/docs/api.md. Install matching language files in the configured directory when setting up a new host. PDFs also require the existing Poppler `pdftoppm` renderer, optionally configured by `PDF_RENDERER_PATH`.

Tesseract can misread handwriting, low-resolution scans, skewed pages and medicine names. Confidence is not a guarantee of correctness. Unreadable values must remain unknown and all extraction must be reviewed before clinical rules can use it. Local recognition is not independently clinically validated. Production deployment approval gates remain in effect.
