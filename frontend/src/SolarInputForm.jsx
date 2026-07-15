import React, { useState } from 'react';
import axios from 'axios';

const states = [
  'Delhi',
  'Maharashtra',
  'Gujarat',
  'Tamil Nadu',
  'Karnataka',
  'Uttar Pradesh',
  'Rajasthan',
  'Punjab',
];

function SolarInputForm({ token, onResults, onHistoryRefresh }) {
  const [formData, setFormData] = useState({
    city: 'New Delhi',
    monthlyBill: '',
    rooftopArea: '',
    state: 'Delhi',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const bill = Number(formData.monthlyBill);
    const area = Number(formData.rooftopArea);

    if (!formData.city.trim()) {
      return 'Please enter a city or location.';
    }
    if (!Number.isFinite(bill) || bill <= 0) {
      return 'Monthly bill must be a positive number.';
    }
    if (!Number.isFinite(area) || area <= 0) {
      return 'Rooftop area must be a positive number.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const weatherResponse = await axios.get('http://127.0.0.1:5000/weather', {
        params: { city: formData.city },
        timeout: 10000,
      });

      const weatherData = weatherResponse.data;
      if (weatherData.error) {
        throw new Error(weatherData.error);
      }

      const predictionResponse = await axios.post('http://127.0.0.1:5000/predict', {
        temperature: weatherData.temperature,
        cloudcover: weatherData.cloudcover,
        humidity: weatherData.humidity,
        windspeed: weatherData.windspeed,
        radiation: weatherData.radiation,
      }, { timeout: 10000 });

      const roiResponse = await axios.post('http://127.0.0.1:5000/calculate-roi', {
        monthlyBill: Number(formData.monthlyBill),
        rooftopArea: Number(formData.rooftopArea),
        tariffRate: 7,
        state: formData.state,
        city: formData.city,
        predicted_output: predictionResponse.data.predicted_energy_output_kwh,
      }, {
        timeout: 10000,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const carbonResponse = await axios.post('http://127.0.0.1:5000/carbon-footprint', {
        energyOutputKwh: predictionResponse.data.predicted_energy_output_kwh,
      }, { timeout: 10000 });

      const results = {
        prediction: predictionResponse.data,
        roi: roiResponse.data,
        carbon: carbonResponse.data,
        userInput: {
          location: formData.city,
          bill: formData.monthlyBill,
          area: formData.rooftopArea,
          state: formData.state,
        },
      };

      onResults(results);
      if (typeof onHistoryRefresh === 'function') {
        onHistoryRefresh();
      }
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Something went wrong while contacting the backend. Please try again.';
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="solar-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <h2>Solar Assessment</h2>
        <p>Estimate your rooftop solar potential in seconds.</p>
      </div>

      <label className="full-width">
        City / Location
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Monthly Electricity Bill (₹)
        <input
          type="number"
          min="0"
          name="monthlyBill"
          value={formData.monthlyBill}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Rooftop Area (sq ft)
        <input
          type="number"
          min="0"
          name="rooftopArea"
          value={formData.rooftopArea}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        State
        <select name="state" value={formData.state} onChange={handleChange} required>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </label>

      <button className="full-width" type="submit" disabled={loading}>
        {loading ? 'Analyzing your solar potential...' : 'Analyze Solar Potential'}
      </button>

      {error && <p className="error-message">{error}</p>}
    </form>
  );
}

export default SolarInputForm;
