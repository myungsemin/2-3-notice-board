// 데이터 키 정의
const STORAGE_KEYS = {
  posts: 'qna_posts',
  session: 'qna_session'
};

// 유틸: 로컬스토리지 래퍼
const Storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// 사용자/권한
const Category = { NS: 'NS', SW: 'SW', HW: 'HW' };
const Role = { Student: 'Student', Admin: 'Admin', SuperAdmin: 'SuperAdmin' };

const AdminAccounts = [
  { id: 'admin', password: 'admin123', role: Role.SuperAdmin, categories: ['ALL'] },
  { id: 'nsadmin', password: 'ns123', role: Role.Admin, categories: [Category.NS] },
  { id: 'swadmin', password: 'sw123', role: Role.Admin, categories: [Category.SW] },
  { id: 'hwadmin', password: 'hw123', role: Role.Admin, categories: [Category.HW] },
];

function generateStudentIds() {
  const list = [];
  for (let n = 20301; n <= 20337; n += 1) {
    list.push(String(n));
  }
  return list;
}
const StudentIds = new Set(generateStudentIds());

// 세션 관리
function getSession() {
  return Storage.get(STORAGE_KEYS.session, null);
}
function setSession(session) {
  Storage.set(STORAGE_KEYS.session, session);
}
function clearSession() {
  Storage.remove(STORAGE_KEYS.session);
}

// 게시물 관리
function getPosts() {
  return Storage.get(STORAGE_KEYS.posts, []);
}
function savePosts(posts) {
  Storage.set(STORAGE_KEYS.posts, posts);
}

function createPost({ authorId, category, content }) {
  const now = new Date().toISOString();
  const post = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorId,
    category,
    content,
    createdAt: now,
    replies: []
  };
  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  return post;
}

function addReply({ postId, adminId, content }) {
  const posts = getPosts();
  const target = posts.find(p => p.id === postId);
  if (!target) return false;
  target.replies.push({ by: adminId, content, createdAt: new Date().toISOString() });
  savePosts(posts);
  return true;
}

// 인증
function authenticate(id, password) {
  const idStr = String(id).trim();
  const pwStr = String(password).trim();

  // 학생: 학번/비번 동일
  if (StudentIds.has(idStr) && pwStr === idStr) {
    return { id: idStr, role: Role.Student, categories: [] };
  }

  // 관리자
  const admin = AdminAccounts.find(a => a.id === idStr && a.password === pwStr);
  if (admin) {
    return { id: admin.id, role: admin.role, categories: admin.categories };
  }

  return null;
}

// 렌더링 헬퍼
function showView(viewId) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(viewId);
  if (el) el.classList.remove('hidden');
}

function setActiveTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

// UI 바인딩
function renderSessionInfo(session) {
  const userInfo = document.getElementById('user-info');
  if (!session) {
    userInfo.textContent = '';
    return;
  }
  if (session.role === Role.Student) {
    userInfo.textContent = `학생 ${session.id}`;
  } else if (session.role === Role.SuperAdmin) {
    userInfo.textContent = `총관리자 (${session.id})`;
  } else {
    userInfo.textContent = `관리자 (${session.id})`;
  }
}

function renderStudentView(session) {
  showView('view-student');
  renderSessionInfo(session);
  const myPostsWrap = document.getElementById('my-posts');
  const posts = getPosts().filter(p => p.authorId === session.id);
  if (posts.length === 0) {
    myPostsWrap.innerHTML = '<p class="muted">아직 작성한 문의가 없습니다.</p>';
    return;
  }
  myPostsWrap.innerHTML = posts.map(post => {
    const replies = post.replies.map(r => `
      <div class="reply">
        <div class="meta">답장 · ${r.by} · ${formatDate(r.createdAt)}</div>
        <div>${escapeHtml(r.content)}</div>
      </div>
    `).join('');
    return `
      <div class="post">
        <div class="post-header">
          <span class="badge ${post.category}">${post.category}</span>
          <span>${formatDate(post.createdAt)}</span>
        </div>
        <div>${escapeHtml(post.content)}</div>
        <div class="replies">${replies || ''}</div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function canViewCategory(session, category) {
  if (session.role === Role.SuperAdmin) return true;
  if (session.role === Role.Admin) return session.categories.includes(category);
  return false;
}

function renderAdminPosts(session, selectedTab) {
  const wrap = document.getElementById('admin-posts');
  let posts = getPosts();
  if (selectedTab && selectedTab !== 'ALL') {
    posts = posts.filter(p => p.category === selectedTab);
  }
  // 관리자 권한으로 필터
  if (session.role === Role.Admin) {
    posts = posts.filter(p => canViewCategory(session, p.category));
  }

  if (posts.length === 0) {
    wrap.innerHTML = '<p class="muted">표시할 문의가 없습니다.</p>';
    return;
  }

  wrap.innerHTML = posts.map(post => {
    const replies = post.replies.map(r => `
      <div class="reply">
        <div class="meta">${r.by} · ${formatDate(r.createdAt)}</div>
        <div>${escapeHtml(r.content)}</div>
      </div>
    `).join('');

    const replyBox = `
      <div class="reply-box">
        <textarea rows="2" placeholder="답장을 입력하세요" data-reply-input="${post.id}"></textarea>
        <button class="btn primary" data-reply-btn="${post.id}">보내기</button>
      </div>
    `;

    return `
      <div class="post">
        <div class="post-header">
          <span class="badge ${post.category}">${post.category}</span>
          <span>작성자: ${post.authorId}</span>
          <span>${formatDate(post.createdAt)}</span>
        </div>
        <div>${escapeHtml(post.content)}</div>
        <div class="replies">${replies || ''}</div>
        ${replyBox}
      </div>
    `;
  }).join('');

  // 버튼 이벤트 바인딩
  wrap.querySelectorAll('[data-reply-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.getAttribute('data-reply-btn');
      const input = wrap.querySelector(`[data-reply-input="${postId}"]`);
      const value = input.value.trim();
      if (!value) return;
      addReply({ postId, adminId: session.id, content: value });
      input.value = '';
      renderAdminPosts(session, selectedTab);
    });
  });
}

function renderAdminView(session) {
  showView('view-admin');
  renderSessionInfo(session);
  const title = document.getElementById('admin-title');
  if (session.role === Role.SuperAdmin) {
    title.textContent = '관리자 대시보드 (총관리자)';
  } else {
    title.textContent = `관리자 대시보드 (${session.categories.join(', ')})`;
  }

  const firstTab = session.role === Role.SuperAdmin ? 'ALL' : session.categories[0];
  setActiveTab(firstTab);
  renderAdminPosts(session, firstTab);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const tab = btn.getAttribute('data-tab');
    // 권한 없는 탭은 비활성화
    if (session.role !== Role.SuperAdmin && tab !== session.categories[0]) {
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      setActiveTab(tab);
      renderAdminPosts(session, tab);
    });
  });
}

// 초기 바인딩
function bindEvents() {
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value;
    const pw = document.getElementById('login-password').value;
    const result = authenticate(id, pw);
    if (!result) {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    setSession(result);
    routeByRole(result);
  });

  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', () => {
    clearSession();
    renderSessionInfo(null);
    showView('view-login');
  });

  const downloadBtn = document.getElementById('download-btn');
  downloadBtn.addEventListener('click', () => {
    const session = getSession();
    if (!session) {
      alert('로그인 후 이용해주세요.');
      return;
    }
    const allPosts = getPosts();
    let exportPosts = [];
    if (session.role === Role.Student) {
      exportPosts = allPosts.filter(p => p.authorId === session.id);
    } else if (session.role === Role.SuperAdmin) {
      exportPosts = allPosts;
    } else {
      exportPosts = allPosts.filter(p => canViewCategory(session, p.category));
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      by: session.id,
      role: session.role,
      count: exportPosts.length,
      posts: exportPosts,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = `qna_backup_${session.id}_${Date.now()}.json`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const postForm = document.getElementById('post-form');
  postForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = getSession();
    if (!session || session.role !== Role.Student) return;
    const category = document.getElementById('category').value;
    const content = document.getElementById('content').value.trim();
    if (!category || !content) return;
    createPost({ authorId: session.id, category, content });
    document.getElementById('content').value = '';
    renderStudentView(session);
  });
}

function routeByRole(session) {
  if (!session) {
    showView('view-login');
    return;
  }
  if (session.role === Role.Student) {
    renderStudentView(session);
  } else {
    renderAdminView(session);
  }
}

// 앱 시작
window.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  const session = getSession();
  renderSessionInfo(session);
  routeByRole(session);
});



