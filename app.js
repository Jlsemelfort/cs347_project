
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // --- Utilities -----------------------------------------------------------
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });

  function svgPlaceholder(text, bg = '#98c8ff') {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${bg}'/>
        <stop offset='1' stop-color='#0d1737'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <g fill='rgba(255,255,255,0.85)' font-family='Segoe UI, Roboto, Arial' text-anchor='middle'>
        <text x='50%' y='52%' font-size='72' font-weight='700'>${text}</text>
        <text x='50%' y='62%' font-size='22' opacity='0.85'>Photo Placeholder</text>
      </g>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function uid(prefix = 'id') {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveState() {
    localStorage.setItem('dg_state', JSON.stringify({ groups, currentUser }));
  }
  function loadState() {
    const raw = localStorage.getItem('dg_state');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // --- Mock Data -----------------------------------------------------------
  const currentUser = { id: 'u_me', name: 'Kendall Jenkins', initials: 'KJ' };

  const seed = loadState();
  let groups = seed?.groups || [
    {
      id: uid('g'),
      name: 'Running Group',
      color: '#2e6bff',
      description: 'Post a photo of your run every day 🏃‍♀️. Pace doesn\'t matter — consistency does.',
      members: [
        { id: 'u1', name: 'Joe' },
        { id: 'u2', name: 'Dylan' },
        { id: 'u3', name: 'Alice' },
        { id: 'u4', name: 'Anne' },
        currentUser,
      ],
      posts: [
        { id: uid('p'), userId: 'u1', userName: 'Joe', imageUrl: svgPlaceholder('RUN'), caption: 'Morning miles', date: todayISO() },
        { id: uid('p'), userId: 'u2', userName: 'Dylan', imageUrl: svgPlaceholder('RUN'), caption: 'Track day', date: todayISO() },
        { id: uid('p'), userId: 'u3', userName: 'Alice', imageUrl: svgPlaceholder('RUN'), caption: 'City loop', date: todayISO() },
        { id: uid('p'), userId: 'u4', userName: 'Anne', imageUrl: svgPlaceholder('RUN'), caption: 'Hill repeats', date: todayISO() },
      ],
      expanded: true,
    },
    {
      id: uid('g'),
      name: 'Friends Group',
      color: '#ff6b29',
      description: 'Daily anything — share a moment or a vibe with friends.',
      members: [
        { id: 'u5', name: 'Sam' },
        { id: 'u6', name: 'Dee' },
        currentUser,
      ],
      posts: [
        { id: uid('p'), userId: 'u5', userName: 'Sam', imageUrl: svgPlaceholder('FRIENDS', '#ffb86b'), caption: 'Latte art', date: todayISO() },
      ],
      expanded: false,
    },
  ];
  saveState();

  // --- Simple router -------------------------------------------------------
  function routeFromHash() {
    return location.hash.replace('#', '') || 'home';
  }
  function setActiveTab(route) {
    $$('.nav-tab').forEach((a) => a.classList.toggle('is-active', a.dataset.route === route));
  }
  window.addEventListener('hashchange', render);

  // --- Rendering -----------------------------------------------------------
  function render() {
    const route = routeFromHash();
    setActiveTab(route);
    if (route === 'home') renderHome();
    else if (route === 'groups') renderGroups();
    else if (route === 'user') renderUser();
    else renderHome();
  }

  // Home View ---------------------------------------------------------------
  function renderHome() {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="search-row">
        <input id="homeSearch" class="search-input" placeholder="Search your groups..." />
        <button id="addGroupBtn" class="primary-btn">+ New Group</button>
      </div>
      <div id="groupList"></div>
    `;
    const app = document.getElementById('app');
    app.replaceChildren(container);

    $('#addGroupBtn').addEventListener('click', () => openGroupEditor());

    const list = $('#groupList');
    const q = $('#homeSearch');
    function paint()
    {
      list.replaceChildren(...groups
        .filter(g => g.name.toLowerCase().includes(q.value.trim().toLowerCase()))
        .map(renderGroupCard));
    }
    q.addEventListener('input', paint);
    paint();
  }

  function renderGroupCard(group) {
    const postedByMeToday = group.posts.some(p => p.userId === currentUser.id && p.date === todayISO());
    const card = document.createElement('section');
    card.className = 'group-card';
    card.innerHTML = `
      <div class="group-header">
        <span class="group-dot" style="background:${group.color}"></span>
        <div class="row" style="gap:12px">
          <div class="group-title">${group.name}</div>
          <div class="group-date">${fmtDate(new Date())}</div>
          <div class="post-today ${postedByMeToday ? 'is-done' : ''}">
            <span class="dot"></span>
            ${postedByMeToday ? 'Posted today' : 'Post today required'}
          </div>
        </div>
        <div class="group-actions">
          <button class="expand-btn" aria-label="Toggle details">${group.expanded ? 'Collapse' : 'Expand'}</button>
          <button class="plus-btn" title="Add post" aria-label="Add post"></button>
        </div>
      </div>
      <div class="group-content ${group.expanded ? '' : 'hidden'}">
        <div class="post-grid">
          ${group.posts.map(renderPostCardHTML).join('')}
        </div>
        <div class="group-details">
          <div><strong>Description:</strong> ${group.description || '<span class="muted">No description</span>'}</div>
          <div>
            <strong>Members:</strong>
            ${group.members.map(m => `<span class='chip'>${m.name}</span>`).join(' ')}
          </div>
        </div>
      </div>
    `;

    // Expand / collapse
    $('.expand-btn', card).addEventListener('click', () => {
      group.expanded = !group.expanded;
      saveState();
      render();
    });

    // Add post flow
    const plus = $('.plus-btn', card);
    plus.addEventListener('click', () => openAddPostDialog(group.id));

    // Post interactions
    $$('.post-card', card).forEach((el) => attachPostHandlers(el, group.id));

    return card;
  }

  function renderPostCardHTML(post) {
    const isMe = post.userId === currentUser.id;
    return `
      <article class="post-card" data-post-id="${post.id}">
        <img class="post-thumb" src="${post.imageUrl}" alt="Post by ${post.userName}" />
        <div class="post-meta">
          <span class="${isMe ? 'me' : ''}">${post.userName}</span>
          <button class="icon" title="Open">🔍</button>
        </div>
      </article>
    `;
  }

  function attachPostHandlers(el, groupId) {
    const postId = el.dataset.postId;
    const group = groups.find(g => g.id === groupId);
    const post = group.posts.find(p => p.id === postId);
    const isMe = post.userId === currentUser.id;

    $('.post-thumb', el).addEventListener('click', () => openPostModal(post, group));
    $('button.icon', el).addEventListener('click', () => openPostModal(post, group));

    // Optional: right-click to edit own post
    el.addEventListener('contextmenu', (e) => {
      if (!isMe) return;
      e.preventDefault();
      openEditPostModal(post, group);
    });
  }

  // Groups View -------------------------------------------------------------
  function renderGroups() {
    const app = document.getElementById('app');
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="row" style="justify-content:space-between; margin-bottom:12px;">
        <h2 style="margin:0">Your Groups</h2>
        <button class="primary-btn" id="createGroupBtn">+ Create Group</button>
      </div>
      <div class="grid cols-3" id="groupGrid"></div>
    `;
    app.replaceChildren(container);
    $('#createGroupBtn').addEventListener('click', () => openGroupEditor());

    const grid = $('#groupGrid');
    groups.forEach(g => {
      const postedToday = g.posts.some(p => p.userId === currentUser.id && p.date === todayISO());
      const tile = document.createElement('div');
      tile.className = 'group-tile';
      tile.innerHTML = `
        <div class="tile-head">
          <span class="group-dot" style="background:${g.color}"></span>
          <div>
            <div style="font-weight:600">${g.name}</div>
            <div class="muted" style="font-size:13px">${g.members.length} members • ${postedToday ? 'Posted today ✅' : 'Post today required'}</div>
          </div>
          <div class="tile-actions">
            <button class="ghost-btn" data-act="open">Open</button>
            <button class="ghost-btn" data-act="edit">Edit</button>
          </div>
        </div>
        <div class="muted">${g.description || ''}</div>
      `;
      tile.querySelector('[data-act="open"]').addEventListener('click', () => { location.hash = '#home'; requestAnimationFrame(() => {
        g.expanded = true; saveState(); render();
      }); });
      tile.querySelector('[data-act="edit"]').addEventListener('click', () => openGroupEditor(g));
      grid.appendChild(tile);
    });
  }

  // User View ---------------------------------------------------------------
  function renderUser() {
    const app = document.getElementById('app');
    const streak = calcStreak();
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="row" style="justify-content:space-between; margin-bottom:14px;">
        <h2 style="margin:0">${currentUser.name}</h2>
        <span class="chip">Member of ${groups.length} group${groups.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="stats">
        <div class="stat-card">
          <div class="muted">Daily Streak</div>
          <div style="font-size:28px; font-weight:700">${streak} days</div>
          <div class="progress-bar"><span style="width:${Math.min(100, 10 * streak)}%"></span></div>
        </div>
        <div class="stat-card">
          <div class="muted">Posts This Week</div>
          <div style="font-size:28px; font-weight:700">${postsThisWeek()}</div>
          <div class="muted" style="margin-top:6px">Across all groups</div>
        </div>
        <div class="stat-card">
          <div class="muted">Today</div>
          <div style="font-size:28px; font-weight:700">${didPostToday() ? 'Complete ✅' : 'Pending'}</div>
          <div class="muted" style="margin-top:6px">${new Date().toLocaleDateString()}</div>
        </div>
      </div>
      <div class="section-title">Your Groups</div>
      <div class="grid cols-3" id="userGroups"></div>
    `;
    app.replaceChildren(container);
    const list = $('#userGroups');
    groups.forEach(g => {
      const el = document.createElement('div');
      el.className = 'group-tile';
      el.innerHTML = `
        <div class="tile-head">
          <span class="group-dot" style="background:${g.color}"></span>
          <div>
            <div style="font-weight:600">${g.name}</div>
            <div class="muted" style="font-size:13px">${g.members.length} members</div>
          </div>
          <div class="tile-actions">
            <button class="ghost-btn" data-act="open">Open</button>
          </div>
        </div>
      `;
      el.querySelector('[data-act="open"]').addEventListener('click', () => { location.hash = '#home'; requestAnimationFrame(render); });
      list.appendChild(el);
    });
  }

  function postsThisWeek() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return groups.flatMap(g => g.posts).filter(p => new Date(p.date) >= start && p.userId === currentUser.id).length;
  }
  function didPostToday() {
    return groups.some(g => g.posts.some(p => p.userId === currentUser.id && p.date === todayISO()));
  }
  function calcStreak() {
    // Count consecutive days (including today) where user posted in any group.
    let streak = 0;
    for (let i = 0; i < 30; i++) { // simple cap
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0,10);
      const posted = groups.some(g => g.posts.some(p => p.userId === currentUser.id && p.date === iso));
      if (posted) streak++; else break;
    }
    return streak;
  }

  // --- Modals --------------------------------------------------------------
  function openModal(title, content, opts = {}) {
    const root = $('#modal-root');
    root.classList.add('is-open');
    root.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal" role="dialog" aria-modal="true">
        <header>
          <h3>${title}</h3>
          <button class="close" data-close>✖</button>
        </header>
        <div class="content"></div>
      </div>`;
    const contentEl = $('.content', root);
    if (typeof content === 'string') contentEl.innerHTML = content; else contentEl.replaceChildren(content);
    $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal));
    function onEscape(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', onEscape, { once: true });
    if (opts.onOpen) opts.onOpen(root);
    return { close: closeModal };
  }
  function closeModal() {
    const root = $('#modal-root');
    root.classList.remove('is-open');
    root.innerHTML = '';
  }

  // Add Post ---------------------------------------------------------------
  function openAddPostDialog(groupId) {
    const group = groups.find(g => g.id === groupId);
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="row">
        <span class="group-dot" style="background:${group.color}"></span>
        <div><strong>${group.name}</strong><div class="muted">${fmtDate(new Date())}</div></div>
      </div>
      <div class="row" style="gap:12px; align-items:flex-start;">
        <img id="previewImg" src="${svgPlaceholder('PREVIEW')}" alt="Preview" style="width: 240px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12)"/>
        <div style="flex:1; display:grid; gap:10px;">
          <input id="fileInput" type="file" accept="image/*" style="display:none"/>
          <div class="row">
            <button class="primary-btn" id="choose">Choose Photo</button>
            <span class="muted">.jpg, .png, or .heic</span>
          </div>
          <label>Caption
            <input id="caption" class="search-input" placeholder="How did it go?" />
          </label>
          <div class="row" style="justify-content:flex-end; gap:8px;">
            <button class="ghost-btn" data-close>Cancel</button>
            <button class="primary-btn" id="postBtn">Post</button>
          </div>
        </div>
      </div>`;
    const modal = openModal('New Post', wrap);

    const file = $('#fileInput', wrap);
    const preview = $('#previewImg', wrap);
    $('#choose', wrap).addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { preview.src = reader.result; };
      reader.readAsDataURL(f);
    });
    $('#postBtn', wrap).addEventListener('click', () => {
      const caption = $('#caption', wrap).value.trim();
      const imageUrl = preview.src;
      if (!imageUrl) return;
      group.posts.unshift({ id: uid('p'), userId: currentUser.id, userName: currentUser.name.split(' ')[0] || 'Me', imageUrl, caption, date: todayISO() });
      group.expanded = true;
      saveState();
      closeModal();
      render();
    });
  }

  // Post Modal --------------------------------------------------------------
  function openPostModal(post, group) {
    const wrap = document.createElement('div');
    const isMe = post.userId === currentUser.id;
    wrap.innerHTML = `
      <img src="${post.imageUrl}" alt="Post image" style="width:100%; border-radius:12px;" />
      <div class="row" style="justify-content:space-between;">
        <div class="row">
          <span class="group-dot" style="background:${group.color}"></span>
          <strong>${group.name}</strong>
          <span class="muted">• ${fmtDate(post.date)}</span>
        </div>
        ${isMe ? '<button class="ghost-btn" id="editBtn">Edit</button>' : ''}
      </div>
      <div><strong>${post.userName}</strong></div>
      <div class="muted">${post.caption || ''}</div>
    `;
    openModal('Post', wrap, { onOpen(root){
      if ($('#editBtn', wrap)) $('#editBtn', wrap).addEventListener('click', () => { closeModal(); openEditPostModal(post, group); });
    }});
  }

  function openEditPostModal(post, group) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <img src="${post.imageUrl}" alt="Post" style="width:100%; border-radius:12px;"/>
      <label>Caption
        <input id="caption" class="search-input" value="${(post.caption||'').replace(/"/g,'&quot;')}" />
      </label>
      <div class="row" style="justify-content:space-between;">
        <button class="ghost-btn" id="deleteBtn">Delete</button>
        <div class="row" style="gap:8px;">
          <button class="ghost-btn" data-close>Cancel</button>
          <button class="primary-btn" id="saveBtn">Save</button>
        </div>
      </div>
    `;
    openModal('Edit Post', wrap, { onOpen(){
      $('#saveBtn', wrap).addEventListener('click', () => {
        post.caption = $('#caption', wrap).value;
        saveState();
        closeModal();
        render();
      });
      $('#deleteBtn', wrap).addEventListener('click', () => {
        group.posts = group.posts.filter(p => p.id !== post.id);
        saveState();
        closeModal();
        render();
      });
    }});
  }

  // Group Editor ------------------------------------------------------------
  function openGroupEditor(group) {
    const isNew = !group;
    const model = group ? { ...group } : { id: uid('g'), name: '', color: '#6b9bff', description: '', members: [currentUser], posts: [] };
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="grid">
        <label>Group Name
          <input id="gName" class="search-input" placeholder="e.g. Running Group" value="${model.name}" />
        </label>
        <label>Color
          <input id="gColor" type="color" class="search-input" style="height: 44px; padding: 4px;" value="${model.color}" />
        </label>
        <label>Description
          <textarea id="gDesc" class="search-input" rows="3" placeholder="What\'s this group about?">${model.description}</textarea>
        </label>
        <div class="row" style="justify-content:flex-end; gap:8px;">
          ${!isNew ? '<button class="ghost-btn" id="delete">Delete</button>' : ''}
          <button class="ghost-btn" data-close>Cancel</button>
          <button class="primary-btn" id="save">${isNew ? 'Create' : 'Save'}</button>
        </div>
      </div>
    `;
    openModal(isNew ? 'Create Group' : 'Edit Group', wrap, { onOpen(){
      $('#save', wrap).addEventListener('click', () => {
        model.name = $('#gName', wrap).value.trim() || 'Untitled Group';
        model.color = $('#gColor', wrap).value;
        model.description = $('#gDesc', wrap).value.trim();
        if (isNew) groups.unshift(model); else {
          const idx = groups.findIndex(g => g.id === group.id);
          groups[idx] = { ...groups[idx], ...model };
        }
        saveState();
        closeModal();
        render();
      });
      if (!isNew) $('#delete', wrap).addEventListener('click', () => {
        groups = groups.filter(g => g.id !== group.id);
        saveState();
        closeModal();
        render();
      });
    }});
  }

  // Boot -------------------------------------------------------------------
  // Set avatar initials
  const initials = (currentUser.name || '').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
  const avatar = document.querySelector('.avatar');
  if (avatar) avatar.textContent = initials || currentUser.initials || 'ME';

  // Initial render
  if (!location.hash) location.hash = '#home';
  render();
})();


