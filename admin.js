const form = document.querySelector("#admin-product-form");
const statusEl = document.querySelector("#admin-status");
const result = document.querySelector("#admin-result");
const shareLink = document.querySelector("#admin-share-link");
const copyLink = document.querySelector("#admin-copy-link");
const imageInput = document.querySelector("#admin-image");
const preview = document.querySelector("#admin-preview");
const publishButton = document.querySelector("#publish-github");
const publishStatus = document.querySelector("#publish-status");

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

    const basePath = window.location.pathname.replace(/admin\.html$/i, "").replace(/admin$/i, "");
    const publicLink = `${window.location.origin}${basePath}${data.sharePath.replace(/^\//, "")}`;
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

    setPublishStatus(`Publicado com sucesso. ${data.count} arquivos enviados. Site: ${data.siteUrl}`, "success");
  } catch (error) {
    setPublishStatus(`Erro ao publicar: ${error.message}`, "warning");
  } finally {
    publishButton.disabled = false;
  }
}

publishButton.addEventListener("click", async () => {
  await publishToGithub();
});

loadTokenStatus();
