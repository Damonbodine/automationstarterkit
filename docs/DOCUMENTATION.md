# Document OCR Processor Documentation

## 1. Overview

This project is a simple web application that uses the Google Cloud Vision API to perform Optical Character Recognition (OCR) on uploaded image and PDF files. It's built with a Python/FastAPI backend and a simple HTML/JavaScript frontend.

## 2. Architecture

- **Backend**: FastAPI (Python)
- **Frontend**: HTML and vanilla JavaScript
- **Google Cloud Services**:
    - **Cloud Vision API**: Used for text extraction from both images and PDFs.
    - **Cloud Storage**: Required for the asynchronous processing of PDF files.

## 3. How It Works

The application logic is contained within `main.py`.

### 3.1. File Upload

- The `POST /upload` endpoint handles all file uploads.
- It checks the MIME type of the file to determine if it's an image or a PDF and routes it to the appropriate processing function.

### 3.2. Image Processing (`process_image`)

- Image processing is synchronous.
- The image file is read into memory.
- The content is sent directly to the Vision API's `text_detection` method.
- The extracted text from the response is returned to the user.

### 3.3. PDF Processing (`process_pdf`)

PDF processing is asynchronous and more complex, requiring Google Cloud Storage.

1.  **Upload to GCS**: The uploaded PDF is first saved to a temporary local `uploads/` directory, then uploaded to a designated Google Cloud Storage (GCS) bucket (`possible-point-477719-n3-pdfs`).
2.  **Initiate Async OCR Job**: The application calls the Vision API's `async_batch_annotate_files` method. This method does not perform OCR immediately. Instead, it starts a background job and requires the source file (the PDF) and a destination for the output to be specified as GCS URIs.
3.  **Wait for Results**: The code blocks and waits for the asynchronous operation to complete using `operation.result()`.
4.  **Retrieve Results from GCS**: Once the job is finished, the Vision API writes one or more JSON files containing the results into the specified output GCS path (`gs://<bucket_name>/<filename>-output/`). The application then lists the blobs at this prefix, downloads each JSON file, parses the content, and concatenates the text from each page.
5.  **Cleanup**: The original PDF and the output files are deleted from the GCS bucket to avoid unnecessary storage costs.

## 4. Project Structure

```
.
├── venv/                   # Python virtual environment
├── templates/
│   └── index.html          # Frontend HTML
├── uploads/                # Temporarily stores uploaded files
├── main.py                 # FastAPI application logic
├── requirements.txt        # Python dependencies
├── gcloud-keys.json        # Service Account key (DO NOT COMMIT)
└── DOCUMENTATION.md        # This file
```

## 5. Setup and Running

1.  **Create and Activate Virtual Environment**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Set Credentials**:
    Ensure your `gcloud-keys.json` service account file is present. Set the environment variable to point to it.
    ```bash
    export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/gcloud-keys.json
    ```
    *Note: Add this line to your `.zshrc` or `.bash_profile` for it to persist across terminal sessions.*

4.  **Run the Application**:
    ```bash
    python main.py
    ```
    The application will be available at `http://localhost:8000`.

## 6. Future Improvements

- **Configuration Management**: Move hardcoded values like `BUCKET_NAME` into a `.env` file or a dedicated configuration module.
- **UI/UX Enhancements**:
    - Use a CSS framework like Bootstrap for better styling.
    - Implement a real-time progress bar for PDF processing by polling the async operation status.
    - Add a "Download Text" button.
- **Error Handling**: Implement more granular error handling and display user-friendly messages on the frontend.
- **Logging**: Add structured logging to the backend for better debugging and monitoring.
- **Direct GCS Uploads**: For a more scalable and robust solution, implement direct browser-to-GCS uploads using signed URLs.
