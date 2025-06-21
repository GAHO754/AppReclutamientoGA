// ✅ Recuperar datos guardados
const imagenes = JSON.parse(localStorage.getItem("scannedDocs") || "{}");
const origen = localStorage.getItem("origen") || "documentacion-general.html";

// ✅ Elementos del DOM
const container = document.getElementById("preview-container");
const btnInicio = document.getElementById("btnInicio");
const mensajeExito = document.getElementById("mensajeExito");
const listaDocumentos = document.getElementById("listaDocumentos");

// ✅ Validar que haya documentos
if (Object.keys(imagenes).length === 0) {
  alert("No hay documentos escaneados.");
  window.location.href = origen;
}

// ✅ Mostrar vista previa de documentos
Object.entries(imagenes).forEach(([docType, url]) => {
  const item = document.createElement("div");
  item.className = "preview-item";
  item.innerHTML = `<strong>${docType}</strong><br><img src="${url}" alt="${docType}">`;
  container.appendChild(item);
});

// ✅ OCR REAL con Tesseract.js para obtener nombre del trabajador
async function extraerNombreConOCR() {
  const ineUrl = imagenes["INE"] || imagenes["Identificación"] || null;
  if (!ineUrl) return "Trabajador";

  const result = await Tesseract.recognize(ineUrl, 'spa', {
    logger: m => console.log(m) // Muestra progreso en consola
  });

  const texto = result.data.text;
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);

  let nombre = "Trabajador";
  for (const linea of lineas) {
    if (/NOMBRE|Nombre/i.test(linea)) {
      const partes = linea.split(':');
      if (partes.length > 1) {
        nombre = partes[1].trim();
        break;
      }
    }
  }

  if (nombre === "Trabajador") {
    nombre = lineas.find(l => l.split(' ').length >= 2 && l.length > 5) || "Trabajador";
  }

  // Limpiar caracteres inválidos
  return nombre.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").trim();
}

let zipBlob = null;
let nombreZip = "";

// ✅ Generar ZIP con nombre OCR
async function generarZIP() {
  const zip = new JSZip();
  const nombreTrabajador = await extraerNombreConOCR();
  const fecha = new Date();
  nombreZip = `${nombreTrabajador}_${fecha.getMonth() + 1}-${fecha.getDate()}-${fecha.getFullYear()}.zip`;

  const carpeta = zip.folder(nombreTrabajador);
  listaDocumentos.innerHTML = "";

  for (const [docType, url] of Object.entries(imagenes)) {
    const response = await fetch(url);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1];
    const filename = `${docType}_${nombreTrabajador}.${extension}`;
    carpeta.file(filename, blob);

    const li = document.createElement("li");
    li.textContent = filename;
    listaDocumentos.appendChild(li);
  }

  zipBlob = await zip.generateAsync({ type: "blob" });
  mostrarMensajeExito();
}

// ✅ Mostrar mensaje de éxito y botón Inicio
function mostrarMensajeExito() {
  mensajeExito.style.display = "block";
  btnInicio.style.display = "inline-block";
}

// ✅ BOTÓN: Generar ZIP y descargarlo
document.getElementById("btnGenerarZIP").addEventListener("click", async () => {
  await generarZIP();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = nombreZip;
  a.click();
  localStorage.removeItem("scannedDocs");
  localStorage.removeItem("origen");
});

// ✅ BOTÓN: Regresar a página de escaneo correcta (empresa o general)
document.getElementById("btnRegresar").addEventListener("click", () => {
  window.location.href = origen;
});

// ✅ BOTÓN: Compartir por WhatsApp (usando Web Share API)
document.getElementById("btnWhatsApp").addEventListener("click", async () => {
  if (!zipBlob) await generarZIP();
  const file = new File([zipBlob], nombreZip, { type: "application/zip" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Documentos ZIP",
      text: "Aquí tienes el archivo ZIP de documentos escaneados"
    });
    mostrarMensajeExito();
  } else {
    alert("Tu dispositivo no soporta compartir archivos por WhatsApp directamente.");
  }
});

// ✅ BOTÓN: Enviar por Email (abre cliente de correo)
document.getElementById("btnEmail").addEventListener("click", () => {
  const subject = encodeURIComponent("Documentos escaneados");
  const body = encodeURIComponent("Adjunto el archivo ZIP con los documentos escaneados.");
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  mostrarMensajeExito();
});

// ✅ BOTÓN: Subir a Google Drive (pendiente)
document.getElementById("btnDrive").addEventListener("click", async () => {
  if (!zipBlob) await generarZIP();
  alert("Funcionalidad de subida a Google Drive pendiente de integración real.");
  mostrarMensajeExito();
});
  btnInicio.addEventListener("click", () => {
    console.log("Click botón Inicio");
    window.location.href = "dashboard.html";
  });

