// Estado global de mensajes
let messages = [];
const listeners = [];

// Emitir evento a los listeners
function emit(message) {
  listeners.forEach(callback => callback(message, [...messages]));
}

/**
 * Crea un nuevo mensaje y notifica a los listeners
 * @param {string} type - Tipo de mensaje ('user', 'assistant', 'system', 'info')
 * @param {string} text - Contenido del mensaje
 * @returns {Object} El mensaje creado
 */
export function create(type, text) {
  const message = { type, text, timestamp: Date.now() };
  messages.push(message);
  emit(message);
  return message;
}

/**
 * Obtiene todos los mensajes
 * @returns {Array} Copia del arreglo de mensajes
 */
export function all() {
  return [...messages];
}

/**
 * Suscribe un callback para recibir notificaciones de nuevos mensajes
 * @param {Function} callback - Función que recibe (message, allMessages)
 * @returns {Function} Función para desuscribirse
 */
export function onMessage(callback) {
  listeners.push(callback);
  // Devolver función para desuscribirse
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) listeners.splice(index, 1);
  };
}

/**
 * Envía los mensajes al endpoint de IA y devuelve la respuesta
 * @param {Array<Object>} messages - Array de mensajes a enviar a la IA
 * @returns {Promise<string>} Respuesta del asistente
 */
export async function ia(messages) {
  let attempts = 0;
  while (true) {
    const response = await fetch('https://api.arcaelas.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 8cc73bdd-dfc8-415b-a1b2-cd18bb5007ff'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content;
    } else if (attempts === 5) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error en la API');
    }
    attempts++;
  }
}
