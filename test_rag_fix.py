"""Test script to verify RAG system fixes"""
import os
import shutil

# Delete old database to force recreation
if os.path.exists("./chroma_db"):
    print("Deleting old ChromaDB...")
    shutil.rmtree("./chroma_db")

# Import and test
from career_rag import get_rag_instance

print("\n" + "="*60)
print("Testing RAG System with Different Profiles")
print("="*60)

rag = get_rag_instance()

# Test 1: Student interested in technology
print("\n\nTest 1: Technology-oriented student")
print("-" * 60)
tech_profile = {
    'emotional_profile': {
        'stress': 'medium',
        'confidence': 'high',
        'empathy': 'low',
        'risk': 'medium',
        'curiosity': 'high'
    },
    'reasoning_profile': {
        'logic': 'high',
        'analysis': 'high',
        'decision': 'medium'
    },
    'academic_profile': {
        'mathematics': 'high',
        'computer_science': 'high',
        'physics': 'medium'
    }
}

results = rag.get_career_recommendations(tech_profile, top_k=5)
for i, rec in enumerate(results, 1):
    print(f"{i}. {rec['career_name']} - Match: {rec['match_score']:.2f}%")
    print(f"   Category: {rec['category']}")
    print()

# Test 2: Student interested in healthcare
print("\n\nTest 2: Healthcare-oriented student")
print("-" * 60)
healthcare_profile = {
    'emotional_profile': {
        'stress': 'low',
        'confidence': 'high',
        'empathy': 'high',
        'risk': 'low',
        'curiosity': 'medium'
    },
    'reasoning_profile': {
        'logic': 'medium',
        'analysis': 'high',
        'decision': 'high'
    },
    'academic_profile': {
        'biology': 'high',
        'chemistry': 'high',
        'physics': 'medium'
    }
}

results = rag.get_career_recommendations(healthcare_profile, top_k=5)
for i, rec in enumerate(results, 1):
    print(f"{i}. {rec['career_name']} - Match: {rec['match_score']:.2f}%")
    print(f"   Category: {rec['category']}")
    print()

# Test 3: Creative student
print("\n\nTest 3: Creative/Artistic student")
print("-" * 60)
creative_profile = {
    'emotional_profile': {
        'stress': 'medium',
        'confidence': 'medium',
        'empathy': 'high',
        'risk': 'high',
        'curiosity': 'high'
    },
    'reasoning_profile': {
        'logic': 'low',
        'analysis': 'medium',
        'decision': 'medium'
    },
    'academic_profile': {
        'mathematics': 'low',
        'computer_science': 'low',
        'biology': 'low'
    }
}

results = rag.get_career_recommendations(creative_profile, top_k=5)
for i, rec in enumerate(results, 1):
    print(f"{i}. {rec['career_name']} - Match: {rec['match_score']:.2f}%")
    print(f"   Category: {rec['category']}")
    print()

print("\n" + "="*60)
print("Testing Complete!")
print("="*60)
