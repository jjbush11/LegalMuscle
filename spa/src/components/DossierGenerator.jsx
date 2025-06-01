import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './DossierGenerator.css';

const DossierGenerator = ({ selectedEvidence, onClose, evidenceData }) => {
  const { t } = useTranslation();
  const [caseId, setCaseId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const selectedItems = evidenceData?.features?.filter(feature => 
    selectedEvidence.includes(feature.properties.object_id)
  ) || [];
  const generateDossier = async () => {
    if (selectedEvidence.length === 0) {
      setError(t('generator.noEvidence'));
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ids: selectedEvidence,
        ...(caseId.trim() && { case_id: caseId.trim() })
      };

      console.log('Generating dossier with payload:', payload);

      console.log('=== DEBUGGING DOSSIER REQUEST ===');
      console.log('Selected evidence array:', selectedEvidence);
      console.log('Evidence data features:', evidenceData?.features?.slice(0, 2)); // Show first 2 items
      console.log('Payload being sent:', payload);
      console.log('=====================================');

      const response = await axios.post('/api/v1/dossier', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      console.log('Dossier generation result:', result);      setSuccess({
        message: t('generator.success'),
        docxUrl: result.docx?.download_url,
        pdfUrl: result.pdf?.download_url,
        caseId: result.case_id
      });

      // Auto-download the files
      if (result.docx?.download_url) {
        window.open(result.docx.download_url, '_blank');
      }
      if (result.pdf?.download_url) {
        setTimeout(() => window.open(result.pdf.download_url, '_blank'), 500);
      }

    } catch (err) {
      console.error('Failed to generate dossier:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to generate dossier';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return t('common.unknown');
    return new Date(dateString).toLocaleString();
  };

  const getFileTypeIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '📷';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📄';
  };

  return (
    <div className="dossier-generator-overlay">
      <div className="dossier-generator">        <div className="dossier-header">
          <h2>📋 {t('generator.title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dossier-content">          <div className="case-info-section">
            <label htmlFor="case-id">{t('generator.caseId')}</label>
            <input
              id="case-id"
              type="text"
              placeholder={t('generator.caseIdPlaceholder')}
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              disabled={generating}
            />
          </div>          <div className="selected-evidence-section">
            <h3>{t('generator.selectedEvidence', { count: selectedEvidence.length })}</h3>
            
            {selectedItems.length === 0 ? (
              <p className="no-evidence">{t('generator.noEvidence')}</p>
            ) : (
              <div className="evidence-list">
                {selectedItems.map((feature, index) => (
                  <div key={`${feature.properties.id}-${index}`} className="evidence-item">
                    <div className="evidence-icon">
                      {getFileTypeIcon(feature.properties.mime_type)}
                    </div>
                    <div className="evidence-info">
                      <div className="evidence-name">{feature.properties.filename}</div>                      <div className="evidence-details">
                        <span>{t('evidence.captured')}: {formatDate(feature.properties.captured_at)}</span>
                        <span>SHA256: {feature.properties.sha256?.substring(0, 16)}...</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <div className="success-content">
                <p>{success.message}</p>                <p><strong>{t('generator.caseIdLabel')}</strong> {success.caseId}</p>
                <div className="download-links">
                  {success.docxUrl && (
                    <a href={success.docxUrl} target="_blank" rel="noopener noreferrer" className="download-link">
                      {t('generator.downloadDocx')}
                    </a>
                  )}
                  {success.pdfUrl && (
                    <a href={success.pdfUrl} target="_blank" rel="noopener noreferrer" className="download-link">
                      {t('generator.downloadPdf')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}          <div className="action-buttons">
            <button 
              className="cancel-button"
              onClick={onClose}
              disabled={generating}
            >
              {t('common.cancel')}
            </button>
            <button 
              className="generate-button"
              onClick={generateDossier}
              disabled={selectedEvidence.length === 0 || generating}
            >
              {generating ? (
                <>
                  <span className="spinner">⏳</span>
                  {t('generator.generating')}
                </>
              ) : (
                <>
                  📋 {t('generator.generate')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DossierGenerator;
