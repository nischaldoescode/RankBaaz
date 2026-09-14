/**
 * renders the public rich text renderer component with reusable layout, actions, and responsive behavior
 *
 * @file frontend/src/components/plugins/richtextrenderer.jsx
 * @module frontend/src/components/plugins/richtextrenderer
 * @exports component used by pages and shared layouts
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import 'katex/dist/katex.min.css'; // import katex css

const languageModules = {
  javascript,
  jsx,
  typescript,
  tsx,
  css,
  markup,
  html: markup,
  xml: markup,
  json,
  bash,
  shell: bash,
  python,
  sql,
  java,
  csharp,
  cpp,
  go,
  rust,
  php,
  markdown,
  yaml,
};

Object.entries(languageModules).forEach(([name, language]) => {
  SyntaxHighlighter.registerLanguage(name, language);
});

const RichTextRenderer = ({ content, className = "" }) => {
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // code block renderer
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1].toLowerCase() : '';
          const resolvedLanguage = language === 'js' ? 'javascript' : language;

          if (!inline && match && languageModules[resolvedLanguage]) {
            return (
              <div className="my-4 rounded-lg overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 font-mono">
                  {resolvedLanguage}
                </div>
                <SyntaxHighlighter
                  language={resolvedLanguage}
                  style={vscDarkPlus}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          }

          if (!inline && match) {
            return (
              <pre className="my-4 max-w-full overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                <code {...props}>{String(children).replace(/\n$/, '')}</code>
              </pre>
            );
          }

          // inline code
          return (
            <code
              className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-red-600 dark:text-red-400"
              {...props}
            >
              {children}
            </code>
          );
        },

        // style paragraphs
        p({ children }) {
          return <p className="my-2 leading-relaxed">{children}</p>;
        },

        // style lists
        ul({ children }) {
          return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
};

export default RichTextRenderer;
