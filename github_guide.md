# Hướng dẫn đẩy code lên GitHub

Bạn hãy làm theo 3 bước sau để đưa mã nguồn lên GitHub:

## Bước 1: Tạo Repository trên GitHub
1. Truy cập [New Repository](https://github.com/new).
2. Đặt tên cho repository (ví dụ: `pdf-to-video-app`).
3. **Quan trọng**: KHÔNG tích vào "Add a README", "Add .gitignore" (vì chúng ta đã tạo sẵn ở máy rồi).
4. Nhấn **Create repository**.

## Bước 2: Liên kết với máy tính của bạn
Sau khi tạo xong, GitHub sẽ hiện ra một danh sách các lệnh. Hãy tìm phần **"…or push an existing repository from the command line"**.

Mở **Terminal** (hoặc dùng tab terminal đang chạy trong Visual Studio Code) và chạy lần lượt 3 lệnh sau (Thay `USERNAME` bằng tên tài khoản GitHub của bạn):

```bash
# 1. Thêm địa chỉ kho chứa online (Remote)
git remote add origin https://github.com/USERNAME/pdf-to-video-app.git

# 2. Đổi tên nhánh chính thành 'main' (nếu chưa phải)
git branch -M main

# 3. Đẩy code lên
git push -u origin main
```

## Bước 3: Kiểm tra
Quay lại trang GitHub của bạn và tải lại trang (F5). Nếu thấy toàn bộ file code hiện lên là thành công!

---

### Lưu ý khi triển khai (Deploy)
Sau khi code đã lên GitHub, để ứng dụng chạy online 100%, bạn cần làm thêm:

1. **Deploy Backend (Python)** lên [Render.com](https://render.com) hoặc [Railway.app](https://railway.app).
2. **Deploy Frontend (React)** lên [Vercel.com](https://vercel.com).
3. **Cập nhật Frontend**: Bạn cần vào file `frontend/src/App.jsx`, tìm dòng `http://localhost:8000` và đổi nó thành đường dẫn Backend mới (ví dụ: `https://my-backend.onrender.com`).
