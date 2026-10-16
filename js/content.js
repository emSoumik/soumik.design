// Copy and links the whole site shares.
export const EMAIL = 'soumikhalder026@gmail.com';

export const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/soumik7/' },
  { label: 'X', href: 'https://x.com/soumikkhalder' },
  { label: 'Email', href: `mailto:${EMAIL}` },
];

export const WHYCLUB = { href: 'https://whyclub.in', domain: 'whyclub.in' };

export const SHADERS = { href: 'https://prototype.whyclub.in/', domain: 'prototype.whyclub.in' };

export const css = (text) => document.head.insertAdjacentHTML('beforeend', `<style>${text}</style>`);
