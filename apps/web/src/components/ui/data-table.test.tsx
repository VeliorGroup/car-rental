import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from './data-table'

interface TestItem {
  id: string
  name: string
  age: number
}

const testColumns = [
  { key: 'name' as const, header: 'Name', sortable: true },
  { key: 'age' as const, header: 'Age', sortable: true },
]

const testData: TestItem[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
]

describe('DataTable', () => {
  it('renders with data', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
      />
    )

    // Check column headers
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()

    // Check all data rows are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('sorts data ascending then descending on column header click', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
      />
    )

    // Click "Age" header to sort ascending
    fireEvent.click(screen.getByText('Age'))

    let rows = screen.getAllByRole('row')
    // rows[0] is the header row, rows[1..3] are data rows
    expect(rows[1]).toHaveTextContent('Bob')
    expect(rows[1]).toHaveTextContent('25')
    expect(rows[2]).toHaveTextContent('Alice')
    expect(rows[2]).toHaveTextContent('30')
    expect(rows[3]).toHaveTextContent('Charlie')
    expect(rows[3]).toHaveTextContent('35')

    // Click again to sort descending
    fireEvent.click(screen.getByText('Age'))

    rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Charlie')
    expect(rows[1]).toHaveTextContent('35')
    expect(rows[2]).toHaveTextContent('Alice')
    expect(rows[2]).toHaveTextContent('30')
    expect(rows[3]).toHaveTextContent('Bob')
    expect(rows[3]).toHaveTextContent('25')
  })

  it('shows empty state when data is empty', () => {
    render(
      <DataTable
        data={[]}
        columns={testColumns}
        keyExtractor={(item: TestItem) => item.id}
      />
    )

    expect(screen.getByText('No data available')).toBeInTheDocument()
    // Should not render a table when empty
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows custom empty message', () => {
    render(
      <DataTable
        data={[]}
        columns={testColumns}
        keyExtractor={(item: TestItem) => item.id}
        emptyMessage="Nothing to display"
      />
    )

    expect(screen.getByText('Nothing to display')).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', () => {
    const handleRowClick = jest.fn()

    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        onRowClick={handleRowClick}
      />
    )

    // Click the first data row
    fireEvent.click(screen.getByText('Alice'))

    expect(handleRowClick).toHaveBeenCalledTimes(1)
    expect(handleRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', name: 'Alice', age: 30 })
    )
  })
})
