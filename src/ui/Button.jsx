export function Button({ children, variant='ghost', ...props }) {
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  return <button className={cls} {...props}>{children}</button>
}
