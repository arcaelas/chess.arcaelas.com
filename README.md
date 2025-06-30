# Chess AI Web

Juego de ajedrez en línea con motor integrado, interfaz moderna y asistente IA para análisis de jugadas.

## Índice
1. [Introducción](#introducción)
2. [Características](#características)
3. [Requisitos](#requisitos)
4. [Instalación-y-configuración](#instalación-y-configuración)
5. [Scripts-disponibles](#scripts-disponibles)
6. [Estructura-del-proyecto](#estructura-del-proyecto)
7. [Arquitectura-y-funcionamiento](#arquitectura-y-funcionamiento)
8. [Guía-de-uso](#guía-de-uso)
9. [Casos-de-uso](#casos-de-uso)
10. [Pruebas](#pruebas)
11. [Posibles-errores-y-solución](#posibles-errores-y-solución)
12. [Contribuir](#contribuir)
13. [Licencia](#licencia)

## Introducción
Aplicación SPA que permite jugar ajedrez desde el navegador sin instalaciones adicionales. Incorpora:
* Tablero interactivo drag-and-drop.
* Reglas completas (jaque, enroque, promoción, tablas).
* Motor IA (opcional) mediante API externa.
* Chat de análisis estilo *coach* con IA.

## Características
- **Motor dual**: se incluye wrapper sobre `chess.js` y un motor propio (`script.js`) para demostración.
- **Tailwind CSS**: diseño responsivo y minimalista sin hojas de estilo personalizadas.
- **Eventos y render desacoplados** para fácil mantenimiento.
- **Pruebas Jest** con cobertura sobre el motor personalizado.

## Requisitos
- Node ≥ 18 y Yarn ≥ 1.22.
- Navegador moderno con soporte ES modules.

## Instalación y configuración
```bash
# Clonar repositorio
git clone https://github.com/tu_usuario/chess.arcaelas.com.git
cd chess.arcaelas.com

# Instalar dependencias
yarn install

# (Opcional) Construir Tailwind
yarn build:css
```

## Scripts disponibles
| Script          | Descripción                                    |
|-----------------|------------------------------------------------|
| `yarn serve`    | Sirve sitio en `http://localhost:8080`.        |
| `yarn test`     | Ejecuta pruebas unitarias (Jest).             |
| `yarn test:watch` | Ejecuta pruebas en modo watch.              |
| `yarn build:css` | Compila Tailwind a `css/styles.css`.          |

## Estructura del proyecto
```
chess.arcaelas.com/
├── js/                # Módulos ES
│   ├── chess.js       # Wrapper sobre chess.js
│   ├── render.js      # Renderizado del tablero
│   ├── chat.js        # Gestión de chat e IA
│   └── main.js        # Orquestador de UI y juego
├── css/               # Hoja generada por Tailwind
├── script.js          # Motor propio "monolítico"
├── index.html         # Entrada principal
├── tests *.js         # Pruebas Jest
└── package.json
```

## Arquitectura y funcionamiento
### Motor `js/chess.js`
Wrapper ligero que expone eventos (`move`, `turn`, `check`, etc.) sobre la biblioteca `chess.js` (CDN). Responsable de validar reglas.

### Renderizado `js/render.js`
Genera elementos DOM (`div.square`) y aplica clases Tailwind para colorear el tablero. Se comunica con `main.js` mediante callbacks.

### Chat IA `js/chat.js`
- Maneja historial de mensajes en memoria.
- Expone función `ia(messages)` que llama a tu backend/endpoint OpenAI. Se gestiona en `main.js`.

### Motor alternativo `script.js`
Implementación casera de lógica de ajedrez que incluye pruebas internas (`runTests`). Útil para comparar algoritmos o ejecutar sin dependencia externa.

### Flujo principal
1. `index.html` carga `main.js` (ESM).
2. `main.js` instancia `Chess`, crea tablero vía `createBoard()` y registra listeners.
3. Al mover pieza ➜ `move` emite evento ➜ UI actualiza y chat recibe contexto.
4. Si es turno de IA negra, `main.js` consulta `ia()` y procesa respuesta.

## Guía de uso
### Jugar en local
```bash
yarn serve
# Abrir http://localhost:8080 en el navegador
```
Arrastra piezas; usa área de chat para conversar con la IA.

### Producción (GitHub Pages)
La rama `main` se publica automáticamente. Visita `https://chess.arcaelas.com`.

## Casos de uso
1. **Humano vs Humano**: desactiva IA y alterna jugadores locales.
2. **Humano vs IA**: IA juega con negras; evalúa posiciones y responde en chat.
3. **Análisis post-partida**: recarga partida FEN y solicita sugerencias a la IA.

## Pruebas
```bash
yarn test # Ejecuta jest
```
Se incluyen suites:
- `chess.test.js` (básico wrapper).
- `chess.detailed.test.js` (escenarios completos).

## Posibles errores y solución
| Error                                         | Causa probable                            | Solución                                |
|-----------------------------------------------|-------------------------------------------|-----------------------------------------|
| `EADDRINUSE :8080`                            | Puerto ocupado                             | `PORT=8081 yarn serve`                  |
| Falla descarga `chess.js` CDN                 | Conexión o CDN caído                      | Cambiar URL o instalar localmente.      |
| `TypeError ia is not a function`              | Backend IA no configurado                 | Revisar `js/chat.js` y variable API_KEY |
| Tablero no aplica estilos Tailwind            | Falta compilar Tailwind                   | Ejecutar `yarn build:css`               |
| Pruebas Jest fallan por import ES             | Versión Node o jest-esm incorrecta        | Asegurar Node ≥18 y configurar `jest.config.mjs` con `"extensionsToTreatAsEsm": [".js"]` |

## Contribuir
Las *pull requests* son bienvenidas. Para cambios mayores, abre primero un *issue* indicando la propuesta.

1. Haz *fork* y crea una rama (`git checkout -b feature/nombre`).
2. Asegúrate de que las pruebas pasen (`yarn test`).
3. Sigue la guía de estilo del proyecto.
4. Envía la *pull request* con descripción clara.

## Licencia
Distribuido bajo licencia MIT.

