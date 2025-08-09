export function Button({ children, variant='primary', ...props }) {
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-ghost';
  return <button className={cls} {...props}>{children}</button>;
}
