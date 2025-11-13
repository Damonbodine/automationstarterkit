"""
DEPRECATED: This FastAPI OCR service is no longer used.
The application performs OCR via Next.js workers and Cloud Vision (see src/lib/ocr/pdf-ocr.ts).
Kept for historical reference; do not deploy in production.
"""

import io
import os
import re
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from google.cloud import vision, storage

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Configure GCS and upload directory
BUCKET_NAME = "possible-point-477719-n3-pdfs"
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

storage_client = storage.Client()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        if file.content_type == 'application/pdf':
            return await process_pdf(file_path, file.filename)
        else:
            return await process_image(file_path)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

async def process_image(file_path: str):
    client = vision.ImageAnnotatorClient()
    with io.open(file_path, 'rb') as image_file:
        content = image_file.read()
    image = vision.Image(content=content)
    response = client.text_detection(image=image)
    if response.error.message:
        raise Exception(response.error.message)
    return JSONResponse(content={"text": response.full_text_annotation.text})

async def process_pdf(file_path: str, filename: str):
    # Upload to GCS
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(filename)
    blob.upload_from_filename(file_path)
    gcs_source_uri = f"gs://{BUCKET_NAME}/{filename}"

    # Perform OCR
    client = vision.ImageAnnotatorClient()
    feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)
    gcs_source = vision.GcsSource(uri=gcs_source_uri)
    input_config = vision.InputConfig(gcs_source=gcs_source, mime_type='application/pdf')

    # Where to write the results
    gcs_destination_uri = f"gs://{BUCKET_NAME}/{filename}-output/"
    gcs_destination = vision.GcsDestination(uri=gcs_destination_uri)
    output_config = vision.OutputConfig(gcs_destination=gcs_destination, batch_size=1)

    async_request = vision.AsyncAnnotateFileRequest(
        features=[feature], input_config=input_config, output_config=output_config
    )

    operation = client.async_batch_annotate_files(requests=[async_request])
    operation.result(timeout=420)

    # Get the results
    bucket = storage_client.get_bucket(BUCKET_NAME)
    
    # List objects with the given prefix.
    blob_list = list(bucket.list_blobs(prefix=f"{filename}-output/"))
    
    full_text = ""
    for blob in blob_list:
        json_string = blob.download_as_bytes().decode("utf-8")
        response = vision.AnnotateFileResponse.from_json(json_string)
        for page_response in response.responses:
            full_text += page_response.full_text_annotation.text
            
    # Clean up GCS files
    for blob in blob_list:
        blob.delete()
    bucket.blob(filename).delete()

    return JSONResponse(content={"text": full_text})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
