import type { CreatedPost } from '../api';
import { Field } from '../ui/Field';
import './posts.css';
import { useNewPostForm } from './useNewPostForm';

type NewPostFormProps = {
  /** Lets the "+ New post" button point at this form (aria-controls). */
  id: string;
  userId: number;
  onCreated: (post: CreatedPost) => void;
  onClose: () => void;
};

export function NewPostForm({ id, ...options }: NewPostFormProps) {
  const { values, errors, submit, setField, handleSubmit, cancel, titleRef, bodyRef } =
    useNewPostForm(options);
  const submitting = submit.status === 'submitting';

  return (
    <form
      id={id}
      className="new-post"
      aria-label="New post"
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel();
      }}
      noValidate
    >
      <Field label="Title" error={errors.title}>
        {(aria) => (
          <input
            ref={titleRef}
            className="input"
            autoFocus
            value={values.title}
            onChange={(e) => setField('title', e.target.value)}
            {...aria}
          />
        )}
      </Field>

      <Field label="Body" error={errors.body}>
        {(aria) => (
          <textarea
            ref={bodyRef}
            className="input textarea"
            value={values.body}
            onChange={(e) => setField('body', e.target.value)}
            {...aria}
          />
        )}
      </Field>

      {submit.status === 'error' ? (
        <p role="alert" className="form-error">
          Couldn't add the post. Your text is kept; try again.
        </p>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add post'}
        </button>
        <button type="button" className="button-secondary" onClick={cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
