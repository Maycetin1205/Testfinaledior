// What a block built on the list takes of it, as the table and the capture
// are: the list itself, its declaration and look, the rows handed to it, and
// what a block adds to its rows. Cells, columns and the search are parts
// (blocks/parts).
export { RecordList } from './recordList'
export { LIST_GRID, listCapabilities, listProperties } from './listDeclaration'
export { tableStyle } from './tableStyle'
export { hasRecordNumber, rowsIndexOf, type HandedRow, type RowsFrom } from './sourceRows'
export { WITHOUT_DECORATION, type RowDecoration, type RowsBelow } from './tableBody'
