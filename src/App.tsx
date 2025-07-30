import { useState, useRef, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Save, Download, Upload } from '@phosphor-icons/react'

// Types for spreadsheet data
type CellData = {
  value: string
  formula?: string
}

type SpreadsheetData = {
  [key: string]: CellData
}

// Helper functions
const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index)
}

const getCellKey = (row: number, col: number): string => {
  return `${getColumnLabel(col)}${row + 1}`
}

const parseFormula = (formula: string, data: SpreadsheetData): number | string => {
  if (!formula.startsWith('=')) return formula
  
  const expression = formula.slice(1)
  
  // Handle SUM function
  if (expression.startsWith('SUM(') && expression.endsWith(')')) {
    const range = expression.slice(4, -1)
    // Simple range like A1:A5
    const [start, end] = range.split(':')
    if (start && end) {
      const startMatch = start.match(/([A-Z])(\d+)/)
      const endMatch = end.match(/([A-Z])(\d+)/)
      
      if (startMatch && endMatch) {
        const startCol = startMatch[1].charCodeAt(0) - 65
        const startRow = parseInt(startMatch[2]) - 1
        const endCol = endMatch[1].charCodeAt(0) - 65
        const endRow = parseInt(endMatch[2]) - 1
        
        let sum = 0
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const cellKey = getCellKey(row, col)
            const cellValue = data[cellKey]?.value || '0'
            const num = parseFloat(cellValue)
            if (!isNaN(num)) sum += num
          }
        }
        return sum
      }
    }
  }
  
  // Replace cell references with values
  let evaluatable = expression.replace(/[A-Z]\d+/g, (match) => {
    const cellValue = data[match]?.value || '0'
    const num = parseFloat(cellValue)
    return isNaN(num) ? '0' : num.toString()
  })
  
  try {
    // Simple math evaluation (basic operations only)
    if (/^[\d+\-*/.() ]+$/.test(evaluatable)) {
      return eval(evaluatable)
    }
  } catch (e) {
    return '#ERROR'
  }
  
  return formula
}

function App() {
  const [spreadsheetData, setSpreadsheetData] = useKV<SpreadsheetData>('book44-data', {})
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
  const [formulaBarValue, setFormulaBarValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const rows = 20
  const cols = 10
  
  useEffect(() => {
    if (selectedCell) {
      const cellKey = getCellKey(selectedCell.row, selectedCell.col)
      const cellData = spreadsheetData[cellKey]
      setFormulaBarValue(cellData?.formula || cellData?.value || '')
    }
  }, [selectedCell, spreadsheetData])
  
  const handleCellClick = (row: number, col: number) => {
    if (editingCell) {
      handleCellSave()
    }
    setSelectedCell({row, col})
    setEditingCell(null)
  }
  
  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({row, col})
    setSelectedCell({row, col})
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  
  const handleCellSave = () => {
    if (!editingCell) return
    
    const cellKey = getCellKey(editingCell.row, editingCell.col)
    const newValue = formulaBarValue
    
    setSpreadsheetData(current => ({
      ...current,
      [cellKey]: {
        value: newValue.startsWith('=') ? parseFormula(newValue, current).toString() : newValue,
        formula: newValue.startsWith('=') ? newValue : undefined
      }
    }))
    
    setEditingCell(null)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return
    
    if (e.key === 'Enter') {
      if (editingCell) {
        handleCellSave()
      } else {
        // Move down
        setSelectedCell({
          row: Math.min(selectedCell.row + 1, rows - 1),
          col: selectedCell.col
        })
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (editingCell) {
        handleCellSave()
      }
      // Move right
      setSelectedCell({
        row: selectedCell.row,
        col: Math.min(selectedCell.col + 1, cols - 1)
      })
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      if (selectedCell) {
        const cellKey = getCellKey(selectedCell.row, selectedCell.col)
        const cellData = spreadsheetData[cellKey]
        setFormulaBarValue(cellData?.formula || cellData?.value || '')
      }
    } else if (!editingCell && e.key.length === 1) {
      // Start editing if typing
      setEditingCell(selectedCell)
      setFormulaBarValue(e.key)
    }
  }
  
  const getCellValue = (row: number, col: number): string => {
    const cellKey = getCellKey(row, col)
    const cellData = spreadsheetData[cellKey]
    return cellData?.value || ''
  }
  
  const clearSheet = () => {
    setSpreadsheetData({})
    setSelectedCell(null)
    setEditingCell(null)
    setFormulaBarValue('')
  }

  return (
    <div className="h-screen flex flex-col bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Header */}
      <div className="border-b bg-card p-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">Book44</h1>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={clearSheet}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="border-b bg-muted/30 p-2">
        <div className="flex items-center gap-2">
          <div className="w-16 text-sm font-medium text-muted-foreground">
            {selectedCell ? getCellKey(selectedCell.row, selectedCell.col) : ''}
          </div>
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={formulaBarValue}
              onChange={(e) => setFormulaBarValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellSave()
                }
              }}
              placeholder="Enter value or formula (=SUM(A1:A5))"
              className="bg-background"
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="inline-block min-w-full">
            {/* Column Headers */}
            <div className="flex">
              <div className="w-12 h-8 bg-muted border border-border flex items-center justify-center text-xs font-medium">
                
              </div>
              {Array.from({length: cols}, (_, colIndex) => (
                <div key={colIndex} className="w-24 h-8 bg-muted border border-border flex items-center justify-center text-xs font-medium">
                  {getColumnLabel(colIndex)}
                </div>
              ))}
            </div>
            
            {/* Rows */}
            {Array.from({length: rows}, (_, rowIndex) => (
              <div key={rowIndex} className="flex">
                {/* Row Header */}
                <div className="w-12 h-8 bg-muted border border-border flex items-center justify-center text-xs font-medium">
                  {rowIndex + 1}
                </div>
                
                {/* Cells */}
                {Array.from({length: cols}, (_, colIndex) => {
                  const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
                  
                  return (
                    <div
                      key={colIndex}
                      className={`w-24 h-8 border border-border flex items-center px-1 text-xs cursor-cell ${
                        isSelected ? 'bg-primary text-primary-foreground border-primary' : 
                        'bg-background hover:bg-accent'
                      }`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={formulaBarValue}
                          onChange={(e) => setFormulaBarValue(e.target.value)}
                          onBlur={handleCellSave}
                          className="w-full h-full bg-transparent outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate w-full">
                          {getCellValue(rowIndex, colIndex)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Status Bar */}
      <div className="border-t bg-muted/30 p-1 px-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {selectedCell ? `Selected: ${getCellKey(selectedCell.row, selectedCell.col)}` : 'Ready'}
          </div>
          <div>Book44 Spreadsheet</div>
        </div>
      </div>
    </div>
  )
}

export default App