import { useState, useRef, useEffect, useCallback } from "react";
import { evaluateFormula, FormulaContext } from "@/utils/formulaEngine";
import { CellData, Selection } from "@/types/cellTypes";
import { getCellStyle, formatCellValue } from "@/utils/cellFormatting";

interface FormulaReference {
  id: string;
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

const getCellRef = (row: number, col: number): string => {
  return `${getColumnName(col)}${row + 1}`;
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
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Handle cell selection
  const handleCellSelect = useCallback((row: number, col: number, extendSelection = false) => {
    const cellRef = getCellRef(row, col);
    const cellInfo = cellData[cellRef] || { value: "" };
    
    if (isFormulaBuildingMode && onCellClickInFormulaMode) {
      onCellClickInFormulaMode(cellRef, extendSelection);
      return;
    }

    const newSelection: Selection = extendSelection && selection ? {
      start: selection.start,
      end: { row, col }
    } : {
      start: { row, col },
      end: { row, col }
    };

    setSelection(newSelection);
    onSelectionChange?.(newSelection);
    
    // Show formula in formula bar if cell has formula, otherwise show value
    const displayValue = cellInfo.formula || cellInfo.value;
    onCellSelect(cellRef, displayValue);
  }, [cellData, selection, isFormulaBuildingMode, onCellClickInFormulaMode, onCellSelect, onSelectionChange]);

  // Handle mouse events for selection
  const handleMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (editingCell) {
      finishEditing();
    }

    const extendSelection = event.shiftKey;
    setIsDragging(!extendSelection);
    setDragStart({ row, col });
    
    handleCellSelect(row, col, extendSelection);
  }, [editingCell, handleCellSelect]);

  const handleMouseOver = useCallback((row: number, col: number) => {
    if (isDragging && dragStart) {
      const newSelection: Selection = {
        start: dragStart,
        end: { row, col }
      };
      setSelection(newSelection);
      onSelectionChange?.(newSelection);
    }
  }, [isDragging, dragStart, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Handle double click for editing
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    if (isFormulaBuildingMode) return;
    
    const cellRef = getCellRef(row, col);
    const cellInfo = cellData[cellRef] || { value: "" };
    
    setEditingCell({ row, col });
    setEditValue(cellInfo.formula || cellInfo.value);
    
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [cellData, isFormulaBuildingMode]);

  // Finish editing
  const finishEditing = useCallback(() => {
    if (!editingCell) return;
    
    const cellRef = getCellRef(editingCell.row, editingCell.col);
    const isFormula = editValue.startsWith('=');
    
    let displayValue = editValue;
    
    if (isFormula) {
      // Create formula context for evaluation
      const formulaContext: FormulaContext = {
        getCellValue: (ref: string) => {
          const cellInfo = cellData[ref];
          return cellInfo ? cellInfo.value : '';
        },
        setCellValue: (ref: string, value: string) => {
          // For now, just implement the getter
        }
      };
      
      try {
        displayValue = evaluateFormula(editValue, formulaContext);
      } catch (error) {
        displayValue = '#ERROR!';
      }
    }
    
    onCellUpdate(cellRef, {
      value: displayValue,
      formula: isFormula ? editValue : undefined
    });
    
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, cellData, onCellUpdate]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editingCell) {
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          finishEditing();
          
          // Move to next cell
          const nextRow = event.key === 'Enter' ? editingCell.row + 1 : editingCell.row;
          const nextCol = event.key === 'Tab' ? editingCell.col + 1 : editingCell.col;
          
          if (nextRow < GRID_ROWS && nextCol < GRID_COLS) {
            handleCellSelect(nextRow, nextCol);
          }
        } else if (event.key === 'Escape') {
          setEditingCell(null);
          setEditValue("");
        }
        return;
      }

      // Non-editing mode keyboard shortcuts
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
        case 'Enter':
          event.preventDefault();
          handleCellDoubleClick(currentRow, currentCol);
          break;
        case 'F2':
          event.preventDefault();
          handleCellDoubleClick(currentRow, currentCol);
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          // Clear selected cells
          const cellsToUpdate = getSelectedCells();
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
  }, [editingCell, selection, finishEditing, handleCellSelect, handleCellDoubleClick, onCellUpdate, handleMouseUp]);

  // Get selected cell references
  const getSelectedCells = useCallback((): string[] => {
    const cells: string[] = [];
    const startRow = Math.min(selection.start.row, selection.end.row);
    const endRow = Math.max(selection.start.row, selection.end.row);
    const startCol = Math.min(selection.start.col, selection.end.col);
    const endCol = Math.max(selection.start.col, selection.end.col);
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        cells.push(getCellRef(row, col));
      }
    }
    
    return cells;
  }, [selection]);

  // Check if a cell is selected
  const isInSelection = useCallback((row: number, col: number): boolean => {
    const startRow = Math.min(selection.start.row, selection.end.row);
    const endRow = Math.max(selection.start.row, selection.end.row);
    const startCol = Math.min(selection.start.col, selection.end.col);
    const endCol = Math.max(selection.start.col, selection.end.col);
    
    return row >= startRow && row <= endRow && col >= startCol && col <= endCol;
  }, [selection]);

  // Check if cell is in formula reference
  const isInFormulaReference = useCallback((cellRef: string): FormulaReference | null => {
    for (const ref of formulaReferences) {
      if (ref.range.includes(':')) {
        // Range reference
        const [start, end] = ref.range.split(':');
        // For simplicity, we'll just check if cellRef is the start or end
        if (cellRef === start || cellRef === end) {
          return ref;
        }
      } else if (ref.range === cellRef) {
        return ref;
      }
    }
    return null;
  }, [formulaReferences]);

  // Get range borders for visual indication
  const getRangeBorders = useCallback((row: number, col: number): string => {
    const startRow = Math.min(selection.start.row, selection.end.row);
    const endRow = Math.max(selection.start.row, selection.end.row);
    const startCol = Math.min(selection.start.col, selection.end.col);
    const endCol = Math.max(selection.start.col, selection.end.col);
    
    if (!isInSelection(row, col)) return '';
    
    let borders = [];
    
    if (row === startRow) borders.push('border-t-2');
    if (row === endRow) borders.push('border-b-2');
    if (col === startCol) borders.push('border-l-2');
    if (col === endCol) borders.push('border-r-2');
    
    return borders.join(' ') + (borders.length > 0 ? ' border-blue-500' : '');
  }, [selection, isInSelection]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Column headers */}
      <div className="flex sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
        <div className="w-12 h-6 border-r border-gray-300 bg-gray-200"></div>
        {Array.from({ length: GRID_COLS }, (_, colIndex) => (
          <div
            key={colIndex}
            className="w-20 h-6 border-r border-gray-300 bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600"
          >
            {getColumnName(colIndex)}
          </div>
        ))}
      </div>

      {/* Grid content */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-auto"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
          <div key={rowIndex} className="flex">
            {/* Row header */}
            <div className="w-12 h-6 border-r border-b border-gray-300 bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 sticky left-0 z-10">
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
              const formattedValue = formatCellValue(cellInfo);
              
              // Determine background color and styles
              let cellStyle: React.CSSProperties = { ...cellStyles };
              let borderStyle = '';
              let bgColor = 'bg-white';
              
              if (isSelected) {
                // Make selected cells transparent with selection border
                bgColor = 'bg-transparent';
                if (isActiveCell) {
                  // Active cell gets a thick green border
                  borderStyle = 'border-2 border-[#127d42]';
                } else {
                  // Other selected cells get a thin green border
                  borderStyle = 'border border-[#127d42]';
                }
              } else if (formulaRef) {
                // Override with formula reference styling
                cellStyle = {
                  ...cellStyle,
                  backgroundColor: `rgba(${parseInt(formulaRef.color.slice(1, 3), 16)}, ${parseInt(formulaRef.color.slice(3, 5), 16)}, ${parseInt(formulaRef.color.slice(5, 7), 16)}, 0.3)`,
                  borderWidth: '2px',
                  borderColor: formulaRef.color,
                  borderStyle: 'solid'
                };
              } else if (isRangeStart) {
                bgColor = 'bg-blue-100';
              }

              return (
                <div
                  key={colIndex}
                  className={`w-20 h-6 border-r border-b border-gray-300 relative cursor-cell ${bgColor} ${borderStyle} ${rangeBorders}`}
                  style={cellStyle}
                  onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, e)}
                  onMouseOver={() => handleMouseOver(rowIndex, colIndex)}
                  onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEditing}
                      className="w-full h-full px-1 border-none outline-none bg-white text-xs"
                      style={{ fontSize: cellStyle.fontSize || '11px' }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full px-1 flex items-center text-xs overflow-hidden"
                      style={{ 
                        fontSize: cellStyle.fontSize || '11px',
                        textAlign: cellStyle.textAlign as any || 'left',
                        justifyContent: cellStyle.textAlign === 'center' ? 'center' : 
                                      cellStyle.textAlign === 'right' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {formattedValue}
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