// ============================================================================
// === IMPORTS ===
// ============================================================================
import { Table, Pagination, Form, InputGroup } from 'react-bootstrap';
import { useState } from 'react';
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
  const totalPages = Math.ceil(Math.max(totalCount, data.length) / size);

  // ---------- HANDLERS ----------
  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(searchTerm);
  };

  // ---------- RENDER ----------
  return (
    <>
      {/* === SEARCH FORM === */}
      {onSearch && (
        <Form onSubmit={handleSearch} className="mb-3">
          <InputGroup>
            <Form.Control
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-outline-primary" type="submit">
              <i className="bi bi-search"></i> {t('common.search')}
            </button>
          </InputGroup>
        </Form>
      )}

      {/* === TABLE === */}
      <Table striped hover responsive className=" align-middle shadow-sm rounded overflow-hidden">
        <thead className="table-dark cell-align-middle text-center">
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="table-light cell-align-middle text-center ">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted py-4">
                {t('common.noData')}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* === PAGINATION === */}
      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>{t('common.previous')}</Pagination.Prev>
          {[...Array(Math.min(totalPages, 10))].map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={page === i + 1}
              onClick={() => onPageChange?.(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>{t('common.next')}</Pagination.Next>
        </Pagination>
      )}
    </>
  );
}
