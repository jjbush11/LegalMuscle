import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // App Header
      "app.title": "Evidence MVP",
      "app.subtitle": "Secure, tamper-evident evidence collection system",
      "app.footer": "Evidence MVP Project",
      
      // Navigation
      "nav.upload": "Upload Evidence",
      "nav.map": "Evidence Map",
      "nav.dossier": "Generate Dossier",
      "nav.back": "Back",
      "nav.backToUpload": "Back to Upload",
      
      // Language Toggle
      "language.toggle": "Language",
      "language.english": "English",
      "language.spanish": "Español",
      
      // File Upload
      "upload.title": "Upload Evidence Package",
      "upload.type.general": "General Upload (ZIP/Images)",
      "upload.type.proofmode": "ProofMode ZIP (with GPG verification)",
      "upload.description.general": "Select a ZIP archive with manifest or individual media files.",
      "upload.description.proofmode": "Select a ProofMode ZIP file with GPG signatures for forensic verification.",
      "upload.selectFile": "Please select a {{type}} to upload.",
      "upload.button": "Upload {{type}}",
      "upload.uploading": "Uploading...",
      "upload.success": "Upload successful!",
      "upload.failed": "Upload failed",      "upload.selectedFile": "Selected file:",
      "upload.zipRequired": "ProofMode uploads must be ZIP files.",
      "upload.uploadFailed": "Upload failed.",
      "upload.uploadFailedWith": "Upload failed: {{message}}",
      "upload.errors": "Errors: {{errors}}",
        // Upload Results
      "results.title": "Upload Confirmation",
      "results.id": "ID:",
      "results.originalFilename": "Original Filename:",
      "results.storedAs": "Stored as:",
      "results.proofmodeBundle": "ProofMode Bundle:",
      "results.bundleSha256": "Bundle SHA256:",
      "results.mediaFiles": "Media Files:",
      "results.generatedThumbnails": "Generated Thumbnails:",
      "results.signatureVerification": "Signature Verification:",
      "results.status": "Status:",
      "results.valid": "✅ Valid",
      "results.invalid": "❌ Invalid",
      "results.validatedFiles": "Validated Files:",
      
      // Evidence Map
      "map.title": "Evidence Locations",
      "map.loading": "Loading evidence data...",
      "map.loadingMap": "Loading evidence map...",
      "map.error": "Error loading data",
      "map.noData": "No location data available",
      "map.noEvidence": "No evidence with location data found.",
      "map.itemsCount": "{{count}} evidence items with GPS coordinates",
      "map.selected": "{{count}} selected",
      "map.selectAll": "Select All",
      "map.clearSelection": "Clear Selection",
      "map.generateDossier": "Generate Dossier",
      
      // Evidence Details
      "evidence.details": "Evidence Details",
      "evidence.selectForDossier": "Select for dossier",
      "evidence.sha256": "SHA256 Hash:",
      "evidence.capturedDate": "Captured Date:",
      "evidence.fileSize": "File Size:",
      "evidence.mimeType": "MIME Type:",
      "evidence.objectType": "Object Type:",
      "evidence.coordinates": "Coordinates:",
      "evidence.created": "Created:",
      "evidence.location": "Location:",
      "evidence.size": "Size:",
      "evidence.filename": "Filename:",
      "evidence.captured": "Captured:",
      
      // Dossier Manager
      "dossier.title": "Generate Evidence Dossier",
      "dossier.subtitle": "Select evidence items to include in your courtroom dossier",
      "dossier.loading": "Loading evidence data...",
      "dossier.error": "Error loading data",
      "dossier.itemsCount": "{{count}} items",
      "dossier.selectedCount": "{{count}} selected",
      "dossier.search": "Search by filename, SHA256, or date...",
      "dossier.sortBy": "Sort by:",
      "dossier.sortUploadDate": "Sort by Upload Date",
      "dossier.sortCaptureDate": "Sort by Capture Date",
      "dossier.sortFilename": "Sort by Filename",
      "dossier.sortSha256": "Sort by SHA256",
      "dossier.selectAll": "Select All",
      "dossier.clearAll": "Clear All",
      "dossier.noEvidence": "No evidence items found",
      
      // Dossier Generator
      "generator.title": "Generate Evidence Dossier",
      "generator.caseId": "Case ID (Optional):",
      "generator.caseIdPlaceholder": "Enter case identifier (e.g., CASE-2025-001)",
      "generator.selectedEvidence": "Selected Evidence ({{count}} items)",
      "generator.noEvidence": "No evidence items selected",
      "generator.generating": "Generating dossier...",
      "generator.generate": "Generate Dossier",
      "generator.cancel": "Cancel",
      "generator.success": "Dossier generated successfully!",
      "generator.caseIdLabel": "Case ID:",
      "generator.downloadDocx": "📄 Download DOCX",
      "generator.downloadPdf": "📄 Download PDF",
      "generator.close": "Close",
      
      // Common
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
      "common.cancel": "Cancel",
      "common.close": "Close",
      "common.select": "Select",
      "common.unknown": "Unknown",
      "common.yes": "Yes",
      "common.no": "No",
      
      // File types and formats
      "format.mb": "{{size}} MB",
      "format.kb": "{{size}} KB",
      "format.bytes": "{{size}} bytes"
    }
  },
  es: {
    translation: {
      // App Header
      "app.title": "Evidence MVP",
      "app.subtitle": "Sistema seguro de recolección de evidencia a prueba de manipulación",
      "app.footer": "Proyecto Evidence MVP",
      
      // Navigation
      "nav.upload": "Subir Evidencia",
      "nav.map": "Mapa de Evidencia",
      "nav.dossier": "Generar Expediente",
      "nav.back": "Atrás",
      "nav.backToUpload": "Volver a Subir",
      
      // Language Toggle
      "language.toggle": "Idioma",
      "language.english": "English",
      "language.spanish": "Español",
      
      // File Upload
      "upload.title": "Subir Paquete de Evidencia",
      "upload.type.general": "Subida General (ZIP/Imágenes)",
      "upload.type.proofmode": "ZIP ProofMode (con verificación GPG)",
      "upload.description.general": "Seleccione un archivo ZIP con manifiesto o archivos multimedia individuales.",
      "upload.description.proofmode": "Seleccione un archivo ZIP ProofMode con firmas GPG para verificación forense.",
      "upload.selectFile": "Por favor seleccione un {{type}} para subir.",
      "upload.button": "Subir {{type}}",
      "upload.uploading": "Subiendo...",
      "upload.success": "¡Subida exitosa!",
      "upload.failed": "Error en la subida",      "upload.selectedFile": "Archivo seleccionado:",
      "upload.zipRequired": "Las subidas ProofMode deben ser archivos ZIP.",
      "upload.uploadFailed": "Error en la subida.",
      "upload.uploadFailedWith": "Error en la subida: {{message}}",
      "upload.errors": "Errores: {{errors}}",
        // Upload Results
      "results.title": "Confirmación de Subida",
      "results.id": "ID:",
      "results.originalFilename": "Nombre de Archivo Original:",
      "results.storedAs": "Almacenado como:",
      "results.proofmodeBundle": "Paquete ProofMode:",
      "results.bundleSha256": "SHA256 del Paquete:",
      "results.mediaFiles": "Archivos Multimedia:",
      "results.generatedThumbnails": "Miniaturas Generadas:",
      "results.signatureVerification": "Verificación de Firma:",
      "results.status": "Estado:",
      "results.valid": "✅ Válido",
      "results.invalid": "❌ Inválido",
      "results.validatedFiles": "Archivos Validados:",
      
      // Evidence Map
      "map.title": "Ubicaciones de Evidencia",
      "map.loading": "Cargando datos de evidencia...",
      "map.loadingMap": "Cargando mapa de evidencia...",
      "map.error": "Error al cargar datos",
      "map.noData": "No hay datos de ubicación disponibles",
      "map.noEvidence": "No se encontró evidencia con datos de ubicación.",
      "map.itemsCount": "{{count}} elementos de evidencia con coordenadas GPS",
      "map.selected": "{{count}} seleccionados",
      "map.selectAll": "Seleccionar Todo",
      "map.clearSelection": "Limpiar Selección",
      "map.generateDossier": "Generar Expediente",
      
      // Evidence Details
      "evidence.details": "Detalles de Evidencia",
      "evidence.selectForDossier": "Seleccionar para expediente",
      "evidence.sha256": "Hash SHA256:",
      "evidence.capturedDate": "Fecha de Captura:",
      "evidence.fileSize": "Tamaño del Archivo:",
      "evidence.mimeType": "Tipo MIME:",
      "evidence.objectType": "Tipo de Objeto:",
      "evidence.coordinates": "Coordenadas:",
      "evidence.created": "Creado:",
      "evidence.location": "Ubicación:",
      "evidence.size": "Tamaño:",
      "evidence.filename": "Nombre del Archivo:",
      "evidence.captured": "Capturado:",
      
      // Dossier Manager
      "dossier.title": "Generar Expediente de Evidencia",
      "dossier.subtitle": "Seleccione elementos de evidencia para incluir en su expediente judicial",
      "dossier.loading": "Cargando datos de evidencia...",
      "dossier.error": "Error al cargar datos",
      "dossier.itemsCount": "{{count}} elementos",
      "dossier.selectedCount": "{{count}} seleccionados",
      "dossier.search": "Buscar por nombre de archivo, SHA256 o fecha...",
      "dossier.sortBy": "Ordenar por:",
      "dossier.sortUploadDate": "Ordenar por Fecha de Subida",
      "dossier.sortCaptureDate": "Ordenar por Fecha de Captura",
      "dossier.sortFilename": "Ordenar por Nombre de Archivo",
      "dossier.sortSha256": "Ordenar por SHA256",
      "dossier.selectAll": "Seleccionar Todo",
      "dossier.clearAll": "Limpiar Todo",
      "dossier.noEvidence": "No se encontraron elementos de evidencia",
      
      // Dossier Generator
      "generator.title": "Generar Expediente de Evidencia",
      "generator.caseId": "ID del Caso (Opcional):",
      "generator.caseIdPlaceholder": "Ingrese identificador del caso (ej., CASO-2025-001)",
      "generator.selectedEvidence": "Evidencia Seleccionada ({{count}} elementos)",
      "generator.noEvidence": "No hay elementos de evidencia seleccionados",
      "generator.generating": "Generando expediente...",
      "generator.generate": "Generar Expediente",
      "generator.cancel": "Cancelar",
      "generator.success": "¡Expediente generado exitosamente!",
      "generator.caseIdLabel": "ID del Caso:",
      "generator.downloadDocx": "📄 Descargar DOCX",
      "generator.downloadPdf": "📄 Descargar PDF",
      "generator.close": "Cerrar",
      
      // Common
      "common.loading": "Cargando...",
      "common.error": "Error",
      "common.success": "Éxito",
      "common.cancel": "Cancelar",
      "common.close": "Cerrar",
      "common.select": "Seleccionar",
      "common.unknown": "Desconocido",
      "common.yes": "Sí",
      "common.no": "No",
      
      // File types and formats
      "format.mb": "{{size}} MB",
      "format.kb": "{{size}} KB",
      "format.bytes": "{{size}} bytes"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
