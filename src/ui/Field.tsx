import { useId, type ReactNode } from 'react';
import './ui.css';

/** Props a control needs so assistive tech links it to its error. */
export type FieldAria = { 'aria-invalid'?: true; 'aria-describedby'?: string };

type FieldProps = {
  label: string;
  error?: string;
  /** Renders the control; spread `aria` onto it. */
  children: (aria: FieldAria) => ReactNode;
};

/**
 * A labelled control with its validation error. The error sits outside the
 * <label> so it never becomes part of the control's accessible name.
 */
export function Field({ label, error, children }: FieldProps) {
  const errorId = useId();
  const aria: FieldAria = error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};

  return (
    <>
      <label className="field">
        <span className="field-label">{label}</span>
        {children(aria)}
      </label>
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </>
  );
}
