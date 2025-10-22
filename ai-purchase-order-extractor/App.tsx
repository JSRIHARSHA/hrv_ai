import React, { useState, useCallback } from 'react';
import type { PurchaseOrder } from './types';
import { extractDataViaBackend } from './services/apiClient';
import ExtractionResult from './components/ExtractionResult';
import Spinner from './components/Spinner';

const FileUploadIcon: React.FC = () => (
  <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
  </svg>
);

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError(null);
        setExtractedData(null);
      } else {
        setError("Please upload a valid PDF file.");
        setFile(null);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // remove "data:application/pdf;base64," prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleExtract = useCallback(async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const base64String = await fileToBase64(file);
      // The frontend now calls our simulated backend API client
      const result = await extractDataViaBackend(base64String);
      setExtractedData(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `Failed to extract data: ${err.message}` : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
            AI Purchase Order Extractor
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload your PO in PDF format. Our AI will instantly parse and structure the key information for you.
          </p>
        </header>

        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center w-full mb-6">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileUploadIcon />
                {file ? (
                  <>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">{file.name}</span></p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF only</p>
                  </>
                )}
              </div>
              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf" />
            </label>
          </div>

          <div className="text-center">
            <button
              onClick={handleExtract}
              disabled={!file || isLoading}
              className="px-8 py-3 text-white font-bold rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isLoading ? 'Extracting...' : 'Extract Data'}
            </button>
          </div>
          
          {isLoading && (
              <div className="mt-8 flex justify-center items-center flex-col">
                  <Spinner />
                  <p className="text-gray-500 dark:text-gray-400 mt-2">AI is analyzing your document...</p>
              </div>
          )}

          {error && <div className="mt-6 p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">{error}</div>}
        </div>

        {extractedData && (
          <div className="mt-8 md:mt-12">
            <ExtractionResult data={extractedData} />
          </div>
        )}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
        Powered by Gemini
      </footer>
    </div>
  );
};

export default App;