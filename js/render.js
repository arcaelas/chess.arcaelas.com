// UI rendering for the chessboard
// Handles only visual representation and selection, no game logic

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function algebraic(row, col) {
    return `${files[col]}${8 - row}`;
}

export function createBoard(container, game, onMove) {
    if (!container) throw new Error('Container element not found');

    // UI state
    let selected = null; // { row, col }
    let highlightedSquares = []; // [{row, col, type: 'valid'|'capture'|'castle'}]

    // Create 64 squares
    container.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((row + col) % 2 === 0 ? 'square-white' : 'square-black');
            square.dataset.row = row;
            square.dataset.col = col;
            container.appendChild(square);
        }
    }

    // Handle square clicks
    container.addEventListener('click', e => {
        const target = e.target.closest('.square');
        if (!target) return;
        
        const row = +target.dataset.row;
        const col = +target.dataset.col;
        const board = game.getBoard();
        const piece = board[row][col];
        
        // Click on selected square: deselect
        if (selected && selected.row === row && selected.col === col) {
            clearSelection();
            return;
        }
        
        // If clicking on another piece of the same color, change selection
        if (piece && piece.color === game.turn()) {
            selectSquare(row, col);
            return;
        }
        
        // If no piece is selected, select it if it's the current player's piece
        if (!selected) {
            if (piece && piece.color === game.turn()) {
                selectSquare(row, col);
            }
            return;
        }
        
        // Otherwise, attempt to move
        const from = algebraic(selected.row, selected.col);
        const to = algebraic(row, col);
        
        if (onMove) {
            onMove(from, to);
        }
    });
    
    // Clear all highlights and selections
    function clearSelection() {
        // Limpiar todos los cuadros resaltados
        highlightedSquares.forEach(({row, col}) => {
            const square = container.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
            if (square) {
                square.classList.remove('valid-move', 'capture-move', 'castle-move');
            }
        });
        
        // Limpiar la selección actual
        if (selected) {
            const selectedSquare = container.querySelector(
                `.square[data-row="${selected.row}"][data-col="${selected.col}"]`
            );
            if (selectedSquare) {
                selectedSquare.classList.remove('selected');
            }
        }
        
        highlightedSquares = [];
        selected = null;
    }
    
    // Select a square and highlight valid moves
    function selectSquare(row, col) {
        clearSelection();
        selected = { row, col };
        
        // Highlight selected square
        const square = container.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('selected');
        }
        
        // Get and highlight valid moves
        const moves = game.moves(algebraic(row, col));
        moves.forEach(move => {
            const targetRow = 8 - parseInt(move.to[1]);
            const targetCol = files.indexOf(move.to[0]);
            const targetSquare = container.querySelector(
                `.square[data-row="${targetRow}"][data-col="${targetCol}"]`
            );
            
            if (targetSquare) {
                const isCapture = move.flags.includes('c') || move.captured;
                const isCastle = move.flags.includes('k') || move.flags.includes('q');
                
                if (isCastle) {
                    targetSquare.classList.add('castle-move');
                } else if (isCapture) {
                    targetSquare.classList.add('capture-move');
                } else {
                    targetSquare.classList.add('valid-move');
                }
                
                highlightedSquares.push({
                    row: targetRow,
                    col: targetCol,
                    type: isCastle ? 'castle' : isCapture ? 'capture' : 'valid'
                });
            }
        });
    }

    // Render the current board state
    function renderBoard() {
        const board = game.getBoard();
        const squares = container.querySelectorAll('.square');

        // Update pieces
        board.forEach((row, rowIndex) => {
            row.forEach((piece, colIndex) => {
                const square = squares[rowIndex * 8 + colIndex];
                if (!square) return;

                // Clear previous content
                square.innerHTML = '';
                square.className = 'square';
                square.classList.add((rowIndex + colIndex) % 2 === 0 ? 'square-white' : 'square-black');

                // Add piece if exists
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece piece-${piece.color}`;
                    pieceElement.textContent = piece.char;
                    square.appendChild(pieceElement);
                }
            });
        });

        // Highlight check if needed
        if (game.inCheck()) {
            const king = findKing(game.turn());
            if (king) {
                const square = container.querySelector(
                    `.square[data-row="${king.row}"][data-col="${king.col}"]`
                );
                if (square) square.classList.add('in-check');
            }
        }
    }

    function findKing(color) {
        const board = game.getBoard();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    // Render initial board
    renderBoard();

    // Expose public methods
    return {
        renderBoard,
        clearSelection,
        selectSquare: (row, col) => selectSquare(row, col)
    };
}
