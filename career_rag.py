
import json
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
        """Initialize the rule-based recommendation system"""
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        logger.info("⚡ Initializing fast rule-based career recommendation system...")
        
        # Load career database
        self.careers_db = self._load_career_database()
        
        logger.info(f"✅ Loaded {len(self.careers_db)} careers instantly!")
        self._initialized = True
    
    def _load_career_database(self):
        """Load comprehensive career database with scoring rules"""
        return [
            # ============ TECHNOLOGY & COMPUTER SCIENCE ============
            {
                "name": "Software Developer",
                "category": "Technology",
                "description": "Design, develop and maintain software applications using programming languages like Python, Java, JavaScript.",
                "education_path": "After 10th: Science (PCM+CS). After 12th: BTech CS/IT (4 years), BCA (3 years), BSc CS (3 years)",
                "salary_range": "₹3-25 Lakhs per year",
                "student_guidance": "Start coding now! Learn Python or JavaScript online. Build small projects. Join coding communities on GitHub. Many free resources available!",
                "job_locations": "Tech companies, Startups, MNCs, Remote work worldwide",
                "emotional_match": {"curiosity": 3, "confidence": 2, "patience": 2},
                "reasoning_match": {"logic": 3, "analysis": 3, "problem_solving": 3},
                "academic_match": {"computer_science": 3, "mathematics": 2, "physics": 1}
            },
            {
                "name": "Data Scientist",
                "category": "Technology",
                "description": "Analyze data, build ML models, help companies make data-driven decisions. Hot career in 2026!",
                "education_path": "After 12th: BTech CS/IT, BSc Data Science/Statistics (3-4 years). Learn Python, ML, Statistics online!",
                "salary_range": "₹5-30 Lakhs per year",
                "student_guidance": "High demand! Learn Python and mathematics. Practice on Kaggle. Many online courses available. Great career prospects!",
                "job_locations": "Tech companies, Startups, Banks, E-commerce, Consulting firms, Remote",
                "emotional_match": {"curiosity": 3, "analytical": 3},
                "reasoning_match": {"analysis": 3, "logic": 3, "pattern_recognition": 3},
                "academic_match": {"mathematics": 3, "computer_science": 2, "statistics": 3}
            },
            {
                "name": "Cyber Security Expert",
                "category": "Technology",
                "description": "Protect systems from hackers. Prevent cyber attacks. High demand profession securing digital world.",
                "education_path": "After 12th: BTech CS (Cyber Security specialization), Certifications (CEH, CISSP). Online courses available!",
                "salary_range": "₹4-20 Lakhs per year",
                "student_guidance": "Learn networking, ethical hacking. Practice on platforms like HackTheBox. Certifications matter a lot!",
                "job_locations": "IT companies, Banks, Government, Defense, Consulting",
                "emotional_match": {"curiosity": 3, "vigilance": 3},
                "reasoning_match": {"logic": 3, "problem_solving": 3, "analysis": 3},
                "academic_match": {"computer_science": 3, "mathematics": 2}
            },
            
            # ============ ENGINEERING - ALL BRANCHES ============
            {
                "name": "Civil Engineer",
                "category": "Engineering",
                "description": "Design and build infrastructure like roads, bridges, buildings. Shape the physical world around us.",
                "education_path": "After 12th (PCM): BTech Civil Engineering (4 years), Diploma (3 years). JEE/state entrance exams.",
                "salary_range": "₹3-15 Lakhs per year",
                "student_guidance": "Need good Maths and Physics. Site visits required. Great for nation-building! Steady career with government jobs.",
                "job_locations": "Construction companies, Government PWD, Consultancy, Contractors",
                "emotional_match": {"patience": 2, "practical": 3},
                "reasoning_match": {"spatial_thinking": 3, "problem_solving": 2},
                "academic_match": {"mathematics": 2, "physics": 3}
            },
            {
                "name": "Mechanical Engineer",
                "category": "Engineering",
                "description": "Design machines, engines, mechanical systems. Work in manufacturing, automobiles, robotics.",
                "education_path": "After 12th (PCM): BTech Mechanical (4 years), Diploma (3 years). Core engineering branch.",
                "salary_range": "₹3-18 Lakhs per year",
                "student_guidance": "Traditional but stable. Good for those who love machines. CAD software skills important. Many job opportunities!",
                "job_locations": "Manufacturing, Automobile, Aerospace, Core industries",
                "emotional_match": {"practical": 3, "innovation": 2},
                "reasoning_match": {"spatial_thinking": 3, "problem_solving": 2},
                "academic_match": {"physics": 3, "mathematics": 2}
            },
            {
                "name": "Electrical Engineer",
                "category": "Engineering",
                "description": "Work with electrical systems, power generation, transmission. Design circuits and electrical equipment.",
                "education_path": "After 12th (PCM): BTech Electrical (4 years). Strong physics needed.",
                "salary_range": "₹3-16 Lakhs per year",
                "student_guidance": "Focus on Physics and Maths. Good government job opportunities (Power sector, Railways). Core branch with stability.",
                "job_locations": "Power plants, Electrical companies, Government, Manufacturing",
                "emotional_match": {"precision": 3, "practical": 2},
                "reasoning_match": {"analytical": 3, "problem_solving": 2},
                "academic_match": {"physics": 3, "mathematics": 2}
            },
            {
                "name": "Electronics Engineer",
                "category": "Engineering",
                "description": "Design electronic devices, circuits, embedded systems. Work with microcontrollers, IoT, robotics.",
                "education_path": "After 12th (PCM): BTech ECE/EEE (4 years). Mix of electronics and communication.",
                "salary_range": "₹3-18 Lakhs per year",
                "student_guidance": "Learn Arduino/Raspberry Pi now! Good mix of hardware and software. IoT is booming!",
                "job_locations": "Electronics companies, Telecom, Embedded systems, R&D",
                "emotional_match": {"curiosity": 3, "technical": 3},
                "reasoning_match": {"logic": 3, "problem_solving": 3},
                "academic_match": {"physics": 3, "electronics": 3, "mathematics": 2}
            },
            {
                "name": "Chemical Engineer",
                "category": "Engineering",
                "description": "Work in chemical plants, pharmaceuticals, petroleum. Design chemical processes and products.",
                "education_path": "After 12th (PCM): BTech Chemical Engineering (4 years). Chemistry + Math important.",
                "salary_range": "₹3-20 Lakhs per year",
                "student_guidance": "Good for chemistry lovers. Oil & gas companies pay well. Core branch with good opportunities.",
                "job_locations": "Chemical plants, Pharmaceutical companies, Oil & Gas, Refineries",
                "emotional_match": {"precision": 3, "safety_conscious": 2},
                "reasoning_match": {"analytical": 3, "systematic": 2},
                "academic_match": {"chemistry": 3, "mathematics": 2, "physics": 2}
            },
            {
                "name": "Aerospace Engineer",
                "category": "Engineering",
                "description": "Design aircraft, spacecraft, satellites. Work in aviation and space technology.",
                "education_path": "After 12th (PCM): BTech Aerospace (4 years). Top colleges: IITs, IISc. Very competitive!",
                "salary_range": "₹4-25 Lakhs per year",
                "student_guidance": "Dream big! ISRO, HAL, Airbus hire. Very competitive field. Need excellent grades.",
                "job_locations": "ISRO, HAL, Private aerospace companies, Research",
                "emotional_match": {"ambition": 3, "precision": 3},
                "reasoning_match": {"spatial_thinking": 3, "physics_application": 3},
                "academic_match": {"physics": 3, "mathematics": 3}
            },
            
            # ============ MEDICAL & HEALTHCARE ============
            {
                "name": "Doctor (MBBS)",
                "category": "Healthcare",
                "description": "Diagnose and treat patients. Save lives and improve health. Highly respected profession with social impact.",
                "education_path": "After 10th: Science (PCB). After 12th: NEET exam (very competitive), MBBS (5.5 years), MD/MS specialization optional",
                "salary_range": "₹6-30+ Lakhs per year",
                "student_guidance": "Focus on Biology and Chemistry NOW. NEET preparation is tough but very rewarding. Start coaching early. Prestigious career!",
                "job_locations": "Hospitals, Clinics, Government health services, Private practice, Medical colleges",
                "emotional_match": {"empathy": 3, "stress": -2, "confidence": 2, "helping": 3},
                "reasoning_match": {"analysis": 2, "decision": 3, "critical_thinking": 3},
                "academic_match": {"biology": 3, "chemistry": 3, "physics": 1}
            },
            {
                "name": "Pharmacist",
                "category": "Healthcare",
                "description": "Dispense medicines, work in drug development, ensure medication safety. Growing pharmaceutical industry.",
                "education_path": "After 12th (PCB/PCM): B.Pharmacy (4 years), D.Pharmacy (2 years). GPAT for higher studies.",
                "salary_range": "₹3-12 Lakhs per year",
                "student_guidance": "Good alternative to MBBS. Pharmaceutical industry is huge in India. Can open own pharmacy later!",
                "job_locations": "Hospitals, Pharmacies, Drug companies, Research labs",
                "emotional_match": {"helping": 2, "attention_to_detail": 3},
                "reasoning_match": {"precision": 3, "analytical": 2},
                "academic_match": {"chemistry": 3, "biology": 2}
            },
            {
                "name": "Physiotherapist",
                "category": "Healthcare",
                "description": "Help patients recover from injuries. Improve mobility and reduce pain. Growing demand in sports.",
                "education_path": "After 12th (PCB): BPT (4.5 years including internship). Practical hands-on work.",
                "salary_range": "₹3-10 Lakhs per year",
                "student_guidance": "Great for those who like physical activity. Sports teams need physiotherapists. Can practice independently!",
                "job_locations": "Hospitals, Sports clubs, Clinics, Home visits, Own practice",
                "emotional_match": {"empathy": 3, "patience": 3, "physical": 2},
                "reasoning_match": {"practical": 3, "problem_solving": 2},
                "academic_match": {"biology": 3, "anatomy": 2}
            },
            {
                "name": "Nurse",
                "category": "Healthcare",
                "description": "Provide patient care, assist doctors, manage hospital wards. Critical healthcare profession.",
                "education_path": "After 12th (PCB): BSc Nursing (4 years), GNM (3 years). Government jobs available.",
                "salary_range": "₹2-8 Lakhs per year (Higher abroad)",
                "student_guidance": "Noble profession. Good scope abroad (Gulf countries, UK, USA). Government jobs with pension!",
                "job_locations": "Hospitals, Government health, Nursing homes, Abroad opportunities",
                "emotional_match": {"empathy": 3, "patience": 3, "caring": 3},
                "reasoning_match": {"attention_to_detail": 3, "emergency_thinking": 2},
                "academic_match": {"biology": 2}
            },
            {
                "name": "Dentist (BDS)",
                "category": "Healthcare",
                "description": "Treat dental problems, perform surgeries, improve oral health. Own clinic potential.",
                "education_path": "After 12th (PCB): NEET exam, BDS (5 years), MDS specialization optional.",
                "salary_range": "₹5-20 Lakhs per year",
                "student_guidance": "Good work-life balance. Can open own clinic. Less competitive than MBBS but still needs NEET.",
                "job_locations": "Dental hospitals, Clinics, Own practice, Corporate dentistry",
                "emotional_match": {"precision": 3, "confidence": 2},
                "reasoning_match": {"attention_to_detail": 3, "dexterity": 2},
                "academic_match": {"biology": 3, "chemistry": 2}
            },
            
            # ============ SCIENCE RESEARCH ============
            {
                "name": "Research Scientist",
                "category": "Science",
                "description": "Conduct research in labs. Discover new knowledge. Work on cutting-edge science and technology.",
                "education_path": "After 12th: BSc in chosen field (3 years), MSc (2 years), PhD (4-5 years). Long journey but fulfilling!",
                "salary_range": "₹4-15 Lakhs per year (Academic), Higher in companies",
                "student_guidance": "For those passionate about science. Publish papers. Contribute to human knowledge. Patience required!",
                "job_locations": "Research institutes (IISc, IITs), CSIR labs, Companies, Universities",
                "emotional_match": {"curiosity": 3, "patience": 3, "dedication": 3},
                "reasoning_match": {"analytical": 3, "hypothesis_testing": 3, "systematic": 3},
                "academic_match": {"physics": 2, "chemistry": 2, "biology": 2, "mathematics": 2}
            },
            {
                "name": "Biotechnologist",
                "category": "Science",
                "description": "Use biology for technology. Work in genetic engineering, drug development, agriculture.",
                "education_path": "After 12th (PCB/PCMB): BSc/BTech Biotechnology (3-4 years). MSc for better opportunities.",
                "salary_range": "₹3-12 Lakhs per year",
                "student_guidance": "Emerging field! Mix of biology and technology. Biotech companies growing fast in India.",
                "job_locations": "Biotech companies, Pharma, Research labs, Agriculture",
                "emotional_match": {"curiosity": 3, "innovation": 3},
                "reasoning_match": {"analytical": 3, "experimental": 3},
                "academic_match": {"biology": 3, "chemistry": 2}
            },
            
            # ============ COMMERCE & FINANCE ============
            {
                "name": "Chartered Accountant (CA)",
                "category": "Finance",
                "description": "Handle finances, audits, taxation for businesses. Highly respected and well-paid profession.",
                "education_path": "After 12th: CA Foundation, Intermediate, Final (4-5 years total). Commerce stream recommended but not mandatory.",
                "salary_range": "₹6-25+ Lakhs per year",
                "student_guidance": "Tough but very rewarding. Need strong maths and dedication. Can start preparation after 12th! Own practice possible.",
                "job_locations": "CA firms, Corporate finance, Banking, Consulting, Own practice",
                "emotional_match": {"patience": 3, "confidence": 2, "stress": -1, "precision": 3},
                "reasoning_match": {"analysis": 3, "logic": 2, "attention_to_detail": 3},
                "academic_match": {"mathematics": 3, "economics": 2, "accountancy": 3}
            },
            {
                "name": "Investment Banker",
                "category": "Finance",
                "description": "Help companies raise money, manage mergers. High-paying but demanding finance career.",
                "education_path": "After 12th: BCom/BBA (3 years), MBA Finance (2 years), CA/CFA certifications help.",
                "salary_range": "₹8-40+ Lakhs per year",
                "student_guidance": "Very high pay! Need excellent math and communication. Long hours but great rewards. IIMs preferred.",
                "job_locations": "Investment banks, Financial institutions, Mumbai/Delhi/Bangalore",
                "emotional_match": {"confidence": 3, "stress": 1, "ambition": 3},
                "reasoning_match": {"analytical": 3, "quick_thinking": 3, "risk_assessment": 3},
                "academic_match": {"mathematics": 3, "economics": 2}
            },
            {
                "name": "Company Secretary (CS)",
                "category": "Finance",
                "description": "Ensure company legal compliance. Handle corporate governance, secretarial work.",
                "education_path": "After 12th: CS Foundation, Executive, Professional (3-4 years). Commerce background helpful.",
                "salary_range": "₹4-15 Lakhs per year",
                "student_guidance": "Good alternative to CA. Less competition. Important role in companies. Own practice possible.",
                "job_locations": "Corporate companies, Law firms, Consulting, Own practice",
                "emotional_match": {"precision": 3, "organization": 3},
                "reasoning_match": {"attention_to_detail": 3, "legal_thinking": 2},
                "academic_match": {"accountancy": 2, "economics": 2}
            },
            
            # ============ CREATIVE FIELDS ============
            {
                "name": "Graphic Designer",
                "category": "Creative",
                "description": "Create visual content for brands, websites, social media. Mix art with technology.",
                "education_path": "After 12th: BFA/BDes in Graphic Design (3-4 years), Diploma courses (6 months-2 years), Online learning possible!",
                "salary_range": "₹2-10 Lakhs per year (Freelance can earn more)",
                "student_guidance": "Build portfolio early. Practice daily. Learn Adobe tools (Photoshop, Illustrator, Figma). No specific stream required!",
                "job_locations": "Design agencies, Freelance, Studios, Marketing companies, Remote work",
                "emotional_match": {"curiosity": 3, "creativity": 3, "artistic": 3},
                "reasoning_match": {"visual_thinking": 3, "creativity": 3},
                "academic_match": {"art": 3, "computer_science": 1}
            },
            {
                "name": "Content Writer/Blogger",
                "category": "Creative",
                "description": "Write articles, blogs, website content. Express ideas through words. Digital era profession.",
                "education_path": "Any degree works! BA English/Journalism helpful (3 years). Learn writing online. Start blogging now!",
                "salary_range": "₹2-8 Lakhs per year (Successful bloggers earn more)",
                "student_guidance": "Start writing NOW! Create your own blog. Read a lot. No specific stream required. Very flexible career!",
                "job_locations": "Media houses, Content agencies, Freelance, Remote work worldwide",
                "emotional_match": {"creativity": 3, "expression": 3, "communication": 2},
                "reasoning_match": {"clear_thinking": 2, "communication": 3},
                "academic_match": {"languages": 3, "english": 2}
            },
            {
                "name": "Fashion Designer",
                "category": "Creative",
                "description": "Design clothes, accessories, fashion trends. Create your own brand or work for fashion houses.",
                "education_path": "After 12th: NIFT entrance, Fashion Design degree (4 years), Diploma courses available.",
                "salary_range": "₹2-15 Lakhs per year (Own brand can earn much more)",
                "student_guidance": "Creative field. Learn sketching and stitching. Follow fashion trends. Can be very lucrative with own brand!",
                "job_locations": "Fashion houses, Own brand, Textile industry, Freelance",
                "emotional_match": {"creativity": 3, "artistic": 3, "trendy": 2},
                "reasoning_match": {"visual_thinking": 3, "innovation": 2},
                "academic_match": {"art": 2}
            },
            
            # ============ EDUCATION ============
            {
                "name": "Teacher/Educator",
                "category": "Education",
                "description": "Educate and inspire next generation. Share knowledge and shape young minds. Respected profession.",
                "education_path": "After 12th: BA/BSc in your subject (3 years) + BEd (2 years). Can specialize in any subject you love!",
                "salary_range": "₹2-10 Lakhs per year (Private schools pay well)",
                "student_guidance": "Choose your favorite subject to teach. Need good communication. Very fulfilling career with social impact!",
                "job_locations": "Schools, Colleges, Coaching centers, Online teaching platforms",
                "emotional_match": {"empathy": 3, "patience": 3, "communication": 3, "helping": 3},
                "reasoning_match": {"explanation": 3, "patience": 2},
                "academic_match": {"any_subject": 2}
            },
            
            # ============ BUSINESS & MANAGEMENT ============
            {
                "name": "Entrepreneur/Business Owner",
                "category": "Business",
                "description": "Start and run your own business. Be your own boss. Take risks and create value.",
                "education_path": "BBA/BCom helpful (3 years) but not mandatory. Learn from experience! MBA can help (2 years).",
                "salary_range": "Unlimited potential (Can be ₹0 to Crores)",
                "student_guidance": "Any stream works. Start small business now (even online). Learn business basics. High risk, high reward!",
                "job_locations": "Own business, Startups, E-commerce, Service business",
                "emotional_match": {"confidence": 3, "risk": 3, "leadership": 3, "ambition": 3},
                "reasoning_match": {"decision": 3, "strategy": 3, "innovation": 3},
                "academic_match": {"any": 1}
            },
            {
                "name": "Marketing Manager",
                "category": "Business",
                "description": "Promote products/services. Manage brand strategy. Connect companies with customers.",
                "education_path": "After 12th: BBA/BCom (3 years), MBA Marketing (2 years). Any stream can do BBA!",
                "salary_range": "₹4-20 Lakhs per year",
                "student_guidance": "Need creativity and communication. Learn digital marketing. Growing field with good pay!",
                "job_locations": "Companies, Agencies, Startups, E-commerce",
                "emotional_match": {"creativity": 2, "communication": 3, "confidence": 2},
                "reasoning_match": {"strategy": 3, "understanding_people": 3},
                "academic_match": {"any": 1}
            },
            {
                "name": "Digital Marketing Specialist",
                "category": "Marketing",
                "description": "Promote products online through SEO, social media, Google ads. Help businesses grow digitally.",
                "education_path": "Any degree + Digital marketing courses (3-6 months). Many online certifications! Can start with any stream.",
                "salary_range": "₹3-15 Lakhs per year",
                "student_guidance": "No specific stream needed. Start learning NOW. Create social media presence! Certifications by Google available free!",
                "job_locations": "Marketing agencies, All types of companies, Freelance, Startups, Remote",
                "emotional_match": {"creativity": 3, "communication": 3, "tech_savvy": 2},
                "reasoning_match": {"strategy": 2, "analytics": 2},
                "academic_match": {"any": 1}
            },
            
            # ============ PSYCHOLOGY & COUNSELING ============
            {
                "name": "Psychologist/Counselor",
                "category": "Healthcare",
                "description": "Help people overcome mental health issues, provide therapy, improve lives. Growing importance in India.",
                "education_path": "After 12th: BA/BSc Psychology (3 years), MA Psychology (2 years), Clinical training, RCI License needed for practice.",
                "salary_range": "₹3-12 Lakhs per year (Private practice can earn more)",
                "student_guidance": "Growing field in India! Need empathy and patience. Very meaningful work. Mental health awareness increasing!",
                "job_locations": "Hospitals, Clinics, Schools, NGOs, Corporate wellness, Private practice",
                "emotional_match": {"empathy": 3, "patience": 3, "listening": 3, "helping": 3},
                "reasoning_match": {"analysis": 2, "understanding": 3, "non_judgmental": 3},
                "academic_match": {"psychology": 3, "biology": 1}
            },
            
            # ============ ARCHITECTURE ============
            {
                "name": "Architect",
                "category": "Design",
                "description": "Design buildings, houses, urban spaces. Blend art, science and technology. Creative+Technical career.",
                "education_path": "After 12th (Any stream but PCM helpful): BArch (5 years) via NATA exam. Spatial thinking important!",
                "salary_range": "₹3-20 Lakhs per year (Own practice can earn more)",
                "student_guidance": "Need creativity AND technical skills. Learn sketching. Software like AutoCAD important. Can have own firm!",
                "job_locations": "Architecture firms, Construction companies, Own practice, Urban planning",
                "emotional_match": {"creativity": 3, "artistic": 3, "precision": 2},
                "reasoning_match": {"spatial_thinking": 3, "visual": 3, "technical": 2},
                "academic_match": {"mathematics": 2, "physics": 2, "art": 2}
            },
            
            # ============ LAW ============
            {
                "name": "Lawyer/Advocate",
                "category": "Law",
                "description": "Represent clients in court. Practice law, protect rights, ensure justice. Prestigious profession.",
                "education_path": "After 12th: LLB (3 years after graduation) OR 5-year integrated BA LLB. CLAT exam for top colleges. Any stream can apply!",
                "salary_range": "₹3-30+ Lakhs per year",
                "student_guidance": "Need excellent communication and memory. Read newspapers daily. Top lawyers earn crores! Can practice independently.",
                "job_locations": "Courts, Law firms, Corporate legal, Own practice",
                "emotional_match": {"confidence": 3, "communication": 3, "fighting_spirit": 2},
                "reasoning_match": {"logical": 3, "argumentation": 3, "memory": 3},
                "academic_match": {"any": 1}
            },
            
            # ============ HOTEL MANAGEMENT & HOSPITALITY ============
            {
                "name": "Hotel Manager",
                "category": "Hospitality",
                "description": "Manage hotels, resorts. Ensure guest satisfaction. Growing tourism industry in India.",
                "education_path": "After 12th: BHM - Bachelor of Hotel Management (4 years). Any stream can apply!",
                "salary_range": "₹3-15 Lakhs per year (International hotels pay more)",
                "student_guidance": "Need good communication and people skills. Tourism is booming. International opportunities available!",
                "job_locations": "Hotels, Resorts, Cruise ships, Tourism companies, Abroad opportunities",
                "emotional_match": {"communication": 3, "patience": 2, "service_oriented": 3},
                "reasoning_match": {"management": 2, "problem_solving": 2},
                "academic_match": {"any": 1}
            },
            
            # ============ ANIMATION & GAMING ============
            {
                "name": "Game Developer",
                "category": "Technology",
                "description": "Create video games. Code game logic, design gameplay. Booming industry in India and worldwide!",
                "education_path": "After 12th: BTech CS/IT (4 years), BCA (3 years), Game development courses. Learn Unity/Unreal Engine online!",
                "salary_range": "₹3-20 Lakhs per year (International studios pay more)",
                "student_guidance": "Play and study games! Learn C#/C++. Build small games now. Growing industry with global opportunities!",
                "job_locations": "Gaming studios, Indie development, Remote/International opportunities",
                "emotional_match": {"creativity": 3, "passion": 3, "persistence": 2},
                "reasoning_match": {"logic": 3, "problem_solving": 3, "creativity": 3},
                "academic_match": {"computer_science": 3, "mathematics": 2}
            },
            {
                "name": "Animator",
                "category": "Creative",
                "description": "Create animations for movies, ads, games. Bring characters to life. Growing VFX industry in India!",
                "education_path": "After 12th: Animation/VFX courses (1-3 years), Degree programs available. No specific stream required!",
                "salary_range": "₹2-12 Lakhs per year",
                "student_guidance": "Learn software like Maya, Blender (free!). Build portfolio. Indian animation industry growing fast!",
                "job_locations": "Animation studios, VFX companies, Ad agencies, Gaming companies",
                "emotional_match": {"creativity": 3, "artistic": 3, "patience": 2},
                "reasoning_match": {"visual_thinking": 3, "attention_to_detail": 2},
                "academic_match": {"art": 2, "computer_science": 1}
            }
        ]
    
    def get_career_recommendations(self, user_profile, top_k=3):
        """
        Get career recommendations using fast rule-based matching
        Returns same format as RAG for compatibility
        """
        logger.debug(f"Generating recommendations for profile: {user_profile}")
        
        # Convert profiles to scores
        emotional_scores = self._convert_profile_to_scores(user_profile.get('emotional_profile', {}))
        reasoning_scores = self._convert_profile_to_scores(user_profile.get('reasoning_profile', {}))
        academic_scores = self._convert_profile_to_scores(user_profile.get('academic_profile', {}))
        
        # Score each career
        career_scores = []
        for career in self.careers_db:
            score = self._calculate_match_score(
                career,
                emotional_scores,
                reasoning_scores,
                academic_scores
            )
            career_scores.append((career, score))
        
        # Sort by score descending
        career_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top K
        recommendations = []
        for career, score in career_scores[:top_k]:
            recommendations.append({
                'career_name': career['name'],
                'category': career['category'],
                'description': career['description'],
                'education_path': career['education_path'],
                'salary_range': career['salary_range'],
                'student_guidance': career['student_guidance'],
                'job_locations': career['job_locations'],
                'match_score': int(score * 100 / 30)  # Normalize to 0-100
            })
        
        logger.info(f"Top recommendation: {recommendations[0]['career_name']} ({recommendations[0]['match_score']}%)")
        return recommendations
    
    def _convert_profile_to_scores(self, profile_dict):
        """Convert high/medium/low to numeric scores"""
        scores = {}
        for key, value in profile_dict.items():
            if value == 'high':
                scores[key] = 3
            elif value == 'medium':
                scores[key] = 2
            elif value == 'low':
                scores[key] = 1
            else:
                scores[key] = 0
        return scores
    
    def _calculate_match_score(self, career, emotional, reasoning, academic):
        """Calculate match score for a career"""
        total_score = 0
        
        # Match emotional traits
        for trait, weight in career.get('emotional_match', {}).items():
            user_score = emotional.get(trait, 0)
            total_score += user_score * weight
        
        # Match reasoning skills
        for skill, weight in career.get('reasoning_match', {}).items():
            user_score = reasoning.get(skill, 0)
            total_score += user_score * weight
        
        # Match academic interests
        for subject, weight in career.get('academic_match', {}).items():
            if subject == 'any':
                # Any academic strength helps a bit
                total_score += weight * (sum(academic.values()) / max(len(academic), 1))
            else:
                user_score = academic.get(subject, 0)
                total_score += user_score * weight
        
        return total_score


def get_rag_instance():
    """Get singleton RAG instance"""
    return CareerRAG()
