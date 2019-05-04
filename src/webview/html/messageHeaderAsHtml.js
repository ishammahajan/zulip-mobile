/* @flow strict-local */
import template from './template';
import type { Message, Narrow, Outbox } from '../../types';
import type { BackgroundData } from '../MessageList';
import {
  streamNarrow,
  topicNarrow,
  privateNarrow,
  groupNarrow,
  caseNarrow,
} from '../../utils/narrow';
import { foregroundColorFromBackground } from '../../utils/color';
import { humanDate } from '../../utils/date';

const renderSubject = item =>
  // TODO: pin down if '' happens, and what its proper semantics are.
  item.match_subject !== undefined && item.match_subject !== ''
    ? item.match_subject
    : template`${item.subject}`;

export default (
  { ownEmail, subscriptions }: BackgroundData,
  narrow: Narrow,
  item: Message | Outbox | {||},
) => {
  type HeaderStyle = 'none' | 'topic+date' | 'date' | 'full';
  const headerStyle: HeaderStyle = caseNarrow(narrow, {
    stream: () => 'topic+date',
    topic: () => 'none',

    pm: () => 'date',
    groupPm: () => 'full',

    home: () => 'full',
    starred: () => 'full',
    mentioned: () => 'full',
    allPrivate: () => 'full',
    search: () => 'full',
  });

  if (!item.type) {
    return '';
  }

  if (item.type === 'stream' && headerStyle === 'topic+date') {
    const topicNarrowStr = JSON.stringify(topicNarrow(item.display_recipient, item.subject));
    const topicHtml = renderSubject(item);

    return template`
<div
  class="header-wrapper header topic-header"
  data-narrow="${topicNarrowStr}"
  data-msg-id="${item.id}"
>
  <div class="header-text">$!${topicHtml}</div>
  <div class="header-date">${humanDate(new Date(item.timestamp * 1000))}</div>
</div>
    `;
  }

  if (item.type === 'stream' && headerStyle === 'full') {
    // Somehow, if `item.display_recipient` appears in the `find` callback,
    // Flow worries that `item` will turn out to be a {||} after all.
    const { display_recipient } = item;
    const stream = subscriptions.find(x => x.name === display_recipient);

    const backgroundColor = stream ? stream.color : '#ccc';
    const textColor = foregroundColorFromBackground(backgroundColor);
    const streamNarrowStr = JSON.stringify(streamNarrow(item.display_recipient));
    const topicNarrowStr = JSON.stringify(topicNarrow(item.display_recipient, item.subject));
    const topicHtml = renderSubject(item);

    return template`
<div class="header-wrapper header topic-header"
    data-narrow="${topicNarrowStr}"
    data-msg-id="${item.id}">
  <div class="header stream-text"
       style="color: ${textColor};
              background: ${backgroundColor}"
       data-narrow="${streamNarrowStr}">
    # ${item.display_recipient}
  </div>
  <div class="header-text">$!${topicHtml}</div>
  <div class="header-date">${humanDate(new Date(item.timestamp * 1000))}</div>
</div>
    `;
  }

  if (item.type === 'private') {
    const recipients =
      item.display_recipient.length === 1 && item.display_recipient[0].email === ownEmail
        ? item.display_recipient
        : item.display_recipient.filter(r => r.email !== ownEmail);

    const narrowObj =
      recipients.length === 1
        ? privateNarrow(recipients[0].email)
        : groupNarrow(recipients.map(r => r.email));
    const privateNarrowStr = JSON.stringify(narrowObj);

    if (headerStyle === 'date') {
      return template`
<div class="header-wrapper private-header header"
     data-narrow="${privateNarrowStr}"
     data-msg-id="${item.id}">
  <empty></empty>
  <div class="header-date">${humanDate(new Date(item.timestamp * 1000))}</div>
</div>
      `;
    }

    if (headerStyle === 'full') {
      return template`
<div class="header-wrapper private-header header"
     data-narrow="${privateNarrowStr}"
     data-msg-id="${item.id}">
  <div class="header-text">${recipients
    .map(r => r.full_name)
    .sort()
    .join(', ')}</div>
  <div class="header-date">${humanDate(new Date(item.timestamp * 1000))}</div>
</div>
      `;
    }
  }

  return '';
};
