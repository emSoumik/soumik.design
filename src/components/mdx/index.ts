// Components every case study and post can use without importing them
import Figure from './Figure.astro';
import Video from './Video.astro';
import Screens from './Screens.astro';
import Phone from './Phone.astro';
import Phones from './Phones.astro';
import DropPass from './DropPass.astro';
// the blog's: a margin note, a numbered reference, a before/after, a decision, a live demo, the flowers
import Aside from './Aside.astro';
import Ref from './Ref.astro';
import Compare from './Compare.astro';
import Decision from './Decision.astro';
import Demo from './Demo.astro';
import Flowers from './Flowers.astro';

export const components = { Figure, Video, Screens, Phone, Phones, DropPass, Aside, Ref, Compare, Decision, Demo, Flowers };
