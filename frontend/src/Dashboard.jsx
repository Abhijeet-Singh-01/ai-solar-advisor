import React from 'react';
import { downloadPdfReport } from './reportDownload';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function Dashboard({ results }) {
  if (!results) {
    return <p>Fill the form to see your solar analysis.</p>;
  }

  const { prediction, roi, carbon } = results;
  const {
    monthly_units_kwh,
    recommended_capacity_kw,
    number_of_panels,
    roof_area_required_sq_ft,
    annual_savings,
    lifetime_savings_25_years,
    roi_percent,
    estimated_monthly_savings,
    payback_period_years,
  } = roi;

  const monthlyComparison = Array.from({ length: 12 }, (_, index) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
    withoutSolar: 1200 + index * 60,
    withSolar: Math.max(700, 1200 + index * 60 - (estimated_monthly_savings || 0) * 0.9),
  }));

  const monthlySavingsData = Array.from({ length: 12 }, (_, index) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
    savings: Number(estimated_monthly_savings) ? Number(estimated_monthly_savings) * (0.95 + index * 0.01) : 0,
  }));

  const yearlySavings = Array.from({ length: 25 }, (_, index) => ({
    year: index + 1,
    savings: Number(annual_savings) ? Number(annual_savings) * (index + 1) : 0,
  }));

  const beforeAfterData = Array.from({ length: 6 }, (_, index) => ({
    period: `Month ${index + 1}`,
    withoutSolar: 1200 + index * 60,
    withSolar: Math.max(700, 1200 + index * 60 - (estimated_monthly_savings || 0) * 0.9),
  }));

  const treeEquivalent = Math.round(carbon.tree_equivalent || 0);

  const handleDownload = async () => {
    try {
      await downloadPdfReport({
        city: results.userInput.location,
        rooftopArea: results.userInput.area,
        monthlyBill: Number(results.userInput.bill),
        state: results.userInput.state,
        predictedOutput: Number(prediction.predicted_energy_output_kwh),
        monthlySavings: Number(roi.estimated_monthly_savings),
        annualSavings: Number(roi.annual_savings),
        paybackPeriod: Number(roi.payback_period_years),
        co2SavedKg: Number(carbon.co2_saved_kg),
        treeEquivalent: Number(carbon.tree_equivalent),
      });
    } catch (error) {
      console.error('PDF download failed', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="insight-banner">
        <div>
          <span className="banner-label">Solar insights</span>
          <h2>Detailed performance and finance overview</h2>
          <p>Review your forecast, savings, and environmental impact with one tap.</p>
        </div>
        <div className="banner-summary">
          <div>
            <strong>{results.userInput.location}</strong>
            <span>Location</span>
          </div>
          <div>
            <strong>{results.userInput.area} sq ft</strong>
            <span>Rooftop area</span>
          </div>
          <div>
            <strong>{results.userInput.state}</strong>
            <span>State</span>
          </div>
        </div>
      </div>

      <div className="card-grid">
        <div className="card energy">
          <h3>Estimated Units</h3>
          <p>{Number(monthly_units_kwh).toFixed(1)} kWh/month</p>
        </div>
        <div className="card energy">
          <h3>Solar Capacity</h3>
          <p>{Number(recommended_capacity_kw).toFixed(2)} kW</p>
        </div>
        <div className="card energy">
          <h3>Panels Required</h3>
          <p>{number_of_panels}</p>
        </div>
        <div className="card energy">
          <h3>Roof Area Required</h3>
          <p>{Number(roof_area_required_sq_ft).toFixed(1)} sq ft</p>
        </div>
        <div className="card positive">
          <h3>Monthly Savings</h3>
          <p>₹{Number(estimated_monthly_savings).toFixed(0)}</p>
        </div>
        <div className="card positive">
          <h3>Annual Savings</h3>
          <p>₹{Number(annual_savings).toFixed(0)}</p>
        </div>
        <div className="card positive">
          <h3>25-Year Savings</h3>
          <p>₹{Number(lifetime_savings_25_years).toFixed(0)}</p>
        </div>
        <div className="card neutral">
          <h3>Payback</h3>
          <p>{Number(payback_period_years).toFixed(1)} years</p>
        </div>
        <div className="card neutral">
          <h3>ROI</h3>
          <p>{Number(roi_percent).toFixed(1)}%</p>
        </div>
        <div className="card neutral">
          <h3>CO₂ Saved</h3>
          <p>{Number(carbon.co2_saved_kg).toFixed(1)} kg/year</p>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Monthly Savings</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlySavingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="savings" fill="#10b981" name="Monthly Savings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Yearly Savings (25 years)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={yearlySavings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="savings" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Before vs After</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={beforeAfterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="withoutSolar" fill="#64748b" name="Without Solar" />
              <Bar dataKey="withSolar" fill="#16a34a" name="With Solar" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="env-card">
          <h3>Environmental Impact</h3>
          <div className="env-detail">
            <span>CO₂ reduced</span>
            <strong>{Number(carbon.co2_saved_kg).toFixed(1)} kg/year</strong>
          </div>
          <div className="env-detail">
            <span>Trees equivalent</span>
            <strong>{treeEquivalent}</strong>
          </div>
          <p>Based on the existing carbon footprint endpoint calculation.</p>
        </div>
      </div>

      <div className="tree-card">
        <h3>This is equivalent to planting {treeEquivalent} trees per year</h3>
        <p>That is a strong environmental impact for a college project demo.</p>
      </div>

      <button className="download-btn" onClick={handleDownload}>Download PDF Report</button>
    </div>
  );
}

export default Dashboard;
