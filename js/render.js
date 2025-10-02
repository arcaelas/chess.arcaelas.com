// UI rendering for the chessboard
// Handles only visual representation and selection, no game logic

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function algebraic(row, col) {
    return `${FILES[col]}${8 - row}`;
}

export function create_board(container, game, on_move) {
    if (!container) throw new Error('Container element not found');

    let selected = null;
    let highlighted_squares = [];

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

    container.addEventListener('click', e => {
        const target = e.target.closest('.square');
        if (!target) return;

        const row = +target.dataset.row;
        const col = +target.dataset.col;
        const board = game.get_board();
        const piece = board[row][col];

        if (selected && selected.row === row && selected.col === col) {
            clear_selection();
            return;
        }

        if (piece && piece.color === game.turn()) {
            select_square(row, col);
            return;
        }

        if (!selected) {
            if (piece && piece.color === game.turn()) {
                select_square(row, col);
            }
            return;
        }

        const from = algebraic(selected.row, selected.col);
        const to = algebraic(row, col);

        if (on_move) {
            on_move(from, to);
        }
    });

    function clear_selection() {
        highlighted_squares.forEach(({row, col}) => {
            const square = container.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
            if (square) {
                square.classList.remove('valid-move', 'capture-move', 'castle-move');
            }
        });

        if (selected) {
            const selected_square = container.querySelector(
                `.square[data-row="${selected.row}"][data-col="${selected.col}"]`
            );
            if (selected_square) {
                selected_square.classList.remove('selected');
            }
        }

        highlighted_squares = [];
        selected = null;
    }

    function select_square(row, col) {
        clear_selection();
        selected = { row, col };

        const square = container.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('selected');
        }

        const moves = game.moves(algebraic(row, col));
        moves.forEach(move => {
            const target_row = 8 - parseInt(move.to[1]);
            const target_col = FILES.indexOf(move.to[0]);
            const target_square = container.querySelector(
                `.square[data-row="${target_row}"][data-col="${target_col}"]`
            );

            if (target_square) {
                const is_capture = move.flags.includes('c') || move.captured;
                const is_castle = move.flags.includes('k') || move.flags.includes('q');

                if (is_castle) {
                    target_square.classList.add('castle-move');
                } else if (is_capture) {
                    target_square.classList.add('capture-move');
                } else {
                    target_square.classList.add('valid-move');
                }

                highlighted_squares.push({
                    row: target_row,
                    col: target_col,
                    type: is_castle ? 'castle' : is_capture ? 'capture' : 'valid'
                });
            }
        });
    }

    function render_board() {
        const board = game.get_board();
        const squares = container.querySelectorAll('.square');

        board.forEach((row, row_index) => {
            row.forEach((piece, col_index) => {
                const square = squares[row_index * 8 + col_index];
                if (!square) return;

                square.innerHTML = '';
                square.className = 'square';
                square.classList.add((row_index + col_index) % 2 === 0 ? 'square-white' : 'square-black');

                if (piece) {
                    const piece_element = document.createElement('div');
                    piece_element.className = `piece piece-${piece.color}`;
                    piece_element.textContent = piece.char;
                    square.appendChild(piece_element);
                }
            });
        });

        if (game.in_check()) {
            const king = find_king(game.turn());
            if (king) {
                const square = container.querySelector(
                    `.square[data-row="${king.row}"][data-col="${king.col}"]`
                );
                if (square) square.classList.add('in-check');
            }
        }
    }

    function find_king(color) {
        const board = game.get_board();
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

    render_board();

    return {
        render_board,
        clear_selection,
        select_square: (row, col) => select_square(row, col)
    };
}
