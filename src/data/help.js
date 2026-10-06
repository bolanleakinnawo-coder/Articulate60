// src/data/help.js
// Layer 1: short popup help, one per category (keys = category ids from the generated prompts/index.js)
// Layer 2: the "Structure your answer" page content

export const HELP_LAYER_1 = {
  "everyday-conversations": {
    heading: "Don’t stop at your first sentence.",
    body: [
      "If your answer feels too short, ask yourself: What else is there to say about this?",
      "A reason, example, small detail, personal experience, or related thought can give your answer somewhere to go.",
      "The goal isn’t to make a simple question complicated. It’s to turn a simple answer into something another person can actually respond to.",
    ],
  },
  "work-and-professional": {
    heading: "Know your point before you start talking.",
    body: [
      "What is the one thing the other person needs to understand from your answer?",
      "Lead with that, then add the information that helps explain, support, or move it forward. If something doesn’t help the other person understand or act, it probably doesn’t need to take up much space.",
    ],
  },
  interviews: {
    heading: "Don’t make the listener do the work for you.",
    body: [
      "If you’re making a claim about yourself, show what makes it true. If you’re describing an experience, give enough detail to understand what happened and what you did. If you’re answering a hypothetical question, make your thinking visible.",
      "A strong answer gives the interviewer something concrete to remember.",
    ],
  },
  "difficult-conversations": {
    heading: "Say the thing that actually needs to be said.",
    body: [
      "It’s easy to get lost in the history, emotions, or everything the other person did wrong.",
      "Bring it back to the message. What happened? What is the issue? What do you need to say, ask for, or make clear?",
      "Being clear doesn’t mean being harsh.",
    ],
  },
  "explain-clearly": {
    heading: "Don’t give the listener everything. Give them what they need.",
    body: [
      "Start with the main idea. Then choose the details that make it easier to understand.",
      "A good example, comparison, analogy, or step-by-step explanation can often do more than a long explanation.",
      "If the listener has to sort through your information to find the point, the explanation probably needs simplifying.",
    ],
  },
  "opinions-and-arguments": {
    heading: "Your opinion is only the starting point.",
    body: [
      "Once you’ve said what you think, make the reasoning behind it clear.",
      "Why do you think that? What makes you say so? Is there an example that helps prove your point?",
      "You don’t need to win the argument. You need to make your thinking easy to follow.",
    ],
  },
  "business-and-pitching": {
    heading: "Give people a reason to care.",
    body: [
      "An idea can sound great to you and still mean very little to someone else.",
      "Connect it to a problem, need, desire, benefit, or opportunity that matters to the person listening. Then make it clear how your idea addresses it.",
      "Don’t just describe the thing. Make its value obvious.",
    ],
  },
  "public-speaking": {
    heading: "Give your answer somewhere to go.",
    body: [
      "Before you start, know what you want the audience to leave with.",
      "Then make each part of your answer contribute to that point. A strong opening gets attention, the middle develops the idea, and the ending gives people something to take away.",
      "Even 60 seconds needs direction.",
    ],
  },
  storytelling: {
    heading: "Don’t tell us everything. Tell us what matters.",
    body: [
      "Give enough context to understand the moment, then focus on the parts that make it worth hearing.",
      "What changed? What surprised you? What did you do? What did you realise?",
      "The best details aren’t necessarily the most detailed ones. They’re the ones that help us see, feel, or understand the moment.",
    ],
  },
};

export const HELP_LINK_TEXT = {
  question: "Want more help organising your answer?",
  action: "Learn about communication structures",
};

// ---------- Layer 2 ----------

export const STRUCTURES_INTRO = [
  "Knowing what you want to say is one thing. Knowing how to put it together is another.",
  "A communication structure gives your thoughts a simple order, so your answer is easier to follow.",
  "Articulate60 uses four: PREP, STAR, PPF, and PAS.",
  "You won’t need a structure for every prompt, and there isn’t always one right structure to use. The best one depends on what you’re trying to communicate.",
];

export const STRUCTURES = [
  {
    id: "prep",
    name: "PREP",
    bestFor:
      "opinions, arguments, explanations, recommendations, and making a clear point.",
    intro:
      "PREP is a simple structure for organising your thoughts when you want to make a clear point.",
    steps: [
      { label: "Point", text: "What is your answer or position?" },
      { label: "Reason", text: "Why do you think that?" },
      {
        label: "Example",
        text: "What specific experience, detail, or situation supports your thinking?",
      },
      { label: "Point", text: "What’s your conclusion or takeaway?" },
    ],
    example: {
      question: "Is working from home better than working in an office?",
      parts: [
        {
          label: "Point",
          text: "“I think working from home is better for some people, but I wouldn’t say it’s better for everyone.”",
        },
        {
          label: "Reason",
          text: "“It gives you more control over your environment and can make it easier to focus, but you also lose some of the structure and interaction that come with being around other people.”",
        },
        {
          label: "Example",
          text: "“For example, someone who does most of their work independently might get a lot more done at home without constant interruptions. But for someone who learns by asking questions, collaborating with colleagues, or simply needs the structure of an office, working from home might actually make their work harder.”",
        },
        {
          label: "Point",
          text: "“So for me, the better option depends on the person and the kind of work they do. Flexibility is great, but it shouldn’t come at the expense of how well you actually work.”",
        },
      ],
    },
    note: "You don’t need five different reasons. Develop one good idea properly before moving on.",
  },
  {
    id: "star",
    name: "STAR",
    bestFor:
      "stories, personal experiences, interview questions, and situations where you need to show what you did.",
    intro:
      "STAR is a structure for turning an experience into a clear story, from what happened to how it ended.",
    steps: [
      { label: "Situation", text: "What was happening?" },
      {
        label: "Task",
        text: "What needed to be done, and what were you responsible for?",
      },
      { label: "Action", text: "What did you actually do?" },
      { label: "Result", text: "What happened in the end?" },
    ],
    example: {
      question: "Tell us about a time you helped someone.",
      parts: [
        {
          label: "Situation",
          text: "“My younger cousin was preparing for an important exam and was really struggling with one of the subjects.”",
        },
        {
          label: "Task",
          text: "“She had been studying for weeks, but she still couldn’t understand some of the topics, and the exam was getting closer.”",
        },
        {
          label: "Action",
          text: "“Instead of trying to teach her everything, I asked her which parts she found most confusing. We went through those topics one at a time, and I used simple examples she could relate to. I also gave her a few questions to answer on her own so we could see what she had actually understood.”",
        },
        {
          label: "Result",
          text: "“By the end, she was much more confident and could explain the topics back to me without my help. She ended up doing well in the exam.”",
        },
      ],
    },
    note: "You don’t need to tell the listener every detail. Give enough context to understand the situation, then focus on what you actually did and what happened as a result.",
  },
  {
    id: "ppf",
    name: "PPF",
    bestFor:
      "updates, progress reports, plans, changes, and anything that moves from what happened to what’s happening now and what comes next.",
    intro:
      "PPF is a simple structure for organising information across time, from what happened before to what’s happening now and what comes next.",
    steps: [
      { label: "Past", text: "What has happened so far?" },
      { label: "Present", text: "Where does the situation stand now?" },
      { label: "Future", text: "What happens next?" },
    ],
    example: {
      question: "Tell us about something you’re working towards.",
      parts: [
        {
          label: "Past",
          text: "“For a long time, I wanted to start exercising regularly, but I kept treating it like something I would get around to eventually.”",
        },
        {
          label: "Present",
          text: "“A few weeks ago, I decided to take it more seriously. I’ve started going for walks several times a week, and I’m slowly building a routine that I can actually maintain.”",
        },
        {
          label: "Future",
          text: "“I want to keep going until exercise feels like a normal part of my week rather than something I have to convince myself to do. Eventually, I’d also like to start strength training.”",
        },
      ],
    },
    note: "Notice how the answer moves through what was happening before, where things stand now, and what comes next. You don’t need to spend equal time on each part. Use the parts that help the listener understand where things are going.",
  },
  {
    id: "pas",
    name: "PAS",
    bestFor:
      "pitches, persuasion, proposals, and situations where you want people to see a problem and care about your solution.",
    intro:
      "PAS is a structure for presenting a problem, showing why it matters, and then introducing a solution.",
    steps: [
      { label: "Problem", text: "What problem are people experiencing?" },
      {
        label: "Agitate",
        text: "Why does the problem matter? What makes it frustrating, difficult, expensive, or inconvenient?",
      },
      {
        label: "Solution",
        text: "What is your idea, and how does it solve the problem?",
      },
    ],
    example: {
      question: "Pitch a product you wish existed.",
      parts: [
        {
          label: "Problem",
          text: "“Buying a thoughtful gift for someone can take hours when you don’t know what to get them.”",
        },
        {
          label: "Agitate",
          text: "“You end up scrolling through hundreds of products, asking their friends for ideas, or eventually buying something generic because you’re running out of time. And after spending all that time, you still don’t know whether they’ll actually like it.”",
        },
        {
          label: "Solution",
          text: "“I’d create a gift platform that asks you a few simple questions about the person, their interests, your relationship with them, and your budget. It would then recommend a small selection of gifts that actually feel personal, instead of making you search through thousands of products.”",
        },
      ],
    },
    note: "The Agitate part isn’t about exaggerating the problem. It’s about helping the listener understand why the problem is worth solving.",
  },
];

export const CHOOSE_WHAT_FITS = {
  title: "CHOOSE WHAT FITS",
  body: [
    "You may find that more than one structure could work for the same prompt.",
    "That’s okay.",
    "A workplace question might call for PPF if you’re giving an update, but PREP if you’re giving your opinion.",
    "An interview question might call for STAR if you’re describing an experience, but a direct answer with PREP might work better for an opinion or recommendation.",
    "A public speaking prompt might use PREP, STAR, PPF, or PAS, depending on what you’re trying to communicate.",
    "The structures are there to support your thinking, not control your speaking.",
    "You don’t have to follow them word for word. Once you understand the structure, adapt it to the situation and speak naturally.",
    "The goal isn’t to sound structured. The goal is to make your thoughts easier to follow.",
  ],
};
