import React, { useState } from 'react';
import { downloadPdfReport } from './reportDownload';

function CalculationHistory({ history, loading, error, onDelete }) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadReport = async (item) => {
    const predictedOutput = Number(item.predicted_output);
    const co2SavedKg = predictedOutput * 0.82;

    setDownloadingId(item.id);
    setDownloadError('');

    try {
      await downloadPdfReport({
        city: item.city,
        monthlyBill: Number(item.monthly_bill),
        predictedOutput,
        monthlySavings: Number(item.monthly_savings),
        annualSavings: Number(item.monthly_savings) * 12,
        paybackPeriod: Number(item.payback_period),
        co2SavedKg,
        treeEquivalent: co2SavedKg / 21,
      });
    } catch (downloadException) {
      setDownloadError('Could not download this report. Please try again.');
      console.error('History report download failed', downloadException);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="history-panel">
      <div className="history-heading">
        <h2>Calculation History</h2>
        <p>Saved calculations for your account.</p>
      </div>

      {loading && <p>Loading history...</p>}
      {error && <p className="error-message">{error}</p>}
      {downloadError && <p className="error-message">{downloadError}</p>}

      {!loading && !error && (
        <div className="history-table-wrapper">
          {history.length === 0 ? (
            <p>No saved calculations yet. Run the calculator to store one.</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>City</th>
                  <th>Bill (₹)</th>
                  <th>Monthly Savings</th>
                  <th>Payback (yrs)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{item.city}</td>
                    <td>₹{Number(item.monthly_bill).toFixed(0)}</td>
                    <td>₹{Number(item.monthly_savings).toFixed(0)}</td>
                    <td>{Number(item.payback_period).toFixed(1)}</td>
                    <td>
                      <div className="history-actions">
                        <button
                          type="button"
                          className="history-report-btn"
                          onClick={() => handleDownloadReport(item)}
                          disabled={downloadingId === item.id}
                        >
                          {downloadingId === item.id ? 'Preparing...' : 'Download Report'}
                        </button>
                        <button type="button" className="delete-btn" onClick={() => onDelete(item.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

export default CalculationHistory;
