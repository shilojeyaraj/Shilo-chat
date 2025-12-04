import { NextRequest, NextResponse } from 'next/server';
import { providers } from '@/lib/llm/providers';
import { Message } from '@/lib/llm/types';

export async function POST(req: NextRequest) {
  try {
    const { latexResume, jobPosting, personalInfoContext } = await req.json();

    if (!latexResume || !latexResume.trim()) {
      return NextResponse.json(
        { error: 'LaTeX resume is required' },
        { status: 400 }
      );
    }

    if (!jobPosting || !jobPosting.trim()) {
      return NextResponse.json(
        { error: 'Job posting is required' },
        { status: 400 }
      );
    }

    if (!personalInfoContext || !personalInfoContext.trim()) {
      return NextResponse.json(
        { error: 'Personal information is required. Please add your information in the Personal Info section.' },
        { status: 400 }
      );
    }

    // Use Kimi or best available provider
    const availableProviders = Object.values(providers).filter(p => p.isAvailable());
    const bestProvider = availableProviders.find(p => p.name === 'Kimi') 
      || availableProviders.find(p => p.name === 'Anthropic')
      || availableProviders[0];

    if (!bestProvider) {
      return NextResponse.json(
        { error: 'No AI provider available. Please configure API keys.' },
        { status: 500 }
      );
    }

    const model = bestProvider.name === 'Kimi' 
      ? 'moonshot-v1-128k'
      : bestProvider.name === 'Anthropic'
      ? 'claude-3-5-sonnet-20240620'
      : 'llama-3.3-70b-versatile';

    const prompt = `You are an expert resume optimization agent specializing in software engineering and robotics engineering internships. Your goal is to analyze job descriptions and intelligently select the most relevant experiences from the user's resume knowledge base to maximize their chances of securing an interview.

CRITICAL REQUIREMENTS:
1. Keep ALL LaTeX commands, packages, document structure, and formatting EXACTLY as they are
2. The resume MUST contain ONLY these 4 sections in this exact order: Education, Technical Skills, Experience, Projects
3. REMOVE any other sections that are not in this list (e.g., Awards, Certifications, Leadership, etc.) - only keep Education, Technical Skills, Experience, and Projects
4. PRESERVE THE EXACT ORDER: Education → Technical Skills → Experience → Projects
5. Only modify the CONTENT within sections (bullet points, descriptions, skill lists, experience descriptions)
6. Do NOT change any LaTeX syntax, commands, or structure
7. Use ONLY information from the user's personal information provided below - do NOT use any content from the original resume
8. Select and prioritize the most relevant experiences, skills, and projects from personal info that match the job posting
9. Rewrite bullet points and descriptions using ONLY the user's personal information
10. Preserve all special characters, escaping, and LaTeX syntax

USER'S PERSONAL INFORMATION (USE ONLY THIS DATA):
${personalInfoContext}

ORIGINAL LaTeX RESUME TEMPLATE (USE ONLY FOR STRUCTURE/FORMATTING):
${latexResume}

JOB POSTING:
${jobPosting}

=== SELECTION CRITERIA: WHAT TECH RECRUITERS PRIORITIZE ===

When selecting resume bullet points, prioritize content that demonstrates:
- Eagerness to learn and relevant educational background
- Practical application of technical skills
- Quantifiable impact and measurable outcomes
- Technical skills alignment with job requirements
- Problem-solving and real-world application

=== PRIORITY RANKING SYSTEM ===

For each potential resume point, score it using this framework (0-10 for each):

1. QUANTIFIABLE IMPACT (CRITICAL - Weight: 40%)
   - Does it include specific metrics? (performance improvements %, time saved, users affected, system uptime, cost reductions, speed increases)
   - Format: "Action Verb + Technical Task + Quantifiable Result"
   - Examples of strong metrics:
     * "reduced response time by 40% for 10,000+ daily users"
     * "optimized database queries reducing load time by 35%"
     * "increased user engagement by 25%"
     * "deployed system with 99.9% uptime"
     * "processed 1M+ data points with 50% faster execution"
   - Score: 0-10 (10 = strong quantifiable metrics, 0 = no metrics)

2. TECHNICAL SKILLS ALIGNMENT (Weight: 30%)
   - Does it match the job description's required technologies?
   - Programming Languages: Java, Python, JavaScript, C++, SQL, and other languages specifically mentioned
   - Frameworks & Tools: Git, Docker, Kubernetes, AWS, Jenkins, React, Node.js, and relevant development tools
   - Robotics-Specific: ROS, MATLAB, Gazebo, computer vision libraries (OpenCV), embedded systems, CAD tools, sensor integration
   - Include BOTH acronyms AND full terms (e.g., "AWS" and "Amazon Web Services") for ATS optimization
   - Score: 0-10 (10 = exact match, 8 = closely related, 5 = transferable, 0 = unrelated)

3. PROBLEM-SOLVING & COMPLEXITY (Weight: 20%)
   - Does it demonstrate: identifying issues → implementing solutions → achieving results?
   - Shows complexity handling: large codebases, multi-threaded systems, distributed architectures
   - Examples of problems solved: workflow issues, debugging challenges, system optimization
   - Even academic or personal projects are valid if substantial and technical
   - Score: 0-10 (10 = complex problem with clear solution, 0 = no problem-solving shown)

4. RECENCY & RELEVANCE (Weight: 10%)
   - Is this recent work? (Recent = higher priority)
   - Does this directly relate to the job requirements?
   - Score: 0-10 (10 = very recent and highly relevant, 0 = old or irrelevant)

SELECTION THRESHOLD: Include only items scoring 24+ out of 40 total weighted points.

=== CONTENT PRIORITIZATION FRAMEWORK ===

Rank experiences in this order (allocate resume space accordingly):

1. DIRECTLY RELEVANT TECHNICAL WORK (80% of resume space)
   - Prioritize software/robotics projects over unrelated activities
   - Internships with matching tech stacks
   - Projects using required languages/frameworks
   - Research with measurable outcomes
   - Robotics competitions with results (e.g., "Placed 3rd at RoboCup")

2. TRANSFERABLE TECHNICAL SKILLS (15% of resume space)
   - Adjacent technologies that demonstrate learning ability
   - Projects showing system thinking or integration
   - Leadership in technical contexts (hackathons, robotics competitions)

3. SOFT SKILLS & NON-TECHNICAL (5% of resume space)
   - Only include if space permits and adds unique value
   - Activities like team captaincy or leadership roles that complement technical narrative

=== BULLET POINT FORMATTING REQUIREMENTS ===

Structure each bullet point as:
[Action Verb] + [Technical Implementation Detail] + [Specific Technology/Tool] + [Quantifiable Result/Impact]

STRONG ACTION VERBS (use these):
- Developed, Designed, Implemented, Optimized, Debugged, Deployed, Collaborated, Architected, Automated
- Built, Created, Engineered, Integrated, Refactored, Scaled, Migrated, Enhanced, Streamlined
- Avoid passive language like "responsible for" or "helped with"
- Use past tense for completed work, present tense for ongoing projects

EXAMPLES OF EXCELLENT BULLET POINTS:

✅ "Developed real-time object detection pipeline using OpenCV and TensorFlow, improving recognition accuracy by 35% for autonomous navigation system"

✅ "Architected microservices backend with Node.js and Docker, reducing deployment time by 50% and supporting 10K concurrent users"

✅ "Optimized ROS-based SLAM algorithm reducing localization error by 28% and enabling real-time mapping for 500m² environments"

✅ "Implemented RESTful API with Python and Flask processing 10,000+ requests/day with 99.9% uptime and sub-100ms response time"

❌ AVOID: "Worked on robot project" (too vague, no metrics)
❌ AVOID: "Responsible for code development" (passive, no specifics)
❌ AVOID: "Used Python" (no context, no impact)

KEY FORMATTING RULES:
- Keep each bullet to 1-2 lines maximum
- Resume should be strictly 1 page for internships
- List 3-5 bullets per experience/project
- Use consistent verb tenses
- Embed keywords naturally (not keyword stuffing)

=== ATS OPTIMIZATION STRATEGY ===

1. EXTRACT KEYWORDS FROM JOB DESCRIPTION:
   - Copy requirements section
   - Identify: languages, frameworks, methodologies, tools, soft skills
   - Create keyword categories:
     * Languages: Python, Java, C++, JavaScript, MATLAB, etc.
     * Robotics: ROS, Gazebo, CAD (SolidWorks/Fusion360), embedded C, sensor fusion
     * Web/Software: React, Node.js, MongoDB, PostgreSQL, REST APIs
     * DevOps: Git, Docker, CI/CD, AWS/GCP, Linux
     * Soft Skills: Agile, debugging, code review, technical documentation

2. NATURAL KEYWORD INTEGRATION:
   - Pepper keywords into "Experience" and "Projects" sections
   - Closely imitate the language from the job description
   - Technical Skills section: categorize (Languages | Frameworks | Tools | Platforms)
   - Experience/Projects bullets: embed within context (not keyword stuffing)
   - Frequency matters: Some ATS systems determine skill strength based on keyword frequency

3. KEYWORD PLACEMENT:
   - Include in bullet points naturally
   - List in Technical Skills section with categories
   - Use both acronyms and full terms (e.g., "AWS (Amazon Web Services)")

=== SECTION-SPECIFIC REQUIREMENTS ===

1. EDUCATION SECTION:
   - Include: University name, degree, major, graduation date (or expected)
   - Include: GPA if 3.5+ (otherwise omit)
   - Include: Relevant coursework if space permits (max 3-4 courses)
   - Format: Keep LaTeX structure, only update content

2. TECHNICAL SKILLS SECTION:
   - Categorize skills: Languages | Frameworks | Tools | Platforms
   - Include BOTH acronyms and full terms for ATS
   - Prioritize skills mentioned in job description
   - List most relevant skills first within each category
   - Format: Keep LaTeX structure, update skill lists

3. EXPERIENCE SECTION:
   - Include 3-5 bullet points per experience
   - Each bullet must follow: [Action Verb] + [Technical Detail] + [Technology] + [Quantifiable Result]
   - Prioritize experiences with highest weighted scores (24+)
   - Include: Company name, role title, dates, location
   - Format: Keep LaTeX structure, update bullet points only

4. PROJECTS SECTION:
   - Include 2-4 most relevant projects
   - Each project: 3-4 bullet points following the same format as Experience
   - Prioritize projects with highest weighted scores (24+)
   - Include: Project name, technologies used, brief description
   - Format: Keep LaTeX structure, update bullet points only

=== RED FLAGS TO AVOID ===

❌ Generic statements without context
❌ Listing responsibilities instead of achievements
❌ Including irrelevant skills to pad the resume
❌ Outdated technologies that don't communicate current capabilities
❌ Bullet points without quantifiable results
❌ Passive voice ("was responsible for" instead of "developed")
❌ Vague descriptions ("worked on projects" instead of "implemented X using Y achieving Z")
❌ Sections other than Education, Technical Skills, Experience, Projects

=== DECISION-MAKING PROCESS ===

For each potential resume point from the personal information:

1. Calculate weighted score:
   - Quantifiable Impact: score × 0.40
   - Technical Skills Alignment: score × 0.30
   - Problem-Solving & Complexity: score × 0.20
   - Recency & Relevance: score × 0.10
   - Total: Sum of weighted scores

2. Selection criteria:
   - Include if total weighted score ≥ 24/40
   - Prioritize higher scores for limited space
   - Ensure diversity across different experiences/projects

3. Final check:
   - Does it directly relate to job requirements?
   - Does it include quantifiable results?
   - Does it demonstrate proficiency with required technologies?
   - Is it recent and relevant?
   - Does it differentiate the candidate?

=== TASK ===

Optimize the resume content to match the job posting by:
- REMOVING all sections except: Education, Technical Skills, Experience, Projects
- Ensuring sections appear in this exact order: Education → Technical Skills → Experience → Projects
- Selecting the most relevant experiences from personal info that match job requirements (using scoring system above)
- Selecting the most relevant skills from personal info that match job requirements
- Selecting the most relevant projects from personal info that match job requirements
- Rewriting bullet points using ONLY information from personal info, following the format: [Action Verb] + [Technical Detail] + [Technology] + [Quantifiable Result]
- Using keywords from the job posting naturally in descriptions
- Keeping ALL LaTeX structure, commands, formatting identical to the template
- Ensuring each bullet point includes quantifiable impact when possible
- Prioritizing experiences with highest weighted scores (24+)
- Always prioritizing impact over volume - better to highlight a few exceptional achievements than include many average ones

CRITICAL SECTION RULES:
- The resume MUST contain ONLY these 4 sections: Education, Technical Skills, Experience, Projects
- Sections MUST appear in this exact order: Education → Technical Skills → Experience → Projects
- REMOVE any other sections (Awards, Certifications, Leadership, etc.)
- Keep each section in the same LaTeX structure/formatting as the template
- Only modify bullet points, descriptions, and content - NOT section positions or LaTeX structure

IMPORTANT RULES:
- Return ONLY the optimized LaTeX code
- Do NOT include markdown code blocks or explanations
- Do NOT change any \\documentclass, \\usepackage, or structural LaTeX commands
- Only modify text content within sections (experiences, skills, projects, etc.) - NOT section positions
- Use ONLY data from the personal information provided - ignore any content in the original resume
- Preserve all LaTeX escaping (\\, {, }, etc.)
- Keep the exact same LaTeX formatting and structure as the template
- REMOVE any sections that are not Education, Technical Skills, Experience, or Projects
- The goal is to make the recruiter immediately see: "This candidate has exactly what we need."

Return the complete optimized LaTeX resume with ONLY the 4 required sections:`;

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an expert resume optimization agent specializing in software engineering and robotics engineering internships. You preserve LaTeX structure exactly and optimize content using a weighted scoring system to select the most impactful experiences. The resume must contain ONLY 4 sections: Education, Technical Skills, Experience, and Projects. You use quantifiable metrics, technical alignment, and problem-solving complexity to maximize interview chances. You never use content from the original resume, only from the personal information database.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await bestProvider.call(messages, {
      model,
      temperature: 0.3,
      maxTokens: 16384, // LaTeX can be very long
      stream: false,
    });

    let optimizedLatex = response.content || '';

    // Clean up response (remove markdown code blocks if present)
    optimizedLatex = optimizedLatex.replace(/```latex\n?/g, '').replace(/```\n?/g, '').trim();
    
    // If response doesn't start with \documentclass, try to extract it
    if (!optimizedLatex.startsWith('\\documentclass')) {
      const match = optimizedLatex.match(/```(?:latex)?\s*([\s\S]*?)\s*```/) 
        || optimizedLatex.match(/(\\documentclass[\s\S]*)/);
      if (match) {
        optimizedLatex = match[1].trim();
      } else {
        // If we can't find LaTeX, return original with a note
        console.warn('Could not extract optimized LaTeX, returning original');
        optimizedLatex = latexResume;
      }
    }

    return NextResponse.json({ optimizedLatex });

  } catch (error: any) {
    console.error('Resume optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize resume', details: error.message },
      { status: 500 }
    );
  }
}

