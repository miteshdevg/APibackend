# convert.py
import sys
from pdf2docx import Converter

pdf_path = sys.argv[1]
docx_path = sys.argv[2]

try:
    cv = Converter(pdf_path)
    cv.convert(docx_path)
    cv.close()
    print("success")
except Exception as e:
    print(f"error: {str(e)}")
