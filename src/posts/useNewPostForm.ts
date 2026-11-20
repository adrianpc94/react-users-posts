import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { createPost, type CreatedPost } from '../api';
import { nextLocalId } from './localId';

type FieldName = 'title' | 'body';
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;
type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error' };

const REQUIRED_MESSAGE: Record<FieldName, string> = {
  title: 'Title is required',
  body: 'Body is required',
};

function validate(values: Values): FieldErrors {
  return {
    title: values.title.trim() ? undefined : REQUIRED_MESSAGE.title,
    body: values.body.trim() ? undefined : REQUIRED_MESSAGE.body,
  };
}

type Options = {
  /** The user the post is for, fixed for the form's lifetime. */
  userId: number;
  onCreated: (post: CreatedPost) => void;
  onClose: () => void;
};

/**
 * State and behaviour of the new-post form: values, validation, submitting and
 * cancelling. Must be called inside the form component, so that unmounting the
 * form (Cancel, or switching users) aborts a POST still in flight.
 */
export function useNewPostForm({ userId, onCreated, onClose }: Options) {
  const [values, setValues] = useState<Values>({ title: '', body: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // Leaving the page would lose an unsent draft: ask the browser to confirm first.
  const hasDraft = values.title !== '' || values.body !== '';
  useEffect(() => {
    if (!hasDraft) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasDraft]);

  function setField(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    // An error clears as soon as the field is fixed; new errors wait for submit.
    if (value.trim()) {
      setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.status === 'submitting') return;

    // A new attempt replaces the previous send error, whatever happens next.
    setSubmit({ status: 'idle' });
    const found = validate(values);
    setErrors(found);
    if (found.title || found.body) {
      (found.title ? titleRef : bodyRef).current?.focus();
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setSubmit({ status: 'submitting' });
    const post = { userId, title: values.title.trim(), body: values.body.trim() };
    try {
      await createPost(post, controller.signal);
      // Finished: closing the form must not cancel a request that already succeeded.
      controllerRef.current = null;
      onCreated({ ...post, localId: nextLocalId() });
      onClose();
    } catch {
      if (!controller.signal.aborted) setSubmit({ status: 'error' });
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    onClose();
  }

  return { values, errors, submit, setField, handleSubmit, cancel, titleRef, bodyRef };
}
