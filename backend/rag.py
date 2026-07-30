from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.retrieval import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import OllamaLLM
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import os
os.environ["NO_PROXY"] = "127.0.0.1,localhost"


# Dynamic RAG Assistant Builder


def build_rag_assistant(
    pdf_path,
    index_path,
    prompt_template
):

    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=80
    )

    docs = splitter.split_documents(documents)

    embeddings = OllamaEmbeddings(
        model="nomic-embed-text",
        base_url="http://127.0.0.1:11434"
    )

    if os.path.exists(index_path):

        vectorstore = FAISS.load_local(
            index_path,
            embeddings,
            allow_dangerous_deserialization=True
        )

    else:

        vectorstore = FAISS.from_documents(
            docs,
            embeddings
        )

        vectorstore.save_local(index_path)

    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 6,
            "fetch_k": 20
        }
    )

    llm = OllamaLLM(
        model="llama3"
    )

    prompt = ChatPromptTemplate.from_template(
        prompt_template
    )

    document_chain = create_stuff_documents_chain(
        llm,
        prompt
    )

    rag_chain = create_retrieval_chain(
        retriever,
        document_chain
    )

    return rag_chain


HR_PROMPT = """
You are a Human Resources Policy assistant.

Rules:
1. Answer ONLY from the retrieved context.
2. NEVER assume, infer, or fabricate information.
3. If the information is not available in the context, respond exactly:
   "I could not find this in the document."
4. Return valid Markdown only.
5. Insert a blank line before and after every heading.
6. Insert a blank line before and after every bullet list.
7. Use Markdown headings (#, ##, ###) on separate lines.
8. Use "-" for bullet points.
9. Use "**text**" for emphasis.
10. Never place headings and content on the same line.
11. Never return a single continuous paragraph.

Context:
{context}

Question:
{input}
"""


HEALTHCARE_PROMPT = """
You are a Healthcare Policy assistant.

Rules:
1. Answer ONLY from retrieved context.
2. NEVER assume or infer coverage.
3. If coverage is excluded, explicitly state excluded.
4. If the information is not available in the context, respond exactly:
   "I could not find this in the document."
5. Return valid Markdown only.
6. Insert a blank line before and after every heading.
7. Insert a blank line before and after every bullet list.
8. Use Markdown headings (#, ##, ###) on separate lines.
9. Use "-" for bullet points.
10. Use "**text**" for emphasis.
11. Never place headings and content on the same line.
12. Never return a single continuous paragraph.

Context:
{context}

Question:
{input}
"""


HR_Policy_rag_chain = build_rag_assistant(
    pdf_path="documents/HR Policy Manual.pdf",
    index_path="faiss_index_HR_Policy",
    prompt_template=HR_PROMPT
)


Healthcare_Policy_rag_chain = build_rag_assistant(
    pdf_path="documents/Healthcare Policy.pdf",
    index_path="faiss_index_Healthcare_Policy",
    prompt_template=HEALTHCARE_PROMPT
)


def stream_rag(chain, question):

    for chunk in chain.stream(
        {
            "input": question
        }
    ):

        if "answer" in chunk:
            yield chunk["answer"]


# HR_PDF_loader = PyPDFLoader("documents/HR Policy Manual.pdf")
# HR_Policy_documents = HR_PDF_loader.load()


# HR_Policy_splitter = RecursiveCharacterTextSplitter(
#     chunk_size=500,
#     chunk_overlap=80
# )

# HR_Policy_docs = HR_Policy_splitter.split_documents(HR_Policy_documents)


# HR_Policy_embeddings = OllamaEmbeddings(
#     model="nomic-embed-text"
# )


# if(os.path.exists("faiss_index_HR_Policy")):
#     vectorstore = FAISS.load_local(
#         "faiss_index_HR_Policy",
#         HR_Policy_embeddings,
#         allow_dangerous_deserialization=True
#     )
# else:
#     vectorstore = FAISS.from_documents(
#         HR_Policy_docs,
#         HR_Policy_embeddings
#     )
#     vectorstore.save_local("faiss_index_HR_Policy")


# HR_policy_retriever = vectorstore.as_retriever(
#     search_type="mmr", # Max Marginal Relevance
#     search_kwargs={
#         "k": 6,
#         "fetch_k": 20
#         }
# )


# HR_Policy_llm = OllamaLLM(
#     model="llama3"
# )


# HR_policy_prompt = ChatPromptTemplate.from_template("""
# You are a Human Resources Policy assistant.

# Rules:
# 1. Answer ONLY from the retrieved context.
# 2. NEVER assume, infer, or fabricate information.
# 3. If the information is not available in the context, respond exactly:
#    "I could not find this in the document."
# 4. Return valid Markdown only.
# 5. Insert a blank line before and after every heading.
# 6. Insert a blank line before and after every bullet list.
# 7. Use Markdown headings (#, ##, ###) on separate lines.
# 8. Use "-" for bullet points.
# 9. Use "**text**" for emphasis.
# 10. Never place headings and content on the same line.
# 11. Never return a single continuous paragraph.


# Context:
# {context}

# Question:
# {input}
# """)


# # Chain
# document_chain_HR_Policy = create_stuff_documents_chain(
#     HR_Policy_llm,
#     HR_policy_prompt
# )

# HR_Policy_rag_chain = create_retrieval_chain(
#     HR_policy_retriever,
#     document_chain_HR_Policy
# )


# def stream_rag_HR_Policy(question):
#     for chunk in HR_Policy_rag_chain.stream(
#         {
#             "input": question
#         }
#     ):

#         if "answer" in chunk:
#             yield chunk["answer"]


# # HealthCare Policy RAG Assistant

# Healthcare_PDF_loader = PyPDFLoader("documents/Healthcare Policy.pdf")
# Healthcare_Policy_documents = Healthcare_PDF_loader.load()

# Healthcare_Policy_splitter = RecursiveCharacterTextSplitter(
#     chunk_size=500,
#     chunk_overlap=80
# )

# Healthcare_Policy_docs = Healthcare_Policy_splitter.split_documents(Healthcare_Policy_documents)


# Healthcare_Policy_embeddings = OllamaEmbeddings(
#     model="nomic-embed-text"
# )

# Healthcare_Policy_docs = Healthcare_Policy_splitter.split_documents(Healthcare_Policy_documents)


# if(os.path.exists("faiss_index_Healthcare_Policy")):
#     vectorstore = FAISS.load_local(
#         "faiss_index_Healthcare_Policy",
#         Healthcare_Policy_embeddings,
#         allow_dangerous_deserialization=True
#     )
# else:
#     vectorstore = FAISS.from_documents(
#         Healthcare_Policy_docs,
#         Healthcare_Policy_embeddings
#     )
#     vectorstore.save_local("faiss_index_Healthcare_Policy")


# Healthcare_policy_retriever = vectorstore.as_retriever(
#     search_type="mmr", # Max Marginal Relevance
#     search_kwargs={
#         "k": 6,
#         "fetch_k": 20
#         }
# )


# Healthcare_Policy_llm = OllamaLLM(
#     model="llama3"
# )

# Healthcare_policy_prompt = ChatPromptTemplate.from_template("""
# You are a Healthcare Policy assistant.

# Rules:
# 1. Answer ONLY from retrieved context.
# 2. NEVER assume or infer coverage.
# 3. If coverage is excluded, explicitly state excluded.
# 4. If the information is not available in the context, respond exactly:
#    "I could not find this in the document."
# 5. Return valid Markdown only.
# 6. Insert a blank line before and after every heading.
# 7. Insert a blank line before and after every bullet list.
# 8. Use Markdown headings (#, ##, ###) on separate lines.
# 9. Use "-" for bullet points.
# 10. Use "**text**" for emphasis.
# 11. Never place headings and content on the same line.
# 12. Never return a single continuous paragraph.

# Context:
# {context}

# Question:
# {input}
# """)

# # Chain
# document_chain_Healthcare_Policy = create_stuff_documents_chain(
#     Healthcare_Policy_llm,
#     Healthcare_policy_prompt
# )

# Healthcare_Policy_rag_chain = create_retrieval_chain(
#     Healthcare_policy_retriever,
#     document_chain_Healthcare_Policy
# )


# def stream_rag_Healthcare_Policy(question):
#     for chunk in Healthcare_Policy_rag_chain.stream(
#         {
#             "input": question
#         }
#     ):

#         if "answer" in chunk:
#             yield chunk["answer"]
