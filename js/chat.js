// Gestor de chat sin variables globales
export class ChatManager {
  constructor() {
    this._messages = [];
    this._listeners = [];
  }

  /**
   * Emitir evento a los listeners
   */
  _emit(message) {
    this._listeners.forEach((callback) =>
      callback(message, [...this._messages])
    );
  }

  /**
   * Crea un nuevo mensaje y notifica a los listeners
   * @param {string} type - Tipo de mensaje ('user', 'assistant', 'system', 'info')
   * @param {string} text - Contenido del mensaje
   * @returns {Object} El mensaje creado
   */
  create(type, text) {
    const message = { type, text, timestamp: Date.now() };
    this._messages.push(message);
    this._emit(message);
    return message;
  }

  /**
   * Obtiene todos los mensajes
   * @returns {Array} Copia del arreglo de mensajes
   */
  all() {
    return [...this._messages];
  }

  /**
   * Suscribe un callback para recibir notificaciones de nuevos mensajes
   * @param {Function} callback - Función que recibe (message, allMessages)
   * @returns {Function} Función para desuscribirse
   */
  on_message(callback) {
    this._listeners.push(callback);
    return () => {
      const index = this._listeners.indexOf(callback);
      if (index !== -1) this._listeners.splice(index, 1);
    };
  }

  /**
   * Envía los mensajes al endpoint de IA y devuelve la respuesta
   * @param {Array<Object>} messages - Array de mensajes a enviar a la IA
   * @returns {Promise<string>} Respuesta del asistente
   */
  async ia(messages) {
    const API_KEY = "8cc73bdd-dfc8-415b-a1b2-cd18bb5007ff"; // TODO: Mover a variables de entorno
    let attempts = 0;
    while (true) {
      const response = await fetch(
        "https://api.arcaelas.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: "o4-mini",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content;
      } else if (attempts === 5) {
        const error = await response.json();
        throw new Error(error.error?.message || "Error en la API");
      }
      attempts++;
    }
  }
}
