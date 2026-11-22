/**
 * Módulo matemático del método RSA (aritmética exacta con BigInt). Implementa todos los procedimientos requeridos sin depender de librerías criptográficas.
 */

/**
 * Convierte una cadena ingresada por el usuario a BigInt validando que sea entero.
 */
export function parsearEnteroSeguro(texto, nombreCampo) {
  const limpio = String(texto).trim();
  if (!/^-?\d+$/.test(limpio)) {
    throw new Error(`El campo "${nombreCampo}" debe contener un número entero válido.`);
  }
  return BigInt(limpio);
}

/**
 * 1. Verificación de primalidad por división de prueba optimizada (6k ± 1). Solo es necesario probar divisores hasta √n porque si n = a·b, al menos uno de los factores es menor o igual que √n.
 */
export function esPrimo(n) {
  if (typeof n !== "bigint" || n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n || n % 3n === 0n) return false;

  // Todo primo mayor que 3 tiene la forma 6k - 1 o 6k + 1.
  for (let i = 5n; i * i <= n; i += 6n) {
    if (n % i === 0n || n % (i + 2n) === 0n) {
      return false;
    }
  }
  return true;
}

/**
 * 2. Generador de números primos aleatorios dentro de un rango [min, max], and permite excluir un valor (por ejemplo p) para garantizar p ≠ q.
 */
export function generarPrimoAleatorio(min = 23, max = 199, excluir = null) {
  const candidatos = [];
  for (let num = BigInt(min); num <= BigInt(max); num++) {
    if (num !== excluir && esPrimo(num)) {
      candidatos.push(num);
    }
  }
  if (candidatos.length === 0) {
    throw new Error("No se encontraron primos disponibles en el rango solicitado.");
  }
  const indice = Math.floor(Math.random() * candidatos.length);
  return candidatos[indice];
}

/**
 * 3. Algoritmo de Euclides para calcular el máximo común divisor: mcd(a, b); thus, devuelve el mcd y el historial de divisiones para trazabilidad. Se fundamenta en que mcd(a, b) = mcd(b, a mod b) hasta que el residuo es 0.
 */
export function algoritmoEuclides(a, b) {
  let dividendo = a < 0n ? -a : a;
  let divisor = b < 0n ? -b : b;
  const pasos = [];

  while (divisor !== 0n) {
    const cociente = dividendo / divisor;
    const residuo = dividendo % divisor;
    pasos.push({
      dividendo,
      divisor,
      cociente,
      residuo,
      expresion: `${dividendo} = ${divisor} × ${cociente} + ${residuo}`
    });
    dividendo = divisor;
    divisor = residuo;
  }

  return { mcd: dividendo, pasos };
}

/**
 * 4. Algoritmo Extendido de Euclides. Encuentra enteros x, y que cumplen la identidad de Bézout: a·x + b·y = mcd(a, b). Mantiene en cada iteración los coeficientes s y t que expresan el residuo actual como combinación lineal de los valores originales a y b.
 */
export function algoritmoExtendidoEuclides(a, b) {
  let rAnterior = a;
  let rActual = b;
  let sAnterior = 1n;
  let sActual = 0n;
  let tAnterior = 0n;
  let tActual = 1n;
  const pasos = [];

  while (rActual !== 0n) {
    const cociente = rAnterior / rActual;
    const rSiguiente = rAnterior - cociente * rActual;
    const sSiguiente = sAnterior - cociente * sActual;
    const tSiguiente = tAnterior - cociente * tActual;

    pasos.push({
      cociente,
      residuo: rSiguiente,
      s: sSiguiente,
      t: tSiguiente,
      expresion: `q=${cociente} | r=${rSiguiente} | (${a})(${sSiguiente}) + (${b})(${tSiguiente}) = ${rSiguiente}`
    });

    rAnterior = rActual;
    rActual = rSiguiente;
    sAnterior = sActual;
    sActual = sSiguiente;
    tAnterior = tActual;
    tActual = tSiguiente;
  }

  return { mcd: rAnterior, x: sAnterior, y: tAnterior, pasos };
}

/**
 * 5. Inverso multiplicativo modular: encuentra d tal que e·d ≡ 1 (mód φ(n)); in turn, si el coeficiente x de Bézout resulta negativo, se normaliza sumando φ(n). Existe si y solo si mcd(e, φ(n)) = 1.
 */
export function inversoModular(e, phi) {
  const resultado = algoritmoExtendidoEuclides(e, phi);
  if (resultado.mcd !== 1n) {
    throw new Error(`No existe inverso modular porque mcd(${e}, ${phi}) = ${resultado.mcd} ≠ 1.`);
  }

  // Normalización al representante positivo en [0, phi - 1]
  const d = ((resultado.x % phi) + phi) % phi;
  return {
    d,
    xOriginal: resultado.x,
    yOriginal: resultado.y,
    pasosExtendidos: resultado.pasos
  };
}

/**
 * 6. Selección automática de un exponente público e válido: 1 < e < φ(n) y mcd(e, φ(n)) = 1.
 */
export function generarExponentePublico(phi) {
  // Se prueban primero exponentes impares habituales y eficientes.
  const sugeridos = [5n, 7n, 17n, 257n, 65537n];
  for (const candidato of sugeridos) {
    if (candidato > 1n && candidato < phi && algoritmoEuclides(candidato, phi).mcd === 1n) {
      return candidato;
    }
  }

  // Búsqueda lineal de respaldo sobre impares mayores que 1.
  for (let candidato = 3n; candidato < phi; candidato += 2n) {
    if (algoritmoEuclides(candidato, phi).mcd === 1n) {
      return candidato;
    }
  }

  throw new Error("No se encontró un exponente público e válido para el valor de φ(n).");
}

/**
 * 7. Potenciación modular por exponenciación binaria (cuadrado y multiplicación). Calcula (base^exponente) mód modulo en O(log exponente) multiplicaciones, reduciendo módulo n en cada paso para evitar números intermedios gigantescos.
 */
export function potenciacionModular(base, exponente, modulo) {
  if (modulo <= 0n) {
    throw new Error("El módulo n debe ser mayor que 0.");
  }
  if (exponente < 0n) {
    throw new Error("El exponente debe ser un entero no negativo.");
  }
  if (modulo === 1n) return 0n;

  let resultado = 1n;
  let baseActual = ((base % modulo) + modulo) % modulo;
  let expActual = exponente;

  while (expActual > 0n) {
    // Si el exponente actual es impar (bit menos significativo = 1), acumulamos la base.
    if (expActual % 2n === 1n) {
      resultado = (resultado * baseActual) % modulo;
    }
    // Elevamos al cuadrado la base en aritmética modular y reducimos el exponente a la mitad.
    baseActual = (baseActual * baseActual) % modulo;
    expActual = expActual / 2n;
  }

  return resultado;
}

/**
 * 8. Orquestador de generación y validación completa de claves RSA.
 */
export function generarClavesRSA(p, q, eManual = null) {
  if (!esPrimo(p)) {
    throw new Error(`El valor p = ${p} no es un número primo.`);
  }
  if (!esPrimo(q)) {
    throw new Error(`El valor q = ${q} no es un número primo.`);
  }
  if (p === q) {
    throw new Error("Los primos p y q deben ser distintos para mantener la seguridad de RSA.");
  }

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  const e = eManual !== null ? eManual : generarExponentePublico(phi);

  if (e <= 1n || e >= phi) {
    throw new Error(`El exponente e debe cumplir 1 < e < φ(n) (${phi}).`);
  }

  const euclides = algoritmoEuclides(e, phi);
  if (euclides.mcd !== 1n) {
    throw new Error(`El valor e = ${e} no es coprimo con φ(n) = ${phi} (mcd = ${euclides.mcd}).`);
  }

  const { d, pasosExtendidos } = inversoModular(e, phi);
  const comprobacion = (e * d) % phi;

  if (comprobacion !== 1n) {
    throw new Error("Error interno: el inverso modular no verificó e·d ≡ 1 (mód φ(n)).");
  }

  return {
    p,
    q,
    n,
    phi,
    e,
    d,
    clavePublica: { n, e },
    clavePrivada: { n, d },
    pasosEuclides: euclides.pasos,
    pasosExtendidos
  };
}

/**
 * 9. Conversión de texto a representación numérica (códigos Unicode/ASCII por carácter).
 */
export function textoABloquesNumericos(mensaje) {
  if (mensaje.length === 0) {
    throw new Error("Ingresa al menos un carácter para cifrar.");
  }
  return Array.from(mensaje).map((caracter) => ({
    caracter,
    codigo: BigInt(caracter.charCodeAt(0))
  }));
}

/**
 * 10. Validación de rango RSA: cada bloque M debe satisfacer 0 <= M < n.
 */
export function validarBloquesContraModulo(bloques, n) {
  for (const bloque of bloques) {
    if (bloque.codigo < 0n || bloque.codigo >= n) {
      throw new Error(
        `El carácter "${bloque.caracter}" tiene código M = ${bloque.codigo}, que no cumple 0 ≤ M < n (${n}). ` +
        `Usa primos p y q más grandes para obtener un módulo n mayor que ${bloque.codigo}.`
      );
    }
  }
}

/**
 * 11. Cifrado RSA carácter por carácter: C ≡ M^e (mód n).
 */
export function cifrarMensaje(mensaje, e, n) {
  const bloques = textoABloquesNumericos(mensaje);
  validarBloquesContraModulo(bloques, n);

  const detalle = bloques.map((bloque) => {
    const cifrado = potenciacionModular(bloque.codigo, e, n);
    return {
      caracter: bloque.caracter,
      codigoM: bloque.codigo,
      cifradoC: cifrado
    };
  });

  return {
    bloquesM: detalle.map((item) => item.codigoM),
    bloquesC: detalle.map((item) => item.cifradoC),
    detalle
  };
}

/**
 * 12. Reconstrucción de texto original a partir de bloques numéricos M.
 */
export function bloquesNumericosATexto(bloquesM) {
  return bloquesM.map((codigo) => String.fromCharCode(Number(codigo))).join("");
}

/**
 * 13. Descifrado RSA bloque por bloque: M ≡ C^d (mód n).
 */
export function descifrarMensaje(bloquesC, d, n) {
  if (!Array.isArray(bloquesC) || bloquesC.length === 0) {
    throw new Error("Ingresa al menos un bloque numérico cifrado para descifrar.");
  }

  const detalle = bloquesC.map((cifradoC) => {
    if (cifradoC < 0n || cifradoC >= n) {
      throw new Error(`El bloque cifrado C = ${cifradoC} está fuera del rango válido 0 ≤ C < ${n}.`);
    }
    const codigoM = potenciacionModular(cifradoC, d, n);
    const caracter = String.fromCharCode(Number(codigoM));
    return { cifradoC, codigoM, caracter };
  });

  const bloquesM = detalle.map((item) => item.codigoM);
  const textoRecuperado = bloquesNumericosATexto(bloquesM);

  return {
    bloquesM,
    textoRecuperado,
    detalle
  };
}