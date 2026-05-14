// ============================================================
// PUNTOSTOCK — Módulo de Stock
// ============================================================

const Stock = {
  productos: [],
  filtrados: [],

  async load() {
    const page = document.getElementById('page-stock');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando stock...</div>`;

    try {
      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('productos').orderBy('nombre').get();
      this.productos = [];
      snap.forEach(d => this.productos.push({ id: d.id, ...d.data() }));
      this.filtrados = [...this.productos];
      this.render(page);
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Stock (${this.productos.length} productos)</div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div class="search-input-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="stock-search" placeholder="Buscar producto..."
              oninput="Stock.filter(this.value)">
          </div>
          <select id="stock-cat-filter" onchange="Stock.filterCat(this.value)"
            style="padding:8px 12px; max-width:160px;">
            <option value="">Todas las categorías</option>
            ${[...new Set(this.productos.map(p => p.categoria).filter(Boolean))]
              .map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="Stock.openModal()">+ Nuevo producto</button>
        </div>
      </div>

      <!-- Resumen stock -->
      <div class="stat-grid" style="margin-bottom:20px;">
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Total productos</div>
          <div class="stat-value" style="font-size:22px;">${this.productos.length}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Valor total stock</div>
          <div class="stat-value green" style="font-size:22px;">
            ${formatPrice(this.productos.reduce((s,p) => s + (p.precio||0)*(p.stock||0), 0))}
          </div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Stock bajo (≤5)</div>
          <div class="stat-value" style="font-size:22px; color:var(--orange);">
            ${this.productos.filter(p => (p.stock||0) <= 5).length}
          </div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Sin stock</div>
          <div class="stat-value" style="font-size:22px; color:var(--red);">
            ${this.productos.filter(p => (p.stock||0) <= 0).length}
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Precio venta</th>
              <th>Precio costo</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="stock-tbody"></tbody>
        </table>
      </div>
    `;
    this.renderTabla();
  },

  renderTabla() {
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;

    if (this.filtrados.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state" style="padding:40px 0;">
            <div class="empty-state-icon">🔍</div>
            <h3>Sin resultados</h3>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = this.filtrados.map(p => {
      const stock = p.stock || 0;
      const stockClass = stock <= 0 ? 'td-red' : stock <= 5 ? '' : 'td-green';
      const stockBadge = stock <= 0 ? 'badge-red' : stock <= 5 ? 'badge-orange' : 'badge-green';
      const stockLabel = stock <= 0 ? 'Sin stock' : stock <= 5 ? 'Stock bajo' : 'En stock';

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${p.nombre}</div>
            ${p.descripcion ? `<div style="font-size:11px; color:var(--text-muted);">${p.descripcion}</div>` : ''}
          </td>
          <td class="td-mono td-muted">${p.codigo || p.codigoBarra || '—'}</td>
          <td><span class="badge badge-muted">${p.categoria || 'Sin cat.'}</span></td>
          <td class="td-mono td-green">${formatPrice(p.precio)}${p.unidad === 'kg' || p.unidad === 'g' ? '/kg' : ''}</td>
          <td class="td-mono td-muted">${p.precioCosto ? formatPrice(p.precioCosto) : '—'}</td>
          <td>
            ${p.unidad === 'kg' || p.unidad === 'g'
              ? '<span class="badge badge-blue" style="font-size:10px;">Por peso / kg</span>'
              : `<span class="td-mono font-bold ${stockClass}" style="font-size:15px;">${stock}</span>`
            }
          </td>
          <td>
            ${p.unidad === 'kg' || p.unidad === 'g'
              ? '<span class="badge badge-green">Con balanza</span>'
              : `<span class="badge ${stockBadge}">${stockLabel}</span>`
            }
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-secondary" onclick="Stock.ajustarStock('${p.id}', '${p.nombre}', ${stock})">
                ± Stock
              </button>
              <button class="btn btn-sm btn-secondary" onclick="Stock.openModal('${p.id}')">
                
              </button>
              <button class="btn btn-sm btn-danger" onclick="Stock.eliminar('${p.id}', '${p.nombre}')">
                
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  filter(q) {
    q = q.toLowerCase().trim();
    const cat = document.getElementById('stock-cat-filter')?.value || '';
    this.filtrados = this.productos.filter(p => {
      const matchQ = !q || p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.codigoBarra?.toLowerCase().includes(q);
      const matchC = !cat || p.categoria === cat;
      return matchQ && matchC;
    });
    this.renderTabla();
  },

  filterCat(cat) {
    const q = document.getElementById('stock-search')?.value || '';
    this.filter(q);
  },

  openModal(id) {
    const prod = id ? this.productos.find(p => p.id === id) : null;
    const cats = [...new Set(this.productos.map(p => p.categoria).filter(Boolean))];
    const esPeso = prod?.unidad === 'kg' || prod?.unidad === 'g';

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${prod ? 'Editar producto' : '+ Nuevo producto'}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <!-- Selector de unidad primero, para que el usuario elija antes de ver los campos -->
      <div class="form-group" style="margin-bottom:20px;">
        <label>Tipo de producto</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
          <label id="tipo-unidad-label" onclick="Stock.setTipo('unidad')"
            style="display:flex; align-items:center; gap:10px; padding:12px 14px;
                   border:2px solid ${!esPeso ? 'var(--green-primary)' : 'var(--border)'};
                   border-radius:var(--radius-md); cursor:pointer; transition:all 0.2s;
                   background:${!esPeso ? 'var(--green-muted)' : 'var(--bg-card)'};">
            <input type="radio" name="prod-tipo" value="unidad" ${!esPeso ? 'checked' : ''}
              style="accent-color:var(--green-primary); width:16px; height:16px;">
            <div>
              <div style="font-weight:700; font-size:13px; color:${!esPeso ? 'var(--green-primary)' : 'var(--text-primary)'};">Por unidad</div>
              <div style="font-size:11px; color:var(--text-secondary);">Ropa, calzado, electro...</div>
            </div>
          </label>
          <label id="tipo-peso-label" onclick="Stock.setTipo('kg')"
            style="display:flex; align-items:center; gap:10px; padding:12px 14px;
                   border:2px solid ${esPeso ? 'var(--green-primary)' : 'var(--border)'};
                   border-radius:var(--radius-md); cursor:pointer; transition:all 0.2s;
                   background:${esPeso ? 'var(--green-muted)' : 'var(--bg-card)'};">
            <input type="radio" name="prod-tipo" value="kg" ${esPeso ? 'checked' : ''}
              style="accent-color:var(--green-primary); width:16px; height:16px;">
            <div>
              <div style="font-weight:700; font-size:13px; color:${esPeso ? 'var(--green-primary)' : 'var(--text-primary)'};">Por peso / balanza</div>
              <div style="font-size:11px; color:var(--text-secondary);">Fiambres, quesos, carnes — precio por kg, venta en gramos</div>
            </div>
          </label>
        </div>
        <!-- Aviso visible cuando es por peso -->
        <div id="peso-aviso" style="display:${esPeso ? 'flex' : 'none'}; align-items:center; gap:8px;
             margin-top:10px; padding:10px 12px; background:rgba(126,211,33,0.08);
             border:1px solid var(--border-green); border-radius:var(--radius-md); font-size:12px; color:var(--green-primary);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Al vender este producto se abrirá la calculadora de balanza automáticamente. El precio es por kilogramo.
        </div>
      </div>

      <input type="hidden" id="prod-unidad" value="${prod?.unidad || 'unidad'}">

      <div class="grid-2">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nombre del producto *</label>
          <input type="text" id="prod-nombre" value="${prod?.nombre || ''}">
        </div>
        <div class="form-group">
          <label>Código / SKU</label>
          <input type="text" id="prod-codigo" value="${prod?.codigo || ''}">
        </div>
        <div class="form-group">
          <label>Código de barras</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="prod-barcode" value="${prod?.codigoBarra || ''}"
              style="flex:1;" placeholder="Escribí o escaneá">
            <button type="button" onclick="Stock.abrirCamaraBarcode()"
              title="Escanear con cámara"
              style="width:42px; height:42px; flex-shrink:0; background:var(--bg-card);
                     border:1px solid var(--border); border-radius:var(--radius-md);
                     cursor:pointer; display:flex; align-items:center; justify-content:center;
                     color:var(--text-secondary); transition:all 0.2s;"
              onmouseenter="this.style.borderColor='var(--green-primary)';this.style.color='var(--green-primary)'"
              onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          </div>
          <!-- Visor de cámara en el modal de stock -->
          <div id="stock-camera-container" style="display:none; margin-top:8px; position:relative;
               border-radius:var(--radius-md); overflow:hidden; border:2px solid var(--green-primary); background:#000;">
            <video id="stock-camera-video" autoplay playsinline muted
              style="width:100%; max-height:200px; object-fit:cover; display:block;"></video>
            <canvas id="stock-camera-canvas" style="display:none;"></canvas>
            <!-- Marco -->
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
              <div style="position:relative; width:200px; height:70px;">
                <div style="position:absolute; inset:0; box-shadow:0 0 0 9999px rgba(0,0,0,0.45); border-radius:4px;"></div>
                <div style="position:absolute; inset:0; border:2px solid var(--green-primary); border-radius:4px;"></div>
                <div style="position:absolute; top:-2px; left:-2px; width:16px; height:16px; border-top:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; top:-2px; right:-2px; width:16px; height:16px; border-top:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; left:-2px; width:16px; height:16px; border-bottom:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; right:-2px; width:16px; height:16px; border-bottom:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
              </div>
            </div>
            <!-- Controles -->
            <div style="position:absolute; top:6px; right:6px; display:flex; gap:5px;">
              <button id="stock-torch-btn" onclick="Stock.toggleTorch()" title="Linterna"
                style="width:34px; height:34px; background:rgba(0,0,0,0.65);
                       border:2px solid rgba(255,255,255,0.25); border-radius:8px;
                       cursor:pointer; display:none; align-items:center; justify-content:center;
                       font-size:16px; transition:all 0.2s;">
                💡
              </button>
              <button onclick="Stock.stopCamara()"
                style="width:34px; height:34px; background:rgba(0,0,0,0.65);
                       border:2px solid rgba(255,255,255,0.25); border-radius:8px;
                       cursor:pointer; display:flex; align-items:center; justify-content:center;
                       color:white; font-size:15px;">✕</button>
            </div>
            <div id="stock-camera-status"
              style="position:absolute; bottom:0; left:0; right:0; padding:6px;
                     background:linear-gradient(transparent,rgba(0,0,0,0.8));
                     text-align:center; font-size:11px; font-weight:600; color:white;">
              Apuntá al código de barras
            </div>
          </div>
        </div>
        <div class="form-group">
          <label id="label-precio">Precio de venta${esPeso ? ' por kg *' : ' *'}</label>
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                         color:var(--text-muted); font-weight:600; font-size:13px;">$</span>
            <input type="number" id="prod-precio" value="${prod?.precio || ''}" min="0" step="0.01"
              style="padding-left:26px;">
          </div>
          <div id="precio-hint" style="font-size:11px; color:var(--text-muted); margin-top:4px; display:${esPeso ? 'block' : 'none'};">
            Precio por kilogramo. Ej: Jamón a $8.000/kg → ingresás 8000. Al vender se cobra por los gramos que pese.
          </div>
        </div>
        <div class="form-group">
          <label>Precio de costo</label>
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                         color:var(--text-muted); font-weight:600; font-size:13px;">$</span>
            <input type="number" id="prod-costo" value="${prod?.precioCosto || ''}" min="0" step="0.01"
              style="padding-left:26px;">
          </div>
        </div>

        <!-- Stock: ocultar para productos por peso -->
        <div class="form-group" id="stock-field" style="display:${esPeso ? 'none' : 'block'};">
          <label>Stock actual</label>
          <input type="number" id="prod-stock" value="${prod?.stock ?? 0}" min="0">
        </div>

        <div class="form-group">
          <label>Categoría</label>
          <input type="text" id="prod-cat" value="${prod?.categoria || ''}" list="cats-datalist">
          <datalist id="cats-datalist">
            ${cats.map(c => `<option value="${c}">`).join('')}
          </datalist>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Descripción</label>
          <input type="text" id="prod-desc" value="${prod?.descripcion || ''}">
        </div>
      </div>

      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;
                       font-size:13px; text-transform:none; letter-spacing:0;">
          <label class="toggle">
            <input type="checkbox" id="prod-activo" ${prod?.activo !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          Producto activo (visible en ventas)
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.guardar('${id || ''}')" style="width:auto;">
          ${prod ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    `);
  },

  // Cambiar tipo (unidad/kg) dinámicamente en el modal
  setTipo(tipo) {
    const esPeso = tipo === 'kg' || tipo === 'g';

    // Actualizar hidden input
    const unidadInput = document.getElementById('prod-unidad');
    if (unidadInput) unidadInput.value = tipo;

    // Actualizar radio visualmente
    document.querySelectorAll('input[name="prod-tipo"]').forEach(r => {
      r.checked = r.value === tipo;
    });

    // Actualizar estilos de las tarjetas
    const lblUnidad = document.getElementById('tipo-unidad-label');
    const lblPeso   = document.getElementById('tipo-peso-label');
    if (lblUnidad) {
      lblUnidad.style.borderColor = !esPeso ? 'var(--green-primary)' : 'var(--border)';
      lblUnidad.style.background  = !esPeso ? 'var(--green-muted)' : 'var(--bg-card)';
      lblUnidad.querySelector('div div:first-child').style.color = !esPeso ? 'var(--green-primary)' : 'var(--text-primary)';
    }
    if (lblPeso) {
      lblPeso.style.borderColor = esPeso ? 'var(--green-primary)' : 'var(--border)';
      lblPeso.style.background  = esPeso ? 'var(--green-muted)' : 'var(--bg-card)';
      lblPeso.querySelector('div div:first-child').style.color = esPeso ? 'var(--green-primary)' : 'var(--text-primary)';
    }

    // Mostrar/ocultar aviso y hint
    const aviso      = document.getElementById('peso-aviso');
    const hint       = document.getElementById('precio-hint');
    const stockField = document.getElementById('stock-field');
    const labelPrecio= document.getElementById('label-precio');

    if (aviso)       aviso.style.display      = esPeso ? 'flex' : 'none';
    if (hint)        hint.style.display       = esPeso ? 'block' : 'none';
    if (stockField)  stockField.style.display = esPeso ? 'none' : 'block';
    if (labelPrecio) labelPrecio.textContent  = esPeso ? 'Precio de venta por kg *' : 'Precio de venta *';
  },

  async guardar(id) {
    const nombre   = document.getElementById('prod-nombre').value.trim();
    const precio   = parseFloat(document.getElementById('prod-precio').value);
    const costo    = parseFloat(document.getElementById('prod-costo').value) || null;
    const stock    = parseInt(document.getElementById('prod-stock').value) || 0;
    const codigo   = document.getElementById('prod-codigo').value.trim();
    const barcode  = document.getElementById('prod-barcode').value.trim();
    const cat      = document.getElementById('prod-cat').value.trim();
    const unidad   = document.getElementById('prod-unidad').value;
    const desc     = document.getElementById('prod-desc').value.trim();
    const activo   = document.getElementById('prod-activo').checked;

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    if (isNaN(precio) || precio < 0) { showToast('Precio inválido', 'error'); return; }

    const data = {
      nombre, precio, stock, activo, unidad,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (costo) data.precioCosto = costo;
    if (codigo) data.codigo = codigo;
    if (barcode) data.codigoBarra = barcode;
    if (cat) data.categoria = cat;
    if (desc) data.descripcion = desc;

    try {
      const col = db.collection('businesses').doc(PS.businessId).collection('productos');
      if (id) {
        await col.doc(id).update(data);
        showToast('Producto actualizado', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await col.add(data);
        showToast('Producto creado', 'success');
      }
      closeModal();
      await this.load();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  ajustarStock(id, nombre, stockActual) {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">± Ajustar stock</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <p style="font-weight:600; margin-bottom:4px;">${nombre}</p>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">
        Stock actual: <span style="color:var(--green-primary); font-weight:700;">${stockActual}</span>
      </p>

      <div class="form-group">
        <label>Tipo de ajuste</label>
        <select id="ajuste-tipo">
          <option value="agregar">➕ Agregar unidades</option>
          <option value="restar">➖ Restar unidades</option>
          <option value="establecer">🔄 Establecer cantidad exacta</option>
        </select>
      </div>
      <div class="form-group">
        <label>Cantidad</label>
        <input type="number" id="ajuste-cant" value="1" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label>Motivo (opcional)</label>
        <input type="text" id="ajuste-motivo" placeholder="Ej: Compra a proveedor, pérdida, inventario...">
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.confirmarAjuste('${id}', ${stockActual})" style="width:auto;">
          Confirmar ajuste
        </button>
      </div>
    `);
  },

  async confirmarAjuste(id, stockActual) {
    const tipo  = document.getElementById('ajuste-tipo').value;
    const cant  = parseInt(document.getElementById('ajuste-cant').value) || 0;
    const motivo= document.getElementById('ajuste-motivo').value.trim();

    let nuevoStock;
    if (tipo === 'agregar')    nuevoStock = stockActual + cant;
    else if (tipo === 'restar') nuevoStock = Math.max(0, stockActual - cant);
    else                        nuevoStock = cant;

    try {
      const prodRef = db.collection('businesses').doc(PS.businessId).collection('productos').doc(id);
      await prodRef.update({ stock: nuevoStock, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });

      // Registrar movimiento
      await db.collection('businesses').doc(PS.businessId).collection('movimientos').add({
        productoId: id,
        tipo, cantidad: cant, stockAntes: stockActual, stockDespues: nuevoStock,
        motivo, fecha: firebase.firestore.FieldValue.serverTimestamp(),
        usuario: PS.user.uid
      });

      showToast(`Stock actualizado a ${nuevoStock} unidades`, 'success');
      closeModal();
      await this.load();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  eliminar(id, nombre) {
    confirmDialog(`¿Eliminar el producto <strong>${nombre}</strong>? Esta acción no se puede deshacer.`, async () => {
      try {
        await db.collection('businesses').doc(PS.businessId).collection('productos').doc(id).delete();
        showToast('Producto eliminado', 'success');
        await this.load();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
    });
  },

  // ══════════════════════════════════════════════════════════
  // CÁMARA EN MODAL DE STOCK — para escanear código de barras
  // ══════════════════════════════════════════════════════════
  _stockStream: null,
  _stockScanInterval: null,
  _stockTorchOn: false,
  _stockVideoTrack: null,

  async abrirCamaraBarcode() {
    const container = document.getElementById('stock-camera-container');
    const video     = document.getElementById('stock-camera-video');
    const status    = document.getElementById('stock-camera-status');
    if (!container || !video) return;

    // Si ya está abierta, cerrar
    if (this._stockStream) { this.stopCamara(); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this._stockStream = stream;
      video.srcObject = stream;
      container.style.display = 'block';

      // Linterna
      const track = stream.getVideoTracks()[0];
      this._stockVideoTrack = track;
      const caps = track.getCapabilities?.() || {};
      const torchBtn = document.getElementById('stock-torch-btn');
      if (torchBtn) torchBtn.style.display = caps.torch ? 'flex' : 'none';

      // Cargar ZXing si no está
      if (!window.ZXing) {
        if (status) status.textContent = 'Cargando lector...';
        await new Promise((resolve) => {
          if (window.ZXing) { resolve(); return; }
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js';
          s.onload = resolve;
          s.onerror = resolve;
          document.head.appendChild(s);
        });
      }

      if (status) status.textContent = 'Apuntá al código de barras';
      this._iniciarScanStock(video);

    } catch (e) {
      if (e.name === 'NotAllowedError') {
        showToast('Permiso de cámara denegado. Habilitalo en el navegador.', 'error', 5000);
      } else {
        showToast('No se pudo acceder a la cámara.', 'error');
      }
    }
  },

  _iniciarScanStock(video) {
    if (!window.ZXing) return;
    const canvas  = document.getElementById('stock-camera-canvas');
    const status  = document.getElementById('stock-camera-status');
    const ctx     = canvas.getContext('2d');

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX,
      ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.CODABAR
    ]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    const reader = new ZXing.MultiFormatReader();
    reader.setHints(hints);

    this._stockScanInterval = setInterval(() => {
      if (video.readyState < 2) return;
      try {
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData   = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const luminance = new ZXing.RGBLuminanceSource(imgData.data, canvas.width, canvas.height);
        const bitmap    = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
        const result    = reader.decode(bitmap);

        if (result) {
          const code = result.getText();
          // Poner el código en el input
          const input = document.getElementById('prod-barcode');
          if (input) {
            input.value = code;
            input.style.borderColor = 'var(--green-primary)';
            input.style.boxShadow   = '0 0 0 3px var(--green-muted)';
          }
          if (status) status.textContent = `Detectado: ${code}`;
          // Beep
          this._beepStock();
          showToast(`Código escaneado: ${code}`, 'success', 2000);
          this.stopCamara();
        }
      } catch (e) { /* NotFoundException = sin código en frame */ }
    }, 250);
  },

  async toggleTorch() {
    if (!this._stockVideoTrack) return;
    const torchBtn = document.getElementById('stock-torch-btn');
    this._stockTorchOn = !this._stockTorchOn;
    try {
      await this._stockVideoTrack.applyConstraints({
        advanced: [{ torch: this._stockTorchOn }]
      });
      if (torchBtn) {
        torchBtn.style.background   = this._stockTorchOn ? 'rgba(126,211,33,0.3)' : 'rgba(0,0,0,0.65)';
        torchBtn.style.borderColor  = this._stockTorchOn ? 'var(--green-primary)' : 'rgba(255,255,255,0.25)';
        torchBtn.title = this._stockTorchOn ? 'Apagar linterna' : 'Encender linterna';
      }
    } catch (e) {
      showToast('Este dispositivo no soporta linterna.', 'warning');
      this._stockTorchOn = false;
    }
  },

  stopCamara() {
    if (this._stockVideoTrack && this._stockTorchOn) {
      this._stockVideoTrack.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }
    if (this._stockStream) {
      this._stockStream.getTracks().forEach(t => t.stop());
      this._stockStream = null;
    }
    if (this._stockScanInterval) {
      clearInterval(this._stockScanInterval);
      this._stockScanInterval = null;
    }
    this._stockVideoTrack = null;
    this._stockTorchOn = false;
    const container = document.getElementById('stock-camera-container');
    if (container) container.style.display = 'none';
  },

  _beepStock() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* sin audio = ok */ }
  }
};
