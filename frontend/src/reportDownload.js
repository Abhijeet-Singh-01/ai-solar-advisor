import axios from 'axios';

export async function downloadPdfReport(reportData) {
  const response = await axios.post(
    'http://127.0.0.1:5000/generate-report',
    reportData,
    { responseType: 'blob' },
  );

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ai_solar_advisor_report.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
