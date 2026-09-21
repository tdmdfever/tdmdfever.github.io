// The resume shown on the home page. Edit this file when your resume changes.
//
// This is deliberately the SHORT web version, not a copy of public/resume.pdf
// (the exhaustive download): 1-2 punchy bullets per role, and no Projects
// section because the project tiles below it cover that. When facts change
// (roles, dates, numbers) update both; the bullet wording doesn't have to match.
//
// Text supports **bold** and _italic_ inline. Each entry has a bold title row
// (title left, `titleRight` right — usually dates) and an italic subtitle row
// (`subtitle` left, `subtitleRight` right — usually role and place).
//
// A section can also carry a `titleRight` label shown at the right end of its
// header (e.g. "100+ Community Service Hours").
//
// Set `project` on an entry to a project's filename (without .md) to link its
// title to that project's tile and show the project's `links` beside it.

export type ResumeEntry = {
  title: string;
  project?: string;
  titleRight?: string;
  subtitle?: string;
  subtitleRight?: string;
  bullets: string[];
};

export type ResumeRow = { label: string; text: string };

// A section has either `entries` (dated items with bullets) or `rows`
// (simple "Label: text" lines, used for skills).
export type ResumeSection = {
  title: string;
  titleRight?: string;
  entries?: ResumeEntry[];
  rows?: ResumeRow[];
};

export const resumeSections: ResumeSection[] = [
  {
    title: 'Education',
    entries: [
      {
        title: 'University of Waterloo',
        titleRight: 'Expected Graduation: 2031',
        subtitle: 'Bachelor of Mathematics (Co-op)',
        subtitleRight: 'Waterloo, ON',
        bullets: [
          'Courses: MATH 147 Calculus I (Advanced), MATH 145 Algebra (Advanced), CS 135 Designing Functional Programs, DATASC 101 Intro to Data Science, ENGL 119 Communications in Math and CS',
        ],
      },
      {
        title: 'Bergen County Academies',
        titleRight: 'Class of 2026',
        subtitle: 'Academy for the Advancement of Science and Technology',
        subtitleRight: 'Hackensack, NJ',
        bullets: [
          '**GPA: 3.94/4.0** | **SAT: 1580** | Scores of **5** on all AP exams and **7** on all IB exams',
          'Courses: Advanced Math Topics (abstract algebra: groups, rings, fields, intro to Galois theory), Advanced Topics in Chemistry and Physics, AP Calculus BC, Statistics, Microeconomics, Physics C, US Government, IB English Literature HL, IB Mandarin ab initio, Foundations of Computer Science, SQL',
        ],
      },
    ],
  },
  {
    title: 'Technical & Analytical Skills',
    rows: [
      { label: 'Programming & Tools', text: 'Python, SQL, Java' },
      { label: 'Analytical', text: 'Cost-benefit analysis, causal inference, probability modeling, empirical data analysis' },
      {
        label: 'Languages & Interests',
        text: 'Mandarin Chinese (conversational); Piano (RCM Level 10 repertoire, 13+ years); Bass (3 years)',
      },
    ],
  },
  {
    title: 'Work Experience',
    entries: [
      {
        title: 'National Museum of Mathematics (MoMath)',
        titleRight: 'Sep 2025 – May 2026',
        subtitle: 'Integrator (Floor Staff)',
        subtitleRight: 'New York, NY',
        bullets: [
          'Engaged visitors with prompts and hands-on exhibits, rotating stations every **30 min**; attended optional trainings with **Chaim Goodman-Strauss** and **Art Benjamin**',
        ],
      },
      {
        title: 'Independent Tutoring Business',
        titleRight: 'Jan 2026 – Jun 2026',
        subtitle: 'Founder & SAT Math Tutor',
        bullets: [
          'Ran my own SAT Math tutoring business: weekly **one-on-one** sessions, with a **custom curriculum** and self-sourced practice problems for each student',
        ],
      },
      {
        title: 'ACE Education and Consulting Group',
        titleRight: 'Jun 2024 – Aug 2025',
        subtitle: 'SAT Teaching Assistant, Camp Counselor',
        bullets: [
          'Assisted SAT Math and Reading/Writing prep where **50%** of students scored **1500+** on the final practice test',
          'Taught math and led science experiments and group activities for **25+ students** in grades 1–6, organized by skill level',
        ],
      },
    ],
  },
  {
    title: 'Research Experience',
    entries: [
      {
        title: 'PFAS Mitigation Cost-Benefit Analysis for Ridgewood Water',
        titleRight: 'Jun 2024 – Sep 2025',
        subtitle: 'Research, with expert advisor',
        bullets: [
          'Conducted a **cost-benefit analysis** of Ridgewood Water’s ongoing PFAS Treatment Plan, applying **PFAS health burden methodologies** to local contamination and **financial data**',
        ],
      },
      {
        title: 'Economic Impacts of One-Child Policy Enforcement Disparities in China',
        titleRight: 'Sept 2024 – Jun 2025',
        subtitle: 'Research',
        bullets: [
          'Analyzed the **causal relationship** between One-Child Policy enforcement disparities and **economic inequality** in China, using **asset and income data** from the **China Health and Nutrition Survey**',
        ],
      },
    ],
  },
  {
    title: 'Volunteering & Leadership',
    titleRight: '100+ Community Service Hours',
    entries: [
      {
        title: 'Schoolhouse.com',
        titleRight: 'Feb 2024 – Jun 2025',
        subtitle: 'Certified Volunteer SAT Prep Tutor',
        bullets: [
          'Tutored SAT Math and built custom curricula for **26 students** from practice test results, with lectures and problem-solving sessions',
        ],
      },
      {
        title: 'Rockland Centennial Leo’s Club',
        titleRight: 'Sept 2024 – Jun 2026',
        subtitle: 'Membership Chairperson',
        bullets: ['Organized concerts and events, managed performer bookings, and curated programs'],
      },
      {
        title: 'Moptica Band',
        titleRight: 'Sept 2023 – Jun 2026',
        subtitle: 'Bassist',
        bullets: [
          'Performed at charity events, nursing homes, and school assemblies; identified performance opportunities and organized music',
        ],
      },
    ],
  },
];
