import { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null); // Changed from selectedFiles to selectedFile
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadResults, setUploadResults] = useState(null);

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]); // Store only the first file
    } else {
      setSelectedFile(null);
    }
    setMessage('');
    setUploadResults(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) { // Changed condition
      setMessage('Please select a ZIP file to upload.');
      return;
    }

    setUploading(true);
    setMessage('Uploading file...'); // Changed message

    try {
      const formData = new FormData();
      formData.append('file', selectedFile); // Changed 'files' to 'file' and use selectedFile

      // const response = await axios.post('/api/v1/upload', formData, {
      const response = await axios.post('/api/v1/upload_refined', formData, {
        headers: {
          // 'Content-Type': 'multipart/form-data' is automatically set by Axios when using FormData
        },
      });
      
      setUploadResults(response.data);
      // Display more detailed success message from backend if available
      if (response.data && response.data.message) {
        setMessage(response.data.message);
      } else {
        setMessage('Upload successful!');
      }
      // Optionally display processed files info
      if (response.data && response.data.processed_files) {
        console.log("Processed files:", response.data.processed_files);
      }

    } catch (error) {
      console.log('Test');
      console.error('Upload failed:', error);
      if (error.response && error.response.data) {
        // Display detailed error from backend
        let errorDetail = "Upload failed.";
        if (typeof error.response.data.detail === 'string') {
          errorDetail = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle cases where detail might be an array of error objects (e.g. Pydantic validation)
          errorDetail = error.response.data.detail.map(err => `${err.loc ? err.loc.join(' > ') + ': ' : ''}${err.msg}`).join('; ');
        }
        
        if (error.response.data.errors) {
            errorDetail += " Errors: " + error.response.data.errors.join(", ");
        }
        setMessage(errorDetail);
      } else {
        setMessage(`Upload failed: ${error.message}`);
      }
      setUploadResults(null); // Clear previous results on error
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Evidence Package</h2> 
      <p>
        Select a single ZIP archive containing media files and a manifest.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="file-input">
          <input
            type="file"
            // removed multiple attribute
            onChange={handleFileChange}
            disabled={uploading}
            accept=".zip,application/zip,image/*,video/*" // Changed to accept ZIP, images, and videos
          />
          <div className="selected-files">
            {selectedFile && ( // Changed condition
              <div>
                Selected file:
                <ul>
                  <li>
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={uploading || !selectedFile} // Changed condition
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </form>

      {message && <div className={`message ${uploadResults && !uploading && !message.toLowerCase().includes("failed") ? 'message-success' : message.toLowerCase().includes("failed") ? 'message-error' : ''}`}>{message}</div>}
      
      {uploadResults && !message.toLowerCase().includes("failed") && ( // Conditionally render results
        <div className="upload-results">
          <h3>Upload Confirmation</h3>
          <p>ID: {uploadResults.id}</p>
          <p>Original Filename: {uploadResults.original_filename}</p>
          {uploadResults.processed_files && uploadResults.processed_files.length > 0 && (
            <div>
              <h4>Validated Files:</h4>
              <ul>
                {uploadResults.processed_files.map(f => (
                  <li key={f.filename}>{f.filename} (SHA256: {f.sha256.substring(0, 16)}...)</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
