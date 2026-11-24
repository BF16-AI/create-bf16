export const TEMPLATES = ['ai-sdk', 'node', 'nextjs'];

export function buildTemplateFiles({ projectName, template = 'ai-sdk' }) {
  const safeName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'bf16-app';

  const envExample = `# Get an API key ($0.20 starter credit, Zero Data Retention): https://bf16.ai/dashboard/keys
# Or run: npx bf16ai login
BF16_API_KEY=sk-bf16-v1-...
BF16_MODEL=deepseek/deepseek-v4.1-flash-uncensored-fast
`;

  const gitignore = `node_modules/
.env
.env.local
.next/
dist/
`;

  if (template === 'node') {
    return {
      '.env.example': envExample,
      '.gitignore': gitignore,
      'package.json': `${JSON.stringify(
        {
          name: safeName,
          version: '0.1.0',
          private: true,
          type: 'module',
          scripts: {
            start: 'node --env-file=.env src/index.mjs',
            balance: 'node --env-file=.env src/balance.mjs',
          },
        },
        null,
        2
      )}\n`,
      'src/index.mjs': `const apiKey = process.env.BF16_API_KEY;
const model = process.env.BF16_MODEL || 'deepseek/deepseek-v4.1-flash-uncensored-fast';

if (!apiKey) {
  console.error('Missing BF16_API_KEY. Copy .env.example to .env and add your key from https://bf16.ai/dashboard/keys');
  process.exit(1);
}

const res = await fetch('https://api.bf16.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${apiKey}\`,
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'You are a concise senior systems engineer.' },
      { role: 'user', content: 'Give 3 practical tips for keeping LLM prompt caches warm across 1M-context coding sessions.' },
    ],
  }),
});

if (!res.ok) {
  console.error('bf16 API error:', res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log(data.choices?.[0]?.message?.content ?? '');
console.log('\\nUsage:', JSON.stringify(data.usage ?? {}));
`,
      'src/balance.mjs': `const apiKey = process.env.BF16_API_KEY;
if (!apiKey) {
  console.error('Missing BF16_API_KEY.');
  process.exit(1);
}

const res = await fetch('https://api.bf16.ai/v1/me', {
  headers: { Authorization: \`Bearer \${apiKey}\` },
});
console.log(JSON.stringify(await res.json(), null, 2));
`,
      'README.md': `# ${safeName}

Zero-dependency Node.js starter for **[bf16.ai](https://bf16.ai)** (uncensored 1M-context LLM API, Zero Data Retention).

## Run

\`\`\`bash
cp .env.example .env
# Add your BF16_API_KEY from https://bf16.ai/dashboard/keys
npm start
npm run balance
\`\`\`
`,
    };
  }

  if (template === 'nextjs') {
    return {
      '.env.example': envExample,
      '.gitignore': gitignore,
      'package.json': `${JSON.stringify(
        {
          name: safeName,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            ai: '^6.0.0',
            'bf16-ai-sdk-provider': '^0.1.0',
            next: '^15.2.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
          },
          devDependencies: {
            '@types/node': '^22.0.0',
            '@types/react': '^19.0.0',
            typescript: '^5.8.0',
          },
        },
        null,
        2
      )}\n`,
      'tsconfig.json': `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [{ name: 'next' }],
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
          exclude: ['node_modules'],
        },
        null,
        2
      )}\n`,
      'app/api/chat/route.ts': `import { streamText } from 'ai';
import { bf16 } from 'bf16-ai-sdk-provider';

export async function POST(req: Request) {
  const { messages, model } = await req.json();
  const result = streamText({
    model: bf16(model || process.env.BF16_MODEL || 'deepseek/deepseek-v4.1-flash-uncensored-fast'),
    messages,
  });
  return result.toTextStreamResponse();
}
`,
      'app/layout.tsx': `import type { ReactNode } from 'react';

export const metadata = {
  title: '${safeName} — powered by bf16.ai',
  description: 'Uncensored 1M-context AI app built with bf16-ai-sdk-provider',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '2rem', background: '#FAF7F0', color: '#141111' }}>
        {children}
      </body>
    </html>
  );
}
`,
      'app/page.tsx': `'use client';

import { useState } from 'react';

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setReply('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          setReply((prev) => prev + decoder.decode(value, { stream: true }));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>${safeName} · bf16.ai</h1>
      <p>Streaming 1M-context uncensored inference via <code>bf16-ai-sdk-provider</code>.</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask anything..."
          style={{ flex: 1, padding: 10, border: '2px solid #141111', borderRadius: 8 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 18px', border: '2px solid #141111', borderRadius: 8, background: '#FFD440', fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? 'Streaming...' : 'Send'}
        </button>
      </form>
      {reply && (
        <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', padding: 16, background: '#fff', border: '2px solid #141111', borderRadius: 12 }}>
          {reply}
        </pre>
      )}
    </main>
  );
}
`,
      'README.md': `# ${safeName}

Next.js App Router + Vercel AI SDK starter wired to **[bf16.ai](https://bf16.ai)** via \`bf16-ai-sdk-provider\`.

## Run

\`\`\`bash
cp .env.example .env.local
# Add BF16_API_KEY from https://bf16.ai/dashboard/keys
npm install
npm run dev
\`\`\`
`,
    };
  }

  // Default: `ai-sdk` TypeScript starter
  return {
    '.env.example': envExample,
    '.gitignore': gitignore,
    'package.json': `${JSON.stringify(
      {
        name: safeName,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'tsx --env-file=.env src/index.ts',
          build: 'tsc --noEmit',
        },
        dependencies: {
          ai: '^6.0.0',
          'bf16-ai-sdk-provider': '^0.1.0',
        },
        devDependencies: {
          '@types/node': '^22.0.0',
          tsx: '^4.19.0',
          typescript: '^5.8.0',
        },
      },
      null,
      2
    )}\n`,
    'tsconfig.json': `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2
    )}\n`,
    'src/index.ts': `import { streamText } from 'ai';
import { bf16 } from 'bf16-ai-sdk-provider';

const modelId =
  process.env.BF16_MODEL || 'deepseek/deepseek-v4.1-flash-uncensored-fast';

async function main() {
  if (!process.env.BF16_API_KEY) {
    console.error(
      'Missing BF16_API_KEY. Copy .env.example to .env and add a key from https://bf16.ai/dashboard/keys'
    );
    process.exit(1);
  }

  console.log(\`Streaming from bf16.ai (\${modelId})...\\n\`);

  const result = streamText({
    model: bf16(modelId),
    system:
      'You are a concise senior engineer. Keep shared system instructions stable at the top to maximize automatic prompt caching.',
    prompt:
      'Explain in 5 bullet points why 1M-context prompt caching dramatically lowers agent coding bills.',
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  const usage = await result.usage;
  console.log('\\n\\nUsage:', usage);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
    'README.md': `# ${safeName}

TypeScript + Vercel AI SDK starter pre-wired to **[bf16.ai](https://bf16.ai)** (\`bf16-ai-sdk-provider\`, 1M context, Zero Data Retention).

## Quickstart

\`\`\`bash
cp .env.example .env
# Add your BF16_API_KEY from https://bf16.ai/dashboard/keys (or run: npx bf16ai login)
npm install
npm run dev
\`\`\`

## Coding Agents

Run Claude Code, Codex, or OpenCode directly against bf16.ai:

\`\`\`bash
npx bf16ai claude
\`\`\`
`,
  };
}
