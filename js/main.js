import { ChatManager } from '/js/chat.js';
import Chess from '/js/chess.js';
import { create_board } from '/js/render.js';

// ==================== CONSTANTES ====================
const PIECE_NAMES = {
    p: 'Peón', r: 'Torre', n: 'Caballo',
    b: 'Alfil', q: 'Dama', k: 'Rey'
};

// ==================== INICIALIZACIÓN ====================
const chat = new ChatManager();
const game = new Chess();
const chat_input = document.getElementById('chat-input');
const send_button = document.getElementById('send-button');
const chat_messages = document.getElementById('chat-messages');
const board_container = document.querySelector('.chessboard');

const ui = create_board(board_container, game, (from, to) => {
    if (game.move(from, to)) ui.render_board();
});

function set_form_disabled(disabled) {
    if (!chat_input || !send_button) return;
    chat_input.disabled = disabled;
    send_button.disabled = disabled;
    const input_wrapper = document.querySelector('.input-wrapper');
    if (input_wrapper) {
        input_wrapper.style.opacity = disabled ? '0.7' : '1';
        input_wrapper.style.cursor = disabled ? 'not-allowed' : 'auto';
    }
}

// Eventos del juego
game.on('move', (move) => {
    const color = move.color === 'w' ? 'Blancas' : 'Negras';
    const piece_name = `${PIECE_NAMES[move.piece] || 'Pieza'} (${move.piece.toUpperCase()})`;
    let move_text = `${color} mueven ${piece_name} de ${move.from.toUpperCase()} a ${move.to.toUpperCase()}`;
    if (move.captured) {
        const captured_piece = PIECE_NAMES[move.captured] || 'pieza';
        move_text += ` capturando ${captured_piece}`;
    }
    chat.create('info', move_text);
    if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'Negras' : 'Blancas';
        chat.create('info', `¡Jaque mate! Ganan las ${winner}`);
    } else if (game.in_check()) {
        chat.create('info', '¡Jaque!');
    } else if (game.in_draw()) {
        chat.create('info', '¡Empate!');
    }
});

game.on('turn', async function (action) {
    if (action.turn !== 'black' || game.in_checkmate()) return;
    const board_state = game.get_board_with_moves();

    const format_pieces = (color) => board_state
        .filter(piece => piece.color === color)
        .sort(() => Math.random() - 0.5)
        .map(piece => `${PIECE_NAMES[piece.name.toLowerCase()]} (${piece.position}) ${piece.canMove.length ? `se puede mover a: ${piece.canMove.join(', ')}` : "no se puede mover"}`)
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
                Jaque: ${game.in_checkmate() ? '¡ES JAQUE MATE!\n' : (
                    game.in_check() ? '¡ESTÁS EN JAQUE!\n' : 'NO ESTÁ EN JAQUE'
                )}

                === HISTORIAL DE LA PARTIDA ===
                ${chat.all().filter(m => m.type === 'info').map(m => m.text).join('\n') || 'Eres el primer movimiento, elige cualquier movimiento disponible.'}

                === POSICION DE LAS PIEZAS ===

                OPONENTE (${action.turn === 'black' ? 'BLANCAS' : 'NEGRAS'}):
                ${format_pieces(game.turn() === 'b' ? 'w' : 'b')}


                TUYAS (${action.turn === 'black' ? 'NEGRAS' : 'BLANCAS'}):
                ${format_pieces(action.turn === 'black' ? 'b' : 'w')}
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
            const response = await chat.ia(messages).then(e => e.trim().toUpperCase());

            if (response === 'O-O') {
                game.move('e8', 'g8');
                ui.render_board();
                return;
            }
            if (response === 'O-O-O') {
                game.move('e8', 'c8');
                ui.render_board();
                return;
            }

            const [from, to] = response.split('-').map(s => s.trim().toLowerCase());
            if (!from || !to) {
                throw new Error('Formato inválido. Usa ORIGEN-DESTINO (ej: E7-E5)');
            }

            const piece = board_state.find(p =>
                p.position === from &&
                p.canMove.includes(to) &&
                p.color === (action.turn === 'white' ? 'w' : 'b')
            );
            if (!piece) throw new Error(`No hay una pieza en ${from} que pueda moverse a ${to}`);

            const [file, rank] = from.split('');
            const col = 'abcdefgh'.indexOf(file);
            const row = 8 - parseInt(rank);
            ui.select_square(row, col);

            await new Promise(resolve => setTimeout(resolve, 500));

            const result = game.move(from, to);
            if (!result) throw new Error(`Movimiento inválido: ${from}-${to}`);
            ui.render_board();
            ui.clear_selection();
            break;
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
                ui.render_board();
                break;
            }
        }
    }
});

// Eventos del chat
chat.on_message(function (message) {
    if (!chat_messages || message.type === 'system') return;
    const message_div = document.createElement('div');
    message_div.className = `message ${message.type}`;
    if (message.type === 'user') {
        message_div.style.cssText = 'margin-left: auto; max-width: 80%;';
    }
    const time = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    message_div.innerHTML = `
        <div class="message-content">
            <div class="message-text">${message.text}</div>
            ${message.type !== 'info' ? `
                <div class="message-time">${time}</div>
            ` : ''}
        </div>
    `;
    chat_messages.appendChild(message_div);
    chat_messages.scrollTop = chat_messages.scrollHeight;
});

chat.on_message(async function reply(message, times = 0) {
    if (message.type === 'user') {
        try {
            set_form_disabled(true);

            const system_prompt = {
                role: "system",
                content: `Eres un jugador de ajedrez profesional.
                Eres conciso y estratégico.
                Responde en máximo 2 oraciones.
                Usa términos técnicos de ajedrez.
                Se objetivo y directo en tus análisis.
                Eres las piezas negras en esta partida.`
            };

            const current_turn = game.turn() === 'white' ? 'blancas' : 'negras';
            const pieces_info = game.get_board_with_moves()
                .map(p => `- ${PIECE_NAMES[p.name.toLowerCase()] || '?'} en ${p.position}${p.canMove?.length ? ` (${p.canMove.join(', ')})` : ''}`)
                .join('\n');

            const board_prompt = {
                role: "user",
                content: `[ESTADO DEL TABLERO]\nTurno actual: ${current_turn}\nEres las piezas negras.\n\n${pieces_info}\nNotación FEN: ${game.fen()}`
            };

            const chat_history = chat.all().map(({ type, text }) => ({
                role: type === 'user' ? 'user' : 'assistant',
                content: type === 'info' ? `[Sistema] ${text}` : text
            }));

            const response = await chat.ia([system_prompt, ...chat_history, board_prompt]);
            chat.create('assistant', response);

        } catch (error) {
            if (times < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return reply(message, times + 1);
            }
            chat.create('info', 'No se pudo obtener una respuesta del asistente.');
        } finally {
            set_form_disabled(false);
            chat_input?.focus();
        }
    }
});

// Eventos del DOM
document.addEventListener('DOMContentLoaded', () => {
    ui.render_board();
});
chat_input?.addEventListener('input', () => {
    chat_input.style.height = 'auto';
    chat_input.style.height = `${Math.min(chat_input.scrollHeight, 120)}px`;
});
chat_input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chat.create('user', chat_input?.value.trim());
        chat_input.value = '';
        chat_input.focus();
    }
});
send_button?.addEventListener('click', () => {
    chat.create('user', chat_input?.value.trim());
    chat_input.value = '';
    chat_input.focus();
});
