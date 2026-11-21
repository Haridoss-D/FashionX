export default function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="container">
        <strong className="logo">FASHION<span>X</span></strong>
        <p>Trendy. Comfortable. You.</p>
        <small>© {new Date().getFullYear()} FashionX. All rights reserved.</small>
      </div>
    </footer>
  );
}
