import React from "react";
import "./Footer.css";

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Logo */}
        <div className="footer-logo">
          <div className="logo-box">fix</div>
          <span>Fixzep</span>
        </div>

        {/* Columns */}
        <div className="footer-columns">
          <div className="column">
            <h4>Company</h4>
            <ul>
              <li>About us</li>
              <li>Investor Relations</li>
              <li>Terms & conditions</li>
              <li>Privacy policy</li>
              <li>Anti-discrimination policy</li>
              <li>ESG Impact</li>
              <li>Careers</li>
            </ul>
          </div>

          <div className="column">
            <h4>For customers</h4>
            <ul>
              <li>Customer reviews</li>
              <li>Categories near you</li>
              <li>Contact us</li>
            </ul>
          </div>

          <div className="column">
            <h4>For professionals</h4>
            <ul>
              <li>Partner with Fixzep</li>
            </ul>
          </div>

          <div className="column">
            <h4>Social links</h4>

            <div className="social-icons">
              <span>🐦</span>
              <span>📘</span>
              <span>📸</span>
              <span>🔗</span>
            </div>

            <div className="store-buttons">
              <img
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="App Store"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                alt="Google Play"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr />

      {/* Bottom */}
      <div className="footer-bottom">
        <p>Same-day slots in most metros.</p>
        <p>© 2025 Fixzep. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
