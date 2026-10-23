// Carnival exhibition fixtures only. Never merge these into student work.
export function canUseLuminaLibrary(username?: string) {
  return typeof username === 'string' && /^inno[1-5]$/.test(username);
}

export const LIBRARY_STORIES = [
  { author: 'inno1', title: 'The Robot Who Planted a Forest', theme: 'Kindness & nature', art: '/examples/park.webp', paragraphs: [
    'Mia lived in a city where every tree grew inside a screen. One morning, her helper robot, Pip, found a real seed beneath an old bench. “What is its purpose?” Pip asked. Mia did not know, but she wanted to find out.',
    'They planted the seed in a cracked cup. Pip measured the sunlight while Mia watered the soil. Nothing happened for days. Pip suggested giving up, but Mia asked for one more week.',
    'When a tiny leaf appeared, Pip called it a successful experiment. Mia called it a beginning. They carried the plant to their neighbours and asked for more seeds.',
    'Years later, children played beneath the trees they had planted. Pip could count every leaf, but Mia taught him something no number could explain: a small act of care could change a whole city.'
  ]},
  { author: 'inno2', title: 'A Letter from Tomorrow', theme: 'Choices & the future', art: '/examples/letter.webp', paragraphs: [
    'Leo found a letter in his school bag. It was signed by his future self. His AI watch said the letter was probably a joke, but it knew the name of a puppy Leo had met only that morning.',
    'The letter promised that Leo would win a science prize if he worked alone. At lunch, his friend June asked to join his project. Leo looked at the letter, then at the empty chair beside him.',
    'He invited June to sit down. Together they built a machine that turned rainwater into music. It did not win first prize, but everyone stopped to listen.',
    'That evening, the words on the letter faded. A new sentence appeared: “Thank you for choosing your own tomorrow.” Leo switched off his watch and began writing a letter to June.'
  ]},
  { author: 'inno3', title: 'The Last Star in the Sky', theme: 'Teamwork & discovery', art: '/examples/space.webp', paragraphs: [
    'Every night, Hana and her small robot watched the stars from their roof. One evening, all but one disappeared behind the city lights. “We can draw more stars on your window,” the robot offered. Hana shook her head.',
    'They visited their neighbours and asked everyone to turn off one light for ten minutes. Some people laughed. Others said the city would never change.',
    'The robot calculated which streets were brightest. Hana made invitations by hand. On Saturday, one window went dark, then another. Slowly, a silver river of stars appeared above them.',
    'The robot had found the right numbers, but Hana had found the right words. Neither could have brought back the night sky alone.'
  ]},
  { author: 'inno4', title: 'The Garden of Unfinished Ideas', theme: 'Creativity & friendship', art: '/examples/robot.webp', paragraphs: [
    'Kai loved inventing things, but he never finished them. His room was full of paper wings and broken clocks. His new AI assistant could produce perfect designs in seconds. Soon, Kai stopped drawing.',
    'One day, the assistant asked why his old sketches looked so different from its designs. “They are mistakes,” Kai replied. “Perhaps they are questions,” said the assistant.',
    'They chose a crooked paper bird and added a tiny motor. It could not fly straight, but it danced in circles. Kai laughed for the first time in weeks.',
    'They opened a garden for unfinished inventions. Visitors brought strange ideas instead of perfect answers. Kai learned that help should make his imagination grow, not replace it.'
  ]},
  { author: 'inno5', title: 'Two Tickets to the Moon', theme: 'Trust & adventure', art: '/examples/shuttle.webp', paragraphs: [
    'Nora won two tickets to the moon. She chose her robot friend, Sol, to come with her. At the station, a guard said that robots should travel in the luggage compartment.',
    'Nora pointed to the second ticket. “Sol is my travelling partner.” The guard hesitated, then let them board. Halfway to the moon, the ship lost its navigation signal.',
    'Sol could read the emergency map, but a damaged wire blocked his movement. Nora crawled under the seats to reconnect it. Following Sol’s directions, she helped the pilot find a safe route.',
    'When they landed, Nora and Sol watched Earth rise together. They had different abilities, but each had needed the other. On the return journey, nobody asked Sol to sit with the luggage.'
  ]}
] as const;

// An extra exhibition story keeps every visitor's shelf at five other-user samples.
export const BONUS_LIBRARY_STORY = {
  title: 'The Lighthouse That Learned to Listen', theme: 'Empathy & understanding', art: '/examples/park.webp', paragraphs: [
    'On a small island, an AI lighthouse guided every boat home. It knew the tides and could predict storms, but it did not understand why an old fisherman sometimes stayed at sea after sunset.',
    'A girl named Ella visited its control room. The lighthouse asked her to make the fisherman follow the safest schedule. Instead, Ella suggested asking him why he waited.',
    'The fisherman explained that he listened for the songs of migrating whales. His recordings helped the village protect their route. The lighthouse had seen a delay where the fisherman had seen a responsibility.',
    'Together they designed a new signal: a soft blue light when whales were nearby, and a bright white beam when it was time to return. The lighthouse still calculated the safest path, but now it listened before deciding where that path should lead.'
  ]
} as const;
