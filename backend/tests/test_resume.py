def test_resume_upload_rejects_invalid_extension(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/resumes",
        headers=auth_headers,
        files={"file": ("resume.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Only PDF and DOCX resumes are supported."


def test_resume_upload_extracts_docx_text(
    client,
    auth_headers,
    sample_docx_bytes,
    test_settings,
) -> None:
    response = client.post(
        "/api/v1/resumes",
        headers=auth_headers,
        files={
            "file": (
                "resume.docx",
                sample_docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["original_filename"] == "resume.docx"
    assert "Jane Doe" in body["extracted_text"]
    assert body["profile"]["full_name"] == "Jane Doe"
    assert body["profile"]["summary"] == "Python Engineer"
    assert (test_settings.resume_upload_dir).exists()
