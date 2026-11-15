import type { Accent, Cluster, Decision, MediaItem, Metric, Note, Project, Section, Site } from './types';

/**
 * Default published content.
 *
 * Verified statements come from the résumé. Anything marked `placeholder: true`
 * (sections) or `verified: false` (board notes) is illustrative scaffolding and
 * is labelled as such on the site until it is replaced.
 */

let n = 0;
const id = (p: string) => `${p}-${(++n).toString(36)}`;

const metric = (value: string, label: string, context: string): Metric => ({ id: id('m'), value, label, context });
const note = (text: string, verified = false): Note => ({ id: id('n'), text, verified });
const cluster = (title: string, color: Accent, notes: Note[]): Cluster => ({ id: id('c'), title, color, notes });
const item = (title: string, body: string): Decision => ({ id: id('d'), title, body });
const shot = (caption: string): MediaItem => ({ id: id('i'), kind: 'image', src: '', alt: '', caption });

const base = (kicker: string, title: string, placeholder = false) => ({ id: id('s'), kicker, title, placeholder });

const text = (kicker: string, title: string, body: string, placeholder = false): Section => ({
  ...base(kicker, title, placeholder),
  type: 'text',
  body,
});

const screens = (title: string, captions: string[]): Section => ({
  ...base('Final interfaces', title, true),
  type: 'media',
  intro: 'Final screens and prototype recordings will be added here.',
  items: captions.map(shot),
});

const reflection = (): Section =>
  text(
    'Reflection',
    'What I would do differently',
    'Placeholder. This section will cover limitations of the evidence, what stayed unresolved, and what I would test next.',
    true,
  );

const prototype = (): Section => ({
  ...base('Prototype', 'Walk through the prototype', true),
  type: 'embed',
  intro: 'An interactive Figma prototype can be embedded here. Until a link is added, visitors see this fallback.',
  kind: 'prototype',
  url: '',
});

const TODO = 'Placeholder — ';

const projects: Project[] = [
  {
    id: 'p-iranicard',
    slug: 'iranicard',
    status: 'published',
    title: 'IraniCard',
    company: 'IraniCard',
    headline: 'Redesigning a fintech website and dashboard so people can find, compare and complete.',
    summary:
      'A 150+ screen redesign across the public website and user dashboard, driven by behavioral analytics, interviews and repeated usability testing.',
    period: 'Jun 2025 – Present',
    role: 'Product Designer',
    employment: 'Full-time · Iran',
    team: 'Product, Engineering, Marketing, SEO and Support, working in Agile/Scrum',
    scope: 'Public website, user dashboard, desktop and mobile',
    domains: ['Fintech', 'AI-assisted'],
    platforms: ['Web', 'Dashboard', 'Mobile web'],
    methods: ['Microsoft Clarity', 'User interviews', 'Maze', 'Usability testing', 'A/B testing'],
    accent: 'blue',
    cover: { variant: 'dashboard', src: '', alt: '' },
    metrics: [
      metric('62% → 88%', 'Task success', 'Usability testing'),
      metric('−31%', 'Average task-completion time', 'Test sessions'),
      metric('150+', 'Screens in the redesign', 'Scope'),
    ],
    links: [],
    sections: [
      text(
        'Overview',
        'One redesign, two surfaces',
        'I led end-to-end prototyping and contributed to a redesign of more than 150 screens across IraniCard’s public website and user dashboard. The work focused on information architecture, navigation, search and product discovery, and on the flows where people were most likely to give up.',
      ),
      {
        ...base('Problem', 'Where people were getting stuck'),
        type: 'list',
        intro:
          'A dashboard audit and behavioral data pointed to a small number of high-impact problems rather than one broad “usability” issue.',
        items: [
          'A high-friction OTP flow with roughly 90% baseline abandonment, which also pushed people toward manual support.',
          'Navigation, search and product discovery that made it hard to reach the right product.',
          'Accessibility, hierarchy and conversion issues across desktop and mobile dashboard views.',
        ],
      },
      {
        ...base('Research', 'How the evidence was gathered'),
        type: 'list',
        intro: 'Quantitative signals showed where behavior broke down; qualitative sessions explained why.',
        items: [
          'Microsoft Clarity recordings and heatmaps to locate friction in real sessions.',
          'User interviews to understand intent and expectations.',
          'Maze and moderated usability testing to measure task success and completion time.',
          'A/B testing to compare alternatives for IA, navigation, search and discovery.',
        ],
      },
      {
        ...base('Synthesis', 'From observations to priorities', true),
        type: 'board',
        intro:
          'Themes below reflect the real focus areas of the project. Individual notes with a dashed outline are placeholders for findings that will be added from the research archive.',
        figjamUrl: '',
        clusters: [
          cluster('Navigation & IA', 'blue', [
            note('IA and navigation were a primary focus of the redesign.', true),
            note(TODO + 'where people expected to find a product category.'),
            note(TODO + 'labels that were misread in tree tests.'),
          ]),
          cluster('Search & discovery', 'violet', [
            note('Search and product discovery were tested and iterated.', true),
            note(TODO + 'what people typed versus what the catalog is called.'),
            note(TODO + 'how people compared similar products.'),
          ]),
          cluster('OTP flow', 'pink', [
            note('~90% baseline abandonment in the OTP flow.', true),
            note('Abandonment created dependency on manual support.', true),
            note(TODO + 'the step where most sessions ended.'),
          ]),
          cluster('Dashboard audit', 'yellow', [
            note('Findings prioritized across accessibility, hierarchy, search and conversion.', true),
            note(TODO + 'the highest-severity accessibility issue.'),
          ]),
        ],
      },
      {
        ...base('Flow', 'Streamlining the OTP flow', true),
        type: 'flow',
        intro: 'The goal was a clearer path that Product and Engineering could agree on. The steps below are placeholders for the final flow.',
        steps: [
          item('Request', TODO + 'what triggers verification and what the person is told.'),
          item('Receive', TODO + 'delivery, timing and resend behavior.'),
          item('Enter', TODO + 'input, errors and recovery.'),
          item('Continue', TODO + 'how the person returns to their task.'),
        ],
      },
      {
        ...base('Decisions', 'Key design decisions'),
        type: 'decisions',
        intro: '',
        items: [
          item(
            'A component-based approach across the redesign',
            'Reusable patterns were standardized and implementation constraints were coordinated with Engineering, which improved consistency and handoff quality.',
          ),
          item(
            'An AI-assisted product-comparison experience',
            'I proposed and co-designed the concept, then aligned Product, Engineering, Marketing, SEO and Support on scope, trade-offs and delivery priorities.',
          ),
          item(
            'Prioritized initiatives instead of a single backlog',
            'Audit findings were translated into ranked accessibility, hierarchy, search and conversion initiatives for desktop and mobile.',
          ),
        ],
      },
      screens('Website and dashboard', ['Home and product discovery', 'Search results', 'Dashboard overview', 'OTP verification']),
      prototype(),
      {
        ...base('Validation', 'What changed in testing'),
        type: 'metrics',
        intro:
          'These figures come from usability tests and test sessions. They describe measured performance in testing, not production analytics.',
        items: [
          metric('62% → 88%', 'Task success', 'Usability testing'),
          metric('−31%', 'Average task-completion time', 'Test sessions'),
          metric('~90%', 'OTP-flow abandonment before the redesign', 'Baseline, not an outcome'),
        ],
      },
      reflection(),
    ],
    seo: { title: '', description: '' },
  },
  {
    id: 'p-vitalyze',
    slug: 'vitalyze',
    status: 'published',
    title: 'Vitalyze',
    company: 'Vitalyze',
    headline: 'A 100+ screen healthcare product, from medical intake to prescription fulfillment.',
    summary:
      'Sole product designer for an iOS/Android healthcare product and its physician and admin workflows, from discovery through handoff.',
    period: 'Mar 2026 – Present',
    role: 'Product Designer (sole designer)',
    employment: 'Freelance · Remote',
    team: 'Sole designer working with product and engineering',
    scope: 'Onboarding, medical intake, Trainerize integration, telehealth, prescription, fulfillment, physician/admin',
    domains: ['Healthcare'],
    platforms: ['iOS', 'Android', 'Admin web'],
    methods: ['Product discovery', 'User journeys', 'Usability testing', 'Design systems'],
    accent: 'green',
    cover: { variant: 'mobile', src: '', alt: '' },
    metrics: [
      metric('91%', 'Task completion', 'Usability testing'),
      metric('−35%', 'Design-to-development clarification cycles', 'Team process'),
      metric('100+', 'Screens across patient and clinician sides', 'Scope'),
    ],
    links: [],
    sections: [
      text(
        'Overview',
        'One designer, the whole care journey',
        'I own the design of a healthcare product for iOS and Android, covering patient-facing journeys and the physician and admin tools behind them. The work runs from discovery through engineering handoff.',
      ),
      {
        ...base('Scope', 'What the product has to connect'),
        type: 'list',
        intro: 'Each area has its own rules, but patients experience them as one journey.',
        items: [
          'Onboarding and medical intake',
          'Trainerize integration',
          'Telehealth consultations',
          'Prescription and fulfillment',
          'Physician and admin workflows',
        ],
      },
      {
        ...base('Journey', 'The core patient journey', true),
        type: 'flow',
        intro: 'Stages reflect the real product areas. Descriptions are placeholders for the final journey map.',
        steps: [
          item('Onboard', TODO + 'account setup and expectations.'),
          item('Intake', TODO + 'medical history and eligibility.'),
          item('Consult', TODO + 'telehealth session with a physician.'),
          item('Prescribe', TODO + 'review, approval and patient confirmation.'),
          item('Fulfil', TODO + 'delivery, tracking and follow-up.'),
        ],
      },
      {
        ...base('Decisions', 'Simplify the journey, standardize the parts'),
        type: 'decisions',
        intro: '',
        items: [
          item(
            'Simplified core patient journeys',
            'Core journeys were reduced to the steps patients need, which improved completion in usability tests to 91%.',
          ),
          item(
            'Shared patterns across mobile and physician/admin',
            'Reusable patterns were standardized across both sides of the product, reducing design-to-development clarification cycles by 35%.',
          ),
        ],
      },
      screens('Patient app and clinician tools', ['Onboarding', 'Medical intake', 'Telehealth', 'Physician review']),
      reflection(),
    ],
    seo: { title: '', description: '' },
  },
  {
    id: 'p-didgah',
    slug: 'didgah',
    status: 'published',
    title: 'Didgah',
    company: 'Didgah',
    headline: 'Co-creating a zero-to-one review product with AI-assisted summaries.',
    summary:
      'Shaped product direction in a two-person team, from discovery through validation, and built a reusable design system along the way.',
    period: 'Sep 2023 – May 2025',
    role: 'Product Designer / Co-creator',
    employment: 'Full-time · Iran',
    team: 'Two-person founding team',
    scope: 'Product direction, discovery, validation, design system',
    domains: ['SaaS', 'AI-assisted'],
    platforms: ['Web'],
    methods: ['Product discovery', 'Design systems', 'Usability testing'],
    accent: 'violet',
    cover: { variant: 'reviews', src: '', alt: '' },
    metrics: [
      metric('−44%', 'Review-comprehension time', 'Test sessions'),
      metric('0 → 1', 'From discovery to a validated product', 'Scope'),
      metric('2', 'People on the team', 'Team'),
    ],
    links: [],
    sections: [
      text(
        'Overview',
        'A product, not just a design',
        'Didgah is a review product I co-created in a two-person team. I shaped product direction from discovery through validation and built the design system the product runs on.',
      ),
      text(
        'The bet',
        'Reading reviews takes too long',
        'The product uses AI-assisted aggregation and summaries so people can understand a body of reviews without reading every one. In test sessions this reduced review-comprehension time by 44%.',
      ),
      {
        ...base('Discovery', 'What we needed to learn', true),
        type: 'board',
        intro: 'Placeholder board. Research questions and what we learned will be added from the project archive.',
        figjamUrl: '',
        clusters: [
          cluster('Questions', 'violet', [
            note(TODO + 'how people decide a review is trustworthy.'),
            note(TODO + 'when a summary is enough and when it is not.'),
          ]),
          cluster('Signals', 'green', [
            note('AI summaries reduced comprehension time by 44% in test sessions.', true),
            note(TODO + 'what people still opened the full reviews for.'),
          ]),
          cluster('Risks', 'orange', [note(TODO + 'where a summary could mislead.')]),
        ],
      },
      text(
        'System',
        'A reusable design system',
        'Building the system early kept a two-person team fast. Component documentation and examples will be added here.',
        true,
      ),
      screens('Product', ['Review overview', 'AI summary', 'Design system']),
      reflection(),
    ],
    seo: { title: '', description: '' },
  },
  {
    id: 'p-directam',
    slug: 'directam',
    status: 'published',
    title: 'Directam',
    company: 'Directam',
    headline: 'Turning existing research into a mobile-first redesign for an AI messaging product.',
    summary:
      'An approved, implementation-ready redesign for an AI-powered Instagram messaging product, with a flatter structure and a clearer pricing task.',
    period: 'Aug 2026 – Sep 2026',
    role: 'Product Designer',
    employment: 'Freelance · Remote',
    team: 'Stakeholders and engineering',
    scope: 'Information architecture, pricing, mobile-first redesign, handoff',
    domains: ['SaaS', 'AI-assisted'],
    platforms: ['Mobile web'],
    methods: ['Research synthesis', 'Information architecture', 'Usability testing'],
    accent: 'pink',
    cover: { variant: 'chat', src: '', alt: '' },
    metrics: [
      metric('58% → 87%', 'Pricing-task success', 'Test scenarios'),
      metric('−33%', 'Navigation depth', 'Proposed structure'),
    ],
    links: [],
    sections: [
      text(
        'Overview',
        'Six weeks, one approved direction',
        'Directam is an AI-powered Instagram messaging product. I translated research the team already had into a mobile-first redesign, aligned the final direction with stakeholders, and delivered implementation-ready design and handoff.',
      ),
      {
        ...base('Synthesis', 'Starting from research that already existed', true),
        type: 'board',
        intro: 'Placeholder board showing how inherited research was regrouped into design priorities.',
        figjamUrl: '',
        clusters: [
          cluster('Structure', 'pink', [
            note('Navigation depth reduced by 33% in the proposed structure.', true),
            note(TODO + 'sections people could not locate.'),
          ]),
          cluster('Pricing', 'yellow', [
            note('Pricing-task success moved from 58% to 87% in test scenarios.', true),
            note(TODO + 'what made plans hard to compare.'),
          ]),
          cluster('Mobile', 'blue', [note(TODO + 'the tasks people do on a phone first.')]),
        ],
      },
      {
        ...base('Outcome', 'What the redesign changed'),
        type: 'metrics',
        intro: 'Both figures describe the proposed design in testing, before implementation.',
        items: [
          metric('58% → 87%', 'Pricing-task success', 'Test scenarios'),
          metric('−33%', 'Navigation depth', 'Proposed structure'),
        ],
      },
      screens('Mobile-first redesign', ['Inbox', 'Automation setup', 'Pricing']),
      reflection(),
    ],
    seo: { title: '', description: '' },
  },
  {
    id: 'p-apollon',
    slug: 'apollon',
    status: 'published',
    title: 'Apollon',
    company: 'Apollon',
    headline: 'Trust-sensitive payment interactions for a launched UK PropTech platform.',
    summary: 'Interaction design for banking-connected recurring rental payments, inside a team of three designers and seven developers.',
    period: 'Feb 2021 – Aug 2023',
    role: 'Product Designer / Interaction Designer',
    employment: 'Freelance · UK',
    team: '3 designers, 7 developers',
    scope: 'Recurring rental payments, banking connection',
    domains: ['Fintech', 'PropTech'],
    platforms: ['Web'],
    methods: ['Interaction design', 'Product testing'],
    accent: 'orange',
    cover: { variant: 'payments', src: '', alt: '' },
    metrics: [metric('+21%', 'Payment-flow completion', 'Product testing')],
    links: [],
    sections: [
      text(
        'Overview',
        'Designing for trust',
        'Apollon is a launched UK PropTech platform with banking-connected recurring rental payments. I designed the product interactions where trust matters most; payment-flow completion improved by 21% in product testing.',
      ),
      screens('Payment flow', ['Connect a bank', 'Set up a recurring payment', 'Confirmation']),
      reflection(),
    ],
    seo: { title: '', description: '' },
  },
  {
    id: 'p-hantana',
    slug: 'hantana',
    status: 'published',
    title: 'Hantana',
    company: 'Hantana',
    headline: 'Launching a localized, lower-cost user-behavior analytics product.',
    summary: 'Co-designed and launched in a four-person startup team, working closely with engineering from early definition through launch.',
    period: 'Jan 2019 – Nov 2019',
    role: 'Product Designer',
    employment: 'Full-time · Iran',
    team: 'Four-person startup team',
    scope: 'Product definition, design, launch',
    domains: ['SaaS', 'Analytics'],
    platforms: ['Web'],
    methods: ['Product definition', 'Close collaboration with engineering'],
    accent: 'yellow',
    cover: { variant: 'analytics', src: '', alt: '' },
    metrics: [metric('12+', 'Business customers supported in adoption', 'After launch')],
    links: [],
    sections: [
      text(
        'Overview',
        'Analytics a local market could afford',
        'Hantana is a localized, lower-cost user-behavior analytics product. I co-designed and launched it in a four-person startup team and supported adoption by more than 12 business customers.',
      ),
      screens('Product', ['Session overview', 'Heatmaps']),
      reflection(),
    ],
    seo: { title: '', description: '' },
  },
];

export const defaultSite: Site = {
  version: 1,
  profile: {
    name: 'Moein Poursadegh',
    title: 'Product Designer',
    focus: 'UX, Research & Interaction Design',
    location: 'Tehran, Iran',
    headline: 'I design *clear paths* through complex products.',
    summary:
      'Product designer working across fintech, healthcare, SaaS and AI-assisted products. I combine product strategy, research and interaction design to align teams, prioritize the problems that matter, and move work from discovery to handoff.',
    bio: [
      'I’m a product designer experienced in owning complex, cross-platform product initiatives across fintech, healthcare, SaaS and AI-assisted products.',
      'My work combines product strategy, research, interaction design and data-informed decision making: aligning stakeholders, prioritizing high-impact problems, and moving work from discovery through validation and engineering handoff.',
      'I studied the restoration of historical monuments before moving into digital product design through startup product work, interaction design practice and formal UX training.',
    ],
    email: 'moeinpoursadegh@gmail.com',
    linkedin: 'https://www.linkedin.com/in/moein-poursadegh',
    website: 'https://moeinp.ir',
    phone: '',
    showPhone: false,
    portrait: { src: '', alt: '' },
  },
  experience: [
    {
      id: 'e-iranicard',
      company: 'IraniCard',
      role: 'Product Designer',
      period: 'Jun 2025 – Present',
      meta: 'Full-time · Iran',
      projectSlug: 'iranicard',
      bullets: [
        'Led end-to-end prototyping and contributed to a 150+ screen redesign across the public website and user dashboard, reducing average task-completion time by 31% in test sessions.',
        'Used Microsoft Clarity, interviews, Maze, usability testing and A/B testing to improve IA, navigation, search and product discovery; task success increased from 62% to 88%.',
        'Prioritized and streamlined a high-friction OTP flow with ~90% baseline abandonment, aligning Product and Engineering around a clearer experience that reduced dependency on manual support.',
        'Audited dashboard behavior and translated findings into prioritized accessibility, hierarchy, search and conversion initiatives across desktop and mobile.',
        'Proposed and co-designed an AI-assisted product-comparison experience; aligned Product, Engineering, Marketing, SEO and Support on scope, trade-offs and delivery priorities within Agile/Scrum.',
        'Extended a component-based design approach across the redesign, standardizing reusable patterns and coordinating implementation constraints with Engineering.',
      ],
    },
    {
      id: 'e-vitalyze',
      company: 'Vitalyze',
      role: 'Product Designer',
      period: 'Mar 2026 – Present',
      meta: 'Freelance, concurrent · Remote',
      projectSlug: 'vitalyze',
      bullets: [
        'Sole product designer for a 100+ screen iOS/Android healthcare product, owning onboarding, medical intake, Trainerize integration, telehealth, prescription, fulfillment and physician/admin workflows from discovery through handoff.',
        'Simplified core patient journeys and standardized reusable patterns across mobile and physician/admin experiences, improving usability-test completion to 91% and reducing design-to-development clarification cycles by 35%.',
      ],
    },
    {
      id: 'e-directam',
      company: 'Directam',
      role: 'Product Designer',
      period: 'Aug 2026 – Sep 2026',
      meta: 'Freelance, concurrent · Remote',
      projectSlug: 'directam',
      bullets: [
        'Translated existing research into an approved mobile-first redesign for an AI-powered Instagram messaging product, reducing navigation depth by 33% in the proposed structure.',
        'Improved pricing-task success from 58% to 87% in test scenarios; aligned the final direction with stakeholders and delivered implementation-ready design and handoff.',
      ],
    },
    {
      id: 'e-didgah',
      company: 'Didgah',
      role: 'Product Designer / Co-creator',
      period: 'Sep 2023 – May 2025',
      meta: 'Full-time · Iran',
      projectSlug: 'didgah',
      bullets: [
        'Co-created a zero-to-one review product in a two-person team, shaping product direction from discovery through validation and building a reusable design system; AI-assisted aggregation and summaries reduced review-comprehension time by 44% in test sessions.',
      ],
    },
    {
      id: 'e-apollon',
      company: 'Apollon',
      role: 'Product Designer / Interaction Designer',
      period: 'Feb 2021 – Aug 2023',
      meta: 'Freelance · UK',
      projectSlug: 'apollon',
      bullets: [
        'Designed trust-sensitive product interactions for a launched UK PropTech platform with banking-connected recurring rental payments; improved payment-flow completion by 21% in product testing within a 3-designer / 7-developer team.',
      ],
    },
    {
      id: 'e-hantana',
      company: 'Hantana',
      role: 'Product Designer',
      period: 'Jan 2019 – Nov 2019',
      meta: 'Full-time · Iran',
      projectSlug: 'hantana',
      bullets: [
        'Co-designed and launched a localized, lower-cost user-behavior analytics product in a four-person startup team; supported adoption by 12+ business customers and collaborated closely with engineering from early definition through launch.',
      ],
    },
  ],
  skills: [
    {
      id: 'k-product',
      title: 'Product & Strategy',
      items: [
        'Product Strategy',
        'Product Discovery',
        'User-centered Design',
        'UX Design',
        'Interaction Design',
        'Information Architecture',
        'User Journeys',
        'Cross-platform Design',
        'Mobile-first Design',
      ],
    },
    {
      id: 'k-research',
      title: 'Research & Analytics',
      items: [
        'UX Research',
        'User Interviews',
        'Usability Testing',
        'Maze',
        'A/B Testing',
        'Behavioral Analytics',
        'Microsoft Clarity',
        'Data-driven Decision Making',
      ],
    },
    {
      id: 'k-systems',
      title: 'Systems & Operations',
      items: [
        'Design Systems',
        'Design Systems Governance',
        'Design Ops',
        'Component-based Design',
        'Accessibility / WCAG',
        'Conversion Optimization',
        'Developer Handoff',
      ],
    },
    {
      id: 'k-methods',
      title: 'Methods & Collaboration',
      items: [
        'Agile',
        'Scrum',
        'Design Sprint',
        'Design Thinking',
        'Lean UX',
        'Cross-functional Collaboration',
        'Stakeholder Management',
      ],
    },
    { id: 'k-tools', title: 'Tools', items: ['Figma', 'Framer', 'ProtoPie', 'Jira', 'Notion'] },
  ],
  education: [
    {
      id: 'ed-1',
      title: 'B.A. in Restoration of Historical Monuments',
      org: 'Art University of Isfahan',
      period: '2018 – 2022',
      note: 'Career transition to digital product design through startup product work, interaction design practice and formal UX training.',
    },
    { id: 'ed-2', title: 'Google UX Design Professional Certificate', org: 'Coursera', period: '', note: '' },
  ],
  resume: { src: '/resume/Moein_Poursadegh_Resume.pdf', fileName: 'Moein_Poursadegh_Resume.pdf', updated: '' },
  nav: [
    { id: 'nav-work', label: 'Work', path: '/work', visible: true },
    { id: 'nav-about', label: 'About', path: '/about', visible: true },
    { id: 'nav-resume', label: 'Résumé', path: '/resume', visible: true },
    { id: 'nav-contact', label: 'Contact', path: '/contact', visible: true },
  ],
  featured: ['p-iranicard', 'p-vitalyze', 'p-didgah', 'p-directam'],
  seo: {
    title: 'Moein Poursadegh — Product Designer',
    description:
      'Product designer specializing in UX, research and interaction design across fintech, healthcare, SaaS and AI-assisted products.',
    ogImage: '',
  },
  projects,
};
