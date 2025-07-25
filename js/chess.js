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
    getBoard() {
        // chess.js devuelve filas desde 8→1 (arriba→abajo);
        // mantenemos ese orden para la UI (fila 0 = 8).
        const raw = this.game.board();
        return raw.map(row => row.map(cell => {
            if (!cell) return null;
            const color = cell.color === 'w' ? 'white' : 'black';
            const char = this._toUnicode(cell.type, color);
            return { color, type: cell.type, char };
        }));
    }

    /**
     * Intenta realizar un movimiento. Devuelve el movimiento si es válido, null en caso contrario.
     * @param {string} from – coordenada algebraica (e.g. "e2")
     * @param {string} to   – coordenada algebraica (e.g. "e4")
     * @param {string} [promotion='q'] – pieza de promoción
     *
     * Devuelve los movimientos legales para una casilla en formato verbose de chess.js
     * @param {string} square – (e.g. "e2")
     */
    moves(square) {
        return this.game.moves({ square, verbose: true });
    }

    unicode(type, color) {
        return this._toUnicode(type, color);
    }

    move(from, to, promotion = 'q') {
        const result = this.game.move({ from, to, promotion });
        if (result) {
            // Emitir evento de movimiento
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
            // Emitir cambio de turno después de un movimiento válido
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

    inCheck() { return this.game.inCheck(); }
    inCheckmate() { return this.game.isCheckmate(); }
    inDraw() { return this.game.isDraw(); }
    inStalemate() { return this.game.inStalemate(); }
    inThreefoldRepetition() { return this.game.inThreefoldRepetition(); }
    turn() { return this.game.turn() === 'w' ? 'white' : 'black'; }

    /** Devuelve la posición en formato FEN */
    fen() { return this.game.fen(); }

    /**
     * Obtiene información detallada del tablero con los movimientos posibles
     * @returns {Array<Object>} - Array con información de cada pieza y sus movimientos
     */
    getBoardWithMoves() {
        const board = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        // Recorrer todas las casillas del tablero
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
    _toUnicode(type, color) {
        const white = { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' };
        const black = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };
        return color === 'white' ? white[type] : black[type];
    }
}
