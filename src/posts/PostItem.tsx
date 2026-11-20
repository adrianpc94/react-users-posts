import './posts.css';

type PostItemProps = {
  title: string;
  body: string;
  /** Created in this session: shows the "just added" tag. */
  isNew?: boolean;
};

export function PostItem({ title, body, isNew = false }: PostItemProps) {
  return (
    <li className="post-item">
      <h3 className="post-title">
        {title}
        {isNew ? (
          <>
            {' '}
            <span className="tag">just added</span>
          </>
        ) : null}
      </h3>
      <p className="post-body">{body}</p>
    </li>
  );
}
