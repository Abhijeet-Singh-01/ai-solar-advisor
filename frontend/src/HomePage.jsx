import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">AI Solar Advisor</span>
          <h1>Smarter solar decisions for your rooftop.</h1>
          <p>Discover your solar potential, estimate savings, and measure environmental impact in one sleek experience.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => navigate('/calculator')}>
              Calculate Now
            </button>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-stat">
            <span>Instant forecast</span>
            <strong>Solar energy in minutes</strong>
          </div>
          <div className="hero-stat">
            <span>Verified savings</span>
            <strong>Realistic cost estimates</strong>
          </div>
        </div>
      </section>

      <section className="why-solar-section">
        <h2>Why Solar?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">☀️</div>
            <h3>Lower bills</h3>
            <p>Reduce your energy costs with rooftop generation built for your home.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🌍</div>
            <h3>Cleaner energy</h3>
            <p>Cut carbon emissions and move toward a greener future.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">⚡</div>
            <h3>Reliable insights</h3>
            <p>Use data-driven output estimates and payback projections.</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📈</div>
            <h3>Smart planning</h3>
            <p>Make decisions with easy-to-read savings and performance metrics.</p>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="stat-card">
          <strong>500+</strong>
          <p>users served</p>
        </div>
        <div className="stat-card">
          <strong>1200+</strong>
          <p>kWh forecasted daily</p>
        </div>
        <div className="stat-card">
          <strong>98%</strong>
          <p>customer satisfaction</p>
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>AI Solar Advisor</strong>
          <p>Helping households make smarter solar choices.</p>
        </div>
        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/calculator">Calculator</a>
          <a href="/login">Login</a>
        </div>
        <div className="footer-copy">© 2026 AI Solar Advisor. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default HomePage;
