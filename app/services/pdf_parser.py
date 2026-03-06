from PyPDF2 import PdfReader


def extract_text_from_pdf(path: str) -> str:
    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        content = page.extract_text() or ""
        if content.strip():
            pages.append(content.strip())
    return "\n".join(pages).strip()
