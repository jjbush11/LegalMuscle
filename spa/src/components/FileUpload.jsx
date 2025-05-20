import { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadResults, setUploadResults] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFiles(Array.from(event.target.files));
    setMessage('');
    setUploadResults(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setMessage('Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    setMessage('Uploading files...');

    try {
      // For now, we'll just call the placeholder API endpoint
      // const response = await axios.post('/api/v1/upload', {});
      
      // In a real implementation, we would use FormData for file uploads
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      const response = await axios.post('/api/v1/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadResults(response.data);
      setMessage('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Evidence Files</h2>
      <p>
        Select media files (photos/videos) to upload with tamper-evident metadata.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="file-input">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            accept="image/*,video/*"
          />
          <div className="selected-files">
            {selectedFiles.length > 0 && (
              <div>
                {selectedFiles.length} file(s) selected:
                <ul>
                  {selectedFiles.map((file, index) => (
                    <li key={index}>
                      {file.name} ({Math.round(file.size / 1024)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={uploading || selectedFiles.length === 0}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </form>

      {message && <div className="message">{message}</div>}
      
      {uploadResults && (
        <div className="upload-results">
          <h3>Upload Results</h3>
          <p>ID: {uploadResults.id}</p>
          <p>SHA256: {uploadResults.sha256}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
