import "../styles/footer.css";

const SiteFooter = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <ul className="footer-circles paycrest-circles" aria-hidden="true">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>PayCrest</h3>
          <p>Digital Loan Management System - Simplifying borrowing with technology</p>
          <div className="footer-socials" aria-label="social links">
            <span title="Facebook">f</span>
            <span title="LinkedIn">in</span>
            <span title="Twitter">x</span>
            <span title="Instagram">ig</span>
          </div>
        </div>

        <div>
          <h4>Company</h4>
          <ul>
            <li>About PayCrest</li>
            <li>Contact Support</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

        <div>
          <h4>Loan Products</h4>
          <ul>
            <li>Education Loan</li>
            <li>Vehicle Loan</li>
            <li>Home Loan</li>
            <li>Personal Loan</li>
          </ul>
        </div>

        <div>
          <h4>Resources</h4>
          <ul>
            <li>Knowledge Center</li>
            <li>FAQ</li>
            <li>EMI Calculators</li>
          </ul>
        </div>

        <div>
          <h4>Legal</h4>
          <ul>
            <li>Terms & Conditions</li>
            <li>Regulatory Compliance</li>
            <li>Fraud Prevention</li>
          </ul>
        </div>
      </div>

      <p className="footer-bottom">
        Â© {currentYear} PayCrest Loan Management System. All rights reserved. | Secure and Regulated Financial Services
      </p>
    </footer>
  );
};

export default SiteFooter;

