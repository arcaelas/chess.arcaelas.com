// Chess engine wrapper using chess.js library
// Exposes convenient methods for the UI layer.

// Usamos unpkg CDN para cargar chess.js
import { Chess as ChessLib } from 'https://cdn.jsdelivr.net/npm/chess.js@latest/dist/esm/chess.js'; // Versión 1.4.0

/**
 * Clase Chess
 * Encapsula la lógica del juego usando la biblioteca open-source chess.js.
 * Garantiza reglas correctas (jaque, jaque mate, enroque, promoción, tablas).
 */
export default class Chess {
    constructor() {
        this.game = new ChessLib();
        this.listeners = {};
    }

    /**
     * Suscribe un callback a un evento específico.
     * @param {string} event
     * @param {Function} callback
     */
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    /**
     * Emite un evento interno.
     * @param {string} event
     * @param {*} payload
     */
    _emit(event, payload) {
        (this.listeners[event] || []).forEach(cb => {
            try {
                cb(payload);
            } catch (err) {
                console.error('Chess event listener error', err);
            }
        });
    }


    /**
     * Devuelve un arreglo 8×8 con piezas o null.
     * Cada pieza es { color: 'white'|'black', type: 'p','r','n','b','q','k', char: '♟' }
     */
    get_board() {
        const raw = this.game.board();
        return raw.map(row => row.map(cell => {
            if (!cell) return null;
            const color = cell.color === 'w' ? 'white' : 'black';
            const char = this._to_unicode(cell.type, color);
            return { color, type: cell.type, char };
        }));
    }

    /**
     * Devuelve los movimientos legales para una casilla en formato verbose de chess.js
     * @param {string} square – (e.g. "e2")
     */
    moves(square) {
        return this.game.moves({ square, verbose: true });
    }

    unicode(type, color) {
        return this._to_unicode(type, color);
    }

    move(from, to, promotion = 'q') {
        const result = this.game.move({ from, to, promotion });
        if (result) {
            this._emit('move', result);
            if (result.captured) {
                this._emit('capture', result);
            }
            if (this.game.inCheck()) {
                this._emit('check', { turn: this.turn() });
            }
            if (this.game.isCheckmate()) {
                this._emit('checkmate', { winner: this.turn() === 'white' ? 'black' : 'white' });
            }
            this._emit('turn', { turn: this.turn() });
        }
        return result || null;
    }

    /**
     * Desuscribe un callback de un evento.
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    undo() {
        const undone = this.game.undo();
        if (undone) this._emit('undo', undone);
        return undone;
    }

    in_check() { return this.game.inCheck(); }
    in_checkmate() { return this.game.isCheckmate(); }
    in_draw() { return this.game.isDraw(); }
    in_stalemate() { return this.game.inStalemate(); }
    in_threefold_repetition() { return this.game.inThreefoldRepetition(); }
    turn() { return this.game.turn() === 'w' ? 'white' : 'black'; }

    /** Devuelve la posición en formato FEN */
    fen() { return this.game.fen(); }

    /**
     * Obtiene información detallada del tablero con los movimientos posibles
     * @returns {Array<Object>} - Array con información de cada pieza y sus movimientos
     */
    get_board_with_moves() {
        const board = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = files[file] + (8 - rank);
                const piece = this.game.get(square);

                if (piece) {
                    const moves = this.game.moves({
                        square: square,
                        verbose: true
                    }).map(move => move.to);

                    board.push({
                        color: piece.color,
                        name: piece.type.toUpperCase(),
                        position: square,
                        canMove: moves
                    });
                }
            }
        }

        return board;
    }

    /* ==================== PRIVATE ==================== */
    _to_unicode(type, color) {
        const white = { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' };
        const black = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
        return color === 'white' ? white[type] : black[type];
    }
}
