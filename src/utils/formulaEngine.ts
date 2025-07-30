export interface FormulaContext {
  getCellValue: (cellRef: string) => string;
  setCellValue: (cellRef: string, value: string) => void;
}

export function evaluateFormula(formula: string, context: FormulaContext): string {
  if (!formula.startsWith('=')) {
    return formula;
  }

  const expression = formula.slice(1); // Remove the = sign
  
  try {
    // Handle built-in functions
    if (expression.includes('SUM(')) {
      return handleSumFunction(expression, context);
    }
    
    if (expression.includes('AVERAGE(')) {
      return handleAverageFunction(expression, context);
    }
    
    if (expression.includes('COUNT(')) {
      return handleCountFunction(expression, context);
    }
    
    if (expression.includes('MAX(')) {
      return handleMaxFunction(expression, context);
    }
    
    if (expression.includes('MIN(')) {
      return handleMinFunction(expression, context);
    }
    
    // Replace cell references with their values
    const evaluatable = expression.replace(/[A-Z]+\d+/g, (cellRef) => {
      const value = context.getCellValue(cellRef);
      const num = parseFloat(value);
      return isNaN(num) ? '0' : num.toString();
    });
    
    // Basic arithmetic evaluation (safe subset only)
    if (/^[\d+\-*/.() ]+$/.test(evaluatable)) {
      // Using Function constructor instead of eval for safer evaluation
      const result = new Function(`return ${evaluatable}`)();
      return typeof result === 'number' ? result.toString() : '#ERROR';
    }
    
    return '#ERROR';
  } catch (error) {
    return '#ERROR';
  }
}

function handleSumFunction(expression: string, context: FormulaContext): string {
  const match = expression.match(/SUM\(([^)]+)\)/);
  if (!match) return '#ERROR';
  
  const range = match[1];
  const values = getRangeValues(range, context);
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum.toString();
}

function handleAverageFunction(expression: string, context: FormulaContext): string {
  const match = expression.match(/AVERAGE\(([^)]+)\)/);
  if (!match) return '#ERROR';
  
  const range = match[1];
  const values = getRangeValues(range, context);
  if (values.length === 0) return '#DIV/0!';
  
  const average = values.reduce((acc, val) => acc + val, 0) / values.length;
  return average.toString();
}

function handleCountFunction(expression: string, context: FormulaContext): string {
  const match = expression.match(/COUNT\(([^)]+)\)/);
  if (!match) return '#ERROR';
  
  const range = match[1];
  const values = getRangeValues(range, context);
  return values.length.toString();
}

function handleMaxFunction(expression: string, context: FormulaContext): string {
  const match = expression.match(/MAX\(([^)]+)\)/);
  if (!match) return '#ERROR';
  
  const range = match[1];
  const values = getRangeValues(range, context);
  if (values.length === 0) return '#ERROR';
  
  const max = Math.max(...values);
  return max.toString();
}

function handleMinFunction(expression: string, context: FormulaContext): string {
  const match = expression.match(/MIN\(([^)]+)\)/);
  if (!match) return '#ERROR';
  
  const range = match[1];
  const values = getRangeValues(range, context);
  if (values.length === 0) return '#ERROR';
  
  const min = Math.min(...values);
  return min.toString();
}

function getRangeValues(range: string, context: FormulaContext): number[] {
  const values: number[] = [];
  
  // Handle single cell
  if (/^[A-Z]+\d+$/.test(range)) {
    const value = context.getCellValue(range);
    const num = parseFloat(value);
    if (!isNaN(num)) values.push(num);
    return values;
  }
  
  // Handle range like A1:B5
  const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (rangeMatch) {
    const [, startCol, startRow, endCol, endRow] = rangeMatch;
    const startColIndex = columnToIndex(startCol);
    const endColIndex = columnToIndex(endCol);
    const startRowNum = parseInt(startRow);
    const endRowNum = parseInt(endRow);
    
    for (let row = startRowNum; row <= endRowNum; row++) {
      for (let col = startColIndex; col <= endColIndex; col++) {
        const cellRef = indexToColumn(col) + row;
        const value = context.getCellValue(cellRef);
        const num = parseFloat(value);
        if (!isNaN(num)) values.push(num);
      }
    }
  }
  
  return values;
}

function columnToIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 65 + 1);
  }
  return result - 1;
}

function indexToColumn(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}