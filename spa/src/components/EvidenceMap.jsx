import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './EvidenceMap.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EvidenceMap = ({ onEvidenceSelect }) => {
  const [evidenceData, setEvidenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  useEffect(() => {
    const fetchEvidenceData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/v1/items?limit=1000');
        setEvidenceData(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch evidence data:', err);
        setError('Failed to load evidence data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvidenceData();
  }, []);

  const handleMarkerClick = (evidence) => {
    setSelectedEvidence(evidence);
    if (onEvidenceSelect) {
      onEvidenceSelect(evidence);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getFileTypeIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '📷';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    return '📄';
  };

  if (loading) {
    return (
      <div className="map-container">
        <div className="loading">Loading evidence map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!evidenceData || !evidenceData.features || evidenceData.features.length === 0) {
    return (
      <div className="map-container">
        <div className="no-data">No evidence with location data found.</div>
      </div>
    );
  }

  return (
    <div className="evidence-map-container">
      <div className="map-header">
        <h2>Evidence Locations</h2>
        <p>{evidenceData.features.length} evidence items with GPS coordinates</p>
      </div>
      
      <div className="map-content">
        <div className="map-container">
          <MapContainer
            center={[40.7128, -74.0060]} // Default to NYC
            zoom={10}
            style={{ height: '500px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {evidenceData.features.map((feature, index) => {
              if (!feature.geometry || !feature.geometry.coordinates) return null;
              
              const [lng, lat] = feature.geometry.coordinates;
              const props = feature.properties;
              
              return (
                <Marker
                  key={`${props.id}-${index}`}
                  position={[lat, lng]}
                  eventHandlers={{
                    click: () => handleMarkerClick(feature)
                  }}
                >
                  <Popup>
                    <div className="evidence-popup">
                      <h4>
                        {getFileTypeIcon(props.mime_type)} {props.filename}
                      </h4>
                      <p><strong>SHA256:</strong> {props.sha256?.substring(0, 16)}...</p>
                      <p><strong>Captured:</strong> {formatDate(props.captured_at)}</p>
                      <p><strong>Size:</strong> {formatFileSize(props.size_bytes)}</p>
                      {props.object_type && (
                        <p><strong>Type:</strong> {props.object_type}</p>
                      )}
                      <button 
                        onClick={() => handleMarkerClick(feature)}
                        className="view-details-btn"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
        
        {selectedEvidence && (
          <div className="evidence-sidebar">
            <h3>Evidence Details</h3>
            <button 
              className="close-sidebar"
              onClick={() => setSelectedEvidence(null)}
            >
              ×
            </button>
            
            <div className="evidence-details">
              <h4>
                {getFileTypeIcon(selectedEvidence.properties.mime_type)} 
                {selectedEvidence.properties.filename}
              </h4>
              
              <div className="detail-group">
                <label>SHA256 Hash:</label>
                <span className="hash-value">{selectedEvidence.properties.sha256}</span>
              </div>
              
              <div className="detail-group">
                <label>Captured Date:</label>
                <span>{formatDate(selectedEvidence.properties.captured_at)}</span>
              </div>
              
              <div className="detail-group">
                <label>File Size:</label>
                <span>{formatFileSize(selectedEvidence.properties.size_bytes)}</span>
              </div>
              
              {selectedEvidence.properties.mime_type && (
                <div className="detail-group">
                  <label>MIME Type:</label>
                  <span>{selectedEvidence.properties.mime_type}</span>
                </div>
              )}
              
              {selectedEvidence.properties.object_type && (
                <div className="detail-group">
                  <label>Object Type:</label>
                  <span>{selectedEvidence.properties.object_type}</span>
                </div>
              )}
              
              <div className="detail-group">
                <label>Coordinates:</label>
                <span>
                  {selectedEvidence.geometry.coordinates[1].toFixed(6)}, 
                  {selectedEvidence.geometry.coordinates[0].toFixed(6)}
                </span>
              </div>
              
              <div className="detail-group">
                <label>Created:</label>
                <span>{formatDate(selectedEvidence.properties.created_at)}</span>
              </div>
              
              {selectedEvidence.properties.mime_type?.startsWith('image/') && (
                <div className="thumbnail-container">
                  <EvidenceThumbnail evidenceFile={selectedEvidence.properties} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Component to handle thumbnail display with presigned URLs
const EvidenceThumbnail = ({ evidenceFile }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        setLoading(true);
        // Use MinIO object name to get presigned URL
        if (!evidenceFile.minio_object_name) {
          setError('No file object name available');
          return;
        }
        const response = await axios.get(`/api/v1/files/${evidenceFile.minio_object_name}`);
        if (response.data && response.data.presigned_url) {
          setThumbnailUrl(response.data.presigned_url);
        }
      } catch (err) {
        console.error('Failed to fetch thumbnail:', err);
        setError('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    if (evidenceFile.mime_type?.startsWith('image/')) {
      fetchThumbnail();
    } else {
      setLoading(false);
    }
  }, [evidenceFile]);

  if (!evidenceFile.mime_type?.startsWith('image/')) {
    return <p>Preview not available for this file type</p>;
  }

  if (loading) return <p>Loading preview...</p>;
  if (error) return <p>{error}</p>;
  if (!thumbnailUrl) return <p>No preview available</p>;

  return (
    <div className="thumbnail">
      <img 
        src={thumbnailUrl} 
        alt={evidenceFile.filename}
        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
        onError={() => setError('Failed to load image')}
      />
    </div>
  );
};

export default EvidenceMap;