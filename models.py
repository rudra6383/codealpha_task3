from pydantic import BaseModel
from typing import Optional, List

class Report(BaseModel):
    id: int
    name: str
    type: str
    tags: Optional[List[str]] = []

class UploadFile(BaseModel):
    filename: str
    content: str
