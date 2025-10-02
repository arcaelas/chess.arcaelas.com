import { ChatManager } from '/js/chat.js';
import Chess from '/js/chess.js';
import { create_board } from '/js/render.js';
import { StockfishEngine } from '/js/stockfish_engine.js';

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

// Inicializar Stockfish con callback para ocultar loading
const stockfish = new StockfishEngine(() => {
    const loading_screen = document.getElementById('loading-screen');
    const loading_text = document.getElementById('loading-text');

    if (loading_text) loading_text.textContent = '¡Listo para jugar!';

    if (loading_screen) {
        setTimeout(() => {
            loading_screen.style.opacity = '0';
            setTimeout(() => {
                loading_screen.style.display = 'none';
            }, 500);
        }, 800);
    }
});

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

    try {
        // Obtener posición actual en formato FEN
        const fen = game.fen();

        // Obtener mejor movimiento de Stockfish (depth 15 = ~2500 ELO)
        const best_move = await stockfish.get_best_move(fen, 15);

        // Animación visual de selección de pieza
        const [file, rank] = best_move.from.split('');
        const col = 'abcdefgh'.indexOf(file);
        const row = 8 - parseInt(rank);
        ui.select_square(row, col);

        // Delay para visualizar el movimiento
        await new Promise(resolve => setTimeout(resolve, 500));

        // Ejecutar el movimiento
        const result = game.move(best_move.from, best_move.to, best_move.promotion);

        if (!result) {
            console.error(`Stockfish sugirió movimiento inválido: ${best_move.from}-${best_move.to}`);
            return;
        }

        // Actualizar tablero y limpiar selección
        ui.render_board();
        ui.clear_selection();

    } catch (error) {
        console.error('Error en turno de Stockfish:', error);
        chat.create('info', 'Error al calcular movimiento de la IA');
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
