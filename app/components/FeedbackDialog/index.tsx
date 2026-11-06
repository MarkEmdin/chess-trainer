'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import Spinner from '@/app/components/Spinner';
import { sendFeedback } from '@/lib/feedback/actions';
import {
  FEEDBACK_KINDS,
  MAX_CONTACT_LENGTH,
  MAX_FEEDBACK_LENGTH,
  type FeedbackKind,
} from '@/lib/feedback/types';

// Footer button and its dialog (spec 025). A plain trigger with controlled
// `open`: `asChild` triggers mismatch on hydration (see known-issues).
export default function FeedbackDialog() {
  const t = useTranslations('feedback');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        {t('open')}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <FeedbackForm onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Mounted while the dialog is open, so it starts clean every time.
function FeedbackForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations('feedback');
  const [state, action, pending] = useActionState(sendFeedback, undefined);
  // Controlled: React clears form fields after an action, and a failed send
  // must keep the text, which exists nowhere else.
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');

  if (state && 'success' in state) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-foreground">
          {t('sent')}
        </p>
        <Button type="button" className="self-end" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="page" value={window.location.href} />
      <input
        type="hidden"
        name="screen"
        value={`${window.innerWidth}×${window.innerHeight}`}
      />
      {/* A trap for bots: people never see or reach this field. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t('kindLabel')}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {FEEDBACK_KINDS.map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="accent-primary"
              />
              {t(`kinds.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2 text-sm font-medium">
        {t('bodyLabel')}
        <Textarea
          name="body"
          rows={5}
          maxLength={MAX_FEEDBACK_LENGTH}
          placeholder={t('bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="font-normal"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium">
        {t('contactLabel')}
        <Input
          name="contact"
          maxLength={MAX_CONTACT_LENGTH}
          placeholder={t('contactPlaceholder')}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="font-normal"
        />
      </label>

      {state && 'error' in state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" className="self-end" disabled={pending}>
        {pending && <Spinner />}
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
