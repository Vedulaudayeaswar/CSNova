"""
Career Guidance RAG System using Vector Database
Provides intelligent career recommendations based on student profiles
Thread-safe for production use
"""

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import json
import os
import logging
from threading import Lock

logger = logging.getLogger(__name__)

class CareerRAG:
    _instance = None
    _lock = Lock()
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern for thread-safe instance"""
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, persist_directory="./chroma_db", force_reset=False):
        """Initialize the RAG system with ChromaDB and embeddings model"""
        # Skip re-initialization if already done
        if hasattr(self, '_initialized') and self._initialized:
            return
            
        self.persist_directory = persist_directory
        
        # Delete and recreate if force_reset
        if force_reset:
            import shutil
            if os.path.exists(persist_directory):
                logger.info(f"Resetting database at {persist_directory}...")
                shutil.rmtree(persist_directory)
        
        # Initialize ChromaDB
        self.client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            anonymized_telemetry=False
        ))
        
        # Initialize embedding model
        logger.info("Loading embedding model...")
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Get or create collection
        try:
            if force_reset:
                # Delete old collection if exists
                try:
                    self.client.delete_collection(name="career_guidance")
                except:
                    pass
            self.collection = self.client.get_or_create_collection(
                name="career_guidance",
                metadata={"description": "Career guidance knowledge base"}
            )
        except Exception as e:
            logger.error(f"Error with collection: {e}")
            # Try to recreate
            try:
                self.client.delete_collection(name="career_guidance")
            except:
                pass
            self.collection = self.client.create_collection(
                name="career_guidance",
                metadata={"description": "Career guidance knowledge base"}
            )
        
        # Initialize if empty or force reset
        if self.collection.count() == 0 or force_reset:
            logger.info("Initializing career database...")
            self.initialize_career_database()
        else:
            logger.info(f"Loaded {self.collection.count()} career entries from database")
        
        self._initialized = True
    
    def initialize_career_database(self):
        """Populate vector database with career information"""
        careers_data = [
            {
                "id": "career_001",
                "name": "Software Developer",
                "category": "Technology",
                "description": "Design, develop and maintain software applications. Work with programming languages like Python, Java, JavaScript. Solve complex problems and build innovative solutions.",
                "emotional_traits": "curious, analytical, patient, problem-solver, creative",
                "reasoning_traits": "logical thinking, systematic approach, debugging skills, analytical mind",
                "academic_strengths": "mathematics, computer science, physics, logical reasoning",
                "skills_required": "Programming, Problem-solving, Algorithm design, Version control, Testing",
                "education": "BTech Computer Science, BCA, BSc IT, Online coding bootcamps",
                "salary_range": "₹3-25 Lakhs per year",
                "job_locations": "IT companies, Startups, Remote work, MNCs",
                "for_students": "After 10th: Take Science (PCM) or Commerce with CS. After 12th: BTech CS, BCA, or online courses. Start coding now!"
            },
            {
                "id": "career_002",
                "name": "Doctor (Medical)",
                "category": "Healthcare",
                "description": "Diagnose and treat patients, perform surgeries, save lives. Requires dedication, empathy, and continuous learning.",
                "emotional_traits": "empathetic, caring, stress-tolerant, compassionate, responsible",
                "reasoning_traits": "quick decision-making, analytical diagnosis, critical thinking",
                "academic_strengths": "biology, chemistry, physics, memorization skills",
                "skills_required": "Medical knowledge, Patient care, Communication, Decision-making, Precision",
                "education": "After 10th: Science (PCB). After 12th: NEET exam, MBBS (5.5 years), Specialization (3+ years)",
                "salary_range": "₹6-50+ Lakhs per year",
                "job_locations": "Hospitals, Clinics, Private practice, Research",
                "for_students": "Very high competition. Need strong Biology and Chemistry. Start NEET preparation early!"
            },
            {
                "id": "career_003",
                "name": "Graphic Designer",
                "category": "Creative",
                "description": "Create visual content for brands, websites, advertisements. Combine art with technology.",
                "emotional_traits": "creative, artistic, detail-oriented, imaginative, expressive",
                "reasoning_traits": "visual thinking, composition skills, color theory understanding",
                "academic_strengths": "arts, creativity, visual communication",
                "skills_required": "Photoshop, Illustrator, Creativity, Typography, Color theory",
                "education": "After 10th: Any stream. After 12th: Design diploma, BSc Animation, Online courses (Udemy, YouTube)",
                "salary_range": "₹2-10 Lakhs per year",
                "job_locations": "Agencies, Freelance, Studios, Marketing companies",
                "for_students": "Build portfolio early. Practice daily. Learn Adobe tools. No specific stream required!"
            },
            {
                "id": "career_004",
                "name": "Chartered Accountant (CA)",
                "category": "Finance",
                "description": "Handle finances, audits, taxation, and accounting for businesses. Highly respected profession.",
                "emotional_traits": "detail-oriented, disciplined, honest, patient, focused",
                "reasoning_traits": "numerical aptitude, logical analysis, attention to detail",
                "academic_strengths": "mathematics, accounts, commerce, economics",
                "skills_required": "Accounting, Taxation, Auditing, Financial analysis, Ethics",
                "education": "After 10th: Commerce recommended. After 12th: CA Foundation, Intermediate, Final (4-5 years total)",
                "salary_range": "₹6-25+ Lakhs per year",
                "job_locations": "CA firms, Corporate, Banking, Own practice",
                "for_students": "Tough but rewarding. Need strong maths and dedication. Can start after 12th!"
            },
            {
                "id": "career_005",
                "name": "Civil Engineer",
                "category": "Engineering",
                "description": "Design and build infrastructure like roads, bridges, buildings. Shape the physical world.",
                "emotional_traits": "practical, patient, visionary, responsible, collaborative",
                "reasoning_traits": "spatial thinking, problem-solving, calculation skills",
                "academic_strengths": "mathematics, physics, drawing, engineering mechanics",
                "skills_required": "AutoCAD, Structural design, Project management, Site supervision",
                "education": "After 10th: Science (PCM). After 12th: BTech Civil Engineering (4 years), Diploma (3 years)",
                "salary_range": "₹3-15 Lakhs per year",
                "job_locations": "Construction companies, Government, Consultancy, Own firm",
                "for_students": "Need good Maths and Physics. Site visits required. Great for nation-building!"
            },
            {
                "id": "career_006",
                "name": "Teacher/Educator",
                "category": "Education",
                "description": "Educate and inspire the next generation. Share knowledge and shape young minds.",
                "emotional_traits": "patient, empathetic, passionate, communicative, nurturing",
                "reasoning_traits": "clear explanation, adaptability, creative teaching methods",
                "academic_strengths": "subject expertise, communication skills",
                "skills_required": "Communication, Subject knowledge, Classroom management, Patience, Creativity",
                "education": "After 12th: BA/BSc + BEd (2 years), Specialization in subject. Can teach after graduation too!",
                "salary_range": "₹2-10 Lakhs per year (varies by institution)",
                "job_locations": "Schools, Colleges, Coaching centers, Online teaching",
                "for_students": "Choose your favorite subject. Need good communication. Very fulfilling career!"
            },
            {
                "id": "career_007",
                "name": "Data Scientist",
                "category": "Technology/Analytics",
                "description": "Analyze data to find insights, build ML models, help companies make decisions. Hot career!",
                "emotional_traits": "curious, analytical, detail-oriented, problem-solver",
                "reasoning_traits": "statistical thinking, pattern recognition, logical analysis",
                "academic_strengths": "mathematics, statistics, computer science, analytics",
                "skills_required": "Python, Statistics, Machine Learning, Data visualization, SQL",
                "education": "After 12th: BTech CS/IT, BSc Data Science, Statistics. Learn Python and ML online!",
                "salary_range": "₹5-30 Lakhs per year",
                "job_locations": "Tech companies, Startups, Banks, E-commerce, Remote",
                "for_students": "High demand! Learn Python and math. Many online courses available. Great pay!"
            },
            {
                "id": "career_008",
                "name": "Digital Marketing Specialist",
                "category": "Marketing/Business",
                "description": "Promote products online through SEO, social media, ads. Help businesses grow digitally.",
                "emotional_traits": "creative, communicative, trend-aware, persuasive",
                "reasoning_traits": "analytical thinking, strategy planning, data interpretation",
                "academic_strengths": "communication, creativity, business understanding",
                "skills_required": "SEO, Social media, Content creation, Analytics, Ad campaigns",
                "education": "After 12th: Any degree + Digital marketing courses (3-6 months). Learn online!",
                "salary_range": "₹3-15 Lakhs per year",
                "job_locations": "Marketing agencies, Companies, Freelance, Startups",
                "for_students": "No specific stream needed. Start learning now. Create your own social media presence!"
            },
            {
                "id": "career_009",
                "name": "Psychologist/Counselor",
                "category": "Healthcare/Social",
                "description": "Help people overcome mental health issues, provide therapy, improve lives.",
                "emotional_traits": "empathetic, patient, good listener, non-judgmental, caring",
                "reasoning_traits": "analytical assessment, understanding human behavior",
                "academic_strengths": "psychology, biology, communication",
                "skills_required": "Active listening, Empathy, Assessment, Counseling techniques, Ethics",
                "education": "After 12th: BA/BSc Psychology (3 years), MA Psychology, Clinical training, License",
                "salary_range": "₹3-12 Lakhs per year",
                "job_locations": "Hospitals, Clinics, Schools, NGOs, Private practice",
                "for_students": "Growing field in India. Need empathy and patience. Very meaningful work!"
            },
            {
                "id": "career_010",
                "name": "Mechanical Engineer",
                "category": "Engineering",
                "description": "Design machines, engines, mechanical systems. Work in manufacturing, automobiles, robotics.",
                "emotional_traits": "practical, innovative, problem-solver, hands-on",
                "reasoning_traits": "mechanical aptitude, spatial thinking, physics understanding",
                "academic_strengths": "mathematics, physics, mechanics, design",
                "skills_required": "CAD, Manufacturing, Thermodynamics, Material science, Problem-solving",
                "education": "After 10th: Science (PCM). After 12th: BTech Mechanical (4 years), Diploma (3 years)",
                "salary_range": "₹3-18 Lakhs per year",
                "job_locations": "Manufacturing, Automobile, Core industries, Consulting",
                "for_students": "Traditional but stable. Good for those who love machines. Many job opportunities!"
            },
            {
                "id": "career_011",
                "name": "Content Writer/Blogger",
                "category": "Creative/Media",
                "description": "Write articles, blogs, website content. Express ideas through words.",
                "emotional_traits": "creative, expressive, curious, self-motivated",
                "reasoning_traits": "clear thinking, storytelling, research skills",
                "academic_strengths": "language, writing, creativity, communication",
                "skills_required": "Writing, SEO, Research, Grammar, Creativity, Editing",
                "education": "After 12th: Any degree. BA English/Journalism helpful. Learn online!",
                "salary_range": "₹2-8 Lakhs per year (freelance can earn more)",
                "job_locations": "Media houses, Agencies, Freelance, Remote work, Companies",
                "for_students": "Start writing now! Create a blog. No specific stream required. Flexible career!"
            },
            {
                "id": "career_012",
                "name": "Entrepreneur/Business Owner",
                "category": "Business",
                "description": "Start and run your own business. Be your own boss. Take risks and create value.",
                "emotional_traits": "confident, risk-taker, resilient, visionary, leadership",
                "reasoning_traits": "decision-making, strategic thinking, opportunity recognition",
                "academic_strengths": "business understanding, creativity, practical knowledge",
                "skills_required": "Leadership, Business planning, Marketing, Finance, Risk management",
                "education": "After 12th: BBA/BCom helpful but not mandatory. Learn from experience and mentors!",
                "salary_range": "Unlimited potential (varies greatly)",
                "job_locations": "Own business, Startups, E-commerce, Services",
                "for_students": "Any stream works. Start small now. Learn business basics. High risk, high reward!"
            }
        ]
        
        # Prepare data for ChromaDB
        documents = []
        metadatas = []
        ids = []
        
        for career in careers_data:
            # Create rich text representation for embedding
            doc_text = f"""
            Career: {career['name']}
            Category: {career['category']}
            Description: {career['description']}
            Emotional Traits: {career['emotional_traits']}
            Reasoning Skills: {career['reasoning_traits']}
            Academic Strengths: {career['academic_strengths']}
            Required Skills: {career['skills_required']}
            Guidance: {career['for_students']}
            """
            
            documents.append(doc_text)
            ids.append(career['id'])
            
            # Store metadata
            metadatas.append({
                "name": career['name'],
                "category": career['category'],
                "education": career['education'],
                "salary": career['salary_range'],
                "locations": career['job_locations'],
                "student_info": career['for_students']
            })
        
        # Add to collection
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"Initialized {len(careers_data)} careers in vector database")
    
    def get_career_recommendations(self, user_profile, top_k=3):
        """
        Get career recommendations based on user profile using RAG
        
        Args:
            user_profile: Dict with emotional_profile, reasoning_profile, academic_profile
            top_k: Number of recommendations to return
        """
        # Build query from user profile - more descriptive
        query_parts = []
        
        if 'emotional_profile' in user_profile:
            emotional = user_profile['emotional_profile']
            high_traits = [k.replace('_', ' ') for k, v in emotional.items() if v == 'high']
            medium_traits = [k.replace('_', ' ') for k, v in emotional.items() if v == 'medium']
            if high_traits:
                query_parts.append(f"Strong in {', '.join(high_traits)}")
            if medium_traits:
                query_parts.append(f"Moderate {', '.join(medium_traits)}")
        
        if 'reasoning_profile' in user_profile:
            reasoning = user_profile['reasoning_profile']
            high_skills = [k.replace('_', ' ') for k, v in reasoning.items() if v == 'high']
            medium_skills = [k.replace('_', ' ') for k, v in reasoning.items() if v == 'medium']
            if high_skills:
                query_parts.append(f"Good at {', '.join(high_skills)}")
            if medium_skills:
                query_parts.append(f"Can do {', '.join(medium_skills)}")
        
        if 'academic_profile' in user_profile:
            academic = user_profile['academic_profile']
            high_subjects = [k.replace('_', ' ') for k, v in academic.items() if v == 'high']
            medium_subjects = [k.replace('_', ' ') for k, v in academic.items() if v == 'medium']
            if high_subjects:
                query_parts.append(f"Strong academic interest in {', '.join(high_subjects)}")
            if medium_subjects:
                query_parts.append(f"Some interest in {', '.join(medium_subjects)}")
        
        query_text = ". ".join(query_parts)
        
        if not query_text:
            query_text = "general career guidance for students interested in various fields"
        
        print(f"[RAG Query]: {query_text}")
        
        # Query vector database
        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k
        )
        
        # Format recommendations
        recommendations = []
        
        if results['ids'] and len(results['ids'][0]) > 0:
            # Get distances for normalization
            distances = results['distances'][0] if 'distances' in results else []
            
            # Find min and max distance for normalization
            if distances:
                min_dist = min(distances)
                max_dist = max(distances)
                dist_range = max_dist - min_dist if max_dist > min_dist else 1
            
            for i in range(len(results['ids'][0])):
                metadata = results['metadatas'][0][i]
                distance = distances[i] if distances else 0
                
                # Convert distance to similarity score (0-100)
                # Lower distance = better match
                # Normalize to 0-100 scale
                if distances and dist_range > 0:
                    normalized_score = ((max_dist - distance) / dist_range) * 100
                    match_score = max(0, min(100, normalized_score))
                else:
                    match_score = 50  # Default neutral score
                
                recommendations.append({
                    "career_name": metadata['name'],
                    "category": metadata['category'],
                    "education_path": metadata['education'],
                    "salary_range": metadata['salary'],
                    "work_locations": metadata['locations'],
                    "student_guidance": metadata['student_info'],
                    "match_score": round(match_score, 2)
                })
        
        return recommendations
    
    def search_careers_by_text(self, query, top_k=5):
        """Search careers by free text query"""
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k
        )
        
        careers = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                metadata = results['metadatas'][0][i]
                careers.append({
                    "name": metadata['name'],
                    "category": metadata['category'],
                    "guidance": metadata['student_info']
                })
        
        return careers


# Global RAG instance
_rag_instance = None

def get_rag_instance():
    """Get or create RAG instance (singleton)"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = CareerRAG()
    return _rag_instance
