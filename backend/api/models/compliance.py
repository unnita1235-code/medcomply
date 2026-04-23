from pydantic import BaseModel, Field, field_validator


class ViolationCitation(BaseModel):
    """Exact source location the UI can use to jump the PDF viewer."""

    page_number: int = Field(ge=1, description="1-based page number in the PDF")
    paragraph_index: int = Field(
        ge=1,
        description="Paragraph / block index on that page (matches prompt markers).",
    )
    excerpt: str = Field(
        description="Verbatim quote from the cited block (the paragraph text as in the source).",
    )


class ViolationItem(BaseModel):
    severity: str
    description: str
    confidence: float = Field(ge=0, le=1)
    citation: ViolationCitation


class StructuredViolations(BaseModel):
    violations: list[ViolationItem] = Field(default_factory=list)
    average_confidence: float | None = Field(
        default=None,
        description="Optional aggregate confidence reported by the model.",
    )

    @field_validator("average_confidence")
    @classmethod
    def avg_bounds(cls, v: float | None) -> float | None:
        if v is None:
            return v
        return max(0, min(1, v))
