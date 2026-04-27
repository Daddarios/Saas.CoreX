// ============================================================================
// === IMPORTS ===
// ============================================================================
import { Table, Pagination, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { useState, useRef } from 'react';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../../hooks/useLanguage';

// ============================================================================
// === MAIN COMPONENT: DATA TABLE ===
// ============================================================================
export default function DataTable({
  columns,
  data,
  totalCount = 0,
  page = 1,
  size = 20,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Suchen...',
}) {
  const { t } = useLanguage();

  // ---------- STATE MANAGEMENT ----------
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const totalPages = Math.ceil(Math.max(totalCount, data.length) / size);

  // Client-side filtre: tüm string alanlarında ara
  const filteredData = searchTerm.trim()
    ? data.filter((row) =>
        Object.values(row).some((val) =>
          String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  const csvRef = useRef();

  // ---------- HANDLERS ----------
  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const getCsvData = () =>
    filteredData.map((row) =>
      Object.fromEntries(columns.map((col) => [col.label, col.render ? '' : row[col.key] ?? '']))
    );

  const handleCopy = () => {
    const header = columns.map((c) => c.label).join('\t');
    const rows = filteredData.map((row) =>
      columns.map((col) => (col.render ? '' : row[col.key] ?? '')).join('\t')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [columns.map((c) => c.label)],
      body: filteredData.map((row) => columns.map((col) => (col.render ? '' : String(row[col.key] ?? '')))),
    });
    doc.save('tablo.pdf');
  };

  const handlePrint = () => {
    const header = `<tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;
    const rows = filteredData.map(
      (row) => `<tr>${columns.map((col) => `<td>${col.render ? '' : row[col.key] ?? ''}</td>`).join('')}</tr>`
    ).join('');
    const html = `<html><head><style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px}th{background:#5f9ea0;color:#fff}</style></head><body><table><thead>${header}</thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  // ---------- RENDER ----------
  return (
    <>
      {/* === TOOLBAR: EXPORT BUTTONS + SEARCH === */}
      <div className="datatable-toolbar d-flex align-items-center justify-content-between mb-3 gap-2">
        {/* Export Button Group - Desktop */}
        <div className="d-none d-md-flex btn-group rounded-1 overflow-hidden" role="group">
          <button className="btn btn-outline-secondary btn-sm" onClick={handleCopy} title={t('common.copy')}>
            {copied
              ? <><i className="bi bi-check2"></i> {t('common.copied')}</>
              : <><i className="bi bi-clipboard"></i> {t('common.copy')}</>
            }
          </button>
          <CSVLink
            data={getCsvData()}
            filename="tablo.csv"
            className="btn btn-outline-secondary btn-sm text-decoration-none"
            title={t('common.exportCsv')}
          >
            <i className="bi bi-filetype-csv"></i> {t('common.exportCsv')}
          </CSVLink>
          <button className="btn btn-outline-secondary btn-sm" onClick={handlePDF} title={t('common.exportPdf')}>
            <i className="bi bi-file-earmark-pdf"></i> {t('common.exportPdf')}
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={handlePrint} title={t('common.print')}>
            <i className="bi bi-printer"></i> {t('common.print')}
          </button>
        </div>

        {/* Export Dropdown - Mobile */}
        <Dropdown className="d-md-none">
          <Dropdown.Toggle variant="outline-secondary" size="sm" id="export-dropdown">
            <i className="bi bi-download"></i> Export
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={handleCopy}>
              <i className="bi bi-clipboard me-2"></i>
              {copied ? t('common.copied') : t('common.copy')}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => csvRef.current?.link.click()}>
              <i className="bi bi-filetype-csv me-2"></i>
              {t('common.exportCsv')}
            </Dropdown.Item>
            <Dropdown.Item onClick={handlePDF}>
              <i className="bi bi-file-earmark-pdf me-2"></i>
              {t('common.exportPdf')}
            </Dropdown.Item>
            <Dropdown.Item onClick={handlePrint}>
              <i className="bi bi-printer me-2"></i>
              {t('common.print')}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        {/* Hidden CSV Link for mobile dropdown */}
        <CSVLink
          ref={csvRef}
          data={getCsvData()}
          filename="tablo.csv"
          className="d-none"
        />

        {/* Search */}
        <Form onSubmit={handleSearch} className="datatable-search flex-grow-1" style={{ maxWidth: '300px' }}>
          <InputGroup size="sm">
            <Form.Control
              placeholder={searchPlaceholder}
              className="border-end-0"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <button className="btn btn-outline-secondary" type="submit">
              <i className="bi bi-search"></i>
            </button>
          </InputGroup>
        </Form>
      </div>

      {/* === TABLE WITH HORIZONTAL SCROLL WRAPPER === */}
      <div className="table-responsive datatable-wrapper">
        <Table striped hover className="align-middle shadow-sm rounded overflow-hidden mb-0">
          <thead className="cell-align-middle text-center vista-table-head">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="text-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="cell-align-middle text-center">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-muted py-4">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key} className="text-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* === PAGINATION === */}
      {totalPages > 1 && (
        <Pagination className="justify-content-center mt-3 flex-wrap datatable-pagination">
          <Pagination.Prev disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
            <span className="d-none d-md-inline">{t('common.previous')}</span>
            <i className="bi bi-chevron-left d-md-none"></i>
          </Pagination.Prev>
          {[...Array(Math.min(totalPages, window.innerWidth < 768 ? 5 : 10))].map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={page === i + 1}
              onClick={() => onPageChange?.(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          {totalPages > (window.innerWidth < 768 ? 5 : 10) && (
            <Pagination.Ellipsis disabled />
          )}
          <Pagination.Next disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
            <span className="d-none d-md-inline">{t('common.next')}</span>
            <i className="bi bi-chevron-right d-md-none"></i>
          </Pagination.Next>
        </Pagination>
      )}
    </>
  );
}
