export const HELP_LAYER_1 = {
  "everyday-conversations": {
    heading: "Keep your answer going.",
    intro: "Start by answering the question. Then ask yourself:",
    questions: ["What else can I say about this?"],
    outro:
      "Add a reason, example, small detail, personal experience, or related thought.",
  },
  "work-and-professional": {
    heading: "Start with what matters most.",
    intro: "Before you speak, ask yourself:",
    questions: [
      "What does this person need to know?",
      "What do I need from them?",
      "What needs to happen next?",
    ],
    outro: "Start there, then add the details they need.",
  },
  interviews: {
    heading: "Don’t just say it. Show it.",
    intro: "If you say you are good at something, ask yourself:",
    questions: ["When have I done this?", "What did I do?", "What happened?"],
    outro: "Use a real example when you can.",
  },
  "difficult-conversations": {
    heading: "Know what you need to say.",
    intro: "Before you speak, ask yourself:",
    questions: [
      "What happened?",
      "What is the problem?",
      "What do I need to say or ask for?",
    ],
    outro: "Then say the part that matters most.",
  },
  "explain-clearly": {
    heading: "Start with the main idea.",
    intro: "Before you explain, ask yourself:",
    questions: [
      "What do I want them to understand?",
      "What do they need to know?",
      "What example could make this easier to understand?",
    ],
    outro: "Then explain it simply.",
  },
  "opinions-and-arguments": {
    heading: "Say what you think, then explain why.",
    intro: "Start with your opinion. Then ask yourself:",
    questions: [
      "Why do I think this?",
      "What makes me say that?",
      "What example could help explain my point?",
    ],
    outro: "You don’t need many reasons. Explain one good reason well.",
  },
  "business-and-pitching": {
    heading: "Make people understand why it matters.",
    intro: "Start by explaining your idea. Then ask yourself:",
    questions: [
      "What problem does this solve?",
      "Who does it help?",
      "Why should they care?",
    ],
    outro: "Don’t just explain what it is. Make the value clear.",
  },
  "public-speaking": {
    heading: "Know what you want people to take away.",
    intro: "Before you speak, ask yourself:",
    questions: [
      "What do I want them to understand?",
      "What do I want them to remember?",
      "What should they take away from this?",
    ],
    outro: "Then make your opening, main points, and ending support that idea.",
  },
  storytelling: {
    heading: "Focus on what makes the story interesting.",
    intro: "First, help us understand what is happening. Then ask yourself:",
    questions: [
      "What happened?",
      "What changed or surprised me?",
      "What makes this part worth hearing?",
    ],
    outro: "You don’t need to tell every detail. Choose the ones that matter.",
  },
};

export const HELP_LINK_TEXT = {
  question: "Want more help organising your answer?",
  action: "Learn about communication structures",
};

export const STRUCTURES_INTRO = [
  "A communication structure gives your thoughts a simple order, so your answer is easier to follow.",
  "Loquiex uses four: PREP, STAR, PPF, and PAS. Choose the one that fits what you are trying to communicate.",
];

export const STRUCTURES = [
  {
    id: "prep",
    name: "PREP",
    bestFor: "Opinions, explanations, and recommendations.",
    intro: "Use PREP to make a clear point and support it.",
    steps: [
      { label: "Point", text: "What is your answer or position?" },
      { label: "Reason", text: "Why do you think that?" },
      { label: "Example", text: "What experience or detail supports your thinking?" },
      { label: "Point", text: "What is your conclusion or takeaway?" },
    ],
    example: {
      question: "Is working from home better than working in an office?",
      parts: [
        { label: "Point", text: "I think it depends on the person and the kind of work they do." },
        { label: "Reason", text: "Working from home can make it easier to focus, but some people benefit from in-person collaboration." },
        { label: "Example", text: "Someone doing independent work may prefer home, while a new teammate may learn faster in an office." },
        { label: "Point", text: "The best option is the one that helps you do your work well." },
      ],
    },
    note: "Develop one good reason properly instead of rushing through several.",
  },
  {
    id: "star",
    name: "STAR",
    bestFor: "Personal experiences, stories, and interview questions.",
    intro: "Use STAR to explain what happened, what you did, and the outcome.",
    steps: [
      { label: "Situation", text: "What was happening?" },
      { label: "Task", text: "What needed to be done?" },
      { label: "Action", text: "What did you do?" },
      { label: "Result", text: "What happened in the end?" },
    ],
    example: {
      question: "Tell us about a time you helped someone.",
      parts: [
        { label: "Situation", text: "My cousin was struggling with a subject before an important exam." },
        { label: "Task", text: "She needed help understanding a few topics." },
        { label: "Action", text: "I asked which parts were confusing and worked through them with simple examples." },
        { label: "Result", text: "She became more confident and did well in the exam." },
      ],
    },
    note: "Give enough context to understand the situation, then focus on your actions and the result.",
  },
  {
    id: "ppf",
    name: "PPF",
    bestFor: "Updates, progress reports, plans, and changes.",
    intro: "Use PPF to explain how a situation has changed over time.",
    steps: [
      { label: "Past", text: "What has happened so far?" },
      { label: "Present", text: "Where does the situation stand now?" },
      { label: "Future", text: "What happens next?" },
    ],
    example: {
      question: "Tell us about something you are working towards.",
      parts: [
        { label: "Past", text: "I wanted to exercise regularly but kept putting it off." },
        { label: "Present", text: "I have started taking walks several times a week." },
        { label: "Future", text: "I want to keep building a routine and eventually add strength training." },
      ],
    },
    note: "Spend time on the parts that help the listener understand where things are going.",
  },
  {
    id: "pas",
    name: "PAS",
    bestFor: "Pitches, proposals, and persuasive communication.",
    intro: "Use PAS to explain a problem, why it matters, and a possible solution.",
    steps: [
      { label: "Problem", text: "What problem are people experiencing?" },
      { label: "Agitate", text: "Why does the problem matter?" },
      { label: "Solution", text: "How could your idea solve it?" },
    ],
    example: {
      question: "Pitch a product you wish existed.",
      parts: [
        { label: "Problem", text: "Finding a thoughtful gift can take hours when you do not know what to get." },
        { label: "Agitate", text: "You can spend a long time searching and still worry the gift will feel generic." },
        { label: "Solution", text: "A service could ask about the person and your budget, then suggest a few personal options." },
      ],
    },
    note: "Explain why the problem matters without exaggerating it.",
  },
];

export const CHOOSE_WHAT_FITS = {
  title: "CHOOSE WHAT FITS",
  body: [
    "More than one structure may work for the same prompt. Choose the one that fits what you are trying to communicate.",
    "Use a structure to support your thinking, not control your speaking. Adapt it to the situation and speak naturally.",
  ],
};
