import './ui.css';

type ErrorWithRetryProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorWithRetry({ message, onRetry }: ErrorWithRetryProps) {
  return (
    <div className="error-with-retry">
      <p role="alert">{message}</p>
      <button type="button" className="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
