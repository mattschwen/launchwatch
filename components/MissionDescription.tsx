type MissionDescriptionBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const BULLET_LINE = /^\s*(?:\*|-|•)\s+(.+?)\s*$/;

function parseMissionDescription(description: string): MissionDescriptionBlock[] {
  return description
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n+/)
    .flatMap<MissionDescriptionBlock>((block): MissionDescriptionBlock[] => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0) return [];

      const listItems = lines.map((line) => line.match(BULLET_LINE)?.[1] ?? null);
      if (listItems.every((item): item is string => item !== null)) {
        return [{ type: 'list' as const, items: listItems }];
      }

      return [{ type: 'paragraph' as const, text: lines.join(' ') }];
    });
}

export default function MissionDescription({
  description,
  className = '',
}: {
  description: string;
  className?: string;
}): React.ReactElement {
  const blocks = parseMissionDescription(description);

  return (
    <div
      data-mission-description="true"
      className={`space-y-3 ${className}`}
    >
      {blocks.map((block, index) =>
        block.type === 'list' ? (
          <ul
            key={`list-${index}`}
            className="list-disc space-y-1.5 pl-5 marker:text-[var(--console-cyan)]"
          >
            {block.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={`paragraph-${index}`}>{block.text}</p>
        )
      )}
    </div>
  );
}
