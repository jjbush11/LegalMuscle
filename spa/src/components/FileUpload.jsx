import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const FileUpload = () => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState(null); // Changed from selectedFiles to selectedFile
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadType, setUploadType] = useState('general'); // 'general' or 'proofmode'

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]); // Store only the first file
    } else {
      setSelectedFile(null);
    }
    setMessage('');
    setUploadResults(null);
  };  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) { // Changed condition
      setMessage(t('upload.selectFile', { type: uploadType === 'proofmode' ? 'ProofMode ZIP' : t('common.file') }));
      return;
    }    // Validate file type based on upload type
    if (uploadType === 'proofmode') {
      const allowedZipTypes = ['application/zip', 'application/x-zip-compressed', 'application/x-zip'];
      if (!allowedZipTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.zip')) {
        setMessage(t('upload.zipRequired'));
        return;
      }
    }

    setUploading(true);
    setMessage(t('upload.uploading'));

    try {
      const formData = new FormData();
      formData.append('file', selectedFile); // Changed 'files' to 'file' and use selectedFile

      // Choose endpoint based on upload type
      const endpoint = uploadType === 'proofmode' ? '/api/v1/upload/proofmode' : '/api/v1/upload_refined';
      
      const response = await axios.post(endpoint, formData, {
        headers: {
          // 'Content-Type': 'multipart/form-data' is automatically set by Axios when using FormData
        },
      });
      
      setUploadResults(response.data);      // Display more detailed success message from backend if available
      if (response.data && response.data.message) {
        setMessage(response.data.message);
      } else {
        setMessage(t('upload.success'));
      }
      // Optionally display processed files info
      if (response.data && response.data.processed_files) {
        console.log("Processed files:", response.data.processed_files);
      }

    } catch (error) {
      console.log('Test');
      console.error('Upload failed:', error);      if (error.response && error.response.data) {
        // Display detailed error from backend
        let errorDetail = t('upload.uploadFailed');
        if (typeof error.response.data.detail === 'string') {
          errorDetail = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle cases where detail might be an array of error objects (e.g. Pydantic validation)
          errorDetail = error.response.data.detail.map(err => `${err.loc ? err.loc.join(' > ') + ': ' : ''}${err.msg}`).join('; ');
        }
        
        if (error.response.data.errors) {
            errorDetail += " " + t('upload.errors', { errors: error.response.data.errors.join(", ") });
        }
        setMessage(errorDetail);
      } else {
        setMessage(t('upload.uploadFailedWith', { message: error.message }));
      }
      setUploadResults(null); // Clear previous results on error
    } finally {
      setUploading(false);
    }
  };  return (
    <div className="file-upload">
      <h2>{t('upload.title')}</h2>
      
      {/* Upload Type Selection */}
      <div className="upload-type-selection" style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '20px' }}>
          <input
            type="radio"
            value="general"
            checked={uploadType === 'general'}
            onChange={(e) => setUploadType(e.target.value)}
            disabled={uploading}
          />
          {t('upload.type.general')}
        </label>
        <label>
          <input
            type="radio"
            value="proofmode"
            checked={uploadType === 'proofmode'}
            onChange={(e) => setUploadType(e.target.value)}
            disabled={uploading}
          />
          {t('upload.type.proofmode')}
        </label>
      </div>
      
      <p>
        {uploadType === 'proofmode' 
          ? t('upload.description.proofmode')
          : t('upload.description.general')
        }
      </p>
      
      <form onSubmit={handleSubmit}>        <div className="file-input">
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            accept={uploadType === 'proofmode' ? '.zip,application/zip' : '.zip,application/zip,image/*,video/*'}
          />          <div className="selected-files">
            {selectedFile && ( // Changed condition
              <div>
                {t('upload.selectedFile')}
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
          {uploading ? t('upload.uploading') : t('upload.button', { type: uploadType === 'proofmode' ? 'ProofMode ZIP' : t('common.file') })}
        </button>
      </form>

      {message && <div className={`message ${uploadResults && !uploading && !message.toLowerCase().includes("failed") ? 'message-success' : message.toLowerCase().includes("failed") ? 'message-error' : ''}`}>{message}</div>}        {uploadResults && !message.toLowerCase().includes("failed") && ( // Conditionally render results
        <div className="upload-results">
          <h3>{t('results.title')}</h3>
          <p>{t('results.id')} {uploadResults.id}</p>
          <p>{t('results.originalFilename')} {uploadResults.original_input_filename || uploadResults.original_filename}</p>
          
          {/* ProofMode specific results */}
          {uploadType === 'proofmode' && uploadResults.bundle && (
            <div>
              <h4>{t('results.proofmodeBundle')}</h4>
              <p>{t('results.bundleSha256')} {uploadResults.bundle.sha256}</p>
              <p>{t('results.storedAs')} {uploadResults.bundle.object_name}</p>
              
              {uploadResults.media_files && uploadResults.media_files.length > 0 && (
                <div>
                  <h4>{t('results.mediaFiles')}</h4>
                  <ul>
                    {uploadResults.media_files.map((f, idx) => (
                      <li key={idx}>
                        {f.original_filename} → {f.object_name}
                        <br />SHA256: {f.sha256.substring(0, 16)}...
                        {f.mime_type && <span> ({f.mime_type})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {uploadResults.thumbnails && uploadResults.thumbnails.length > 0 && (
                <div>
                  <h4>{t('results.generatedThumbnails')}</h4>
                  <ul>
                    {uploadResults.thumbnails.map((t, idx) => (
                      <li key={idx}>
                        {t.object_name} ({t.dimensions})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {uploadResults.signature_verification && (
                <div>
                  <h4>{t('results.signatureVerification')}</h4>
                  <p>{t('results.status')} {uploadResults.signature_verification.valid ? t('results.valid') : t('results.invalid')}</p>
                  {uploadResults.signature_verification.verifications && (
                    <ul>
                      {uploadResults.signature_verification.verifications.map((v, idx) => (
                        <li key={idx}>
                          {v.data_file}: {v.valid ? '✅' : '❌'} {v.fingerprint && `(${v.fingerprint.substring(0, 8)}...)`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* General upload results */}
          {uploadType === 'general' && uploadResults.processed_files && uploadResults.processed_files.length > 0 && (
            <div>
              <h4>{t('results.validatedFiles')}</h4>
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
