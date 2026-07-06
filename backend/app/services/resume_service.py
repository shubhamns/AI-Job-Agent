from __future__ import annotations

import io
import zipfile
from pathlib import Path
from uuid import uuid4
from xml.etree import ElementTree

from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader

from app.core.config import Settings

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_CONTENT_TYPES = {
    ".pdf": {"application/pdf"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
    },
}
WORD_NAMESPACE = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


class ResumePayload:
    def __init__(
        self,
        original_filename: str,
        stored_filename: str,
        content_type: str,
        file_size_bytes: int,
        extracted_text: str,
        storage_path: str,
    ):
        self.original_filename = original_filename
        self.stored_filename = stored_filename
        self.content_type = content_type
        self.file_size_bytes = file_size_bytes
        self.extracted_text = extracted_text
        self.storage_path = storage_path


async def process_resume_upload(upload: UploadFile, settings: Settings) -> ResumePayload:
    original_filename = Path(upload.filename or "").name
    extension = Path(original_filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX resumes are supported.",
        )

    content = await upload.read()
    file_size_bytes = len(content)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if file_size_bytes > settings.max_resume_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded resume exceeds the file size limit.",
        )

    _validate_content_type(extension, upload.content_type)
    _validate_file_signature(extension, content)

    extracted_text = extract_resume_text(content=content, extension=extension)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to extract text from the uploaded resume.",
        )

    stored_filename = f"{uuid4().hex}{extension}"
    upload_dir = settings.resume_upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    storage_path = upload_dir / stored_filename
    storage_path.write_bytes(content)

    return ResumePayload(
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=upload.content_type or _default_content_type(extension),
        file_size_bytes=file_size_bytes,
        extracted_text=extracted_text.strip(),
        storage_path=str(storage_path),
    )


def extract_resume_text(*, content: bytes, extension: str) -> str:
    if extension == ".pdf":
        return _extract_pdf_text(content)
    if extension == ".docx":
        return _extract_docx_text(content)
    raise ValueError(f"Unsupported file extension: {extension}")


def _validate_content_type(extension: str, content_type: str | None) -> None:
    if content_type and content_type not in ALLOWED_CONTENT_TYPES[extension]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file content type does not match a supported resume format.",
        )


def _validate_file_signature(extension: str, content: bytes) -> None:
    if extension == ".pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PDF file.")

    if extension == ".docx":
        if not zipfile.is_zipfile(io.BytesIO(content)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid DOCX file.",
            )
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            if "word/document.xml" not in archive.namelist():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid DOCX file.",
                )


def _extract_pdf_text(content: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as error:  # pragma: no cover - defensive library wrapper
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF file.",
        ) from error

    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(part for part in parts if part).strip()


def _extract_docx_text(content: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
    except Exception as error:  # pragma: no cover - defensive library wrapper
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid DOCX file.",
        ) from error

    root = ElementTree.fromstring(document_xml)
    paragraphs = []
    for paragraph in root.findall(".//w:p", WORD_NAMESPACE):
        texts = [node.text for node in paragraph.findall(".//w:t", WORD_NAMESPACE) if node.text]
        if texts:
            paragraphs.append("".join(texts))
    return "\n".join(paragraphs).strip()


def _default_content_type(extension: str) -> str:
    return next(iter(ALLOWED_CONTENT_TYPES[extension]))
