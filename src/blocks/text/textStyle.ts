import { css } from 'lit'

export const textStyle = css`
  .text {
    font-family: var(--se-font);

    --text-line-height: var(--se-lh);
    line-height: var(--text-line-height);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .text:empty { min-height: calc(1em * var(--text-line-height)); }

  /* .vmodal-titel */
  .role-title {
    color: var(--se-ink);
    font-size: var(--se-fs-title);
    font-weight: 700;
    --text-line-height: var(--se-lh-tight);
  }

  /* .vspalte-kopf h2 */
  .role-heading {
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 600;
    --text-line-height: var(--se-lh-tight);
    white-space: nowrap;
  }

  /* .vfeld-label */
  .role-label {
    color: var(--se-muted);
    font-size: var(--se-fs-head);
    font-weight: 600;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .role-body {
    color: var(--se-ink);
    font-size: var(--se-fs);
    font-weight: 400;
  }

  /* .vkarte-meta */
  .role-muted {
    overflow: hidden;
    color: var(--se-muted);
    font-size: var(--se-fs-sm);
    font-weight: 400;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* .num */
  .role-number {
    color: var(--se-ink);
    font-family: var(--se-mono);
    font-size: var(--se-fs);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
  }
`
