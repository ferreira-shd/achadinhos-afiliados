const fallbackImage = "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=900&q=80";
const storageKey = "affiliate-showcase-products";

const sampleProducts = [
  {
    title: "Fone Bluetooth com cancelamento de ruido",
    price: "R$ 89,90",
    description: "Boa opcao para chamadas, treinos e uso diario, com estojo carregador compacto.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    category: "Eletronicos",
    store: "Mercado Livre",
    url: "https://www.mercadolivre.com.br/"
  },
  {
    title: "Organizador modular para cozinha",
    price: "R$ 39,90",
    description: "Ajuda a separar mantimentos, utensilios e pequenos itens em armarios ou bancadas.",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
    category: "Casa",
    store: "Shopee",
    url: "https://shopee.com.br/"
  },
  {
    title: "Mochila casual resistente a respingos",
    price: "R$ 74,50",
    description: "Modelo versatil para trabalho, faculdade e pequenas viagens.",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    category: "Moda",
    store: "Parceiro",
    url: "https://www.mercadolivre.com.br/"
  }
];

let products = loadProducts();
let activeCategory = "Todos";
let draftProduct = null;

const form = document.querySelector("#product-form");
const statusEl = document.querySelector("#status");
const editor = document.querySelector("#editor");
const grid = document.querySelector("#product-grid");
const count = document.querySelector("#product-count");
const template = document.querySelector("#product-card-template");

const fields = {
  link: document.querySelector("#affiliate-link"),
  title: document.querySelector("#product-title"),
  price: document.querySelector("#product-price"),
  category: document.querySelector("#product-category"),
  store: document.querySelector("#product-store"),
  image: document.querySelector("#product-image"),
  description: document.querySelector("#product-description")
};

function loadProducts() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return sampleProducts;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : sampleProducts;
  } catch {
    return sampleProducts;
  }
}

function saveProducts() {
  localStorage.setItem(storageKey, JSON.stringify(products));
}

function setStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function fillEditor(product) {
  draftProduct = product;
  fields.title.value = product.title || "";
  fields.price.value = product.price || "";
  fields.category.value = product.category || "Ofertas";
  fields.store.value = product.store || "";
  fields.image.value = product.image || "";
  fields.description.value = product.description || "";
  editor.hidden = false;
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
    title: fields.title.value.trim() || "Produto sem titulo",
    price: fields.price.value.trim() || "Ver preco",
    description: fields.description.value.trim() || "Clique em comprar para ver detalhes atualizados na loja.",
    image: fields.image.value.trim() || fallbackImage,
    category: fields.category.value,
    store: fields.store.value.trim() || "Loja parceira",
    url: draftProduct?.url || fields.link.value.trim()
  };

  products = [product, ...products];
  saveProducts();
  renderProducts();
  form.reset();
  editor.hidden = true;
  draftProduct = null;
  setStatus("Produto publicado na vitrine.", "success");
});

function renderProducts() {
  grid.innerHTML = "";

  const visible = activeCategory === "Todos"
    ? products
    : products.filter((product) => product.category === activeCategory);

  count.textContent = `${visible.length} ${visible.length === 1 ? "produto" : "produtos"}`;

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
    card.querySelector(".category-pill").textContent = product.category || "Ofertas";
    card.querySelector("h3").textContent = product.title;
    card.querySelector(".description").textContent = product.description;
    card.querySelector(".price").textContent = product.price || "Ver preco";

    const buyButton = card.querySelector(".buy-button");
    buyButton.href = product.url;
    buyButton.setAttribute("aria-label", `Comprar ${product.title}`);

    grid.appendChild(card);
  });
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

renderProducts();
