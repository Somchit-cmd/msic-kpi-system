export type Role = 'employee' | 'admin' | 'superadmin';
export type EvalStatus = 'draft' | 'submitted' | 'manager_scored' | 'hr_approved' | 'hr_rejected';
export type SetupStatus = 'draft' | 'submitted' | 'manager_rejected' | 'manager_approved' | 'hr_rejected' | 'hr_approved';
export type ObjectiveCategory = string; // Configurable via Settings > Objective Categories
export type ReviewType = 'performance' | 'quarterly';

export interface ScoreCriteria {
  score: number;
  description: string;
}

export interface Objective {
  id: string;
  description: string;
  strategy: string;
  supportNeeded: string;
  scoreCriteria: ScoreCriteria[];
  category: ObjectiveCategory;
  weight: number;
  selfScore: number;
  managerScore: number;
  // Quarterly review only — % achievement (0–25)
  selfPercent?: number;
  managerPercent?: number;
}

export type PlanType = 'performance' | 'quarterly';

export interface KpiPlan {
  id: string;
  planType: PlanType;
  parentPlanId?: string; // for quarterly plans, references the performance plan
  id_legacy?: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string;
  department: string;
  managerId: string;
  managerName: string;
  year: string;
  period?: string; // H1 or H2
  isLeadership: boolean;
  setupStatus: SetupStatus; // KPI setup approval workflow
  objectives: Objective[];
  behaviors: BehaviorScore[];
  adjustingCriteria?: string; // Part III description for performance plans
  managerFeedback?: string; // feedback from manager during setup review
  hrFeedback?: string; // feedback from HR during setup review
  createdAt: string;
  createdBy: string;
}

export const defaultScoreCriteria = (): ScoreCriteria[] => [
  { score: 1, description: '' },
  { score: 2, description: '' },
  { score: 3, description: '' },
  { score: 4, description: '' },
  { score: 5, description: '' },
];

export interface BehaviorSubTopic {
  id: string;
  name: string;
  bullets: string[];
  selfScore: number;
  managerScore: number;
}

export interface BehaviorCategory {
  name: string;
  leadershipOnly?: boolean;
  subTopics: BehaviorSubTopic[];
}

// Flat structure kept for backward compat in Evaluation storage
export interface BehaviorScore {
  name: string;
  subTopicId: string;
  subTopicName: string;
  selfScore: number;
  managerScore: number;
}

export interface AdjustingFactor {
  selfScore: number;
  managerScore: number;
  notes: string;
}

export interface AuditLogEntry {
  timestamp: string; // ISO datetime
  action: string; // e.g. "Draft Created", "Submitted to Evaluator", "Evaluator Scored", "HR Signed Off"
  fromStatus?: EvalStatus;
  toStatus?: EvalStatus;
  actorId: string;
  actorName: string;
  actorRole: Role;
  notes?: string;
}

export interface Evaluation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string;
  department: string;
  managerId: string;
  managerName: string;
  period: string;
  reviewType: ReviewType;
  planId?: string;
  status: EvalStatus;
  createdAt: string;
  updatedAt: string;
  objectives: Objective[];
  behaviors: BehaviorScore[];
  adjustingFactor: AdjustingFactor;
  hrNotes: string;
  isLeadership: boolean;
  auditLog?: AuditLogEntry[];
}

export interface User {
  id: string;
  name: string;
  title: string;
  department: string;
  role: Role;
  managerId: string | null;
  username: string;
  password: string;
  email: string;
  telephone: string;
}

export interface AppSettings {
  departments: string[];
  jobTitles: Record<string, string[]>; // department → job titles
  objectiveCategories: string[]; // e.g. ["Operation", "Financial", "People", "Innovation", "Customer"]
}

export const BEHAVIOR_CATEGORIES: BehaviorCategory[] = [
  {
    name: 'Customer Focus',
    subTopics: [
      {
        id: 'cf-1',
        name: 'Customer Relationships (internal and/or external customers)',
        bullets: [
          'Listens to and understands customer needs.',
          'Keeps customers fully informed throughout service process.',
          'Responds to all incidents of dissatisfaction to recover service and prevent recurrence.',
          'Improves services to customers through pursuit of excellence.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
    ],
  },
  {
    name: 'Integrity',
    subTopics: [
      {
        id: 'int-1',
        name: 'Ethics',
        bullets: [
          'Practices integrity and fairness at work.',
          'Is open and honest with colleagues and customers.',
          'Sticks to a commitment, once made.',
          'Widely recognized as a role model for others.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
      {
        id: 'int-2',
        name: 'Compliance',
        bullets: [
          'Complies with all rules and regulations.',
          'Shows understanding of and commitment to intention and principle of rules and regulations.',
          'Influences others to comply with rules and regulations.',
          'Takes action e.g. speaks up when finds incidents of non-compliance.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
    ],
  },
  {
    name: 'Professionalism',
    subTopics: [
      {
        id: 'prof-1',
        name: 'Job Knowledge and Application',
        bullets: [
          'Has required knowledge and skills for the job.',
          'Applies knowledge and skills effectively.',
          'Continuously develops knowledge and skills.',
          'Contribute to their own targets and departments\' targets.',
          'Make the most effective use of all resources toward goals.',
          'Demonstrates exceptional knowledge and skills i.e. seen as \'expert\'.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
      {
        id: 'prof-2',
        name: 'Problem Solving and Decision Making',
        bullets: [
          'Seeks help when unable to solve a problem.',
          'Breaks down problems and identifies key components.',
          'Makes logical and informed decisions.',
          'Anticipates problems and takes preventive actions before problems occur.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
    ],
  },
  {
    name: 'Innovation',
    subTopics: [
      {
        id: 'inn-1',
        name: 'Quality of Work, Excellence',
        bullets: [
          'Focuses on objectives and results.',
          'Seeks and commits to stretch objectives.',
          'Establishes personal action plans / follow up dates and acts on them.',
          'Strives for excellence by continually improving.',
          'Can be relied upon carry out duties/projects to achieve targets.',
          'Consider accuracy, thoroughness, effectiveness.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
      {
        id: 'inn-2',
        name: 'Innovation and Change Management',
        bullets: [
          'Is open to suggestions to change.',
          'Adjusts and adapts self to changing situation.',
          'Seeks and implements new and better ways to do things.',
          'Embraces change and influences others to change.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
    ],
  },
  {
    name: 'Teamwork',
    subTopics: [
      {
        id: 'tw-1',
        name: 'Respect and Harmony',
        bullets: [
          'Acts with respect and courtesy to all colleagues.',
          'Open to and respectful of differing opinions.',
          'Looks for better ways to work with others.',
          'Anticipates others\' points of view and able to dialogue with and persuade them effectively.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
      {
        id: 'tw-2',
        name: 'Building and Working in a Team',
        bullets: [
          'Put goals of team (work group or department) above own.',
          'Demonstrates leadership behavior in group situations.',
          'Builds positive working relationships within and across work groups, functions, departments.',
          'Creates ways to share expertise across boundaries to enhance team outputs.',
          'Motivates and inspires whole team to work together toward common goals, vision.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
    ],
  },
  {
    name: 'Leadership',
    leadershipOnly: true,
    subTopics: [
      {
        id: 'lead-1',
        name: 'Strategy Translation and Execution',
        bullets: [
          'Anticipates new business opportunities and challenges through awareness of business environment.',
          'Builds a business plan that addresses all key strategic business issues.',
          'Translates business plan/strategy into action plans, personal objectives etc. with allocation of resources and timelines.',
          'Regularly reviews progress and takes contingency actions as required.',
          'Articulates vision and rationale of business strategy to staff and inspires them to achieve.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
      {
        id: 'lead-2',
        name: 'Leading People',
        bullets: [
          'Sets personal objectives that support fulfillment of staff self potential.',
          'Identifies and develops high potential staff e.g. through coaching or mentoring.',
          'Delegates effectively to competent staff e.g. through empowerment to make independent decisions.',
          'Is fair, objective and consistent when evaluating peoples\' performance.',
          'Recognizes and supports development of talent within and across functions.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
      {
        id: 'lead-3',
        name: 'Business and Results Oriented',
        bullets: [
          'Sets personal objectives that support business plan/strategy.',
          'Actively leads assignments, projects, team etc. with energy and stamina.',
          'Drives results through regular reviews and feedback from subordinates.',
          'Takes prompt action to fix performance problems.',
          'Maintains a positive outlook and encourages team to persevere in face of challenges.',
        ],
        selfScore: 0,
        managerScore: 0,
      },
    ],
  },
];

// Helper: check if a user should have Leadership behaviors
export function isLeadershipRole(hasDirectReports: boolean): boolean {
  return hasDirectReports;
}

// Helper to generate flat BehaviorScore[] from categories
export function generateBehaviorScores(isLeadership: boolean): BehaviorScore[] {
  return BEHAVIOR_CATEGORIES
    .filter(cat => !cat.leadershipOnly || isLeadership)
    .flatMap(cat =>
      cat.subTopics.map(st => ({
        name: cat.name,
        subTopicId: st.id,
        subTopicName: st.name,
        selfScore: 0,
        managerScore: 0,
      }))
    );
}

// Get categories with scores merged in from flat array
export function getBehaviorCategoriesWithScores(
  scores: BehaviorScore[],
  isLeadership: boolean
): (BehaviorCategory & { subTopics: (BehaviorSubTopic & { selfScore: number; managerScore: number })[] })[] {
  return BEHAVIOR_CATEGORIES
    .filter(cat => !cat.leadershipOnly || isLeadership)
    .map(cat => ({
      ...cat,
      subTopics: cat.subTopics.map(st => {
        const score = scores.find(s => s.subTopicId === st.id);
        return {
          ...st,
          selfScore: score?.selfScore ?? 0,
          managerScore: score?.managerScore ?? 0,
        };
      }),
    }));
}

export const CORE_BEHAVIORS = [
  'Customer Focus',
  'Integrity',
  'Professionalism',
  'Innovation',
  'Teamwork',
];

export const LEADERSHIP_BEHAVIOR = 'Leadership';

export const STATUS_LABELS: Record<EvalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  manager_scored: 'Evaluator Scored',
  hr_approved: 'HR Approved',
  hr_rejected: 'HR Rejected',
};

export const SETUP_STATUS_LABELS: Record<SetupStatus, string> = {
  draft: 'Draft',
  submitted: 'Pending Evaluator Review',
  manager_rejected: 'Evaluator Rejected',
  manager_approved: 'Pending HR Review',
  hr_rejected: 'HR Rejected',
  hr_approved: 'Approved',
};

export const SCORE_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Avg',
  3: 'Meets',
  4: 'Exceeds',
  5: 'Outstanding',
};

export function getGrade(score: number): string {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 3.5) return 'Exceeds Expectations';
  if (score >= 2.5) return 'Meets Expectations';
  if (score >= 1.5) return 'Below Expectations';
  return 'Poor Performance';
}

export function getGradeColor(score: number): string {
  if (score >= 4.5) return 'text-score-5';
  if (score >= 3.5) return 'text-score-4';
  if (score >= 2.5) return 'text-score-3';
  if (score >= 1.5) return 'text-score-2';
  return 'text-score-1';
}

export function calcPartI(objectives: Objective[], useManager = false): number {
  const totalWeight = objectives.reduce((s, o) => s + o.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = objectives.reduce((s, o) => {
    const score = useManager ? o.managerScore : o.selfScore;
    return s + (score * o.weight) / 100;
  }, 0);
  return weighted * 0.45;
}

export function calcPartII(behaviors: BehaviorScore[], useManager = false): number {
  if (behaviors.length === 0) return 0;
  const avg = behaviors.reduce((s, b) => s + (useManager ? b.managerScore : b.selfScore), 0) / behaviors.length;
  return avg * 0.45;
}

export function calcPartIII(af: AdjustingFactor, useManager = false): number {
  return (useManager ? af.managerScore : af.selfScore) * 0.10;
}

export function calcFinalScore(eval_: Evaluation, useManager = false): number {
  return calcPartI(eval_.objectives, useManager) + calcPartII(eval_.behaviors, useManager) + calcPartIII(eval_.adjustingFactor, useManager);
}

// Quarterly: average % achievement across objectives (0–100)
export function calcQuarterlyAvg(objectives: Objective[], useManager = false): number {
  if (objectives.length === 0) return 0;
  const total = objectives.reduce((s, o) => {
    const v = useManager ? (o.managerPercent ?? 0) : (o.selfPercent ?? 0);
    return s + v;
  }, 0);
  return total / objectives.length;
}
