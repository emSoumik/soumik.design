// Copy and links the whole site shares.
export const EMAIL = 'soumikhalder026@gmail.com';

export const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/soumik7/' },
  { label: 'X', href: 'https://x.com/soumikkhalder' },
  { label: 'Email', href: `mailto:${EMAIL}` },
];

export const GITHUB = 'https://github.com/emSoumik';

export const WHYCLUB ={ href: 'https://whyclub.in', domain: 'whyclub.in' };

export const VAYU = { href: 'https://devpost.com/software/vayu-ro0jfd', domain: 'devpost.com' };

export const FONTPREVIEW = { href: 'https://github.com/emSoumik/font-preview', domain: 'github.com' };

// what the bee tells you while the about card is open, one at a time. short: they sit in the bee's little bubble
export const FACTS = [
  'he designs it, then codes it',
  'whyclub? he built all of it',
  'vayu is sanskrit for air',
  'he sweats the tiny details',
  'every flower here is pixels',
  'he reads every email',
  'go on, say hi!',
];

export const css = (text) => document.head.insertAdjacentHTML('beforeend', `<style>${text}</style>`);
