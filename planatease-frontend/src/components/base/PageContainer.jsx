export default function PageContainer({ className = "", children }) {
  return (
    <div className="container-fluid px-0">
      <div className={`container-lg px-0 px-sm-0 px-lg-3 ${className}`}>
        {children}
      </div>
    </div>
  );
}
