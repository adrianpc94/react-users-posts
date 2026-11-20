import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPost, nextLocalId, type CreatedPost } from '../api';

type NewPostFormProps = {
  /** The user the post is for, fixed for this form's lifetime. */
  userId: number;
  onCreated: (post: CreatedPost) => void;
  onClose: () => void;
};

type SubmitState = { status: 'idle' } | { status: 'submitting' } | { status: 'error' };
type FieldErrors = { title?: string; body?: string };

function validate(title: string, body: string): FieldErrors {
  return {
    title: title.trim() ? undefined : 'Title is required',
    body: body.trim() ? undefined : 'Body is required',
  };
}

export function NewPostForm({ userId, onCreated, onClose }: NewPostFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving (Cancel, or switching users unmounts the form) abandons any POST in flight.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.status === 'submitting') return;

    const found = validate(title, body);
    setErrors(found);
    if (found.title || found.body) {
      (found.title ? titleRef : bodyRef).current?.focus();
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setSubmit({ status: 'submitting' });
    const post = { userId, title: title.trim(), body: body.trim() };
    try {
      await createPost(post, controller.signal);
      onCreated({ ...post, localId: nextLocalId() });
      onClose();
    } catch {
      if (!controller.signal.aborted) setSubmit({ status: 'error' });
    }
  }

  function handleCancel() {
    controllerRef.current?.abort();
    onClose();
  }

  const submitting = submit.status === 'submitting';

  return (
    <form className="new-post" onSubmit={handleSubmit} noValidate>
      <label>
        <span>Title</span>
        <input
          ref={titleRef}
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title && e.target.value.trim()) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
      </label>
      {errors.title ? (
        <p id="title-error" className="field-error">
          {errors.title}
        </p>
      ) : null}

      <label>
        <span>Body</span>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (errors.body && e.target.value.trim()) setErrors((prev) => ({ ...prev, body: undefined }));
          }}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? 'body-error' : undefined}
        />
      </label>
      {errors.body ? (
        <p id="body-error" className="field-error">
          {errors.body}
        </p>
      ) : null}

      {submit.status === 'error' ? (
        <p role="alert">Couldn't add the post. Your text is kept; try again.</p>
      ) : null}

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add post'}
        </button>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
