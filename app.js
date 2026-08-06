const fallbackImage = "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=900&q=80";
const storageKey = "affiliate-showcase-products-v2";
const publishedProductsFile = "produtos.json";
const shareVersion = "20260801";

const sampleProducts = [
  {
    id: "fone-bluetooth-cancelamento",
    title: "Fone Bluetooth com cancelamento de ruido",
    price: "R$ 89,90",
    description: "Boa opcao para chamadas, treinos e uso diario, com estojo carregador compacto.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    category: "Eletronicos",
    store: "Mercado Livre",
    url: "https://www.mercadolivre.com.br/",
    featured: true,
    createdAt: 3
  },
  {
    id: "organizador-cozinha",
    title: "Organizador modular para cozinha",
    price: "R$ 39,90",
    description: "Ajuda a separar mantimentos, utensilios e pequenos itens em armarios ou bancadas.",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
    category: "Casa",
    store: "Shopee",
    url: "https://shopee.com.br/",
    featured: false,
    createdAt: 2
  },
  {
    id: "mochila-casual",
    title: "Mochila casual resistente a respingos",
    price: "R$ 74,50",
    description: "Modelo versatil para trabalho, faculdade e pequenas viagens.",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    category: "Moda",
    store: "Parceiro",
    url: "https://www.mercadolivre.com.br/",
    featured: false,
    createdAt: 1
  }
];

let products = [];
let activeCategory = "Todos";
let draftProduct = null;
let searchTerm = "";
let sortMode = "recent";

const form = document.querySelector("#product-form");
const statusEl = document.querySelector("#status");
const editor = document.querySelector("#editor");
const grid = document.querySelector("#product-grid");
const count = document.querySelector("#product-count");
const template = document.querySelector("#product-card-template");
const emptyState = document.querySelector("#empty-state");
const imagePreview = document.querySelector("#image-preview");
const productSearch = document.querySelector("#product-search");
const productSort = document.querySelector("#product-sort");
const detailSection = document.querySelector("#product-detail");
const detailClose = document.querySelector("#detail-close");
const detailShare = document.querySelector("#detail-share");
const shareStatus = document.querySelector("#share-status");
const installButton = document.querySelector("#install-app");
let installPromptEvent = null;

const fields = {
  link: document.querySelector("#affiliate-link"),
  title: document.querySelector("#product-title"),
  price: document.querySelector("#product-price"),
  category: document.querySelector("#product-category"),
  store: document.querySelector("#product-store"),
  image: document.querySelector("#product-image"),
  description: document.querySelector("#product-description"),
  featured: document.querySelector("#product-featured")
};

function loadLocalProducts() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeProduct) : [];
  } catch {
    return [];
  }
}

function saveProducts() {
  const localProducts = products.filter((product) => product.source !== "published");
  localStorage.setItem(storageKey, JSON.stringify(localProducts));
}

function slugify(value) {
  return String(value || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "produto";
}

function createProductId(product) {
  const base = slugify(product.title);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product.id || slugify(`${product.title}-${product.store || ""}`),
    createdAt: product.createdAt || Date.now(),
    featured: Boolean(product.featured)
  };
}

function mergeProducts(publishedProducts, localProducts) {
  const byId = new Map();

  [...publishedProducts, ...localProducts].forEach((product) => {
    byId.set(product.id, product);
  });

  return [...byId.values()];
}

async function loadPublishedProducts() {
  try {
    const response = await fetch(publishedProductsFile, { cache: "no-store" });
    if (!response.ok) throw new Error("Arquivo de produtos nao encontrado.");

    const data = await response.json();
    const list = Array.isArray(data) ? data : data.products;
    if (!Array.isArray(list)) throw new Error("Formato do arquivo de produtos invalido.");

    const publishedProducts = list.map((product) => ({
      ...normalizeProduct(product),
      source: "published"
    }));

    products = mergeProducts(publishedProducts, loadLocalProducts());
    renderProducts();
    handleHashChange();
  } catch {
    products = loadLocalProducts();
    renderProducts();
    handleHashChange();
  }
}

function getProductLink(product) {
  const basePath = window.location.pathname
    .replace(/index\.html$/i, "")
    .replace(/\/produto\/.*$/i, "/");
  return `${window.location.origin}${basePath}produto/${product.id}/?v=${shareVersion}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("input");
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function setStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function updateImagePreview() {
  const url = fields.image.value.trim();
  const img = imagePreview.querySelector("img");

  if (!url) {
    imagePreview.hidden = true;
    img.removeAttribute("src");
    return;
  }

  img.src = url;
  imagePreview.hidden = false;
}

function fillEditor(product) {
  draftProduct = product;
  fields.title.value = product.title || "";
  fields.price.value = product.price || "";
  fields.category.value = product.category || "Ofertas";
  fields.store.value = product.store || "";
  fields.image.value = product.image || "";
  fields.description.value = product.description || "";
  fields.featured.checked = Boolean(product.featured);
  editor.hidden = false;
  updateImagePreview();
}

async function fetchProduct(link) {
  const response = await fetch(`/api/product?url=${encodeURIComponent(link)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Nao foi possivel ler esse link.");
  }

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const link = fields.link.value.trim();
  if (!link) return;

  setStatus("Buscando dados do produto...");

  try {
    const product = await fetchProduct(link);
    fillEditor({ ...product, url: link });
    setStatus("Produto encontrado. Confira os campos e publique.", "success");
  } catch (error) {
    fillEditor({
      title: "",
      price: "",
      description: "",
      image: "",
      category: "Ofertas",
      store: new URL(link).hostname.replace(/^www\./, ""),
      url: link
    });
    setStatus(`A loja nao liberou todos os dados automaticamente. Preencha ou ajuste os campos e publique. Detalhe: ${error.message}`, "warning");
  }
});

document.querySelector("#publish-product").addEventListener("click", () => {
  const product = {
    id: createProductId({ title: fields.title.value.trim() || "Produto sem titulo" }),
    title: fields.title.value.trim() || "Produto sem titulo",
    price: fields.price.value.trim() || "Ver preco",
    description: fields.description.value.trim() || "Clique em comprar para ver detalhes atualizados na loja.",
    image: fields.image.value.trim() || fallbackImage,
    category: fields.category.value,
    store: fields.store.value.trim() || "Loja parceira",
    url: draftProduct?.url || fields.link.value.trim(),
    featured: fields.featured.checked,
    createdAt: Date.now()
  };

  const savedProduct = normalizeProduct(product);
  products = [savedProduct, ...products];
  saveProducts();
  renderProducts();
  form.reset();
  editor.hidden = true;
  imagePreview.hidden = true;
  draftProduct = null;
  setStatus("Produto publicado na vitrine. Agora voce pode copiar o link especifico dele.", "success");
  openProductDetail(savedProduct.id);
});

function renderProducts() {
  grid.innerHTML = "";

  const filteredByCategory = activeCategory === "Todos"
    ? products
    : products.filter((product) => product.category === activeCategory);

  const normalizedSearch = searchTerm.toLowerCase();
  const visible = filteredByCategory
    .filter((product) => {
      if (!normalizedSearch) return true;
      return [product.title, product.description, product.store, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((a, b) => {
      if (sortMode === "featured") return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (sortMode === "az") return String(a.title).localeCompare(String(b.title), "pt-BR");
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });

  count.textContent = `${visible.length} ${visible.length === 1 ? "produto" : "produtos"}`;
  emptyState.hidden = visible.length > 0;

  visible.forEach((product) => {
    const card = template.content.cloneNode(true);
    const img = card.querySelector("img");
    img.src = product.image || fallbackImage;
    img.alt = product.title;
    img.loading = "lazy";
    img.onerror = () => {
      img.src = fallbackImage;
    };

    card.querySelector(".store-pill").textContent = product.store || "Loja";
    card.querySelector(".featured-pill").hidden = !product.featured;
    card.querySelector(".category-pill").textContent = product.category || "Ofertas";
    card.querySelector("h3").textContent = product.title;
    card.querySelector(".description").textContent = product.description;
    card.querySelector(".price").textContent = product.price || "Ver preco";

    const buyButton = card.querySelector(".buy-button");
    buyButton.href = product.url;
    buyButton.setAttribute("aria-label", `Comprar ${product.title}`);

    const detailsButton = card.querySelector(".details-button");
    detailsButton.href = getProductLink(product);
    detailsButton.setAttribute("aria-label", `Ver produto ${product.title}`);

    const copyButton = card.querySelector(".copy-link-button");
    copyButton.addEventListener("click", async () => {
      await copyText(getProductLink(product));
      setStatus("Link com imagem copiado. Agora e so compartilhar no grupo.", "success");
    });

    grid.appendChild(card);
  });
}

function openProductDetail(productId) {
  const product = products.find((item) => item.id === productId);

  if (!product) {
    detailSection.hidden = true;
    return;
  }

  document.querySelector("#detail-image").src = product.image || fallbackImage;
  document.querySelector("#detail-image").alt = product.title;
  document.querySelector("#detail-category").textContent = product.category || "Ofertas";
  document.querySelector("#detail-title").textContent = product.title;
  document.querySelector("#detail-description").textContent = product.description;
  document.querySelector("#detail-store").textContent = product.store || "Loja parceira";
  document.querySelector("#detail-price").textContent = product.price || "Ver preco";
  document.querySelector("#detail-buy").href = product.url;
  document.querySelector("#detail-buy").setAttribute("aria-label", `Comprar ${product.title}`);
  detailShare.dataset.productId = product.id;
  shareStatus.textContent = "";

  detailSection.hidden = false;
  detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeProductDetail() {
  detailSection.hidden = true;
  if (window.location.hash.startsWith("#produto-")) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

function handleHashChange() {
  const productId = window.location.hash.replace("#produto-", "");
  if (productId) openProductDetail(productId);
}

function updateCategory(category) {
  activeCategory = category;
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
  renderProducts();
}

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => updateCategory(button.dataset.category));
});

fields.image.addEventListener("input", updateImagePreview);

productSearch.addEventListener("input", () => {
  searchTerm = productSearch.value.trim();
  renderProducts();
});

productSort.addEventListener("change", () => {
  sortMode = productSort.value;
  renderProducts();
});

detailClose.addEventListener("click", closeProductDetail);

detailShare.addEventListener("click", async () => {
  const product = products.find((item) => item.id === detailShare.dataset.productId);
  if (!product) return;

  await copyText(getProductLink(product));
  shareStatus.textContent = "Link copiado para compartilhar.";
});

window.addEventListener("hashchange", handleHashChange);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  if (installButton) installButton.hidden = false;
});

installButton?.addEventListener("click", async () => {
  if (!installPromptEvent) return;

  installPromptEvent.prompt();
  await installPromptEvent.userChoice;
  installPromptEvent = null;
  installButton.hidden = true;
});

renderProducts();
handleHashChange();
loadPublishedProducts();
