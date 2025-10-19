import { Button, DropDownButton } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { ExcelExport } from '@progress/kendo-react-excel-export';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../utils/dateUtils';
import { exportGenericToCSV, exportGenericToPDF } from '../utils/genericExportUtils';
import './NewslettersGrid.css';

interface Newsletter {
  newsletter_id: string;
  title: string;
  subject_line: string;
  preview_text?: string;
  content: string;
  html_content: string;
  recipient_filter: 'all' | 'by_level' | 'by_status' | 'custom';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  sent_at?: string;
  recipient_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:7071/api';

const NewslettersGrid: React.FC = () => {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const excelExportRef = useRef<ExcelExport | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subject_line: '',
    preview_text: '',
    content: '',
    html_content: '',
    recipient_filter: 'all' as 'all' | 'by_level' | 'by_status' | 'custom',
  });

  const recipientFilterOptions = [
    { text: 'All Members', value: 'all' },
    { text: 'By Membership Level', value: 'by_level' },
    { text: 'By Status', value: 'by_status' },
    { text: 'Custom List', value: 'custom' },
  ];

  useEffect(() => {
    loadNewsletters();
  }, []);

  const loadNewsletters = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/newsletters?limit=50`);
      if (!response.ok) throw new Error('Failed to load newsletters');
      const data = await response.json();
      setNewsletters(data);
    } catch (error) {
      console.error('Error loading newsletters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      // Simple HTML conversion from plain text
      const htmlContent = formData.content
        .split('\n\n')
        .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');

      const response = await fetch(`${API_BASE_URL}/v1/newsletters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          html_content: htmlContent,
        }),
      });

      if (!response.ok) throw new Error('Failed to create newsletter');

      setShowCreateDialog(false);
      resetForm();
      loadNewsletters();
    } catch (error) {
      console.error('Error creating newsletter:', error);
      alert('Failed to create newsletter');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject_line: '',
      preview_text: '',
      content: '',
      html_content: '',
      recipient_filter: 'all',
    });
  };

  const openViewDialog = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    setShowViewDialog(true);
  };

  const formatNewsletterDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  };

  const calculateOpenRate = (newsletter: Newsletter) => {
    if (newsletter.delivered_count === 0) return '0%';
    return `${((newsletter.open_count / newsletter.delivered_count) * 100).toFixed(1)}%`;
  };

  const calculateClickRate = (newsletter: Newsletter) => {
    if (newsletter.open_count === 0) return '0%';
    return `${((newsletter.click_count / newsletter.open_count) * 100).toFixed(1)}%`;
  };

  const handleExcelExport = () => {
    if (excelExportRef.current) {
      excelExportRef.current.save();
    }
  };

  const handlePDFExport = () => {
    const columns = [
      { field: 'title', header: 'Title' },
      { field: 'subject_line', header: 'Subject' },
      { field: 'status', header: 'Status' },
      { field: 'recipient_count', header: 'Recipients' },
      { field: 'delivered_count', header: 'Delivered' },
      { field: 'open_count', header: 'Opens' },
      { field: 'click_count', header: 'Clicks' },
      { field: 'sent_at', header: 'Sent Date' },
    ];

    exportGenericToPDF(newsletters as unknown as Record<string, unknown>[], {
      title: 'CTN Newsletters',
      columns,
      orientation: 'landscape',
      includeTimestamp: true,
    });
  };

  const handleCSVExport = () => {
    const columns = [
      { field: 'title', header: 'Title' },
      { field: 'subject_line', header: 'Subject' },
      { field: 'status', header: 'Status' },
      { field: 'recipient_filter', header: 'Recipient Filter' },
      { field: 'recipient_count', header: 'Recipients' },
      { field: 'delivered_count', header: 'Delivered' },
      { field: 'open_count', header: 'Opens' },
      { field: 'click_count', header: 'Clicks' },
      { field: 'sent_at', header: 'Sent Date' },
      { field: 'created_at', header: 'Created Date' },
    ];

    exportGenericToCSV(
      newsletters as unknown as Record<string, unknown>[],
      columns,
      `CTN_Newsletters_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const exportMenuItems = [
    { text: 'Export to Excel', icon: 'file-excel', click: handleExcelExport },
    { text: 'Export to PDF', icon: 'file-pdf', click: handlePDFExport },
    { text: 'Export to CSV', icon: 'file-txt', click: handleCSVExport },
  ];

  const StatusCell = (props: any) => {
    const status = props.dataItem.status;
    const statusClass = `status-badge status-${status}`;
    return (
      <td>
        <span className={statusClass}>{status.toUpperCase()}</span>
      </td>
    );
  };

  const ActionsCell = (props: any) => {
    const newsletter = props.dataItem;
    return (
      <td>
        <Button icon="preview" fillMode="flat" onClick={() => openViewDialog(newsletter)}>
          View
        </Button>
      </td>
    );
  };

  return (
    <div className="newsletters-grid">
      <div className="grid-header">
        <h2>Newsletters</h2>
        <Button icon="email" themeColor="primary" onClick={() => setShowCreateDialog(true)}>
          New Newsletter
        </Button>
      </div>

      <ExcelExport data={newsletters} fileName="CTN_Newsletters.xlsx" ref={excelExportRef}>
        <Grid data={newsletters} style={{ height: '600px' }}>
          <GridToolbar>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <span className="grid-toolbar-info">Total Newsletters: {newsletters.length}</span>
              <DropDownButton
                text="Export"
                icon="download"
                items={exportMenuItems}
                themeColor="primary"
                fillMode="outline"
              />
            </div>
          </GridToolbar>

          <GridColumn field="title" title="Title" width="250px" />
          <GridColumn field="subject_line" title="Subject" width="250px" />
          <GridColumn field="status" title="Status" width="120px" cell={StatusCell} />
          <GridColumn
            field="recipient_count"
            title="Recipients"
            width="100px"
            cell={(props) => <td className="text-center">{props.dataItem.recipient_count || 0}</td>}
          />
          <GridColumn
            field="open_rate"
            title="Open Rate"
            width="100px"
            cell={(props) => <td className="text-center">{calculateOpenRate(props.dataItem)}</td>}
          />
          <GridColumn
            field="click_rate"
            title="Click Rate"
            width="100px"
            cell={(props) => <td className="text-center">{calculateClickRate(props.dataItem)}</td>}
          />
          <GridColumn
            field="sent_at"
            title="Sent Date"
            width="120px"
            cell={(props) => <td>{formatNewsletterDate(props.dataItem.sent_at)}</td>}
          />
          <GridColumn title="Actions" width="150px" cell={ActionsCell} />
        </Grid>
      </ExcelExport>

      {/* Create Dialog */}
      {showCreateDialog && (
        <Dialog title="Create Newsletter" onClose={() => setShowCreateDialog(false)} width={700}>
          <div className="dialog-content">
            <div className="form-field">
              <label>Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.value })}
                placeholder="Newsletter title (internal)"
              />
            </div>

            <div className="form-field">
              <label>Subject Line</label>
              <Input
                value={formData.subject_line}
                onChange={(e) => setFormData({ ...formData, subject_line: e.value })}
                placeholder="Email subject line"
              />
            </div>

            <div className="form-field">
              <label>Preview Text</label>
              <Input
                value={formData.preview_text}
                onChange={(e) => setFormData({ ...formData, preview_text: e.value })}
                placeholder="Preview text (optional)"
              />
            </div>

            <div className="form-field">
              <label>Content</label>
              <TextArea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.value })}
                placeholder="Newsletter content..."
                rows={8}
              />
            </div>

            <div className="form-field">
              <label>Recipients</label>
              <DropDownList
                data={recipientFilterOptions}
                textField="text"
                dataItemKey="value"
                value={recipientFilterOptions.find((o) => o.value === formData.recipient_filter)}
                onChange={(e) => setFormData({ ...formData, recipient_filter: e.value.value })}
              />
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button themeColor="primary" onClick={handleCreate}>
              Create Draft
            </Button>
          </div>
        </Dialog>
      )}

      {/* View Dialog */}
      {showViewDialog && selectedNewsletter && (
        <Dialog title="Newsletter Details" onClose={() => setShowViewDialog(false)} width={800}>
          <div className="dialog-content newsletter-view">
            <div className="newsletter-header">
              <h3>{selectedNewsletter.title}</h3>
              <span className={`status-badge status-${selectedNewsletter.status}`}>
                {selectedNewsletter.status.toUpperCase()}
              </span>
            </div>

            <div className="newsletter-meta">
              <div className="meta-item">
                <strong>Subject:</strong> {selectedNewsletter.subject_line}
              </div>
              {selectedNewsletter.preview_text && (
                <div className="meta-item">
                  <strong>Preview:</strong> {selectedNewsletter.preview_text}
                </div>
              )}
              <div className="meta-item">
                <strong>Recipients:</strong> {selectedNewsletter.recipient_count}
              </div>
              <div className="meta-item">
                <strong>Sent:</strong> {formatNewsletterDate(selectedNewsletter.sent_at)}
              </div>
            </div>

            {selectedNewsletter.status === 'sent' && (
              <div className="newsletter-stats">
                <div className="stat-card">
                  <div className="stat-value">{selectedNewsletter.delivered_count}</div>
                  <div className="stat-label">Delivered</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{selectedNewsletter.open_count}</div>
                  <div className="stat-label">Opens</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{calculateOpenRate(selectedNewsletter)}</div>
                  <div className="stat-label">Open Rate</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{selectedNewsletter.click_count}</div>
                  <div className="stat-label">Clicks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{calculateClickRate(selectedNewsletter)}</div>
                  <div className="stat-label">CTR</div>
                </div>
              </div>
            )}

            <div className="newsletter-content">
              <h4>Content:</h4>
              <div className="content-preview">{selectedNewsletter.content}</div>
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowViewDialog(false)}>Close</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default NewslettersGrid;
