document.addEventListener("DOMContentLoaded", () => {
  const btnGenerarZIP = document.getElementById("btnGenerarZIP");
  const btnWhatsApp = document.getElementById("btnWhatsApp");
  const btnEmail = document.getElementById("btnEmail");
  const descargarZip = document.getElementById("descargarZip");
  const mensajeExito = document.getElementById("mensajeExito");
  const btnInicio = document.getElementById("btnInicio");
  const btnRegresar = document.getElementById("btnRegresar");
  const listaDocumentos = document.getElementById("listaDocumentos");
  const container = document.getElementById("preview-container");
  const inputNombreManual = document.getElementById("nombreManual");

  const imagenes = JSON.parse(localStorage.getItem("scannedDocs") || "{}");
  const origen = localStorage.getItem("origen") || "documentacion-general.html";

  const posiblesDocs = ["ine_frente", "curp", "contrato_laboral", "carta_responsiva"];
  let zipBlob = null;
  let nombreZip = "";
  let nombreTrabajador = "Trabajador";

  // Mostrar imágenes
  Object.entries(imagenes).forEach(([docType, url]) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `<strong>${docType}</strong><br><img src="${url}" alt="${docType}">`;
    container.appendChild(item);
  });

  // Detectar nombre automáticamente con OCR
  async function extraerNombreConOCR() {
    for (const doc of posiblesDocs) {
      if (imagenes[doc]) {
        const result = await Tesseract.recognize(imagenes[doc], 'spa', {
          logger: m => console.log(m)
        });

        const texto = result.data.text;
        const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);

        for (const linea of lineas) {
          if (/NOMBRE|Nombre/i.test(linea)) {
            const partes = linea.split(':');
            if (partes.length > 1) {
              return partes[1].trim().replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, "");
            }
          }
        }

        const posible = lineas.find(l => l.split(" ").length >= 2 && l.length > 5);
        if (posible) {
          return posible.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, "");
        }
      }
    }

    return "";
  }

  // Llenar input si se detecta automáticamente
  async function intentarExtraerNombre() {
    const nombreDetectado = await extraerNombreConOCR();
    if (nombreDetectado) {
      inputNombreManual.value = nombreDetectado;
    }
  }

  intentarExtraerNombre();

  // Generar ZIP
  btnGenerarZIP.onclick = async () => {
    const nombre = inputNombreManual.value.trim();
    if (!nombre) {
      alert("⚠️ Por favor escribe o verifica el nombre del trabajador.");
      return;
    }

    if (Object.keys(imagenes).length === 0) {
      alert("No hay documentos para generar ZIP.");
      return;
    }

    const zip = new JSZip();
    const fecha = new Date();
    const fechaStr = `${fecha.getMonth() + 1}-${fecha.getDate()}-${fecha.getFullYear()}`;
    nombreTrabajador = nombre.replace(/\s+/g, "");
    nombreZip = `${nombreTrabajador}_${fechaStr}.zip`;

    const carpeta = zip.folder(nombreTrabajador);
    listaDocumentos.innerHTML = "";

    for (const [docType, url] of Object.entries(imagenes)) {
      const response = await fetch(url);
      const blob = await response.blob();
      const ext = blob.type.split("/")[1];
      const nombreArchivo = `${docType}_${nombreTrabajador}.${ext}`;
      carpeta.file(nombreArchivo, blob);

      const li = document.createElement("li");
      li.textContent = nombreArchivo;
      listaDocumentos.appendChild(li);
    }

    try {
      zipBlob = await zip.generateAsync({ type: "blob" });

      const zipURL = URL.createObjectURL(zipBlob);
      descargarZip.href = zipURL;
      descargarZip.download = nombreZip;
      descargarZip.style.display = "inline-block";

      mensajeExito.style.display = "block";
      btnWhatsApp.disabled = false;
      btnEmail.disabled = false;

      alert("✅ ZIP generado correctamente.");
    } catch (err) {
      console.error(err);
      alert("❌ Error al generar el ZIP.");
    }
  };

  // Compartir por WhatsApp
  btnWhatsApp.onclick = () => {
    if (!zipBlob) return alert("Primero genera el ZIP.");
    const file = new File([zipBlob], nombreZip, { type: "application/zip" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: "Documentos del Trabajador",
        text: "Aquí está el archivo ZIP con documentos.",
      }).catch(err => alert("Error al compartir: " + err));
    } else {
      alert("Tu navegador no permite compartir archivos.");
    }
  };

  // Enviar por correo
  btnEmail.onclick = () => {
    if (!zipBlob) return alert("Primero genera el ZIP.");
    const subject = encodeURIComponent("Documentos escaneados");
    const body = encodeURIComponent(
      `Hola,\n\nAdjunto el archivo ZIP con los documentos del trabajador ${nombreTrabajador}.\n\nSaludos.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Navegación
  btnRegresar.onclick = () => window.location.href = origen;
  btnInicio.onclick = () => {
    localStorage.removeItem("scannedDocs");
    localStorage.removeItem("origen");
    window.location.href = "dashboard.html";
  };

  // Estado inicial
  btnWhatsApp.disabled = true;
  btnEmail.disabled = true;
  descargarZip.style.display = "none";
  mensajeExito.style.display = "none";
});
