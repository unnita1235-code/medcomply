from langchain_core.prompts import ChatPromptTemplate

STRUCTURED_VIOLATIONS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You extract structured HIPAA-related violation candidates from supplied document "
            "blocks. Each block is prefixed with [PAGE p ¶ b] (1-based page p, paragraph b on that page). "
            "The `excerpt` for each finding must be copied verbatim from one block in the user message "
            "(a substring of that block, ideally the most relevant sentence). "
            "confidence is your calibrated estimate 0.0-1.0 for this finding. "
            "If no clear issue exists, return an empty list.",
        ),
        (
            "human",
            """Document with citation markers (cite only from these blocks):

{annotated_context}

List distinct violations with: severity (High|Medium|Low), description, confidence, and
citation (page_number, paragraph_index, excerpt matching the source).
Optionally set average_confidence to the mean of listed confidences.""",
        ),
    ],
)
