// Importar la clase ChessGame
const { ChessGame } = require('./script');

// Función de utilidad para crear un tablero de prueba
function createTestBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    // Configurar piezas blancas
    board[6] = Array(8).fill('♙');
    board[7] = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
    // Configurar piezas negras
    board[1] = Array(8).fill('♟');
    board[0] = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
    return board;
}

describe('ChessGame - Lógica del Juego', () => {
    let game;

    beforeEach(() => {
        // Configurar un mock mínimo para document
        const createMockElement = () => {
            return {
                innerHTML: '',
                appendChild: jest.fn(),
                classList: { 
                    add: jest.fn(), 
                    remove: jest.fn(),
                    contains: jest.fn()
                },
                setAttribute: jest.fn(),
                dataset: {},
                textContent: '',
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(() => []),
                getAttribute: jest.fn(),
                style: {},
                children: [],
                childNodes: [],
                parentNode: {
                    removeChild: jest.fn()
                },
                remove: jest.fn()
            };
        };

        const mockElement = createMockElement();

        // Mock para el tablero de ajedrez
        const chessboardMock = createMockElement();
        chessboardMock.id = 'chessboard';
        
        // Mock para el botón de reinicio
        const restartButtonMock = createMockElement();
        restartButtonMock.id = 'restart-button';
        restartButtonMock.style = {}; // Asegurarse de que existe la propiedad style
        
        // Mock para el texto de estado
        const statusTextMock = createMockElement();
        statusTextMock.id = 'status-text';
        
        // Mock para las áreas de piezas capturadas
        const capturedWhiteMock = createMockElement();
        capturedWhiteMock.id = 'captured-white';
        
        const capturedBlackMock = createMockElement();
        capturedBlackMock.id = 'captured-black';

        // Configurar el mock de document
        global.document = {
            getElementById: jest.fn((id) => {
                const elements = {
                    'chessboard': chessboardMock,
                    'restart-button': restartButtonMock,
                    'status-text': statusTextMock,
                    'captured-white': capturedWhiteMock,
                    'captured-black': capturedBlackMock
                };
                return elements[id] || { ...mockElement, id };
            }),
            createElement: jest.fn((tag) => ({
                ...mockElement,
                tagName: tag.toUpperCase()
            })),
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn(),
            createTextNode: jest.fn((text) => ({
                nodeValue: text,
                nodeType: 3
            })),
            body: {
                appendChild: jest.fn()
            },
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        
        // Crear una nueva instancia del juego
        game = new ChessGame();
        // Reemplazar el tablero con uno de prueba
        game.board = createTestBoard();
    });

    describe('Movimiento de peones', () => {
        test('Peón blanco puede moverse una casilla hacia adelante', () => {
            // Preparar
            game.selectedPiece = { row: 6, col: 0 };
            
            // Actuar
            const result = game.attemptMove(5, 0);
            
            // Verificar
            expect(result).toBe(true);
            expect(game.board[5][0]).toBe('♙');
            expect(game.board[6][0]).toBeNull();
        });

        test('Peón negro puede moverse una casilla hacia adelante', () => {
            // Preparar
            game.currentPlayer = 'black';
            game.selectedPiece = { row: 1, col: 0 };
            
            // Actuar
            const result = game.attemptMove(2, 0);
            
            // Verificar
            expect(result).toBe(true);
            expect(game.board[2][0]).toBe('♟');
            expect(game.board[1][0]).toBeNull();
        });

        test('Peón no puede moverse si no es su turno', () => {
            // Preparar (intentar mover peón negro en turno de blancas)
            game.selectedPiece = { row: 1, col: 0 };
            
            // Actuar
            const result = game.attemptMove(2, 0);
            
            // Verificar
            expect(result).toBe(false);
            expect(game.board[1][0]).toBe('♟');
        });
    });

    describe('Movimientos de otras piezas', () => {
        test('Alfil blanco puede moverse en diagonal cuando el camino está libre', () => {
            // Liberar la diagonal desde (7,2) a (5,4)
            game.board[6][3] = null; // quitar peón en la diagonal
            game.selectedPiece = { row: 7, col: 2 }; // alfil blanco

            const result = game.attemptMove(5, 4);
            expect(result).toBe(true);
            expect(game.board[5][4]).toBe('♗');
            expect(game.board[7][2]).toBeNull();
        });

        test('Alfil no puede saltar piezas en la diagonal', () => {
            // Sin liberar camino (peón bloquea)
            game.selectedPiece = { row: 7, col: 2 };
            const result = game.attemptMove(4, 5);
            expect(result).toBe(false);
            expect(game.board[7][2]).toBe('♗');
        });

        test('Caballo blanco puede moverse en "L"', () => {
            game.selectedPiece = { row: 7, col: 1 }; // caballo blanco
            const result = game.attemptMove(5, 2); // L
            expect(result).toBe(true);
            expect(game.board[5][2]).toBe('♘');
        });

        test('Torre blanca no puede atravesar piezas', () => {
            game.selectedPiece = { row: 7, col: 0 }; // torre blanca
            const result = game.attemptMove(5, 0); // peones bloquean
            expect(result).toBe(false);
            expect(game.board[7][0]).toBe('♖');
        });

        test('Peón blanco puede avanzar dos casillas en primer movimiento si camino libre', () => {
            game.selectedPiece = { row: 6, col: 1 };
            const result = game.attemptMove(4, 1);
            expect(result).toBe(true);
            expect(game.board[4][1]).toBe('♙');
        });

        test('Peón blanco NO puede avanzar dos casillas si hay pieza en el camino', () => {
            // Colocar un bloqueo en (5,2)
            game.board[5][2] = '♟';
            game.selectedPiece = { row: 6, col: 2 };
            const result = game.attemptMove(4, 2);
            expect(result).toBe(false);
            expect(game.board[6][2]).toBe('♙');
        });
    });
});
