export type Story = {
  id: string;
  title: string;
  subtitle: string;
  body: string[];
};

export const STORIES: Story[] = [
  {
    id: "night-shift",
    title: "Night Shift at the Translation Lab",
    subtitle: "A slow, electric story about mistakes that become features.",
    body: [
      "The building was quiet in the way only servers can be: fans whispering, LEDs blinking, time split into neat little packets. On the third floor, a single monitor lit the lab with a cold-blue glow.",
      "Naf stared at the dashboard. Requests in. Tokens out. The UI looked calm, but every so often a sentence would slip through with a strange accent— as if the model had tasted another language and refused to rinse.",
      "He didn't panic. He opened the logs, traced the call, watched the proxy hand off to the API, then to the LLM. The chain was solid. The output was… creative.",
      "So he made the interface honest. A status pill that breathed. A progress bar that drifted like a comet. And a little panel that kept the words separate from the sentences from the paragraphs—because structure is how you tell chaos where to sit.",
      "Around 2:13 a.m., the translation came back perfect. Not because the model changed, but because the system did: the user could finally see what was happening, and waiting stopped feeling like nothing.",
    ],
  },
  {
    id: "blue-ink",
    title: "Blue Ink on Black Glass",
    subtitle: "A micro-essay on modern UI: calm surfaces, alive feedback.",
    body: [
      "A modern interface isn't louder. It's clearer. It uses darkness like a stage and light like a cue.",
      "When the system is idle, it should feel like a still room: soft texture, restrained contrast, legible type. When the system is working, it should feel like motion behind glass—subtle, directional, never distracting.",
      "The trick is to treat feedback as choreography: a shimmer where a result will appear, a pulse that says “I'm alive,” a gradient that suggests depth instead of noise.",
      "Most people call this polish. Engineers call it trust. Both are right.",
      "If the UI is honest about time, users stop fighting it.",
    ],
  },
  {
    id: "five-requests",
    title: "Five Requests, One Answer",
    subtitle: "A tiny fable about batching, patience, and speed.",
    body: [
      "A student asked the model to translate five words. The model replied in five separate trips—slow, expensive, and a little dramatic.",
      "So the student gathered the words into one envelope and sent them together. The system smiled, because systems love patterns.",
      "The next day the student tried the same thing with sentences, then paragraphs, then whole documents. Each time, the lesson repeated: work becomes faster when you stop asking it to do the same setup again and again.",
      "He learned to batch, to cache, to reuse context, to set sensible defaults. Not because it was “optimization,” but because it was respect—for the machine and for the human waiting on the other side.",
      "And when the translations returned, they returned like a single breath.",
    ],
  },
  {
    id: "ghost-port",
    title: "The Ghost Port",
    subtitle: "A story about connection refused—and the moment it finally answers.",
    body: [
      "The first time the client called the endpoint, it got silence. The second time, a refusal. The third time, a refusal wrapped in a stack trace big enough to block the sun.",
      "Everyone blamed the code. It's always the code—until it isn't.",
      "The server wasn't running. Not broken, not misconfigured, just not there. Like knocking on a door in an empty house and calling it a design flaw.",
      "When the llama-server finally started, it felt like a city waking up: the port opened, the model loaded, and the machine did what it had been built to do.",
      "From then on, every green dot in the header meant the same thing: the system is present. The rest is just conversation.",
    ],
  },
  {
    id: "starlight-cache",
    title: "Starlight Cache",
    subtitle: "A short article about performance that looks like magic.",
    body: [
      "You can make a system feel faster without making it faster. That sentence is either a lie or a promise, depending on how you build.",
      "A progress bar doesn't reduce latency, but it reduces doubt. A streaming response doesn't change the final answer, but it changes the user's experience of time.",
      "Caching is the invisible version of the same idea: you pay once, then you reuse. When it works, people don't say “cache.” They say “wow.”",
      "The best performance wins are quiet. The UI stays calm, the logs stay clean, and the user stops noticing the machine at all.",
      "That's the goal: starlight on black glass—light you can trust.",
    ],
  },
];

