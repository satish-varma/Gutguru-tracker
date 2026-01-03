'use client';

import { X, Eye, Download, CreditCard } from 'lucide-react';
import { useSession } from "next-auth/react";
import { Invoice } from '@/types';
import { useEffect, useState } from 'react';

interface InvoiceDrawerProps {
  invoice: Invoice | null;
  onClose: () => void;
  isOpen: boolean;
}

export function InvoiceDrawer({ invoice, onClose, isOpen }: InvoiceDrawerProps) {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setTimeout(() => setIsVisible(false), 300); // Wait for animation
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`drawer-panel ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">Invoice Details</h2>
            <p className="drawer-subtitle">ID: {invoice?.id || '...'}</p>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {invoice ? (
          <div className="drawer-content">
            {/* Status Banner */}
            <div className={`status-banner ${invoice.status.toLowerCase() === 'processed' ? 'pending' : invoice.status.toLowerCase()}`}>
              <span className="status-label">{invoice.status.toLowerCase() === 'processed' ? 'Pending' : invoice.status}</span>
              <span className="status-date">Detected on {new Date().toLocaleDateString()}</span>
            </div>

            {/* Key Value Grid */}
            <div className="info-grid">
              <div className="info-item">
                <label>Amount</label>
                <div className="value large">₹{invoice.amount.toLocaleString()}</div>
              </div>
              <div className="info-item">
                <label>Invoice Date</label>
                <div className="value">{invoice.date}</div>
              </div>
              <div className="info-item">
                <label>Service Period</label>
                <div className="value">{invoice.serviceDateRange || 'N/A'}</div>
              </div>
            </div>

            <div className="divider" />

            {/* Location Details */}
            <h3 className="section-title">Location & Vendor</h3>
            <div className="info-card">
              <div className="info-row">
                <span className="label">Location</span>
                <span className="value">{invoice.location}</span>
              </div>
              <div className="info-row">
                <span className="label">Stall Name</span>
                <span className="value bold">{invoice.stall}</span>
              </div>
            </div>

            <div className="divider" />

            {/* Actions */}
            <div className="actions">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => {
                    // Use API endpoint for R2/cloud storage
                    const apiUrl = `/api/download-invoice?id=${encodeURIComponent(invoice.id)}&pdfPath=${encodeURIComponent(invoice.pdfPath || '')}`;
                    window.open(apiUrl, '_blank');
                  }}
                >
                  <Eye size={16} />
                  Preview
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={async () => {
                    try {
                      // Use API endpoint for download
                      const apiUrl = `/api/download-invoice?id=${encodeURIComponent(invoice.id)}&pdfPath=${encodeURIComponent(invoice.pdfPath || '')}`;
                      const response = await fetch(apiUrl);

                      if (!response.ok) {
                        const error = await response.json();
                        alert(error.error || 'Failed to download PDF');
                        return;
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `Invoice-${invoice.id}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error('Download error:', e);
                      alert('Failed to download PDF');
                    }
                  }}
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
              {session?.user?.role !== 'user' && (
                <button className="btn-premium w-full py-2.5 text-sm px-4">
                  Mark as Paid
                </button>
              )}
            </div>

          </div>
        ) : (
          <div className="drawer-loading">Loading...</div>
        )}
      </div >

      <style jsx>{`
        .drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 90;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .drawer-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .drawer-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 450px;
          height: 100vh;
          background: white;
          z-index: 100;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
        }

        .drawer-panel.open {
          transform: translateX(0);
        }

        .drawer-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #f8fafc;
        }

        .drawer-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .drawer-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 0.25rem;
          font-family: monospace;
        }

        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .drawer-content {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .status-banner {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-banner.paid {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
        }

        .status-banner.pending {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
        }

        .status-label {
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .status-date {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-item label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }

        .info-item .value {
          color: #0f172a;
          font-weight: 500;
        }

        .info-item .value.large {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #334155;
        }

        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-row .label {
          color: #64748b;
        }

        .info-row .value {
          color: #0f172a;
          text-align: right;
        }

        .info-row .value.bold {
          font-weight: 600;
        }

        .divider {
          height: 1px;
          background: #e2e8f0;
          margin: 2rem 0;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .btn-outline {
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
        }

        .btn-outline:hover {
          border-color: #94a3b8;
          color: #0f172a;
        }

        .full-width {
          width: 100%;
          justify-content: center;
          padding: 0.75rem;
        }

        @media (max-width: 480px) {
          .drawer-panel {
            width: 100%;
          }
          
          .info-grid {
            grid-template-columns: 1fr;
          }
          
          .drawer-header {
            padding: 1rem;
          }
          
          .drawer-content {
            padding: 1rem;
          }
        }
      `}</style>
    </>
  );
}
