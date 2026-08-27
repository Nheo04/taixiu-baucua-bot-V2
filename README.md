# 🎲 Bot Discord: Tài Xỉu & Bầu Cua Tôm Cá

Bot Discord chơi **Tài Xỉu** và **Bầu Cua Tôm Cá** bằng xu ảo (chỉ để giải trí trong server, không liên quan tiền thật).

## Tính năng
- `/taixiu` — mở 1 **ván chơi chung cho cả kênh**, đếm ngược 45 giây. Mọi người bấm nút chọn Tài/Xỉu/Chẵn/Lẻ/Số cụ thể, nhập số tiền cược qua form (modal). Có thể đặt nhiều cược khác nhau trong cùng 1 ván. Hết giờ, bot công khai kết quả xúc xắc và gửi riêng kết quả thắng/thua cho từng lượt cược.
- `/baucua` — tương tự nhưng là Bầu Cua Tôm Cá, đếm ngược 30 giây, đặt cược vào 1 trong 6 con vật, trúng bao nhiêu con ăn gấp bấy nhiêu lần tiền cược.
- `/latxu` — minigame lật đồng xu bằng Embed và button: tốn 1/10 thể lực mỗi lượt, hồi 1 điểm mỗi 15 phút, có Xu Đồng/Bạc/Vàng và nâng cấp May Mắn/Bảo Hiểm. Lãi Bầu Cua chịu house edge 5%.
- `/sodu` — xem số dư xu hiện tại
- `/diemdanh` — điểm danh nhận 500 xu miễn phí mỗi 24 giờ
- `/chuyenxu nguoinhan:<@user> sotien:<số>` — chuyển xu (trade) cho người chơi khác trong server
- `/naptien nguoinhan:<@user> sotien:<số>` — **[chỉ Admin]** cộng (hoặc trừ, nếu nhập số âm) xu cho 1 người chơi bất kỳ, không giới hạn số dư
- Người chơi mới tự động có **1000 xu** khởi điểm

**Lưu ý về ván chơi:** mỗi kênh chỉ chạy được 1 ván `/taixiu` hoặc `/baucua` cùng lúc. Trạng thái ván chơi lưu trong bộ nhớ (RAM) của bot — nếu bot restart giữa ván, ván đó sẽ mất và tiền đã cược không được hoàn lại tự động.

Dữ liệu xu được lưu trong file `data/economy.json`.

---

## 1. Tạo Discord Bot & lấy Token

1. Vào https://discord.com/developers/applications → **New Application** → đặt tên bot.
2. Vào tab **Bot** → **Reset Token** → copy **TOKEN** (giữ bí mật, không public lên GitHub).
3. Vào tab **OAuth2 → General** → copy **CLIENT ID** (Application ID).
4. Trong tab **Bot**, không cần bật intent đặc biệt nào (bot chỉ dùng slash command).

## 2. Mời bot vào server

Vào **OAuth2 → URL Generator**:
- Scopes: chọn `bot` và `applications.commands`
- Bot Permissions: chọn `Send Messages`, `Embed Links`, `Use Slash Commands`

Copy link được tạo ra, mở trong trình duyệt và chọn server để mời bot vào.

## 3. Cài đặt & chạy thử ở máy local (tuỳ chọn)

```bash
cd taixiu-baucua-bot
npm install
cp .env.example .env
# Mở file .env, điền DISCORD_TOKEN và CLIENT_ID vào

npm run deploy   # đăng ký slash command lên Discord (chạy 1 lần, hoặc mỗi khi sửa lệnh)
npm start        # chạy bot
```

Sau khi `npm run deploy` chạy xong, đợi vài phút để Discord cập nhật slash command trong server.

## 4. Đưa code lên GitHub

```bash
git init
git add .
git commit -m "Init bot tai xiu bau cua"
git branch -M main
git remote add origin https://github.com/<username>/<ten-repo>.git
git push -u origin main
```

(File `.env` đã được `.gitignore` bỏ qua nên token sẽ **không** bị lộ lên GitHub.)

## 5. Deploy lên Railway

1. Vào https://railway.app → đăng nhập bằng GitHub.
2. **New Project** → **Deploy from GitHub repo** → chọn repo bạn vừa push.
3. Railway tự nhận diện Node.js (nhờ `package.json`) và chạy `npm install` rồi `npm start`.
4. Vào tab **Variables** của project, thêm 2 biến môi trường:
   - `DISCORD_TOKEN` = token bot của bạn
   - `CLIENT_ID` = application ID của bot
5. Railway sẽ tự redeploy sau khi thêm biến môi trường. Xem log ở tab **Deployments** để thấy dòng `✅ Bot đã đăng nhập với tên ...` là bot đã online.

### Đăng ký slash command khi đã deploy trên Railway

Cách đơn giản nhất: chạy `npm run deploy` **từ máy local** (dùng đúng `DISCORD_TOKEN`/`CLIENT_ID` trong `.env`) trước khi deploy — chỉ cần làm 1 lần, hoặc lại mỗi khi bạn thêm/sửa lệnh mới. Việc đăng ký lệnh không phụ thuộc vào nơi bot đang chạy.

## ⚠️ Lưu ý về lưu trữ dữ liệu trên Railway

Railway (gói mặc định) có **filesystem tạm thời** — file `data/economy.json` sẽ **mất khi bot redeploy** (push code mới, restart service...). Nếu muốn số dư người chơi được lưu lâu dài, có 2 cách:

1. **Railway Volume**: vào Settings service → **Volumes** → mount 1 volume vào thư mục `/app/data` để dữ liệu tồn tại qua các lần redeploy.
2. **Nâng cấp lên database**: dùng Railway Postgres/MySQL add-on thay vì JSON — phù hợp nếu server đông người chơi hoặc cần độ tin cậy cao hơn.

Với server nhỏ chơi giải trí, cách 1 (Volume) là đủ và nhanh nhất để setup.

### Khuyến nghị vận hành

- Gắn Railway Volume vào `/app/data`; nếu không, số dư và nâng cấp sẽ mất sau redeploy.
- Không chia sẻ `DISCORD_TOKEN`; chỉ cấp quyền bot tối thiểu cần thiết.
- `/naptien` có thể tạo xu tùy ý và nên chỉ cấp quyền cho admin đáng tin cậy để tránh lạm phát.

## Cấu trúc project

```
taixiu-baucua-bot/
├── commands/
│   ├── taixiu.js
│   ├── baucua.js
│   ├── latxu.js
│   ├── sodu.js
│   ├── diemdanh.js
│   ├── chuyenxu.js
│   └── naptien.js
├── utils/
│   ├── economy.js
│   └── session.js
├── data/
│   └── economy.json   (tự tạo khi bot chạy lần đầu)
├── index.js
├── deploy-commands.js
├── package.json
├── .env.example
└── .gitignore
```
