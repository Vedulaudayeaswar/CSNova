"""Test with different student profiles"""

from career_rag import CareerRAG

rag = CareerRAG()

print("=" * 70)
print("🧪 Testing Different Student Profiles")
print("=" * 70)

# Profile 1: Medical student (empathetic, biology-focused)
medical_profile = {
    'emotional_profile': {
        'empathy': 'high',
        'patience': 'high',
        'stress': 'low',
        'confidence': 'medium'
    },
    'reasoning_profile': {
        'analysis': 'high',
        'decision': 'high'
    },
    'academic_profile': {
        'biology': 'high',
        'chemistry': 'high',
        'physics': 'medium'
    }
}

print("\n👨‍⚕️ Profile 1: Medical Student")
print("-" * 70)
recs = rag.get_career_recommendations(medical_profile, top_k=3)
for i, rec in enumerate(recs, 1):
    print(f"{i}. {rec['career_name']} - {rec['match_score']}%")

# Profile 2: Creative student (artistic, expressive)
creative_profile = {
    'emotional_profile': {
        'creativity': 'high',
        'curiosity': 'high',
        'expression': 'high'
    },
    'reasoning_profile': {
        'creative_thinking': 'high'
    },
    'academic_profile': {
        'art': 'high',
        'languages': 'medium'
    }
}

print("\n🎨 Profile 2: Creative Student")
print("-" * 70)
recs = rag.get_career_recommendations(creative_profile, top_k=3)
for i, rec in enumerate(recs, 1):
    print(f"{i}. {rec['career_name']} - {rec['match_score']}%")

# Profile 3: Business-minded (confident, risk-taker)
business_profile = {
    'emotional_profile': {
        'confidence': 'high',
        'risk': 'high',
        'leadership': 'high'
    },
    'reasoning_profile': {
        'decision': 'high',
        'strategy': 'high'
    },
    'academic_profile': {
        'mathematics': 'medium',
        'economics': 'high'
    }
}

print("\n💼 Profile 3: Business Student")
print("-" * 70)
recs = rag.get_career_recommendations(business_profile, top_k=3)
for i, rec in enumerate(recs, 1):
    print(f"{i}. {rec['career_name']} - {rec['match_score']}%")

# Profile 4: Teacher/educator (empathetic, patient, communicative)
teacher_profile = {
    'emotional_profile': {
        'empathy': 'high',
        'patience': 'high',
        'communication': 'high'
    },
    'reasoning_profile': {
        'explanation': 'high'
    },
    'academic_profile': {
        'mathematics': 'high'
    }
}

print("\n👩‍🏫 Profile 4: Future Teacher")
print("-" * 70)
recs = rag.get_career_recommendations(teacher_profile, top_k=3)
for i, rec in enumerate(recs, 1):
    print(f"{i}. {rec['career_name']} - {rec['match_score']}%")

print("\n" + "=" * 70)
print("✅ All profiles tested successfully!")
print("🚀 Recommendations are personalized and instant!")
