// Pruebas detalladas para ChessGame
// Estas pruebas buscan cubrir casos avanzados de movilidad, capturas, turnos, jaque y otras reglas

const { ChessGame } = require('./script');

// ==========================
// Utilidades de apoyo
// ==========================

/**
 * Crea una matriz 8x8 llena de null para representar un tablero vacío.
 */
function emptyBoard() {
    return Array(8).fill().map(() => Array(8).fill(null));
}

/**
 * Devuelve un elemento DOM Mock mínimo que satisface los accesos usados en el código.
 */
function createMockElement() {
    return {
        innerHTML: '',
        appendChild: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
        },
        setAttribute: jest.fn(),
        dataset: {},
        textContent: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        style: {},
        children: [],
        childNodes: [],
        parentNode: { removeChild: jest.fn() },
        remove: jest.fn(),
    };
}

/**
 * Configura mocks globales de document antes de cada prueba.
 */
function setupDomMocks() {
    const mockElement = createMockElement();

    const chessboardMock = createMockElement();
    chessboardMock.id = 'chessboard';

    const restartButtonMock = createMockElement();
    restartButtonMock.id = 'restart-button';
    restartButtonMock.style = {};

    const statusTextMock = createMockElement();
    statusTextMock.id = 'status-text';

    const capturedWhiteMock = createMockElement();
    capturedWhiteMock.id = 'captured-white';

    const capturedBlackMock = createMockElement();
    capturedBlackMock.id = 'captured-black';

    global.document = {
        getElementById: jest.fn((id) => {
            const elements = {
                'chessboard': chessboardMock,
                'restart-button': restartButtonMock,
                'status-text': statusTextMock,
                'captured-white': capturedWhiteMock,
                'captured-black': capturedBlackMock,
            };
            return elements[id] || { ...mockElement, id };
        }),
        createElement: jest.fn((tag) => ({
            ...mockElement,
            tagName: tag.toUpperCase(),
        })),
        querySelectorAll: jest.fn(() => []),
        querySelector: jest.fn(),
        createTextNode: jest.fn((text) => ({ nodeValue: text, nodeType: 3 })),
        body: { appendChild: jest.fn() },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    };
}

/**
 * Coloca una pieza en el tablero y devuelve la pieza para cadenas legibles.
 */
function placePiece(board, row, col, piece) {
    board[row][col] = piece;
    return piece;
}

// ==========================
// Pruebas detalladas
// ==========================

describe('ChessGame – Pruebas detalladas', () => {
    let game;

    beforeEach(() => {
        jest.clearAllMocks();
        setupDomMocks();
        game = new ChessGame();
        // Evitar renders innecesarios
        game.renderBoard = jest.fn();
        game.renderCaptured = jest.fn();
        game.updateStatus();
    });

    // ---------------------------------
    // 1. Movilidad de las piezas
    // ---------------------------------
    describe('Movilidad de las piezas', () => {
        test('El caballo puede saltar piezas y moverse en "L"', () => {
            // Tablero vacío con reyes obligatorios
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔'); // Rey blanco
            placePiece(board, 0, 4, '♚'); // Rey negro
            placePiece(board, 4, 4, '♘'); // Caballo blanco
            game.board = board;
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };
            game.currentPlayer = 'white';

            game.selectedPiece = { row: 4, col: 4 };
            const result = game.attemptMove(2, 5); // Movimiento en L
            expect(result).toBe(true);
            expect(game.board[2][5]).toBe('♘');
            expect(game.board[4][4]).toBeNull();
        });

        test('El alfil no puede saltar piezas', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚');
            placePiece(board, 4, 4, '♗'); // Alfil blanco
            placePiece(board, 3, 5, '♙'); // Peón blanco bloqueando
            game.board = board;
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };
            game.currentPlayer = 'white';

            game.selectedPiece = { row: 4, col: 4 };
            const result = game.attemptMove(2, 6); // Intentar saltar el peón
            expect(result).toBe(false);
            expect(game.board[4][4]).toBe('♗');
            expect(game.board[2][6]).toBeNull();
        });

        test('La torre se mueve en línea recta únicamente si el camino está libre', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚');
            placePiece(board, 4, 4, '♖'); // Torre blanca
            // Bloqueo con peón
            placePiece(board, 2, 4, '♟');
            game.board = board;
            game.currentPlayer = 'white';
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };

            game.selectedPiece = { row: 4, col: 4 };
            const resultBlocked = game.attemptMove(0, 4);
            expect(resultBlocked).toBe(false);
            expect(game.board[4][4]).toBe('♖');

            // Quitar bloqueo y reintentar
            game.board[2][4] = null;
            game.selectedPiece = { row: 4, col: 4 };
            const resultFree = game.attemptMove(0, 4);
            expect(resultFree).toBe(true);
            expect(game.board[0][4]).toBe('♖');
        });
    });

    // ---------------------------------
    // 2. Capturas y eliminación de piezas
    // ---------------------------------
    describe('Capturas de piezas', () => {
        test('Un peón blanco captura en diagonal y elimina la pieza negra', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚');
            placePiece(board, 4, 4, '♙'); // Peón blanco
            placePiece(board, 3, 5, '♟'); // Peón negro
            game.board = board;
            game.currentPlayer = 'white';
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };

            game.selectedPiece = { row: 4, col: 4 };
            const result = game.attemptMove(3, 5);
            expect(result).toBe(true);
            expect(game.board[3][5]).toBe('♙'); // Peón blanco en nueva posición
            expect(game.board[4][4]).toBeNull(); // Origen vacío
            // La pieza negra debía ser capturada
            expect(game.capturedPieces.black).toContain('♟');
        });
    });

    // ---------------------------------
    // 3. Manejo de turnos
    // ---------------------------------
    describe('Manejo de turnos', () => {
        test('No se permite mover una pieza cuando no es tu turno', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚');
            placePiece(board, 1, 0, '♟');
            game.board = board;
            game.currentPlayer = 'white'; // Turno de blancas
            game.selectedPiece = { row: 1, col: 0 }; // Intentar mover peón negro
            const result = game.attemptMove(2, 0);
            expect(result).toBe(false);
        });

        test('El turno alterna tras un movimiento válido', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚');
            placePiece(board, 6, 0, '♙');
            game.board = board;
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };
            game.currentPlayer = 'white';

            game.selectedPiece = { row: 6, col: 0 };
            const result = game.attemptMove(5, 0);
            expect(result).toBe(true);
            expect(game.currentPlayer).toBe('black');
        });
    });

    // ---------------------------------
    // 4. Detección de jaque
    // ---------------------------------
    describe('Detección de jaque', () => {
        test('Se detecta jaque al rey negro por una torre blanca', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚'); // Rey negro
            placePiece(board, 1, 4, '♖'); // Torre blanca directamente enfrente
            game.board = board;
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };
            game.currentPlayer = 'white';

            // Actualizar estado manualmente
            game.updateStatus();
            expect(game.checkStatus.black).toBe(true);
            expect(game.checkStatus.white).toBe(false);
        });
    });

    // ---------------------------------
    // 5. Enroque y promoción
    // ---------------------------------
    describe('Enroque y promoción', () => {
        test('Enroque corto blanco exitoso', () => {
            const board = emptyBoard();
            // Colocar reyes y torres
            placePiece(board, 7, 4, '♔');
            placePiece(board, 7, 7, '♖');
            placePiece(board, 0, 4, '♚');
            game.board = board;
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };
            game.currentPlayer = 'white';

            game.selectedPiece = { row: 7, col: 4 };
            const result = game.attemptMove(7, 6); // Enroque corto
            expect(result).toBe(true);
            expect(game.board[7][6]).toBe('♔'); // Rey en g1 (7,6)
            expect(game.board[7][5]).toBe('♖'); // Torre en f1 (7,5)
        });

        test('Promoción de peón blanco a dama', () => {
            const board = emptyBoard();
            placePiece(board, 7, 4, '♔');
            placePiece(board, 0, 4, '♚');
            placePiece(board, 1, 0, '♙'); // Peón blanco a punto de coronar
            game.board = board;
            game.kingPositions.white = { row: 7, col: 4 };
            game.kingPositions.black = { row: 0, col: 4 };
            game.currentPlayer = 'white';

            game.selectedPiece = { row: 1, col: 0 };
            const result = game.attemptMove(0, 0); // Avanza a la última fila
            expect(result).toBe(true);
            expect(game.board[0][0]).toBe('♕'); // Peón promovido a reina
        });
    });
});
