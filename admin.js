const form = document.querySelector("#admin-product-form");
const statusEl = document.querySelector("#admin-status");
const result = document.querySelector("#admin-result");
const shareLink = document.querySelector("#admin-share-link");
const copyLink = document.querySelector("#admin-copy-link");
const imageInput = document.querySelector("#admin-image");
const preview = document.querySelector("#admin-preview");
const publishButton = document.querySelector("#publish-github");
const publishStatus = document.querySelector("#publish-status");
const confirmation = document.querySelector("#admin-confirmation");
const confirmationText = document.querySelector("#admin-confirmation-text");
const siteLink = document.querySelector("#admin-site-link");

function setStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function updatePreview() {
  const url = imageInput.value.trim();
  const img = preview.querySelector("img");

  if (!url) {
    preview.hidden = true;
    img.removeAttribute("src");
    return;
  }

  img.src = url;
  preview.hidden = false;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  shareLink.select();
  document.execCommand("copy");
}

imageInput.addEventListener("input", updatePreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Adicionando produto...");

  const payload = {
    url: document.querySelector("#admin-url").value.trim(),
    title: document.querySelector("#admin-title").value.trim(),
    image: imageInput.value.trim(),
    price: document.querySelector("#admin-price").value.trim(),
    category: document.querySelector("#admin-category").value,
    description: document.querySelector("#admin-description").value.trim() || document.querySelector("#admin-title").value.trim(),
    featured: document.querySelector("#admin-featured").checked
  };

  try {
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.details || data.error || "Nao foi possivel adicionar.");

    const owner = document.querySelector("#github-owner").value.trim();
    const repo = document.querySelector("#github-repo").value.trim();
    const publicLink = `https://${owner}.github.io/${repo}${data.sharePath}`;
    shareLink.value = publicLink;
    result.hidden = false;
    form.reset();
    updatePreview();
    setStatus("Produto adicionado com sucesso.", "success");

    if (document.querySelector("#admin-publish-after-add").checked) {
      await publishToGithub();
    }
  } catch (error) {
    setStatus(`Erro: ${error.message}`, "warning");
  }
});

copyLink.addEventListener("click", async () => {
  await copyText(shareLink.value);
  setStatus("Link copiado.", "success");
});

async function loadTokenStatus() {
  try {
    const response = await fetch("/api/admin/token-status");
    const data = await response.json();
    if (data.saved) {
      document.querySelector("#github-token").placeholder = "Token ja salvo neste computador";
      setPublishStatus("Token salvo neste computador. Voce ja pode publicar sem colar de novo.", "success");
    }
  } catch {
    // O painel continua funcionando mesmo sem essa verificacao.
  }
}

function setPublishStatus(message, tone = "neutral") {
  publishStatus.textContent = message;
  publishStatus.dataset.tone = tone;
}

async function publishToGithub() {
  const token = document.querySelector("#github-token").value.trim();
  const saveToken = document.querySelector("#github-save-token").checked;

  publishButton.disabled = true;
  const originalButtonText = publishButton.textContent;
  publishButton.textContent = "Publicando...";
  setPublishStatus("Publicando arquivos no GitHub... isso pode levar alguns minutos.");

  try {
    const response = await fetch("/api/admin/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        owner: document.querySelector("#github-owner").value.trim(),
        repo: document.querySelector("#github-repo").value.trim(),
        branch: document.querySelector("#github-branch").value.trim(),
        saveToken
      })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.details || data.error || "Nao foi possivel publicar.");

    const finalMessage = `Produto enviado ao GitHub com sucesso. ${data.count} arquivos foram atualizados.`;
    setPublishStatus(`${finalMessage} Site: ${data.siteUrl}`, "success");
    confirmationText.textContent = finalMessage;
    siteLink.href = data.siteUrl;
    confirmation.hidden = false;
    publishButton.textContent = "Publicado no GitHub";
  } catch (error) {
    setPublishStatus(`Erro ao publicar: ${error.message}`, "warning");
    publishButton.textContent = originalButtonText;
  } finally {
    publishButton.disabled = false;
    if (publishButton.textContent === "Publicando...") {
      publishButton.textContent = originalButtonText;
    }
  }
}

publishButton.addEventListener("click", async () => {
  await publishToGithub();
});

loadTokenStatus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
