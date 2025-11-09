'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Ensure jobId is a non-empty string before polling
    if (!jobId || typeof jobId !== 'string' || jobId.length === 0) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get status');
        }

        if (data.status === 'done') {
          setText(data.text);
          setLoading(false);
          setJobId(null);
          setStatusMessage('Extraction complete!');
          setProgress(100);
          clearInterval(interval);
        } else {
          // Fake a progress bar increase
          setProgress(prev => (prev < 90 ? prev + 5 : prev));
          setStatusMessage('Processing PDF... this can take a minute.');
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        setJobId(null);
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file.');
      return;
    }

    setLoading(true);
    setError('');
    setText('');
    setJobId(null);
    setProgress(0);
    setStatusMessage('Uploading file...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.jobId && typeof data.jobId === 'string' && data.jobId.length > 0) {
        setJobId(data.jobId);
        setStatusMessage('File uploaded. Starting OCR process...');
        setProgress(10);
      } else if (data.text) {
        setText(data.text);
        setLoading(false);
        setStatusMessage('Extraction complete!');
      } else {
        throw new Error('Received an invalid response from the server.');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="w-full max-w-xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Upload an Image or PDF for OCR
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept="image/png, image/jpeg, application/pdf"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Processing...' : 'Extract Text'}
          </button>
        </form>

        {loading && (
          <div className="mt-6">
            <p className="text-center text-gray-600">{statusMessage}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        
        {text && !loading && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Extracted Text:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
              {text}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
