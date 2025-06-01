import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import DossierGenerator from './DossierGenerator';
import './DossierManager.css';

const DossierManager = ({ onBack }) => {
  const { t } = useTranslation();
  const [evidenceData, setEvidenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState([]);
  const [showDossierGenerator, setShowDossierGenerator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchEvidenceData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/v1/items?limit=1000');
        setEvidenceData(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch evidence data:', err);
        setError(t('dossier.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchEvidenceData();
  }, []);

  const toggleEvidenceSelection = (evidenceId) => {
    setSelectedEvidenceIds(prev => 
      prev.includes(evidenceId)
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
    );
  };

  const selectAllEvidence = () => {
    if (!filteredEvidence) return;
    const allIds = filteredEvidence.map(f => f.properties.object_id);
    setSelectedEvidenceIds(allIds);
  };

  const clearAllSelection = () => {
    setSelectedEvidenceIds([]);
  };

  const openDossierGenerator = () => {
    setShowDossierGenerator(true);
  };

  const closeDossierGenerator = () => {
    setShowDossierGenerator(false);
  };
  const formatDate = (dateString) => {
    if (!dateString) return t('common.unknown');
    return new Date(dateString).toLocaleString();
  };
  const formatFileSize = (bytes) => {
    if (!bytes) return t('common.unknown');
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? t('format.mb', { size: mb.toFixed(1) }) : t('format.kb', { size: (bytes / 1024).toFixed(1) });
  };

  const getFileTypeIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '📷';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📄';
  };
  const getLocationString = (feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const [lng, lat] = feature.geometry.coordinates;
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return t('map.noData');
  };

  // Filter and sort evidence
  const filteredEvidence = evidenceData?.features?.filter(feature => {
    const props = feature.properties;
    const searchLower = searchTerm.toLowerCase();
    return (
      props.filename?.toLowerCase().includes(searchLower) ||
      props.sha256?.toLowerCase().includes(searchLower) ||
      props.captured_at?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const sortedEvidence = [...filteredEvidence].sort((a, b) => {
    let aValue = a.properties[sortBy];
    let bValue = b.properties[sortBy];
    
    if (sortBy === 'created_at' || sortBy === 'captured_at') {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <div className="dossier-manager-container">        <div className="dossier-header">
          <button className="back-button" onClick={onBack}>
            ← {t('nav.back')}
          </button>
          <div className="header-content">
            <h2>📋 {t('dossier.title')}</h2>
            <p>{t('dossier.loading')}</p>
          </div>
        </div>
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (      <div className="dossier-manager-container">
        <div className="dossier-header">
          <button className="back-button" onClick={onBack}>
            ← {t('nav.back')}
          </button>
          <div className="header-content">
            <h2>📋 {t('dossier.title')}</h2>
            <p>{t('dossier.error')}</p>
          </div>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (    <div className="dossier-manager-container">
      <div className="dossier-header">
        <button className="back-button" onClick={onBack}>
          ← {t('nav.back')}
        </button>
        <div className="header-content">
          <h2>📋 {t('dossier.title')}</h2>
          <p>{t('dossier.subtitle')}</p>
        </div>
        <div className="header-stats">
          <span className="total-count">{t('dossier.itemsCount', { count: sortedEvidence.length })}</span>
          {selectedEvidenceIds.length > 0 && (
            <span className="selected-count">{t('dossier.selectedCount', { count: selectedEvidenceIds.length })}</span>
          )}
        </div>
      </div>      <div className="dossier-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder={t('dossier.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="created_at">{t('dossier.sortUploadDate')}</option>
            <option value="captured_at">{t('dossier.sortCaptureDate')}</option>
            <option value="filename">{t('dossier.sortFilename')}</option>
            <option value="sha256">{t('dossier.sortSha256')}</option>
          </select>
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>        <div className="selection-actions">
          <button 
            className="select-all-btn"
            onClick={selectedEvidenceIds.length === sortedEvidence.length ? clearAllSelection : selectAllEvidence}
          >
            {selectedEvidenceIds.length === sortedEvidence.length ? t('dossier.clearAll') : t('dossier.selectAll')}
          </button>
          {selectedEvidenceIds.length > 0 && (
            <button 
              className="generate-dossier-btn"
              onClick={openDossierGenerator}
            >
              📋 {t('map.generateDossier')} ({selectedEvidenceIds.length})
            </button>
          )}
        </div>
      </div>      <div className="evidence-list-container">
        {sortedEvidence.length === 0 ? (
          <div className="no-evidence">
            {searchTerm ? t('dossier.noEvidence') : t('dossier.noEvidence')}
          </div>
        ) : (
          <div className="evidence-grid">
            {sortedEvidence.map((feature, index) => {
              const props = feature.properties;
              const isSelected = selectedEvidenceIds.includes(props.object_id);
              
              return (
                <div 
                  key={`${props.id}-${index}`}
                  className={`evidence-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleEvidenceSelection(props.object_id)}
                >
                  <div className="evidence-card-header">
                    <div className="evidence-icon">
                      {getFileTypeIcon(props.mime_type)}
                    </div>
                    <div className="selection-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEvidenceSelection(props.object_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  <div className="evidence-card-content">
                    <div className="evidence-filename">{props.filename}</div>
                      <div className="evidence-details">
                      <div className="detail-row">
                        <span className="label">{t('evidence.captured')}:</span>
                        <span className="value">{formatDate(props.captured_at)}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">{t('evidence.location')}:</span>
                        <span className="value">{getLocationString(feature)}</span>
                      </div>
                      
                      <div className="detail-row">
                        <span className="label">{t('evidence.sha256')}:</span>
                        <span className="value hash">{props.sha256?.substring(0, 16)}...</span>
                      </div>
                      
                      {props.file_size && (
                        <div className="detail-row">
                          <span className="label">{t('evidence.size')}:</span>
                          <span className="value">{formatFileSize(props.file_size)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDossierGenerator && (
        <DossierGenerator
          selectedEvidence={selectedEvidenceIds}
          evidenceData={evidenceData}
          onClose={closeDossierGenerator}
        />
      )}
    </div>
  );
};

export default DossierManager;
