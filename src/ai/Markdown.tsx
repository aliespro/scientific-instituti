import { Fragment, type ReactNode } from 'react';

interface Props {
  text: string;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|__(.+?)__)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    if (match[2]) {
      nodes.push(<strong key={key++} className="font-bold">{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={key++} className="italic">{match[3]}</em>);
    } else if (match[4]) {
      nodes.push(<code key={key++} className="px-1 py-0.5 rounded text-[11px] bg-current/10 font-mono">{match[4]}</code>);
    } else if (match[5]) {
      nodes.push(<strong key={key++} className="font-bold">{match[5]}</strong>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

export default function Markdown({ text }: Props) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++} className="my-1.5 p-2.5 rounded-lg overflow-x-auto text-[11px] font-mono bg-black/15 dark:bg-black/30">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes = ['text-sm', 'text-sm', 'text-xs', 'text-xs'];
      blocks.push(
        <p key={key++} className={`${sizes[level - 1] ?? 'text-xs'} font-bold mt-2 mb-1`}>
          {renderInline(headingMatch[2])}
        </p>
      );
      i++;
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (bulletMatch) {
      const items: string[] = [];
      const indentStack: number[] = [];
      const itemLevels: { text: string; level: number }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)[-*+]\s+(.*)/);
        if (!m) break;
        const indent = m[1].length;
        items.push(m[2]);
        itemLevels.push({ text: m[2], level: Math.floor(indent / 2) });
        i++;
      }
      let currentLevel = 0;
      const renderList = (startIdx: number, level: number): ReactNode => {
        const children: ReactNode[] = [];
        let j = startIdx;
        while (j < itemLevels.length && itemLevels[j].level === level) {
          const childItems: ReactNode[] = [];
          let k = j + 1;
          while (k < itemLevels.length && itemLevels[k].level > level) {
            const subList = renderList(k, itemLevels[k].level);
            childItems.push(subList);
            while (k < itemLevels.length && itemLevels[k].level > level) k++;
          }
          children.push(
            <li key={j} className="leading-relaxed">
              {renderInline(itemLevels[j].text)}
              {childItems.length > 0 && <ul className="my-0.5 pr-3 space-y-0.5">{childItems}</ul>}
            </li>
          );
          j = k;
        }
        return <ul key={`ul-${startIdx}`} className="space-y-0.5 my-1 pr-1 list-disc list-outside">{children}</ul>;
      };
      void currentLevel;
      void indentStack;
      blocks.push(renderList(0, 0));
      continue;
    }

    const numMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (numMatch) {
      const items: { text: string; level: number }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)\d+\.\s+(.*)/);
        if (!m) break;
        items.push({ text: m[2], level: Math.floor(m[1].length / 2) });
        i++;
      }
      blocks.push(
        <ol key={key++} className="space-y-0.5 my-1 pr-1 list-decimal list-outside">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed pl-1">
              {renderInline(item.text)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const quoteMatch = line.match(/^>\s+(.*)/);
    if (quoteMatch) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].match(/^>\s+(.*)/)) {
        quoteLines.push(lines[i].replace(/^>\s+/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-1.5 pr-2 border-r-2 border-current/20 italic opacity-80">
          {quoteLines.map((ql, qi) => (
            <p key={qi}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const hrMatch = line.match(/^(-{3,}|\*{3,})$/);
    if (hrMatch) {
      blocks.push(<hr key={key++} className="my-2 border-current/15" />);
      i++;
      continue;
    }

    const tableMatch = line.match(/^\|(.+)\|$/);
    if (tableMatch) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].match(/^\|(.+)\|$/)) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map((tl) =>
        tl.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map((c) => c.trim())
      );
      const isSeparator = (row: string[]) => row.every((c) => /^[-:]+$/.test(c));
      const headerRow = rows[0];
      const bodyRows = rows.filter((r) => !isSeparator(r)).slice(1);
      blocks.push(
        <div key={key++} className="my-1.5 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-current/20">
                {headerRow.map((cell, ci) => (
                  <th key={ci} className="px-2 py-1 text-right font-bold">{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b border-current/10">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1">{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
