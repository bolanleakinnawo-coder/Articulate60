export const CATEGORIES = [
  { id: "opinions", title: "Opinions & Arguments" },
  { id: "storytelling", title: "Storytelling" },
  { id: "conversations", title: "Real Conversations" },
  { id: "explain", title: "Explain Clearly" },
  { id: "analogy", title: "Analogy" },
  { id: "oneword", title: "One Word" },
];

export const PROMPTS = {
  opinions: {
    1: [
      `Is it better to tell someone an uncomfortable truth or protect their feelings? What would you choose?`,
      `Being a kind person does not mean you should always be available to people. Do you agree?`,
      `Is being busy a good sign that someone is productive?`,
      `Should someone get a second chance after making the same mistake twice?`,
      `Is it possible to be too honest with people?`,
      `Should you finish everything you start, even when you realise it is no longer worth your time?`,
      `Is asking for help a sign of weakness?`,
      `Should people keep their opinions to themselves when nobody has asked for them?`,
      `Is confidence more important than knowledge when speaking in front of people?`,
      `Would you rather work with someone who is extremely talented but difficult to communicate with, or someone who is less talented but easy to work with? Explain your choice.`,
    ],
    2: [
      `Your friend asks whether you like their new outfit. You genuinely don't. Would you tell them the truth or say something kind instead? Explain your choice.`,
      `Someone gives excellent advice but never follows it themselves. Does that make their advice less valuable?`,
      `A person rarely speaks in meetings but always has excellent ideas when they do. Another person speaks often and confidently, but not everything they say is useful. Who is contributing more to the team?`,
      `Someone is naturally talented but rarely prepares. Another person is average but prepares for everything. Who is more likely to succeed in the long run?`,
      `Someone keeps interrupting because they are excited and want to contribute. Is interrupting always bad communication?`,
      `A friend has a business idea you think will fail, but they are extremely excited about it. Should you tell them what you really think?`,
      `Two people disagree during a meeting. One speaks confidently and dominates the conversation. The other barely speaks but makes the stronger points. Who handled the disagreement better?`,
      `Someone stops speaking up because their ideas have been ignored several times. Should they keep trying or stop contributing?`,
      `A person apologises every time they disagree with someone. Is this good manners, insecurity, or something else?`,
      `Taiwo uses sophisticated vocabulary because he wants to sound intelligent. Kehinde uses simple words because she wants to be understood. Who would you rather have on stage this afternoon? Why?`,
    ],
    3: [
      `Defend an opinion you completely disagree with. You have two minutes to make us believe you actually support it.`,
      `Someone says, "If you really want something, you'll find a way." You disagree. Convince them that they're wrong.`,
      `You have two minutes to convince someone that a habit they consider harmless is actually holding them back. Choose the habit and make your case.`,
      `You are not allowed to say "I think." Argue that being understood is more important than sounding intelligent.`,
      `Someone tells you, "I've always been this way. There's no reason for me to change." Convince them otherwise.`,
      `Imagine you are defending a friend who has made a decision everyone else thinks is foolish. Make their decision sound reasonable.`,
      `Pick something people generally consider a good thing. Argue that it can actually become harmful when taken too far.`,
      `You have 2 minutes to convince us to care about something you normally don't care about. Choose anything you want.`,
      `Imagine someone interrupts you and says, "You're making a big deal out of nothing." Respond without becoming defensive. Make them understand why the issue matters to you.`,
      `Change your position halfway through. Start by arguing that one side is better. Then switch sides and make the strongest case you can for the opposite position.`,
    ],
  },
  storytelling: {
    1: [
      `Start with: "I knew I was in trouble when…" Then take us through what happened.`,
      `What is a childhood memory you can still picture clearly? Take us back there.`,
      `Tell the story of a time you were completely convinced you were right, only to discover you weren't.`,
      `Think of the funniest thing that has happened to you recently. Give us enough detail to make us laugh with you.`,
      `Take us through a day that started normally but ended very differently from how you expected.`,
      `Think of a time someone surprised you. Don't give away the surprise too quickly.`,
      `Tell us about something you lost, misplaced or couldn't find. What happened?`,
      `Think of a conversation you still remember. Take us to the part that made it memorable.`,
      `Tell us about the first time you did something that now feels completely normal to you.`,
      `Choose one ordinary moment from your life that you wish you could experience again. Take us back to it.`,
    ],
    2: [
      `Start with the most interesting moment. Then go back and explain how you got there.`,
      `Tell a story about a mistake, but don't reveal what the mistake was until halfway through.`,
      `Take something completely ordinary that happened to you and make it interesting enough that we want to keep listening.`,
      `Tell a story about a disagreement. Make us understand why both people thought they were right.`,
      `Tell a story where one small decision changed everything that happened afterwards.`,
      `Tell us about a time your opinion of someone changed. Show us the change through what happened, rather than simply saying you changed your mind.`,
      `Tell a story that has a lesson, but don't tell us the lesson. Let us figure it out.`,
      `Choose a real experience and tell it from the perspective of someone else who was there.`,
      `Tell a story using only three important moments. You decide which three moments deserve to stay.`,
      `Tell a story about something that didn't go according to plan. Make the turning point clear without announcing, "This was the turning point."`,
    ],
    3: [
      `Look around you and choose the nearest object. Give it a backstory. How did it end up where it is?`,
      `Start with: "Nobody was supposed to find out." Build the story from there.`,
      `Choose three unrelated objects you can see. They must all appear in one story.`,
      `Start with the ending: "And that's how I ended up standing outside at 2 a.m." Now create everything that happened before it.`,
      `Imagine you wake up tomorrow and everyone has forgotten who you are. Tell us what happens during your first day.`,
      `You're on a bus when the driver suddenly says, "Nobody get off at the next stop." What happens next?`,
      `Pick an ordinary activity, like buying food or washing clothes. Turn it into a story with a problem, a turning point and an ending.`,
      `Start with: "I should have listened when she said, 'Don't open it.'" Take the story wherever you want.`,
      `Tell a story in which the audience knows something the main character doesn't. You decide what they know.`,
      `Make up a story about the last person who used the phone you're holding. You have two minutes to make us believe it could be true.`,
    ],
  },
  conversations: {
    1: [
      `Your friend asks you to lend them money, but you don't want to. What would you say?`,
      `Someone compliments you, but you don't know how to respond without sounding awkward. Respond to them.`,
      `A friend tells you exciting news. Respond in a way that shows you're genuinely interested.`,
      `Someone asks you a question and you don't know the answer. What would you say?`,
      `You arrive late to a meeting. Explain yourself without giving a long excuse.`,
      `Someone keeps talking while you're trying to work. Tell them you need to concentrate.`,
      `Your friend tells you about a problem they've been having. Respond without immediately trying to solve it.`,
      `Someone misunderstands something you said. Clarify what you actually meant.`,
      `You need someone to repeat what they said because you didn't hear them properly. Ask without simply saying, "Huh?"`,
      `Someone asks you to do something you don't have time for. Say no politely.`,
    ],
    2: [
      `Your friend has been complaining about the same problem for months but refuses every solution you suggest. How would you respond this time?`,
      `Someone gives you feedback that is useful, but they deliver it in a rude way. Respond to the feedback without ignoring the way they spoke to you.`,
      `A colleague takes credit for an idea you originally suggested. Address the situation without turning it into a fight.`,
      `Someone keeps interrupting you before you finish speaking. What would you say?`,
      `Your friend cancels plans with you for the third time. Address it honestly without sounding unnecessarily aggressive.`,
      `Someone asks you a very personal question that you don't want to answer. How would you handle it?`,
      `You're in a group conversation and notice that one person keeps getting talked over. What could you say to bring them back into the conversation?`,
      `Someone makes a joke about you that you don't find funny. Respond without pretending you enjoyed it.`,
      `A person misunderstands your message and becomes upset with you. Explain yourself while acknowledging why they might have felt that way.`,
      `Your manager gives you two tasks and says both are urgent. Ask the questions you need to know which one should come first.`,
    ],
    3: [
      `Someone is angry with you, but you genuinely don't understand what you did wrong. Respond without becoming defensive.`,
      `You're in a meeting when someone confidently says something you know is incorrect. Correct them without embarrassing them.`,
      `Someone says, "You always do this." You don't agree with them. Respond without turning the conversation into an argument.`,
      `A friend asks for your honest opinion about something they've worked very hard on. You don't think it's good enough yet. What do you say?`,
      `Someone you barely know starts telling you a very personal problem. You want to be kind, but you don't know what to say. Respond.`,
      `You accidentally send a message complaining about someone to that same person. They have already seen it. What do you say?`,
      `Someone refuses to listen to your explanation and keeps talking over you. Try to regain control of the conversation without raising your voice.`,
      `You're asked a difficult question during a presentation and genuinely don't know the answer. Respond in a way that maintains your credibility.`,
      `Someone apologises to you, but you are still upset. Accept the apology without pretending that everything is immediately fine.`,
      `You're having a disagreement with someone and they suddenly say, "Fine. Whatever you want." Respond in a way that keeps the conversation productive.`,
    ],
  },
  explain: {
    1: [
      `Explain why people need sleep as if you're talking to someone who thinks sleep is a waste of time.`,
      `Explain how you would make your favourite meal to someone who has never made it before.`,
      `Explain why arriving late can affect other people, not just the person who is late.`,
      `Explain the difference between hearing someone and listening to them.`,
      `Explain why people sometimes forget something they studied.`,
      `Explain how you would describe your daily routine to someone who has never met you.`,
      `Explain why saving a small amount of money regularly can be useful.`,
      `Explain what makes someone a good friend.`,
      `Explain why preparation can make speaking easier.`,
      `Explain something you are good at as if you're teaching it to a complete beginner.`,
    ],
    2: [
      `Explain why someone can be intelligent but still struggle to communicate their ideas.`,
      `Explain the difference between being confident and sounding confident.`,
      `Explain why saying more does not always mean communicating more.`,
      `Explain why someone might understand something perfectly in their head but struggle to explain it out loud.`,
      `Explain why people sometimes agree to things they don't actually want to do.`,
      `Explain the difference between being honest and being unnecessarily harsh.`,
      `Explain why knowing a lot of words does not automatically make someone a good communicator.`,
      `Explain why someone might become quieter around certain people but very talkative around others.`,
      `Explain why preparation can sometimes make a person sound less natural instead of more confident.`,
      `Explain why asking a good question can sometimes be more useful than giving good advice.`,
    ],
    3: [
      `Explain procrastination to a five-year-old without using the word "procrastination."`,
      `Explain why communication matters to someone who says, "If people don't understand me, that's their problem."`,
      `Explain your favourite social media platform to someone who has never used the internet.`,
      `Explain something you know well without using its most obvious words.`,
      `You have 60 seconds to explain why people use umbrellas to someone who has never seen rain.`,
      `Explain the difference between confidence and arrogance to someone who thinks they are the same thing.`,
      `Explain something complicated using only three main points.`,
      `Someone tells you, "I don't understand what you're saying." You are not allowed to repeat your previous explanation. Try again in a completely different way.`,
      `Explain something you strongly understand using an example instead of a definition.`,
      `Pick something within your reach right now and explain why it exists, what problem it solves, and what might happen if it didn't exist.`,
    ],
  },
  analogy: {
    1: [
      `Preparation matters. Complete this analogy and connect it back to your point: "Preparation is like…"`,
      `Trying to please everyone can leave you exhausted. Complete this analogy and explain how it connects to the point: "Trying to please everyone is like…"`,
      `Learning without practising won't get you very far. Complete this analogy and connect it back to the idea: "Learning without practising is like…"`,
      `Speaking without organising your thoughts can make your message difficult to follow. Complete this analogy and explain the connection: "Speaking without organising your thoughts is like…"`,
      `Confidence without preparation can get you into trouble. Complete this analogy and bring it back to the main point: "Confidence without preparation is like…"`,
      `Listening is more than simply staying quiet while someone speaks. Complete this analogy and connect it to your point: "Listening is like…"`,
      `Small, consistent efforts can eventually produce big results. Complete this analogy and explain the connection: "Small efforts are like…"`,
      `Using complicated words when simple words would communicate the idea better can make you harder to understand. Complete this analogy and connect it back: "Using complicated words unnecessarily is like…"`,
      `Avoiding a difficult conversation can make the problem worse. Complete this analogy and explain how it connects: "Avoiding a difficult conversation is like…"`,
      `You cannot become a great speaker by only learning about communication. You have to practise. Complete the analogy and bring it back to the point: "Learning about communication without practising is like…"`,
    ],
    2: [
      `Explain why knowing what you want to say is different from knowing how to say it. Use an analogy and connect it back to your point.`,
      `Explain why being intelligent doesn't automatically make someone a good communicator. Use an analogy and make the connection clear.`,
      `Explain why overthinking can stop someone from taking action. Use an analogy, then connect it back to overthinking.`,
      `Explain why a person can be confident and still communicate badly. Use an analogy and explain the connection.`,
      `Explain why constantly comparing yourself with other people can hold you back. Use an analogy and bring it back to your point.`,
      `Explain why a conversation cannot work when only one person is interested in speaking. Use an analogy and connect it to the idea.`,
      `Explain why feedback can be uncomfortable but useful. Use an analogy and show us how the comparison fits.`,
      `Explain why memorising every word of a presentation can sometimes make you less natural. Use an analogy and connect it back to your point.`,
      `Explain why having a large vocabulary is not the same as knowing how to communicate. Use an analogy and make the connection clear.`,
      `Explain why consistency is more useful than occasional bursts of effort. Use an analogy and connect it back to consistency.`,
    ],
    3: [
      `Pick an object within your reach. Use it to explain why preparation matters. Make the connection back to preparation clear.`,
      `Choose an animal. Use it to explain something about human behaviour. Don't stop at the comparison. Explain exactly how it connects to your point.`,
      `Pick something you would find in a Nigerian market. Use it to explain a lesson about communication. Bring the analogy back to your lesson.`,
      `Choose something in a kitchen. Use it to explain why listening matters in a conversation.`,
      `Pick a mode of transport. Use it to explain the difference between having a goal and having a plan.`,
      `Choose something people commonly lose. Use it to explain what happens when someone loses focus. Connect it back to your point.`,
      `Pick something you can find in a classroom. Use it to explain why practice matters more than simply knowing the theory.`,
      `Choose any food. Use it to explain why people don't always need more information. Sometimes they need better understanding. Connect the analogy back to your point.`,
      `Look around you and choose something that is difficult to use without instructions. Use it to explain why clarity matters when communicating.`,
      `Choose anything around you. Use it to create an analogy for becoming a better speaker. Then explain how your analogy connects to the idea.`,
    ],
  },
  oneword: {
    1: [
      "Spoon",
      "Rain",
      "School",
      "Money",
      "Shoes",
      "Phone",
      "Food",
      "Mirror",
      "Market",
      "Travel",
    ],
    2: [
      "Confidence",
      "Pressure",
      "Freedom",
      "Attention",
      "Failure",
      "Comfort",
      "Change",
      "Trust",
      "Opportunity",
      "Silence",
    ],
    3: [
      "Receipt",
      "Queue",
      "Dust",
      "Shadow",
      "Leftovers",
      "Password",
      "Mosquito",
      "Plastic",
      "Neighbour",
      "Umbrella",
    ],
  },
};

export const HELP_TIPS = {
  opinions: {
    1: [
      `Take a position. What do you actually think?`,
      `Give us your reason, then support it with an example.`,
      `Don't spend your whole answer sitting on the fence.`,
    ],
    2: [
      `Before you speak, consider what someone on the other side might say.`,
      `You don't have to agree with them, but show that you've thought about their point.`,
      `Then make your own case stronger.`,
    ],
    3: [
      `You may not have the perfect argument ready. Start with the strongest thought you have.`,
      `If your first reason isn't enough, find another while you speak.`,
      `Don't let the pressure make you abandon your point.`,
    ],
  },
  storytelling: {
    1: [
      `Think of the beginning, the moment that mattered, and what happened after.`,
      `Give us the details that help us picture what happened.`,
      `Don't rush through the story just to reach the ending.`,
    ],
    2: [
      `Not every detail deserves a place in your story. Choose the ones that matter.`,
      `Build curiosity. You don't have to reveal everything immediately.`,
      `Let us experience the moment instead of simply giving us a summary.`,
    ],
    3: [
      `You might not have a story ready. That's okay. Give yourself a character, a problem, and somewhere to go.`,
      `If you don't know what happens next, make a decision and keep the story moving.`,
      `Don't restart because your story isn't going perfectly. Keep building.`,
    ],
  },
  conversations: {
    1: [
      `Imagine the person is actually standing in front of you.`,
      `Respond to what they said, not just to the situation you've been given.`,
      `Keep your response natural. This is a conversation, not a speech.`,
    ],
    2: [
      `Think about what you want to say and what the other person might hear.`,
      `You can be honest without being unnecessarily harsh.`,
      `Leave room for the other person to respond.`,
    ],
    3: [
      `The other person may be emotional, defensive, or difficult. Don't match their energy.`,
      `You don't have to respond immediately. A pause is better than a careless response.`,
      `Stay with the conversation instead of escaping into excuses, silence, or aggression.`,
    ],
  },
  explain: {
    1: [
      `Start with the main thing you want the person to understand.`,
      `Use words you would actually use when talking to someone.`,
      `If an example makes it easier to understand, use one.`,
    ],
    2: [
      `Ask yourself what part of your explanation could confuse someone.`,
      `Break complicated ideas into smaller pieces.`,
      `Don't assume the listener knows what you know.`,
    ],
    3: [
      `If your first explanation doesn't land, don't simply repeat it.`,
      `Try a different route: an example, a comparison, a story, or simpler words.`,
      `Remember, understanding is the destination. Your original explanation is not.`,
    ],
  },
  analogy: {
    1: [
      `Find something familiar that works in a similar way.`,
      `Give your analogy, then explain why the connection makes sense.`,
      `Don't leave your listener to figure out the connection themselves.`,
    ],
    2: [
      `Look for a similarity in behaviour or function, not just appearance.`,
      `Ask yourself, "What exactly is similar here?"`,
      `Bring the analogy back to the original idea before you finish.`,
    ],
    3: [
      `Your first analogy doesn't have to be brilliant. It just needs to make sense.`,
      `Look around you. Ordinary things can make surprisingly good analogies.`,
      `The real test is not the analogy itself. It's whether you can make us see the connection.`,
    ],
  },
  oneword: {
    1: [
      `The word is your starting point, not a question you have to answer.`,
      `You can take it through a memory, opinion, story, explanation, or experience.`,
      `Once you find a direction, keep going.`,
    ],
    2: [
      `Don't settle for the first obvious thing the word makes you think of.`,
      `Ask yourself, "What else does this connect to?"`,
      `Follow the connection and see where it takes you.`,
    ],
    3: [
      `You don't get to wait for inspiration. Start with something.`,
      `Develop your thought before jumping to another one.`,
      `If you run out of things to say, make a new connection and keep moving.`,
    ],
  },
};

export const YAP_HELP = [
  `No prompt. No topic. Pick a thought and start.`,
  `Develop it with a reason, example, story, or another thought.`,
  `If you stumble, don't restart. Keep going.`,
];

export const YAP_QUOTE = `Yap is not talking for the sake of talking. It's practising your ability to think out loud.`;

export const LEVEL_META = [
  {
    id: 1,
    title: "Find Your Voice",
    description: "Get comfortable thinking out loud.",
    prepare: "60s",
    speak: "1min",
    prepareSeconds: 60,
    speakSeconds: 60,
  },
  {
    id: 2,
    title: "Think Faster",
    description: "Learn to form your thoughts under pressure.",
    prepare: "60s",
    speak: "2min",
    prepareSeconds: 60,
    speakSeconds: 120,
  },
  {
    id: 3,
    title: "Speak Under Pressure",
    description: "Think on your feet. Keep going.",
    prepare: "No prep",
    speak: "3min",
    prepareSeconds: 0,
    speakSeconds: 180,
  },
];

export function getRandomPrompt(categoryId, level) {
  const pool = PROMPTS[categoryId]?.[level];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomCategoryPrompt(level) {
  const promptCategories = CATEGORIES.filter(
    (category) => category.id !== "oneword",
  );
  const randomCategory =
    promptCategories[Math.floor(Math.random() * promptCategories.length)];
  const prompt = getRandomPrompt(randomCategory.id, level);
  return {
    categoryId: randomCategory.id,
    categoryTitle: randomCategory.title,
    prompt,
  };
}
