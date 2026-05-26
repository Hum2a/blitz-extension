export default function Alert({ type = "error", children }) {
  const cls = type === "success" ? "alert alert-success" : "alert alert-error";
  return <div className={cls}>{children}</div>;
}
