// Local-only Agentation toolbar. Loads React from a CDN so the live site stays zero-deps.
const host = location.hostname;
if (host !== 'localhost' && host !== '127.0.0.1') {
  throw new Error('agentation-dev is localhost only');
}

const [{ default: React }, { createRoot }, { Agentation }] = await Promise.all([
  import('https://esm.sh/react@19'),
  import('https://esm.sh/react-dom@19/client'),
  import('https://esm.sh/agentation@3.1.2?deps=react@19,react-dom@19'),
]);

const root = document.createElement('div');
root.id = 'agentation-root';
document.body.append(root);

createRoot(root).render(
  React.createElement(Agentation, { endpoint: 'http://localhost:4747' }),
);
