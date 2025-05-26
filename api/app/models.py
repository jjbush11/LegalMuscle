"""
Database models for Evidence-MVP
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

Base = declarative_base()


class EvidenceObject(Base):
    """Main evidence object record (ZIP bundles, individual files)"""
    __tablename__ = "evidence_objects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), nullable=True)  # Will be FK when auth is implemented
    object_name = Column(String, nullable=False)  # MinIO object key
    sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    minio_version_id = Column(String, nullable=True)  # MinIO version ID for object lock
    immudb_tx_id = Column(String, nullable=True)  # immudb transaction ID for P8-T1
    
    # Type differentiation
    object_type = Column(String, nullable=False)  # 'proofmode_bundle', 'general_upload', 'tella_bundle', etc.
    
    # Additional metadata
    extra_metadata = Column(JSONB, nullable=True)  # Store parsed metadata as JSON
    
    # Relationship to individual files
    files = relationship("EvidenceFile", back_populates="evidence_object")


class EvidenceFile(Base):
    """Individual files within evidence objects"""
    __tablename__ = "evidence_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    object_id = Column(UUID(as_uuid=True), ForeignKey("evidence_objects.id"), nullable=False)
    filename = Column(String, nullable=False)  # Original filename
    sha256 = Column(String(64), nullable=False)
    
    # Spatial data - PostGIS GEOGRAPHY column for WGS84 coordinates
    geometry = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)
    
    # Temporal data
    captured_at = Column(DateTime, nullable=True)  # When the file was captured/created
    
    # File metadata
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    
    # Additional metadata specific to the file
    extra_metadata = Column(JSONB, nullable=True)
    
    # MinIO storage info
    minio_object_name = Column(String, nullable=True)  # MinIO object key for individual file
    minio_version_id = Column(String, nullable=True)
    
    # Relationship back to evidence object
    evidence_object = relationship("EvidenceObject", back_populates="files")


class ImmudbTransaction(Base):
    """Track immudb ledger transactions for audit trail"""
    __tablename__ = "immudb_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_object_id = Column(UUID(as_uuid=True), ForeignKey("evidence_objects.id"), nullable=False)
    
    # immudb transaction details
    tx_id = Column(String, nullable=False)
    tx_hash = Column(String, nullable=True)
    
    # Transaction payload hash
    payload_hash = Column(String(64), nullable=False)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Store the actual payload for reference
    payload = Column(JSONB, nullable=False)
