import {
  parsearEnteroSeguro,
  generarPrimoAleatorio,
  generarExponentePublico,
  generarClavesRSA,
  cifrarMensaje,
  descifrarMensaje
} from "./rsa-math.js";

// Estado en memoria de la sesión actual
let estadoClaves = null;
let ultimoMensajeOriginal = "";
let ultimosBloquesCifrados = [];

// Referencias del DOM seleccionadas una sola vez
const vistaPortada = document.querySelector("#vista-portada");
const vistaAplicacion = document.querySelector("#vista-aplicacion");
const btnIngresar = document.querySelector("#btn-ingresar");
const btnVolverPortada = document.querySelector("#btn-volver-portada");

const formClaves = document.querySelector("#form-claves");
const inputP = document.querySelector("#input-p");
const inputQ = document.querySelector("#input-q");
const inputE = document.querySelector("#input-e");
const btnGenerarPrimos = document.querySelector("#btn-generar-primos");
const btnGenerarE = document.querySelector("#btn-generar-e");
const btnCargarDemo = document.querySelector("#btn-cargar-demo");
const btnLimpiarTodo = document.querySelector("#btn-limpiar-todo");
const mensajeClaves = document.querySelector("#mensaje-claves");

const resN = document.querySelector("#res-n");
const resPhi = document.querySelector("#res-phi");
const resPublica = document.querySelector("#res-publica");
const resPrivada = document.querySelector("#res-privada");
const resVerificacion = document.querySelector("#res-verificacion");
const listaEuclides = document.querySelector("#lista-euclides");
const listaEuclidesExt = document.querySelector("#lista-euclides-ext");

const formCifrar = document.querySelector("#form-cifrar");
const inputMensaje = document.querySelector("#input-mensaje");
const btnEnviarADescifrar = document.querySelector("#btn-enviar-a-descifrar");
const btnCopiarCifrado = document.querySelector("#btn-copiar-cifrado");
const mensajeCifradoEstado = document.querySelector("#mensaje-cifrado-estado");
const salidaBloquesM = document.querySelector("#salida-bloques-m");
const salidaCifrado = document.querySelector("#salida-cifrado");
const tablaCifradoBody = document.querySelector("#tabla-cifrado-body");

const formDescifrar = document.querySelector("#form-descifrar");
const inputCifrado = document.querySelector("#input-cifrado");
const checkClaveManual = document.querySelector("#check-clave-manual");
const camposClaveManual = document.querySelector("#campos-clave-manual");
const inputNManual = document.querySelector("#input-n-manual");
const inputDManual = document.querySelector("#input-d-manual");
const mensajeDescifradoEstado = document.querySelector("#mensaje-descifrado-estado");
const salidaBloquesDescifrados = document.querySelector("#salida-bloques-descifrados");
const salidaRecuperado = document.querySelector("#salida-recuperado");
const resComparacion = document.querySelector("#res-comparacion");
const tablaDescifradoBody = document.querySelector("#tabla-descifrado-body");

const modalCodigo = document.querySelector("#modal-codigo");
const btnVerCodigo = document.querySelector("#btn-ver-codigo");
const btnCerrarModal = document.querySelector("#btn-cerrar-modal");
const visorCodigo = document.querySelector("#visor-codigo");
const estadoVisorCodigo = document.querySelector("#estado-visor-codigo");

// Utilidades de UI
function mostrarAviso(elemento, texto, tipo = "") {
  elemento.textContent = texto;
  elemento.className = "aviso";
  if (tipo) {
    elemento.classList.add(`aviso-${tipo}`);
  }
}

function renderizarListaPasos(contenedor, pasos) {
  contenedor.replaceChildren();
  pasos.forEach((paso) => {
    const li = document.createElement("li");
    li.textContent = paso.expresion;
    contenedor.append(li);
  });
}

function crearFilaTabla(celdas) {
  const tr = document.createElement("tr");
  celdas.forEach((contenido) => {
    const td = document.createElement("td");
    td.textContent = contenido;
    tr.append(td);
  });
  return tr;
}

function parsearListaBloques(texto) {
  const limpio = texto.replace(/[()[\]]/g, " ").trim();
  if (!limpio) return [];
  const partes = limpio.split(/[\s,;]+/).filter(Boolean);
  return partes.map((parte, indice) =>
    parsearEnteroSeguro(parte, `bloque #${indice + 1}`)
  );
}

// Navegación entre portada y herramienta
btnIngresar.addEventListener("click", () => {
  vistaPortada.classList.add("oculto");
  vistaAplicacion.classList.remove("oculto");
  inputP.focus();
});

btnVolverPortada.addEventListener("click", () => {
  vistaAplicacion.classList.add("oculto");
  vistaPortada.classList.remove("oculto");
});

// Generación de primos p y q (rango 23..199 asegura n > 500, apto para ASCII y tildes)
btnGenerarPrimos.addEventListener("click", () => {
  const p = generarPrimoAleatorio(23, 199);
  const q = generarPrimoAleatorio(23, 199, p);
  inputP.value = p.toString();
  inputQ.value = q.toString();
  inputE.value = "";
  mostrarAviso(mensajeClaves, `Primos generados: p = ${p}, q = ${q}. Pulsa "Calcular claves".`, "alerta");
});

// Sugerencia de exponente público e válido
btnGenerarE.addEventListener("click", () => {
  try {
    const p = parsearEnteroSeguro(inputP.value, "p");
    const q = parsearEnteroSeguro(inputQ.value, "q");
    if (p === q || p < 2n || q < 2n) {
      throw new Error("Primero ingresa o genera dos primos distintos p y q.");
    }
    const phi = (p - 1n) * (q - 1n);
    const eSugerido = generarExponentePublico(phi);
    inputE.value = eSugerido.toString();
    mostrarAviso(mensajeClaves, `Exponente sugerido: e = ${eSugerido} (coprimo con φ(n) = ${phi}).`, "exito");
  } catch (err) {
    mostrarAviso(mensajeClaves, err.message, "error");
  }
});

// Carga del caso de prueba de referencia #1 (p=17, q=19, e=5, mensaje=HOLA)
btnCargarDemo.addEventListener("click", () => {
  inputP.value = "17";
  inputQ.value = "19";
  inputE.value = "5";
  inputMensaje.value = "HOLA";
  formClaves.requestSubmit();
});

// Limpieza completa para iniciar nuevas pruebas
btnLimpiarTodo.addEventListener("click", () => {
  estadoClaves = null;
  ultimoMensajeOriginal = "";
  ultimosBloquesCifrados = [];
  formClaves.reset();
  formCifrar.reset();
  formDescifrar.reset();
  camposClaveManual.classList.add("oculto");

  resN.textContent = "—";
  resPhi.textContent = "—";
  resPublica.textContent = "—";
  resPrivada.textContent = "—";
  resVerificacion.textContent = "";
  listaEuclides.replaceChildren();
  listaEuclidesExt.replaceChildren();

  salidaBloquesM.textContent = "—";
  salidaCifrado.textContent = "—";
  tablaCifradoBody.replaceChildren();

  salidaBloquesDescifrados.textContent = "—";
  salidaRecuperado.textContent = "—";
  resComparacion.textContent = "";
  tablaDescifradoBody.replaceChildren();

  mostrarAviso(mensajeClaves, "Campos reiniciados. Listo para una nueva prueba.", "alerta");
  mostrarAviso(mensajeCifradoEstado, "");
  mostrarAviso(mensajeDescifradoEstado, "");
});

// Cálculo y validación de claves RSA
formClaves.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const p = parsearEnteroSeguro(inputP.value, "p");
    const q = parsearEnteroSeguro(inputQ.value, "q");
    const eManual = inputE.value.trim() ? parsearEnteroSeguro(inputE.value, "e") : null;

    const claves = generarClavesRSA(p, q, eManual);
    estadoClaves = claves;
    inputE.value = claves.e.toString();

    resN.textContent = claves.n.toString();
    resPhi.textContent = claves.phi.toString();
    resPublica.textContent = `(${claves.n}, ${claves.e})`;
    resPrivada.textContent = `(${claves.n}, ${claves.d})`;

    const productoED = claves.e * claves.d;
    resVerificacion.textContent =
      `Comprobación: e × d = ${claves.e} × ${claves.d} = ${productoED} ≡ ${productoED % claves.phi} (mód ${claves.phi})`;

    renderizarListaPasos(listaEuclides, claves.pasosEuclides);
    renderizarListaPasos(listaEuclidesExt, claves.pasosExtendidos);

    mostrarAviso(
      mensajeClaves,
      "Claves pública y privada generadas y verificadas correctamente.",
      "exito"
    );
  } catch (err) {
    estadoClaves = null;
    mostrarAviso(mensajeClaves, err.message, "error");
  }
});

// Cifrado del mensaje
formCifrar.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    if (!estadoClaves) {
      throw new Error("Primero genera o calcula las claves RSA en el Paso 1.");
    }

    const texto = inputMensaje.value;
    const { e, n } = estadoClaves.clavePublica;
    const resultado = cifrarMensaje(texto, e, n);

    ultimoMensajeOriginal = texto;
    ultimosBloquesCifrados = resultado.bloquesC;

    salidaBloquesM.textContent = `(${resultado.bloquesM.join(", ")})`;
    salidaCifrado.textContent = `(${resultado.bloquesC.join(", ")})`;

    tablaCifradoBody.replaceChildren();
    resultado.detalle.forEach(({ caracter, codigoM, cifradoC }) => {
      const etiquetaCaracter = caracter === " " ? "[espacio]" : caracter;
      tablaCifradoBody.append(
        crearFilaTabla([
          etiquetaCaracter,
          codigoM.toString(),
          `${codigoM}^${e} mód ${n}`,
          cifradoC.toString()
        ])
      );
    });

    mostrarAviso(
      mensajeCifradoEstado,
      `Mensaje cifrado con éxito (${resultado.bloquesC.length} bloques).`,
      "exito"
    );
  } catch (err) {
    mostrarAviso(mensajeCifradoEstado, err.message, "error");
  }
});

// Pasar resultado cifrado al campo de descifrado
btnEnviarADescifrar.addEventListener("click", () => {
  if (ultimosBloquesCifrados.length === 0) {
    mostrarAviso(mensajeCifradoEstado, "Aún no hay un mensaje cifrado para transferir.", "alerta");
    return;
  }
  inputCifrado.value = ultimosBloquesCifrados.join(", ");
  mostrarAviso(mensajeDescifradoEstado, "Bloques cifrados cargados. Pulsa \"Descifrar mensaje\".", "alerta");
  inputCifrado.focus();
});

// Copiar bloques cifrados al portapapeles
btnCopiarCifrado.addEventListener("click", async () => {
  if (ultimosBloquesCifrados.length === 0) {
    mostrarAviso(mensajeCifradoEstado, "No hay resultado cifrado para copiar.", "alerta");
    return;
  }
  try {
    await navigator.clipboard.writeText(ultimosBloquesCifrados.join(", "));
    mostrarAviso(mensajeCifradoEstado, "Bloques cifrados copiados al portapapeles.", "exito");
  } catch (err) {
    console.error(err);
    mostrarAviso(mensajeCifradoEstado, "No se pudo copiar automáticamente; selecciona el texto manualmente.", "alerta");
  }
});

// Mostrar u ocultar campos de clave privada manual
checkClaveManual.addEventListener("change", () => {
  camposClaveManual.classList.toggle("oculto", !checkClaveManual.checked);
});

// Descifrado del mensaje
formDescifrar.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    let n;
    let d;

    if (checkClaveManual.checked) {
      n = parsearEnteroSeguro(inputNManual.value, "módulo n manual");
      d = parsearEnteroSeguro(inputDManual.value, "exponente d manual");
    } else {
      if (!estadoClaves) {
        throw new Error("Genera las claves en el Paso 1 o activa la opción de clave privada manual.");
      }
      ({ n, d } = estadoClaves.clavePrivada);
    }

    const bloquesC = parsearListaBloques(inputCifrado.value);
    const resultado = descifrarMensaje(bloquesC, d, n);

    salidaBloquesDescifrados.textContent = `(${resultado.bloquesM.join(", ")})`;
    salidaRecuperado.textContent = resultado.textoRecuperado;

    tablaDescifradoBody.replaceChildren();
    resultado.detalle.forEach(({ cifradoC, codigoM, caracter }) => {
      const etiquetaCaracter = caracter === " " ? "[espacio]" : caracter;
      tablaDescifradoBody.append(
        crearFilaTabla([
          cifradoC.toString(),
          `${cifradoC}^${d} mód ${n}`,
          codigoM.toString(),
          etiquetaCaracter
        ])
      );
    });

    if (ultimoMensajeOriginal && !checkClaveManual.checked) {
      const coincide = resultado.textoRecuperado === ultimoMensajeOriginal;
      resComparacion.textContent = coincide
        ? "Verificación: el mensaje recuperado coincide exactamente con el mensaje original."
        : "Verificación: el mensaje recuperado difiere del último mensaje cifrado en esta sesión.";
    } else {
      resComparacion.textContent = "";
    }

    mostrarAviso(mensajeDescifradoEstado, "Mensaje descifrado y reconstruido correctamente.", "exito");
  } catch (err) {
    mostrarAviso(mensajeDescifradoEstado, err.message, "error");
  }
});

// Visor en vivo del código matemático
btnVerCodigo.addEventListener("click", async () => {
  modalCodigo.classList.remove("oculto");
  visorCodigo.textContent = "Cargando js/rsa-math.js...";
  mostrarAviso(estadoVisorCodigo, "");
  try {
    const respuesta = await fetch("js/rsa-math.js");
    if (!respuesta.ok) {
      throw new Error("No se pudo leer el archivo fuente desde el servidor local.");
    }
    const codigo = await respuesta.text();
    visorCodigo.textContent = codigo;
  } catch (err) {
    console.error(err);
    visorCodigo.textContent = "";
    mostrarAviso(
      estadoVisorCodigo,
      "Abre el proyecto mediante un servidor local (Live Server o ejecutable) para visualizar js/rsa-math.js aquí, o utiliza el enlace al PDF.",
      "alerta"
    );
  }
});

btnCerrarModal.addEventListener("click", () => {
  modalCodigo.classList.add("oculto");
});

modalCodigo.addEventListener("click", (event) => {
  if (event.target === modalCodigo) {
    modalCodigo.classList.add("oculto");
  }
});