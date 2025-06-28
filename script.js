class ChessGame {
    constructor() {
        this.board = [];
        this.selectedPiece = null;
        this.currentPlayer = 'white'; // Las blancas empiezan
        this.capturedPieces = { white: [], black: [] };
        this.checkStatus = { white: false, black: false };
        this.gameOver = false;
        this.winner = null;
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.kingPositions = {
            white: { row: 7, col: 4 }, // Posición inicial del rey blanco
            black: { row: 0, col: 4 }  // Posición inicial del rey negro
        };
        this.initializeBoard();
        this.setupEventListeners();
        this.updateStatus();
        console.log('Juego iniciado. Turno de las Blancas.');
    }
    
    updateStatus() {
        // Verificar jaque para ambos jugadores
        this.checkStatus.white = this.isKingInCheck('white');
        this.checkStatus.black = this.isKingInCheck('black');
        
        // Verificar jaque mate o tablas
        if (this.checkStatus[this.currentPlayer]) {
            if (this.isCheckmate()) {
                this.gameOver = true;
                this.winner = this.currentPlayer === 'white' ? 'Negras' : 'Blancas';
            }
        } else if (this.isStalemate()) {
            this.gameOver = true;
            this.winner = 'Empate';
        }
        
        // Actualizar la interfaz de usuario con el estado actual del juego
        const statusElement = document.getElementById('status-text');
        if (statusElement) {
            let text = `Turno de las ${this.currentPlayer === 'white' ? 'Blancas' : 'Negras'}`;
            if (this.checkStatus[this.currentPlayer]) text += ' — ¡Jaque!';
            if (this.gameOver) {
                text = this.winner === 'Empate' ? '¡Empate por ahogado!' : `¡Jaque mate! Ganaron las ${this.winner}`;
            }
            statusElement.textContent = text;
        }
        
        // Actualizar el botón de reinicio si el juego terminó
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.style.display = this.gameOver ? 'block' : 'none';
        }
    }
    
    // Verifica si el rey del color especificado está en jaque
    isKingInCheck(color) {
        const kingPos = this.kingPositions[color];
        if (!kingPos) return false;
        
        const opponentColor = color === 'white' ? 'black' : 'white';
        const originalCurrentPlayer = this.currentPlayer; // Guardar el jugador actual
        this.currentPlayer = opponentColor; // Establecer temporalmente el turno del oponente
        
        try {
            // Verificar todas las piezas del oponente para ver si alguna puede capturar al rey
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && this.getPieceColor(piece) === opponentColor) {
                        if (this.isValidMove({row, col}, kingPos.row, kingPos.col)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        } finally {
            this.currentPlayer = originalCurrentPlayer; // Restaurar el jugador original
        }
    }
    
    // Verifica si hay jaque mate
    isCheckmate() {
        // Si el rey no está en jaque, no es jaque mate
        if (!this.checkStatus[this.currentPlayer]) return false;
        
        // Verificar si hay algún movimiento legal que el jugador pueda hacer
        return !this.hasAnyLegalMove();
    }
    
    // Verifica si hay tablas por ahogado
    isStalemate() {
        // Si el rey está en jaque, no es ahogado
        if (this.checkStatus[this.currentPlayer]) return false;
        
        // Verificar si hay algún movimiento legal que el jugador pueda hacer
        return !this.hasAnyLegalMove();
    }
    
    // Verifica si el jugador actual tiene algún movimiento legal
    hasAnyLegalMove() {
        // Hacer una copia del estado actual
        const originalBoard = JSON.parse(JSON.stringify(this.board));
        const originalKingPositions = { ...this.kingPositions };
        const originalCurrentPlayer = this.currentPlayer;
        
        // Verificar cada pieza del jugador actual
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && this.getPieceColor(piece) === this.currentPlayer) {
                    // Verificar cada casilla como posible destino
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            // Verificar si el movimiento es válido
                            if (this.isValidMove({row: fromRow, col: fromCol}, toRow, toCol)) {
                                // Hacer el movimiento temporal
                                const tempPiece = this.board[toRow][toCol];
                                this.board[toRow][toCol] = this.board[fromRow][fromCol];
                                this.board[fromRow][fromCol] = null;
                                
                                // Actualizar posición del rey si es necesario
                                if (piece === '♔') {
                                    this.kingPositions.white = { row: toRow, col: toCol };
                                } else if (piece === '♚') {
                                    this.kingPositions.black = { row: toRow, col: toCol };
                                }
                                
                                // Verificar si el rey sigue en jaque después del movimiento
                                const stillInCheck = this.isKingInCheck(this.currentPlayer);
                                
                                // Deshacer el movimiento
                                this.board[fromRow][fromCol] = this.board[toRow][toCol];
                                this.board[toRow][toCol] = tempPiece;
                                this.kingPositions = { ...originalKingPositions };
                                
                                // Si encontramos un movimiento que saca al rey del jaque, no es jaque mate
                                if (!stillInCheck) {
                                    this.board = originalBoard;
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Restaurar el estado original
        this.board = originalBoard;
        return false;
    }

    initializeBoard() {
    // Reiniciar capturas y jaque
    this.capturedPieces = { white: [], black: [] };
    this.checkStatus = { white: false, black: false };
        // Crear tablero vacío
        this.board = Array(8).fill().map(() => Array(8).fill(null));

        // Colocar piezas blancas (en la parte inferior, fila 6 y 7)
        this.board[6] = Array(8).fill('♙'); // Peones blancos
        this.board[7] = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']; // Piezas blancas

        // Colocar piezas negras (en la parte superior, fila 0 y 1)
        this.board[1] = Array(8).fill('♟'); // Peones negros
        this.board[0] = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜']; // Piezas negras

        console.log('Tablero inicializado:');
        console.table(this.board);
        this.renderBoard();
        this.renderCaptured();
    }

    renderBoard() {
        console.log('\n🔄 RENDERIZANDO TABLERO =======================');
        const chessboard = document.getElementById('chessboard');
        if (!chessboard) {
            console.error('❌ No se encontró el tablero de ajedrez');
            return;
        }
        
        console.log('🧹 Limpiando tablero...');
        chessboard.innerHTML = '';
        
        console.log('🎨 Dibujando tablero...');
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = this.board[i][j];
                const square = document.createElement('div');
                
                // Determinar el color de la casilla (blanca o negra)
                const isWhiteSquare = (i + j) % 2 === 0;
                const squareColor = isWhiteSquare ? 'white' : 'black';
                
                // Clases base
                const classes = ['square', `square-${squareColor}`];
                
                // Agregar clase para el color de la pieza
                if (piece) {
                    const isWhitePiece = ['♔', '♕', '♖', '♗', '♘', '♙'].includes(piece);
                    classes.push(isWhitePiece ? 'piece-white' : 'piece-black');
                }
                
                // Agregar clase y atributo si la casilla tiene una pieza
                if (piece) {
                    classes.push('has-piece');
                    square.setAttribute('data-piece', piece);
                    console.log(`  - Casilla (${i},${j}): ${piece}`);
                    
                    // Crear un span para la pieza
                    const pieceElement = document.createElement('span');
                    pieceElement.textContent = piece;
                    square.appendChild(pieceElement);
                }
                
                // Resaltar la pieza seleccionada
                if (this.selectedPiece && this.selectedPiece.row === i && this.selectedPiece.col === j) {
                    classes.push('selected');
                    console.log(`  - Pieza seleccionada en (${i},${j}): ${piece}`);
                }
                
                // NUEVO: exponer coordenadas para efectos visuales
                square.dataset.row = i;
                square.dataset.col = j;
                
                square.className = classes.join(' ');
                square.textContent = piece || '';
                
                // Agregar atributos para depuración
                square.setAttribute('data-debug', `(${i},${j}) ${piece || 'vacía'}`);
                
                chessboard.appendChild(square);
            }
        }
        
        // Resaltar movimientos válidos si hay una pieza seleccionada
        if (this.selectedPiece) {
            const { row, col } = this.selectedPiece;
            console.log(`🔍 Resaltando movimientos válidos para pieza en (${row},${col})`);
            this.highlightValidMoves(row, col);
        }
        
        console.log('✅ Tablero renderizado');
        // También actualizar área de capturas
        this.renderCaptured();
    }

    // Renderizar piezas capturadas en sus contenedores
    renderCaptured() {
        if (typeof document === 'undefined') return;
        const whiteContainer = document.getElementById('captured-white');
        const blackContainer = document.getElementById('captured-black');
        if (whiteContainer) {
            whiteContainer.innerHTML = this.capturedPieces.white.map(p => `<span class=\"piece-white\">${p}</span>`).join('');
        }
        if (blackContainer) {
            blackContainer.innerHTML = this.capturedPieces.black.map(p => `<span class=\"piece-black\">${p}</span>`).join('');
        }
    
    }

    setupEventListeners() {
        console.log('🔌 Configurando event listeners...');
        const chessboard = document.getElementById('chessboard');
        if (!chessboard) {
            console.error('No se encontró el tablero de ajedrez');
            return;
        }
        
        console.log('🔧 Configurando event listeners...');
        
        // Usar event delegation para manejar clics en las casillas
        chessboard.addEventListener('click', (e) => {
            console.log('\n🎯 EVENTO DE CLIC DETECTADO');
            
            // Encontrar el elemento cuadrado que se hizo clic
            let square = e.target.closest('.square');
            if (!square) {
                console.log('❌ No se hizo clic en una casilla del tablero');
                return;
            }
            
            console.log('✅ Cuadrado clickeado:', square);
            
            const row = parseInt(square.dataset.row, 10);
            const col = parseInt(square.dataset.col, 10);
            
            if (isNaN(row) || isNaN(col) || row < 0 || row > 7 || col < 0 || col > 7) {
                console.error('❌ Coordenadas inválidas:', { row, col });
                return;
            }
            
            console.log(`📍 Coordenadas: (${row},${col})`);
            
            const piece = this.board[row][col];
            const pieceColor = piece ? this.getPieceColor(piece) : null;
            
            console.log('=== INFORMACIÓN DEL CLIC ===');
            console.log(`- Pieza: ${piece || 'Ninguna'} (${pieceColor || 'vacía'})`);
            console.log(`- Turno actual: ${this.currentPlayer}`);
            
            // 1. Si hay una pieza seleccionada, intentar moverla
            if (this.selectedPiece) {
                const { row: fromRow, col: fromCol } = this.selectedPiece;
                const selectedPiece = this.board[fromRow][fromCol];
                
                // Si se hace clic en la misma pieza, deseleccionar
                if (fromRow === row && fromCol === col) {
                    console.log('🔄 Hiciste clic en la misma pieza, deseleccionando...');
                    this.selectedPiece = null;
                    this.renderBoard();
                    return;
                }
                
                console.log(`🔄 Intentando mover ${selectedPiece} de (${fromRow},${fromCol}) a (${row},${col})`);
                
                // Intentar realizar el movimiento
                const moveResult = this.attemptMove(row, col);
                
                // Si el movimiento fue exitoso, limpiar la selección
                if (moveResult) {
                    this.selectedPiece = null;
                }
                
                // Renderizar el tablero en cualquier caso
                this.renderBoard();
                return;
            }
            
            // 2. Si no hay pieza seleccionada, seleccionar la pieza si es del color correcto
            if (piece && pieceColor === this.currentPlayer) {
                console.log(`🎯 Seleccionando ${piece} (${pieceColor}) en (${row},${col})`);
                this.selectedPiece = { row, col };
                this.renderBoard();
                return;
            }
            
            // 3. Clic en casilla vacía o pieza del oponente sin tener nada seleccionado
            console.log(piece ? 
                '⚠️ Selecciona una de tus piezas primero' : 
                '🌌 Haz clic en una de tus piezas para seleccionarla');
                
            // Renderizar el tablero para asegurar que se muestre correctamente
            this.renderBoard();
        });
        
        console.log('✅ Event listeners configurados correctamente');

        document.getElementById('restart-button').addEventListener('click', () => {
            this.initializeBoard();
            this.currentPlayer = 'white';
            this.selectedPiece = null;
            this.updateStatus();
        });
    }
    
    getPieceColor(piece) {
        console.log('=== INICIO DE GET PIECE COLOR ===');
        if (!piece) {
            console.log('❌ No hay pieza');
            return null;
        }
        // Piezas blancas: ♔♕♖♗♘♙, negras: ♚♛♜♝♞♟
        const whitePieces = ['♔', '♕', '♖', '♗', '♘', '♙'];
        const blackPieces = ['♚', '♛', '♜', '♝', '♞', '♟'];
        
        if (whitePieces.includes(piece)) {
            return 'white';
        } else if (blackPieces.includes(piece)) {
            return 'black';
        }
        
        console.log(`❓ Pieza no reconocida: ${piece}`);
        return null;
    }

    attemptMove(toRow, toCol) {
        console.log('\n=== INICIO DE ATTEMPT MOVE ===');
        console.log('📌 Datos del intento de movimiento:');
        console.log(`- Desde: (${this.selectedPiece?.row},${this.selectedPiece?.col})`);
        console.log(`- Hacia: (${toRow},${toCol})`);
        
        if (!this.selectedPiece) {
            console.log('❌ No hay pieza seleccionada');
            return false;
        }

        const { row: fromRow, col: fromCol } = this.selectedPiece;
        const piece = this.board[fromRow][fromCol];
        
        if (!piece) {
            console.log(`❌ No hay pieza en la posición (${fromRow},${fromCol})`);
            return false;
        }
        
        const pieceColor = this.getPieceColor(piece);
        
        console.log(`♟️ Intento de mover ${piece} (${pieceColor}) de (${fromRow},${fromCol}) a (${toRow},${toCol})`);
        console.log(`🔄 Turno actual: ${this.currentPlayer}`);
        console.log(`📊 Estado del tablero antes del movimiento:`);
        console.table(this.board.map(row => [...row].map(cell => cell || '-')));
        
        if (pieceColor !== this.currentPlayer) {
            console.log(`⏳ No es el turno de las ${pieceColor === 'white' ? 'blancas' : 'negras'}`);
            return false;
        }
        
        // Verificar si es un intento de enroque
        if ((piece === '♔' || piece === '♚') && Math.abs(toCol - fromCol) === 2) {
            return this.attemptCastling(toRow, toCol);
        }
        
        console.log('🔍 Validando movimiento...');
        const isValid = this.isValidMove(this.selectedPiece, toRow, toCol, true);
        
        if (isValid) {
            // Hacer una copia del estado actual para poder deshacer si es necesario
            const originalBoard = JSON.parse(JSON.stringify(this.board));
            const originalKingPositions = { ...this.kingPositions };
            
            console.log('✅ Movimiento válido, ejecutando...');
            const moveResult = this.movePiece(fromRow, fromCol, toRow, toCol);
            
            // Verificar si el rey queda en jaque después del movimiento
            if (this.isKingInCheck(pieceColor)) {
                console.log('❌ Movimiento inválido: el rey quedaría en jaque');
                // Deshacer el movimiento
                this.board = originalBoard;
                this.kingPositions = originalKingPositions;
                return false;
            }
            
            // Actualizar posición del rey si es necesario
            if (piece === '♔') {
                this.kingPositions.white = { row: toRow, col: toCol };
                // Invalidar derechos de enroque si el rey se mueve
                this.castlingRights.white.kingSide = false;
                this.castlingRights.white.queenSide = false;
            } else if (piece === '♚') {
                this.kingPositions.black = { row: toRow, col: toCol };
                // Invalidar derechos de enroque si el rey se mueve
                this.castlingRights.black.kingSide = false;
                this.castlingRights.black.queenSide = false;
            }
            
            // Invalidar derechos de enroque si se mueve una torre
            if (piece === '♖') {
                if (fromRow === 7 && fromCol === 0) this.castlingRights.white.queenSide = false;
                if (fromRow === 7 && fromCol === 7) this.castlingRights.white.kingSide = false;
            } else if (piece === '♜') {
                if (fromRow === 0 && fromCol === 0) this.castlingRights.black.queenSide = false;
                if (fromRow === 0 && fromCol === 7) this.castlingRights.black.kingSide = false;
            }
            
            console.log(`🔚 Resultado del movimiento: ${moveResult ? 'ÉXITO' : 'FALLO'}`);
            
            // Cambiar el turno
            this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
            
            // Actualizar el estado del juego
            this.updateStatus();
            
            console.log(`🔄 Próximo turno: ${this.currentPlayer}`);
            console.log('📊 Estado del tablero después del movimiento:');
            console.table(this.board.map(row => [...row].map(cell => cell || '-')));
            
            return moveResult;
        } else {
            console.log('❌ Movimiento inválido');
            console.log('🔍 Razones posibles:');
            console.log(`- ¿Es el turno correcto? ${pieceColor === this.currentPlayer ? '✅ Sí' : '❌ No'}`);
            console.log(`- ¿Movimiento permitido? ${this.isValidMove(this.selectedPiece, toRow, toCol, true) ? '✅ Sí' : '❌ No'}`);
            
            // Verificar si es un movimiento de peón
            if (piece.toLowerCase() === '♙' || piece.toLowerCase() === '♟') {
                console.log('🔍 Análisis de movimiento de peón:');
                const isWhite = piece === '♙';
                const direction = isWhite ? -1 : 1;
                const startRow = isWhite ? 6 : 1;  // Fila inicial de los peones
                
                // Verificar que el movimiento sea en la dirección correcta
                // Usaremos rowChange (signed) y rowDiff (abs) definidos arriba
                // colDiff ya definido arriba
                
                console.log(`🔍 Validando dirección: rowDiff=${rowDiff}, esperado: ${direction} o ${2*direction} para primer movimiento`);
                console.log(`🔍 isWhite: ${isWhite}, from: (${fromRow},${fromCol}), to: (${toRow},${toCol})`);
                console.log(`🔍 Tablero en (${toRow},${toCol}): ${this.board[toRow]?.[toCol] || 'vacío'}`);
                
                // Movimiento hacia adelante (1 o 2 casillas)
                if (colDiff === 0) {
                    console.log('🔍 Movimiento recto:');
                    console.log(`- Casilla destino: ${this.board[toRow]?.[toCol] || 'vacía'}`);
                    console.log(`- ¿Movimiento de una casilla? ${absRowDiff === 1 ? '✅ Sí' : '❌ No'}`);
                    console.log(`- ¿Es primer movimiento de dos casillas? ${fromRow === startRow && absRowDiff === 2 ? '✅ Sí' : '❌ No'}`);
                    
                    if (fromRow === startRow && absRowDiff === 2) {
                        const middleRow = fromRow + direction;
                        const middlePiece = this.board[middleRow]?.[fromCol];
                        console.log(`- Casilla intermedia (${middleRow},${fromCol}): ${middlePiece || 'vacía'}`);
                    }
                }
            }
            
            return false;
        }
    }

    isValidMove(from, toRow, toCol, debug = false) {
        // Verificar que 'from' esté definido y tenga las propiedades row y col
        if (!from || typeof from !== 'object' || from.row === undefined || from.col === undefined) {
            console.error('❌ Error: Parámetro "from" inválido en isValidMove', from);
            return false;
        }

        // Verificar que las coordenadas de destino sean válidas
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
            console.error('❌ Error: Coordenadas de destino inválidas', {toRow, toCol});
            return false;
        }

        console.log('\n=== INICIO DE IS VALID MOVE ===');
        console.log(`🔍 Validando movimiento de (${from.row},${from.col}) a (${toRow},${toCol})`);
        
        const piece = this.board[from.row]?.[from.col];
        if (!piece) {
            console.log('❌ No hay pieza en la casilla de origen');
            return false;
        }
        
        const pieceColor = this.getPieceColor(piece);
        console.log(`📌 Pieza: ${piece} (${pieceColor})`);

        // Cálculo de diferencias de filas y columnas
        const rowChange = toRow - from.row;      // Puede ser positivo o negativo
        const colChange = toCol - from.col;
        const rowDiff = Math.abs(rowChange);     // Magnitud
        const colDiff = Math.abs(colChange);
        
        // Verificar si la casilla de destino está ocupada por una pieza del mismo color
        const targetPiece = this.board[toRow]?.[toCol];
        console.log(`🎯 Pieza en destino: ${targetPiece || 'vacía'}`);
        
        if (targetPiece) {
            const targetColor = this.getPieceColor(targetPiece);
            console.log(`🎯 Color de la pieza en destino: ${targetColor}`);
            
            if (pieceColor === targetColor) {
                console.log('❌ La casilla de destino está ocupada por una pieza del mismo color');
                return false;
            } else {
                console.log('ℹ️  Hay una pieza del oponente en la casilla de destino');
            }
        }

        // Peones
        if (piece === '♙' || piece === '♟') {
            // Depuración específica para el peón en (6,3)
            if (from.row === 6 && from.col === 3) {
                console.log('\n=== DEPURACIÓN ESPECÍFICA PEÓN (6,3) ===');
                console.log('📌 Pieza seleccionada: ' + piece);
                console.log('🎯 Destino: (' + toRow + ',' + toCol + ')');
                console.log('Tablero en (5,3): ' + (this.board[5]?.[3] || 'vacío'));
                console.log('Tablero en (4,3): ' + (this.board[4]?.[3] || 'vacío'));
                console.log('Diferencia de filas: ' + (toRow - from.row));
                console.log('Diferencia de columnas: ' + (toCol - from.col));
            }
            console.log('\n=== INICIO VALIDACIÓN MOVIMIENTO PEÓN ===');
            console.log('📊 Estado del tablero:');
            console.table(this.board.map(row => [...row].map(cell => cell || '-')));
            
            const isWhite = piece === '♙';
            console.log(`🔍 Color: ${isWhite ? 'BLANCO' : 'NEGRO'}`);
            console.log(`📍 Posición actual: (${from.row},${from.col})`);
            console.log(`🎯 Destino: (${toRow},${toCol})`);
            
                // Dirección: los peones blancos suben (disminuyen fila), los negros bajan (aumentan fila)
            const direction = isWhite ? -1 : 1;
            const startRow = isWhite ? 6 : 1;  // Fila inicial de los peones
            
            // Verificar que el movimiento sea en la dirección correcta
            // Usaremos rowChange (signed) y rowDiff (abs) definidos arriba
            // colDiff ya definido arriba
            
            console.log(`🔍 Validando dirección: rowDiff=${rowDiff}, esperado: ${direction} o ${2*direction} para primer movimiento`);
            console.log(`🔍 isWhite: ${isWhite}, from: (${from.row},${from.col}), to: (${toRow},${toCol})`);
            console.log(`🔍 Tablero en (${toRow},${toCol}): ${this.board[toRow]?.[toCol] || 'vacío'}`);
            
            // Movimiento hacia adelante (1 o 2 casillas)
            if (colDiff === 0) {
                // Verificar dirección correcta
                // Para peones blancos (♙): deben moverse hacia arriba (rowChange negativo)
                // Para peones negros (♟): deben moverse hacia abajo (rowChange positivo)
                const isMovingForward = isWhite ? rowChange < 0 : rowChange > 0;
                if (!isMovingForward) {
                    console.log(`❌ Dirección de movimiento incorrecta para el peón: rowChange=${rowChange}, isWhite=${isWhite}`);
                    return false;
                }
                
                // Verificar distancia
                const isFirstMove = (isWhite && from.row === 6) || (!isWhite && from.row === 1);
                const isValidDistance = (rowDiff === 1) || (isFirstMove && rowDiff === 2);
                
                if (!isValidDistance) {
                    console.log('❌ Distancia de movimiento inválida para el peón');
                    return false;
                }
                
                // Verificar si hay piezas en el camino
                if (Math.abs(rowDiff) === 2) {
                    const middleRow = from.row + direction;
                    if (this.board[middleRow][from.col] || this.board[toRow][toCol]) {
                        console.log('❌ Hay una pieza en el camino');
                        return false;
                    }
                } else if (this.board[toRow][toCol]) {
                    console.log('❌ No se puede capturar moviéndose hacia adelante');
                    return false;
                }
                
                return true;
            } 
            // Captura diagonal
            else if (colDiff === 1 && rowDiff === 1) {
                // Verificar dirección correcta para la captura
                const isMovingForward = isWhite ? rowChange < 0 : rowChange > 0;
                if (!isMovingForward) {
                    console.log('❌ Dirección de captura incorrecta para el peón');
                    return false;
                }
                
                // Debe haber una pieza del oponente en la casilla de destino
                if (targetPiece && this.getPieceColor(targetPiece) !== pieceColor) {
                    console.log('✅ Captura diagonal válida');
                    return true;
                }
                console.log('❌ No hay pieza del oponente para capturar');
                return false;
            }
            
            console.log('❌ Movimiento de peón no válido');
            return false;
        }

        // Dama (♛/♕): combinación de torre y alfil
        if (piece === '♛' || piece === '♕') {
            const isStraight = (from.row === toRow || from.col === toCol);
            const isDiagonal = (rowDiff === colDiff);
            if (!isStraight && !isDiagonal) return false;
            return this.isPathClear(from.row, from.col, toRow, toCol);
        }

        // Torres (movimiento en línea recta)
        if (piece === '♜' || piece === '♖') {
            // Movimiento horizontal o vertical
            if (from.row !== toRow && from.col !== toCol) {
                return false; // No es movimiento en línea recta
            }
            return this.isPathClear(from.row, from.col, toRow, toCol);
        }

        // Alfil (movimiento diagonal)
        if (piece === '♝' || piece === '♗') {
            if (rowDiff !== colDiff) return false; // No es diagonal
            return this.isPathClear(from.row, from.col, toRow, toCol);
        }

        // Caballo
        if (piece === '♞' || piece === '♘') {
            return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
        }

        // Rey
        if (piece === '♚' || piece === '♔') {
            return rowDiff <= 1 && colDiff <= 1;
        }

        return false;
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
        const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
        
        let row = fromRow + rowStep;
        let col = fromCol + colStep;
        
        while (row !== toRow || col !== toCol) {
            if (this.board[row][col] !== null) return false;
            row += rowStep;
            col += colStep;
        }
        return true;
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        console.log('\n=== INICIO DE MOVE PIECE ===');
        console.log(`🔀 Moviendo pieza de (${fromRow},${fromCol}) a (${toRow},${toCol})`);
        console.log('📊 Estado del tablero ANTES del movimiento:');
        console.table(this.board.map(row => [...row].map(cell => cell || '-')));
        
        const piece = this.board[fromRow][fromCol];
        if (!piece) {
            console.error('❌ No hay pieza en la posición de origen');
            return false;
        }
        
        const pieceColor = this.getPieceColor(piece);
        console.log(`📌 Pieza: ${piece} (${pieceColor})`);
        
        // Guardar el estado anterior para posibles rollbacks
        const previousState = {
            from: { row: fromRow, col: fromCol, piece },
            to: { row: toRow, col: toCol, piece: this.board[toRow]?.[toCol] || null }
        };
        
        console.log('💾 Estado anterior guardado:', previousState);
        
        try {
            // Verificar si las coordenadas son válidas
            if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
                throw new Error(`Coordenadas de destino (${toRow},${toCol}) fuera de rango`);
            }
            
            // Verificar que la pieza de origen existe
            if (!piece) {
                throw new Error(`No hay ninguna pieza en (${fromRow},${fromCol})`);
            }
            
            console.log(`🔄 Moviendo ${piece} de (${fromRow},${fromCol}) a (${toRow},${toCol})`);
            
            // Guardar la pieza de destino (si existe) para captura
            const capturedPiece = this.board[toRow][toCol];
            if (capturedPiece) {
                console.log(`🎯 Capturando pieza: ${capturedPiece} en (${toRow},${toCol})`);
            }
            
            // Realizar el movimiento
            this.board[toRow][toCol] = piece;  // Registrar captura si existe
            if (capturedPiece) {
                const capturedColor = this.getPieceColor(capturedPiece);
                this.capturedPieces[capturedColor].push(capturedPiece);
            }
            // Mover la pieza
            this.board[toRow][toCol] = piece;
            this.board[fromRow][fromCol] = null;  // Limpiar la posición anterior
            
            // Verificar que el movimiento se realizó correctamente
            if (this.board[toRow][toCol] !== piece) {
                throw new Error(`Error al mover la pieza a (${toRow},${toCol})`);
            }
            
            console.log('✅ Movimiento realizado con éxito');
            
            // Promoción de peón (simplificado)
            if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
                const newPiece = piece === '♙' ? '♕' : '♛';
                console.log(`👑 Promoción de peón a ${newPiece}`);
                this.board[toRow][toCol] = newPiece;
            }
            
            // Actualizar estado y renderizar
            this.updateStatus();
            this.selectedPiece = null;  // Deseleccionar la pieza después de mover
            
            console.log('🔄 Renderizando tablero...');
            this.renderBoard();
            this.renderCaptured();
            // NUEVO: disparar animación de explosión si hubo captura
            if (capturedPiece) {
                const targetSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
                if (targetSquare) {
                    targetSquare.classList.add('capture-explosion');
                    // Quitar la clase una vez terminada la animación
                    setTimeout(() => targetSquare.classList.remove('capture-explosion'), 600);
                }
            }
            this.updateCheckStatus();
            
            console.log('📊 Estado del tablero DESPUÉS del movimiento:');
            console.table(this.board.map(row => [...row].map(cell => cell || '-')));
            
            return true;
            
        } catch (error) {
            // Revertir el movimiento en caso de error
            console.error('❌ Error en movePiece:', error);
            console.log('⏪ Revertiendo movimiento...');
            
            // Restaurar el estado anterior
            this.board[fromRow][fromCol] = piece;
            this.board[toRow][toCol] = previousState.to.piece;
            
            return false;
        }
    }

    // Calcular si algún rey está en jaque
    updateCheckStatus() {
        this.checkStatus.white = this.isKingInCheck('white');
        this.checkStatus.black = this.isKingInCheck('black');
    }
    
    // Intenta realizar un enroque
    attemptCastling(toRow, toCol) {
        const { row: fromRow, col: fromCol } = this.selectedPiece;
        const piece = this.board[fromRow][fromCol];
        const color = this.getPieceColor(piece);
        
        console.log(`♜ Intento de enroque para las ${color === 'white' ? 'blancas' : 'negras'}`);
        
        // Determinar el lado del enroque (0 = dama, 7 = rey)
        const isKingSide = toCol > fromCol;
        const sideName = isKingSide ? 'corto' : 'largo';
        console.log(`♜ Enroque ${sideName} (${isKingSide ? 'rey' : 'dama'})`);
        
        // Verificar condiciones para el enroque
        if (!this.isValidCastling(color, isKingSide)) {
            console.log('❌ Condiciones de enroque no cumplidas');
            return false;
        }
        
        // Realizar el enroque
        const row = color === 'white' ? 7 : 0;
        const rookCol = isKingSide ? 7 : 0;
        const newKingCol = isKingSide ? 6 : 2;
        const newRookCol = isKingSide ? 5 : 3;
        
        console.log(`♜ Muevo rey a (${row},${newKingCol})`);
        console.log(`♜ Muevo torre a (${row},${newRookCol})`);
        
        // Mover el rey
        this.board[row][newKingCol] = piece;
        this.board[row][fromCol] = null;
        
        // Mover la torre
        this.board[row][newRookCol] = this.board[row][rookCol];
        this.board[row][rookCol] = null;
        
        // Actualizar posición del rey
        this.kingPositions[color] = { row, col: newKingCol };
        
        // Invalidar derechos de enroque para este jugador
        this.castlingRights[color].kingSide = false;
        this.castlingRights[color].queenSide = false;
        
        // Cambiar el turno
        this.currentPlayer = color === 'white' ? 'black' : 'white';
        
        // Actualizar el estado del juego
        this.updateStatus();
        
        console.log('✅ Enroque realizado con éxito');
        return true;
    }
    
    // Verifica si el enroque es válido
    isValidCastling(color, isKingSide) {
        const row = color === 'white' ? 7 : 0;
        const kingCol = 4;
        const rookCol = isKingSide ? 7 : 0;
        const newKingCol = isKingSide ? 6 : 2;
        const step = isKingSide ? 1 : -1;
        
        console.log(`♜ Validando enroque ${isKingSide ? 'corto' : 'largo'} para ${color}`);
        
        // Verificar que el rey y la torre no se hayan movido
        if (isKingSide && !this.castlingRights[color].kingSide) {
            console.log('❌ Ya no se puede hacer enroque corto');
            return false;
        }
        if (!isKingSide && !this.castlingRights[color].queenSide) {
            console.log('❌ Ya no se puede hacer enroque largo');
            return false;
        }
        
        // Verificar que no hay piezas entre el rey y la torre
        for (let col = kingCol + step; col !== rookCol; col += step) {
            if (this.board[row][col] !== null) {
                console.log(`❌ Hay una pieza en (${row},${col}) que bloquea el enroque`);
                return false;
            }
        }
        
        // Verificar que el rey no está en jaque
        if (this.isKingInCheck(color)) {
            console.log('❌ No se puede hacer enroque con el rey en jaque');
            return false;
        }
        
        // Verificar que el rey no pase por casillas en jaque
        for (let col = kingCol; col !== newKingCol; col += step) {
            // Verificar si la casilla está bajo ataque
            if (col !== kingCol) { // No necesitamos verificar la posición inicial del rey
                // Hacer una copia del tablero para simular
                const originalBoard = JSON.parse(JSON.stringify(this.board));
                // Mover el rey temporalmente
                this.board[row][col] = color === 'white' ? '♔' : '♚';
                this.board[row][kingCol] = null;
                
                const isCheck = this.isKingInCheck(color);
                
                // Restaurar el tablero
                this.board = originalBoard;
                
                if (isCheck) {
                    console.log(`❌ El rey pasa por una casilla en jaque (${row},${col})`);
                    return false;
                }
            }
        }
        
        console.log('✅ Condiciones de enroque cumplidas');
        return true;
    }
    
    // Alias para compatibilidad
    isInCheck(color) {
        return this.isKingInCheck(color);
    }

    highlightValidMoves(row, col) {
        console.log(`\n🎯 HIGHLIGHT VALID MOVES =====================`);
        console.log(`Buscando movimientos para pieza en (${row},${col})`);
        
        // Remover resaltados anteriores
        console.log('🧹 Limpiando resaltados anteriores...');
        document.querySelectorAll('.valid-move, .capture-move, .capture').forEach(el => {
            el.classList.remove('valid-move', 'capture-move', 'capture');
        });

        const piece = this.board[row][col];
        if (!piece) {
            console.log('❌ No hay pieza en la posición seleccionada');
            return;
        }

        const pieceColor = this.getPieceColor(piece);
        console.log(`🔍 Buscando movimientos para ${piece} (${pieceColor}) en (${row},${col})`);
        
        let validMovesCount = 0;
        
        // Resaltar movimientos válidos
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                // Solo verificar celdas que sean diferentes a la posición actual
                if (i === row && j === col) continue;
                
                const isValid = this.isValidMove({row, col}, i, j);
                console.log(`- Validar (${i},${j}): ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
                
                if (isValid) {
                    const square = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                    if (square) {
                        // Verificar si es una captura
                        const targetPiece = this.board[i][j];
                        if (targetPiece) {
                            square.classList.add('capture-move');
                            console.log(`  🎯 Movimiento de captura válido a (${i},${j})`);
                        } else {
                            square.classList.add('valid-move');
                            console.log(`  ✓ Movimiento válido a (${i},${j})`);
                        }
                        validMovesCount++;
                    } else {
                        console.error(`  ❌ No se encontró el elemento DOM para (${i},${j})`);
                    }
                }
            }
        }
        
        console.log(`🔍 Se encontraron ${validMovesCount} movimientos válidos`);
        if (validMovesCount === 0) {
            console.log('⚠️ No se encontraron movimientos válidos para esta pieza');
        }
    }
}

// Función para ejecutar pruebas
function runTests() {
    console.clear();
    const game = new ChessGame();
    const testResults = [];
    
    // Función auxiliar para agregar pruebas
    function addTest(description, testFn, expected) {
        const result = testFn();
        const passed = result === expected;
        testResults.push({
            test: description,
            result: passed,
            expected: expected,
            actual: result
        });
        return passed;
    }
    
    // Configurar el tablero para pruebas
    game.initializeBoard();
    
    // 1. Pruebas de movimiento de peones
    addTest('Peón blanco puede moverse 1 casilla hacia adelante', 
        () => game.isValidMove({row: 1, col: 0}, 2, 0), true);
    
    addTest('Peón blanco puede moverse 2 casillas en primer movimiento', 
        () => game.isValidMove({row: 1, col: 0}, 3, 0), true);
    
    addTest('Peón blanco no puede moverse 2 casillas después del primer movimiento', 
        () => {
            // Mover el peón una vez
            game.movePiece(1, 0, 2, 0);
            return game.isValidMove({row: 2, col: 0}, 4, 0);
        }, false);
    
    // Preparar tablero para peón negro
    game.initializeBoard();
    game.currentPlayer = 'black';
    
    addTest('Peón negro puede moverse 1 casilla hacia adelante', 
        () => game.isValidMove({row: 6, col: 0}, 5, 0), true);
    
    addTest('Peón negro puede moverse 2 casillas en primer movimiento', 
        () => game.isValidMove({row: 6, col: 0}, 4, 0), true);
    
    // 2. Pruebas de capturas
    game.initializeBoard();
    // Colocar una pieza negra para captura
    game.board[2][1] = '♟'; // Peón negro en posición de captura
    
    addTest('Peón blanco puede capturar en diagonal', 
        () => game.isValidMove({row: 1, col: 0}, 2, 1), true);
    
    addTest('Peón blanco no puede moverse en diagonal sin captura', 
        () => game.isValidMove({row: 1, col: 0}, 2, 2), false);
    
    // 3. Pruebas de piezas bloqueadas
    game.initializeBoard();
    // Bloquear peón blanco con una pieza blanca
    game.board[2][0] = '♙';
    
    addTest('Peón blanco no puede moverse si está bloqueado', 
        () => game.isValidMove({row: 1, col: 0}, 2, 0), false);
    
    // 4. Pruebas de torre
    game.initializeBoard();
    // Mover un peón para liberar la torre
    game.movePiece(1, 0, 2, 0);
    
    addTest('Torre puede moverse horizontalmente', 
        () => game.isValidMove({row: 0, col: 0}, 0, 7), true);
    
    addTest('Torre puede moverse verticalmente', 
        () => game.isValidMove({row: 0, col: 0}, 5, 0), true);
    
    addTest('Torre no puede moverse en diagonal', 
        () => game.isValidMove({row: 0, col: 0}, 5, 5), false);
    
    // Mostrar resultados detallados
    console.log('=== RESULTADOS DE LAS PRUEBAS ===\n');
    let passedTests = 0;
    
    testResults.forEach((test, index) => {
        const status = test.result ? '✅' : '❌';
        console.log(`${index + 1}. ${test.test}: ${status}`);
        
        if (!test.result) {
            console.log(`   ❌ Falló - Esperado: ${test.expected}, Obtenido: ${test.actual}`);
            console.log('   Estado del tablero:');
            console.table(game.board.map(row => [...row].map(cell => cell || '-')));
        } else {
            passedTests++;
        }
    });
    
    const totalTests = testResults.length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log('\n=== RESUMEN ===');
    console.log(`Pruebas pasadas: ${passedTests} de ${totalTests} (${successRate}%)`);
    
    if (passedTests === totalTests) {
        console.log('¡Todas las pruebas pasaron correctamente! 🎉');
    } else {
        console.log(`Hay ${totalTests - passedTests} pruebas fallidas que necesitan atención.`);
    }
    
    return game; // Devolver la instancia del juego para pruebas manuales
}

// Exportar la clase para pruebas (solo en entorno Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChessGame };
}

// Inicializar el juego cuando la página cargue
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM completamente cargado. Inicializando juego...');
        
        try {
            // Inicializar el juego
            const game = new ChessGame();
            
            // Hacer que el juego esté disponible globalmente para depuración
            window.chessGame = game;
            console.log('✅ Juego inicializado correctamente. Usa window.chessGame para depuración.');
            
            // Mostrar mensaje en la interfaz
            const statusElement = document.getElementById('status-text');
            if (statusElement) {
                statusElement.textContent = '¡Juego listo! Es el turno de las Blancas.';
            }
            
            // Opcional: Ejecutar pruebas (descomenta la siguiente línea si quieres ejecutar pruebas)
            // runTests();
        } catch (error) {
            console.error('❌ Error al inicializar el juego:', error);
            const statusElement = document.getElementById('status-text');
            if (statusElement) {
                statusElement.textContent = 'Error al cargar el juego. Por favor, recarga la página.';
                statusElement.style.color = 'red';
            }
        }
    });
}
