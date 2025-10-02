// Stockfish WASM Engine Wrapper
// Gestiona la comunicación con Stockfish via UCI protocol

export class StockfishEngine {
    constructor(on_ready_callback) {
        this._ready = false;
        this._on_ready = on_ready_callback;
        this._pending_callback = null;
        this._init_stockfish();
    }

    _init_stockfish() {
        try {
            // Intentar cargar versión ASM.js (más compatible, sin WASM)
            // Es más lento pero funciona sin problemas de CORS
            this._worker = new Worker('/js/stockfish-asm.js');
            this._setup_listeners();
            this._worker.postMessage('uci');
        } catch (error) {
            console.error('Error inicializando Stockfish:', error);
            // Fallback: ocultar loading y mostrar error
            if (this._on_ready) {
                setTimeout(() => this._on_ready(), 1000);
            }
        }
    }

    _setup_listeners() {
        this._worker.onmessage = (event) => {
            const line = event.data;

            // Debug log (comentar en producción)
            // console.log('Stockfish:', line);

            if (line === 'uciok') {
                // Stockfish confirmó soporte UCI
                this._worker.postMessage('isready');
            } else if (line === 'readyok') {
                // Stockfish está listo para recibir comandos
                this._ready = true;
                if (this._on_ready) {
                    this._on_ready();
                }
            } else if (line.startsWith('bestmove')) {
                // Formato: bestmove e2e4 ponder d7d5
                const match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
                if (match && this._pending_callback) {
                    const best_move = {
                        from: match[1],
                        to: match[2],
                        promotion: match[3] || 'q'
                    };
                    this._pending_callback(best_move);
                    this._pending_callback = null;
                }
            }
        };

        this._worker.onerror = (error) => {
            console.error('Error en Stockfish Worker:', error);
        };
    }

    /**
     * Obtiene el mejor movimiento para una posición FEN dada
     * @param {string} fen - Posición en notación FEN
     * @param {number} depth - Profundidad de búsqueda (1-20, default 15)
     * @returns {Promise<{from: string, to: string, promotion: string}>}
     */
    async get_best_move(fen, depth = 15) {
        if (!this._ready) {
            throw new Error('Stockfish no está listo aún');
        }

        return new Promise((resolve, reject) => {
            this._pending_callback = resolve;

            // Timeout de 30 segundos para depth alto
            const timeout = setTimeout(() => {
                reject(new Error('Timeout esperando respuesta de Stockfish'));
                this._pending_callback = null;
            }, 30000);

            // Limpiar timeout cuando se resuelva
            const original_callback = resolve;
            this._pending_callback = (move) => {
                clearTimeout(timeout);
                original_callback(move);
            };

            // Enviar comandos UCI
            this._worker.postMessage('ucinewgame');
            this._worker.postMessage(`position fen ${fen}`);
            this._worker.postMessage(`go depth ${depth}`);
        });
    }

    /**
     * Detiene el cálculo actual de Stockfish
     */
    stop() {
        if (this._worker) {
            this._worker.postMessage('stop');
        }
    }

    /**
     * Termina el worker de Stockfish
     */
    terminate() {
        if (this._worker) {
            this._worker.terminate();
            this._ready = false;
        }
    }
}
