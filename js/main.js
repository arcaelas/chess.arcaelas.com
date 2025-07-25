import { all, create, ia, onMessage } from '/js/chat.js';
import Chess from '/js/chess.js';
import { createBoard } from '/js/render.js';

// ==================== INICIALIZACIÓN ====================
function setFormDisabled(disabled) {
    if (!chatInput || !sendButton) return;
    chatInput.disabled = disabled;
    sendButton.disabled = disabled;
    const inputWrapper = document.querySelector('.input-wrapper');
    if (inputWrapper) {
        inputWrapper.style.opacity = disabled ? '0.7' : '1';
        inputWrapper.style.cursor = disabled ? 'not-allowed' : 'auto';
    }
}

// Inicializacion de variables
const game = new Chess();
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const boardContainer = document.querySelector('.chessboard');
const ui = createBoard(boardContainer, game, (from, to) => {
    if (game.move(from, to)) ui.renderBoard();
});

// Eventos del juego
game.on('move', (move) => {
    const color = move.color === 'w' ? 'Blancas' : 'Negras';
    const pieceNames = {
        p: 'Peón (P)',
        r: 'Torre (T)',
        n: 'Caballo (C)',
        b: 'Alfil (A)',
        q: 'Dama (D)',
        k: 'Rey (R)'
    };
    const pieceName = pieceNames[move.piece] || 'Pieza';
    let moveText = `${color} mueven ${pieceName} de ${move.from.toUpperCase()} a ${move.to.toUpperCase()}`;
    if (move.captured) {
        const capturedPiece = pieceNames[move.captured] || 'pieza';
        moveText += ` capturando ${capturedPiece}`;
    }
    create('info', moveText);
    if (game.inCheckmate()) {
        const winner = game.turn() === 'w' ? 'Negras' : 'Blancas';
        create('info', `¡Jaque mate! Ganan las ${winner}`);
    } else if (game.inCheck()) {
        create('info', '¡Jaque!');
    } else if (game.inDraw()) {
        create('info', '¡Empate!');
    }
});

// Eliminamos el manejador de captura ya que ahora lo manejamos en el evento 'move'
// para mostrar un mensaje más completo que incluya la captura junto con el movimiento
game.on('turn', async function (action) {
    if (action.turn !== 'black' || game.inCheckmate()) return;
    const boardState = game.getBoardWithMoves();
    const pieceNames = {
        'p': 'Peón',
        'r': 'Torre',
        'n': 'Caballo',
        'b': 'Alfil',
        'q': 'Dama',
        'k': 'Rey'
    };
    // Formatear las piezas para el análisis
    const formatPieces = (color) => boardState
        .filter(piece => piece.color === color)
        .sort(() => Math.random() - 0.5)
        .map(piece => `${pieceNames[piece.name.toLowerCase()]} (${piece.position}) ${piece.canMove.length ? `se puede mover a: ${piece.canMove.join(', ')}` : "no se puede mover"}`)
        .join('\n');

    const messages = [
        {
            role: 'system',
            content: `
            Eres un Gran Maestro de ajedrez jugando con las piezas ${action.turn === 'black' ? 'negras' : 'blancas'}.
            Tu estilo es:
                - Estratégico y posicional
                - Defensivo pero contundente en el contraataque
                - Paciente, buscando siempre la mejor jugada
                - Analítico, considerando múltiples variantes
            `
        },
        {
            role: 'user',
            content: `
                === ESTADO ACTUAL ===
                Turno: ${action.turn === 'black' ? 'NEGRAS' : 'BLANCAS'}
                Jaque: ${game.inCheckmate() ? '¡ES JAQUE MATE!\n' : (
                    game.inCheck() ? '¡ESTÁS EN JAQUE!\n' : 'NO ESTÁ EN JAQUE'
                )}

                === HISTORIAL DE LA PARTIDA ===
                ${all().filter(m => m.type === 'info').map(m => m.text).join('\n') || 'Eres el primer movimiento, elige cualquier movimiento disponible.'}

                === POSICION DE LAS PIEZAS ===

                OPONENTE (${action.turn === 'black' ? 'BLANCAS' : 'NEGRAS'}):
                ${formatPieces(game.turn() === 'b' ? 'w' : 'b')}


                TUYAS (${action.turn === 'black' ? 'NEGRAS' : 'BLANCAS'}):
                ${formatPieces(action.turn === 'black' ? 'b' : 'w')}
            `
        },
        {
            role: 'assistant',
            content: 'He analizado mi posicion y ya tengo un movimiento listo para mis piezas de color ' + (action.turn === 'black' ? 'NEGRO' : 'BLANCO') + '.'
        },
        {
            role: 'user',
            content: `
                Analiza tu posicion cuidadosamente y los movimientos que puedes hacer antes de responder.
                Considera lo siguiente:
                    - Seguridad de tu rey
                    - Actividad de tus piezas
                    - Posibles tácticas o amenazas luego de jugar.
                    - No respondas movimientos incorrectos o no disponibles.
                    - Ya tienes informacion sobre las posiciones de las piezas en el tablero.
                    - Ya tienes informacion sobre el historial de la partida para que pienses como ha jugado tu oponente en cada movimiento.
                Responde únicamente con tu movimiento en el formato ORIGEN-DESTINO (ej: E7-E5, O-O, O-O-O).

                Tu respuesta (EJEMPLO: E7-E5):
            `
        }
    ];

    let attempts = 0;
    while (true) {
        try {
            const response = await ia(messages).then(e => e.trim().toUpperCase());

            // Procesar enroques
            if (response === 'O-O') {
                game.move('e8', 'g8');
                ui.renderBoard();
                return;
            }
            if (response === 'O-O-O') {
                game.move('e8', 'c8');
                ui.renderBoard();
                return;
            }

            // Validar formato del movimiento
            const [from, to] = response.split('-').map(s => s.trim().toLowerCase());
            if (!from || !to) {
                throw new Error('Formato inválido. Usa ORIGEN-DESTINO (ej: E7-E5)');
            }

            // Validar pieza y movimiento
            const piece = boardState.find(p =>
                p.position === from &&
                p.canMove.includes(to) &&
                p.color === (action.turn === 'white' ? 'w' : 'b')
            );
            if (!piece) throw new Error(`No hay una pieza en ${from} que pueda moverse a ${to}`);

            const [file, rank] = from.split('');
            const col = 'abcdefgh'.indexOf(file);
            const row = 8 - parseInt(rank);
            ui.selectSquare(row, col);

            await new Promise(resolve => setTimeout(resolve, 500));

            const result = game.move(from, to);
            if (!result) throw new Error(`Movimiento inválido: ${from}-${to}`);
            ui.renderBoard();
            ui.clearSelection();
            break
        } catch (error) {
            attempts++;
            if (attempts === 1) {
                messages.push({
                    role: 'user',
                    content: `
                        Tu respuesta genera un error en el juego: ${error.message}
                        Revisa tu respuesta y vuelve a intentar.
                    `
                });
            } else if (attempts <= 5) {
                await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            } else if (attempts <= 10) {
                await new Promise(resolve => setTimeout(resolve, attempts * 150));
            } else {
                game.undo();
                ui.renderBoard();
                break;
            }
        }
    }
});

// Eventos del chat
onMessage(function (message) {
    if (!chatMessages || message.type === 'system') return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    if (message.type === 'user') {
        messageDiv.style.cssText = 'margin-left: auto; max-width: 80%;';
    }
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${message.text}</div>
            ${message.type !== 'info' ? `
                <div class="message-time">${time}</div>
            ` : ''}
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Función para obtener el estado actual del tablero en notación FEN
function getBoardState() {
    return game.fen();
}

// Función para formatear las piezas y sus movimientos
function formatPiecesInfo() {
    const boardState = game.getBoardWithMoves();
    const formatPieces = (color) => {
        return boardState
            .filter(piece => piece.color === color)
            .map(p => {
                const pieceName = {
                    'p': 'Peón', 'r': 'Torre', 'n': 'Caballo',
                    'b': 'Alfil', 'q': 'Dama', 'k': 'Rey'
                }[p.name.toLowerCase()] || '?';
                return `- ${pieceName} en ${p.position}${p.canMove?.length ? ` (${p.canMove.join(', ')})` : ''}`;
            })
            .join('\n');
    };

    return `Piezas blancas:\n${formatPieces('w')}\n\nPiezas negras:\n${formatPieces('b')}`;
}

onMessage(async function reply(message, times = 0) {
    if (message.type === 'user') {
        try {
            setFormDisabled(true);

            // 1. Personalidad del asistente
            const systemPrompt = {
                role: "system",
                content: `Eres un jugador de ajedrez profesional.
                Eres conciso y estratégico.
                Responde en máximo 2 oraciones.
                Usa términos técnicos de ajedrez.
                Se objetivo y directo en tus análisis.
                Eres las piezas negras en esta partida.`
            };
            // 2. Contexto del tablero
            const currentTurn = game.turn() === 'white' ? 'blancas' : 'negras';
            const boardPrompt = {
                role: "user",
                content: `[ESTADO DEL TABLERO]\nTurno actual: ${currentTurn}\nEres las piezas negras.\n\n${formatPiecesInfo()}\nNotación FEN: ${getBoardState()}`
            };
            // 3. Historial de mensajes
            const chatHistory = all().map(({ type, text }) => ({
                role: type === 'user' ? 'user' : 'assistant',
                content: type === 'info' ? `[Sistema] ${text}` : text
            }));
            const response = await ia([systemPrompt, ...chatHistory, boardPrompt]);
            create('assistant', response);

        } catch (error) {
            if (times < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return reply(message, times + 1);
            }
            create('info', 'No se pudo obtener una respuesta del asistente.');
        } finally {
            setFormDisabled(false);
            chatInput?.focus();
        }
    }
});

// Eventos del DOM
document.addEventListener('DOMContentLoaded', () => {
    ui.renderBoard();
});
chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`;
});
chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        create('user', chatInput?.value.trim());
        chatInput.value = '';
        chatInput.focus();
    }
});
sendButton?.addEventListener('click', () => {
    create('user', chatInput?.value.trim());
    chatInput.value = '';
    chatInput.focus();
});