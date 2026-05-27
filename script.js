(() => {
  const cart = [];
  const WHATSAPP_NUMBER = '59168039494'; // Número de WhatsApp configurado

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Elementos del Carrito
  const cartBtn = $('#cartBtn');
  const cartPanel = $('#cartPanel');
  const cartOverlay = $('#cartOverlay');
  const cartClose = $('#cartClose');
  const cartItems = $('#cartItems');
  const cartCount = $('#cartCount');
  const cartTotal = $('#cartTotal');
  const checkoutBtn = $('#checkoutBtn');
  const navToggle = $('#navToggle');
  const navLinks = $('#navLinks');
  const header = $('#header');
  const contactForm = $('#contactForm');
  const toast = $('#toast');

  // Elementos de la Exhibición interactiva de Productos (Showcase)
  const showcaseQty = $('#showcaseQty');
  const showcaseQtyMinus = $('#showcaseQtyMinus');
  const showcaseQtyPlus = $('#showcaseQtyPlus');
  const unitPriceOriginal = $('#unitPriceOriginal');
  const unitPriceCurrent = $('#unitPriceCurrent');
  const showcaseTotalPrice = $('#showcaseTotalPrice');
  const addToCartShowcase = $('#addToCartShowcase');

  // Precios base por tamaño en Bolivianos (Bs)
  const SIZE_PRICES = {
    'Personal': 10,
    'Mediano': 35,
    'Familiar': 65,
    'Super Pack Familiar': 135
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // --- INTERACTIVIDAD DE LA EXHIBICIÓN (SHOWCASE) ---
  let selectedSize = 'Personal';
  let isWholesale = false;
  let currentQty = 1;

  function getCalculatedPrices() {
    const basePrice = SIZE_PRICES[selectedSize];
    // Compra al por mayor aplica 20% de descuento directo
    const unitPrice = isWholesale ? Math.round(basePrice * 0.8) : basePrice;
    const total = unitPrice * currentQty;
    return { basePrice, unitPrice, total };
  }

  function updateShowcaseUI() {
    const { basePrice, unitPrice, total } = getCalculatedPrices();

    if (isWholesale) {
      unitPriceOriginal.textContent = `${basePrice} Bs`;
      unitPriceCurrent.textContent = `${unitPrice} Bs`;
    } else {
      unitPriceOriginal.textContent = '';
      unitPriceCurrent.textContent = `${basePrice} Bs`;
    }

    showcaseQty.value = currentQty;
    showcaseTotalPrice.textContent = `${total} Bs`;
  }

  // Escuchar cambio de tamaño
  $$('input[name="productSize"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      selectedSize = e.target.value;
      updateShowcaseUI();
    });
  });

  // Escuchar cambio de tipo de compra (detalle vs por mayor)
  $$('input[name="purchaseType"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      isWholesale = e.target.value === 'al-por-mayor';
      
      // Si cambia a por mayor, la cantidad mínima por regla es 6 unidades
      if (isWholesale && currentQty < 6) {
        currentQty = 6;
      }
      
      updateShowcaseUI();
    });
  });

  // Ajustes de cantidad en el showcase
  showcaseQtyMinus.addEventListener('click', () => {
    const minLimit = isWholesale ? 6 : 1;
    if (currentQty > minLimit) {
      currentQty--;
      updateShowcaseUI();
    } else if (isWholesale && currentQty === 6) {
      showToast('La compra al por mayor requiere un mínimo de 6 unidades');
    }
  });

  showcaseQtyPlus.addEventListener('click', () => {
    currentQty++;
    updateShowcaseUI();
  });

  // Añadir al carrito desde showcase
  if (addToCartShowcase) {
    addToCartShowcase.addEventListener('click', () => {
      const { unitPrice } = getCalculatedPrices();
      const itemName = `NONiBOOM — ${selectedSize}${isWholesale ? ' (Al por Mayor)' : ''}`;
      const itemId = `noni-${selectedSize.toLowerCase().replace(/\s+/g, '-')}-${isWholesale ? 'wholesale' : 'retail'}`;

      const existing = cart.find((i) => i.id === itemId);
      if (existing) {
        existing.qty += currentQty;
      } else {
        cart.push({
          id: itemId,
          name: itemName,
          price: unitPrice,
          qty: currentQty,
          size: selectedSize,
          wholesale: isWholesale
        });
      }

      updateCartUI();
      showToast(`¡${itemName} agregado al carrito!`);
      openCart();
      
      // Resetear la cantidad a la inicial correspondiente
      currentQty = isWholesale ? 6 : 1;
      updateShowcaseUI();
    });
  }

  // --- GESTIÓN DEL CARRITO ---
  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    cartCount.textContent = totalItems;
    cartTotal.textContent = `${totalPrice} Bs`;

    if (cart.length === 0) {
      cartItems.innerHTML = '<li class="cart__empty">Tu carrito está vacío</li>';
      return;
    }

    cartItems.innerHTML = cart.map((item) => `
      <li class="cart__item" data-id="${item.id}">
        <div class="cart__item-info">
          <h4>${item.name}</h4>
          <span>${item.price} Bs c/u</span>
        </div>
        <div class="cart__item-controls">
          <button class="qty-minus" aria-label="Reducir cantidad">−</button>
          <span>${item.qty}</span>
          <button class="qty-plus" aria-label="Aumentar cantidad">+</button>
        </div>
      </li>
    `).join('');

    cartItems.querySelectorAll('.qty-minus').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.cart__item').dataset.id;
        changeQty(id, -1);
      });
    });

    cartItems.querySelectorAll('.qty-plus').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.cart__item').dataset.id;
        changeQty(id, 1);
      });
    });
  }

  function changeQty(id, delta) {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    item.qty += delta;

    // Si es un producto comprado "al por mayor" y su cantidad baja de 6,
    // se convierte automáticamente en una compra "al detalle" con precio regular.
    if (item.wholesale && item.qty < 6 && item.qty > 0) {
      item.wholesale = false;
      item.price = SIZE_PRICES[item.size];
      item.name = `NONiBOOM — ${item.size}`;
      item.id = `noni-${item.size.toLowerCase().replace(/\s+/g, '-')}-retail`;
      showToast(`¡Cantidad menor a 6! Se actualizó a precio de venta al detalle`);
    }

    if (item.qty <= 0) {
      const idx = cart.indexOf(item);
      cart.splice(idx, 1);
    }
    
    // Agrupar productos idénticos en caso de que la conversión cree IDs repetidos
    for (let i = 0; i < cart.length; i++) {
      for (let j = i + 1; j < cart.length; j++) {
        if (cart[i].id === cart[j].id) {
          cart[i].qty += cart[j].qty;
          cart.splice(j, 1);
          j--;
        }
      }
    }

    updateCartUI();
  }

  function openCart() {
    cartPanel.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartPanel.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function checkoutWhatsApp() {
    if (cart.length === 0) {
      showToast('Agrega productos al carrito primero');
      return;
    }

    const lines = cart.map((i) => `• ${i.name} x${i.qty} — ${i.price * i.qty} Bs`);
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    const message = encodeURIComponent(
      `¡Hola! Quiero hacer un pedido de NONiBOOM desde El Alto 🇧🇴:\n\n${lines.join('\n')}\n\n*Total: ${total} Bs*`
    );

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
  if (checkoutBtn) checkoutBtn.addEventListener('click', checkoutWhatsApp);

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
  }

  if (navLinks) {
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  window.addEventListener('scroll', () => {
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 50);
    }
  });

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#name').value.trim();
      const email = $('#email').value.trim();
      const message = $('#message').value.trim();

      const waMessage = encodeURIComponent(
        `Hola, soy ${name} (${email}) desde El Alto.\n\n${message}`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`, '_blank');
      contactForm.reset();
      showToast('¡Mensaje enviado! Te contactaremos pronto.');
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  $$('.product-showcase, .testimonial, .benefits__item, .stats__item').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // Inicializar UI de la exhibición de producto
  updateShowcaseUI();
})();
