import { useState, useRef, useEffect, useCallback } from "react";
import { CellData, Selection } from "@/types/cellTypes";
import { CellData, Selection } from "@/types/cellTypes";
import { getCellStyle, formatCellValue } from "@/utils/cellFormatting";


  onCellSelec
  onCellUpdate: 
  formulaReferen
 

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


const GRID_COLS = 39; // Extended to AM (A=1, B=2, ..., Z=26, AA=27, AB=28, ..., AM=39)

const getColumnName = (index: number): string => {
  const startRef =
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
};
  return result;
  

const getCellRef = (row: number, col: number): string => {
  return `${getColumnName(col)}${row + 1}`;
  

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
      start: { row, col
  const [selection, setSelection] = useState<Selection>({

    end: { row: 0, col: 0 }
  });
  
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const handleCellDoubleClick = useCallback((row: numb
    
  
    setEditingCell({ row, col });
  const gridRef = useRef<HTMLDivElement>(null);

    }, 0);

  const finishEditing = useCallback(() =>
    
    
    let displayValue = editValue;
    if (isFormula) {
      const f
    }

          // For now, just implement the getter
      };
      try {
      } c
      }
    
      

    setEditingCell(null);
  }, [editingCell, editValue, cellData
  //
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
          finishEditing();
          // Move to next cell

          if (nextRow < GRID_ROWS && n
          }
          setEditingCell(nu
    
    if (editingCell) {
      finishEditing();
    }

          event.preventDefault();
            handleCellSelect(current
          break;
    
            handleCellSelect(currentRow + 1, cur
          break;

            handleCellSelect(currentRow, currentCol - 1, event.shiftK
          break;
          event.preventDefault();
            handleCellSel
        end: { row, col }
        
          break;
          event.preventDefault();
    }
        case 'Backspace':

          cellsToUpdate.forEach(cellRef => 
          });
      }


    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
  }, [editingCell, selection, finishEd
  //
    const cellRef = getCellRef(row, col);
    const cellInfo = cellData[cellRef] || { value: "" };
    
    setEditingCell({ row, col });
    setEditValue(cellInfo.formula || cellInfo.value);
    
    return cells;

  const isInSelection = useCallb
    const 
    const endCol = Math.max(selection.st


  const isInFormulaReference = useCallback(
      if (ref.range.includes(
    
        if (cellRef === start || cellRef === end) {
        }
    
    }
  },
  // Get range borde
    const startRow = Math.min(selection.start.
    const startCol = Math.min(selection.start.
    
    
    
    if (ro
    if (col === endCol) borders.push('border-r-2');
    return borders.join(' ') + (borders.length 

    <div
      
        {Ar
        displayValue = evaluateFormula(editValue, formulaContext);
          >
          </div>
      }
    }
    
        style={{ maxHeight:
        {Array.from({ leng
            {/* Row header */}
       
    
            {Array.from({
              const c
              const isActiveCell = selection.start.row 

              // Check if c
              const
              // Get cell formatting styles
              const form
              // Determine background color and styles
              let borderStyle = '
              
          
                if (isActiveCe
                  borderStyle = 'border-2 border-[#127d42]';
                  // Other selected cells get a thin green border
          
                // Override with formula reference styling
                  ...cellStyle,
           
                  borderStyle: 'solid'
              } else if (isRang
              }
         
               
      }

                >
                    <input
                      type="text"
      
                      clas
                    />
                    <div 
                      style={{ 
                        textAlign: cellStyle.textAlign as any || 'left',
           
                
                    </div
                </div>
            })}
        ))}
    </div>
};





















































    }























        }



    }






















  return (




















        {Array.from({ length: GRID_ROWS }, (_, rowIndex) => (
          <div key={rowIndex} className="flex">


              {rowIndex + 1}
            </div>


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
              let borderStyle = '';


              if (isSelected) {
                // Make selected cells transparent with selection border


                  // Active cell gets a thick green border
                  borderStyle = 'border-2 border-[#127d42]';

                  // Other selected cells get a thin green border



                // Override with formula reference styling
                cellStyle = {

                  backgroundColor: `rgba(${parseInt(formulaRef.color.slice(1, 3), 16)}, ${parseInt(formulaRef.color.slice(3, 5), 16)}, ${parseInt(formulaRef.color.slice(5, 7), 16)}, 0.3)`,



                };
              } else if (isRangeStart) {
                bgColor = 'bg-blue-100';








                  onMouseOver={() => handleMouseOver(rowIndex, colIndex)}
                  onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}

                  {isEditing ? (




                      onChange={(e) => setEditValue(e.target.value)}












                      }}











  );
};