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
      <div className="post-heading">
        <h3 className="post-title">{title}</h3>
        {isNew ? <span className="tag">just added</span> : null}
      </div>
      <p className="post-body">{body}</p>
    </li>
  );
}
