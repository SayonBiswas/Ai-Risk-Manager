import { useState } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface TransactionForm {
  transaction_id: string
  amount: string
  currency: string
  customer_id: string
  payment_method: 'card' | 'upi' | 'netbanking' | 'wallet'
  device_id: string
  ip_address: string
  merchant_category_code: string
  is_international: boolean
}

interface RiskResponse {
  transaction_id: string
  decision: 'ALLOW' | 'FLAG' | 'BLOCK'
  fraud_score: number
  return_risk_score: number
  chargeback_risk_score: number
  reason: string
  recommended_actions: string[]
  model_version: string
  latency_ms: number
}

function App() {
  const [formData, setFormData] = useState<TransactionForm>({
    transaction_id: `txn_${Date.now()}`,
    amount: '100.00',
    currency: 'USD',
    customer_id: 'cust_12345',
    payment_method: 'card',
    device_id: 'device_abc123',
    ip_address: '192.168.1.1',
    merchant_category_code: '5399',
    is_international: false,
  })

  const [response, setResponse] = useState<RiskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      // Use test endpoint for development (no auth required)
      const testPayload = {
        transaction_id: formData.transaction_id,
        amount: formData.amount,
        currency: formData.currency,
        customer_id: formData.customer_id,
        payment_method: formData.payment_method,
        ip_address: formData.ip_address,
        merchant_category_code: formData.merchant_category_code,
      }
      const res = await axios.post(`${API_URL}/test-fraud`, testPayload)
      setResponse(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ALLOW': return '#10b981'
      case 'FLAG': return '#f59e0b'
      case 'BLOCK': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>AI Risk Manager</h1>
        <p>Fraud Detection & Risk Analysis</p>
      </header>

      <main className="main">
        <div className="container">
          <section className="form-section">
            <h2>Test Transaction</h2>
            <form onSubmit={handleSubmit} className="transaction-form">
              <div className="form-group">
                <label>Transaction ID</label>
                <input
                  type="text"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({...formData, transaction_id: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value.toUpperCase()})}
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Customer ID</label>
                <input
                  type="text"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value as any})}
                  required
                >
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                  <option value="wallet">Wallet</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Device ID</label>
                  <input
                    type="text"
                    value={formData.device_id}
                    onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>IP Address</label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Merchant Category Code</label>
                  <input
                    type="text"
                    value={formData.merchant_category_code}
                    onChange={(e) => setFormData({...formData, merchant_category_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_international}
                      onChange={(e) => setFormData({...formData, is_international: e.target.checked})}
                    />
                    International Transaction
                  </label>
                </div>
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Analyzing...' : 'Analyze Risk'}
              </button>
            </form>

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}
          </section>

          {response && (
            <section className="response-section">
              <h2>Risk Analysis Result</h2>
              
              <div className="decision-badge" style={{ backgroundColor: getDecisionColor(response.decision) }}>
                <span className="decision-text">{response.decision}</span>
              </div>

              <div className="response-grid">
                <div className="response-card">
                  <h3>Risk Scores</h3>
                  <div className="score-item">
                    <span>Fraud Risk</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${response.fraud_score * 100}%` }}
                      />
                      <span className="score-value">{(response.fraud_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="score-item">
                    <span>Return Risk</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${response.return_risk_score * 100}%` }}
                      />
                      <span className="score-value">{(response.return_risk_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="score-item">
                    <span>Chargeback Risk</span>
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${response.chargeback_risk_score * 100}%` }}
                      />
                      <span className="score-value">{(response.chargeback_risk_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="response-card">
                  <h3>Explanation</h3>
                  <p className="reason-text">{response.reason}</p>
                  
                  {response.recommended_actions.length > 0 && (
                    <div className="actions">
                      <h4>Recommended Actions:</h4>
                      <ul>
                        {response.recommended_actions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="response-card">
                  <h3>Metadata</h3>
                  <div className="metadata">
                    <p><strong>Transaction ID:</strong> {response.transaction_id}</p>
                    <p><strong>Model Version:</strong> {response.model_version}</p>
                    <p><strong>Latency:</strong> {response.latency_ms}ms</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default App