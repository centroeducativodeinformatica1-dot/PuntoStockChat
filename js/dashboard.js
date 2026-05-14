// ============================================================
// PUNTOSTOCK — Dashboard Module
// ============================================================

const Dashboard = {
  async load() {
    const page = document.getElementById('page-dashboard');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando dashboard...</div>`;

    try {
      const biz = PS.businessId;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);

      // Consultas paralelas
      const [ventasHoySnap, ventasSemanaSnap, productosSnap, stockBajoSnap] = await Promise.all([
        db.collection('businesses').doc(biz).collection('ventas')
          .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(todayStart))
          .get(),
        db.collection('businesses').doc(biz).collection('ventas')
          .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(weekStart))
          .orderBy('fecha', 'asc')
          .get(),
        db.collection('businesses').doc(biz).collection('productos').limit(200).get(),
        db.collection('businesses').doc(biz).collection('productos')
          .where('stock', '<=', 5).limit(10).get()
      ]);

      // Calcular stats
      let ventasHoyTotal = 0, ventasHoyCount = 0;
      ventasHoySnap.forEach(d => {
        ventasHoyTotal += d.data().total || 0;
        ventasHoyCount++;
      });

      let ventasSemanaTotal = 0;
      const ventasPorDia = {};
      ventasSemanaSnap.forEach(d => {
        const data = d.data();
        ventasSemanaTotal += data.total || 0;
        const fecha = data.fecha?.toDate ? data.fecha.toDate() : new Date(data.fecha);
        const key = fecha.toLocaleDateString('es-AR', { weekday: 'short' });
        ventasPorDia[key] = (ventasPorDia[key] || 0) + (data.total || 0);
      });

      let productosTotal = 0, productosValor = 0;
      productosSnap.forEach(d => {
        productosTotal++;
        productosValor += (d.data().precio || 0) * (d.data().stock || 0);
      });

      const stockBajo = [];
      stockBajoSnap.forEach(d => stockBajo.push({ id: d.id, ...d.data() }));

      // Top productos de la semana
      const topProds = {};
      ventasSemanaSnap.forEach(d => {
        const items = d.data().items || [];
        items.forEach(item => {
          if (!topProds[item.nombre]) topProds[item.nombre] = 0;
          topProds[item.nombre] += item.cantidad || 1;
        });
      });
      const topList = Object.entries(topProds).sort((a,b) => b[1]-a[1]).slice(0, 5);

      // Ventas últimos 7 días (barras)
      const dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        dias.push(d.toLocaleDateString('es-AR', { weekday: 'short' }));
      }
      const maxVenta = Math.max(...dias.map(d => ventasPorDia[d] || 0), 1);

      page.innerHTML = `
        <!-- Stats -->
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="stat-label">Ventas hoy</div>
            <div class="stat-value green">${formatPrice(ventasHoyTotal)}</div>
            <div class="stat-change up">▲ ${ventasHoyCount} ventas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div class="stat-label">Productos</div>
            <div class="stat-value">${productosTotal.toLocaleString()}</div>
            <div class="stat-change up">en stock</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div class="stat-label">Ventas 7 días</div>
            <div class="stat-value green">${formatPrice(ventasSemanaTotal)}</div>
            <div class="stat-change up">▲ esta semana</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div class="stat-label">Valor en stock</div>
            <div class="stat-value">${formatPrice(productosValor)}</div>
            <div class="stat-change ${stockBajo.length > 0 ? 'down' : 'up'}">
              ${stockBajo.length > 0 ? stockBajo.length + ' con stock bajo' : 'Todo OK'}
            </div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Barras de ventas semanales -->
          <div class="card">
            <div class="card-title">
              Ventas últimos 7 días
              <span style="font-size:11px; color:var(--text-muted); text-transform:none; font-weight:400;">
                ${formatPrice(ventasSemanaTotal)} total
              </span>
            </div>
            <div style="display:flex; align-items:flex-end; gap:8px; height:120px; padding-bottom:8px;">
              ${dias.map(d => {
                const val = ventasPorDia[d] || 0;
                const pct = Math.max(8, Math.round((val / maxVenta) * 100));
                return `
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end;">
                    <div style="font-size:9px; color:var(--text-muted); font-family:var(--font-mono);">
                      ${val > 0 ? formatPrice(val).replace('$','') : ''}
                    </div>
                    <div title="${d}: ${formatPrice(val)}"
                         style="width:100%; height:${pct}%; background:var(--green-muted); border-radius:4px 4px 0 0;
                                border:1px solid var(--border-green); transition:all 0.3s; cursor:pointer;"
                         onmouseenter="this.style.background='var(--green-primary)'"
                         onmouseleave="this.style.background='var(--green-muted)'"></div>
                    <div style="font-size:10px; color:var(--text-secondary);">${d}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Top productos -->
          <div class="card">
            <div class="card-title">Más vendidos esta semana</div>
            ${topList.length === 0 ? `
              <div class="empty-state" style="padding:30px 0;">
                <div class="empty-state-icon">📊</div>
                <p>Sin ventas esta semana todavía</p>
              </div>
            ` : topList.map(([nombre, qty], i) => `
              <div style="display:flex; align-items:center; gap:10px; padding:8px 0;
                          border-bottom:1px solid var(--border);">
                <span style="font-size:11px; font-weight:700; color:var(--text-muted); width:16px;">${i+1}</span>
                <span style="flex:1; font-size:13px; font-weight:500;">${nombre}</span>
                <span style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:var(--green-primary);">
                  ${qty} uds
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Stock bajo -->
        ${stockBajo.length > 0 ? `
          <div class="card mt-16">
            <div class="card-title" style="color:var(--orange);">
              Stock bajo — reponés pronto
              <button class="btn btn-sm btn-secondary" onclick="PS.navigate('stock')">Ver stock completo</button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-top:4px;">
              ${stockBajo.map(p => `
                <div style="background:var(--bg-secondary); border:1px solid rgba(240,165,0,0.2);
                            border-radius:var(--radius-md); padding:12px 14px; display:flex;
                            justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:600; font-size:13px;">${p.nombre}</div>
                    <div style="font-size:11px; color:var(--text-secondary);">${p.categoria || 'Sin categoría'}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-family:var(--font-mono); font-size:18px; font-weight:800; color:var(--red);">
                      ${p.stock}
                    </div>
                    <div style="font-size:10px; color:var(--text-muted);">unidades</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;

    } catch (e) {
      console.error(e);
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error al cargar</h3><p>${e.message}</p></div>`;
    }
  }
};
