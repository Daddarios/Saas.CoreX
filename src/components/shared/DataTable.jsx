import { Table, Pagination, Form, InputGroup } from 'react-bootstrap';
import { useState } from 'react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const totalPages = Math.ceil(Math.max(totalCount, data.length) / size);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(searchTerm);
  };

  return (
    <>
      {onSearch && (
        <Form onSubmit={handleSearch} className="mb-3">
          <InputGroup>
            <Form.Control
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-outline-primary" type="submit">
              <i className="bi bi-search"></i> Suchen
            </button>
          </InputGroup>
        </Form>
      )}

      <Table striped hover responsive className="align-middle shadow-sm rounded overflow-hidden">
        <thead className="table-dark">
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted py-4">
                Keine Daten vorhanden
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

      {totalPages > 1 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} />
          {[...Array(Math.min(totalPages, 10))].map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={page === i + 1}
              onClick={() => onPageChange?.(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)} />
        </Pagination>
      )}
    </>
  );
}
