import React from 'react';

interface MarkdownMessageProps {
  content: string;
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  // 简单的Markdown渲染器 - 处理常见格式
  const renderMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // 处理代码块
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    const codeMatches: Array<{ start: number; end: number; code: string }> = [];

    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        code: match[1].trim(),
      });
    }

    // 分割文本
    let lastEnd = 0;
    for (const block of codeMatches) {
      if (block.start > lastEnd) {
        parts.push(renderInlineContent(text.substring(lastEnd, block.start)));
      }
      parts.push(
        <pre
          key={`code-${block.start}`}
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '10px',
            overflowX: 'auto',
            margin: '8px 0',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          <code>{block.code}</code>
        </pre>
      );
      lastEnd = block.end;
    }

    if (lastEnd < text.length) {
      parts.push(renderInlineContent(text.substring(lastEnd)));
    }

    return parts;
  };

  const renderInlineContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 标题
      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={`heading-${i}`}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginTop: '12px',
              marginBottom: '8px',
              color: '#333',
            }}
          >
            {line.substring(3)}
          </h3>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h2
            key={`heading-${i}`}
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginTop: '16px',
              marginBottom: '12px',
              color: '#222',
            }}
          >
            {line.substring(2)}
          </h2>
        );
      }
      // 表格检测
      else if (line.includes('|')) {
        const tableStart = i;
        const tableLines = [line];
        let j = i + 1;

        while (j < lines.length && lines[j].includes('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 3) {
          const table = renderTable(tableLines);
          elements.push(
            <div
              key={`table-${i}`}
              style={{
                overflowX: 'auto',
                margin: '12px 0',
              }}
            >
              {table}
            </div>
          );
          i = j - 1;
        } else {
          elements.push(renderParagraph(line, i));
        }
      }
      // 列表项
      else if (line.match(/^[\s]*[-*]\s/)) {
        elements.push(
          <div
            key={`list-${i}`}
            style={{
              marginLeft: '20px',
              marginBottom: '4px',
              color: '#555',
            }}
          >
            {line.replace(/^[\s]*[-*]\s/, '▸ ')}
          </div>
        );
      }
      // 数字列表
      else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <div
            key={`numlist-${i}`}
            style={{
              marginLeft: '20px',
              marginBottom: '4px',
              color: '#555',
            }}
          >
            {line}
          </div>
        );
      }
      // 引用
      else if (line.startsWith('>')) {
        elements.push(
          <div
            key={`quote-${i}`}
            style={{
              borderLeft: '4px solid #ddd',
              paddingLeft: '12px',
              marginLeft: '0',
              marginBottom: '8px',
              color: '#666',
              fontStyle: 'italic',
            }}
          >
            {line.substring(1).trim()}
          </div>
        );
      }
      // 空行
      else if (line.trim() === '') {
        elements.push(<div key={`space-${i}`} style={{ height: '8px' }} />);
      }
      // 普通段落
      else if (line.trim()) {
        elements.push(renderParagraph(line, i));
      }
    }

    return elements;
  };

  const renderParagraph = (text: string, key: React.Key) => {
    // 处理粗体、斜体、代码等内联格式
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // 粗体
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    const codeRegex = /`(.*?)`/g;

    const tokens: Array<{
      type: 'bold' | 'italic' | 'code' | 'text';
      content: string;
      index: number;
    }> = [];

    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      tokens.push({ type: 'bold', content: match[1], index: match.index });
    }
    while ((match = codeRegex.exec(text)) !== null) {
      tokens.push({ type: 'code', content: match[1], index: match.index });
    }

    tokens.sort((a, b) => a.index - b.index);

    for (const token of tokens) {
      const before = text.substring(lastIndex, token.index);
      if (before) parts.push(before);

      if (token.type === 'bold') {
        parts.push(
          <strong key={`bold-${token.index}`} style={{ fontWeight: 'bold' }}>
            {token.content}
          </strong>
        );
      } else if (token.type === 'code') {
        parts.push(
          <code
            key={`code-${token.index}`}
            style={{
              background: '#f0f0f0',
              padding: '2px 4px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            {token.content}
          </code>
        );
      }

      lastIndex = token.index + token.content.length + 4; // 4 for ** or ``
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return (
      <div
        key={key}
        style={{
          marginBottom: '8px',
          color: '#333',
          lineHeight: '1.6',
        }}
      >
        {parts}
      </div>
    );
  };

  const renderTable = (lines: string[]) => {
    const rows = lines.map(line =>
      line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell)
    );

    if (rows.length < 2) return null;

    const headers = rows[0];
    const data = rows.slice(2); // 跳过分隔符行

    return (
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #ddd',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {headers.map((header, i) => (
              <th
                key={i}
                style={{
                  border: '1px solid #ddd',
                  padding: '8px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    border: '1px solid #ddd',
                    padding: '8px',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div
      style={{
        background: '#fafafa',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '8px',
      }}
    >
      {renderMarkdown(content)}
    </div>
  );
}
