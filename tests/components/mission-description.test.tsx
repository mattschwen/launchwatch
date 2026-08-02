import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MissionDescription from '@/components/MissionDescription';

describe('MissionDescription', () => {
  it('preserves provider paragraphs and renders bullet blocks as semantic lists', () => {
    const { container } = render(
      <MissionDescription
        description={[
          'A mission overview that wraps',
          'across provider lines.',
          '',
          'Mission objectives:',
          '',
          '* Deploy the primary payload',
          '- Validate the relay link',
        ].join('\r\n')}
      />
    );

    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(
      screen.getByText('A mission overview that wraps across provider lines.')
    ).toBeVisible();
    expect(screen.getByText('Mission objectives:')).toBeVisible();
    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Deploy the primary payload')).toBeVisible();
    expect(screen.getByText('Validate the relay link')).toBeVisible();
  });

  it('renders provider copy as text instead of interpreting markup', () => {
    const { container } = render(
      <MissionDescription description={'<script>unsafe()</script>'} />
    );

    expect(screen.getByText('<script>unsafe()</script>')).toBeVisible();
    expect(container.querySelector('script')).toBeNull();
  });
});
