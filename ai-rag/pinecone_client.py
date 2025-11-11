import os
from pinecone import Pinecone

def get_pinecone_client():
    api_key = os.getenv("PINECONE_API_KEY")
    environment = os.getenv("PINECONE_ENVIRONMENT", "us-east1-gcp")
    
    if not api_key:
        raise ValueError("PINECONE_API_KEY not set")
    
    pc = Pinecone(api_key=api_key)
    return pc

def get_index():
    pc = get_pinecone_client()
    index_name = os.getenv("PINECONE_INDEX", "cve-index")
    return pc.Index(index_name)

