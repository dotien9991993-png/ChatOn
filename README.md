# Hoang Nam Audio — Chat Manager

Webapp quan ly tin nhan Facebook Messenger cho shop **Hoang Nam Audio** (hoangnamaudio.vn).

## Tinh nang

- Nhan tin nhan Facebook Messenger real-time qua webhook
- Nhan vien tra loi truc tiep tren dashboard
- Giao dien dark theme 3 cot: sidebar / chat / thong tin khach
- Tim kiem khach hang, luu SDT, ghi chu
- Danh dau trang thai: Active / Da xu ly / Spam
- Nhom tin nhan theo ngay, hien timestamp
- Notification sound khi co tin nhan moi
- Responsive tren mobile

## Cai dat

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Sua .env, dien FB_PAGE_ACCESS_TOKEN (xem huong dan ben duoi)
npm run dev
```

Backend chay tai: **http://localhost:3001**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chay tai: **http://localhost:5173**

> Mo 2 terminal rieng, chay backend va frontend song song.

---

## Huong dan lay Facebook Page Access Token

### Buoc 1: Tao Facebook App

1. Truy cap https://developers.facebook.com
2. Dang nhap tai khoan Facebook quan tri Page
3. Nhan **My Apps** > **Create App**
4. Chon **Other** > **Business** > dat ten (VD: "HNA Chat Manager")
5. Vao dashboard app moi tao

### Buoc 2: Them Messenger Platform

1. O sidebar trai, nhan **Add Product**
2. Tim **Messenger** > nhan **Set Up**
3. Trong phan **Access Tokens**, nhan **Add or Remove Pages**
4. Chon Facebook Page "Hoang Nam Audio" > **Done**
5. Nhan **Generate Token** ben canh ten Page
6. Copy token > dan vao file `backend/.env`:
   ```
   FB_PAGE_ACCESS_TOKEN=EAAxxxxxxxx...
   ```

### Buoc 3: Tao HTTPS tunnel bang ngrok

Facebook webhook yeu cau HTTPS. Dung ngrok de tao tunnel:

```bash
# Cai ngrok (neu chua co)
brew install ngrok    # macOS
# hoac tai tu https://ngrok.com/download

# Chay tunnel
ngrok http 3001
```

Ket qua se hien URL dang: `https://xxxx-xxx.ngrok-free.app`

### Buoc 4: Dang ky Webhook

1. Trong Facebook App > **Messenger** > **Webhooks**
2. Nhan **Add Callback URL**
3. Dien:
   - **Callback URL:** `https://xxxx.ngrok-free.app/webhook/facebook`
   - **Verify Token:** `hoangnam_verify_2024`
4. Nhan **Verify and Save**
5. O phan **Subscription Fields**, tick chon:
   - `messages`
   - `messaging_postbacks`
6. Nhan **Done**

### Buoc 5: Test

1. Mo Facebook Page > nhan tin thu bang tai khoan khac
2. Tin nhan se hien tren dashboard real-time
3. Tra loi truc tiep tu dashboard

---

## Cau truc du an

```
sale-AI/
├── backend/
│   ├── server.js           # Express + Socket.IO entry
│   ├── config/index.js     # Env config
│   ├── routes/
│   │   ├── webhook.js      # Facebook webhook verify + receive
│   │   ├── conversations.js # CRUD conversations
│   │   └── messages.js     # Gui tin nhan
│   ├── services/facebook.js # Graph API calls (co cache)
│   ├── store/memory.js     # In-memory database
│   └── middleware/errorHandler.js
│
├── frontend/
│   └── src/
│       ├── App.jsx                  # State management + Socket.IO
│       ├── components/
│       │   ├── Layout.jsx           # 3-column responsive layout
│       │   ├── Sidebar.jsx          # Danh sach + tim kiem
│       │   ├── ConversationItem.jsx # 1 item sidebar
│       │   ├── ChatArea.jsx         # Chat header + messages + input
│       │   ├── MessageBubble.jsx    # 1 tin nhan
│       │   ├── MessageInput.jsx     # O nhap + nut gui
│       │   ├── CustomerInfo.jsx     # Panel thong tin khach
│       │   └── EmptyState.jsx       # Placeholder
│       ├── hooks/useSocket.js       # Socket.IO hook
│       ├── services/api.js          # Axios API calls
│       └── utils/formatTime.js      # Format thoi gian tieng Viet
│
└── README.md
```

## Bien moi truong (.env)

| Bien | Mo ta | Mac dinh |
|------|-------|----------|
| `PORT` | Port backend | 3001 |
| `FB_VERIFY_TOKEN` | Token xac minh webhook | hoangnam_verify_2024 |
| `FB_PAGE_ACCESS_TOKEN` | Token truy cap Page | (bat buoc) |
| `FB_APP_SECRET` | App Secret | (tuy chon) |

## Troubleshooting

### Webhook verify that bai (403)
- Kiem tra `FB_VERIFY_TOKEN` trong .env khop voi token nhap tren Facebook
- Dam bao ngrok dang chay va URL dung

### Khong nhan duoc tin nhan
- Kiem tra subscription fields da tick `messages`
- Dam bao Page Access Token chua het han
- Xem log backend terminal co loi khong

### CORS error tren frontend
- Backend da cau hinh `cors({ origin: '*' })` — neu van loi, thu xoa cache trinh duyet

### Token het han
- Token mac dinh la short-lived (~1 gio)
- Dung Access Token Debugger (https://developers.facebook.com/tools/debug/accesstoken/) de kiem tra
- Extend token: Graph API Explorer > Generate Long-Lived Token

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO, Helmet, Axios
- **Frontend:** React 18, Vite, Tailwind CSS, Socket.IO Client, Axios
- **Font:** Be Vietnam Pro (Google Fonts)
- **Storage:** In-memory (se chuyen MongoDB sau)

## Roadmap

- [ ] MongoDB persistent storage
- [ ] AI tu dong tra loi (Claude/GPT)
- [ ] Da kenh: Zalo, Instagram
- [ ] Quan ly don hang tu chat
- [ ] Dashboard thong ke
