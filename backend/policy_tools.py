import re

from langchain_core.tools import tool

from rag import HR_Policy_rag_chain, Healthcare_Policy_rag_chain


def _clean_policy_answer(result) -> str:
    if isinstance(result, dict):
        if "answer" in result and isinstance(result["answer"], str):
            result = result["answer"]
        elif "output" in result and isinstance(result["output"], str):
            result = result["output"]
        else:
            result = str(result)

    if hasattr(result, "content"):
        result = result.content

    text = str(result).strip()
    if not text:
        return "I could not find this in the document."

    text = re.sub(
        r"(?is)^\s*based on the retrieved context\s*[:\-]?\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    text = text.replace("\n ", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


@tool
def query_hr_policy(question: str) -> str:
    """Use this tool to search internal Human Resources policies, rules, code of conduct, work hours, and leave policies."""
    result = HR_Policy_rag_chain.invoke({"input": question})
    return _clean_policy_answer(result)


@tool
def query_healthcare_policy(question: str) -> str:
    """Use this tool to search company medical insurance, healthcare coverage limits, claim processes, and treatment exclusions."""
    result = Healthcare_Policy_rag_chain.invoke({"input": question})
    return _clean_policy_answer(result)


__all__ = ["query_hr_policy", "query_healthcare_policy"]
