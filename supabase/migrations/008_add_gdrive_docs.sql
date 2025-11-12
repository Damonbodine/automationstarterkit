-- Add source_type to documents to distinguish between uploads and gdrive files
ALTER TABLE documents
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'upload';

-- Add gdrive_file_id to store the google drive file id
ALTER TABLE documents
ADD COLUMN gdrive_file_id TEXT;

-- Add webViewLink to store the google drive web view link
ALTER TABLE documents
ADD COLUMN webViewLink TEXT;

-- Add a more generic content column and migrate existing data
ALTER TABLE documents
ADD COLUMN content TEXT;

UPDATE documents
SET content = ocr_text
WHERE ocr_text IS NOT NULL;

-- Add a unique constraint to prevent duplicate gdrive files for the same user
ALTER TABLE documents
ADD CONSTRAINT unique_gdrive_file_per_user UNIQUE (user_id, gdrive_file_id);

-- Update the default value for source_type after the initial backfill
ALTER TABLE documents
ALTER COLUMN source_type SET DEFAULT NULL;
