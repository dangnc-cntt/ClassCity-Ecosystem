# Kế hoạch Thiết kế Giao diện 2D (HUD) — ClassCity 3D

Tài liệu này được lập ở đầu **GĐ6** theo quy trình `frontend-design` (kèm khối override ClassCity), `baseline-ui`, `fixing-accessibility` và `fixing-motion-performance` trước khi viết mã UI 2D.

---

## 1. Bối cảnh & Bài toán Thiết kế
- **Sản phẩm:** ClassCity 3D — trò chơi quản lý lớp học dạng thành phố cửa hàng 3D thuộc hệ sinh thái SaaS đa trò chơi.
- **Người vận hành trực tiếp:** Giáo viên tiểu học / THCS thao tác nhanh bằng chuột hoặc bàn phím trên máy tính kết nối máy chiếu / màn hình tương tác tại lớp.
- **Người quan sát từ xa:** Học sinh 6–11 tuổi ngồi cách màn chiếu 3–7 mét, theo dõi cửa hàng của mình, tiến độ Kỳ Quan chung và màn quay số xe tuần tra gọi tên.
- **Vai trò cốt lõi của UI 2D:** Đây là **HUD đặt nổi trên nền WebGL 3D toàn màn hình**, không phải trang giới thiệu sản phẩm. Thành phố 3D là nhân vật chính; HUD phải gọn, đục (không dùng `backdrop-filter`), độ tương phản cao, nhường tối đa diện tích trung tâm cho thành phố và dồn toàn bộ sự kịch tính vào **một khoảnh khắc đáng nhớ nhất: Bảng Vinh Danh Gọi Tên (`CalloutModal`)**.

---

## 2. Hệ thống Token Thiết kế (Color, Typography, Z-Index, Spacing)

### 2.1 Bảng màu cốt lõi & Biến CSS thương hiệu (Luật R10)
Toàn bộ màu chủ đạo đi qua biến CSS `:root` để `applyTheme(brand)` đổi thương hiệu theo trường/lớp tức thời mà không sửa JSX:

| Token CSS | Mã Hex mặc định | Tên gợi nhớ | Vai trò & Tương phản WCAG AA |
|---|---|---|---|
| `--surface` | `#0F172A` | **Bảng Đêm Đục (Town Slate)** | Nền chính của thanh công cụ, ngăn bên và hộp thoại `<dialog>`. Đục 96–100% (không blur) để nổi bật trên bầu trời 3D sáng và đạt tương phản > 13:1 với chữ trắng. |
| `--surface-elevated` | `#1E293B` | **Thẻ Nổi (Signboard Navy)** | Nền thẻ học sinh, ô nhập liệu, nút phụ và vùng nhóm công cụ. |
| `--brand-primary` | `#0F766E` | **Ngọc Lam Trường Học (Classroom Teal)** | Màu nhận diện thương hiệu chính (viền chọn học sinh, huy hiệu mã số, nút hành động chính). Chữ trắng `#F8FAFC` đạt chuẩn AA. |
| `--brand-accent` | `#F59E0B` | **Vàng Cúp Kỳ Quan (Trophy Amber)** | Điểm nhấn duy nhất cho sự kiện trọng tâm: nút **Auto Lái Gọi Tên**, thanh tiến độ **Kỳ Quan** và viền vinh danh `CalloutModal`. **Bắt buộc đi kèm chữ tối `#0F172A`** (tương phản > 9:1). |
| `--ink-primary` | `#F8FAFC` | **Phấn Trắng (Warm Chalk)** | Màu chữ chính trên nền tối. |
| `--ink-muted` | `#CBD5E1` | **Phấn Xám Sáng (Soft Chalk)** | Nhãn phụ, chú thích (tương phản ≥ 7.2:1 trên `#0F172A`, tránh chữ xám mờ khó đọc trên máy chiếu rẻ tiền). |

Bảng màu sơn cửa hàng (`PASTEL_SHOP_COLORS` ≥ 12 màu pastel: `#FDE68A`, `#BFDBFE`, `#BBF7D0`, `#FBCFE8`, `#DDD6FE`, `#FED7AA`, `#99F6E4`, `#FECACA`, `#E9D5FF`, `#A7F3D0`, `#BAE6FD`, `#FEF08A`): chỉ dùng làm mẫu chọn màu (`swatch`) hoặc huy hiệu có chữ mực tối `#0F172A`, **tuyệt đối không đặt chữ sáng trên nền pastel**.

### 2.2 Kiểu chữ & Thang chữ đọc từ cuối lớp (Self-hosted Offline Font)
- **Họ chữ duy nhất:** **`Be Vietnam Pro`** (tự lưu trữ file `.woff2` các độ đậm `400`, `500`, `600`, `700`, `800` trong `public/fonts/`, giấy phép **SIL Open Font License 1.1** ghi trong `docs/LICENSES.md`).
  - *Lý do chọn:* Được thiết kế chuyên biệt cho hệ thống dấu chồng tiếng Việt (`Nguyễn Thị Thuỳ Dương, Trần Quốc Đạt, Phạm Hữu Tuấn`), nét thoáng, chiều cao x-height lớn, không bị dính dấu khi chiếu lên máy chiếu độ phân giải phổ thông.
- **Thang chữ bắt buộc (theo ClassCity Override):**
  - **Tiêu đề gọi tên (`CalloutModal` title):** `32px–36px` (`text-[2rem]` / `sm:text-4xl`, `font-extrabold`, `leading-tight`, `text-balance`). Học sinh cuối lớp đọc rõ ngay tức khắc.
  - **Thông tin HUD trọng tâm (Tên lớp, Tên học sinh đang chọn, Chỉ số Kỳ Quan, Điểm cấp độ):** `20px` (`text-xl`, `font-bold`, `tabular-nums`).
  - **Chữ thân giao diện (Danh sách học sinh, nhãn nút, ô tìm kiếm, nội dung modal):** `16px` (`text-base`, `font-medium`, `leading-normal`, `text-pretty`).
  - **Huy hiệu phụ / phím tắt:** `14px` (`text-sm`, `font-semibold`, `tabular-nums`) — không lạm dụng cỡ chữ siêu nhỏ `10px–11px` gây mỏi mắt giáo viên.
- **Quy tắc hiển thị số & tên:**
  - Mọi con số (điểm, cấp, thứ hạng, phần trăm) bắt buộc có `tabular-nums` để không giật ngang khi cộng điểm liên tục.
  - Không bao giờ dùng `ALL CAPS` cho nhãn nhỏ. Không cắt cụt tên học sinh mà thiếu thuộc tính `title` đầy đủ.

### 2.3 Thang `z-index` cố định
Tuân thủ `baseline-ui` (không dùng `z-[...]` tùy tiện):
- `z-0`: Vùng `<Canvas>` 3D toàn màn hình (`h-dvh w-screen`).
- `z-10`: Nhãn nổi 3D `<Html>` của từng lô cửa hàng.
- `z-20`: HUD cố định (`TopToolbar`, `StudentSidebar`).
- `z-30`: Vùng thông báo nhanh (`ToastStack` không chặn chuột).
- Top-layer trình duyệt (`<dialog>.showModal()`): Toàn bộ hộp thoại (`CalloutModal`, `LeaderboardModal`, `SettingsModal`, `ImportExportModal`, `EcosystemModal`, `UpgradeProModal`).

---

## 3. Bố cục (Layout) & Sơ đồ ASCII Wireframe

### 3.1 Màn hình chính (HUD gọn, chừa trọn trung tâm cho Thành phố 3D)
Căn lề: nội dung trong thẻ và danh sách **căn trái** tự nhiên để quét mắt nhanh theo cột; riêng **Bảng Vinh Danh Gọi Tên (`CalloutModal`)** căn giữa trang trọng như sân khấu trao giải.

```text
+----------------------------------------------------------------------------------+
| [Về sảnh] [Lớp 5A v 🔒] | Kỳ Quan [======65%===] | [🎲 Auto Lái] [Xe v] [Trời v] [🔊] [🏆] [⚙️] [📁] [🌐] |
+----------------------------------------------------------------------------------+
|                                                        | [Thu gọn >] DS Học sinh |
|                                                        | [🔍 Tìm tên, mã số... ] |
|                                                        | [Tất cả ngành hàng  v ] |
|                                                        | ----------------------- |
|            THÀNH PHỐ 3D TOÀN MÀN HÌNH (h-dvh)          | #01 Nguyễn Minh Anh Lv8 |
|          (36–40 cửa hàng pastel + Kỳ Quan giữa         | #02 Trần Gia Bảo   Lv19 |
|           bùng binh + Xe tuần tra + Avatar đi dạo)     | ...                     |
|                                                        | ======================= |
|                                                        | CỬA HÀNG ĐANG CHỌN      |
|                                                        | #02 Trần Gia Bảo  Lv.19 |
|                                                        | Tiến độ [========80%==] |
|                                                        | [+1 Phát biểu] [+2 Tốt] |
|   (Nút nổi khi lái tay đỗ gần ô: [📣 Gọi ô #12])       | [+5 Xuất sắc ] [-1 Nhắc]|
|                                                        | Avatar | Ngành | Màu sơn|
+----------------------------------------------------------------------------------+
```

### 3.2 Khoảnh khắc điểm nhấn duy nhất: `CalloutModal` (`<dialog>` sân khấu dưới đáy)
Đặt ở nửa dưới màn hình (`mb-6`) để **không che cửa hàng 3D vừa được camera GSAP zoom cận cảnh ở nửa trên**:

```text
+----------------------------------------------------------------------+
|                    🎉 CỬA HÀNG SỐ 12 • CẤP ĐỘ 9                      |
|      Mời chủ cửa hàng số 12 – Nguyễn Thị Thuỳ Dương lên trả bài!     |
|                                                                      |
|               [⚡ Dùng thẻ Nhân đôi điểm (còn 1 thẻ)]                |
|                                                                      |
|   [ +1 Phát biểu ]  [ +2 Làm bài tốt ]  [ +5 Xuất sắc ]  [ -1 Nhắc ] |
|                                                                      |
|              [🎲 Gọi bạn khác]            [Đóng (Esc)]               |
+----------------------------------------------------------------------+
```

---

## 4. Tự phản biện & Hiệu chỉnh (Pass 2 Critique against Clichés)

1. **Loại bỏ thói quen "SaaS-card mờ kính & chữ tí hon":**
   - *Bản nháp đầu:* Dùng `bg-slate-900/70 backdrop-blur-md` và chữ `text-xs` (`12px`) dày đặc trên thanh công cụ.
   - *Hiệu chỉnh:* Xóa sạch `backdrop-blur` (gây tụt FPS trên iGPU khi chồng lên WebGL — vi phạm `fixing-motion-performance`), đổi sang nền đặc `--surface` (`#0F172A`) viền sắc nét, gom nhóm phương tiện & thời tiết gọn gàng và nâng cỡ chữ cơ sở lên `16px` (`text-base`), thông tin chính `20px` (`text-xl`).
2. **Loại bỏ rải hiệu ứng chuyển động thừa:**
   - Không làm hiệu ứng fade-up nối đuôi cho từng dòng danh sách học sinh.
   - Chỉ giữ đúng các chuyển động có ý nghĩa sư phạm trong đặc tả: thanh tiến độ `scaleX` mượt (`transform`), hộp thoại gọi tên bật nhẹ bằng GSAP (`opacity` + `scale` ≤ 320ms, tắt ngay khi `prefers-reduced-motion`), ngôi nhà 3D nảy cao và pháo giấy khi lên cấp.
3. **Ghi nhận chủ đích với `baseline-ui`:**
   - Giữ quy tắc **không gradient trang trí**, **dùng `<dialog>` gốc + `showModal()`**, **dùng `<dialog role="alertdialog">` cho thao tác ghi đè CSV / đặt lại dữ liệu mẫu**, và dùng `h-dvh` thay vì `h-screen`.

---

## 5. Khả năng truy cập (Accessibility) & Chuyển động
- **Đầy đủ thao tác 2D thay thế Canvas:** Chọn học sinh, cộng/trừ điểm, Auto Lái, gọi học sinh đang chọn trả bài ngay từ Sidebar, đổi avatar/ngành hàng/màu sơn, đổi xe, đổi thời tiết đều thực hiện được 100% bằng bàn phím (`Tab`, `Enter`, `Space`, `Esc`).
- **Hộp thoại chuẩn `<dialog>` gốc:** Tự động bẫy focus (focus trap), nhấn `Esc` đóng hộp thoại và trả focus về nút vừa mở.
- **Thông báo trình đọc màn hình:** Một vùng `aria-live="polite"` duy nhất công bố sự kiện cộng điểm, lên cấp, gọi tên và đổi thời tiết; toast không bao giờ là kênh duy nhất.
- **Tôn trọng `prefers-reduced-motion`:** Bỏ qua pháo giấy `confetti`, bỏ qua GSAP scale-in trên modal và chuyển cảnh tức thì.

---

## 6. Assumptions (Giả định thiết kế)
1. Máy chiếu lớp học tại Việt Nam thường có tỷ lệ `16:9` (`1280×720` hoặc `1920×1080`) với độ tương phản thực tế thấp hơn màn hình rời; do đó nền tối đục `#0F172A` + chữ phấn trắng `#F8FAFC` + điểm nhấn vàng hổ phách `#F59E0B` chữ đen `#0F172A` đảm bảo hiển thị rõ trong phòng học bật đèn sáng.
2. Khi mở trên màn hình hẹp (`< 1024px` hoặc máy tính bảng của giáo viên), `StudentSidebar` có thể đóng/mở linh hoạt bằng nút thu gọn (`transform: translateX`) mà không làm co méo khung hình `<Canvas>` 3D.
3. Giao diện mặc định dùng tiếng Việt (`vi`), hỗ trợ chuyển đổi tức thì sang tiếng Anh (`en`) ngay trong `SettingsModal` mà không cần tải lại trang.
