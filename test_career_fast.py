"""Test the fast rule-based career recommendation system"""

from career_rag import CareerRAG
import time

# Test profile (student good at coding and math)
test_profile = {
    'emotional_profile': {
        'curiosity': 'high',
        'confidence': 'medium',
        'stress': 'low',
        'empathy': 'medium'
    },
    'reasoning_profile': {
        'logic': 'high',
        'analysis': 'high',
        'problem_solving': 'high',
        'decision': 'medium'
    },
    'academic_profile': {
        'computer_science': 'high',
        'mathematics': 'high',
        'physics': 'medium'
    }
}

print("🧪 Testing Fast Career Recommendation System\n")
print("=" * 60)

# Initialize
start = time.time()
rag = CareerRAG()
init_time = time.time() - start
print(f"✅ Initialization: {init_time*1000:.1f}ms\n")

# Get recommendations
start = time.time()
recommendations = rag.get_career_recommendations(test_profile, top_k=5)
rec_time = time.time() - start

print(f"⚡ Recommendation time: {rec_time*1000:.1f}ms")
print(f"\n🎯 Top 5 Career Matches:\n")

for i, rec in enumerate(recommendations, 1):
    print(f"{i}. {rec['career_name']} ({rec['category']})")
    print(f"   Match Score: {rec['match_score']}%")
    print(f"   💰 {rec['salary_range']}")
    print(f"   📚 {rec['education_path'][:80]}...")
    print(f"   💡 {rec['student_guidance'][:80]}...")
    print()

print("=" * 60)
print(f"✅ Total time: {(init_time + rec_time)*1000:.1f}ms")
print("🚀 This is instant compared to 5-10 second RAG loading!")
