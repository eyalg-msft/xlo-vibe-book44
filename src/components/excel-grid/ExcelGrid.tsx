import { useState, useRef, useEffect, useCallback } from "react";
import { CellData, Selection } from "@/types/cellTypes";

interface FormulaReference {

  range: string;
  color: string;
}

interface ExcelGridProps {
  onCellSelect: (cellRef: string, value: string) => void;
  cellData: Record<string, CellData>;
  onCellUpdate: (cellRef: string, data: CellData) => void;
  isFormulaBuildingMode?: boolean;
  formulaReferences?: FormulaReference[];
  rangeSelectionStart?: string | null;
  onCellClickInFormulaMode?: (cellRef: string, isRangeSelection?: boolean) => void;
  onSelectionChange?: (selection: Selection) => void;
}

const GRID_ROWS = 100;
const GRID_COLS = 39; // Extended to AM (A=1, B=2, ..., Z=26, AA=27, AB=28, ..., AM=39)

const getColumnName = (index: number): string => {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
};

const parseSelection = (selection: Selection): string => {
  const startRef = getCellRef(selection.start.row, selection.start.col);
  if (selection.start.row === selection.end.row && selection.start.col === selection.end.col) {
    return startRef;
  }
  const endRef = getCellRef(selection.end.row, selection.end.col);
  return `${startRef}:${endRef}`;
};

export const ExcelGrid = ({ 
  onCellSelect, 
  cellData, 
  onCellUpdate,
  isFormulaBuildingMode = false,
  formulaReferences = [],
  rangeSelectionStart = null,
  onCellClickInFormulaMode,
  onSelectionChange
}: ExcelGridProps) => {
  const [selection, setSelection] = useState<Selection>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 }
  });
  
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const gridRef = useRef<HTMLDivElement>(null);

  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const cellRef = getCellRef(row, col);
    const cellInfo = cellData[cellRef] || { value: "" };
    
    setEditingCell({ row, col });
    setEditValue(cellInfo.formula || cellInfo.value);
  }, [cellData]);

  const finishEditing = useCallback(() => {
    if (!editingCell) return;
    
    const cellRef = getCellRef(editingCell.row, editingCell.col);
    const isFormula = editValue.startsWith('=');
    
    let displayValue = editValue;
    if (isFormula) {
      // Basic formula evaluation - in a real app this would be more sophisticated
      try {
        // For now, just store the formula and display it as is
        displayValue = editValue;
      } catch (error) {
        displayValue = '#ERROR!';
      }
    }

    onCellUpdate(cellRef, {
      value: displayValue,
      formula: isFormula ? editValue : undefined
    });

    setEditingCell(null);
  }, [editingCell, editValue, onCellUpdate]);

  const handleCellSelect = useCallback((row: number, col: number, extendSelection = false) => {
    const cellRef = getCellRef(row, col);
    const cellInfo = cellData[cellRef] || { value: "" };
    
    if (isFormulaBuildingMode && onCellClickInFormulaMode) {
      onCellClickInFormulaMode(cellRef, extendSelection);
      return;
    }

    let newSelection: Selection;
    if (extendSelection) {
      newSelection = {
        start: selection.start,
        end: { row, col }
      };
    } else {
      newSelection = {
        start: { row, col },
        end: { row, col }
      };
    }

    setSelection(newSelection);
    onSelectionChange?.(newSelection);
    onCellSelect(cellRef, cellInfo.formula || cellInfo.value);
  }, [cellData, isFormulaBuildingMode, onCellClickInFormulaMode, onCellSelect, onSelectionChange, selection.start]);

  const handleMouseDown = useCallback((row: number, col: number) => {
    setIsDragging(true);
    handleCellSelect(row, col, false);
  }, [handleCellSelect]);

  const handleMouseOver = useCallback((row: number, col: number) => {
    if (isDragging) {
      handleCellSelect(row, col, true);
    }
  }, [isDragging, handleCellSelect]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editingCell) {
        if (event.key === 'Enter' || event.key === 'Tab') {
          finishEditing();
          // Move to next cell
          const nextRow = event.key === 'Enter' ? editingCell.row + 1 : editingCell.row;
          const nextCol = event.key === 'Tab' ? editingCell.col + 1 : editingCell.col;
          
          if (nextRow < GRID_ROWS && nextCol < GRID_COLS) {
            handleCellSelect(nextRow, nextCol);
          }
          setEditingCell(null);
        } else if (event.key === 'Escape') {
          setEditingCell(null);
        }
        return;
      }

      if (event.key === 'Enter' || event.key === 'F2') {
        const { row, col } = selection.start;
        handleCellDoubleClick(row, col);
        return;
      }

      const currentRow = selection.start.row;
      const currentCol = selection.start.col;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (currentRow > 0) {
            handleCellSelect(currentRow - 1, currentCol, event.shiftKey);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (currentRow < GRID_ROWS - 1) {
            handleCellSelect(currentRow + 1, currentCol, event.shiftKey);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (currentCol > 0) {
            handleCellSelect(currentRow, currentCol - 1, event.shiftKey);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentCol < GRID_COLS - 1) {
            handleCellSelect(currentRow, currentCol + 1, event.shiftKey);
          }
          break;
        case 'Delete':
        case 'Backspace':
          // Clear selected cells
          const cellsToUpdate: string[] = [];
          const { start, end } = selection;
          
          const minRow = Math.min(start.row, end.row);
          const maxRow = Math.max(start.row, end.row);
          const minCol = Math.min(start.col, end.col);
          const maxCol = Math.max(start.col, end.col);
          
          for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
              cellsToUpdate.push(getCellRef(row, col));
            }
          }

          cellsToUpdate.forEach(cellRef => {
            onCellUpdate(cellRef, { value: "" });
          });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editingCell, selection, finishEditing, handleCellDoubleClick, handleCellSelect, handleMouseUp, onCellUpdate]);

  const isInSelection = useCallback((row: number, col: number): boolean => {
    const { start, end } = selection;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selection]);

  const isInFormulaReference = useCallback((cellRef: string): FormulaReference | null => {
    for (const ref of formulaReferences) {
      if (ref.range.includes(':')) {
        const [start, end] = ref.range.split(':');
        // This is a simplified check - in a real app you'd properly parse ranges
        if (cellRef === start || cellRef === end) {
          return ref;
        }
      } else {
        if (cellRef === ref.range) {
          return ref;
        }
      }
    }
    return null;
  }, [formulaReferences]);

  // Get range borders for selection
  const getRangeBorders = useCallback((row: number, col: number): string => {
    if (!isInSelection(row, col)) return '';
    
    const { start, end } = selection;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const borders: string[] = [];
    
    if (row === minRow) borders.push('border-t-2');
    if (row === maxRow) borders.push('border-b-2');
    if (col === minCol) borders.push('border-l-2');
    if (col === maxCol) borders.push('border-r-2');
    
    return borders.join(' ') + (borders.length > 0 ? ' border-[#127d42]' : '');
  }, [selection, isInSelection]);

  return (
    <div
      ref={gridRef}
      className="flex-1 overflow-auto bg-white border-l border-gray-200"
      style={{ maxHeight: 'calc(100vh - 250px)' }}
    >
      <div className="grid-container">
        {/* Column headers */}
        <div className="flex sticky top-0 z-20 bg-gray-100 border-b border-gray-300">
          <div className="w-12 h-6 bg-gray-200 border-r border-gray-300 flex items-center justify-center text-xs font-medium">
            {/* Corner cell */}
          </div>
          {Array.from({ length: GRID_COLS }, (_, colIndex) => (
            <div
              key={colIndex}
              className="w-20 h-6 bg-gray-100 border-r border-gray-300 flex items-center justify-center text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              {getColumnName(colIndex)}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
          <div key={rowIndex} className="flex">
            {/* Row header */}
            <div className="w-12 h-6 bg-gray-100 border-r border-b border-gray-300 flex items-center justify-center text-xs font-medium text-gray-700 hover:bg-gray-200 sticky left-0 z-10">
              {rowIndex + 1}
            </div>

            {/* Row cells */}
            {Array.from({ length: GRID_COLS }, (_, colIndex) => {
              const cellRef = getCellRef(rowIndex, colIndex);
              const cellInfo = cellData[cellRef] || { value: "" };
              const isSelected = isInSelection(rowIndex, colIndex);
              const isActiveCell = selection.start.row === rowIndex && selection.start.col === colIndex;
              const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
              const rangeBorders = getRangeBorders(rowIndex, colIndex);
              
              // Check if cell is in formula reference
              const formulaRef = isInFormulaReference(cellRef);
              const isRangeStart = rangeSelectionStart === cellRef;
              
              // Get cell formatting styles
              const cellStyles = getCellStyle(cellInfo);
              
              // Determine background color and styles
              let cellStyle: React.CSSProperties = { ...cellStyles };
              let bgColor = '';
              let borderStyle = '';

              if (isSelected) {
                // Make selected cells transparent with selection border
                cellStyle.backgroundColor = 'transparent';
                bgColor = isActiveCell ? 'bg-white' : 'bg-blue-50/50';
                
                if (isActiveCell) {
                  // Active cell gets a thick green border
                  borderStyle = 'border-2 border-[#127d42]';
                } else {
                  // Other selected cells get a thin green border
                  borderStyle = rangeBorders;
                }
              }

              if (formulaRef) {
                // Override with formula reference styling
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: `rgba(${parseInt(formulaRef.color.slice(1, 3), 16)}, ${parseInt(formulaRef.color.slice(3, 5), 16)}, ${parseInt(formulaRef.color.slice(5, 7), 16)}, 0.3)`,
                  borderColor: formulaRef.color,
                  borderWidth: '2px',
                  borderStyle: 'solid'
                };
              } else if (isRangeStart) {
                bgColor = 'bg-blue-100';
              }

              return (
                <div
                  key={colIndex}
                  className={`w-20 h-6 border-r border-b border-gray-300 relative cursor-cell ${bgColor} ${borderStyle} ${isActiveCell ? 'z-10' : ''}`}
                  style={cellStyle}
                  onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                  onMouseOver={() => handleMouseOver(rowIndex, colIndex)}
                  onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEditing}
                      autoFocus
                      className="w-full h-full px-1 text-xs border-none outline-none bg-transparent"
                      style={{
                        textAlign: cellStyle.textAlign as any || 'left',
                        fontFamily: cellStyle.fontFamily,
                        fontSize: cellStyle.fontSize
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full px-1 text-xs flex items-center overflow-hidden"
                      style={{ 
                        textAlign: cellStyle.textAlign as any || 'left',
                        color: cellStyle.color,
                        fontFamily: cellStyle.fontFamily,
                        fontSize: cellStyle.fontSize,
                        fontWeight: cellStyle.fontWeight,
                        fontStyle: cellStyle.fontStyle,
                        textDecoration: cellStyle.textDecoration
                      }}
                    >
                      {formatCellValue(cellInfo)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};