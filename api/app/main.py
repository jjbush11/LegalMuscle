from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from uuid import uuid4
import shutil
import tempfile
import zipfile
import hashlib
import json
import yaml # For eyeWitness
import os
from typing import List, Optional, Dict, Any

app = FastAPI(
    title="Evidence‑MVP",
    description="API for evidence collection and management",
    version="0.1.0",
)

@app.get("/health")
async def health_check():
    """Health check endpoint to verify API is running."""
    return {"status": "ok"}

class FileMetadata(BaseModel):
    filename: str
    sha256: str

class Manifest(BaseModel):
    files: List[FileMetadata]
    # Add other Tella manifest fields if needed

class EyeWitnessMetadataFile(BaseModel):
    file_name: str # Note: field name often 'file_name' in eyeWitness examples
    sha256: str
    # Add other eyeWitness metadata fields if needed

class EyeWitnessMetadata(BaseModel):
    files: List[EyeWitnessMetadataFile]
    # Add other eyeWitness top-level fields if needed

async def calculate_sha256(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

@app.post("/api/v1/upload")
async def upload_evidence(file: UploadFile = File(...)):
    """
    Accepts a ZIP file, validates its contents against a manifest,
    and prepares it for storage.
    P5-T1: Strict upload validation
    """

    print("james")

    # Allows for multiple content types for ZIP files
    allowed_zip_types = ["application/zip", "application/x-zip-compressed", "application/x-zip"]
    if file.content_type not in allowed_zip_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported Media Type: {file.content_type}. Only ZIP files ({', '.join(allowed_zip_types)}) are allowed."
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_file_path = f"{temp_dir}/{file.filename}"
        with open(zip_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extracted_files_path = f"{temp_dir}/extracted"
        try:
            with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                zip_ref.extractall(extracted_files_path)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Invalid ZIP file.")

        manifest_data: Optional[Dict[str, Any]] = None
        parsed_manifest: Optional[Manifest] = None
        parsed_eyewitness_metadata: Optional[EyeWitnessMetadata] = None
        is_tella_format = False
        is_eyewitness_format = False

        # Determine manifest type by checking for file existence in the ZIP root
        # Use zipfile.Path for robust checking within the archive before extraction for this specific check
        # However, we've already extracted, so we check the extracted_files_path
        manifest_json_path = f"{extracted_files_path}/manifest.json"
        metadata_yaml_path = f"{extracted_files_path}/metadata.yaml"

        # Check which manifest file exists in the root of the extracted archive
        if os.path.exists(manifest_json_path):
            try:
                with open(manifest_json_path, 'r') as f:
                    manifest_content = json.load(f)
                parsed_manifest = Manifest(**manifest_content)
                is_tella_format = True
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid manifest.json: Not valid JSON.")
            except Exception as e: # Covers Pydantic validation errors
                raise HTTPException(status_code=400, detail=f"Invalid manifest.json: {e}")
        elif os.path.exists(metadata_yaml_path):
            try:
                with open(metadata_yaml_path, 'r') as f:
                    metadata_content = yaml.safe_load(f)
                # Basic check, eyeWitness structure can vary.
                if not metadata_content or "files" not in metadata_content:
                     raise HTTPException(status_code=400, detail="Invalid metadata.yaml: Missing 'files' list or empty.")
                if not isinstance(metadata_content.get('files'), list):
                    raise HTTPException(status_code=400, detail="Invalid metadata.yaml: 'files' is not a list.")
                parsed_eyewitness_metadata = EyeWitnessMetadata(**metadata_content)
                is_eyewitness_format = True
            except yaml.YAMLError:
                raise HTTPException(status_code=400, detail="Invalid metadata.yaml: Not valid YAML.")
            except Exception as e: # Covers Pydantic validation errors
                raise HTTPException(status_code=400, detail=f"Invalid metadata.yaml: {e}")
        else:
            raise HTTPException(status_code=400, detail="Missing manifest.json (Tella) or metadata.yaml (eyeWitness) in ZIP root.")

        validation_errors = []
        processed_files_metadata = []
        files_in_zip_to_check = []

        # List files in the extracted directory, excluding the manifest/metadata itself
        for root, _, files_in_current_dir in os.walk(extracted_files_path):
            for name in files_in_current_dir:
                full_path = os.path.join(root, name)
                relative_path = os.path.relpath(full_path, extracted_files_path)
                # Normalize path separators for consistency
                normalized_relative_path = relative_path.replace('\\', '/')

                if is_tella_format and normalized_relative_path == "manifest.json":
                    continue
                if is_eyewitness_format and normalized_relative_path == "metadata.yaml":
                    continue
                files_in_zip_to_check.append(normalized_relative_path)
        
        manifest_file_entries = {}
        if is_tella_format and parsed_manifest:
            manifest_file_entries = {mf.filename: mf.sha256 for mf in parsed_manifest.files}
        elif is_eyewitness_format and parsed_eyewitness_metadata:
            manifest_file_entries = {mf.file_name: mf.sha256 for mf in parsed_eyewitness_metadata.files}

        # Validate files listed in the manifest against those in the ZIP
        for manifest_filename, manifest_sha256 in manifest_file_entries.items():
            normalized_manifest_filename = manifest_filename.replace('\\', '/')
            if normalized_manifest_filename not in files_in_zip_to_check:
                validation_errors.append(f"File '{normalized_manifest_filename}' listed in manifest but not found in ZIP.")
                continue
            
            file_to_check_full_path = os.path.join(extracted_files_path, normalized_manifest_filename)
            calculated_hash = await calculate_sha256(file_to_check_full_path)

            if calculated_hash.lower() != manifest_sha256.lower():
                validation_errors.append(
                    f"SHA-256 mismatch for '{normalized_manifest_filename}': "
                    f"Expected {manifest_sha256}, Got {calculated_hash}"
                )
            else:
                processed_files_metadata.append({"filename": normalized_manifest_filename, "sha256": calculated_hash})

        # Check for files in ZIP that are not listed in the manifest
        for zip_filepath_str in files_in_zip_to_check:
            normalized_zip_filepath = zip_filepath_str.replace('\\', '/')
            if normalized_zip_filepath not in manifest_file_entries:
                validation_errors.append(f"File '{normalized_zip_filepath}' found in ZIP but not listed in manifest.")

        if validation_errors:
            return JSONResponse(
                status_code=400,
                content={"detail": "Upload rejected due to validation errors.", "errors": validation_errors}
            )

    # If validation passes, proceed with next steps (P6, P7, P8)
    return {
        "id": str(uuid4()), 
        "message": "ZIP validated successfully.",
        "processed_files": processed_files_metadata,
        "original_filename": file.filename
    }
