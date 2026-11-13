// PROTOTYPE: the whyclub case study copy for /projects/whyclub (dev only). each visual on the page appears once:
// the store's screens in the opening, the flow in the steps, then the dock, the pass and the details up close.
// once it settles, this folds back into src/content/work/whyclub/index.mdx and the folder goes
const A = '/assets/work/whyclub/';

export interface Shot {
  src: string; alt: string; caption?: string; video?: boolean; dark?: boolean;
  /** the component on its own, no screen around it */ solo?: boolean;
  /** a component plate: a cut from the live ui on a campaign photo */ art?: boolean;
  /** the line under it in the viewer; the alt stands in when there is none */ desc?: string;
  /** a live component instead of a recording */ live?: 'dock';
}
export interface Section {
  id: string;
  label: string;
  headline: string;
  plane?: Shot;
  row?: Shot[];
  /** narrow crops (the dock's three shapes) shown instead of full screens */
  crops?: Shot[];
  body: string[];
  /** a credit line under the body, html allowed */
  credit?: string;
  desktop?: 'shop' | 'product' | 'notFound';
  desktopCaption?: string;
  pass?: boolean;
  /** a sheet that "Expand details" opens under the body, by its layer id in Details.astro */ sheet?: string;
}

export const intro = [
  'Most shops are built by a lot of people. One person does the brand, another designs the store, someone else builds it, and someone else again wires up the orders. Every handover loses a little: a font gets swapped, an animation gets cut, a button stops feeling right.',
  "I did all of it myself, so nothing got lost in between. WhyClub is a streetwear label, and I made every part of it: how it looks, how the store feels in your hand, and the system that takes an order from paid to delivered.",
];

export const sections: Section[] = [
  {
    id: 'dock',
    label: 'The dock',
    headline: 'One piece of navigation that changes shape.',
    plane: { live: 'dock', src: '', alt: 'The WhyClub dock, running live.', caption: 'The real dock, running in this page. Pick a shape or tap it, and switch the glass.' },
    body: [
      "Clothes get bought on phones, so navigation lives where your thumb already is: a dock at the bottom of the screen. It's one surface with three shapes. At the top of a page it's a bar of five. Scroll and it shrinks to a pill that slides left, out of the way of the buy button. Tap Shop, Account or More and the bar grows into a panel, with a Back at the top to fold it up again.",
      'The shell is the only part that changes size. It moves on spring curves written as CSS linear() easings, so a tap halfway through a transition picks up from wherever the dock is instead of snapping back. Everything inside it only fades and moves. It has its own quiet sounds too: a soft tick for a tap, and a short breath when a panel opens and closes.',
    ],
    credit: `The idea of a row that becomes the menu, instead of opening one, comes from <a href="https://x.com/dannyjpwilliams/status/2099861544326848811" target="_blank" rel="noopener">Danny Williams’ “A dock that unfolds”</a>. I built WhyClub’s version around a store: panels with campaign photos, a pill that makes room to buy, and a real page behind every row.`,
  },
  {
    id: 'after',
    label: 'After you order',
    headline: 'Every order gets a pass that changes as it ships.',
    body: [
      'Ordering is usually where a store goes quiet: a confirmation email and a tracking link. I wanted it to be the part people remember.',
      "It prints in when you pay, then moves through You're in, All packed, On its way and It's home. Each stage has its own scene drawn live in WebGL: a bloom opening, a box getting taped, a route drawing itself to a pin.",
      'The same hand-written shaders turn up around the store: riso-style badges for the beta pass, a dithered asterisk, and a 404 page where a prism splits the light.',
    ],
    sheet: 'pass',
    pass: true,
  },
  {
    id: 'backend',
    label: 'Behind the counter',
    headline: "I built the half you don't see too.",
    body: [
      'The backend takes the order, keeps the pass in step with the parcel, and gives me the tools I need to put out each release.',
      "Doing both halves meant the details survived. The sheet over the photo, the dock that opens into a menu, the pass that changes when your parcel ships: none of it had to be explained to anyone first. I just built it. I genuinely believe that's the biggest advantage of one person working across design and engineering.",
    ],
  },
];
