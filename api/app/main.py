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
from minio import Minio
from minio.error import S3Error
from datetime import timedelta, datetime, timezone # Added timezone
import mimetypes # Ensure mimetypes is imported

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

# MinIO Configuration - Load from environment variables
MINIO_HOST = os.getenv("MINIO_HOST", "localhost")
MINIO_PORT = os.getenv("MINIO_PORT", "9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin") # Default for local dev
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin") # Default for local dev
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "evidence")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "False").lower() == "true"

print(f"Attempting to connect to MinIO at: {MINIO_HOST}:{MINIO_PORT} with Access Key: {MINIO_ACCESS_KEY} for Bucket: {MINIO_BUCKET}") # Diagnostic print

try:
    minio_client = Minio(
        f"{MINIO_HOST}:{MINIO_PORT}",
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_USE_SSL
    )
    # Check if bucket exists, create if not (though init script should handle this)
    found = minio_client.bucket_exists(MINIO_BUCKET)
    if not found:
        # This is a fallback, the ops/minio_init.sh script is the primary way to create and configure the bucket.
        # For production, rely on the init script to set locking and retention.
        # minio_client.make_bucket(MINIO_BUCKET) # Simple make_bucket won't set retention/locking.
        print(f"Warning: MinIO bucket '{MINIO_BUCKET}' not found. It should be created and configured by ops/minio_init.sh.")
except Exception as e:
    print(f"Error initializing MinIO client: {e}")
    minio_client = None # Set to None if initialization fails

@app.post("/api/v1/upload")
async def upload_evidence(file: UploadFile = File(...)):
    """
    Accepts a ZIP file, validates its contents against a manifest,
    or accepts other file types directly.
    P5-T1: Strict upload validation (modified for flexibility)
    """

    print("james")
    print("after james")

    # Allows for multiple content types for ZIP files
    allowed_zip_types = ["application/zip", "application/x-zip-compressed", "application/x-zip"]
    is_zip_file = file.content_type in allowed_zip_types

    print("before if")
    if not is_zip_file:
        print("in non zip")
        # Handle non-ZIP files
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = f"{temp_dir}/{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            calculated_hash = await calculate_sha256(file_path)
            
            return {
                "id": str(uuid4()),
                "message": "File uploaded successfully.",
                "processed_files": [{"filename": file.filename, "sha256": calculated_hash, "is_standalone_file": True}],
                "original_filename": file.filename,
                "content_type": file.content_type
            }

    # Proceed with ZIP file processing if it's a ZIP file
    # The existing ZIP handling logic starts here
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
    # P6-T2: Upload to MinIO with retention
    uploaded_minio_objects = []
    if not minio_client:
        raise HTTPException(status_code=500, detail="MinIO client not initialized. Check server logs.")

    # Determine the files to upload to MinIO
    # For ZIPs, it's the validated files. For standalone, it's the single uploaded file.
    files_to_upload_to_minio = []
    if is_zip_file: # This variable needs to be available from the earlier part of the function
        for pf_meta in processed_files_metadata:
            # We need the full path to the file in the temp directory
            # Assuming processed_files_metadata stores relative paths from extracted_files_path
            file_full_path = os.path.join(extracted_files_path, pf_meta["filename"])
            files_to_upload_to_minio.append({"path": file_full_path, "name": pf_meta["filename"]})
    else:
        # For non-ZIP files, the file_path was defined in the non-ZIP handling block
        # We need to ensure file_path and original filename are available here
        # This requires refactoring how file_path is handled for non-ZIPs or passing it through
        # For now, let's assume we re-construct or pass necessary info.
        # This part needs careful review of variable scope from the non-ZIP path.
        # A simple way: if not is_zip_file, the temp_dir and file.filename are from that block.
        # However, the temp_dir for non-ZIPs is different. This needs a cleaner pass.

        # Let's assume for now that if it's not a zip, the `file` object is the one to upload directly
        # And we need to save it to a temporary location again to get its size and stream for MinIO
        # This is inefficient; ideally, we'd use the already saved temp file.
        # Re-evaluating the non-ZIP path for MinIO upload:
        # The non-ZIP path currently returns early. We need to integrate MinIO upload there or restructure.

        # For now, let's focus on the ZIP path for MinIO integration as per P6-T2
        # and adjust the non-ZIP path later if direct MinIO upload is needed for them too.
        pass # Placeholder for non-ZIP MinIO upload logic

    # This loop is primarily for validated files from a ZIP
    if is_zip_file:
        for item in files_to_upload_to_minio:
            object_name_in_minio = f"uploads/{uuid4()}/{item['name']}" # Unique path in MinIO
            file_path_to_upload = item['path']
            try:
                with open(file_path_to_upload, 'rb') as file_data:
                    file_stat = os.stat(file_path_to_upload)
                    # Calculate retention date: +7 years from now
                    # MinIO SDK expects retain_until_date in ISO 8601 format, e.g., "YYYY-MM-DDTHH:MM:SSZ"
                    # The mc command uses relative time like +7y, but SDK needs absolute.
                    # However, for put_object with bucket default retention, we might not need to set it per object
                    # if the bucket's default retention is correctly set to COMPLIANCE and the desired duration.
                    # Let's assume the bucket default is sufficient as per P6-T1.
                    # If explicit per-object retention is needed: 
                    # retain_until_date = datetime.utcnow() + timedelta(days=2555) # Approx 7 years
                    # headers = {
                    #     "x-amz-object-lock-mode": "COMPLIANCE",
                    #     "x-amz-object-lock-retain-until-date": retain_until_date.isoformat() + "Z"
                    # }
                    # For now, relying on bucket default, so no specific headers here for lock/retention.

                    result = minio_client.put_object(
                        MINIO_BUCKET,
                        object_name_in_minio,
                        file_data,
                        length=file_stat.st_size,
                        # headers=headers # Uncomment if explicit per-object retention needed
                        # content_type will be auto-detected by MinIO or can be set explicitly
                    )
                uploaded_minio_objects.append({
                    "minio_object_name": object_name_in_minio,
                    "original_filename": item['name'],
                    "version_id": result.version_id,
                    "etag": result.etag
                })
                # TODO: P6-T2 Store returned version_id in DB (requires DB schema and connection)
            except S3Error as exc:
                print(f"Error uploading {item['name']} to MinIO: {exc}")
                # Decide on error handling: raise HTTPException or collect errors
                raise HTTPException(status_code=500, detail=f"Failed to upload {item['name']} to MinIO: {exc}")
            except FileNotFoundError:
                raise HTTPException(status_code=500, detail=f"Temporary file {item['name']} not found for MinIO upload.")

    # Adjusting the return for non-ZIP files if they were handled by the early return
    if not is_zip_file:
        # The original non-ZIP logic already returned. If we want it to go through MinIO,
        # that logic needs to be integrated here. For now, this part of P6-T2 applies to ZIPs.
        # If a non-ZIP file was uploaded, the `processed_files_metadata` would be from that path.
        # Let's assume the `upload_evidence` function is refactored so that `is_zip_file` correctly gates
        # the MinIO upload logic for ZIP contents, and a separate path handles non-ZIPs to MinIO if desired.

        # For a single non-ZIP file, the MinIO upload logic would be similar but simpler:
        # This is a conceptual placement; the actual temp file path needs to be passed correctly.
        # Example for a single non-ZIP file (if it didn't return early):
        # with tempfile.NamedTemporaryFile(delete=False) as tmp_upload_file:
        #     shutil.copyfileobj(file.file, tmp_upload_file)
        #     tmp_upload_file_path = tmp_upload_file.name
        # file.file.seek(0) # Reset stream if needed elsewhere
        # object_name_in_minio = f"uploads/{uuid4()}/{file.filename}"
        # try:
        #     with open(tmp_upload_file_path, 'rb') as file_data:
        #         file_stat = os.stat(tmp_upload_file_path)
        #         result = minio_client.put_object(MINIO_BUCKET, object_name_in_minio, file_data, length=file_stat.st_size)
        #     uploaded_minio_objects.append({
        #         "minio_object_name": object_name_in_minio,
        #         "original_filename": file.filename,
        #         "version_id": result.version_id,
        #         "etag": result.etag
        #     })
        # finally:
        #     os.unlink(tmp_upload_file_path)
        # This is now part of the main non-ZIP path:
        pass

    # Modify the successful response to include MinIO upload details
    response_payload = {
        "id": str(uuid4()), 
        "message": "File(s) processed and uploaded to MinIO successfully." if uploaded_minio_objects else "ZIP validated successfully. No files for MinIO or MinIO upload skipped.",
        "processed_files_metadata": processed_files_metadata, # From manifest validation
        "minio_uploads": uploaded_minio_objects, # Details of files uploaded to MinIO
        "original_filename": file.filename
    }
    if not is_zip_file and not uploaded_minio_objects:
        # This case means it was a non-zip file, and it returned early before minio logic
        # The original return for non-zip files needs to be adjusted if they are to be included here.
        # For now, if it's a non-zip, the early return in the beginning of the function handles it.
        # This part of the code will primarily be hit by ZIP file processing.
        # To make it cleaner, the non-ZIP path should also prepare `uploaded_minio_objects`
        # if it uploads to MinIO.
        # Let's refine the non-ZIP path to include MinIO upload:
        pass # Covered by the refactor below

    return response_payload


@app.get("/api/v1/files/{object_name:path}") # Use path converter for object_name
async def get_file_presigned_url(object_name: str):
    """P6-T3: Implement GET /api/v1/files/{object_name} returning presigned GET link valid 15 min."""
    if not minio_client:
        raise HTTPException(status_code=500, detail="MinIO client not initialized. Check server logs.")

    try:
        # Generate a presigned URL for GET request, valid for 15 minutes (900 seconds)
        presigned_url = minio_client.presigned_get_object(
            MINIO_BUCKET,
            object_name, # This should be the full MinIO object name, e.g., uploads/uuid/filename.jpg
            expires=timedelta(minutes=15)
        )
        return {"object_name": object_name, "presigned_url": presigned_url}
    except S3Error as exc:
        print(f"Error generating presigned URL for {object_name}: {exc}")
        # Check if the error is due to the object not being found
        if "NoSuchKey" in str(exc) or "key does not exist" in str(exc).lower():
            raise HTTPException(status_code=404, detail=f"File '{object_name}' not found in MinIO bucket '{MINIO_BUCKET}'.")
        raise HTTPException(status_code=500, detail=f"Could not generate presigned URL for {object_name}: {exc}")


# Refactoring the upload_evidence for cleaner MinIO integration for both ZIP and non-ZIP
@app.post("/api/v1/upload_refined") # Keeping old one for now, will replace
async def upload_evidence_refined(file: UploadFile = File(...)):
    if not minio_client:
        raise HTTPException(status_code=500, detail="MinIO client not initialized. Check server logs.")

    upload_id = str(uuid4())
    processed_files_metadata_list = [] # For files validated against manifest (ZIPs) or basic info (non-ZIPs)
    minio_upload_results = []

    # Calculate retain_until_date for MinIO object lock (7 years from now)
    current_utc = datetime.utcnow().replace(tzinfo=timezone.utc) # Make it timezone-aware
    retain_until_date_dt = current_utc.replace(year=current_utc.year + 7)
    retain_until_date_iso = retain_until_date_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

    allowed_zip_types = ["application/zip", "application/x-zip-compressed", "application/x-zip"]
    is_zip_file = file.content_type in allowed_zip_types

    with tempfile.TemporaryDirectory() as temp_dir_root:
        if is_zip_file:
            zip_file_path = os.path.join(temp_dir_root, file.filename)
            with open(zip_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file.file.seek(0) # Reset for potential re-reads if necessary

            extracted_files_path = os.path.join(temp_dir_root, "extracted")
            try:
                with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
                    zip_ref.extractall(extracted_files_path)
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Invalid ZIP file.")

            # ... [Existing manifest parsing and validation logic for ZIP files] ...
            # This logic should populate `validated_files_for_minio` (list of dicts with path and name)
            # and `processed_files_metadata_list` (from manifest validation)
            # For brevity, assuming this part is correctly adapted from the original function:
            manifest_json_path = os.path.join(extracted_files_path, "manifest.json")
            metadata_yaml_path = os.path.join(extracted_files_path, "metadata.yaml")
            parsed_manifest: Optional[Manifest] = None
            parsed_eyewitness_metadata: Optional[EyeWitnessMetadata] = None
            is_tella_format = False
            is_eyewitness_format = False

            if os.path.exists(manifest_json_path):
                try:
                    with open(manifest_json_path, 'r') as f_manifest:
                        manifest_content = json.load(f_manifest)
                    parsed_manifest = Manifest(**manifest_content)
                    is_tella_format = True
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid manifest.json: {e}")
            elif os.path.exists(metadata_yaml_path):
                try:
                    with open(metadata_yaml_path, 'r') as f_yaml:
                        metadata_content = yaml.safe_load(f_yaml)
                    if not metadata_content or "files" not in metadata_content or not isinstance(metadata_content.get('files'), list):
                        raise HTTPException(status_code=400, detail="Invalid metadata.yaml structure.")
                    parsed_eyewitness_metadata = EyeWitnessMetadata(**metadata_content)
                    is_eyewitness_format = True
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid metadata.yaml: {e}")
            else:
                raise HTTPException(status_code=400, detail="Missing manifest (manifest.json or metadata.yaml) in ZIP root.")

            validation_errors = []
            files_in_zip_to_check_paths = []
            for root, _, files_in_dir in os.walk(extracted_files_path):
                for name_in_dir in files_in_dir:
                    full_item_path = os.path.join(root, name_in_dir)
                    relative_item_path = os.path.relpath(full_item_path, extracted_files_path).replace('\\', '/')
                    if (is_tella_format and relative_item_path == "manifest.json") or \
                       (is_eyewitness_format and relative_item_path == "metadata.yaml"):
                        continue
                    files_in_zip_to_check_paths.append(relative_item_path)
            
            manifest_file_entries_map = {}
            if is_tella_format and parsed_manifest:
                manifest_file_entries_map = {mf.filename.replace('\\', '/'): mf.sha256 for mf in parsed_manifest.files}
            elif is_eyewitness_format and parsed_eyewitness_metadata:
                manifest_file_entries_map = {mf.file_name.replace('\\', '/'): mf.sha256 for mf in parsed_eyewitness_metadata.files}

            validated_files_for_minio = [] # list of dicts: {"path": full_path, "name": relative_path_in_zip}

            for manifest_filename, manifest_sha256 in manifest_file_entries_map.items():
                if manifest_filename not in files_in_zip_to_check_paths:
                    validation_errors.append(f"File '{manifest_filename}' in manifest but not in ZIP.")
                    continue
                
                file_to_check_full_path = os.path.join(extracted_files_path, manifest_filename)
                calculated_hash = await calculate_sha256(file_to_check_full_path)

                if calculated_hash.lower() != manifest_sha256.lower():
                    validation_errors.append(f"SHA-256 mismatch for '{manifest_filename}'.")
                else:
                    processed_files_metadata_list.append({"filename": manifest_filename, "sha256": calculated_hash})
                    validated_files_for_minio.append({"path": file_to_check_full_path, "name": manifest_filename})

            for zip_filepath_str in files_in_zip_to_check_paths:
                if zip_filepath_str not in manifest_file_entries_map:
                    validation_errors.append(f"File '{zip_filepath_str}' in ZIP but not in manifest.")
            
            if validation_errors:
                raise HTTPException(status_code=400, content={"detail": "ZIP validation errors.", "errors": validation_errors})

            # Upload validated files from ZIP to MinIO
            for item in validated_files_for_minio:
                # item['name'] is the relative path within the ZIP, use for MinIO object name structure
                minio_object_name = f"uploads/{upload_id}/{item['name']}"
                try:
                    with open(item['path'], 'rb') as file_data_stream:
                        file_stat = os.stat(item['path'])
                        result = minio_client.put_object(
                            MINIO_BUCKET,
                            minio_object_name,
                            file_data_stream,
                            length=file_stat.st_size,
                            content_type=mimetypes.guess_type(item['path'])[0] or 'application/octet-stream',
                            object_lock_mode="COMPLIANCE",
                            object_lock_retain_until_date=retain_until_date_iso
                        )
                    minio_upload_results.append({
                        "minio_object_name": minio_object_name,
                        "original_filename_in_zip": item['name'], # Clarify this is name within zip
                        "version_id": result.version_id, "etag": result.etag
                    })
                    # TODO: Store version_id in DB along with other object metadata
                except S3Error as e_s3:
                    # Consider how to handle partial failures if some files in ZIP upload and others don't
                    raise HTTPException(status_code=500, detail=f"MinIO upload failed for {item['name']} in ZIP: {e_s3}")
        
        else: # Handle non-ZIP files
            temp_file_path = os.path.join(temp_dir_root, file.filename)
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file.file.seek(0)

            calculated_hash = await calculate_sha256(temp_file_path)
            processed_files_metadata_list.append({
                "filename": file.filename, 
                "sha256": calculated_hash, 
                "is_standalone_file": True,
                "content_type": file.content_type
            })
            
            minio_object_name = f"uploads/{upload_id}/{file.filename}"
            try:
                with open(temp_file_path, 'rb') as file_data_stream:
                    file_size = os.path.getsize(temp_file_path)
                    result = minio_client.put_object(
                        MINIO_BUCKET,
                        minio_object_name,
                        file_data_stream,
                        length=file_size,
                        content_type=file.content_type or 'application/octet-stream',
                        object_lock_mode="COMPLIANCE",
                        object_lock_retain_until_date=retain_until_date_iso
                    )
                minio_upload_results.append({
                    "minio_object_name": minio_object_name,
                    "original_filename": file.filename,
                    "version_id": result.version_id, "etag": result.etag,
                    "content_type": file.content_type
                })
                # TODO: Store version_id in DB
            except S3Error as e_s3:
                raise HTTPException(status_code=500, detail=f"MinIO upload failed for {file.filename}: {e_s3}")

    return {
        "id": upload_id,
        "message": "Upload processed and files stored.",
        "original_input_filename": file.filename,
        "is_zip_package": is_zip_file,
        "validation_metadata": processed_files_metadata_list, # Contains SHA256 and filenames
        "minio_storage_details": minio_upload_results # Contains MinIO object names and version IDs
    }

# To make the new endpoint active, you might want to comment out or remove the old @app.post("/api/v1/upload")
# and potentially rename @app.post("/api/v1/upload_refined") to @app.post("/api/v1/upload")
# For now, both exist. Ensure SPA calls the correct one.
